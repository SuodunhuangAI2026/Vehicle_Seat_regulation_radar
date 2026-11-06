import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  MonitorMeta,
  RegulationChange,
  ReportRecord,
  ReviewStatus,
  SourceHealth,
} from "../../src/types/index.js";
import { renderReportHtml } from "./report-html.js";

export async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeJsonFileAtomic(
  path: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, path);
}

export async function writeTextFileAtomic(
  path: string,
  value: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, value, "utf8");
  await rename(tempPath, path);
}

function reportId(change: RegulationChange): string {
  return `report-${change.id.replace(/^chg-/, "")}`;
}

export function reportPathForChange(change: RegulationChange): string {
  const date = change.detectedAt.slice(0, 10);
  const safeId = change.id.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return `reports/${date}-${safeId}.html`;
}

export function mergeChangeReviewState(
  existing: RegulationChange | undefined,
  next: RegulationChange,
): RegulationChange {
  if (!existing) return next;
  return {
    ...next,
    reviewStatus: existing.reviewStatus,
    reportPath: existing.reportPath ?? next.reportPath,
  };
}

export async function materializeReport(input: {
  change: RegulationChange;
  reports: ReportRecord[];
  publicDir: string;
  now: string;
}): Promise<{
  change: RegulationChange;
  reports: ReportRecord[];
  written: boolean;
  htmlPath: string;
}> {
  const existing = input.reports.find((report) =>
    report.changeIds.includes(input.change.id),
  );
  const htmlPath = existing?.htmlPath ?? reportPathForChange(input.change);

  if (existing && existing.reviewStatus !== "draft") {
    return {
      change: {
        ...input.change,
        reviewStatus: existing.reviewStatus,
        reportPath: htmlPath,
      },
      reports: input.reports,
      written: false,
      htmlPath,
    };
  }

  const nextChange: RegulationChange = {
    ...input.change,
    reviewStatus: existing?.reviewStatus ?? "draft",
    reportPath: htmlPath,
  };
  const outputPath = resolve(input.publicDir, htmlPath);
  await writeTextFileAtomic(outputPath, renderReportHtml(nextChange));

  const nextReport: ReportRecord = {
    id: existing?.id ?? reportId(nextChange),
    title: nextChange.title,
    generatedAt: existing?.generatedAt ?? input.now,
    changeIds: [nextChange.id],
    severity: nextChange.severity,
    reviewStatus: existing?.reviewStatus ?? "draft",
    reviewedAt: existing?.reviewedAt,
    htmlPath,
    summary: nextChange.summaryZh.slice(0, 360),
  };
  const reports = existing
    ? input.reports.map((report) =>
        report.id === existing.id ? nextReport : report,
      )
    : [nextReport, ...input.reports];

  return {
    change: nextChange,
    reports,
    written: true,
    htmlPath,
  };
}

export function mergeSourceHealth(
  previous: SourceHealth[],
  current: SourceHealth[],
): SourceHealth[] {
  const currentIds = new Set(current.map((item) => item.sourceId));
  return [
    ...previous.filter((item) => !currentIds.has(item.sourceId)),
    ...current,
  ];
}

export function updateMeta(input: {
  meta: MonitorMeta;
  health: SourceHealth[];
  attemptedAt: string;
  success: boolean;
  model: string;
}): MonitorMeta {
  return {
    ...input.meta,
    lastAttemptedRun: input.attemptedAt,
    lastSuccessfulRun: input.success
      ? input.attemptedAt
      : input.meta.lastSuccessfulRun,
    sourceHealth: mergeSourceHealth(input.meta.sourceHealth ?? [], input.health),
    model: input.model,
  };
}

export function reviewStatusFromFlag(
  flag: string,
): ReviewStatus | undefined {
  if (flag === "--approve") return "approved";
  if (flag === "--reject") return "rejected";
  if (flag === "--supersede") return "superseded";
  return undefined;
}
