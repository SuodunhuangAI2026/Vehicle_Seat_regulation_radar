import {
  changeTypeLabels,
  reviewLabels,
  severityLabels,
} from "../lib/format";
import type { ChangeType, ReviewStatus, Severity } from "../types";

type KnownStatus =
  | ChangeType
  | ReviewStatus
  | Severity
  | "active"
  | "draft-standard"
  | "automated"
  | "catalogued"
  | "unsupported"
  | "unchanged"
  | "changed"
  | "failed"
  | "skipped";

const labels: Partial<Record<KnownStatus, string>> = {
  ...changeTypeLabels,
  ...reviewLabels,
  ...severityLabels,
  active: "现行库记录",
  automated: "自动监控",
  catalogued: "人工浏览",
  unsupported: "暂不支持自动抓取",
  unchanged: "无变化",
  changed: "有变化",
  failed: "抓取失败",
  skipped: "已跳过",
};

const danger = new Set(["critical", "high", "repeal", "rejected", "failed"]);
const warning = new Set([
  "medium",
  "draft",
  "unassessed",
  "changed",
  "catalogued",
]);
const positive = new Set(["approved", "unchanged", "automated", "active"]);

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const tone = danger.has(value)
    ? "danger"
    : warning.has(value)
      ? "warning"
      : positive.has(value)
        ? "positive"
        : "neutral";
  return (
    <span className={`status-badge status-${tone}`}>
      {label ?? labels[value as KnownStatus] ?? value}
    </span>
  );
}
