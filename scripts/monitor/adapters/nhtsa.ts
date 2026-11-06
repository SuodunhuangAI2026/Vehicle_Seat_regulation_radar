import type { SourceAdapter } from "../adapters.js";
import { parseListingHtml } from "../adapters.js";
import { parseGovInfoXml } from "./ecfr.js";
import { fetchSource } from "../fetch-source.js";

export const nhtsaAdapter: SourceAdapter = {
  id: "nhtsa",
  matches: (source) =>
    source.adapterId === "nhtsa" ||
    (source.url.includes("nhtsa.gov") && source.url.includes("fmvss")),
  async fetch(source, previous) {
    try {
      const response = await fetchSource(source.url, {
        etag: previous?.etag,
        lastModified: previous?.lastModified,
      });
      if (response.notModified && previous) {
        return { ...previous, fetchedAt: new Date().toISOString() };
      }
      const parsed = parseListingHtml({
        source,
        html: response.body,
        fetchedAt: new Date().toISOString(),
        etag: response.etag,
        lastModified: response.lastModified,
        acceptLink: (title, url) => {
          const path = url.pathname.toLowerCase();
          return (
            url.hostname.endsWith("nhtsa.gov") &&
            (path.includes("fmvss") ||
              path.includes("laws-regulations") ||
              /FMVSS|Standard\s+No\.?\s*\d{3}/i.test(title))
          );
        },
      });
      if (parsed.items.length === 0) {
        throw new Error("NHTSA HTML returned no machine-readable listing");
      }
      return parsed;
    } catch (primaryError) {
      const fallbackUrl =
        "https://www.govinfo.gov/content/pkg/CFR-2025-title49-vol6/xml/CFR-2025-title49-vol6-part571.xml";
      const fallback = await fetchSource(fallbackUrl, {
        etag: previous?.items.length ? previous.etag : undefined,
        lastModified: previous?.items.length
          ? previous.lastModified
          : undefined,
      });
      if (fallback.notModified && previous?.items.length) {
        return { ...previous, fetchedAt: new Date().toISOString() };
      }
      const snapshot = parseGovInfoXml({
        sourceId: source.id,
        sourceUrl: source.url,
        sourceTitle: source.name,
        xml: fallback.body,
        fetchedAt: new Date().toISOString(),
        etag: fallback.etag,
        lastModified: fallback.lastModified,
      });
      return {
        ...snapshot,
        warning: `NHTSA 页面无法自动读取（${
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        }），本轮使用美国 GPO 2025 版 49 CFR Part 571 XML 作官方备份。`,
      };
    }
  },
};
