import type { SourceItem, SourceSnapshot } from "./adapters.js";

export interface SnapshotDiff {
  changed: boolean;
  added: SourceItem[];
  removed: SourceItem[];
  changedItems: SourceItem[];
  changedPairs?: Array<{ previous: SourceItem; next: SourceItem }>;
}

function itemEquivalent(a: SourceItem, b: SourceItem): boolean {
  return (
    a.title === b.title &&
    a.url === b.url &&
    (a.version ?? "") === (b.version ?? "") &&
    (a.publishedAt ?? "") === (b.publishedAt ?? "") &&
    (a.contentHash ?? "") === (b.contentHash ?? "")
  );
}

export function diffSnapshot(
  previous: SourceSnapshot | undefined,
  next: SourceSnapshot,
): SnapshotDiff {
  if (!previous) {
    return { changed: false, added: [], removed: [], changedItems: [] };
  }

  const previousItems = new Map(previous.items.map((item) => [item.key, item]));
  const nextItems = new Map(next.items.map((item) => [item.key, item]));
  const added = next.items.filter((item) => !previousItems.has(item.key));
  const removed = previous.items.filter((item) => !nextItems.has(item.key));
  const changedItems = next.items.filter((item) => {
    const oldItem = previousItems.get(item.key);
    return oldItem ? !itemEquivalent(oldItem, item) : false;
  });
  const changedPairs = changedItems.flatMap((item) => {
    const oldItem = previousItems.get(item.key);
    return oldItem ? [{ previous: oldItem, next: item }] : [];
  });

  return {
    changed:
      added.length > 0 ||
      removed.length > 0 ||
      changedItems.length > 0 ||
      previous.hash !== next.hash,
    added,
    removed,
    changedItems,
    changedPairs,
  };
}

export function summarizeDiff(diff: SnapshotDiff): string {
  const lines = [
    `新增 ${diff.added.length} 项`,
    `移除 ${diff.removed.length} 项`,
    `变更 ${diff.changedItems.length} 项`,
  ];
  for (const section of [
    ["新增", diff.added],
    ["移除", diff.removed],
    ["版本变化", diff.changedItems],
  ] as const) {
    for (const item of section[1].slice(0, 20)) {
      lines.push(
        `[${section[0]}] ${item.title}${item.version ? ` | ${item.version}` : ""} | ${item.url}${item.summary ? ` | ${item.summary.slice(0, 280)}` : ""}`,
      );
    }
  }
  return lines.join("\n");
}
