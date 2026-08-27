# 「嗯嗯日记」项目结构规范（STRUCTURE）

> 作用：说明本仓库**实际**的目录组织、各文件职责边界、模块依赖关系，以及「如何新增代码」的规范。
> 设计愿景（含分包、组件库、更多云函数）见 `ARCHITECTURE.md`，本文档只描述已落地的结构。

---

## 1. 设计原则

1. **单一职责**：每个 `utils/*.js` / 云函数只做一件事；不要把多类逻辑堆进同一个文件。
2. **共享逻辑上提**：被 ≥2 个页面用到的纯函数，必须抽到 `utils/` 下对应模块，页面内不得再各写一份（杜绝漂移）。
3. **依赖单向、无环**：`utils` 互相可依赖，但不得反向依赖页面；页面依赖 `utils` + `wx`；`utils` 内部依赖方向见第 3 节 DAG。
4. **预览同源（硬约束）**：`utils/report.js` 与 `utils/chart.js` 的**绘制逻辑**必须与浏览器预览 `docs/preview/20-report.js`、`docs/preview/10-chart.js` 保持一致。改动这两个文件时，必须同步更新预览副本并验证。
5. **可测试、可独立加载**：`utils` 全部使用 CommonJS（`module.exports` / `require`），小程序端无需构建即可 `require`，也便于在 Node 环境做等价性测试。

---

## 2. 顶层目录

```
poop-diary-miniprogram/
├── app.js / app.json / app.wxss      # 小程序入口：生命周期、全局配置、全局样式
├── project.config.json / sitemap.json
├── STRUCTURE.md                      # 本文件（结构规范，唯一事实来源）
├── ARCHITECTURE.md                   # 产品/架构设计愿景（非落地状态，仅供参考）
├── cloudfunctions/                   # 云函数（每个目录 = 一个云函数，Node）
│   ├── login/      ├── addRecord/    └── getHomeData/
├── pages/                           # 页面（每个目录 = 一个页面：.js/.wxml/.wxss/.json）
│   ├── index/ record/ stats/ history/ remind/ guide/ profile/ community/ report/
├── utils/                           # 纯逻辑模块（无页面、无 wx 强依赖，除 cloud 封装）
│   ├── cloud.js  constants.js  format.js  date.js  chart.js  report.js  api.js
└── docs/                            # 文档与验收预览
    ├── preview.html                 # 预览「壳」（薄壳，按依赖顺序加载 docs/preview/*）
    ├── preview/                     # 预览资源（多文件版，详见 docs/preview/README.md）
    └── home-preview.html            # 早期单页首页预览原型（遗留，已不被主流程使用）
```

---

## 3. `utils/` 模块职责与依赖

| 文件 | 职责 | 导出 | 依赖 |
|---|---|---|---|
| `cloud.js` | 云函数统一调用封装（Promise 化） | `call(name, data)` | `wx.cloud` |
| `constants.js` | 业务常量：Bristol 量表、配色、症状/颜色枚举、周几（对象式 `WEEK_DAYS`）、`bristolName()` | `BRISTOL`, `BRISTOL_COLORS`, `SYMPTOMS`, `COLORS`, `WEEK_DAYS`, `bristolName` | 无 |
| `format.js` | 通用时间/数值格式化（纯函数） | `pad`, `fmtDate`, `todayStr`, `cnDate`, `hm`, `durText` | 无 |
| `date.js` | **日期范围与周标签（本次新增的共享模块）**：自然周/自然月时间戳区间、周几标签 | `WEEK_LABELS`, `currentWeekDays`, `currentWeekRange`, `currentMonthRange` | 无 |
| `chart.js` | 零依赖 Canvas2D 图表绘制 | `drawTrend`, `drawRing`, `hexA`, `roundRect` | 无（⚠️ 同源：`docs/preview/10-chart.js`） |
| `report.js` | 肠道周报引擎（聚合 + 卡片绘制） | `buildWeekReport`, `gradeOf`, `scoreComment`, `buildTips`, `drawReportCard`, `durText` | `./chart`, `./constants`（⚠️ 同源：`docs/preview/20-report.js`） |
| `api.js` | 云数据库直连读写封装（用户/提醒/记录） | `getUser`, `getReminder`, `saveReminder`, `saveUser`, `getRecordsBetween`, `dailyCounts` | `./format`, `wx.cloud` |

**依赖 DAG（箭头＝被依赖）**：
```
constants ─┐
format ────┼─▶ date（无依赖）   chart ─▶ report
cloud ─────┘                      format ─▶ api
```
- `constants` / `format` / `date` / `chart` 彼此**不互相依赖**，是叶子模块，最安全。
- `report` 依赖 `chart` + `constants`；`api` 依赖 `format`；`cloud` 独立封装 `wx.cloud`。
- 任何页面都可安全 `require` 上述任意模块。

