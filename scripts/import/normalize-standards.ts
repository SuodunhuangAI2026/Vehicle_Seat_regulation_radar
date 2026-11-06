import { createHash } from "node:crypto";
import type { StandardRecord, StandardStatus } from "../../src/types/index.js";

export interface RawStandardDocument {
  standardNo: string;
  version: string;
  fileName: string;
}

export interface RawStandardSummary {
  standardNo: string;
  title: string;
  issuers: string;
  system: string;
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s\-_/（）()]+/g, "");
}

function stableId(value: string): string {
  return `std-${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

function inferSystem(standardNo: string): string {
  if (/FMVSS/i.test(standardNo)) return "FMVSS";
  if (/CMVSS/i.test(standardNo)) return "CMVSS";
  if (/^(UN|ECE|GTR)/i.test(standardNo)) return "ECE";
  if (/^GB/i.test(standardNo)) return "GB";
  if (/^ADR/i.test(standardNo)) return "ADR";
  if (/^QC\/T/i.test(standardNo)) return "行业标准";
  if (/^(UN R|UN GTR)/i.test(standardNo)) return "ECE";
  return "其他标准";
}

function inferDocumentKind(fileName: string): string {
  if (/\.pdf$/i.test(fileName)) return "PDF";
  if (/\.docx?$/i.test(fileName)) return "Word";
  return "文档";
}

function inferStatus(version: string): StandardStatus {
  if (/202X|草案|征求意见|DRAFT/i.test(version)) return "draft";
  return "active";
}

function isMonitoredSystem(system: string): boolean {
  return ["FMVSS", "CMVSS", "ECE", "GB"].includes(system);
}

export function normalizeStandardRows(
  documents: RawStandardDocument[],
  summaries: RawStandardSummary[],
  importedAt = new Date().toISOString(),
): StandardRecord[] {
  const summaryIndex = new Map<string, RawStandardSummary>();
  for (const summary of summaries) {
    const key = normalizeKey(summary.standardNo);
    if (key && !summaryIndex.has(key)) {
      summaryIndex.set(key, summary);
    }
  }

  return documents.map((document, index) => {
    const standardNo = document.standardNo.trim() || "未编号";
    const version = document.version.trim() || "未标注";
    const fileName = document.fileName.trim();
    const summary = summaryIndex.get(normalizeKey(standardNo));
    const system = summary?.system.trim() || inferSystem(standardNo);
    const status = inferStatus(version);

    return {
      id: stableId(`${standardNo}|${version}|${fileName}|${index}`),
      standardNo,
      title: summary?.title.trim() || fileName.replace(/\.[^.]+$/, ""),
      version,
      issuer: summary?.issuers.trim() || "待核实",
      system,
      documentKind: inferDocumentKind(fileName),
      sourceFileName: fileName,
      status,
      monitored: isMonitoredSystem(system),
      importedAt,
    };
  });
}
