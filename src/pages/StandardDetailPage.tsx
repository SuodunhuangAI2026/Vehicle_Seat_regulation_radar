import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../lib/format";
import { normalizeStandardKey } from "../lib/filters";
import type {
  RegulationChange,
  StandardRecord,
} from "../types";

function familyKey(standardNo: string): string {
  return normalizeStandardKey(
    standardNo.replace(/[-—–]?\s*(19|20)\d{2}.*$/, "").trim(),
  );
}

export function StandardDetailPage({
  standards,
  changes,
}: {
  standards: StandardRecord[];
  changes: RegulationChange[];
}) {
  const { id } = useParams();
  const standard = standards.find((item) => item.id === id);
  if (!standard) {
    return (
      <div className="page">
        <EmptyState
          title="未找到该标准记录"
          description="链接可能已失效，或该记录尚未导入标准库。"
        />
        <Link className="button button-quiet" to="/standards">
          返回标准库
        </Link>
      </div>
    );
  }

  const family = standards.filter(
    (item) =>
      familyKey(item.standardNo) === familyKey(standard.standardNo) &&
      item.id !== standard.id,
  );
  const relatedChanges = changes.filter(
    (change) =>
      change.standardIds.includes(standard.id) ||
      change.standardNumbers.includes(standard.standardNo),
  );

  return (
    <div className="page detail-page">
      <Link className="back-link" to="/standards">
        ← 返回标准库
      </Link>
      <header className="detail-heading">
        <div>
          <div className="detail-kicker">
            <span className="standard-code">{standard.standardNo}</span>
            <StatusBadge value={standard.system} />
            <StatusBadge
              value={standard.status}
              label={standard.status === "active" ? "现行库记录" : "征求意见"}
            />
          </div>
          <h1>{standard.title}</h1>
          <p>
            本页保留原始文件名、版本与系统分类。未提供公开来源的文档不会被自动拼接成
            可能被误认为官方原文的搜索链接。
          </p>
        </div>
        <aside className="detail-verdict">
          <span>版本</span>
          <strong>{standard.version}</strong>
          <small>{standard.documentKind}</small>
        </aside>
      </header>

      <section className="detail-summary-strip">
        <div>
          <span>发布机构</span>
          <b>{standard.issuer}</b>
        </div>
        <div>
          <span>标准体系</span>
          <b>{standard.system}</b>
        </div>
        <div>
          <span>导入时间</span>
          <b>{formatDate(standard.importedAt)}</b>
        </div>
        <div>
          <span>自动覆盖</span>
          <b>{standard.monitored ? "纳入体系" : "仅目录"}</b>
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <span className="eyebrow">Document identity</span>
          <h2>文档身份</h2>
          <dl className="metadata-list">
            <div>
              <dt>标准号</dt>
              <dd>{standard.standardNo}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{standard.version}</dd>
            </div>
            <div>
              <dt>原始文件名</dt>
              <dd>{standard.sourceFileName || "未提供"}</dd>
            </div>
            <div>
              <dt>公开来源</dt>
              <dd>
                {standard.sourceUrl ? (
                  <a
                    href={standard.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    打开官方原文 ↗
                  </a>
                ) : (
                  "源文件未提供公开链接"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <span className="eyebrow">Version alternatives</span>
          <h2>库内其他版本</h2>
          {family.length > 0 ? (
            <div className="related-records">
              {family.map((record) => (
                <Link key={record.id} to={`/standards/${record.id}`}>
                  <span>{record.standardNo}</span>
                  <b>{record.version}</b>
                  <small>{record.documentKind}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="quiet-note">库内暂未发现同族其他版本记录。</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Linked observations</span>
            <h2>关联变更观察</h2>
          </div>
          <span className="panel-count">{relatedChanges.length} 条</span>
        </div>
        {relatedChanges.length > 0 ? (
          <div className="related-change-list">
            {relatedChanges.map((change) => (
              <Link key={change.id} to={`/changes/${change.id}`}>
                <StatusBadge value={change.reviewStatus} />
                <div>
                  <h3>{change.title}</h3>
                  <p>{change.summaryZh}</p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="quiet-note">尚无与本记录关联的变更观察。</p>
        )}
      </section>
    </div>
  );
}
