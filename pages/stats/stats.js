const { pad } = require('../../utils/format');
const { BRISTOL } = require('../../utils/constants');

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    loading: true,
    period: 'week', // week | month
    total: 0,
    avgPerDay: '0',
    avgDur: '—',
    idealPct: '0%',
    bars: [],
    dist: [],
    symptoms: [],
  },

  onLoad() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  switchPeriod(e) {
    const p = e.currentTarget.dataset.p;
    if (p === this.data.period) return;
    this.setData({ period: p });
    this.load();
  },

  load() {
    this.setData({ loading: true });
    const n = this.data.period === 'week' ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - n + 1);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const db = wx.cloud.database();
    db.collection('records')
      .where({ timestamp: db.command.gte(start.getTime()).and(db.command.lte(end.getTime())) })
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get()
      .then((res) => this.compute(res.data, n))
      .catch(() => { this.compute([], n); })
      .finally(() => this.setData({ loading: false }));
  },

  compute(list, n) {
    const total = list.length;
    const durList = list.filter((r) => r.durationSec > 0);
    const avgSec = durList.length ? durList.reduce((s, r) => s + r.durationSec, 0) / durList.length : 0;
    const ideal = list.filter((r) => Number(r.bristolType) === 4).length;

    // 每日次数
    const countByDay = {};
    list.forEach((r) => { countByDay[r.date] = (countByDay[r.date] || 0) + 1; });
    const bars = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const count = countByDay[date] || 0;
      bars.push({
        date,
        day: WEEK_LABELS[d.getDay()],
        count,
        h: Math.max(16, Math.min(180, count * 52)),
        hot: count >= 3,
      });
    }

    // Bristol 分布
    const dist = BRISTOL.map((b) => {
      const c = list.filter((r) => Number(r.bristolType) === b.type).length;
      return { type: b.type, name: b.name, count: c, pct: total ? Math.round((c / total) * 100) : 0 };
    });

    // 症状排行
    const symMap = {};
    list.forEach((r) => (r.symptomTags || []).forEach((t) => { symMap[t] = (symMap[t] || 0) + 1; }));
    const symptoms = Object.keys(symMap)
      .map((k) => ({ name: k, count: symMap[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    this.setData({
      total,
      avgPerDay: (total / n).toFixed(1),
      avgDur: avgSec ? Math.round(avgSec / 6) / 10 + ' 分钟' : '—',
      idealPct: total ? Math.round((ideal / total) * 100) + '%' : '0%',
      bars,
      dist,
      symptoms,
    });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },
});
