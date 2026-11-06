import type { SourceAdapter, SourceItem, SourceSnapshot } from "../adapters.js";
import {
  createSnapshot,
  parseListingHtml,
  stripMarkup,
} from "../adapters.js";
import { fetchSource } from "../fetch-source.js";

export function parseUneceHtml(input: {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  html: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
}): SourceSnapshot {
  return parseListingHtml({
    source: {
      id: input.sourceId,
      name: input.sourceTitle,
      url: input.sourceUrl,
      category: "UNECE / WP.29 全球统一法规",
      monitoringMode: "automated",
      adapterId: "unece",
    },
    html: input.html,
    fetchedAt: input.fetchedAt,
    etag: input.etag,
    lastModified: input.lastModified,
    acceptLink: (title, url) => {
      const path = url.pathname.toLowerCase();
      const isRegulation = /^r\d{2,3}\b/i.test(title) || /\bR\d{2,3}\b/i.test(title);
      return (
        url.hostname.endsWith("unece.org") &&
        (path.includes("regulations") ||
          path.includes("vehicle-regulations") ||
          path.includes("1958-agreement")) &&
        (isRegulation ||
          /regulation|amendment|revision|supplement/i.test(title))
      );
    },
  });
}

function parseXmlRegulations(input: {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  xml: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
}): SourceSnapshot {
  const items: SourceItem[] = [];
  const blocks = [
    ...input.xml.matchAll(
      /<(?:DIV8|div8)\b[^>]*\bN="([^"]+)"[^>]*>([\s\S]*?)<\/(?:DIV8|div8)>/g,
    ),
  ];
  for (const [, key, block] of blocks) {
    const head =
      block.match(/<(?:HEAD|head)>([\s\S]*?)<\/(?:HEAD|head)>/)?.[1] ??
      "";
    const title = stripMarkup(head) || `UN Regulation ${key}`;
    const revised =
      block.match(
        /(?:Revision|Rev\.?)\s*(\d+)|(?:Amendment|Amd\.?)\s*(\d+)/i,
      )?.[0] ?? undefined;
    items.push({
      key: `unece:${key}`,
      title,
      url: new URL(
        `/transport/vehicle-regulations/1958-agreement/un-regulations-addenda-1958-agreement/${key}`,
        input.sourceUrl,
      ).toString(),
      version: revised,
    });
  }

  return createSnapshot({
    source: {
      id: input.sourceId,
      name: input.sourceTitle,
      url: input.sourceUrl,
      category: "UNECE / WP.29 全球统一法规",
      monitoringMode: "automated",
      adapterId: "unece",
    },
    fetchedAt: input.fetchedAt,
    items,
    excerpt: items
      .slice(0, 15)
      .map((item) => `${item.title}${item.version ? ` (${item.version})` : ""}`)
      .join(" | "),
    etag: input.etag,
    lastModified: input.lastModified,
  });
}

export const uneceAdapter: SourceAdapter = {
  id: "unece",
  matches: (source) =>
    source.adapterId === "unece" ||
    source.url.includes("unece.org/un-regulations-addenda-1958-agreement"),
  async fetch(source, previous) {
    const response = await fetchSource(source.url, {
      etag: previous?.etag,
      lastModified: previous?.lastModified,
    });
    const fetchedAt = new Date().toISOString();
    if (response.notModified && previous) {
      return { ...previous, fetchedAt };
    }
    const htmlSnapshot = parseUneceHtml({
      sourceId: source.id,
      sourceUrl: source.url,
      sourceTitle: source.name,
      html: response.body,
      fetchedAt,
      etag: response.etag,
      lastModified: response.lastModified,
    });
    if (htmlSnapshot.items.length > 0) return htmlSnapshot;
    return parseXmlRegulations({
      sourceId: source.id,
      sourceUrl: source.url,
      sourceTitle: source.name,
      xml: response.body,
      fetchedAt,
      etag: response.etag,
      lastModified: response.lastModified,
    });
  },
};
