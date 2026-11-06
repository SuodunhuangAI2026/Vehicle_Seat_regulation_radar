import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { SourceRecord } from "../../src/types/index.js";

export interface SourceItem {
  key: string;
  title: string;
  url: string;
  version?: string;
  publishedAt?: string;
  contentHash?: string;
  summary?: string;
}

export interface SourceSnapshot {
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  hash: string;
  title: string;
  items: SourceItem[];
  excerpt: string;
  etag?: string;
  lastModified?: string;
  warning?: string;
}

export interface SourceAdapter {
  id: string;
  matches(source: SourceRecord): boolean;
  fetch(
    source: SourceRecord,
    previous?: SourceSnapshot,
  ): Promise<SourceSnapshot>;
}

export function stableSnapshotHash(items: SourceItem[]): string {
  const normalized = items
    .map((item) => ({
      key: item.key,
      title: item.title,
      url: item.url,
      version: item.version ?? "",
      publishedAt: item.publishedAt ?? "",
      contentHash: item.contentHash ?? "",
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function createSnapshot(input: {
  source: SourceRecord;
  fetchedAt: string;
  items: SourceItem[];
  excerpt: string;
  etag?: string;
  lastModified?: string;
  warning?: string;
}): SourceSnapshot {
  return {
    sourceId: input.source.id,
    sourceUrl: input.source.url,
    fetchedAt: input.fetchedAt,
    hash: stableSnapshotHash(input.items),
    title: input.source.name,
    items: input.items.slice(0, 500),
    excerpt: input.excerpt.trim().slice(0, 1600),
    etag: input.etag,
    lastModified: input.lastModified,
    warning: input.warning,
  };
}

function absoluteUrl(href: string, baseUrl: string): string | undefined {
  try {
    const url = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function extractVersion(text: string): string | undefined {
  return (
    text.match(
      /(?:Rev\.?\s*\d+|Amendment\s*\d+|Amd\.?\s*\d+|Supplement\s*\d+|R\d{2,3})/i,
    )?.[0] ?? undefined
  );
}

function extractDate(text: string): string | undefined {
  const iso = text.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  if (iso) return iso;
  const longDate = text.match(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}\b/i,
  )?.[0];
  if (!longDate) return undefined;
  const parsed = new Date(longDate);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed.toISOString().slice(0, 10);
}

export function parseListingHtml(input: {
  source: SourceRecord;
  html: string;
  baseUrl?: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  acceptLink: (title: string, url: URL) => boolean;
}): SourceSnapshot {
  const $ = load(input.html);
  const seen = new Set<string>();
  const items: SourceItem[] = [];

  $("a[href]").each((_, element) => {
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const rawHref = $(element).attr("href") ?? "";
    if (
      /^(#|javascript:|mailto:|tel:)/i.test(rawHref) ||
      /^(skip|menu|home|search|close|facebook|linkedin|x\.com|youtube)/i.test(
        title,
      )
    ) {
      return;
    }
    const urlText = absoluteUrl(rawHref, input.baseUrl ?? input.source.url);
    if (!urlText || !title || title.length < 3 || title.length > 260) return;
    const url = new URL(urlText);
    if (!input.acceptLink(title, url)) return;
    const key = `${url.hostname}${url.pathname}`;
    if (seen.has(key)) return;
    seen.add(key);
    const containerText = $(element)
      .closest("li, article, tr, section, div")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    items.push({
      key,
      title,
      url: urlText,
      version: extractVersion(`${title} ${containerText}`),
      publishedAt: extractDate(containerText),
      contentHash: contentFingerprint(containerText),
      summary: containerText.slice(0, 420),
    });
  });

  return createSnapshot({
    source: input.source,
    fetchedAt: input.fetchedAt,
    items,
    excerpt: items
      .slice(0, 14)
      .map((item) => `${item.title}${item.version ? ` (${item.version})` : ""}`)
      .join(" | "),
    etag: input.etag,
    lastModified: input.lastModified,
  });
}

export function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&sect;/g, "§")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function contentFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
