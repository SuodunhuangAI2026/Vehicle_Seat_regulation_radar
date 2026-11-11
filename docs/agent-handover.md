# SeatScope 网站管理与 Agent 交接记录

- 记录日期：2026-11-11
- 记录时已验收的产品修复提交：`69fde9d fix: render reports on change detail routes`
- 代码仓库：`C:\个人文件\09codex\Vehicle_Seat_regulation_radar`
- GitHub 仓库：`https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar`
- 线上站点：`https://suodunhuangai2026.github.io/Vehicle_Seat_regulation_radar/`
- 产品名：`SeatScope · M1 座椅法规雷达 · 锁老师`
- 默认分支：`main`
- 部署方式：GitHub Actions 构建并发布到 GitHub Pages

本文供后续 Agent 接手网站开发、内容维护、报告审核和发布排障。开始操作前，先读本文件、仓库 `README.md` 和 AI 工作组中的 SeatScope PRD。

## 1. 当前系统状态

网站已上线，2026-11-11 已验证：

- 旧详情路由会直接显示关联 HTML 审核稿，而不是旧的结构化详情卡片。
- 带 `reportPath` 的变更卡片和首页变化报告头条会直接打开对应 HTML。
- 审核报告仍保留真实审核状态；`draft` 不自动标为已批准。
- 最近一次线上验证链接：
  `https://suodunhuangai2026.github.io/Vehicle_Seat_regulation_radar/?v=20261111#/changes/chg-b7bc7d89014385`
- 上述链接当前显示：
  `reports/2026-11-07-chg-b7bc7d89014385.html`
- GitHub Actions 工作流：`Monitor and deploy SeatScope`
- 自动任务：每周三 06:30（北京时间），UTC cron 为 `30 22 * * 2`
- 手动任务：GitHub Actions 页面 `Run workflow`

## 2. 权威文件与职责

| 内容 | 路径 |
| --- | --- |
| 产品需求 PRD | `C:\个人文件\06.AI 工作组\SeatScope_座椅法规雷达_PRD_2026-11-09.md` |
| 交接记录 | `docs/agent-handover.md` |
| 前端入口与路由 | `src/App.tsx` |
| 首页 | `src/pages/OverviewPage.tsx` |
| 变更列表 | `src/pages/ChangesPage.tsx` |
| 变更详情路由 | `src/pages/ChangeDetailPage.tsx` |
| 标准库 | `src/pages/StandardsPage.tsx` |
| 审核稿列表 | `src/pages/ReportsPage.tsx` |
| 管理员门禁 | `src/components/AdminGate.tsx`、`src/lib/admin-access.ts` |
| 轻量管理台 | `src/pages/AdminPage.tsx` |
| 静态数据 | `src/data/*.json` |
| 独立 HTML 审核稿 | `public/reports/*.html` |
| 监测状态 | `monitor/state/*` |
| 监测与报告脚本 | `scripts/monitor/*` |
| 定时部署工作流 | `.github/workflows/monitor-and-deploy.yml` |
| 部署说明 | `docs/deploy.md` |

代码和线上行为的权威来源是 Git 仓库当前 `main`。PRD 和本交接记录用于说明意图和操作流程；如果文档与代码不一致，应先确认用户需求，再同步修正文档和代码。

## 3. 技术架构

```text
React + Vite + TypeScript
  |
  +-- HashRouter，适配 GitHub Pages 静态托管
  +-- src/data/*.json 作为静态数据源
  +-- public/reports/*.html 作为独立审核稿
  |
GitHub Actions
  |
  +-- 测试和 TypeScript 检查
  +-- 抓取官方信源
  +-- 哈希/章节差异检测
  +-- 下载并提取公开 HTML/PDF 原文
  +-- 可选调用 DeepSeek 生成对比分析
  +-- 写入 JSON、状态和 HTML 报告
  +-- 提交监测数据
  +-- 构建并部署 GitHub Pages
```

本站没有自建后端、数据库或常驻 API。浏览器只读取构建后的静态资源。DeepSeek Key 仅用于 GitHub Actions 或本地监测脚本，不应进入前端代码、URL、日志或 Git。

## 4. 关键业务规则

### 4.1 变更详情与报告

`src/pages/ChangeDetailPage.tsx` 的规则：

1. 找到 `changes.json` 中对应 `id` 的变更。
2. 如果该记录有 `reportPath`，直接渲染全屏 iframe：
   - `src` 由 `publicAssetPath(change.reportPath)` 生成。
   - iframe 使用 `report-document-frame`，固定覆盖整个视口。
   - 报告状态可以是 `draft`，不得为了显示报告而伪造 `approved`。
