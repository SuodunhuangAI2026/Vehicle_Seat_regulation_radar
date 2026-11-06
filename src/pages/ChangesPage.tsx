import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ChangeCard } from "../components/ChangeCard";
import { EmptyState } from "../components/EmptyState";
import {
  changeTypeLabels,
  reviewLabels,
  severityLabels,
} from "../lib/format";
import { filterChanges } from "../lib/filters";
import type {
  ChangeType,
  RegulationChange,
  ReviewStatus,
  Severity,
} from "../types";

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  unassessed: 4,
};

export function ChangesPage({ changes }: { changes: RegulationChange[] }) {
  const [params, setParams] = useSearchParams();
  const filters = {
    query: params.get("q") ?? "",
    system: params.get("system") ?? "",
    issuer: params.get("issuer") ?? "",
    changeType: params.get("type") ?? "",
    severity: params.get("severity") ?? "",
    reviewStatus: params.get("review") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
  const systems = [...new Set(changes.map((change) => change.system))].sort();
  const issuers = [...new Set(changes.map((change) => change.issuer))].sort();
  const result = useMemo(
    () =>
      filterChanges(changes, filters).sort(
        (a, b) =>
          severityOrder[a.severity] - severityOrder[b.severity] ||
          b.detectedAt.localeCompare(a.detectedAt),
      ),
    [changes, params],
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
          <span className="eyebrow">Change radar / review queue</span>
          <h1>变更雷达</h1>
          <p>
            从标准号、摘要、设计影响和试验方法中检索。未知日期与未评估影响会明确保留，
            不会用推测值填满版面。
          </p>
        </div>
        <div className="heading-stat">
          <b>{result.length}</b>
          <span>条匹配记录</span>
        </div>
      </header>

      <section className="filter-console" aria-label="变更筛选">
        <label className="search-field">
          <span>全文检索</span>
          <input
            type="search"
            value={filters.query}
            placeholder="标准号、标题、影响或试验方法"
            onChange={(event) => setFilter("q", event.target.value)}
          />
        </label>
        <label>
          <span>体系</span>
          <select
            value={filters.system}
            onChange={(event) => setFilter("system", event.target.value)}
          >
            <option value="">全部体系</option>
            {systems.map((system) => (
              <option key={system} value={system}>
                {system}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>发布机构</span>
          <select
            value={filters.issuer}
            onChange={(event) => setFilter("issuer", event.target.value)}
          >
            <option value="">全部机构</option>
            {issuers.map((issuer) => (
              <option key={issuer} value={issuer}>
                {issuer}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>变化类型</span>
          <select
            value={filters.changeType}
            onChange={(event) => setFilter("type", event.target.value)}
          >
            <option value="">全部类型</option>
            {Object.entries(changeTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>影响级别</span>
          <select
            value={filters.severity}
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
        <label>
          <span>审核状态</span>
          <select
            value={filters.reviewStatus}
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
          <span>检测起始日</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilter("from", event.target.value)}
          />
        </label>
        <label>
          <span>检测结束日</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilter("to", event.target.value)}
          />
        </label>
        {(filters.query ||
          filters.system ||
          filters.issuer ||
          filters.changeType ||
          filters.severity ||
          filters.reviewStatus ||
          filters.from ||
          filters.to) && (
          <button
            type="button"
            className="button button-quiet filter-reset"
            onClick={() => setParams({}, { replace: true })}
          >
            清除筛选
          </button>
        )}
      </section>

      <section className="changes-grid" aria-live="polite">
        {result.map((change) => (
          <ChangeCard key={change.id} change={change} />
        ))}
        {result.length === 0 && (
          <EmptyState
            title="没有匹配的变更"
            description="尝试缩短关键词或清除筛选条件。没有数据时不会自动生成占位法规。"
          />
        )}
      </section>
    </div>
  );
}
