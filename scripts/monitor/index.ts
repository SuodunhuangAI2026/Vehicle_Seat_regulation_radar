import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  MonitorMeta,
  RegulationChange,
  ReportRecord,
  SourceRecord,
} from "../../src/types/index.js";
import { sourceAdapters } from "./adapters/index.js";
import { createDeepSeekAnalyzer } from "./deepseek.js";
import {
  materializeReport,
  mergeChangeReviewState,
  readJsonFile,
  updateMeta,
  writeJsonFileAtomic,
} from "./pipeline.js";
import { runMonitor } from "./runner.js";
import {
  readSnapshotState,
  writeSnapshotState,
} from "./state.js";

async function main() {
  const sourcesPath = resolve("src/data/sources.json");
  const changesPath = resolve("src/data/changes.json");
  const reportsPath = resolve("src/data/reports.json");
  const metaPath = resolve("src/data/meta.json");
  const snapshotsPath = resolve("monitor/state/snapshots.json");
  const publicDir = resolve("public");
  const attemptedAt = new Date().toISOString();

  const [sources, existingChanges, existingReports, existingMeta, state] =
    await Promise.all([
      readJsonFile<SourceRecord[]>(sourcesPath),
      readJsonFile<RegulationChange[]>(changesPath),
      readJsonFile<ReportRecord[]>(reportsPath),
      readJsonFile<MonitorMeta>(metaPath),
      readSnapshotState(snapshotsPath),
    ]);

  if (!Array.isArray(sources)) {
    throw new Error("sources.json must contain an array");
  }

  const analyzer = createDeepSeekAnalyzer();
  const run = await runMonitor({
    sources,
    adapters: sourceAdapters,
    snapshots: state.snapshots,
    previousHealth: existingMeta.sourceHealth,
    analyze: async (source, snapshot, diff, now) =>
      analyzer(source, snapshot, diff, now),
    rateLimitMs: 500,
  });

  let changes = existingChanges;
  let reports = existingReports;
  const existingById = new Map(changes.map((change) => [change.id, change]));
  const generated: Array<{
    id: string;
    title: string;
    reportPath?: string;
  }> = [];

  for (const candidate of run.changes) {
    const merged = mergeChangeReviewState(
      existingById.get(candidate.id),
      candidate,
    );
    const reportResult = await materializeReport({
      change: merged,
      reports,
      publicDir,
      now: attemptedAt,
    });
    reports = reportResult.reports;
    const finalChange = reportResult.change;
    existingById.set(finalChange.id, finalChange);
    changes = [...existingById.values()];
    generated.push({
      id: finalChange.id,
      title: finalChange.title,
      reportPath: finalChange.reportPath,
    });
  }

  const successful =
    run.health.length === 0 ||
    run.health.some((item) => item.status !== "failed");
  const meta = updateMeta({
    meta: existingMeta,
    health: run.health,
    attemptedAt,
    success: successful,
    model: process.env.DEEPSEEK_MODEL ?? existingMeta.model ?? "deepseek-chat",
  });

  await Promise.all([
    writeSnapshotState(snapshotsPath, {
      version: 1,
      snapshots: run.snapshots,
    }),
    writeJsonFileAtomic(changesPath, changes),
    writeJsonFileAtomic(
      reportsPath,
      [...reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    ),
    writeJsonFileAtomic(metaPath, meta),
  ]);

  console.log(
    JSON.stringify(
      {
        checkedAt: attemptedAt,
        sources: {
          automated: sources.filter(
            (source) => source.monitoringMode === "automated",
          ).length,
          unchanged: run.health.filter((item) => item.status === "unchanged")
            .length,
          changed: run.health.filter((item) => item.status === "changed")
            .length,
          failed: run.health.filter((item) => item.status === "failed").length,
          skipped: run.health.filter((item) => item.status === "skipped").length,
        },
        generated,
        deepSeekKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      },
      null,
      2,
    ),
  );
}

const entry = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (import.meta.url === entry) {
  main().catch((error) => {
    console.error("MONITOR_FAILED", error);
    process.exitCode = 1;
  });
}
