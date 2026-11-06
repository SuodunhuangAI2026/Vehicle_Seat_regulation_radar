import type { RegulationChange, ReportRecord } from "../types";
import { formatDate } from "./format";

function firstKnownDate(change: RegulationChange): string {
  const candidates = [
    change.effectiveDate,
    change.transitionEnd,
    change.commentEnd,
    change.publicationDate,
  ];
  return formatDate(candidates.find(Boolean));
}

export function buildFeishuSummary(
  report: ReportRecord,
  changes: RegulationChange[],
): string {
  const related = changes.filter((change) =>
    report.changeIds.includes(change.id),
  );
  const standardNumbers = [
    ...new Set(related.flatMap((change) => change.standardNumbers)),
  ].join("、");
  const actions = [
    ...new Set(related.flatMap((change) => change.recommendedActions)),
  ].slice(0, 4);
  const evidence = [
    ...new Set(related.flatMap((change) => change.evidence.map((item) => item.url))),
  ];

  return [
    "【SeatScope 法规影响提示 · 已人工审核】",
    `审核人：锁老师`,
    `主题：${report.title}`,
    `涉及标准：${standardNumbers || "以审核稿为准"}`,
    `影响摘要：${report.summary}`,
    `关键节点：${firstKnownDate(related[0])}`,
    `建议动作：${actions.length > 0 ? actions.join("；") : "以审核稿为准"}`,
    `证据链接：${evidence.length > 0 ? evidence.join("\n") : "以审核稿为准"}`,
    `审核稿：${report.htmlPath}`,
    "说明：本摘要由 AI 辅助整理并经人工审核，不构成法规、认证或放行结论。",
  ].join("\n");
}
