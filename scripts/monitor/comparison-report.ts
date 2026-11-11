import type {
  RegulationDiff,
  SectionDiff,
} from "./text-diff.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}/${match[2]}/${match[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function sourceLinks(diff: RegulationDiff): string {
  const links: string[] = [];
  if (diff.oldSourceUrl) {
    links.push(
      `<span>旧版来源：<a href="${escapeHtml(diff.oldSourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(formatDate(diff.oldVersion))} 官方文本</a></span>`,
    );
  }
  if (diff.newSourceUrl) {
    links.push(
      `<span>新版来源：<a href="${escapeHtml(diff.newSourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(formatDate(diff.newVersion))} 官方文本</a></span>`,
    );
  }
  return links.length > 0
    ? `<div class="comparison-sources">${links.join("")}</div>`
    : "";
}

function sectionPaneContent(
  section: SectionDiff,
  side: "old" | "new",
): string {
  const html = side === "old" ? section.oldDiffHtml : section.newDiffHtml;
  if (html) return html;
  return `<span class="diff-empty">${side === "old" ? "旧版无此章节" : "新版无此章节"}</span>`;
}

function renderSectionDiff(section: SectionDiff): string {
  const statusLabel = {
    added: "新增",
    removed: "删除",
    modified: "修改",
    unchanged: "未变化",
  }[section.changeType];
  const statusClass = section.changeType;

  return `
    <article class="diff-section ${statusClass}" data-section-id="${escapeHtml(section.sectionId)}">
      <header>
        <div>
          <span class="diff-index">${escapeHtml(section.sectionTitle)}</span>
        </div>
        <span class="diff-kind">${statusLabel}</span>
      </header>
      <div class="diff-columns">
        <div class="diff-pane old">
          <small>旧版原文</small>
          <div class="diff-text">${sectionPaneContent(section, "old")}</div>
        </div>
        <div class="diff-pane new">
          <small>新版原文</small>
          <div class="diff-text">${sectionPaneContent(section, "new")}</div>
        </div>
      </div>
    </article>
  `;
}

export function renderComparisonHtml(diff: RegulationDiff): string {
  const changedSections = diff.sections.filter(
    (section) => section.changeType !== "unchanged",
  );

  const summaryHtml = `
    <div class="comparison-summary">
      <div class="summary-stats">
        <span class="stat added">+${diff.summary.added} 新增章节</span>
        <span class="stat removed">-${diff.summary.removed} 删除章节</span>
        <span class="stat modified">~${diff.summary.modified} 修改章节</span>
      </div>
      <p class="summary-text">
        官方版本：${escapeHtml(formatDate(diff.oldVersion))} → ${escapeHtml(formatDate(diff.newVersion))}
      </p>
    </div>
  `;

  const sectionsHtml =
    changedSections.length > 0
      ? changedSections.map(renderSectionDiff).join("")
      : `<p class="no-changes">两版官方原文未检测到章节级文本变化。</p>`;

  return `
    <section class="comparison-section">
      <div class="section-title-row">
        <h2>新旧原文左右对比</h2>
        <span class="extraction-status">官方原文逐段比对</span>
      </div>
      ${sourceLinks(diff)}
      ${summaryHtml}
      <div class="comparison-content">${sectionsHtml}</div>
    </section>
  `;
}
