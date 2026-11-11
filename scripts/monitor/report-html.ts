import type {
  ComparisonSection,
  RegulationChange,
  ReviewStatus,
  Severity,
} from "../../src/types/index.js";
import { reviewLabels, severityLabels } from "../../src/lib/format.js";
import { renderComparisonHtml } from "./comparison-report.js";
import type { RegulationDiff } from "./text-diff.js";

const changeTypeLabels: Record<string, string> = {
  new: "新发布",
  revision: "版本修订",
  amendment: "修正案",
  corrigendum: "勘误",
  supplement: "补充件",
  replacement: "替代",
  repeal: "废止",
  "translation-only": "仅译文变化",
  "status-change": "状态变化",
  draft: "征求意见",
  unknown: "类型未知",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

function dateOrUnknown(value: string | undefined): string {
  return value ? escapeHtml(value) : "未确认";
}

function listHtml(items: string[], emptyText: string): string {
  if (items.length === 0) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function commonPrefixLength(a: string[], b: string[]): number {
  const max = Math.min(a.length, b.length);
  let index = 0;
  while (index < max && a[index] === b[index]) index += 1;
  return index;
}

function inlineDiff(
  oldText: string,
  newText: string,
  side: "old" | "new",
): string {
  if (!oldText && !newText) {
    return '<span class="diff-empty">未提供对应原文</span>';
  }
  if (oldText === newText) return escapeHtml(oldText);
  const oldChars = [...oldText];
  const newChars = [...newText];
  const prefix = commonPrefixLength(oldChars, newChars);
  const oldSuffix = oldChars.slice(prefix);
  const newSuffix = newChars.slice(prefix);
  const suffix = commonPrefixLength(
    [...oldSuffix].reverse(),
    [...newSuffix].reverse(),
  );
  const oldMiddle = oldChars.slice(prefix, oldChars.length - suffix).join("");
  const newMiddle = newChars.slice(prefix, newChars.length - suffix).join("");
  const before = oldChars.slice(0, prefix).join("");
  const after = suffix > 0 ? oldChars.slice(oldChars.length - suffix).join("") : "";
  const middle = side === "old" ? oldMiddle : newMiddle;
  if (!middle) {
    return `${escapeHtml(before)}${escapeHtml(after)}`;
  }
  return `${escapeHtml(before)}<${
    side === "old" ? "del" : "ins"
  }>${escapeHtml(middle)}</${side === "old" ? "del" : "ins"}>${escapeHtml(
    after,
  )}`;
}

function comparisonHtml(change: RegulationChange): string {
  const comparison = change.comparison;
  if (!comparison) return "";
  const statusText =
    comparison.status === "complete"
      ? "新旧原文已提取"
      : comparison.status === "partial"
        ? "仅提取到一侧原文"
        : "原文提取失败";
  const sourceLinks = [
    comparison.oldDocument
      ? `<span>旧版：<a href="${escapeHtml(comparison.oldDocument.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(comparison.oldDocument.title)}</a></span>`
      : "<span>旧版：未取得</span>",
    comparison.newDocument
      ? `<span>新版：<a href="${escapeHtml(comparison.newDocument.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(comparison.newDocument.title)}</a></span>`
      : "<span>新版：未取得</span>",
  ].join("");
  const sections =
    comparison.sections.length > 0
      ? comparison.sections
          .map(
            (section: ComparisonSection) => `
              <article class="diff-section">
                <header>
                  <div>
                    <span class="diff-index">${escapeHtml(section.section)}</span>
                    ${section.clause ? `<b>${escapeHtml(section.clause)}</b>` : ""}
                  </div>
                  <span class="diff-kind">${escapeHtml(section.changeType)}</span>
                </header>
                <div class="diff-columns">
                  <div class="diff-pane old">
                    <small>旧版原文</small>
                    <div class="diff-text">${inlineDiff(section.oldText, section.newText, "old")}</div>
                  </div>
                  <div class="diff-pane new">
                    <small>新版原文</small>
                    <div class="diff-text">${inlineDiff(section.oldText, section.newText, "new")}</div>
                  </div>
                </div>
                <p class="diff-impact"><b>M1 座椅影响：</b>${escapeHtml(section.impactZh)}</p>
              </article>`,
          )
          .join("")
      : `<p class="muted">未生成可核验的条款级差异。${comparison.status === "failed" ? "本轮只能确认信源发生变化，不能据此推断具体条款。" : ""}</p>`;
  return `<section>
    <div class="section-title-row">
      <h2>新旧原文左右对比</h2>
      <span class="extraction-status">${escapeHtml(statusText)}</span>
    </div>
    <div class="comparison-sources">${sourceLinks}</div>
    ${sections}
    ${
      comparison.limitations.length > 0
        ? `<ul class="comparison-limitations">${comparison.limitations
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : ""
    }
  </section>`;
}

function timelineHtml(change: RegulationChange): string {
  const fields: Array<[string, string | undefined]> = [
    ["发布日期", change.publicationDate],
    ["征求意见开始", change.commentStart],
    ["征求意见截止", change.commentEnd],
    ["批准日期", change.approvalDate],
    ["生效日期", change.effectiveDate],
    ["过渡期结束", change.transitionEnd],
    ["废止日期", change.repealDate],
  ];
  return fields
    .map(
      ([label, value]) => `
        <div class="timeline-row ${value ? "known" : ""}">
          <span class="timeline-dot"></span>
          <span>${escapeHtml(label)}</span>
          <strong>${dateOrUnknown(value)}</strong>
        </div>`,
    )
    .join("");
}

function evidenceHtml(change: RegulationChange): string {
  return change.evidence
    .map(
      (item) => `
        <article class="evidence">
          <h3>${escapeHtml(item.label)}</h3>
          ${item.quote ? `<blockquote>${escapeHtml(item.quote)}</blockquote>` : ""}
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer noopener">
            ${escapeHtml(item.url)}
          </a>
        </article>`,
    )
    .join("");
}

function reviewStatusLabel(status: ReviewStatus): string {
  return reviewLabels[status];
}

function reportStatusClass(status: ReviewStatus): string {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "superseded") return "closed";
  return "draft";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

export function renderReportHtml(
  change: RegulationChange,
  regulationDiff?: RegulationDiff,
  renderedAt = new Date().toISOString(),
): string {
  const isDraft = change.reviewStatus === "draft";
  const watermark = isDraft
    ? "待人工复核"
    : change.reviewStatus === "approved"
      ? "已人工批准"
      : reviewStatusLabel(change.reviewStatus);
  const severity = severityLabels[change.severity as Severity] ?? change.severity;
  const changeType = changeTypeLabels[change.changeType] ?? change.changeType;
  const standardNumbers =
    change.standardNumbers.length > 0
      ? change.standardNumbers.join(" / ")
      : "标准号待人工确认";

  const regulationComparisonHtml = regulationDiff
    ? renderComparisonHtml(regulationDiff)
    : "";

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23173d54'/%3E%3Ccircle cx='32' cy='32' r='18' fill='none' stroke='%23f8f5ed' stroke-width='3'/%3E%3Ccircle cx='32' cy='32' r='5' fill='%23e65a2e'/%3E%3C/svg%3E">
  <title>${escapeHtml(change.title)} · SeatScope 审核稿</title>
  <style>
    :root {
      --paper: #f3f0e8;
      --sheet: #fffdf7;
      --ink: #13232d;
      --navy: #173d54;
      --steel: #56717c;
      --orange: #e65a2e;
      --green: #2f725f;
      --red: #b33a2b;
      --amber: #c68a2b;
      --line: rgba(19,35,45,.16);
    }
    @font-face {
      font-family: 'SiteSerif';
      src: local('Times New Roman'), local('TimesNewRomanPSMT');
      unicode-range: U+0041-005A, U+0061-007A;
    }
    @font-face {
      font-family: 'SiteSerif';
      src: local('宋体'), local('SimSun'), local('STSong'), local('Songti SC');
      unicode-range: U+0030-0039, U+4E00-9FFF, U+3000-303F, U+FF00-FFEF;
    }
    @font-face {
      font-family: 'SiteSans';
      src: local('Times New Roman'), local('TimesNewRomanPSMT');
      unicode-range: U+0041-005A, U+0061-007A;
    }
    @font-face {
      font-family: 'SiteSans';
      src: local('宋体'), local('SimSun'), local('STSong'), local('Songti SC');
      unicode-range: U+0030-0039, U+4E00-9FFF, U+3000-303F, U+FF00-FFEF;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(rgba(23,61,84,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(23,61,84,.04) 1px, transparent 1px),
        var(--paper);
      background-size: 34px 34px;
      font-family: 'SiteSans', sans-serif;
      line-height: 1.65;
      font-variant-numeric: tabular-nums;
    }
    .report {
      position: relative;
      width: min(1000px, calc(100% - 32px));
      margin: 34px auto;
      padding: clamp(30px, 6vw, 74px);
      overflow: hidden;
      background: var(--sheet);
      box-shadow: 0 24px 70px rgba(23,61,84,.14);
    }
    .report::before {
      content: "";
      position: absolute;
      inset: 12px;
      border: 1px solid rgba(23,61,84,.12);
      pointer-events: none;
    }
    .watermark {
      position: absolute;
      top: 160px;
      right: -90px;
      color: rgba(230,90,46,.075);
      font-family: 'SiteSerif', serif;
      font-size: clamp(5rem, 15vw, 11rem);
      font-weight: 700;
      letter-spacing: .12em;
      transform: rotate(-26deg);
      pointer-events: none;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      padding-bottom: 22px;
      border-bottom: 2px solid var(--navy);
    }
    .brand {
      font-family: 'SiteSerif', serif;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .brand small {
      display: block;
      color: var(--steel);
      font-family: 'SiteSans', sans-serif;
      font-size: .62rem;
      font-weight: 500;
      letter-spacing: .08em;
    }
    .status {
      display: inline-block;
      padding: 5px 11px;
      color: var(--amber);
      border: 1px solid currentColor;
      border-radius: 99px;
      font-size: .68rem;
      font-weight: 700;
    }
    .status.approved { color: var(--green); }
    .status.closed { color: var(--red); }
    .report-meta {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      margin: 32px 0 24px;
    }
    .eyebrow {
      color: var(--orange);
      font-size: .65rem;
      font-weight: 700;
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 760px;
      margin: 8px 0 14px;
      font-family: 'SiteSerif', serif;
      font-size: clamp(2.15rem, 6vw, 4.4rem);
      line-height: 1.06;
      letter-spacing: -.055em;
    }
    .lead { max-width: 790px; color: var(--steel); }
    .identity {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin: 25px 0;
      border: 1px solid var(--line);
    }
    .identity div { padding: 13px 15px; border-right: 1px solid var(--line); }
    .identity div:last-child { border-right: 0; }
    .identity span, .timeline-row span, .checklist span { color: var(--steel); font-size: .64rem; }
    .identity strong { display: block; margin-top: 3px; font-size: .78rem; }
    section { margin-top: 34px; }
    h2 {
      margin: 0 0 14px;
      padding-bottom: 7px;
      font-family: 'SiteSerif', serif;
      font-size: 1.5rem;
      border-bottom: 1px solid var(--line);
    }
    h3 { margin: 0 0 5px; font-size: .83rem; }
    p { margin-top: 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .callout {
      padding: 18px 20px;
      border-left: 4px solid var(--orange);
      background: rgba(230,90,46,.055);
    }
    .callout strong { display: block; margin-bottom: 5px; font-family: 'SiteSerif', serif; }
    ul, ol { margin: 8px 0 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
    .timeline { border-left: 1px solid rgba(19,35,45,.25); margin-left: 6px; }
    .timeline-row {
      position: relative;
      display: grid;
      grid-template-columns: 145px 1fr;
      gap: 10px;
      align-items: center;
      min-height: 38px;
      padding-left: 11px;
    }
    .timeline-dot {
      position: absolute;
      left: -7px;
      width: 11px;
      height: 11px;
      border: 1px solid rgba(19,35,45,.35);
      border-radius: 50%;
      background: var(--sheet);
    }
    .timeline-row.known .timeline-dot { border-color: var(--orange); background: var(--orange); }
    .section-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
    }
    .extraction-status {
      color: var(--steel);
      font-size: .66rem;
    }
    .comparison-sources {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 22px;
      margin: -4px 0 18px;
      color: var(--steel);
      font-size: .7rem;
    }
    .diff-section {
      margin-bottom: 18px;
      overflow: hidden;
      border: 1px solid var(--line);
    }
    .diff-section > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 13px;
      background: rgba(23,61,84,.045);
    }
    .diff-section > header div {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .diff-index { font-size: .76rem; font-weight: 700; }
    .diff-section > header b {
      color: var(--steel);
      font-family: 'SiteSans', sans-serif;
      font-size: .64rem;
      font-weight: 500;
    }
    .diff-kind {
      padding: 2px 7px;
      color: var(--orange);
      border: 1px solid currentColor;
      border-radius: 99px;
      font-size: .59rem;
    }
    .diff-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .diff-pane { min-width: 0; padding: 14px; }
    .diff-pane.old { border-right: 1px solid var(--line); }
    .diff-pane small {
      display: block;
      margin-bottom: 7px;
      color: var(--steel);
      font-size: .59rem;
      letter-spacing: .08em;
    }
    .diff-text {
      min-height: 54px;
      font-family: 'SiteSans', sans-serif;
      font-size: .74rem;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .diff-text del {
      padding: 1px 2px;
      color: #8e2d24;
      background: rgba(179,58,43,.12);
      text-decoration-color: rgba(179,58,43,.55);
    }
    .diff-text ins {
      padding: 1px 2px;
      color: #205d4b;
      background: rgba(47,114,95,.14);
      text-decoration: none;
    }
    .comparison-section { margin-top: 34px; }
    .comparison-summary {
      padding: 14px 18px;
      margin-bottom: 20px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(23,61,84,.03);
    }
    .summary-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .summary-stats .stat {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: .72rem;
      font-weight: 600;
    }
    .summary-stats .stat.added {
      color: #205d4b;
      background: rgba(47,114,95,.12);
    }
    .summary-stats .stat.removed {
      color: #8e2d24;
      background: rgba(179,58,43,.12);
    }
    .summary-stats .stat.modified {
      color: #7a5c1f;
      background: rgba(198,138,43,.12);
    }
    .summary-text {
      color: var(--steel);
      font-size: .72rem;
    }
    .no-changes {
      color: var(--steel);
      font-style: italic;
    }
    .diff-article {
      margin-bottom: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .diff-article.added { border-left: 4px solid var(--green); }
    .diff-article.removed { border-left: 4px solid var(--red); }
    .diff-article.modified { border-left: 4px solid var(--amber); }
    .diff-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(23,61,84,.04);
      border-bottom: 1px solid var(--line);
    }
    .diff-header h3 {
      margin: 0;
      font-size: .88rem;
      font-weight: 600;
    }
    .diff-badge {
      padding: 3px 9px;
      border-radius: 99px;
      font-size: .62rem;
      font-weight: 700;
    }
    .diff-badge.added {
      color: var(--green);
      border: 1px solid var(--green);
    }
    .diff-badge.removed {
      color: var(--red);
      border: 1px solid var(--red);
    }
    .diff-badge.modified {
      color: var(--amber);
      border: 1px solid var(--amber);
    }
    .diff-content { padding: 16px; }
    .diff-text {
      font-size: .78rem;
      line-height: 1.7;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .diff-text del {
      padding: 1px 3px;
      color: #8e2d24;
      background: rgba(179,58,43,.12);
      text-decoration: line-through;
    }
    .diff-text ins {
      padding: 1px 3px;
      color: #205d4b;
      background: rgba(47,114,95,.14);
      text-decoration: none;
    }
    .added-text {
      color: var(--green);
      background: rgba(47,114,95,.05);
      padding: 12px;
      border-radius: 6px;
    }
    .removed-text {
      color: var(--red);
      background: rgba(179,58,43,.05);
      padding: 12px;
      border-radius: 6px;
    }
    .diff-empty { color: var(--steel); font-style: italic; }
    .diff-impact {
      margin: 0;
      padding: 10px 14px;
      color: var(--steel);
      border-top: 1px solid var(--line);
      background: rgba(230,90,46,.035);
      font-size: .68rem;
    }
    .comparison-limitations {
      color: var(--steel);
      font-size: .68rem;
    }
    .evidence {
      margin-bottom: 10px;
      padding: 14px;
      border: 1px solid var(--line);
    }
    blockquote { margin: 8px 0; color: var(--steel); font-size: .8rem; }
    a { color: var(--navy); overflow-wrap: anywhere; }
    .feishu {
      padding: 18px;
      color: #f8f5ed;
      background: var(--navy);
    }
    .feishu p { margin-bottom: 6px; color: rgba(255,255,255,.7); font-size: .78rem; }
    .feishu strong { color: #fff; }
    .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .checklist div { padding: 10px; border: 1px solid var(--line); }
    .muted { color: var(--steel); font-size: .78rem; }
    footer {
      margin-top: 44px;
      padding-top: 18px;
      color: var(--steel);
      border-top: 1px solid var(--line);
      font-size: .67rem;
    }
    .report-id { text-align: right; color: var(--steel); font-size: .65rem; }
    @media (max-width: 700px) {
      .report { width: 100%; margin: 0; padding: 28px 20px; box-shadow: none; }
      .identity { grid-template-columns: 1fr 1fr; }
      .identity div:nth-child(2) { border-right: 0; }
      .identity div:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .grid-2, .checklist { grid-template-columns: 1fr; }
      .diff-columns { grid-template-columns: 1fr; }
      .diff-pane.old {
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }
      .report-meta { grid-template-columns: 1fr; }
      .report-id { text-align: left; }
      .timeline-row { grid-template-columns: 1fr; }
      .timeline-row strong { grid-column: 1; }
    }
    @media print {
      @page { size: A4; margin: 14mm; }
      body { background: #fff; }
      .report { width: 100%; margin: 0; padding: 0; box-shadow: none; }
      .report::before { display: none; }
      .watermark { position: fixed; }
      a { color: inherit; text-decoration: none; }
      section { break-inside: avoid; }
      .feishu { color: #000; background: #eee; }
    }
  </style>
</head>
<body data-review-status="${escapeHtml(change.reviewStatus)}" data-review-date="${escapeHtml(renderedAt)}" data-report-generated-at="${escapeHtml(renderedAt)}">
  <main class="report">
    <div class="watermark">${escapeHtml(watermark)}</div>
    <header>
      <div class="brand">SeatScope<small>M1 座椅法规雷达 · 锁老师</small></div>
      <span class="status ${reportStatusClass(change.reviewStatus)}" data-review-badge>${escapeHtml(reviewStatusLabel(change.reviewStatus))}</span>
    </header>

    <div class="report-meta">
      <div>
        <span class="eyebrow">Regulatory impact review / draft</span>
        <h1>${escapeHtml(change.title)}</h1>
        <p class="lead">${escapeHtml(change.summaryZh)}</p>
      </div>
      <div class="report-id">
        审核稿 ID<br><strong>${escapeHtml(change.id)}</strong><br>
        审核稿生成时间<br><strong>${escapeHtml(formatDateTime(renderedAt))}</strong><br>
        监测发现时间<br><strong>${escapeHtml(formatDateTime(change.detectedAt))}</strong>
      </div>
    </div>

    <div class="identity">
      <div><span>标准号</span><strong>${escapeHtml(standardNumbers)}</strong></div>
      <div><span>体系 / 机构</span><strong>${escapeHtml(change.system)} / ${escapeHtml(change.issuer)}</strong></div>
      <div><span>变化类型</span><strong>${escapeHtml(changeType)}</strong></div>
      <div><span>影响判断</span><strong>${escapeHtml(severity)}</strong></div>
    </div>

    <div class="callout">
      <strong>人工复核是发布前置条件</strong>
      本报告由 AI 辅助整理，日期、条款、试验方法与影响面均须对照官方原文核验。未确认日期统一显示“未确认”，不得据此推断生效或废止。
    </div>

    <div class="grid-2">
      <section>
        <h2>版本变化</h2>
        <p><span class="eyebrow">Old</span><br>${escapeHtml(change.oldVersion ?? "未确认")}</p>
        <p><span class="eyebrow">New</span><br>${escapeHtml(change.newVersion ?? "未确认")}</p>
        <p class="muted">置信度：${escapeHtml(change.confidence)}</p>
      </section>
      <section>
        <h2>法规时间轴</h2>
        <div class="timeline">${timelineHtml(change)}</div>
      </section>
    </div>

    ${regulationDiff ? regulationComparisonHtml : comparisonHtml(change)}

    <section>
      <h2>M1 座椅设计影响</h2>
      ${listHtml(change.impactedDesignAreas, "证据不足，设计影响待人工确认。")}
      <h3 style="margin-top:20px">试验与验证</h3>
      ${listHtml(change.impactedTestMethods, "证据不足，试验方法待官方原文核验。")}
    </section>

    <section>
      <h2>建议动作</h2>
      ${change.recommendedActions.length > 0 ? `<ol>${change.recommendedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol>` : `<p class="muted">待人工制定。</p>`}
    </section>

    <section>
      <h2>证据与官方链接</h2>
      ${evidenceHtml(change)}
    </section>

    <section>
      <h2>人工复核清单</h2>
      <div class="checklist">
        <div><span>01</span><br>确认标准号、版本与官方来源一致</div>
        <div><span>02</span><br>逐项核对日期、条款和试验方法</div>
        <div><span>03</span><br>确认 M1 座椅设计、工装或认证影响</div>
        <div><span>04</span><br>批准后才复制飞书摘要并人工发送</div>
      </div>
    </section>

    <section class="feishu">
      <strong>飞书摘要（仅批准后使用）</strong>
      <p>【SeatScope 法规影响提示 · 待人工审核】</p>
      <p>涉及标准：${escapeHtml(standardNumbers)}</p>
      <p>摘要：${escapeHtml(change.summaryZh)}</p>
      <p>审核人：锁老师（待确认）</p>
    </section>

    <footer>
      <p>SeatScope 仅提供法规变更发现与影响初筛，不构成法律、认证、试验验证或生产放行结论。</p>
      <p>飞书发送为人工操作；本报告不包含自动 Webhook。报告 ID：${escapeHtml(change.id)}</p>
    </footer>
  </main>
</body>
</html>`;
  return html.replace(/[ \t]+$/gm, "");
}

export function updateReportReviewState(
  html: string,
  status: ReviewStatus,
  reviewedAt: string,
): string {
  const className =
    status === "approved" ? "approved" : status === "draft" ? "draft" : "closed";
  return html
    .replace(/<body data-review-status="[^"]*"/, `<body data-review-status="${status}"`)
    .replace(/<body([^>]*)data-review-date="[^"]*"/, `<body$1data-review-date="${escapeHtml(reviewedAt)}"`)
    .replace(
      /<span class="status [^"]*" data-review-badge>[^<]*<\/span>/,
      `<span class="status ${className}" data-review-badge>${escapeHtml(reviewStatusLabel(status))}</span>`,
    )
    .replace(
      /<div class="watermark">[^<]*<\/div>/,
      `<div class="watermark">${status === "approved" ? "已人工批准" : escapeHtml(reviewStatusLabel(status))}</div>`,
    );
}

