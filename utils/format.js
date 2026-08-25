// utils/format.js - 通用时间/数值格式化
const pad = (n) => (n < 10 ? '0' + n : '' + n);

const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = (d = new Date()) => fmtDate(d);

const cnDate = (d = new Date()) => {
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 · 周${wd}`;
};

const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const durText = (sec) => {
  if (!sec) return '—';
  if (sec < 60) return sec + '秒';
  const m = Math.floor(sec / 60);
  return sec % 60 ? m + '分' + (sec % 60) + '秒' : m + '分钟';
};

module.exports = { pad, fmtDate, todayStr, cnDate, hm, durText };
