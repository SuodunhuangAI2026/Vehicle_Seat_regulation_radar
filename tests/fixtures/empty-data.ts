import type {
  ImportReport,
  MonitorMeta,
  RegulationChange,
  ReportRecord,
  SourceHealth,
  SourceRecord,
  StandardRecord,
} from "../../src/types";

export const sampleStandards: StandardRecord[] = [
  {
    id: "std-r17",
    standardNo: "UN R17",
    title: "座椅、座椅固定装置及头枕",
    version: "Rev.7",
    issuer: "UNECE",
    system: "ECE",
    documentKind: "PDF",
    sourceFileName: "R017r7e.pdf",
    status: "active",
    monitored: true,
    importedAt: "2026-11-05T00:00:00.000Z",
  },
  {
    id: "std-gb15083",
    standardNo: "GB 15083-2019",
    title: "汽车座椅、座椅固定装置及头枕强度要求和试验方法",
    version: "2019",
    issuer: "GB（中国）",
    system: "GB",
    documentKind: "PDF",
    sourceFileName: "GB 15083-2019.pdf",
    status: "active",
    monitored: true,
    importedAt: "2026-11-05T00:00:00.000Z",
  },
];

export const sampleSources: SourceRecord[] = [
  {
    id: "src-unece",
    name: "UNECE regulations",
    url: "https://unece.org/un-regulations-addenda-1958-agreement",
    category: "UNECE / WP.29 全球统一法规",
    bookmarkLocation: "标准网站",
    monitoringMode: "automated",
    adapterId: "unece",
  },
  {
    id: "src-samr",
    name: "国家标准全文公开系统",
    url: "https://openstd.samr.gov.cn/bzgk/gb/",
    category: "中国国家标准与强制性法规",
    bookmarkLocation: "收藏夹栏",
    monitoringMode: "catalogued",
  },
];

export const sampleChanges: RegulationChange[] = [
  {
    id: "change-headrest",
    standardIds: ["std-r17"],
    standardNumbers: ["UN R17"],
    title: "UN R17 头枕要求更新观察",
    system: "ECE",
    issuer: "UNECE",
    changeType: "revision",
    severity: "high",
    oldVersion: "Rev.7",
    newVersion: "Rev.8",
    detectedAt: "2026-11-05T00:00:00.000Z",
    effectiveDate: "2027-01-01",
    summaryZh: "头枕试验方法和版本记录发生变化，需要人工核对官方原文。",
    impactedDesignAreas: ["头枕"],
    impactedTestMethods: ["头枕冲击试验"],
    recommendedActions: ["核对官方原文"],
    evidence: [
      {
        label: "UNECE",
        url: "https://unece.org/un-regulations-addenda-1958-agreement",
      },
    ],
    confidence: "medium",
    reviewStatus: "draft",
    model: "deepseek-chat",
    promptVersion: "seats-v1",
  },
  {
    id: "change-seat-strength",
    standardIds: ["std-gb15083"],
    standardNumbers: ["GB 15083-2019"],
    title: "座椅强度试验编辑性更新观察",
    system: "GB",
    issuer: "GB（中国）",
    changeType: "corrigendum",
    severity: "low",
    detectedAt: "2026-11-04T00:00:00.000Z",
    summaryZh: "仅涉及编辑性表述，仍待核对。",
    impactedDesignAreas: ["座椅总成"],
    impactedTestMethods: ["座椅强度"],
    recommendedActions: ["归档"],
    evidence: [
      {
        label: "国家标准全文公开系统",
        url: "https://openstd.samr.gov.cn/bzgk/gb/",
      },
    ],
    confidence: "low",
    reviewStatus: "approved",
    model: "deepseek-chat",
    promptVersion: "seats-v1",
  },
];

export const sampleHealth: SourceHealth[] = [
  {
    sourceId: "src-unece",
    status: "unchanged",
    checkedAt: "2026-11-05T00:00:00.000Z",
    lastSuccessAt: "2026-11-05T00:00:00.000Z",
  },
];

export const sampleReport: ReportRecord = {
  id: "report-headrest",
  title: "UN R17 头枕要求更新观察",
  generatedAt: "2026-11-05T00:00:00.000Z",
  changeIds: ["change-headrest"],
  severity: "high",
  reviewStatus: "draft",
  htmlPath: "reports/report-headrest.html",
  summary: "头枕试验方法可能变化，待人工复核。",
};

export const sampleImportReport: ImportReport = {
  standards: {
    visibleRows: 141,
    summaryRows: 107,
    workbookReportedDocuments: 155,
    workbookReportedIdentifiers: 111,
  },
  sources: {
    extractedUrls: 92,
    sectionReportedItems: 117,
  },
  notes: ["导入口径与统计口径同时保留。"],
};

export const sampleMeta: MonitorMeta = {
  lastSuccessfulRun: "2026-11-05T08:00:00+08:00",
  lastAttemptedRun: "2026-11-05T08:00:00+08:00",
  sourceHealth: sampleHealth,
  promptVersion: "seats-v1",
  model: "deepseek-chat",
  repositoryUrl: "https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar",
  deploymentUrl: "https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/",
  standardsVisibleRows: 141,
  standardsReportedDocuments: 155,
  sourceExtractedUrls: 92,
  sourceDocumentReportedItems: 117,
  knownGaps: [],
};
