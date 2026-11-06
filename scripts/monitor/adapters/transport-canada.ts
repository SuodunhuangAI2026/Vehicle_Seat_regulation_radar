import type { SourceAdapter } from "../adapters.js";
import { parseListingHtml } from "../adapters.js";
import { fetchSource } from "../fetch-source.js";

export const transportCanadaAdapter: SourceAdapter = {
  id: "transport-canada",
  matches: (source) =>
    source.adapterId === "transport-canada" ||
    (source.url.includes("tc.canada.ca") &&
      source.url.includes("regulatory-change")),
  async fetch(source, previous) {
    const response = await fetchSource(source.url, {
      etag: previous?.etag,
      lastModified: previous?.lastModified,
    });
    if (response.notModified && previous) {
      return { ...previous, fetchedAt: new Date().toISOString() };
    }
    return parseListingHtml({
      source,
      html: response.body,
      fetchedAt: new Date().toISOString(),
      etag: response.etag,
      lastModified: response.lastModified,
      acceptLink: (title, url) => {
        const path = url.pathname.toLowerCase();
        return (
          url.hostname.endsWith("tc.canada.ca") &&
          (path.includes("regulatory-change") ||
            path.includes("motor-vehicle-safety") ||
            /CMVSS|Motor Vehicle Safety|Regulations/i.test(title))
        );
      },
    });
  },
};
