# 🌄 睡眠债务山丘 · Sleep Debt Visualizer

每天记一下睡了几小时，把「睡眠债」画成一座会涨会退的山丘，直观看到你欠身体多少觉。

> 熬夜党 / 学生 / 新手父母 / 倒班打工人专用。偶尔熬夜觉得「周末补回来就行」，但累积睡眠债其实在悄悄涨——这个工具让你**看见**这笔债。

## 功能（MVP）

- **每日录入 / 打卡**：🌙 睡眠打卡（记入睡时间）+ ☀️ 早起打卡（记起床时间），自动算出「今日睡眠时长」（自动处理跨天）；也支持直接拖滑块手动填小时数，二者可互转。
- **债务山丘图**：纯手写 SVG 面积图，零轴之上填绿（盈余）、之下填红（债务），悬停查看每日明细。
- **近 7 / 30 天汇总**：当前睡眠债、最长连亏天数、今日建议补觉时长，附平均睡眠与记录完整度。
- **PDF 周报**：一键 `window.print()` 导出打印友好的睡眠周报（无重型依赖）。
- **纯本地**：数据存浏览器 `localStorage`，无后端、无上传。

## 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · 自写 SVG 图表（不引重型图表库）· 数据存 `localStorage` · 静态导出。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
```

## 构建静态产物

```bash
npm run build    # 产出 out/ 目录（已配置 output: 'export'）
```

### 部署到 GitHub Pages

**方式 A：GitHub Actions 自动部署（推荐）**
1. 仓库 Settings → Pages → Build and deployment → Source 选「GitHub Actions」。
2. 在仓库 **Settings → Secrets and variables → Actions → Variables** 添加一个变量：
   - `PAGES_BASE_PATH` = `/你的仓库名`（如仓库叫 `sleep-debt-hill` 就填 `/sleep-debt-hill`）。
   - 用户/组织页（`*.github.io`）留空即可。
3. 推送代码，Actions 会自动构建并发布。

**方式 B：手动上传**
1. 跑 `npm run build`（如需 base path：`BASE_PATH=/仓库名 npm run build`）。
2. 把 `out/` 目录内容直接丢进 GitHub Pages 的发布源（分支 / docs）。

> 本项目已内置 `.github/workflows/deploy.yml`，使用方式 A 时无需额外配置。

## 文件结构

```
app/
  layout.tsx        页面外壳 + 元信息
  page.tsx          主界面（录入 / 统计 / 图表 / 周报）
  globals.css       Tailwind + 打印样式
components/
  SleepEntryForm.tsx   每日录入表单
  StatsCards.tsx       汇总卡片
  DebtHillChart.tsx    自写 SVG 债务山丘图
lib/
  sleep.ts            数据持久化 + 债务计算（纯函数）
```

## 计算口径

- 当日余额 = 睡眠时长 − 7h（正=盈余，负=亏空）。
- 累计债务 = 自首次记录以来每日余额的滚动求和；负值即当前欠身体的觉。
- 未记录的日子不计入债务变动（余额记 0），但会断开「连亏」统计。
- 今日建议补觉 = 当前债务（封顶单日 5h，超出提示分多日补足）。