> 注意：`utils/api.js` 目前**未被任何页面 `require`**（各页面直接调用 `wx.cloud.database()`）。它是一层可用的 DB 访问抽象，后续若要做统一数据访问层可优先复用它，而非新增散落的 `db.collection(...)` 调用。现阶段保留，不删除，避免破坏潜在引用。

---

## 4. `pages/` 约定

- 每个页面 = 一个目录，含 `page.js`（逻辑）/ `page.wxml`（结构）/ `page.wxss`（样式）/ `page.json`（配置），四件套齐全。
- `page.js` 仅放**页面专属**逻辑：生命周期、交互、云调用编排、canvas 绘制。**不得**在页面内重新实现 `utils/` 已有纯函数。
- 页面间共享的纯计算（时间范围、格式化、聚合）一律走 `utils/`。
- 路由：tab 用 `wx.switchTab`，子页用 `wx.navigateTo`，返回用 `wx.navigateBack`。

### 本次重构纠正的「页面内重复」问题
| 重复逻辑 | 原位置 | 现归属 |
|---|---|---|
| `currentWeekDays()`（自然周 7 天） | `stats.js` 与 `report.js` 各一份（完全相同） | `utils/date.js` |
| `currentWeekRange()` / `currentMonthRange()` | `stats.js` | `utils/date.js` |
| `WEEK_LABELS`（周几标签数组） | `stats.js`、`index.js` 各一份 + `constants.WEEK_DAYS` | `utils/date.js`（`WEEK_LABELS`）；`constants.WEEK_DAYS` 保留供 `remind.js` 复用（形态不同：对象数组） |
| `todayStr()` | `stats.js` 本地定义（`format.js` 已有） | 直接用 `utils/format.todayStr` |
| `pad` / `fmtDate` / `durText` | `index.js` 本地定义（`format.js` 已有） | 直接用 `utils/format` 对应导出 |

---

## 5. `cloudfunctions/` 约定

- 每个云函数独立目录，入口 `index.js`，使用 `wx-server-sdk`。
- 当前落地：`login`（取 openid）、`addRecord`（新增记录 + 校验）、`getHomeData`（首页聚合）。
- 云函数内常量（如 `BRISTOL = [1..7]`）仅供服务端校验，与端上 `constants.js` 各自维护，不共享文件。

---

## 6. `docs/` 约定

- `docs/preview.html`：浏览器验收用的**薄壳**，按依赖顺序 `<script src>` 加载 `docs/preview/` 下的文件，双击即可打开（无需起服务器）。
- `docs/preview/`：预览资源（CSS + 9 个按职责拆分的 JS），详见 `docs/preview/README.md`。
- **同源约束**：`docs/preview/20-report.js` ↔ `utils/report.js`、`docs/preview/10-chart.js` ↔ `utils/chart.js` 必须逻辑一致；改其一必须同步另一并验证。
- `docs/home-preview.html`：早期单页首页原型，**遗留文件**，主流程不使用，保留仅供历史参考。

---

## 7. 新增代码规范（落地清单）

### 新增一个 `utils` 模块
1. 在 `utils/` 下新建 `xxx.js`，只做一件事。
2. 用 `module.exports = { ... }` 导出；纯函数优先，避免副作用。
3. 顶部注释写清「职责边界 + 依赖 + 是否被页面/预览共用」。
4. 若绘制逻辑且预览需复现 → 同时新增 `docs/preview/NN-xxx.js` 并登记到 `docs/preview/README.md`（同源）。
5. 不得让 `utils` 反向 `require` 页面文件。

### 新增一个页面
1. `pages/<name>/` 下建四件套。
2. 在 `app.json` 的 `pages` 数组登记路径。
3. 页面内只写页面逻辑；所有纯计算 `require` 自 `utils/`。
4. 如需在主预览中可访问 → 在 `docs/preview/70-pages.js` 增 `renderXxx` + 在 `60-app.js` 的 `renderMap` 注册。

### 新增一个云函数
1. `cloudfunctions/<name>/index.js`，`require('wx-server-sdk')`。
2. 端上调用统一走 `utils/cloud.js` 的 `call('<name>', data)`。

### 通用纪律
- **禁止**把一个文件越写越长——逻辑膨胀时按本规范拆分到 `utils/` 对应模块。
- **禁止**在多个页面复制同一段纯函数；一处改、处处改会漏。
- 提交前：`node --check` 改动文件；若动了 `report.js`/`chart.js`，跑预览等价性校验。
