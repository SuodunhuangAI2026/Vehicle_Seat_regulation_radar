export type StandardStatus = "active" | "draft" | "superseded" | "unknown";

export interface StandardRecord {
  id: string;
  standardNo: string;
  title: string;
  version: string;
  issuer: string;
  system: string;
  documentKind: string;
  sourceFileName: string;
  sourceUrl?: string;
  relatedOld?: Array<{ version: string; label?: string; url?: string }>;
  status: StandardStatus;
  monitored: boolean;
  importedAt: string;
  updatedAt?: string;
  updatedBy?: string;
  note?: string;
}

export interface SourceRecord {
  id: string;
  name: string;
  url: string;
  category: string;
  bookmarkLocation?: string;
  monitoringMode: "automated" | "catalogued" | "unsupported";
  adapterId?: string;
}

export interface ImportReport {
  standards: {
    visibleRows: number;
    summaryRows: number;
    workbookReportedDocuments: number;
    workbookReportedIdentifiers: number;
  };
  sources: {
    extractedUrls: number;
    sectionReportedItems: number;
  };
  notes: string[];
}

export type ChangeType =
  | "new"
  | "revision"
  | "amendment"
  | "corrigendum"
  | "supplement"
  | "replacement"
  | "repeal"
  | "translation-only"
  | "status-change"
  | "draft"
  | "unknown";

export type Severity = "critical" | "high" | "medium" | "low" | "unassessed";
export type ReviewStatus = "draft" | "approved" | "rejected" | "superseded";

export interface RegulationChange {
  id: string;
  standardIds: string[];
  standardNumbers: string[];
  title: string;
  system: string;
  issuer: string;
  changeType: ChangeType;
  severity: Severity;
  oldVersion?: string;
  newVersion?: string;
  detectedAt: string;
  publicationDate?: string;
  commentStart?: string;
  commentEnd?: string;
  approvalDate?: string;
  effectiveDate?: string;
  transitionEnd?: string;
  repealDate?: string;
  summaryZh: string;
  impactedDesignAreas: string[];
  impactedTestMethods: string[];
  recommendedActions: string[];
  evidence: Array<{ label: string; url: string; quote?: string }>;
  confidence: "high" | "medium" | "low";
  reviewStatus: ReviewStatus;
  reportPath?: string;
  comparison?: RegulationComparison;
  model: string;
  promptVersion: string;
}

export type ComparisonChangeType =
  | "added"
  | "removed"
  | "modified"
  | "translation-only";

export interface ComparisonSection {
  section: string;
  clause?: string;
  changeType: ComparisonChangeType;
  oldText: string;
  newText: string;
  impactZh: string;
  confidence: "high" | "medium" | "low";
}

export interface ComparisonDocument {
  title: string;
  url: string;
  documentKind: "html" | "pdf" | "text";
  textLength: number;
}

export interface RegulationComparison {
  status: "complete" | "partial" | "failed";
  oldDocument?: ComparisonDocument;
  newDocument?: ComparisonDocument;
  sections: ComparisonSection[];
  limitations: string[];
}

export interface SourceHealth {
  sourceId: string;
  status: "unchanged" | "changed" | "failed" | "skipped";
  checkedAt: string;
  lastSuccessAt?: string;
  error?: string;
}

export interface MonitorMeta {
  lastSuccessfulRun?: string;
  lastAttemptedRun?: string;
  sourceHealth: SourceHealth[];
  promptVersion: string;
  model: string;
  repositoryUrl: string;
  deploymentUrl: string;
  standardsVisibleRows: number;
  standardsReportedDocuments: number;
  sourceExtractedUrls: number;
  sourceDocumentReportedItems: number;
  knownGaps: string[];
}

export interface ReportRecord {
  id: string;
  title: string;
  generatedAt: string;
  changeIds: string[];
  severity: Severity;
  reviewStatus: ReviewStatus;
  reviewedAt?: string;
  htmlPath: string;
  summary: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  body: string;
  source?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface NewsFeedItem {
  id: string;
  title: string;
  href: string;
  severity: Severity;
  updatedAt: string;
}
