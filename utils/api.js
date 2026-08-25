// utils/api.js - 云数据库统一读写封装（客户端直连）
const fmt = require('./format');

const db = () => wx.cloud.database();
const _ = () => db().command;

// 当前用户档案（仅创建者可读写时返回自己的数据）
async function getUser() {
  const res = await db().collection('users').limit(1).get();
  return res.data[0] || null;
}

// 我的提醒配置
async function getReminder() {
  try {
    const res = await db().collection('reminders').limit(1).get();
    return res.data[0] || null;
  } catch (e) {
    return null;
  }
}

// 保存/更新提醒配置
async function saveReminder({ time, repeatDays, enabled }) {
  const coll = db().collection('reminders');
  const res = await coll.limit(1).get();
  const data = { time, repeatDays, enabled, updatedAt: db().serverDate() };
  if (res.data[0]) {
    return coll.doc(res.data[0]._id).update({ data });
  }
  return coll.add({ data: { ...data, createdAt: db().serverDate() } });
}

// 更新当前用户档案
async function saveUser(profile) {
  const coll = db().collection('users');
  const res = await coll.limit(1).get();
  const data = {
    nickname: profile.nickname || '我',
    avatarUrl: profile.avatarUrl || '',
    updatedAt: db().serverDate(),
  };
  if (res.data[0]) {
    return coll.doc(res.data[0]._id).update({ data });
  }
  return coll.add({ data: { ...data, totalRecords: 0, streakDays: 0, createdAt: db().serverDate() } });
}

// 查询日期区间内的记录（按时间倒序）
async function getRecordsBetween(startDate, endDate, limit = 200) {
  const startTs = new Date(startDate + ' 00:00:00').getTime();
  const endTs = new Date(endDate + ' 23:59:59').getTime();
  const res = await db().collection('records')
    .where({ timestamp: _.gte(startTs).and(_.lte(endTs)) })
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return res.data;
}

// 最近 n 天每日次数（含 0 值），返回 [{ date, day, count, h, hot }]
function dailyCounts(records, n, now = new Date()) {
  const days = fmt.lastNDays(n, now);
  const map = {};
  records.forEach((r) => { map[r.date] = (map[r.date] || 0) + 1; });
  return days.map((d) => {
    const count = map[d.date] || 0;
    return {
      ...d,
      count,
      h: Math.max(14, Math.min(200, count * 50)),
      hot: count >= 3,
    };
  });
}

module.exports = { getUser, getReminder, saveReminder, saveUser, getRecordsBetween, dailyCounts };
