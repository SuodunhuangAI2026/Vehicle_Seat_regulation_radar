import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime } from "../lib/format";
import { filterSources } from "../lib/filters";
import type {
  ImportReport,
  SourceHealth,
  SourceRecord,
} from "../types";

export function SourcesPage({
  sources,
  health,
  importReport,
}: {
  sources: SourceRecord[];
  health: SourceHealth[];
  importReport: ImportReport;
}) {
  const [params, setParams] = useSearchParams();
  const filters = {
    query: params.get("q") ?? "",
    category: params.get("category") ?? "",
    mode: params.get("mode") ?? "",
    status: params.get("status") ?? "",
  };
  const categories = [...new Set(sources.map((source) => source.category))];
  const filtered = useMemo(
    () => filterSources(sources, filters, health),
    [sources, health, params],
  );
  const healthById = new Map(health.map((entry) => [entry.sourceId, entry]));
  const grouped = categories
    .map((category) => ({
      category,
      sources: filtered.filter((source) => source.category === category),
    }))
    .filter((group) => group.sources.length > 0);

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
          <span className="eyebrow">Source center / monitoring coverage</span>
          <h1>信源中心</h1>
          <p>
            92 个唯一网址按原文档栏目组织。首版只有四个适配器领域自动抓取，
            其余来源明确标为人工浏览，不把“收录”写成“已监控”。
          </p>
        </div>
        <div className="heading-stat">
          <b>{filtered.length}</b>
          <span>个匹配信源</span>
        </div>
      </header>

      <aside className="source-disclosure">
        <span className="source-disclosure-number">{importReport.sources.extractedUrls}</span>
        <div>
          <strong>已从文档提取 92 个唯一网址</strong>
          <p>
            原文档部分栏目标注数量合计为{" "}
            {importReport.sources.sectionReportedItems} 项，高于实际可提取链接数。
            缺失项未被虚构补齐。
          </p>
        </div>
      </aside>

      <section className="filter-console" aria-label="信源筛选">
        <label className="search-field">
          <span>信源检索</span>
          <input
            type="search"
            value={filters.query}
            placeholder="名称、网址或适配器"
            onChange={(event) => setFilter("q", event.target.value)}
          />
        </label>
        <label>
          <span>栏目</span>
          <select
            value={filters.category}
            onChange={(event) => setFilter("category", event.target.value)}
          >
            <option value="">全部栏目</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>监控方式</span>
          <select
            value={filters.mode}
            onChange={(event) => setFilter("mode", event.target.value)}
          >
            <option value="">全部方式</option>
            <option value="automated">自动监控</option>
            <option value="catalogued">人工浏览</option>
            <option value="unsupported">暂不支持自动抓取</option>
          </select>
        </label>
        <label>
          <span>最近检查</span>
          <select
            value={filters.status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="">全部结果</option>
            <option value="unchanged">无变化</option>
            <option value="changed">有变化</option>
            <option value="failed">抓取失败</option>
            <option value="skipped">已跳过</option>
          </select>
        </label>
        {(filters.query || filters.category || filters.mode || filters.status) && (
          <button
            type="button"
            className="button button-quiet filter-reset"
            onClick={() => setParams({}, { replace: true })}
          >
            清除筛选
          </button>
        )}
      </section>

      <div className="source-groups">
        {grouped.map((group) => (
          <section key={group.category} className="source-group">
            <div className="source-group-heading">
              <h2>{group.category}</h2>
              <span>{group.sources.length} 个信源</span>
            </div>
            <div className="source-grid">
              {group.sources.map((source, index) => {
                const status = healthById.get(source.id);
                return (
                  <article className="source-card" key={source.id}>
                    <div className="source-card-top">
                      <span className="source-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <StatusBadge value={source.monitoringMode} />
                    </div>
                    <h3>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {source.name}
                      </a>
                    </h3>
                    <p className="source-domain">{new URL(source.url).hostname}</p>
                    <div className="source-meta">
                      <span>
                        收藏位置
                        <b>{source.bookmarkLocation ?? "未标注"}</b>
                      </span>
                      <span>
                        适配器
                        <b>{source.adapterId ?? "—"}</b>
                      </span>
                      <span>
                        最近检查
                        <b>
                          {status ? formatDateTime(status.checkedAt) : "尚未检查"}
                        </b>
                      </span>
                    </div>
                    {status?.error && (
                      <p className="source-error">{status.error}</p>
                    )}
                    <a
                      className="source-open"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      打开官方来源 ↗
                    </a>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <EmptyState
            title="没有匹配的信源"
            description="尝试清除栏目或监控方式筛选。"
          />
        )}
      </div>
    </div>
  );
}
