import { describe, expect, it } from "vitest";
import {
  normalizeStandardRows,
  type RawStandardDocument,
  type RawStandardSummary,
} from "../scripts/import/normalize-standards";
import {
  classifySourceUrl,
  normalizeSourceLinks,
} from "../scripts/import/normalize-sources";

describe("standard normalization", () => {
  it("joins summary metadata and preserves duplicate-version documents", () => {
    const documents: RawStandardDocument[] = [
      { standardNo: "UN R17", version: "Rev.7", fileName: "R017r7e.pdf" },
      {
        standardNo: "UN R17",
        version: "Rev.7 / Amd.1",
        fileName: "R017r7am1e.pdf",
      },
    ];
    const summaries: RawStandardSummary[] = [
      {
        standardNo: "UN R17",
        title: "座椅、座椅固定装置及头枕",
        issuers: "UNECE（联合国）",
        system: "ECE",
      },
    ];

    const records = normalizeStandardRows(
      documents,
      summaries,
      "2026-11-05T00:00:00Z",
    );

    expect(records).toHaveLength(2);
    expect(records[0].issuer).toContain("UNECE");
    expect(records[0].monitored).toBe(true);
    expect(records[1].version).toContain("Amd.1");
  });

  it("marks a consultation draft without inventing an official date", () => {
    const [record] = normalizeStandardRows(
      [
        {
          standardNo: "GB 15083",
          version: "202X 征求意见稿",
          fileName: "GB 15083 draft.pdf",
        },
      ],
      [],
      "2026-11-05T00:00:00Z",
    );

    expect(record.status).toBe("draft");
    expect(record.issuer).toBe("待核实");
  });
});

describe("source normalization", () => {
  it("deduplicates by URL and marks adapter-supported sources", () => {
    const sources = normalizeSourceLinks([
      {
        name: "UNECE regulations",
        url: "https://unece.org/un-regulations-addenda-1958-agreement",
        category: "UNECE / WP.29 全球统一法规",
      },
      {
        name: "UNECE duplicate",
        url: "https://unece.org/un-regulations-addenda-1958-agreement#top",
        category: "UNECE / WP.29 全球统一法规",
      },
      {
        name: "NHTSA FMVSS",
        url: "https://www.nhtsa.gov/laws-regulations/fmvss",
        category: "美国联邦机动车安全法规",
      },
    ]);

    expect(sources).toHaveLength(2);
    expect(sources[0].monitoringMode).toBe("automated");
    expect(sources[0].adapterId).toBe("unece");
    expect(sources[1].adapterId).toBe("nhtsa");
  });

  it("classifies a known official domain into the expected workbook category", () => {
    expect(classifySourceUrl("https://www.ecfr.gov/current/title-49")).toBe(
      "美国联邦机动车安全法规",
    );
    expect(classifySourceUrl("https://std.samr.gov.cn/")).toBe(
      "中国国家标准与强制性法规",
    );
  });
});
