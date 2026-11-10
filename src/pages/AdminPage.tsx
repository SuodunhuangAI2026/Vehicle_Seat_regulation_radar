import { useState } from "react";
import { Link } from "react-router-dom";
import { clearAdminSession } from "../lib/admin-access";
import type {
  KnowledgeItem,
  NewsFeedItem,
  SourceRecord,
  StandardRecord,
} from "../types";

type DatasetKey = "knowledge" | "newsfeed" | "sources" | "standards";

const datasetMeta: Record<
  DatasetKey,
  { label: string; path: string; description: string }
> = {
  standards: {
    label: "标准库",
    path: "src/data/standards.json",
    description:
      "每个标准号一行；保留版本、官方获取地址、审核状态与维护记录。",
  },
  sources: {
    label: "信源目录",
    path: "src/data/sources.json",
    description:
      "作为自动适配器和人工浏览信源的底账，不再单独出现在主导航。",
  },
  knowledge: {
    label: "法规小知识",
    path: "src/data/knowledge.json",
    description:
      "首页展示内容，最多建议 20 条；不得虚构法规条款，缺来源时明确标记。",
  },
  newsfeed: {
    label: "变化报告",
    path: "src/data/newsfeed.json",
    description:
      "首页滚动条备用内容，最多 5 条；已有变更雷达数据时优先展示雷达变化。",
  },
};

export function AdminPage({
  standards,
  sources,
  knowledge,
  newsfeed,
}: {
  standards: StandardRecord[];
  sources: SourceRecord[];
  knowledge: KnowledgeItem[];
  newsfeed: NewsFeedItem[];
}) {
  const [active, setActive] = useState<DatasetKey>("knowledge");
  const [drafts, setDrafts] = useState<Record<DatasetKey, string>>({
    standards: JSON.stringify(standards, null, 2),
    sources: JSON.stringify(sources, null, 2),
    knowledge: JSON.stringify(knowledge, null, 2),
    newsfeed: JSON.stringify(newsfeed, null, 2),
  });
  const [message, setMessage] = useState("");
  const meta = datasetMeta[active];

  function parseDraft(): unknown[] {
    const parsed = JSON.parse(drafts[active]) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("顶层必须是 JSON 数组。");
    }
    if (active === "newsfeed" && parsed.length > 5) {
      throw new Error("变化报告最多保留 5 条。");
    }
    return parsed;
  }

  function validate() {
    try {
      const parsed = parseDraft();
      setMessage(`校验通过：${parsed.length} 条记录。`);
    } catch (error) {
      setMessage(
        `校验失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  function download() {
    try {
      const parsed = parseDraft();
      const blob = new Blob(
        [`${JSON.stringify(parsed, null, 2)}\n`],
        { type: "application/json;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = meta.path.split("/").pop() ?? "data.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`已导出 ${anchor.download}。请替换仓库文件后提交 Git。`);
    } catch (error) {
      setMessage(
        `无法导出：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async function copy() {
    try {
      parseDraft();
      await navigator.clipboard.writeText(drafts[active]);
      setMessage(`已复制 ${meta.path} 内容。`);
    } catch (error) {
      setMessage(
        `复制失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  function signOut() {
    clearAdminSession();
    window.location.reload();
  }

  return (
    <div className="page admin-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Lightweight JSON administration</span>
          <h1>轻量 JSON 管理台</h1>
          <p>
            此页仅向拥有本仓库写入权限的管理员开放。修改后导出 JSON，替换对应文件并提交
            Git，GitHub Actions 会重新构建和部署。
          </p>
        </div>
        <div className="admin-heading-side">
          <div className="heading-stat">
            <b>{drafts[active].split("\n").length}</b>
            <span>编辑行数</span>
          </div>
          <button
            type="button"
            className="button button-quiet"
            onClick={signOut}
          >
            退出管理
          </button>
        </div>
      </header>

      <section className="admin-workflow">
        <div><b>01</b><span>选择数据</span></div>
        <div><b>02</b><span>编辑并校验 JSON</span></div>
        <div><b>03</b><span>导出覆盖文件</span></div>
        <div><b>04</b><span>提交 Git 自动部署</span></div>
      </section>

      <div className="admin-layout">
        <aside className="admin-tabs" aria-label="管理数据文件">
          {(Object.keys(datasetMeta) as DatasetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={active === key ? "is-active" : ""}
              onClick={() => {
                setActive(key);
                setMessage("");
              }}
            >
              <strong>{datasetMeta[key].label}</strong>
              <code>{datasetMeta[key].path}</code>
            </button>
          ))}
        </aside>

        <section className="admin-editor">
          <div className="admin-editor-head">
            <div>
              <span>{meta.label}</span>
              <code>{meta.path}</code>
            </div>
            <p>{meta.description}</p>
          </div>
          <textarea
            aria-label={`${meta.label} JSON`}
            spellCheck={false}
            value={drafts[active]}
            onChange={(event) => {
              setDrafts((current) => ({
                ...current,
                [active]: event.target.value,
              }));
              setMessage("");
            }}
          />
          <div className="admin-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={validate}
            >
              校验 JSON
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={download}
            >
              下载覆盖文件
            </button>
            <button type="button" className="button button-quiet" onClick={copy}>
              复制内容
            </button>
            <Link className="text-link" to="/about">
              查看发布流程
            </Link>
          </div>
          {message && <p className="admin-message">{message}</p>}
          <div className="admin-warning">
            <strong>安全边界</strong>
            <p>
              管理入口通过 GitHub 仓库写入权限验证，令牌仅保存在当前标签页。此页不会直接
              写仓库，也不会保存 DeepSeek Key 或飞书 Webhook。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
