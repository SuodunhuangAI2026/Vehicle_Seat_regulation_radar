import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import {
  changeTypeLabels,
  formatDate,
  formatDateTime,
  publicAssetPath,
  reviewLabels,
  severityLabels,
} from "../lib/format";
import type { RegulationChange } from "../types";

const timelineFields = [
  ["publicationDate", "发布日期"],
  ["commentStart", "征求意见开始"],
  ["commentEnd", "征求意见截止"],
  ["approvalDate", "批准日期"],
  ["effectiveDate", "生效日期"],
  ["transitionEnd", "过渡期结束"],
  ["repealDate", "废止日期"],
] as const;

export function ChangeDetailPage({
  changes,
}: {
  changes: RegulationChange[];
}) {
  const { id } = useParams();
  const change = changes.find((item) => item.id === id);
  if (!change) {
    return (
      <div className="page">
        <EmptyState
          title="未找到该变更记录"
          description="链接可能已失效，或该记录已被新的监测结果替代。"
        />
        <Link className="button button-quiet" to="/changes">
          返回变更雷达
        </Link>
      </div>
    );
  }

  if (change.reportPath) {
    return (
      <iframe
        className="report-document-frame"
        src={publicAssetPath(change.reportPath)}
        title="Regulatory change report"
      />
    );
  }

  return (
    <div className="page detail-page">
      <Link className="back-link" to="/changes">
        ← 返回变更雷达
      </Link>
      <header className="detail-heading">
        <div>
          <div className="detail-kicker">
            <span className="standard-code">{change.standardNumbers.join(" / ")}</span>
            <StatusBadge value={change.reviewStatus} />
          </div>
          <h1>{change.title}</h1>
          <p>{change.summaryZh}</p>
        </div>
        <aside className="detail-verdict">
          <span>影响判断</span>
          <strong>{severityLabels[change.severity]}</strong>
          <small>置信度：{change.confidence}</small>
        </aside>
      </header>

      <section className="detail-summary-strip">
        <div>
          <span>变化类型</span>
          <b>{changeTypeLabels[change.changeType]}</b>
        </div>
        <div>
          <span>旧版本</span>
          <b>{change.oldVersion ?? "未确认"}</b>
        </div>
        <div>
          <span>新版本</span>
          <b>{change.newVersion ?? "未确认"}</b>
        </div>
        <div>
          <span>检测时间</span>
          <b>{formatDateTime(change.detectedAt)}</b>
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <span className="eyebrow">Regulatory timeline</span>
          <h2>法规时间轴</h2>
          <ol className="timeline">
            {timelineFields.map(([field, label]) => (
              <li key={field} className={change[field] ? "is-known" : ""}>
                <span className="timeline-dot" />
                <div>
                  <small>{label}</small>
                  <strong>{formatDate(change[field])}</strong>
                </div>
              </li>
            ))}
          </ol>
          <p className="quiet-note">
            未显示具体日期的节点仍需以官方发布公告或标准原文为准。
          </p>
        </section>

        <section className="panel impact-panel">
          <span className="eyebrow">Seat engineering impact</span>
          <h2>M1 座椅影响面</h2>
          <h3>设计与布置</h3>
          <ul className="tag-list">
            {change.impactedDesignAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
          <h3>试验与验证</h3>
          <ul className="check-list">
            {change.impactedTestMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <h3>建议动作</h3>
          <ol className="action-list">
            {change.recommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="panel evidence-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Evidence ledger</span>
            <h2>证据与官方链接</h2>
          </div>
          <span className="panel-count">{change.evidence.length} 条</span>
        </div>
        <div className="evidence-list">
          {change.evidence.map((item) => (
            <article key={`${item.label}-${item.url}`}>
              <div>
                <h3>{item.label}</h3>
                {item.quote && <blockquote>{item.quote}</blockquote>}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                打开官方来源 ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <footer className="detail-footer">
        <div>
          <span>审核状态</span>
          <StatusBadge
            value={change.reviewStatus}
            label={reviewLabels[change.reviewStatus]}
          />
        </div>
        <div>
          <span>分析来源</span>
          <b>{change.model}</b>
        </div>
        <p>
          仅已批准审核稿可生成飞书摘要。本页是分析记录，不直接触发任何飞书发送。
        </p>
      </footer>
    </div>
  );
}
