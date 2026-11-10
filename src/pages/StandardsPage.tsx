import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { filterStandards, groupStandards } from "../lib/filters";
import { standardStatusLabels } from "../lib/format";
import type { StandardRecord } from "../types";

function statusRank(record: StandardRecord): number {
  if (record.status === "active") return 4;
  if (record.status === "unknown") return 3;
  if (record.status === "superseded") return 2;
  return 1;
}

function versionLabel(record: StandardRecord): string {
  if (record.status === "draft") return "征求意见稿";
  if (record.status === "superseded") return "旧版";
  return "其他版本";
}

export function StandardsPage({
  standards,
}: {
  standards: StandardRecord[];
}) {
  const [params, setParams] = useSearchParams();
  const filters = {
    query: params.get("q") ?? "",
    system: params.get("system") ?? "",
    issuer: params.get("issuer") ?? "",
    status: params.get("status") ?? "",
    monitored: params.get("monitored") ?? "",
  };
  const systems = [...new Set(standards.map((item) => item.system))].sort();
  const issuers = [...new Set(standards.map((item) => item.issuer))].sort();
  const filtered = useMemo(
    () => filterStandards(standards, filters),
    [standards, params],
  );
  const groups = groupStandards(filtered);

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
          <span className="eyebrow">Standards library / document ledger</span>
          <h1>标准库</h1>
        </div>
        <div className="heading-stat">
          <b>{filtered.length}</b>
          <span>条文档记录</span>
        </div>
      </header>

      <section className="filter-console" aria-label="标准筛选">
        <label className="search-field">
          <span>标准检索</span>
          <input
            type="search"
            value={filters.query}
            placeholder="标准号、名称、版本或文件名"
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
          <span>库内状态</span>
          <select
            value={filters.status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="">全部状态</option>
            <option value="active">现行库记录</option>
            <option value="draft">征求意见</option>
            <option value="superseded">已替代</option>
            <option value="unknown">未确认</option>
          </select>
        </label>
        <label>
          <span>监控范围</span>
          <select
            value={filters.monitored}
            onChange={(event) => setFilter("monitored", event.target.value)}
          >
            <option value="">全部记录</option>
            <option value="yes">纳入自动适配器体系</option>
            <option value="no">仅目录记录</option>
          </select>
        </label>
        {(filters.query ||
          filters.system ||
          filters.issuer ||
          filters.status ||
          filters.monitored) && (
          <button
            type="button"
            className="button button-quiet filter-reset"
            onClick={() => setParams({}, { replace: true })}
          >
            清除筛选
          </button>
        )}
      </section>

      <div className="standards-table-wrap">
        <div className="standards-table-head">
          <span>标准号与名称</span>
          <span>体系 / 机构</span>
          <span>版本记录</span>
          <span>获取地址</span>
          <span>状态</span>
        </div>
        {groups.map((group) => {
          const sorted = [...group.records].sort((a, b) => {
            const rankDelta = statusRank(b) - statusRank(a);
            if (rankDelta !== 0) return rankDelta;
            return b.version.localeCompare(a.version, "zh-CN", {
              numeric: true,
            });
          });
          const current = sorted[0];
          const older = sorted.slice(1);
          const hasDraft = sorted.some((record) => record.status === "draft");

          return (
            <article className="standard-row" key={group.key}>
              <div className="standard-main">
                <span className="standard-code">{current.standardNo}</span>
                <h2>{current.title}</h2>
                {hasDraft && (
                  <p className="draft-disclosure">
                    含征求意见稿，未批准、未生效；正式状态以官方发布为准。
                  </p>
                )}
              </div>
              <div>
                <StatusBadge value={current.system} />
                <span className="cell-sub">{current.issuer}</span>
              </div>
              <div className="version-links">
                <Link
                  to={`/standards/${current.id}`}
                  className="version-latest"
                >
                  {current.version}
                  <small>{current.documentKind}</small>
                </Link>
                {older.map((record) => (
                  <div key={record.id} className="version-old">
                    <span className="version-old-label">
                      {versionLabel(record)}：
                    </span>
                    <Link to={`/standards/${record.id}`}>
                      {record.version}
                      {record.documentKind && (
                        <small>{record.documentKind}</small>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
              <div className="source-url-cell">
                {current.sourceUrl ? (
                  <a
                    href={current.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="source-link"
                  >
                    官方来源 →
                  </a>
                ) : (
                  <span className="source-missing">官方链接待补充</span>
                )}
              </div>
              <div>
                <StatusBadge
                  value={current.status}
                  label={standardStatusLabels[current.status]}
                />
                <span className="cell-sub">
                  {current.monitored ? "自动体系覆盖" : "目录记录"}
                </span>
              </div>
            </article>
          );
        })}
        {groups.length === 0 && (
          <EmptyState
            title="没有匹配的标准"
            description="尝试放宽体系或机构筛选，或使用更短的关键词。"
          />
        )}
      </div>
    </div>
  );
}
