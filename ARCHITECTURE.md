# 「嗯嗯日记」微信小程序 — 完整架构设计方案

> 版本：v1.0 ｜ 适用阶段：MVP 快速上线 + 社交裂变增长
> 定位：一款**轻松、幽默、可视化**的排便健康记录工具，用游戏化 + 社交化降低健康记录的门槛。

---

## 0. 产品定位与 MVP 边界

### 0.1 一句话定位
「记录每一次嗯嗯，用数据读懂你的肠道。」—— 把"尴尬话题"变成"可分享的健康习惯"。

### 0.2 目标用户
| 人群 | 痛点 | 我们的切入点 |
|---|---|---|
| 关注健康的年轻人（18-35） | 作息乱、便秘焦虑 | 趣味记录 + 可视化周报 |
| 肠胃敏感 / 便秘人群 | 需要长期观察规律 | 趋势统计 + 提醒 |
| 关爱父母健康的子女 | 远程关心老人排便 | 家庭共享 / 周报推送 |
| 健身 / 减脂人群 | 关注身体信号 | 与饮食作息关联记录 |

### 0.3 MVP 范围（2 周可上线）
- ✅ **记录表单**（一键快记 + 详细记录：时间/时长/Bristol 类型/颜色/症状/备注）
- ✅ **历史与统计**（日历热力图 + 周/月趋势图 + 周报）
- ✅ **分享卡片**（生成专属"肠道报告"图片，带小程序码，分享群/朋友圈）
- ✅ **基础个人页**（连续打卡天数、总记录数）

### 0.4 明确"不做"（规避审核与合规风险）
- ❌ 不做医疗诊断 / AI 问诊 / 用药建议（避免"医疗健康"类目资质）
- ❌ 不夸大疗效（文案统一用"记录 / 参考 / 趋势"）
- ❌ 不上线即做社区 UGC 大广场（先小范围，配内容安全审核）

---

## 1. 技术选型建议

### 1.1 后端方案：微信云开发（首推）

| 维度 | 微信云开发 | 自建后端（Node + 云服务器） |
|---|---|---|
| 域名 / HTTPS 证书 | 免（平台已备） | 需备案 + 证书 |
| 用户鉴权 | 天然 `openid` | 需自建登录态 |
| 上线速度 | ⭐⭐⭐⭐⭐ 最快 | ⭐⭐ 慢 |
| 运维成本 | 几乎为零 | 需专人 |
| 弹性 / 成本 | 按量计费，前期极低 | 固定支出 |
| 数据导出 / 自主 | 受限（可导出） | 完全自主 |

**结论**：快速上线 + 社交裂变场景下，**微信云开发（云函数 + 云数据库 + 云存储 + 云调用）** 是最优解。后期用户量大、需复杂分析时，再逐步把统计类服务迁移到自建服务。

### 1.2 前端框架
- **主推：原生小程序**（零编译、DevTools 直接预览、生态最稳、审核兼容性最好）。
- 若团队已有 React/Vue 背景且追求一套代码多端，可选 **Taro / uni-app**，但会增加构建复杂度与包体积，MVP 阶段不推荐。

### 1.3 组件 / 工具链
| 用途 | 选型 | 说明 |
|---|---|---|
| UI 组件库 | **TDesign Mini Program** | 腾讯官方、质量高、降本增效 |
| 图表 | **uCharts（ucharts）** | 体积小、移动端友好；重交互可选 ECharts(ec-canvas) |
| 时间处理 | **dayjs** | 轻量替代 moment |
| 状态管理 | `globalData` + `Behavior` | 简单够用；复杂再用 `mobx-miniprogram` |
| 图片生成 | `canvas 2d` + `wx.canvasToTempFilePath` | 分享卡片本地生成，无需服务端 |
| 小程序码 | 云调用 `getwxacodeunlimit` | 生成带 `scene` 参数的无限量码 |

