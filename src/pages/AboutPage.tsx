import { DataQualityNote } from "../components/DataQualityNote";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime } from "../lib/format";
import type {
  ImportReport,
  MonitorMeta,
  SourceRecord,
} from "../types";

const pipeline = [
  {
    number: "01",
    title: "采集",
    text: "GitHub Actions 按计划调用官方 API、XML 或 HTML 页面，并记录 ETag、Last-Modified、内容哈希与来源健康状态。",
  },
  {
    number: "02",
    title: "归一化",
    text: "把不同来源的标题、版本、日期和链接变成统一快照。完整外部内容只留在工作区，不提交到公开仓库。",
  },
  {
    number: "03",
    title: "对比",
    text: "比较稳定条目键、版本与内容哈希，只把发生变化的证据交给 DeepSeek，避免让模型猜测未提供的条款。",
  },
  {
    number: "04",
    title: "校验",
    text: "DeepSeek 必须返回严格 JSON，并由 Zod 校验。日期不明确时要求 null；格式错误或字段越界时拒绝模型输出。",
  },
  {
    number: "05",
    title: "审核",
    text: "生成独立、可打印、无需 JavaScript 的 HTML 草稿，页面持续显示“待人工复核”，直到锁老师完成状态变更。",
  },
  {
    number: "06",
    title: "手动发送",
    text: "仅 approved 报告提供飞书摘要复制。飞书发送始终由审核人手工完成，没有 Webhook 或自动群消息。",
  },
];

export function AboutPage({
  importReport,
  meta,
  sources,
}: {
  importReport: ImportReport;
  meta: Partial<MonitorMeta>;
  sources: SourceRecord[];
}) {
  const automated = sources.filter(
    (source) => source.monitoringMode === "automated",
  );

  return (
    <div className="page about-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Method / evidence / human control</span>
          <h1>方法与说明</h1>
          <p>
            SeatScope 是法规变更发现与影响初筛工具。它不替代法规原文、认证结论、
            试验验证或企业放行评审。
          </p>
        </div>
        <div className="method-stamp">
          <span>PROMPT</span>
          <b>{meta.promptVersion ?? "seats-v1"}</b>
          <small>{meta.model ?? "deepseek-chat"}</small>
        </div>
      </header>

      <section className="method-flow">
        {pipeline.map((step) => (
          <article key={step.number}>
            <span>{step.number}</span>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </article>
        ))}
      </section>

      <div className="about-grid">
        <section className="panel">
          <span className="eyebrow">Operating envelope</span>
          <h2>当前覆盖边界</h2>
          <div className="coverage-list">
            {automated.map((source) => (
              <div key={source.id}>
                <StatusBadge value="automated" />
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {source.name} ↗
                </a>
                <small>{source.adapterId}</small>
              </div>
            ))}
          </div>
          <p className="quiet-note">
            其余 {sources.length - automated.length} 个信源为人工浏览目录。
            适配器失败不会阻断其他来源，也不会被记作成功。
          </p>
        </section>

        <section className="panel">
          <span className="eyebrow">Run status</span>
          <h2>最近运行</h2>
          <dl className="metadata-list">
            <div>
              <dt>最近成功</dt>
              <dd>{formatDateTime(meta.lastSuccessfulRun)}</dd>
            </div>
            <div>
              <dt>最近尝试</dt>
              <dd>{formatDateTime(meta.lastAttemptedRun)}</dd>
            </div>
            <div>
              <dt>分析模型</dt>
              <dd>{meta.model ?? "deepseek-chat"}</dd>
            </div>
            <div>
              <dt>提示词版本</dt>
              <dd>{meta.promptVersion ?? "seats-v1"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <DataQualityNote report={importReport} />

      <section className="panel known-gaps">
        <span className="eyebrow">Known gaps</span>
        <h2>已知限制</h2>
        <div className="gap-grid">
          {(meta.knownGaps ?? []).map((gap, index) => (
            <div key={gap}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{gap}</p>
            </div>
          ))}
          <div>
            <span>{String((meta.knownGaps?.length ?? 0) + 1).padStart(2, "0")}</span>
            <p>
              扫描版 PDF、登录保护页面和反爬限制可能无法提取文本，页面会保留来源链接并标记失败或待人工复核。
            </p>
          </div>
        </div>
      </section>

      <section className="disclaimer">
        <span>免责声明</span>
        <p>
          AI 辅助整理的版本差异、影响面和行动建议可能存在遗漏或误判。任何设计变更、
          试验计划、认证申报或生产放行决定，必须由具备权限的法规、工程和质量人员
          对照官方原文确认。
        </p>
        <p>
          飞书流程仅提供摘要复制，不包含自动发送能力。DeepSeek API Key 只配置在本地
          `.env.local` 或 GitHub Actions Secrets，不进入公开前端资源。
        </p>
      </section>
    </div>
  );
}
