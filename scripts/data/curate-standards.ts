import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { StandardRecord } from "../../src/types/index.js";
import {
  normalizeStandardKey,
  standardFamilyKey,
} from "../../src/lib/filters.js";

const curatedAt = "2026-11-09T12:00:00.000Z";

const keepFamilies = new Set(
  [
    "FMVSS No.10",
    "FMVSS No.202a",
    "FMVSS No.207",
    "CMVSS 202",
    "CMVSS 207",
    "UN R17",
    "UN R145",
    "UN GTR No.7",
    "ECE-TRANS-WP.29-2025-46",
    "GB 15083",
    "GB 7258",
    "GB/T 29120",
    "QC/T 740",
    "QC/T 805",
    "QC/T 831",
    "T/CAAMTB 284",
    "C-IASI 17",
    "C-IASI 18",
    "C-IASI 19",
    "C-IASI 20",
    "C-IASI 21",
    "GSO 1598",
    "ADR 3/04",
    "C-NCAP 2027 附录J",
    "JNCAP R5-05",
    "KNCAP TP-CS-7",
  ].map(standardFamilyKey),
);

const keepTitlePatterns = [
  /^Euro NCAP - Whiplash Dynamic Assessment/i,
  /^rear-whiplash-test-protocol/i,
  /^Whiplash_prevention_/i,
  /^Crash Protection - Rear Impact/i,
];

function sourceUrlFor(record: StandardRecord): string | undefined {
  const standardNo = record.standardNo.toUpperCase();
  const fmvss = standardNo.match(/FMVSS NO\.?(\d{2,3}[A-Z]?)/)?.[1];
  if (fmvss) {
    return `https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-571/subpart-B/section-571.${fmvss.toLowerCase()}`;
  }
  const cmvss = standardNo.match(/CMVSS\s+(\d{3})/)?.[1];
  if (cmvss) {
    return `https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._1038/section-${cmvss}.html`;
  }
  if (
    standardNo.startsWith("UN R") ||
    standardNo.startsWith("UN GTR") ||
    standardNo.startsWith("ECE-TRANS")
  ) {
    return standardNo.startsWith("UN GTR")
      ? "https://unece.org/transport/standards/transport/vehicle-regulations-wp29/global-technical-regulations-gtrs"
      : "https://unece.org/transport/vehicle-regulations/1958-agreement/un-regulations-addenda-1958-agreement";
  }
  if (
    standardNo.startsWith("GB ") ||
    standardNo.startsWith("GB/T") ||
    standardNo.startsWith("QC/T") ||
    standardNo.startsWith("T/")
  ) {
    return standardNo.startsWith("GB")
      ? "https://openstd.samr.gov.cn/bzgk/gb/"
      : "https://std.samr.gov.cn/";
  }
  if (standardNo.startsWith("C-IASI")) return "http://www.ciasi.org.cn";
  if (standardNo.startsWith("GSO")) return "https://www.gso.org.sa/";
  if (standardNo.startsWith("ADR")) {
    return "https://www.infrastructure.gov.au/infrastructure-transport-vehicles/vehicles/vehicle-design-regulation/australian-design-rules/third-edition";
  }
  if (standardNo.startsWith("C-NCAP")) return "http://www.c-ncap.org.cn";
  if (standardNo.startsWith("JNCAP")) {
    return "https://www.nasva.go.jp/mamoru/en/assessment_car/crackup_test.html";
  }
  if (standardNo.startsWith("KNCAP")) return "https://www.kncap.org";
  if (/whiplash|rear impact/i.test(record.title)) {
    return "https://www.euroncap.com/en/for-engineers";
  }
  return undefined;
}

async function main() {
  const standardsPath = resolve("src/data/standards.json");
  const auditPath = resolve("src/data/standards-audit.json");
  const records = JSON.parse(
    await readFile(standardsPath, "utf8"),
  ) as StandardRecord[];
  const removed: Array<{
    id: string;
    standardNo: string;
    title: string;
    version: string;
    reason: string;
    removedAt: string;
    removedBy: string;
  }> = [];
  const seen = new Set<string>();
  const kept: StandardRecord[] = [];

  for (const record of records) {
    const family = standardFamilyKey(record.standardNo);
    const inScope =
      keepFamilies.has(family) ||
      keepTitlePatterns.some((pattern) => pattern.test(record.title));
    if (!inScope) {
      removed.push({
        id: record.id,
        standardNo: record.standardNo,
        title: record.title,
        version: record.version,
        reason:
          "PRD 范围过滤：与 M1 座椅、座椅固定点、头枕、调节机构或头枕/鞭打试验无直接关系。",
        removedAt: curatedAt,
        removedBy: "SeatScope 标准维护",
      });
      continue;
    }

    const duplicateKey = [
      family,
      normalizeStandardKey(record.version),
      normalizeStandardKey(record.title),
      record.status,
    ].join("|");
    if (seen.has(duplicateKey)) {
      removed.push({
        id: record.id,
        standardNo: record.standardNo,
        title: record.title,
        version: record.version,
        reason: `同一标准版本重复记录，保留 ${record.standardNo} ${record.version} 的首条记录。`,
        removedAt: curatedAt,
        removedBy: "SeatScope 标准维护",
      });
      continue;
    }
    seen.add(duplicateKey);

    const monitored =
      family.startsWith("fmvss") ||
      family.startsWith("cmvss") ||
      family.startsWith("unr") ||
      family.startsWith("ungtr") ||
      family.startsWith("ecetrans");
    const isGbt7258Draft =
      family === "gb7258" && /意见征求版/.test(record.title);
    kept.push({
      ...record,
      version: isGbt7258Draft ? "征求意见稿" : record.version,
      status: isGbt7258Draft ? "draft" : record.status,
      monitored,
      sourceUrl: sourceUrlFor(record),
      updatedAt: curatedAt,
      updatedBy: "SeatScope 标准维护",
      note: monitored
        ? "已纳入自动信源适配范围；结论仍须人工核对原文。"
        : "目录记录；官网结构或下载权限需人工跟踪。",
    });
  }

  await Promise.all([
    writeFile(standardsPath, `${JSON.stringify(kept, null, 2)}\n`, "utf8"),
    writeFile(auditPath, `${JSON.stringify(removed, null, 2)}\n`, "utf8"),
  ]);
  console.log(
    JSON.stringify({
      before: records.length,
      kept: kept.length,
      removed: removed.length,
      auditPath,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