### 1.4 包体积纪律（审核与体验关键）
- 主包 **< 1.5MB**；社区 / 趣味测试 / 知识库放进**分包**。
- 启用 `lazyCodeLoading: "requiredComponents"`、`"style": "v2"`。
- 图片走 CDN / 云存储，不打包大图。

---

## 2. 项目目录与页面结构

```
poop-diary-miniprogram/
├── app.js                      # App 生命周期、云初始化、登录态
├── app.json                    # 全局配置（页面、tabBar、分包、云）
├── app.wxss                    # 全局样式与主题变量
├── sitemap.json                # 搜索索引配置
├── project.config.json         # 项目/IDE 配置
├── cloudfunctions/             # 云函数（Node）
│   ├── login/                  # 获取 openid / 初始化用户
│   ├── addRecord/              # 新增记录（含校验）
│   ├── getStats/               # 统计聚合
│   ├── setReminder/            # 提醒配置
│   ├── genShareCard/           # 生成分享卡片（云调用小程序码）
│   └── community/              # 社区/排行（MVP 后期）
├── pages/
│   ├── index/                  # 首页（今日状态、快捷记录入口）
│   ├── record/                 # 记录表单（核心）
│   ├── history/                # 历史明细列表
│   ├── stats/                  # 统计与可视化
│   ├── remind/                 # 提醒设置
│   ├── guide/                  # 新手引导 / Bristol 图示
│   ├── profile/                # 我的（打卡、设置）
│   └── community/              # 广场 / 排行（tab）
├── subpackages/
│   ├── community/              # 分包：rank（排行）、post（帖子详情）
│   └── toolbox/                # 分包：test（肠道测试）、knowledge（科普）
├── components/
│   ├── bristol-picker/         # Bristol 7 型选择器（图文）
│   ├── duration-picker/        # 时长滑杆
│   ├── status-tag/             # 症状/状态标签
│   ├── stats-card/             # 统计卡片
│   ├── trend-chart/            # 趋势图封装（uCharts）
│   ├── calendar-heat/          # 日历热力图
│   └── share-card/             # 分享卡片 canvas 组件
├── utils/
│   ├── cloud.js                # 云函数统一调用封装（Promise）
│   ├── auth.js                 # 登录态管理
│   ├── format.js               # 时间/日期格式化
│   └── share.js                # 分享图生成与保存
└── assets/                     # 图标、Bristol 图示（放云存储更省包）
```

**tabBar（5 个）**：首页 / 记录 / 统计 / 广场 / 我的
> 提示：tabBar 的 icon 建议放到云存储或 `assets` 并补充 `iconPath`/`selectedIconPath`。

---

## 3. 核心功能模块设计

### 3.1 记录表单模块（核心转化点）
- **一键快记**：首页大按钮 → 仅记"现在完成了一次"（默认当前时间 + 默认 Bristol 4）。3 秒完成，降低启动阻力。
- **详细记录**：
  - 时间（默认现在，可改）
  - 时长（滑杆 0–30 分钟）
  - **Bristol 类型**（1–7 型，带图文说明，见附录）
  - 颜色（棕/深棕/浅棕/绿/黑/红/其他）
  - 症状多选（费力 / 出血 / 疼痛 / 腹胀 / 未排净 / 紧急）
  - 心情（轻松 / 正常 / 不适）
  - 备注（≤200 字）
- 提交即更新连续打卡 `streak` 与用户统计。

### 3.2 历史与统计模块
- **日历热力图**：每日记录次数 / 时长着色，一眼看习惯。
- **趋势图**：
  - 周/月「排便频率」折线
  - 「平均时长」柱状
  - 「Bristol 类型分布」环形
  - 「症状出现频次」标签云
- **周报 / 月报**：自动生成"本周你共嗯嗯 N 次，最规律的是周三上午"等趣味结论。

