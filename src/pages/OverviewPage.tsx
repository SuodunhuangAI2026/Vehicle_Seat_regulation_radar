import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChangeCard } from "../components/ChangeCard";
import { DataQualityNote } from "../components/DataQualityNote";
import { MetricCard } from "../components/MetricCard";
import { ReportCard } from "../components/ReportCard";
import { StatusBadge } from "../components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  relativeRunLabel,
} from "../lib/format";
import type {
  ImportReport,
  MonitorMeta,
  RegulationChange,
  ReportRecord,
  SourceHealth,
  SourceRecord,
  StandardRecord,
  KnowledgeItem,
  NewsFeedItem,
} from "../types";

const dateFields = [
  ["publicationDate", "发布"],
  ["commentEnd", "意见截止"],
  ["approvalDate", "批准"],
  ["effectiveDate", "生效"],
  ["transitionEnd", "过渡期结束"],
  ["repealDate", "废止"],
] as const;

function sourceStatusCounts(health: SourceHealth[]) {
  return health.reduce(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    { unchanged: 0, changed: 0, failed: 0, skipped: 0 },
  );
}

export function OverviewPage({
  standards,
  sources,
  changes,
  reports,
  importReport,
  meta,
  knowledge,
  newsfeed,
}: {
  standards: StandardRecord[];
  sources: SourceRecord[];
  changes: RegulationChange[];
  reports: ReportRecord[];
  importReport: ImportReport;
  meta: Partial<MonitorMeta>;
  knowledge: KnowledgeItem[];
  newsfeed: NewsFeedItem[];
}) {
  const pending = changes.filter((change) => change.reviewStatus === "draft");
  const highImpact = changes.filter((change) =>
    ["critical", "high"].includes(change.severity),
  );
  const health = meta.sourceHealth ?? [];
  const healthCounts = sourceStatusCounts(health);
  const latestReport = [...reports].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  )[0];
  const systemCounts = standards.reduce<Record<string, number>>((acc, item) => {
    acc[item.system] = (acc[item.system] ?? 0) + 1;
    return acc;
  }, {});
  const dominantSystems = Object.entries(systemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const upcoming = changes
    .flatMap((change) =>
      dateFields.flatMap(([field, label]) => {
        const value = change[field];
        return value
          ? [{ value, label, title: change.title, id: change.id }]
          : [];
      }),
    )
    .sort((a, b) => a.value.localeCompare(b.value))
    .slice(0, 5);

  const changeNews: NewsFeedItem[] = [...changes]
    .filter((change) => change.reviewStatus !== "rejected")
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    .slice(0, 5)
    .map((change) => ({
      id: change.id,
      title: change.title,
      href: `/changes/${change.id}`,
      severity: change.severity,
      updatedAt: change.detectedAt,
    }));
  const topNews =
    changeNews.length > 0
      ? changeNews
      : [...newsfeed]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5);

  const [activeNews, setActiveNews] = useState(0);
  const newsTimer = useRef<number | null>(null);
  useEffect(() => {
    newsTimer.current = window.setInterval(() => {
      setActiveNews((current) => (topNews.length ? (current + 1) % topNews.length : 0));
    }, 5000);
    return () => {
      if (newsTimer.current !== null) window.clearInterval(newsTimer.current);
    };
  }, [topNews.length]);
  const currentNews = topNews[activeNews];

  const topKnowledge = [...knowledge]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="overview-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            Regulatory intelligence / M1 seat systems
          </span>
          <h1>
            <span>SeatScope</span>
            <small>座椅法规雷达</small>
          </h1>
          <p className="hero-lead">
            为 M1 座椅、固定点与头枕建立一条可追溯的法规变更链路：官方信源采集、
            AI 辅助对比、人工审核，再交由锁老师决定是否发送飞书。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/changes">
              查看变更雷达
            </Link>
            <Link className="button button-quiet" to="/standards">
              浏览 {standards.length} 条标准
            </Link>
          </div>
        </div>
        <div className="hero-radar" aria-hidden="true">
          <span className="radar-ring ring-one" />
          <span className="radar-ring ring-two" />
          <span className="radar-ring ring-three" />
          <span className="radar-axis axis-x" />
          <span className="radar-axis axis-y" />
          <span className="radar-sweep" />
          <span className="radar-blip blip-one" />
          <span className="radar-blip blip-two" />
          <span className="radar-blip blip-three" />
          <div className="radar-caption">
            <b>M1</b>
            <span>SEAT / RESTRAINT / HEADREST</span>
          </div>
        </div>
        <div className="hero-status">
          <span className="live-dot" />
          <div>
            <strong>
              {meta.lastSuccessfulRun ? "监控数据已载入" : "等待首次监控运行"}
            </strong>
            <small>
              最近成功 {relativeRunLabel(meta.lastSuccessfulRun)} ·{" "}
              {formatDateTime(meta.lastSuccessfulRun)}
            </small>
          </div>
        </div>
      </section>

      {topNews.length > 0 && (
        <section className="news-carousel" aria-label="变化报告头条">
          {topNews.length > 0 && (
            <>
              <div className="news-carousel-current">
                <div className="news-carousel-head">
                  <span className="eyebrow">Change headlines</span>
                  <StatusBadge value={currentNews.severity} />
                </div>
                <Link to={currentNews.href}>
                  <h2>{currentNews.title}</h2>
                </Link>
                <p>{formatDateTime(currentNews.updatedAt)}</p>
                <div className="news-dots" aria-label="轮播指示器">
                  {topNews.map((item, index) => (
                    <button
                      key={`${item.id}-${item.title}`}
                      type="button"
                      className={index === activeNews ? "is-active" : ""}
                      aria-label={`显示第 ${index + 1} 条变化报告`}
                      aria-current={index === activeNews ? "true" : undefined}
                      onClick={() => setActiveNews(index)}
                    />
                  ))}
                </div>
              </div>
              <div className="news-carousel-side" aria-label="其他变化报告">
                {topNews.slice(1).map((item, index) => (
                  <Link
                    key={`${item.id}-${item.title}`}
                    to={item.href}
                    className={
                      index + 1 === activeNews ? "is-active" : undefined
                    }
                    onClick={() => setActiveNews(index + 1)}
                  >
                    <span>
                      <StatusBadge value={item.severity} />
                    </span>
                    <b>{item.title}</b>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <section className="metric-grid" aria-label="核心指标">
        <MetricCard
          label="标准记录"
          value={standards.length}
          detail={`${importReport.standards.summaryRows} 个标准号汇总`}
          index={0}
          accent="navy"
        />
        <MetricCard
          label="信源目录"
          value={sources.length}
          detail={`${sources.filter((source) => source.monitoringMode === "automated").length} 个已接自动适配器`}
          index={1}
          accent="green"
        />
        <MetricCard
          label="待审核"
          value={pending.length}
          detail={`${highImpact.length} 条高影响记录`}
          index={2}
          accent="orange"
        />
        <MetricCard
          label="审核报告"
          value={reports.length}
          detail={`${reports.filter((report) => report.reviewStatus === "approved").length} 份已批准`}
          index={3}
          accent="red"
        />
      </section>

      <DataQualityNote report={importReport} compact />

      <div className="overview-main-grid">
        <section className="panel panel-large">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Change radar</span>
              <h2>变更雷达</h2>
            </div>
            <Link className="text-link" to="/changes">
              全部变化 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="change-list">
            {changes.slice(0, 3).map((change) => (
              <ChangeCard key={change.id} change={change} compact />
            ))}
            {changes.length === 0 && (
              <p className="inline-empty">本次周期未记录到可展示变化。</p>
            )}
          </div>
        </section>

        <aside className="overview-side">
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Deadlines</span>
                <h2>关键节点</h2>
              </div>
            </div>
            {upcoming.length > 0 ? (
              <ol className="deadline-list">
                {upcoming.map((item) => (
                  <li key={`${item.id}-${item.label}-${item.value}`}>
                    <time>{formatDate(item.value)}</time>
                    <span>{item.label}</span>
                    <Link to={`/changes/${item.id}`}>{item.title}</Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="quiet-note">
                当前没有已确认的发布、生效或过渡期日期。未知节点统一显示为"未确认"。
              </p>
            )}
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Source health</span>
                <h2>信源健康</h2>
              </div>
            </div>
            {health.length > 0 ? (
              <div className="health-grid">
                <span>
                  <b>{healthCounts.unchanged}</b> 无变化
                </span>
                <span>
                  <b>{healthCounts.changed}</b> 有变化
                </span>
                <span>
                  <b>{healthCounts.failed}</b> 失败
                </span>
                <span>
                  <b>{healthCounts.skipped}</b> 跳过
                </span>
              </div>
            ) : (
              <p className="quiet-note">
                尚未生成来源检查状态。工作流首次运行后，此处显示每个自动适配器的检查结果。
              </p>
            )}
          </section>
        </aside>
      </div>

      <div className="overview-lower-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Coverage</span>
              <h2>库内体系</h2>
            </div>
            <span className="panel-count">{Object.keys(systemCounts).length} 类</span>
          </div>
          <div className="system-bars">
            {dominantSystems.map(([system, count]) => (
              <div className="system-bar" key={system}>
                <span>{system}</span>
                <i style={{ width: `${(count / standards.length) * 100}%` }} />
                <b>{count}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Review desk</span>
              <h2>最新审核稿</h2>
            </div>
            <Link className="text-link" to="/reports">
              审核档案
            </Link>
          </div>
          {latestReport ? (
            <ReportCard report={latestReport} changes={changes} />
          ) : (
            <div className="report-placeholder">
              <StatusBadge value="draft" label="待生成" />
              <h3>尚未生成 HTML 审核稿</h3>
              <p>
                只有当自动信源检测到变化，并完成结构化分析和校验后，系统才会生成独立审核稿。
                没有 DeepSeek Key 时不会伪造分析报告。
              </p>
            </div>
          )}
        </section>
      </div>

      {topKnowledge.length > 0 && (
        <section className="knowledge-panel" aria-label="法规小知识">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Regulatory knowledge</span>
              <h2>法规小知识</h2>
            </div>
          </div>
          <div className="knowledge-grid">
            {topKnowledge.map((item) => (
              <article key={item.id} className="knowledge-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.source && (
                  <footer>
                    <span>来源：{item.source}</span>
                    <time>{formatDate(item.updatedAt)}</time>
                  </footer>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
