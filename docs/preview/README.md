# 嗯嗯日记 · 浏览器交互预览版（多文件结构）

本目录是「嗯嗯日记」小程序的交互预览版。它用纯 HTML/CSS/JS 在浏览器里 1:1 复刻小程序的 9 个页面，
用 `localStorage` 模拟云数据库，便于在没有微信开发者工具的环境下进行功能验收。

> **为什么拆分为多文件？**
> 早期 `preview.html` 把全部 CSS 与 JS 塞进一个文件，随功能追加膨胀到 1700+ 行，
> 改一处要全文翻找、极易误伤。现按「职责」拆分为以下文件，单文件变短、边界清晰、易扩展。

---

## 一、目录结构

```
docs/
├── preview.html              ← 入口壳：页面骨架 + 按顺序加载下方脚本（不再内联大段代码）
└── preview/                  ← 预览版资源目录
    ├── README.md             ← 本文件（结构说明 + 追加规范）
    ├── preview.css           ← 全部样式（原 <style> 整段，按功能分区注释）
    ├── 00-data.js            ← 数据层：常量 / 格式化 / 辅助函数（最先加载，无依赖）
    ├── 10-chart.js           ← 零依赖 Canvas2D 图表（hexA / roundRect / drawTrend / drawRing）
    ├── 20-report.js          ← 肠道周报引擎（buildWeekReport / drawReportCard / gradeOf …）
    ├── 30-canvas.js          ← 浏览器画布辅助（drawCanvas2D / drawTrendCanvas / renderStatsCharts）
    ├── 40-db.js              ← 本地数据库（loadDB / saveDB / seedDB / resetDB）
    ├── 50-ui.js              ← 全局 UI 工具（toast / openModal / closeModal）
    ├── 60-app.js             ← App 核心：var App = {…} 路由 / 渲染调度 / 状态 / homeData
    ├── 70-pages.js           ← 各页面渲染与交互：Object.assign(App, {…}) 挂载所有 renderXxx
    └── 80-bootstrap.js       ← 启动入口：App.init()（所有依赖加载完才执行）
```

脚本文件名前缀 `00~80` **即加载顺序**，也方便插入新文件（如 `15-xxx.js`）。

---

## 二、依赖顺序与加载约定

`<body>` 末尾按依赖顺序用经典 `<script src>` 加载（非 ES Module，故 `file://` 直接双击打开即可，
无需起本地服务器）：

```
00-data → 10-chart → 20-report → 30-canvas → 40-db → 50-ui → 60-app → 70-pages → 80-bootstrap
```

- `60-app.js` 用 **`var App`**（挂到全局），页面内联 `onclick="App.go('stats')"` 才能调用到；
  其余文件用 `const`/`function`，跨文件共享同一全局词法环境，加载顺序满足「被依赖者先于依赖者」即可。
- `70-pages.js` 通过 `Object.assign(App, { renderHome(){…}, … })` 把页面方法挂到 `App` 上；
  **不要在 70-pages.js 里调用 `App.init()`**（启动只在 `80-bootstrap.js`）。
- 所有页面方法在运行时通过 `renderMap` 字符串名被 `render()` 分发，因此方法名必须与 `renderMap` 注册一致。

---

## 三、各文件职责（速查）

| 文件 | 负责 | 关键导出 | 同源同步提醒 |
|------|------|----------|--------------|
| `00-data.js` | 常量（BRISTOL / SYMPTOMS / 段位源数据等）、日期与格式化、连续打卡、头像/分组辅助 | `BRISTOL` `WEEK` `pad` `fmtDate` `currentWeekDays` `calcStreak` `avatarHtml` | — |
| `10-chart.js` | 通用 Canvas2D 绘图 | `hexA` `roundRect` `drawTrend` `drawRing` | ⚠️ 与小程序 `utils/chart.js` 同源，改其一需同步另一 |
| `20-report.js` | 肠道周报计算 + 分享卡绘制 | `GRADE_PALETTE` `gradeOf` `buildWeekReport` `drawReportCard` `sectionTitle` | ⚠️ 与小程序 `utils/report.js` 同源，改其一需同步另一 |
| `30-canvas.js` | 浏览器端画布封装 | `drawCanvas2D` `drawTrendCanvas` `renderStatsCharts` | — |
| `40-db.js` | 本地持久化 | `DB` `loadDB` `saveDB` `seedDB` `resetDB` | — |
| `50-ui.js` | 全局提示/弹窗 | `toast` `openModal` `closeModal` | — |
| `60-app.js` | 路由、导航栏/tabbar 渲染、`render()` 分发、全屏分享卡覆盖层、`homeData`、应用状态 | `var App`（核心） | — |
| `70-pages.js` | 全部 `renderXxx` 与对应交互方法 | 挂载到 `App` 的页面方法 | — |
| `80-bootstrap.js` | 启动 | `App.init()` | — |

