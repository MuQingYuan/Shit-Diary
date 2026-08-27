// utils/date.js - 日期范围与周标签（被 stats / report 等页面共享的单一事实来源）
//
// 职责边界：
//   - 仅包含「与业务数据时间范围相关」的纯计算，不依赖 wx、不读写云数据库。
//   - 周几标签、自然周/自然月的时间戳区间都集中在此，避免各页面各写一份导致漂移。
//   - 更通用的「格式化」工具（pad / fmtDate / todayStr / durText 等）见 utils/format.js。
//
// 依赖：无（被任何页面安全 require）。

// 周几标签（0 = 周日）。stats / index / report 共用此数组，勿在页面内重复定义。
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

// 本周一至周日的 7 个 Date（周一开头）
function currentWeekDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offset = (today.getDay() + 6) % 7; // 距本周一的天数
  const monday = new Date(today);
  monday.setDate(today.getDate() - offset);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

// 当前自然周 [周一 00:00:00, 周日 23:59:59] 的毫秒时间戳区间
function currentWeekRange() {
  const days = currentWeekDays();
  const start = new Date(days[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(days[6]);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

// 当前自然月 [1 日 00:00:00, 月末 23:59:59] 的毫秒时间戳区间
function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

module.exports = { WEEK_LABELS, currentWeekDays, currentWeekRange, currentMonthRange };
