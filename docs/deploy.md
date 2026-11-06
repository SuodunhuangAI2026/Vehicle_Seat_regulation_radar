# SeatScope 部署与审核指南

目标地址：

- 仓库：`https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar`
- 站点：`https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/`

## 1. 创建仓库

1. 登录 GitHub 账号 `SuodunhuangAI2026`。
2. 新建公开仓库 `Vehicle_Seat_regulation_radar`。
3. 不要勾选自动生成 README、`.gitignore` 或 License。
4. 在本地仓库配置远程地址并推送 `main`。

```powershell
git remote add origin https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar.git
git push -u origin main
```

如果远程地址已存在，使用：

```powershell
git remote set-url origin https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar.git
git push -u origin main
```

## 2. 启用 GitHub Pages

进入仓库：

1. 打开 `Settings`。
2. 在左侧选择 `Pages`。
3. 在 `Build and deployment` 下把 `Source` 设为 `GitHub Actions`。
4. 不需要额外选择分支或 `/docs` 目录。

工作流会在构建后上传 `dist`，再通过 `actions/deploy-pages` 发布。

## 3. 配置 DeepSeek Secret

1. 打开仓库 `Settings`。
2. 进入 `Secrets and variables` → `Actions`。
3. 在 `Repository secrets` 中新建 `DEEPSEEK_API_KEY`。
4. 填入 DeepSeek API Key，不要使用明文写入代码、Issue、提交记录或聊天。
5. 可选：在 `Repository variables` 中设置 `DEEPSEEK_MODEL=deepseek-chat`。当前工作流也直接使用该默认值。

没有配置 Key 时，工作流仍然会：

- 运行测试和类型检查。
- 抓取官方信源并更新健康状态。
- 构建和部署静态站点。

只是不会创建 AI 变更分析或 HTML 审核稿。

## 4. 手动触发部署

1. 打开仓库的 `Actions` 页面。
2. 选择 `Monitor and deploy SeatScope`。
3. 点击 `Run workflow`。
4. 分支选择 `main`。
5. 等待 `monitor-and-build` 和 `deploy` 两个任务完成。

定时任务使用：

```yaml
cron: "0 0 * * *"
```

这是每天 `00:00 UTC`，即北京时间 `08:00`。

## 5. 首次上线检查

打开：

`https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/`

确认：

- 页面标题显示 `SeatScope · M1 座椅法规雷达 · 锁老师`。
- CSS 和 JavaScript 请求都位于 `/Vehicle_Seat_regulation_radar/` 下。
- `总览`、`变更雷达`、`标准库`、`信源中心`、`审核稿`、`方法与说明`都能打开。
- 141 条标准明细和 92 个唯一信源网址可查看。
- 信源中心明确显示 UNECE 或 NHTSA 的失败、备份和警告，而不是把失败显示成成功。
- 浏览器控制台没有资源加载错误。

## 6. 审核生成的 HTML 报告

工作流检测到变化并配置 DeepSeek Key 后，会：

1. 在 `public/reports/` 写入独立 HTML 审核稿。
2. 在 `src/data/reports.json` 登记报告。
3. 把状态记录为 `draft`。
4. 用带 `[skip ci]` 的提交把数据推送回仓库。

你可以打开仓库中的 HTML 文件，或使用提交后的 Pages 地址：

`https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/reports/<报告文件>.html`

审核后，在最新 `main` 上执行：

```powershell
git pull
npm.cmd run review -- report-xxxx --approve
```

审核命令会：

- 把报告和关联变更状态写为 `approved`。
- 更新 HTML 中的审核徽章。
- 输出飞书摘要，供锁老师人工复制。

拒绝或作废：

```powershell
npm.cmd run review -- report-xxxx --reject
npm.cmd run review -- report-xxxx --supersede
```

随后提交审核结果：

```powershell
git add src/data public/reports
git commit -m "chore: record regulation report review"
git push
```

系统不包含飞书 Webhook，也不会自动发送群消息。

## 7. Key 轮换

如果 Key 出现在截图、日志、提交、Issue 或其他公开位置：

1. 立即在 DeepSeek 控制台吊销该 Key。
2. 创建新 Key。
3. 在 GitHub `Settings` → `Secrets and variables` → `Actions` 更新 `DEEPSEEK_API_KEY`。
4. 更新本地 `.env.local`。
5. 检查 Actions 日志是否曾打印密钥；当前脚本不会主动输出密钥。

## 8. 常见问题

### 页面 404 或资源路径错误

确认 Pages 来源是 `GitHub Actions`，工作流从 `main` 成功部署，并且 `vite.config.ts` 在 Actions 环境中使用仓库名作为 base。

### 工作流在提交数据时失败

确认 `Settings` → `Actions` → `General` 的 Workflow permissions 允许读写仓库内容。工作流本身声明了 `contents: write`。

### UNECE 返回 HTTP 403

这是来源站点反自动访问导致的真实失败。系统不会绕过限制，也不会伪造“无变化”。信源中心会保留失败状态，后续任务可继续重试或改为人工浏览。

### NHTSA 显示备份警告

NHTSA HTML 页面拒绝自动抓取时，适配器会使用美国 GPO 的官方 `49 CFR Part 571` XML。该备份可能存在版本时间差，因此界面会保留 warning。

### 定时任务没有产生新提交

只有内容哈希或章节记录发生变化时才会生成新数据。没有变化时不会制造无意义的提交。