样式全部在 `preview.css`，按「基础/卡片/周报/记录/统计/历史/引导/弹窗/覆盖层…」分区，新增样式请放进对应分区或新建分区注释。

---

## 四、追加内容规范（重点）

### 1. 新增一个页面（最常见）
例如加一个「设置」页 `renderSettings`：
1. 在 **`70-pages.js`** 末尾（Object.assign 对象内，最后一个方法后加逗号）追加：
   ```js
   renderSettings() {
     return '<div class="card">…</div>';
   },
   openSettingsX() { /* 交互 */ this.render(); },
   ```
2. 在 **`60-app.js`** 的 `renderMap` 注册：`settings: 'renderSettings'`。
3. 若是 tab 页：在 `renderTabbar()` 的 `tabs` 数组加一项，并在 `renderNav()` 补一个 `else if (page === 'settings')` 分支（非首页标题左对齐、子页才居中）。
   若是子页：用 `App.push('settings')` 进入、`App.back()` 返回（导航栏返回按钮自动生成）。
4. 样式按需加到 `preview.css`（保持与现有 class 命名一致，如卡片用 `.card`）。

> 约定：页面渲染方法统一命名 `render<Page>()`，交互方法 `onXxx` / `pickXxx` / `toggleXxx` 等，保持与现有风格一致。

### 2. 新增一个图表 / 通用绘图函数
放到 **`10-chart.js`**（通用）或 **`30-canvas.js`**（依赖 `App` 状态的预览专用）。
若逻辑可复用于小程序，请同步到 `utils/chart.js`（见「同源同步」）。

### 3. 新增数据常量 / 格式化工具
放到 **`00-data.js`**（无依赖，最先加载）。注意 `DB` 在 `40-db.js` 才声明——
这里只能定义「函数体」，不要在加载期直接访问 `DB`（运行时再访问即可）。

### 4. 新增样式
只改 **`preview.css`**，按功能分区追加，不要写进 HTML 行内 `style`（除动态值外）。

### 5. 修改周报引擎 / 图表（⚠️ 同源同步）
`20-report.js` ↔ `utils/report.js`、`10-chart.js` ↔ `utils/chart.js` 必须**保持一致**。
改动任一侧后，手动同步另一侧（小程序端改动需重新部署云函数/开发者工具验证）。

---

## 五、本地验证（无需浏览器）

改动 `.js` 后建议先做语法与等价性检查：

```bash
# 1) 语法检查
node --check docs/preview/60-app.js   # 对每个 js 都跑一遍

# 2) 行为等价性（可选）：把 9 个文件按序拼接成 bundle，用 Node + DOM 桩跑通
#    渲染各页面 HTML、触发 generateShare / back，确认与旧版 preview.html 行为一致。
```

> 本预览版由脚本从 `preview.html` 按注释锚点切片生成，切片保证内容逐字一致；
> 若需重新生成，按 `00~80` 顺序与第三节的边界重新拼接即可。

---

## 六、与小程序端的关系

| 预览版文件 | 小程序端对应 | 说明 |
|------------|--------------|------|
| `docs/preview/20-report.js` | `utils/report.js` | 周报计算 + 分享卡绘制，需同源 |
| `docs/preview/10-chart.js` | `utils/chart.js` | 图表绘制，需同源 |
| 页面结构/交互 | `pages/*` + `app.js` | 预览版是「浏览器复刻」，仅用于验收，不替代真机 |

真机验收仍需在微信开发者工具导入小程序工程、配置云环境并部署云函数。