3. 只有没有 `reportPath` 时才显示旧的结构化详情页。

`src/components/ChangeCard.tsx` 和 `src/pages/OverviewPage.tsx` 的规则：

- 只要 `reportPath` 存在，就直接链接报告，不要求 `reviewStatus === "approved"`。
- `approved` 显示“查看已完成审核稿”。
- 其他状态显示“查看审核稿”。
- 没有 `reportPath` 时才进入 `/changes/:id`。

### 4.2 审核状态

- 自动生成报告默认 `draft`，页面应显示“待审核/待人工复核”。
- `approved` 才可视为审核完成，并允许生成人工复制到飞书的摘要。
- `rejected` 表示驳回。
- `superseded` 表示已被替代。
- 不得用 `reportPath` 是否存在来推断审核已通过。

### 4.3 飞书

- 网站不自动向飞书发送消息。
- 审核通过后可运行审核脚本取得摘要，由锁老师人工复制发送。
- 项目不包含飞书 Webhook、自动群消息或相关 Secret。

### 4.4 内容范围

- 聚焦 M1 座椅、座椅固定点、头枕、滑轨、调角器、座椅总成和直接相关安全结构。
- 安全带类标准（例如 UN R16）、儿童约束、排放、非座椅 EMC 等不应混入。
- 不确定是否与座椅相关时，先提交给用户确认，不要自行虚构结论。

## 5. 常用本地操作

要求 Node.js 24 或更高版本。

```powershell
cd C:\个人文件\09codex\Vehicle_Seat_regulation_radar
npm.cmd ci
npm.cmd run dev
```

提交前验证：

```powershell
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
```

注意：本机沙箱内 Vitest/esbuild 可能报 `spawn EPERM`。这是沙箱阻止子进程造成的，不是测试失败。若出现该错误，使用已授权的沙箱外执行方式重新运行测试。

本地监测：

```powershell
Copy-Item .env.example .env.local
```

在 `.env.local` 设置：

```dotenv
DEEPSEEK_API_KEY=实际密钥
DEEPSEEK_MODEL=deepseek-chat
```

运行：

```powershell
npm.cmd run monitor
```

不要把 `.env.local`、真实 Key、企业原始 XLSX/DOCX 或未公开标准全文提交到公开仓库。

## 6. 数据文件维护

### `src/data/changes.json`

每条变更记录至少关注：

- `id`
- `title`
- `standardNumbers`
- `changeType`
- `severity`
- `oldVersion` / `newVersion`
- `detectedAt`
- `summaryZh`
- `evidence`
- `reviewStatus`
- `reportPath`

新增 HTML 报告的典型步骤：

1. 把审核稿放入 `public/reports/`，文件名建议使用日期和变更 ID。
2. 在对应变更记录设置：

```json
"reportPath": "reports/2026-11-07-chg-b7bc7d89014385.html"
```

3. 在 `src/data/reports.json` 登记报告，保持报告状态与变更状态一致。
4. 运行测试和构建。
5. 打开 `/changes/<change-id>` 验证整页报告。
6. 打开报告绝对地址验证 HTML 本身可访问。

### 其他数据

- `standards.json`：标准库、版本、官方获取地址、监控状态。
- `sources.json`：信源底账和自动适配器配置。
- `reports.json`：审核报告索引。
- `knowledge.json`：首页法规小知识。
- `newsfeed.json`：首页变化报告备用内容，最多 5 条。
- `meta.json`：最近监控运行时间和信源健康。
- `standards-audit.json`：标准删除/清洗审计记录。

修改 JSON 后必须保证顶层结构符合 `src/types/index.ts`，并运行 TypeScript 和测试。

## 7. 管理员入口

- 管理台地址：`/admin`
- 公开导航、页脚和“方法与说明”中不显示管理台入口。
- 管理员需要 GitHub Fine-grained Personal Access Token：
  - 目标仓库：`SuodunhuangAI2026/Vehicle_Seat_regulation_radar`
  - 至少需要 `Contents: Read and write`
- 前端验证流程：
  1. 调用 GitHub `/user` 验证账号。
  2. 调用目标仓库接口。
  3. 要求 `permissions.push === true`。
- Token 仅存于当前标签页 `sessionStorage`，30 分钟后过期。
- 管理台只提供 JSON 校验、导出和复制，不直接写 GitHub。
- 管理员仍需用导出的 JSON 替换仓库文件、提交并推送。
- 不得把 Token 写入浏览器持久存储、文档、截图、控制台或 Git。

## 8. 报告审核

列出可用报告：

```powershell
Get-Content -Raw -Encoding UTF8 src/data/reports.json
```

