/* =====================================================================
 * 00-data.js — 数据层（localStorage 模拟云数据库）
 * 常量（BRISTOL / SYMPTOMS / 段位源数据）、日期与格式化工具、连续打卡计算、头像/分组辅助。依赖：无（最先加载）。
 * ===================================================================== */

const LS_KEY = 'shit-diary-data';
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const BRISTOL = [
  { type: 1, name: '1型 · 硬块', desc: '分离硬块，通常意味着便秘' },
  { type: 2, name: '2型 · 块状', desc: '块状香肠，偏硬' },
  { type: 3, name: '3型 · 裂纹', desc: '香肠状有裂纹，正常' },
  { type: 4, name: '4型 · 理想', desc: '光滑柔软，最理想状态' },
  { type: 5, name: '5型 · 软团', desc: '软团状，偏软' },
  { type: 6, name: '6型 · 糊状', desc: '糊状，接近腹泻' },
  { type: 7, name: '7型 · 水样', desc: '完全水样，腹泻' }
];
const SYMPTOMS = ['无', '费力', '出血', '疼痛', '腹胀', '未排净', '紧急'];
const AMOUNTS = ['少', '中', '多'];
const MOODS = ['轻松', '正常', '不适'];
const COLORS = ['棕', '深棕', '浅棕', '绿', '黑', '红', '其他'];
const BRISTOL_COLORS = {
  1: '#C0563B', 2: '#E08A3C', 3: '#9CCC65', 4: '#34C759', 5: '#26A69A', 6: '#42A5F5', 7: '#AB47BC'
};

const pad = (n) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmtHM = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
const todayStr = () => fmtDate(new Date());
// 本周一至周日的 7 个 'YYYY-MM-DD' 字符串（周一开头）
const currentWeekDays = () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offset = (today.getDay() + 6) % 7; // 距本周一的天数
  const monday = new Date(today); monday.setDate(today.getDate() - offset);
  const arr = [];
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); arr.push(fmtDate(d)); }
  return arr;
};
const cnToday = () => { const d = new Date(); return (d.getMonth() + 1) + '月' + d.getDate() + '日 · 周' + WEEK[d.getDay()]; };
const durText = (sec) => { if (!sec) return '—'; if (sec < 60) return sec + '秒'; const m = Math.floor(sec / 60); return sec % 60 ? m + '分' + (sec % 60) + '秒' : m + '分钟'; };
const formatDuration = (sec) => {
  if (!sec) return '未记录';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0 && m > 0) return h + ' 小时 ' + m + ' 分钟';
  if (h > 0) return h + ' 小时';
  if (m > 0 && s > 0) return m + ' 分 ' + s + ' 秒';
  if (m > 0) return m + ' 分钟';
  return s + ' 秒';
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DURATION_PRESETS = [
  { sec: 120, label: '2 分钟' }, { sec: 300, label: '5 分钟' }, { sec: 600, label: '10 分钟' },
  { sec: 900, label: '15 分钟' }, { sec: 1800, label: '30 分钟' }, { sec: 3600, label: '1 小时' },
  { sec: 5400, label: '1 小时 30 分钟' },
];



/* ===== 数据 / 辅助函数（被各页面调用，需先于 app 加载） ===== */
function calcStreak() {
  const set = new Set(DB.records.map((r) => r.date));
  let cur = new Date(); cur.setHours(0, 0, 0, 0);
  if (!set.has(fmtDate(cur))) cur = new Date(cur.getTime() - 86400000);
  let n = 0;
  while (set.has(fmtDate(cur))) { n++; cur = new Date(cur.getTime() - 86400000); }
  return n;
}
function fmtGroup(date) {
  const d = new Date(date + 'T00:00:00');
  return Number(date.slice(5, 7)) + '月' + Number(date.slice(8, 10)) + '日 周' + WEEK[d.getDay()];
}
function avatarHtml() {
  const u = DB.users;
  return u.avatarUrl ? '<img src="' + u.avatarUrl + '">' : u.nickname[0];
}

