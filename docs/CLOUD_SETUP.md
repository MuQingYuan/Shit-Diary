# 微信云开发环境初始化指南

本指南帮助你把「嗯嗯日记」小程序跑通云开发链路。**整个过程约 10 分钟**。

## 1. 开通云开发

1. 打开**微信开发者工具** → 顶部工具栏 → 点击 **云开发**
2. 选择「开通」
3. 选择套餐：**免费版**（开发期足够使用）
4. 创建环境：填一个环境名（如 `poop-prod`），选择与你就近的区域
5. 创建完成后，**复制环境 ID**（形如 `prod-xxxxxxxxxxxxxxxx`）

## 2. 替换项目中的环境 ID

打开项目根目录下的 `app.js`，把：

```js
env: 'prod-xxxx', // 替换为你自己的云开发环境 ID
```

替换为第 1 步复制的真实环境 ID。

## 3. 创建数据库集合

在云开发控制台 → **数据库** → 逐个创建以下集合：

| 集合名 | 用途 | 建议权限 |
|---|---|---|
| `users` | 用户档案 | 仅创建者可读写 |
| `records` | 排便记录（核心） | 仅创建者可读写 |
| `reminders` | 提醒配置 | 仅创建者可读写 |
| `community_posts` | 社区帖子 | 所有用户可读，仅创建者可写 |

### 3.1 records 集合索引
在 `records` 集合上创建一个**复合索引**以加速按用户时间范围查询：
- 字段 1：`_openid`（升序）
- 字段 2：`timestamp`（降序）

### 3.2 users 集合字段（参考）
```json
{
  "_openid": "string",
  "nickname": "string",
  "avatarUrl": "string",
  "totalRecords": "number",
  "streakDays": "number",
  "lastRecordAt": "date",
  "settings": "object",
  "createdAt": "date"
}
```

### 3.3 records 集合字段（参考）
```json
{
  "_openid": "string",
  "date": "string",          // YYYY-MM-DD
  "time": "string",          // HH:mm
  "timestamp": "number",     // 毫秒时间戳
  "durationSec": "number",
  "bristolType": "number",   // 1-7
  "color": "string",
  "amount": "string",
  "symptomTags": "array",
  "mood": "string",
  "note": "string",
  "isShared": "boolean",
  "createdAt": "date"
}
```

## 4. 部署云函数

依次对以下两个云函数执行**部署**：

1. `cloudfunctions/login`
2. `cloudfunctions/addRecord`

操作步骤：
- 在微信开发者工具的**云开发目录**下找到对应文件夹
- 右键 → **上传并部署：云端安装依赖**
- 等待部署完成（约 30–60 秒，首次较慢）

> 注意：必须选「**云端安装依赖**」，否则云函数找不到 `wx-server-sdk`。

## 5. 测试链路

1. 编译运行小程序
2. 打开「记录」页 → 选择 Bristol 类型 + 提交
3. 在云开发控制台 → **数据库** → `records` 集合 → 看到刚提交的新记录 ✓
4. 在 `users` 集合中，用户的 `totalRecords` 应 +1 ✓

## 6. 申请订阅消息（提醒功能需要）

提醒功能依赖订阅消息模板：

1. 登录**微信公众平台** → 订阅消息 → 公共模板库
2. 搜索关键词：「提醒」/「打卡」/「健康」
3. 选择一个合适的，**申请添加**（秒批）
4. 把得到的**模板 ID** 填入后续 `setReminder` 云函数中

## 7. 启用内容安全（社区功能需要）

社区发帖前需调用 `msgSecCheck`：

1. 云开发控制台 → 设置 → 其他设置 → **内容安全**
2. 启用并保存
3. 在 `cloudfunctions/community`（需自行实现）中对用户输入的文本与图片调用 `security.msgSecCheck` / `imgSecCheck`

## 8. 常见问题

| 错误 | 原因与解决 |
|---|---|
| `wx.cloud is not a function` | 基础库版本过低，需 ≥ 2.2.3（在 project.config.json 检查 `libVersion`） |
| `cloud function not found` | 云函数未上传部署。右键文件夹 → 上传并部署 |
| `database permission denied` | 数据库集合权限不是"仅创建者可读写"。在云开发控制台修改 |
| 云函数返回 `cloud has not been initialized` | `app.js` 里 `env` 配错，确认是字符串且与控制台一致 |

## 9. 免费版配额

- 数据库存储：2GB
- 云函数调用：4 万次/月
- 云函数出网：1GB/月
- CDN：5GB/月

MVP 阶段完全够用。日活过万时再考虑升级付费版或迁移至自建后端。

---

完成以上步骤后，「嗯嗯日记」就能跑通"记录 → 云函数 → 云数据库"的完整链路。