审核命令：

```powershell
npm.cmd run review -- report-xxxx --approve
npm.cmd run review -- report-xxxx --reject
npm.cmd run review -- report-xxxx --supersede
```

只有 `--approve` 会在终端输出飞书摘要。提交审核结果：

```powershell
git add src/data public/reports
git commit -m "chore: record regulation report review"
git push
```

## 9. 发布流程

标准发布流程：

```powershell
git fetch origin main
git status --short --branch
git rebase origin/main
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
git push origin HEAD:main
```

规则：

- 自动监测任务会向 `main` 提交数据，推送前必须重新 fetch/rebase。
- 不要用 `git push --force` 覆盖远端自动监测提交。
- 不要把未完成的本地改动、`.env.local`、Key 或原始机密文件加入提交。
- 推送后检查 GitHub Actions，确认 `monitor-and-build` 和 `deploy` 成功。
- 如 commit message 含 `[skip ci]`，该提交不会触发新的工作流。

查看工作流：

`https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar/actions`

## 10. 上线后验收清单

1. 首页正常加载，控制台无资源 404。
2. 顶部导航：总览、变更雷达、标准库、审核稿、方法与说明均可打开。
3. 普通访客看不到管理台入口。
4. `/admin` 未验证时不能显示编辑界面。
5. 带 `reportPath` 的变更详情 URL 显示整页 HTML 审核稿。
6. 报告 HTML 绝对地址可访问。
7. 报告顶部状态与 `reports.json`、`changes.json` 一致。
8. 移动端 390px 宽度无横向溢出。
9. 自动监测失败在信源健康中如实显示，不伪装成成功。
10. 本轮使用的旧详情 URL 已通过线上浏览器截图确认。

## 11. 常见问题

### 详情页仍是旧卡片

- 检查 `changes.json` 对应该 `id` 是否有 `reportPath`。
- 检查 `public/reports/` 是否存在目标 HTML。
- 检查构建后的 `dist/reports/`。
- 检查浏览器是否缓存了旧 JS，尝试 `Ctrl+F5`。

### 页面 404 或资源路径错误

- GitHub Pages 的 Source 必须是 GitHub Actions。
- 确认工作流成功部署。
- `vite.config.ts` 在 Actions 中会以仓库名为 base。
- 前端使用 HashRouter，详情链接格式是 `/#/changes/<id>`。

### 审核稿可以打开，但详情页没有报告

- 确认 `reportPath` 没有错误前缀。
- 代码使用 `publicAssetPath` 拼接仓库 base，通常应写 `reports/...`，不要手写站点域名。

### UNECE 403

这是来源站反自动访问的真实失败。系统不应绕过限制或伪造“无变化”，保留失败状态等待用户决定。

### NHTSA 页面 403

适配器可能使用美国 GPO 官方 XML 备份，并在信源健康中显示 warning。不要隐藏该 warning。

### PDF 扫描件无法对比

扫描版 PDF、受保护页面或登录页面可能无法提取文本。此时只能生成“已变化、待人工提取”草稿，不得编造条款。

### Actions 提交数据失败

检查 `Settings -> Actions -> General -> Workflow permissions` 是否允许读写。工作流声明了 `contents: write`。

## 12. 安全与合规边界

- 不提交企业机密资料、原始工作簿、未公开标准全文。
- 不伪造法规生效日期、批准状态、条款或测试结论。
- 外链使用 `rel="noreferrer noopener"`。
- 生成报告中的用户/抓取文本必须转义。
- DeepSeek Key 只放 GitHub Actions Secret 或本地 `.env.local`。
- GitHub Token 只在管理员当前标签页会话中使用。
- 发现 Key 或 Token 泄露时，立即轮换并检查 Actions 日志、提交历史和公开页面。
- 站点是法规发现和影响初筛工具，不替代官方原文、认证、试验验证或企业放行结论。

## 13. 接手后的建议顺序

1. 阅读 PRD、本记录、README 和 `docs/deploy.md`。
2. 运行 `git status`，确认没有未解释的本地改动。
3. 运行 typecheck、测试和 build，建立基线。
4. 打开线上站点和至少一个带 `reportPath` 的详情链接。
5. 再开始修改代码或数据。
6. 每次发布前重新 fetch/rebase，避免覆盖自动监测提交。

## 14. 最近变更

- `69fde9d`：详情路由在存在 `reportPath` 时整页展示 HTML 报告；草稿报告也可从卡片和首页直达；新增相关回归测试。
- `ba94d9a`：首页完成稿优先展示。
- `00a89db`：自动监测数据更新。
