import type { ReportRecord, ReviewStatus } from "../types";

export function reviewReport(
  reports: ReportRecord[],
  reportId: string,
  decision: ReviewStatus,
  now = new Date().toISOString(),
): ReportRecord[] {
  const index = reports.findIndex((report) => report.id === reportId);
  if (index < 0) {
    throw new Error(`Unknown report: ${reportId}`);
  }
  return reports.map((report, currentIndex) =>
    currentIndex === index
      ? { ...report, reviewStatus: decision, reviewedAt: now }
      : report,
  );
}