### 3.3 提醒功能模块
- 用户设置提醒时间（如 每日 08:00、餐后）。
- 调用 `wx.requestSubscribeMessage` 获取订阅授权。
- 服务端（或定时云函数 / 消息推送）到点触发**服务通知**召回。
- 进阶：根据历史数据**智能推荐**提醒时间（"你通常在 9 点左右，要设个提醒吗？"）。

### 3.4 分享 / 社交拉新模块（增长引擎）
- **专属报告卡片**：周报生成图片（含数据 + 趣味文案 + 小程序码），保存到相册 / 转发。
- **好友 PK / 排行**：连续打卡天数榜、本周"准时率"榜，激发竞争。
- **趣味测试**（分包）："你的肠道年龄""嗯嗯人格"，高分享性引流。
- **群打卡海报**：生成群专属海报，群内接龙。

### 3.5 成就 / 游戏化
- 连续打卡徽章（3/7/30/100 天）、"黄金菊""规律星人"等趣味称号。

---

## 4. 数据模型设计（云数据库集合）

> 权限策略：用户私有集合默认「仅创建者可读写」；社区帖子集合「所有用户可读、仅创建者可写」。

### 4.1 `users`（用户档案）
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid` | string | 微信 openid（自动） |
| `nickname` | string | 昵称 |
| `avatarUrl` | string | 头像（云存储 fileID） |
| `createdAt` | date | 注册时间 |
| `totalRecords` | number | 总记录数 |
| `streakDays` | number | 当前连续打卡天数 |
| `lastRecordAt` | date | 最近记录时间 |
| `settings` | object | 提醒/单位/隐私偏好 |

### 4.2 `records`（排便记录 — 核心表）
| 字段 | 类型 | 校验 / 说明 |
|---|---|---|
| `_openid` | string | 所属用户 |
| `date` | string | `YYYY-MM-DD` |
| `time` | string | `HH:mm` |
| `timestamp` | number | 毫秒时间戳（便于排序/聚合） |
| `durationSec` | number | 时长（秒），0–3600 |
| `bristolType` | number | **1–7**（必填，见附录） |
| `color` | string | 颜色枚举 |
| `amount` | string | 多少（少/中/多） |
| `symptomTags` | array | 症状标签数组 |
| `mood` | string | 心情枚举 |
| `note` | string | 备注 ≤200 |
| `isShared` | boolean | 是否已分享 |
| `createdAt` | date | 服务端时间 |

**索引**：`(_openid, timestamp)` 用于按用户时间范围查询。

### 4.3 `reminders`（提醒）
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid` | string | 用户 |
| `time` | string | `HH:mm` |
| `repeatDays` | array | [0..6] 周几重复 |
| `enabled` | boolean | 是否启用 |
| `label` | string | 备注（如"晨便提醒"） |
| `tmplId` | string | 订阅消息模板 ID |

### 4.4 `community_posts`（社区帖子，后期）
| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid` | string | 作者 |
| `summary` | string | 分享摘要 |
| `cardImg` | string | 卡片图 fileID |
| `likes` | number | 点赞数 |
| `comments` | number | 评论数 |
| `createdAt` | date | 时间 |

### 4.5 `statistics_cache`（可选）
- 预聚合的周/月统计结果，避免每次前端全量扫描（可用定时云函数刷新）。

---

## 5. 云开发方案（后端）

### 5.1 云函数清单
| 云函数 | 职责 | 关键调用 |
|---|---|---|
| `login` | 取 openid，初始化 users | `cloud.getWXContext()` |
| `addRecord` | 新增记录 + 校验 + 更新用户统计 | `db.collection('records').add` |
| `getRecords` | 按时间范围拉历史 | `db.where().orderBy()` |
| `getStats` | 聚合频率/时长/类型分布 | `db.aggregate()` |
| `setReminder` | 写提醒配置 | `db.collection('reminders')` |
| `genShareCard` | 生成报告图 + 小程序码 | 云调用 `getwxacodeunlimit` + 云存储 |
| `community` | 发帖 / 排行 / 点赞 | + `msgSecCheck` 内容安全 |

### 5.2 云调用（免鉴权能力）
- **订阅消息**：`subscribeMessage.send` 发送提醒。
- **内容安全**：`security.msgSecCheck` / `imgSecCheck` 审核 UGC。
- **小程序码**：`getwxacodeunlimit` 生成带 `scene=share_${openid}` 的码，用于归因拉新。

### 5.3 架构示意
```
小程序端 ──wx.cloud.callFunction──▶ 云函数层 ──▶ 云数据库 / 云存储
   │                                        │
   └── canvas 本地生成分享图 ──保存到相册       └── 云调用：订阅消息 / 内容安全 / 小程序码
