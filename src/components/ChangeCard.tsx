import { Link } from "react-router-dom";
import {
  changeTypeLabels,
  formatDate,
  publicAssetPath,
  severityLabels,
} from "../lib/format";
import type { RegulationChange } from "../types";
import { StatusBadge } from "./StatusBadge";

export function ChangeCard({
  change,
  compact = false,
}: {
  change: RegulationChange;
  compact?: boolean;
}) {
  const reportPath = change.reportPath
    ? publicAssetPath(change.reportPath)
    : undefined;

  return (
    <article className={`change-card ${compact ? "is-compact" : ""}`}>
      <div className="change-card-topline">
        <span className="standard-code">{change.standardNumbers.join(" / ")}</span>
        <span className="change-date">{formatDate(change.detectedAt)}</span>
      </div>
      <h3>
        {reportPath ? (
          <a
            href={reportPath}
            target="_blank"
            rel="noreferrer noopener"
          >
            {change.title}
          </a>
        ) : (
          <Link to={`/changes/${change.id}`}>{change.title}</Link>
        )}
      </h3>
      <p>{change.summaryZh}</p>
      <div className="change-card-meta">
        <StatusBadge
          value={change.severity}
          label={`影响 ${severityLabels[change.severity]}`}
        />
        <StatusBadge
          value={change.changeType}
          label={changeTypeLabels[change.changeType]}
        />
        <StatusBadge value={change.reviewStatus} />
        <span className="evidence-count">{change.evidence.length} 条证据</span>
      </div>
      <div className="version-track" aria-label="版本变化">
        <span>{change.oldVersion ?? "旧版未确认"}</span>
        <i aria-hidden="true" />
        <strong>{change.newVersion ?? "新版未确认"}</strong>
      </div>
      {reportPath && (
        <a
          className="text-link change-card-report-link"
          href={reportPath}
          target="_blank"
          rel="noreferrer noopener"
        >
          {change.reviewStatus === "approved" ? "查看已完成审核稿" : "查看审核稿"}{" "}
          <span aria-hidden="true">→</span>
        </a>
      )}
    </article>
  );
}
