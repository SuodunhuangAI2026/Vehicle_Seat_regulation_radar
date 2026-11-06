import type { ImportReport } from "../types";

export function DataQualityNote({
  report,
  compact = false,
}: {
  report: ImportReport;
  compact?: boolean;
}) {
  return (
    <aside className={`data-quality ${compact ? "is-compact" : ""}`}>
      <div className="data-quality-icon" aria-hidden="true">
        i
      </div>
      <div>
        <strong>数据口径保留，不做补造</strong>
        <p>
          标准库实际导入 {report.standards.visibleRows} 条明细，工作簿统计口径为{" "}
          {report.standards.workbookReportedDocuments} 份文档；信源提取{" "}
          {report.sources.extractedUrls} 个唯一网址，原文档栏目标注合计{" "}
          {report.sources.sectionReportedItems} 项。
        </p>
        {!compact && (
          <ul>
            {report.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