```

---

## 6. 关键配置与代码示例

> 以下为可直接落地的骨架代码，已随本方案放入项目目录。

### 6.1 `app.json`（全局配置）
```json
{
  "pages": [
    "pages/index/index",
    "pages/record/record",
    "pages/history/history",
    "pages/stats/stats",
    "pages/remind/remind",
    "pages/community/community",
    "pages/profile/profile",
    "pages/guide/guide"
  ],
  "subpackages": [
    { "root": "subpackages/community", "pages": ["rank/rank", "post/post"] },
    { "root": "subpackages/toolbox", "pages": ["test/test", "knowledge/knowledge"] }
  ],
  "window": {
    "navigationBarBackgroundColor": "#5B8C5A",
    "navigationBarTitleText": "嗯嗯日记",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#F5F7F4"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#5B8C5A",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "pages/record/record", "text": "记录" },
      { "pagePath": "pages/stats/stats", "text": "统计" },
      { "pagePath": "pages/community/community", "text": "广场" },
      { "pagePath": "pages/profile/profile", "text": "我的" }
    ]
  },
  "cloud": true,
  "sitemapLocation": "sitemap.json",
  "style": "v2",
  "lazyCodeLoading": "requiredComponents"
}
```

### 6.2 `utils/cloud.js`（云函数统一封装）
```js
// utils/cloud.js
const call = (name, data = {}) => new Promise((resolve, reject) => {
  wx.cloud.callFunction({
    name, data,
    success: (res) => {
      const r = res.result || {};
      (r.code === 0 || r.success) ? resolve(r.data) : reject(r);
    },
    fail: (err) => reject({ code: -1, message: '网络异常', detail: err }),
  });
});
module.exports = { call };
```

### 6.3 `cloudfunctions/addRecord/index.js`（含校验）
```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const BRISTOL = [1,2,3,4,5,6,7];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { date, time, durationSec, bristolType, color, amount, symptomTags = [], mood, note } = event;

  if (!BRISTOL.includes(Number(bristolType))) return { code: 400, message: 'Bristol 类型不合法' };
  if (durationSec !== undefined && (durationSec < 0 || durationSec > 3600)) return { code: 400, message: '时长超出范围' };
  if (note && note.length > 200) return { code: 400, message: '备注过长' };

  const record = {
    _openid: OPENID, date, time,
    timestamp: new Date(`${date} ${time}`).getTime(),
    durationSec: Number(durationSec) || 0,
    bristolType: Number(bristolType),
    color: color || '', amount: amount || '',
    symptomTags, mood: mood || '', note: note || '',
    isShared: false, createdAt: db.serverDate(),
  };
  const res = await db.collection('records').add({ data: record });
  await db.collection('users').where({ _openid: OPENID }).update({
    data: { totalRecords: db.command.inc(1), lastRecordAt: db.serverDate() },
  });
  return { code: 0, data: { id: res._id } };
};
```

### 6.4 记录页（节选）
- `pages/record/record.wxml`：Bristol 图文选择器 + 时长滑杆 + 症状标签 + 提交按钮。
- `pages/record/record.js`：调用 `cloud.call('addRecord', payload)` 提交，成功后 `wx.showToast` 并跳转统计页。
- 详见项目目录内已生成文件。

---

## 7. 用户增长与快速上线策略

### 7.1 增长飞轮（核心闭环）
```
有趣记录体验 → 生成专属报告卡 → 分享群/朋友圈（带小程序码）
     ↑                                            ↓
  订阅消息召回 ←── 好友扫码进入（归因 openid）←── 新用户注册
