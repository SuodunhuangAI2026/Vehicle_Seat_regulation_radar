import {
  downloadRegulationText,
  loadLatestSnapshot,
  saveSnapshot,
  type RegulationSnapshot,
} from "./regulation-downloader.js";
import {
  compareRegulations,
  type RegulationDiff,
} from "./text-diff.js";

interface RegulationCompareDependencies {
  download: typeof downloadRegulationText;
  loadLatest: typeof loadLatestSnapshot;
  save: typeof saveSnapshot;
}

export interface RegulationCompareResult {
  diff?: RegulationDiff;
  oldSnapshot?: RegulationSnapshot;
  newSnapshot?: RegulationSnapshot;
  savedPath?: string;
  reason?: string;
}

const defaultDependencies: RegulationCompareDependencies = {
  download: downloadRegulationText,
  loadLatest: loadLatestSnapshot,
  save: saveSnapshot,
};

export async function compareAndStoreRegulation(
  input: {
    regulationId: string;
    newSourceUrl: string;
    oldSourceUrl?: string;
  },
  dependencies: Partial<RegulationCompareDependencies> = {},
): Promise<RegulationCompareResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  const oldSnapshot = input.oldSourceUrl
    ? await deps.download(input.oldSourceUrl, `${input.regulationId}-old`)
    : await deps.loadLatest(input.regulationId);
  const newSnapshot = await deps.download(
    input.newSourceUrl,
    input.regulationId,
  );

  if (!newSnapshot) {
    return { oldSnapshot: oldSnapshot ?? undefined, reason: "新版原文下载失败" };
  }

  const savedPath = await deps.save(input.regulationId, newSnapshot);
  if (!oldSnapshot) {
    return {
      newSnapshot,
      savedPath,
      reason: "已保存首份官方原文快照，下一次运行起可生成新旧对比",
    };
  }

  return {
    diff: compareRegulations(oldSnapshot, newSnapshot),
    oldSnapshot,
    newSnapshot,
    savedPath,
  };
}
