import { resolve, sep } from "node:path";
import type {
  RegulationChange,
  ReportRecord,
} from "../src/types/index.js";
import { compareAndStoreRegulation } from "./monitor/regulation-compare.js";
import { renderReportHtml } from "./monitor/report-html.js";
import {
  readJsonFile,
  writeJsonFileAtomic,
  writeTextFileAtomic,
} from "./monitor/pipeline.js";
import type { RegulationDiff } from "./monitor/text-diff.js";

interface OfficialComparisonSource {
  regulationId: string;
  oldSourceUrl: string;
  newSourceUrl: string;
}

const officialSources: Record<string, OfficialComparisonSource> = {
  "chg-b7bc7d89014385": {
    regulationId: "canada-crc-c-1038",
    oldSourceUrl:
      "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._1038/20241218/P1TT3xt3.html",
    newSourceUrl:
      "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._1038/FullText.html",
  },
};

function changedSections(diff: RegulationDiff) {
  return diff.sections.filter(
    (section) => section.changeType !== "unchanged",
  );
}

function hasSeatTerms(diff: RegulationDiff): boolean {
  return changedSections(diff).some((section) =>
    /seat|seating|head restraint|headrest|isofix|tether|anchor|occupant restraint/i.test(
      `${section.sectionTitle}\n${section.oldContent ?? ""}\n${section.newContent ?? ""}`,
    ),
  );
}

function summaryFor(diff: RegulationDiff): string {
  const changed = changedSections(diff);
  const titles = changed
    .slice(0, 8)
    .map((section) => `“${section.sectionTitle}”`)
    .join("、");
  const seatFinding = hasSeatTerms(diff)
    ? "变化文本中出现座椅相关词，须逐条复核其适用范围。"
    : "变化文本未出现座椅、头枕、ISOFIX、固定点或乘员约束等 M1 座椅技术条款，本轮不据此提出座椅设计或试验变更。";
  return [
    `加拿大司法部官方合并文本显示，现行版本为 ${diff.newVersion}。`,
    `与 ${diff.oldVersion} 历史版本逐段比对，新增 ${diff.summary.added} 个章节、修改 ${diff.summary.modified} 个章节、删除 ${diff.summary.removed} 个章节。`,
    titles ? `变化章节包括：${titles}。` : "未检测到章节级文本变化。",
    seatFinding,
  ].join("");
}

function officialEvidence(diff: RegulationDiff) {
  return [
    {
      label: `现行官方合并文本（${diff.newVersion}）`,
      url: diff.newSourceUrl ?? "",
    },
    {
      label: `历史官方合并文本（${diff.oldVersion}）`,
      url: diff.oldSourceUrl ?? "",
    },
    {
      label: "Transport Canada：Motor Vehicle Safety Regulations 变化记录",
      url: "https://tc.canada.ca/en/corporate-services/acts-regulations/list-regulations/motor-vehicle-safety-regulations-crc-c-1038/motor-vehicle-safety-regulations-crc-c-1038-regulatory-change",
    },
  ].filter((item) => item.url);
}

function updatedChange(
  change: RegulationChange,
  diff: RegulationDiff,
): RegulationChange {
  const seatRelated = hasSeatTerms(diff);
  return {
    ...change,
    standardNumbers:
      change.standardNumbers.length > 0
        ? change.standardNumbers
        : ["C.R.C., c. 1038"],
    oldVersion: diff.oldVersion,
    newVersion: diff.newVersion,
    effectiveDate: diff.newVersion,
    summaryZh: summaryFor(diff),
    impactedDesignAreas: seatRelated
      ? ["变化文本出现座椅相关词，待逐条复核 M1 座椅设计要求"]
      : [
          "暂未发现涉及 M1 座椅总成、骨架、滑轨、固定点、ISOFIX 或头枕的条款变化",
        ],
    impactedTestMethods: [
      "暂未发现需要调整的座椅试验方法，仍以人工复核官方原文为准",
    ],
    recommendedActions: [
      "人工打开左右对比中的官方来源，确认新增和修改章节的适用范围",
      "确认本轮变化不涉及 M1 座椅后，留存审核记录",
      "后续通告如明确涉及座椅，再启动设计影响评估",
    ],
    evidence: officialEvidence(diff),
    confidence: "medium",
    reviewStatus: "draft",
  };
}

async function main() {
  const requestedId = process.argv[2];
  if (!requestedId) {
    throw new Error(
      "Usage: npm run regenerate-report -- <change-id-or-report-id>",
    );
  }

  const reportsPath = resolve("src/data/reports.json");
  const changesPath = resolve("src/data/changes.json");
  const [reports, changes] = await Promise.all([
    readJsonFile<ReportRecord[]>(reportsPath),
    readJsonFile<RegulationChange[]>(changesPath),
  ]);

  const matchedReport = reports.find(
    (report) =>
      report.id === requestedId || report.changeIds.includes(requestedId),
  );
  const changeId = matchedReport?.changeIds[0] ?? requestedId;
  const existingChange = changes.find((change) => change.id === changeId);
  if (!existingChange) {
    throw new Error(`Unknown change or report: ${requestedId}`);
  }

  const source = officialSources[changeId];
  if (!source) {
    throw new Error(`No official comparison source configured for ${changeId}`);
  }

  const result = await compareAndStoreRegulation({
    regulationId: source.regulationId,
    oldSourceUrl: source.oldSourceUrl,
    newSourceUrl: source.newSourceUrl,
  });
  if (!result.diff) {
    throw new Error(result.reason ?? "Official regulation comparison failed");
  }

  const generatedAt = new Date().toISOString();
  const change = updatedChange(existingChange, result.diff);
  const report =
    matchedReport ??
    reports.find((item) => item.changeIds.includes(change.id)) ??
    ({
      id: `report-${change.id.replace(/^chg-/, "")}`,
      title: change.title,
      generatedAt,
      changeIds: [change.id],
      severity: change.severity,
      reviewStatus: change.reviewStatus,
      htmlPath: change.reportPath ?? `reports/${change.id}.html`,
      summary: change.summaryZh.slice(0, 360),
    } satisfies ReportRecord);
  const htmlPath = report.htmlPath;
  const outputPath = resolve("public", htmlPath);
  const publicReportsDir = resolve("public/reports");
  if (
    outputPath !== publicReportsDir &&
    !outputPath.startsWith(`${publicReportsDir}${sep}`)
  ) {
    throw new Error(`Unsafe report path: ${htmlPath}`);
  }

  const html = renderReportHtml(change, result.diff, generatedAt);
  const updatedReport: ReportRecord = {
    ...report,
    title: change.title,
    generatedAt,
    severity: change.severity,
    reviewStatus: change.reviewStatus,
    htmlPath,
    summary: change.summaryZh.slice(0, 360),
  };
  const nextReports = reports.some((item) => item.id === updatedReport.id)
    ? reports.map((item) =>
        item.id === updatedReport.id ? updatedReport : item,
      )
    : [updatedReport, ...reports];
  const nextChanges = changes.map((item) =>
    item.id === change.id ? change : item,
  );

  await Promise.all([
    writeTextFileAtomic(outputPath, html),
    writeJsonFileAtomic(changesPath, nextChanges),
    writeJsonFileAtomic(
      reportsPath,
      nextReports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        reportId: updatedReport.id,
        generatedAt,
        oldVersion: result.diff.oldVersion,
        newVersion: result.diff.newVersion,
        summary: result.diff.summary,
        output: outputPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("REGENERATE_FAILED", error);
  process.exitCode = 1;
});
