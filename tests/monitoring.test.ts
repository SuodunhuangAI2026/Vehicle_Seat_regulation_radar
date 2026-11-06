import { expect, it } from "vitest";
import type { SourceRecord } from "../src/types";
import {
  createSnapshot,
  parseListingHtml,
  type SourceAdapter,
  type SourceSnapshot,
} from "../scripts/monitor/adapters";
import { diffSnapshot } from "../scripts/monitor/diff";
import { runMonitor } from "../scripts/monitor/runner";
import { parseUneceHtml } from "../scripts/monitor/adapters/unece";
import { parseEcfrXml } from "../scripts/monitor/adapters/ecfr";

const source: SourceRecord = {
  id: "src-test",
  name: "Test source",
  url: "https://unece.org/un-regulations-addenda-1958-agreement",
  category: "UNECE / WP.29 全球统一法规",
  monitoringMode: "automated",
  adapterId: "unece",
};

function snapshot(items: SourceSnapshot["items"]): SourceSnapshot {
  return createSnapshot({
    source,
    fetchedAt: "2026-11-05T00:00:00.000Z",
    items,
    excerpt: items.map((item) => item.title).join(" | "),
  });
}

it("detects a version change without reporting unrelated unchanged items", () => {
  const previous = snapshot([
    {
      key: "r17",
      title: "UN R17",
      url: "https://unece.org/r17",
      version: "Rev.7",
    },
    {
      key: "r16",
      title: "UN R16",
      url: "https://unece.org/r16",
      version: "Rev.10",
    },
  ]);
  const next = snapshot([
    {
      key: "r17",
      title: "UN R17",
      url: "https://unece.org/r17",
      version: "Rev.8",
    },
    {
      key: "r16",
      title: "UN R16",
      url: "https://unece.org/r16",
      version: "Rev.10",
    },
  ]);
  const diff = diffSnapshot(previous, next);
  expect(diff.changed).toBe(true);
  expect(diff.changedItems).toHaveLength(1);
  expect(diff.changedItems[0].version).toBe("Rev.8");
});

it("keeps successful sources when one adapter throws", async () => {
  const failingSource: SourceRecord = {
    ...source,
    id: "src-failing",
    name: "Failing source",
  };
  const okAdapter: SourceAdapter = {
    id: "unece",
    matches: () => true,
    fetch: async () => snapshot([]),
  };
  const failingAdapter: SourceAdapter = {
    id: "failing",
    matches: (candidate) => candidate.id === "src-failing",
    fetch: async () => {
      throw new Error("blocked");
    },
  };
  const run = await runMonitor({
    sources: [source, failingSource],
    adapters: [failingAdapter, okAdapter],
    snapshots: {
      [source.id]: snapshot([]),
    },
    analyze: async () => null,
    rateLimitMs: 0,
  });
  expect(run.health.find((row) => row.sourceId === source.id)?.status).toBe(
    "unchanged",
  );
  expect(
    run.health.find((row) => row.sourceId === failingSource.id)?.status,
  ).toBe("failed");
});

it("uses the first successful fetch as a baseline without creating a change", async () => {
  let analyses = 0;
  const baselineAdapter: SourceAdapter = {
    id: "unece",
    matches: () => true,
    fetch: async () => snapshot([]),
  };
  const run = await runMonitor({
    sources: [source],
    adapters: [baselineAdapter],
    analyze: async () => {
      analyses += 1;
      return null;
    },
    rateLimitMs: 0,
  });
  expect(run.health[0].status).toBe("unchanged");
  expect(run.changes).toHaveLength(0);
  expect(analyses).toBe(0);
});

it("parses UNECE listing links and eCFR versioner XML fixtures", () => {
  const unece = parseUneceHtml({
    sourceId: source.id,
    sourceUrl: source.url,
    sourceTitle: source.name,
    html: `<!doctype html><a href="/transport/vehicle-regulations/1958-agreement/r17">UN Regulation No. 17</a><span>Revision 7</span>`,
    fetchedAt: "2026-11-05T00:00:00.000Z",
  });
  expect(unece.items).toHaveLength(1);
  expect(unece.items[0].url).toContain("unece.org");

  const ecfr = parseEcfrXml({
    sourceId: "src-ecfr",
    sourceUrl: "https://www.ecfr.gov/current/title-49",
    sourceTitle: "eCFR",
    xml: `<?xml version="1.0"?><DIV5><DIV8 N="571.207"><HEAD>§ 571.207 Standard No. 207; Seating systems.</HEAD><EFFECTIVE>January 1, 2027</EFFECTIVE></DIV8></DIV5>`,
    fetchedAt: "2026-11-05T00:00:00.000Z",
  });
  expect(ecfr.items[0].key).toBe("ecfr:571.207");
  expect(ecfr.items[0].url).toContain("section-571.207");
});

it("parses the requested eCFR part instead of hard-coding Part 571", () => {
  const ecfr = parseEcfrXml({
    sourceId: "src-ecfr-572",
    sourceUrl: "https://www.ecfr.gov/current/title-49/part-572",
    sourceTitle: "eCFR Part 572",
    partNumber: "572",
    xml: `<?xml version="1.0"?><DIV5><DIV8 N="572.1"><HEAD>§ 572.1 Scope.</HEAD></DIV8><DIV8 N="571.207"><HEAD>§ 571.207 Seating systems.</HEAD></DIV8></DIV5>`,
    fetchedAt: "2026-11-05T00:00:00.000Z",
  });
  expect(ecfr.items).toHaveLength(1);
  expect(ecfr.items[0].key).toBe("ecfr:572.1");
  expect(ecfr.items[0].url).toContain("section-572.1");
});

it("filters navigation-only links from listing snapshots", () => {
  const sourceWithHtml: SourceRecord = {
    ...source,
    id: "src-tc",
    name: "Transport Canada",
    url: "https://tc.canada.ca/en/regulatory-change",
    adapterId: "transport-canada",
  };
  const listing = parseListingHtml({
    source: sourceWithHtml,
    html: `<!doctype html>
      <a href="#main">Skip to main content</a>
      <a href="/en/motor-vehicle-safety-regulations">Motor Vehicle Safety Regulations</a>`,
    fetchedAt: "2026-11-05T00:00:00.000Z",
    acceptLink: (_, url) => url.hostname.endsWith("tc.canada.ca"),
  });
  expect(listing.items.map((item) => item.title)).toEqual([
    "Motor Vehicle Safety Regulations",
  ]);
});
