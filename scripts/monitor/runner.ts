import type {
  RegulationChange,
  SourceHealth,
  SourceRecord,
} from "../../src/types/index.js";
import type {
  SourceAdapter,
  SourceSnapshot,
} from "./adapters.js";
import { diffSnapshot, type SnapshotDiff } from "./diff.js";

export interface MonitorOptions {
  sources: SourceRecord[];
  adapters: SourceAdapter[];
  snapshots?: Record<string, SourceSnapshot>;
  previousHealth?: SourceHealth[];
  analyze: (
    source: SourceRecord,
    snapshot: SourceSnapshot,
    diff: SnapshotDiff,
    now: string,
  ) => Promise<RegulationChange | null>;
  now?: () => Date;
  rateLimitMs?: number;
}

export interface MonitorRun {
  health: SourceHealth[];
  changes: RegulationChange[];
  snapshots: Record<string, SourceSnapshot>;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function runMonitor(options: MonitorOptions): Promise<MonitorRun> {
  const now = options.now ?? (() => new Date());
  const snapshots = { ...(options.snapshots ?? {}) };
  const health: SourceHealth[] = [];
  const changes: RegulationChange[] = [];
  const previousHealth = new Map(
    (options.previousHealth ?? []).map((item) => [item.sourceId, item]),
  );
  const automated = options.sources.filter(
    (source) => source.monitoringMode === "automated",
  );

  for (let index = 0; index < automated.length; index += 1) {
    const source = automated[index];
    const checkedAt = now().toISOString();
    const previousHealthEntry = previousHealth.get(source.id);
    const adapter = options.adapters.find(
      (candidate) =>
        candidate.id === source.adapterId || candidate.matches(source),
    );

    if (!adapter) {
      health.push({
        sourceId: source.id,
        status: "skipped",
        checkedAt,
        lastSuccessAt: previousHealthEntry?.lastSuccessAt,
        error: "没有匹配该信源的首版适配器",
      });
      continue;
    }

    try {
      const previous = snapshots[source.id];
      const next = await adapter.fetch(source, previous);
      const diff = diffSnapshot(previous, next);
      let analysisError: string | undefined;

      if (diff.changed) {
        try {
          const change = await options.analyze(
            source,
            next,
            diff,
            checkedAt,
          );
          if (change) changes.push(change);
        } catch (error) {
          analysisError = `内容已变化，但分析失败：${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      }

      snapshots[source.id] = next;
      health.push({
        sourceId: source.id,
        status: diff.changed ? "changed" : "unchanged",
        checkedAt,
        lastSuccessAt: checkedAt,
        error: analysisError ?? next.warning,
      });
    } catch (error) {
      health.push({
        sourceId: source.id,
        status: "failed",
        checkedAt,
        lastSuccessAt: previousHealthEntry?.lastSuccessAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (index < automated.length - 1) {
      await sleep(options.rateLimitMs ?? 400);
    }
  }

  return { health, changes, snapshots };
}