```
- 每个分享卡片的小程序码 `scene=share_${openid}`，新用户注册时回写「邀请人」，用于**裂变归因与排行**。

### 7.2 快速上线清单
1. **MVP 砍到最小**：记录 + 统计 + 分享图 = 2 周上线（详见第 9 节）。
2. **类目选择**：用「工具」或「生活服务」类目，**不碰医疗**（免资质、过审快）。
3. **隐私合规范式**：上线前填好《小程序隐私保护指引》，首屏加隐私授权弹窗。
4. **灰度发布**：内部 + 种子用户 1 周 → 全量。

### 7.3 冷启动获客
- **社群**：便秘/养生/健身/宝妈垂直群，种子用户打卡。
- **内容种草**：小红书 / 抖音 趣味内容（"用数据记录我的肠道一个月"）。
- **KOC 合作**：健康类博主体验分享。
- **ASO**：小程序名含"记录/健康/打卡"关键词，提升搜索曝光。

### 7.4 留存与召回
- 订阅消息提醒（服务通知）提升次日/7 日留存。
- 连续打卡徽章 + 周报推送，养成习惯。
- 好友 PK 排行制造社交粘性。

### 7.5 目标指标
- 裂变系数 **K > 0.4**；分享率 **> 15%**；次日留存 **> 40%**；7 日留存 **> 25%**。

---

## 8. 合规与审核注意事项

| 事项 | 做法 |
|---|---|
| 类目 | 选「工具」/「生活服务」，避免"医疗健康"所需资质 |
| 文案 | 用"记录/参考/趋势"，禁"诊断/治疗/用药建议" |
| 隐私 | 填写隐私保护指引；用 `wx.requirePrivacyAuthorize` + 隐私协议组件 |
| 头像昵称 | 用 `button open-type="chooseAvatar"` + 昵称 input（`getUserProfile` 已废弃） |
| 内容安全 | 社区 UGC 调 `msgSecCheck` / `imgSecCheck` |
| 免责声明 | "数据仅供参考，不构成医疗建议"常驻关于页 |

---

## 9. 开发里程碑与排期（4 周 MVP → 上线）

| 阶段 | 周次 | 交付 |
|---|---|---|
| P0 基建 | W1 | 云开发初始化、app 配置、记录页 + records 表、login/addRecord |
| P1 核心 | W2 | 统计页（uCharts）、历史列表、个人页、分享图生成 |
| P2 增长 | W3 | 提醒 + 订阅消息、社区排行 MVP、裂变归因 |
| P3 打磨 | W4 | 趣味测试/海报、合规打磨、灰度、提审上线 |

后续迭代：智能提醒时间推荐、家庭共享、知识库、运营活动。

---

## 10. 核心指标（北极星与漏斗）

- **北极星指标**：周记录完成率 = 周记录次数 / 周活跃用户。
- **增长漏斗**：打开 → 记录 → 分享 → 新用户转化。
- **监控**：DAU、记录完成率、7 日留存、分享率、裂变系数 K、崩溃率（DevTools 审计 > 90）。

---

## 附录 A：Bristol 大便分类量表（1–7）
1. 分离的硬块（兔粪状）— 严重便秘
2. 块状香肠状
3. 裂纹香肠状
4. 光滑柔软香肠状 — 理想
5. 软团状
6. 糊状
7. 水样 — 腹泻

## 附录 B：技术栈清单
原生小程序 ｜ 微信云开发（云函数/云数据库/云存储/云调用）｜ TDesign Mini Program ｜ uCharts ｜ dayjs ｜ canvas 2d 分享图 ｜ 分包加载。
