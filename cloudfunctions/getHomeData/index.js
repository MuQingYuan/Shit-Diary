const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const pad = (n) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 首页数据聚合：用户档案 + 今日记录 + 近7天趋势 + 连续打卡 + 提醒配置
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const now = new Date();

  // 近 7 天日期序列（含今天）
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(fmtDate(d));
  }
  const today = days[6];
  const startTs = new Date(days[0] + ' 00:00:00').getTime();
  const endTs = new Date(today + ' 23:59:59').getTime();

  // 用户档案（容错）
  let user = null;
  try {
    const u = await db.collection('users').where({ _openid: OPENID }).limit(1).get();
    user = u.data[0] || null;
  } catch (e) { user = null; }

  // 近 7 天记录
  let records = [];
  try {
    const r = await db.collection('records')
      .where({ _openid: OPENID, timestamp: _.gte(startTs).and(_.lte(endTs)) })
      .limit(1000)
      .get();
    records = r.data;
  } catch (e) { records = []; }

  // 每日次数
  const countByDay = {};
  records.forEach((r) => { countByDay[r.date] = (countByDay[r.date] || 0) + 1; });
  const weekTrend = days.map((d) => ({ date: d, count: countByDay[d] || 0 }));
  const todayCount = countByDay[today] || 0;
  const weekTotal = records.length;

  // 连续打卡：从今天（或昨天）往前连续有记录的天数
  const dateSet = new Set(records.map((r) => r.date));
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dateSet.has(fmtDate(cursor))) cursor = new Date(cursor.getTime() - 86400000);
  let streak = 0;
  while (dateSet.has(fmtDate(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  // 提醒配置（容错）
  let reminder = null;
  try {
    const rm = await db.collection('reminders').where({ _openid: OPENID }).limit(1).get();
    reminder = rm.data[0] || null;
  } catch (e) { reminder = null; }

  const total = user && user.totalRecords ? user.totalRecords : weekTotal;

  // 顺带回写连续打卡（best-effort）
  if (user && user._id && user.streakDays !== streak) {
    try {
      await db.collection('users').doc(user._id).update({ data: { streakDays: streak } });
    } catch (e) { /* ignore */ }
  }

  return {
    code: 0,
    data: {
      user: {
        nickname: (user && user.nickname) || '我',
        avatarUrl: (user && user.avatarUrl) || '',
        streakDays: streak,
        totalRecords: total,
      },
      todayCount,
      weekTotal,
      weekTrend,
      streak,
      total,
      remindOn: reminder ? !!reminder.enabled : true,
      remindTime: (reminder && reminder.time) || '08:00',
    },
  };
};
