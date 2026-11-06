import type { SourceAdapter, SourceItem, SourceSnapshot } from "../adapters.js";
import {
  contentFingerprint,
  createSnapshot,
  stripMarkup,
} from "../adapters.js";
import { fetchSource } from "../fetch-source.js";

export function parseEcfrXml(input: {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  partNumber?: string;
  xml: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  warning?: string;
}): SourceSnapshot {
  const partNumber = input.partNumber ?? "571";
  const blocks = [
    ...input.xml.matchAll(
      /<DIV8\b[^>]*\bN="([^"]+)"[^>]*>([\s\S]*?)<\/DIV8>/gi,
    ),
  ];
  const items: SourceItem[] = [];
  for (const [, sectionNumber, block] of blocks) {
    const head = block.match(/<HEAD>([\s\S]*?)<\/HEAD>/i)?.[1] ?? "";
    const title = stripMarkup(head);
    if (!title || !sectionNumber.startsWith(`${partNumber}.`)) continue;
    const sectionText = stripMarkup(block);
    const effective = block.match(
      /<EFFECTIVE[^>]*>([\s\S]*?)<\/EFFECTIVE>/i,
    )?.[1];
    const version =
      effective
        ?.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+20\d{2}\b/i)?.[0]
        ?.replace(/\s+/g, " ") ?? undefined;
    items.push({
      key: `ecfr:${sectionNumber}`,
      title,
      url: new URL(
        `/current/title-49/section-${sectionNumber}`,
        "https://www.ecfr.gov",
      ).toString(),
      version,
      contentHash: contentFingerprint(sectionText),
      summary: sectionText.slice(0, 420),
    });
  }

  if (items.length === 0) {
    throw new Error(
      `eCFR XML returned no section records for 49 CFR Part ${partNumber}`,
    );
  }

  return createSnapshot({
    source: {
      id: input.sourceId,
      name: input.sourceTitle,
      url: input.sourceUrl,
      category: "美国联邦机动车安全法规",
      monitoringMode: "automated",
      adapterId: "ecfr",
    },
    fetchedAt: input.fetchedAt,
    items,
    excerpt: items
      .slice(0, 15)
      .map((item) => `${item.title}${item.version ? ` (${item.version})` : ""}`)
      .join(" | "),
    etag: input.etag,
    lastModified: input.lastModified,
    warning: input.warning,
  });
}

export function parseGovInfoXml(input: {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  xml: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  warning?: string;
}): SourceSnapshot {
  const sections = [
    ...input.xml.matchAll(/<SECTION\b[^>]*>([\s\S]*?)<\/SECTION>/gi),
  ];
  const items: SourceItem[] = [];
  for (const [, section] of sections) {
    const sectionNumber = stripMarkup(
      section.match(/<SECTNO>([\s\S]*?)<\/SECTNO>/i)?.[1] ?? "",
    ).replace(/^§\s*/, "");
    if (!sectionNumber.startsWith("571.")) continue;
    const subject = stripMarkup(
      section.match(/<SUBJECT>([\s\S]*?)<\/SUBJECT>/i)?.[1] ?? "",
    );
    const sectionText = stripMarkup(section);
    items.push({
      key: `govinfo:${sectionNumber}`,
      title: `${sectionNumber} ${subject}`.trim(),
      url: `https://www.ecfr.gov/current/title-49/section-${sectionNumber}`,
      contentHash: contentFingerprint(sectionText),
      summary: sectionText.slice(0, 420),
    });
  }
  if (items.length === 0) {
    throw new Error("GPO XML returned no 49 CFR Part 571 section records");
  }
  return createSnapshot({
    source: {
      id: input.sourceId,
      name: input.sourceTitle,
      url: input.sourceUrl,
      category: "美国联邦机动车安全法规",
      monitoringMode: "automated",
      adapterId: "nhtsa",
    },
    fetchedAt: input.fetchedAt,
    items,
    excerpt: items
      .slice(0, 15)
      .map((item) => item.title)
      .join(" | "),
    etag: input.etag,
    lastModified: input.lastModified,
    warning: input.warning,
  });
}

export const ecfrAdapter: SourceAdapter = {
  id: "ecfr",
  matches: (source) =>
    source.adapterId === "ecfr" || source.url.includes("ecfr.gov"),
  async fetch(source, previous) {
    const partNumber =
      new URL(source.url).searchParams.get("part") ??
      source.url.match(/\/part-(\d+)\b/i)?.[1] ??
      "571";
    let issueDate = new Date().toISOString().slice(0, 10);
    try {
      const titlesResponse = await fetchSource(
        "https://www.ecfr.gov/api/versioner/v1/titles.json",
      );
      const titles = JSON.parse(titlesResponse.body) as {
        titles?: Array<{ number?: number; latest_issue_date?: string }>;
      };
      const title49 = titles.titles?.find((title) => title.number === 49);
      if (title49?.latest_issue_date) {
        issueDate = title49.latest_issue_date;
      }
    } catch (error) {
      console.error("ECFR_TITLES_LOOKUP_FAILED", error);
    }
    const apiUrl = new URL(
      `https://www.ecfr.gov/api/versioner/v1/full/${issueDate}/title-49.xml`,
    );
    apiUrl.searchParams.set("part", partNumber);
    const response = await fetchSource(apiUrl.toString(), {
      etag: previous?.etag,
      lastModified: previous?.lastModified,
    });
    if (response.notModified && previous) {
      return { ...previous, fetchedAt: new Date().toISOString() };
    }
    return parseEcfrXml({
      sourceId: source.id,
      sourceUrl: source.url,
      sourceTitle: source.name,
      partNumber,
      xml: response.body,
      fetchedAt: new Date().toISOString(),
      etag: response.etag,
      lastModified: response.lastModified,
      warning:
        issueDate !== new Date().toISOString().slice(0, 10)
          ? `eCFR 当前可用发布日期为 ${issueDate}，未使用未来日期。`
          : undefined,
    });
  },
};
