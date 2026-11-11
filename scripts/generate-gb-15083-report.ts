import { resolve } from "node:path";
import type {
  RegulationChange,
  ReportRecord,
} from "../src/types/index.js";
import { renderReportHtml } from "./monitor/report-html.js";
import {
  readJsonFile,
  writeJsonFileAtomic,
  writeTextFileAtomic,
} from "./monitor/pipeline.js";
import {
  generateSideBySideDiff,
  type RegulationDiff,
  type SectionDiff,
} from "./monitor/text-diff.js";
import {
  gb15083Sections,
  type GbSectionDefinition,
} from "./reports/gb-15083-sections.js";

const CHANGE_ID = "library-gb-15083-2019-draft";
const REPORT_ID = "report-library-gb-15083-2019-draft";
const OLD_VERSION = "GB 15083-2019";
const NEW_VERSION = "GB 15083-202X（征求意见稿）";
const OFFICIAL_PORTAL = "https://openstd.samr.gov.cn/bzgk/gb/";

function buildSection(definition: GbSectionDefinition): SectionDiff {
  const rendered = generateSideBySideDiff(
    definition.oldText,
    definition.newText,
  );
  return {
    sectionId: definition.id,
    sectionTitle: definition.title,
    changeType: definition.changeType,
    oldContent: definition.oldText,
    newContent: definition.newText,
    oldDiffHtml: rendered.oldHtml,
    newDiffHtml: rendered.newHtml,
    diffHtml:
      definition.changeType === "modified"
        ? `${rendered.oldHtml}${rendered.newHtml}`
        : undefined,
  };
}

function summaryFor(sections: SectionDiff[]) {
  return sections.reduce(
    (summary, section) => {
      summary[section.changeType] += 1;
      return summary;
    },
    { added: 0, removed: 0, modified: 0, unchanged: 0 },
  );
}

async function main() {
  const reportsPath = resolve("src/data/reports.json");
  const changesPath = resolve("src/data/changes.json");
  const [reports, changes] = await Promise.all([
    readJsonFile<ReportRecord[]>(reportsPath),
    readJsonFile<RegulationChange[]>(changesPath),
  ]);

  const existingChange = changes.find((change) => change.id === CHANGE_ID);
  if (!existingChange) {
    throw new Error(`Unknown change: ${CHANGE_ID}`);
  }

  const generatedAt = new Date().toISOString();
  const reportDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(generatedAt));
  const htmlPath = `reports/${reportDate}-gb-15083-2019-draft.html`;

  const sections = gb15083Sections.map(buildSection);
  const summary = summaryFor(sections);
  const diff: RegulationDiff = {
    oldVersion: OLD_VERSION,
    newVersion: NEW_VERSION,
    oldSourceUrl: OFFICIAL_PORTAL,
    newSourceUrl: OFFICIAL_PORTAL,
    comparedAt: generatedAt,
    sections,
    summary,
    limitations: [
      "本报告以 GB 15083-202X 征求意见稿前言列出的主要技术变化为主线，不是对两份标准全文逐字穷尽的差异清单。",
      "旧版中文原文依据公开发布 PDF 校对整理，个别字母大小写、标点或单位符号应以官方原件为准。",
      "征求意见稿尚未显示正式发布日期，不能据此认定已经批准、生效或替代 GB 15083-2019。",
    ],
  };

  const changedSummary = [
    "依据 GB 15083-202X 征求意见稿前言所列主要技术变化，与 GB 15083-2019 公开文本逐项对比：",
    `新增 ${summary.added} 个主题、修改 ${summary.modified} 个主题、删除 ${summary.removed} 个主题。`,
    "重点涉及头枕安装、头枕高度、静态头后间隙、非使用位置、BioRID Ⅱ 动态性能、大角度座椅和电动座椅防挤压。",
    "征求意见稿尚未显示正式发布日期，不能据此认定已经批准或生效。",
  ].join("");

  const change: RegulationChange = {
    ...existingChange,
    title: "GB 15083 座椅与头枕强度：2019 版与 202X 征求意见稿对比",
    changeType: "draft",
    severity: "unassessed",
    oldVersion: OLD_VERSION,
    newVersion: NEW_VERSION,
    publicationDate: undefined,
    commentStart: undefined,
    commentEnd: undefined,
    approvalDate: undefined,
    effectiveDate: undefined,
    transitionEnd: undefined,
    repealDate: undefined,
    summaryZh: changedSummary,
    impactedDesignAreas: [
      "头枕安装范围与配置策略",
      "头枕高度、宽度、间隙与静态头后间隙",
      "头枕高度保持与非使用位置机构",
      "N1、N2、N3 及 M2、M3 类车座椅强度",
      "大角度座椅的乘员保护",
      "电动座椅防挤压控制",
    ],
    impactedTestMethods: [
      "附录 C：头枕向后位移与强度试验",
      "附录 D：头枕高度测量",
      "附录 G：前排外侧座椅静态最大头后间隙",
      "附录 H：头枕高度保持试验",
      "附录 I：头枕非使用位置试验",
      "附录 J：BioRID Ⅱ 动态性能试验",
      "K.3：带假人的抗惯性试验",
    ],
    recommendedActions: [
      "核对征求意见稿的正式意见截止日期、发布状态及后续批准信息",
      "按 4.6.2、4.6.6 和附录 D、G 复核现有一排、二排头枕几何与调节范围",
      "按 4.7.4、4.8 和附录 H、I 复核高度保持机构与非使用位置策略",
      "评估大角度座椅、电动长滑轨及电动翻移座椅的防挤压与乘员保护方案",
      "据正式发布文本更新 DVP、试验工装与型式判定资料，不在草案阶段作出量产放行结论",
    ],
    evidence: [
      {
        label: "国家标准全文公开系统：GB 15083-2019 与 GB 15083-202X 查询入口",
        url: OFFICIAL_PORTAL,
        quote:
          "GB 15083-202X（征求意见稿）前言明确说明其代替 GB 15083-2019，并列出了主要技术变化。",
      },
    ],
    confidence: "medium",
    reviewStatus: "draft",
    reportPath: htmlPath,
    model: "official-pdf-comparison",
  };

  const existingReport = reports.find(
    (report) => report.id === REPORT_ID || report.changeIds.includes(CHANGE_ID),
  );
  const report: ReportRecord = {
    id: existingReport?.id ?? REPORT_ID,
    title: change.title,
    generatedAt,
    changeIds: [CHANGE_ID],
    severity: change.severity,
    reviewStatus: change.reviewStatus,
    htmlPath,
    summary: change.summaryZh.slice(0, 360),
  };

  const html = renderReportHtml(change, diff, generatedAt);
  const nextReports = reports.some((item) => item.id === report.id)
    ? reports.map((item) => (item.id === report.id ? report : item))
    : [report, ...reports];
  const nextChanges = changes.map((item) =>
    item.id === change.id ? change : item,
  );

  await Promise.all([
    writeTextFileAtomic(resolve("public", htmlPath), html),
    writeJsonFileAtomic(changesPath, nextChanges),
    writeJsonFileAtomic(
      reportsPath,
      nextReports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        reportId: report.id,
        generatedAt,
        oldVersion: OLD_VERSION,
        newVersion: NEW_VERSION,
        summary,
        output: resolve("public", htmlPath),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("GB_15083_REPORT_FAILED", error);
  process.exitCode = 1;
});
