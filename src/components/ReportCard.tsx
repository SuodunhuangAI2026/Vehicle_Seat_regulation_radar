import { useState } from "react";
import {
  formatDate,
  publicAssetPath,
  reviewLabels,
  severityLabels,
} from "../lib/format";
import { buildFeishuSummary } from "../lib/report-copy";
import type {
  RegulationChange,
  ReportRecord,
} from "../types";
import { StatusBadge } from "./StatusBadge";

export function ReportCard({
  report,
  changes,
}: {
  report: ReportRecord;
  changes: RegulationChange[];
}) {
  const [copied, setCopied] = useState(false);
  const htmlPath = publicAssetPath(report.htmlPath);

  async function copySummary() {
    if (report.reviewStatus !== "approved") return;
    await navigator.clipboard.writeText(buildFeishuSummary(report, changes));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <article className="report-card">
      <div className="report-sheet" aria-hidden="true">
        <span />
        <span />
        <span />
        <b>PDF</b>
      </div>
      <div className="report-card-copy">
        <div className="change-card-topline">
          <span className="standard-code">{report.id}</span>
          <span>{formatDate(report.generatedAt)}</span>
        </div>
        <h3>{report.title}</h3>
        <p>{report.summary}</p>
        <div className="change-card-meta">
          <StatusBadge
            value={report.severity}
            label={`影响 ${severityLabels[report.severity]}`}
          />
          <StatusBadge value={report.reviewStatus} />
          <span className="evidence-count">
            {reviewLabels[report.reviewStatus]}
          </span>
        </div>
        <div className="report-actions">
          <a className="button button-primary" href={htmlPath} target="_blank" rel="noreferrer noopener">
            {report.reviewStatus === "approved" ? "打开已完成审核稿" : "打开审核稿"}
          </a>
          <a className="button button-quiet" href={htmlPath} download>
            下载 HTML
          </a>
          {report.reviewStatus === "approved" && (
            <button className="button button-quiet" type="button" onClick={copySummary}>
              {copied ? "已复制" : "复制飞书摘要"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
