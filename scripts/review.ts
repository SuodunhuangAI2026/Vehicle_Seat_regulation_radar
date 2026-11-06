import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type {
  RegulationChange,
  ReportRecord,
} from "../src/types/index.js";
import { buildFeishuSummary } from "../src/lib/report-copy.js";
import { updateReportReviewState } from "./monitor/report-html.js";
import {
  readJsonFile,
  reviewStatusFromFlag,
  writeJsonFileAtomic,
  writeTextFileAtomic,
} from "./monitor/pipeline.js";

async function main() {
  const args = process.argv.slice(2);
  const reportId = args.find((argument) => !argument.startsWith("--"));
  const flag = args.find((argument) => argument.startsWith("--"));
  const decision = flag ? reviewStatusFromFlag(flag) : undefined;
  if (!reportId || !decision) {
    throw new Error(
      "Usage: npm run review -- <report-id> --approve|--reject|--supersede",
    );
  }

  const reportsPath = resolve("src/data/reports.json");
  const changesPath = resolve("src/data/changes.json");
  const reports = await readJsonFile<ReportRecord[]>(reportsPath);
  const changes = await readJsonFile<RegulationChange[]>(changesPath);
  const report = reports.find((item) => item.id === reportId);
  if (!report) {
    throw new Error(`Unknown report: ${reportId}`);
  }

  const reviewedAt = new Date().toISOString();
  const updatedReport: ReportRecord = {
    ...report,
    reviewStatus: decision,
    reviewedAt,
  };

  const publicReportsDir = resolve("public/reports");
  const htmlFilePath = resolve("public", report.htmlPath);
  if (
    htmlFilePath !== publicReportsDir &&
    !htmlFilePath.startsWith(`${publicReportsDir}${sep}`)
  ) {
    throw new Error(`Unsafe report path: ${report.htmlPath}`);
  }
  const html = await readFile(htmlFilePath, "utf8");
  await writeTextFileAtomic(
    htmlFilePath,
    updateReportReviewState(html, decision, reviewedAt),
  );

  const updatedReports = reports.map((item) =>
    item.id === report.id ? updatedReport : item,
  );
  const updatedChanges = changes.map((change) =>
    report.changeIds.includes(change.id)
      ? { ...change, reviewStatus: decision }
      : change,
  );

  await Promise.all([
    writeJsonFileAtomic(reportsPath, updatedReports),
    writeJsonFileAtomic(changesPath, updatedChanges),
  ]);

  console.log(`Report ${report.id} set to ${decision} at ${reviewedAt}`);
  if (decision === "approved") {
    console.log("\n飞书摘要（请由锁老师手动复制并发送）：\n");
    console.log(buildFeishuSummary(updatedReport, updatedChanges));
  } else {
    console.log("飞书摘要未生成：只有 approved 报告允许复制。");
  }
}

main().catch((error) => {
  console.error("REVIEW_FAILED", error);
  process.exitCode = 1;
});
