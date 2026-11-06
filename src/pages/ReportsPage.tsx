import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ReportCard } from "../components/ReportCard";
import { StatusBadge } from "../components/StatusBadge";
import { reviewLabels, severityLabels } from "../lib/format";
import type {
  RegulationChange,
  ReportRecord,
  ReviewStatus,
  Severity,
} from "../types";

export function ReportsPage({
  reports,
  changes,
}: {
  reports: ReportRecord[];
  changes: RegulationChange[];
}) {
  const [params, setParams] = useSearchParams();
  const reviewStatus = params.get("review") ?? "";
  const severity = params.get("severity") ?? "";
  const query = params.get("q") ?? "";
  const filtered = useMemo(
    () =>
      [...reports]
        .filter(
          (report) =>
            (!reviewStatus || report.reviewStatus === reviewStatus) &&
            (!severity || report.severity === severity) &&
            (!query ||
              `${report.title} ${report.summary}`
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [reports, params],
  );
  const counts = reports.reduce<Record<ReviewStatus, number>>(
    (acc, report) => {
      acc[report.reviewStatus] += 1;
      return acc;
    },
    { draft: 0, approved: 0, rejected: 0, superseded: 0 },
  );

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Review desk / manual release gate</span>
          <h1>审核稿</h1>
          <p>
            AI 只生成草稿。锁老师核对证据、日期和影响后，可将状态改为已批准；
            只有已批准报告才出现“复制飞书摘要”。系统不会自动发送飞书。
          </p>
        </div>
        <div className="heading-stat">
          <b>{counts.draft}</b>
          <span>份待人工复核</span>
        </div>
      </header>

      <section className="review-stage">
        <div className="review-stage-head">
          <span>发布闸门</span>
          <strong>AI 生成 → 人工复核 → 手动发送</strong>
        </div>
        <div className="review-steps">
          <div>
            <b>01</b>
            <span>草稿</span>
            <small>结构化校验通过，等待锁老师检查</small>
          </div>
          <div>
            <b>02</b>
            <span>批准</span>
            <small>人工确认证据、影响与日期</small>
          </div>
          <div>
            <b>03</b>
            <span>复制摘要</span>
            <small>仅在批准后开放复制</small>
          </div>
          <div>
            <b>04</b>
            <span>手动发飞书</span>
            <small>由审核人自行粘贴发送</small>
          </div>
        </div>
      </section>

      <section className="filter-console" aria-label="审核稿筛选">
        <label className="search-field">
          <span>审核稿检索</span>
          <input
            type="search"
            value={query}
            placeholder="报告标题或摘要"
            onChange={(event) => setFilter("q", event.target.value)}
          />
        </label>
        <label>
          <span>审核状态</span>
          <select
            value={reviewStatus}
            onChange={(event) => setFilter("review", event.target.value)}
          >
            <option value="">全部状态</option>
            {Object.entries(reviewLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>影响级别</span>
          <select
            value={severity}
            onChange={(event) => setFilter("severity", event.target.value)}
          >
            <option value="">全部级别</option>
            {Object.entries(severityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(query || reviewStatus || severity) && (
          <button
            type="button"
            className="button button-quiet filter-reset"
            onClick={() => setParams({}, { replace: true })}
          >
            清除筛选
          </button>
        )}
      </section>

      <div className="report-list">
        {filtered.map((report) => (
          <ReportCard key={report.id} report={report} changes={changes} />
        ))}
        {filtered.length === 0 && (
          <div className="reports-empty">
            <EmptyState
              title={reports.length === 0 ? "尚无审核稿" : "没有匹配的审核稿"}
              description={
                reports.length === 0
                  ? "监测任务只有在检测到真实变化、取得证据并完成 DeepSeek JSON 校验后才会生成 HTML 审核稿。没有 API Key 或没有变化时，不生成虚构报告。"
                  : "尝试清除筛选条件。"
              }
            />
            <div className="review-status-legend">
              {(["draft", "approved", "rejected", "superseded"] as const).map(
                (status) => (
                  <div key={status}>
                    <StatusBadge value={status} />
                    <span>{counts[status]} 份</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
