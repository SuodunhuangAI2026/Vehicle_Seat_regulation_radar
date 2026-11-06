# SeatScope · M1 座椅法规雷达 · 锁老师

SeatScope 是面向 M1 车辆座椅、头枕、安全带固定点与约束系统的法规变更雷达。它把标准清单、官方信源、变更观察和人工审核稿集中到一个静态网站中，并保留证据链接与数据质量说明。

- 线上站点：[https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/](https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/)
- 代码仓库：[https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar](https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar)

## 能做什么

- 浏览 141 条标准明细和 107 条标准号汇总，按体系、类型和状态筛选。
- 查看 92 个唯一信源网址及其自动监测状态。
- 跟踪 eCFR、UNECE、NHTSA 和 Transport Canada 的结构化页面或 XML。
- 使用内容哈希和章节级差异识别变化，不把首次抓取误报成法规变更。
- 在配置 DeepSeek Key 后生成严格校验的变更分析，并输出独立、可打印的 HTML 审核稿。
- 只有审核为 `approved` 的稿件才提供飞书摘要复制；系统不会自动向飞书发送消息。

## 数据口径

- 工作簿可见标准明细：141 条。
- 工作簿标准号汇总：107 条。
- 工作簿自报文档数：155；自报标准号数：111。差异已在页面明确披露。
- 收藏夹提取唯一网址：92 个。
- 收藏夹栏目自报条目：117；缺少可追溯网址的条目没有被虚构补齐。

当前自动监测覆盖 5 条源记录。UNECE 可能返回 HTTP 403；NHTSA 页面也可能返回 403，此时适配器会使用美国 GPO 的官方 XML 备份并在信源健康中披露。失败不会被包装成成功。

## 架构

```text
React + Vite + TypeScript
        |
        +-- src/data/*.json       类型化静态数据
        +-- public/reports/*.html 独立审核稿
        |
GitHub Actions
        |
        +-- 每日抓取官方信源
        +-- 内容哈希与章节差异
        +-- DeepSeek JSON 分析（可选）
        +-- 提交数据与审核稿
        +-- 构建并部署 GitHub Pages
```

前端使用 HashRouter，所有页面都能从 GitHub Pages 的仓库子路径直接访问。监测逻辑只在 Action 或本地 Node.js 进程中运行，API Key 不会进入浏览器包。

## 本地运行

要求 Node.js 24 或更高版本。

```powershell
npm.cmd ci
npm.cmd run dev
```

打开终端输出的本地地址。生产构建：

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

## 本地监测与审核

复制环境变量模板，且不要把真实 Key 写入仓库：

```powershell
Copy-Item .env.example .env.local
```

在 `.env.local` 中设置：

```dotenv
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_MODEL=deepseek-chat
```

抓取并生成数据：

```powershell
npm.cmd run monitor
```

没有配置 Key 时，监测仍会更新信源健康状态，但不会生成模拟分析或 HTML 报告。

审核已生成报告的示例：

```powershell
npm.cmd run review -- report-xxxx --approve
npm.cmd run review -- report-xxxx --reject
npm.cmd run review -- report-xxxx --supersede
```

只有 `--approve` 会在终端输出飞书摘要，供人工复制并发送。

## 部署

仓库已配置 `.github/workflows/monitor-and-deploy.yml`：

- 每天 `00:00 UTC`（北京时间 08:00）自动运行。
- 支持 `workflow_dispatch` 手动触发。
- 推送到 `main` 时运行测试、类型检查、监测、构建和 Pages 部署。
- 生成的数据和报告以 `[skip ci]` 提交回仓库。
- 未配置 `DEEPSEEK_API_KEY` 时，Action 仍完成信源健康更新与站点部署。

完整上线步骤见 [docs/deploy.md](docs/deploy.md)。

## 数据与安全边界

- 不提交原始 XLSX、DOCX、内部 PDF 或企业机密资料。
- 不实现飞书 Webhook 或自动群消息。
- 未确认的日期、版本和生效结论保持“未确认”，不进行推测。
- DeepSeek 输出必须通过 Zod 校验，证据链接必须属于对应官方来源域名。
- 若密钥可能泄露，应立即在 DeepSeek 和 GitHub Actions Secrets 中轮换。

## 免责声明

本项目是法规发现与影响初筛工具，不替代法规原文、认证结论、试验验证或企业放行评审。任何设计、试验、认证或生产决策都应由具备权限的法规、工程和质量人员对照官方原文确认。
