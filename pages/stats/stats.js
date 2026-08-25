const { pad } = require('../../utils/format');
const { BRISTOL, BRISTOL_COLORS } = require('../../utils/constants');
const { drawTrend, drawRing } = require('../../utils/chart');

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
    const isWeek = this.data.period === 'week';
    const range = isWeek ? this.currentWeekRange() : this.currentMonthRange();

    const db = wx.cloud.database();
    db.collection('records')
      .where({ timestamp: db.command.gte(range.start).and(db.command.lte(range.end)) })
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get()
      .then((res) => this.compute(res.data, isWeek))
      .catch(() => { this.compute([], isWeek); })
      .finally(() => this.setData({ loading: false }));
  },

  // 当前自然周（周一 00:00:00 ~ 周日 23:59:59）
  currentWeekRange() {
    const days = this.currentWeekDays();
    const start = new Date(days[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(days[6]);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  },

  // 当前自然月（1 号 00:00:00 ~ 月末 23:59:59）
  currentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  },

  // 本周一至周日的 7 个 Date（周一开头）
  currentWeekDays() {
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
  },

  compute(list, isWeek) {
    const total = list.length;
    const durList = list.filter((r) => r.durationSec > 0);
    const avgSec = durList.length ? durList.reduce((s, r) => s + r.durationSec, 0) / durList.length : 0;
    const ideal = list.filter((r) => Number(r.bristolType) === 4).length;

    // 每日次数 / 时长
    const countByDay = {};
    const durByDay = {};
    list.forEach((r) => {
      countByDay[r.date] = (countByDay[r.date] || 0) + 1;
      if (r.durationSec > 0) durByDay[r.date] = (durByDay[r.date] || 0) + r.durationSec;
    });

    // 趋势图数据点（每日次数）
    const bars = [];
    if (isWeek) {
      // 本周：周一到周日，按自然周顺序
      this.currentWeekDays().forEach((d) => {
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const count = countByDay[date] || 0;
        bars.push({
          date,
          day: WEEK_LABELS[d.getDay()],
          count,
          h: Math.max(16, Math.min(180, count * 52)),
          hot: count >= 3,
        });
      });
    } else {
      // 本月：当前自然月 1 号 ~ 月末
      const now = new Date();
      const y = now.getFullYear(), mo = now.getMonth();
      const daysInMonth = new Date(y, mo + 1, 0).getDate();
      for (let dnum = 1; dnum <= daysInMonth; dnum++) {
        const d = new Date(y, mo, dnum);
        d.setHours(0, 0, 0, 0);
        const date = `${y}-${pad(mo + 1)}-${pad(dnum)}`;
        const count = countByDay[date] || 0;
        bars.push({
          date,
          day: String(dnum),
          count,
          h: Math.max(16, Math.min(180, count * 52)),
          hot: count >= 3,
        });
      }
    }

    // Bristol 分布（带配色）
    const dist = BRISTOL.map((b) => {
      const c = list.filter((r) => Number(r.bristolType) === b.type).length;
      return {
        type: b.type,
        name: b.name,
        count: c,
        pct: total ? Math.round((c / total) * 100) : 0,
        color: BRISTOL_COLORS[b.type],
      };
    });

    // 症状排行
    const symMap = {};
    list.forEach((r) => (r.symptomTags || []).forEach((t) => { symMap[t] = (symMap[t] || 0) + 1; }));
    const symptoms = Object.keys(symMap)
      .map((k) => ({ name: k, count: symMap[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 折线图点击提示配置：每点文案「周X · N次」或「MM-DD · N次」
    const tipLabels = bars.map((b) => {
      const ctxLabel = isWeek ? `周${b.day}` : b.date.slice(5);
      return `${ctxLabel} · ${b.count}次`;
    });
    this._trendCfg = { labels: bars.map((b) => b.day), values: bars.map((b) => b.count), tipLabels };
    // 默认高亮今天
    const todayIdx = bars.findIndex((b) => b.date === this.todayStr());
    this._tipIndex = todayIdx >= 0 ? todayIdx : 0;
    this._geo = null;

    this.setData({
      total,
      avgPerDay: (total / (isWeek ? 7 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())).toFixed(1),
      avgDur: avgSec ? Math.round(avgSec / 6) / 10 + ' 分钟' : '—',
      idealPct: total ? Math.round((ideal / total) * 100) + '%' : '0%',
      bars,
      dist,
      symptoms,
    }, () => this.drawCharts());
  },

  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  // 点击折线：根据 x 坐标命中最近的数据点并高亮
  onTrendTouch(e) {
    if (!this._geo || !this._geo.points) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const x = t.x; // canvas 2d：touch 坐标相对画布左上角
    let best = 0, bd = 1e9;
    this._geo.points.forEach((p, i) => {
      const dd = Math.abs(p.x - x);
      if (dd < bd) { bd = dd; best = i; }
    });
    if (best !== this._tipIndex) {
      this._tipIndex = best;
      this.drawTrendNow();
    }
  },

  drawCharts() {
    this.drawTrendNow();
    this.drawRingNow();
  },

  drawTrendNow() {
    const cfg = this._trendCfg;
    if (!cfg) return;
    this.drawOnCanvas('trendCanvas', (ctx, w, h) => {
      const geo = drawTrend(ctx, w, h, {
        labels: cfg.labels,
        values: cfg.values,
        color: '#34C759',
        tip: this._tipIndex != null ? { index: this._tipIndex, label: cfg.tipLabels[this._tipIndex] } : null,
      });
      this._geo = geo;
    });
  },

  // Bristol 环形图
  drawRingNow() {
    this.drawOnCanvas('ringCanvas', (ctx, w, h) => {
      const dist = this.data.dist;
      const total = dist.reduce((s, b) => s + b.count, 0);
      const dom = dist.slice().sort((a, b) => b.count - a.count)[0];
      drawRing(ctx, w, h, {
        segments: dist.map((b) => ({ value: b.count, color: b.color })),
        centerTop: String(total),
        centerBottom: '总记录',
        emptyText: '暂无数据',
        centerColor: dom && dom.count ? dom.color : '#1C1C1E',
      });
    });
  },

  // 取 canvas 2d 节点并按 dpr 缩放后回调绘制
  drawOnCanvas(id, fn) {
    const q = wx.createSelectorQuery();
    q.select('#' + id).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      let dpr = 2;
      try { dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2; } catch (e) { dpr = 2; }
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      fn(ctx, res[0].width, res[0].height);
    });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },
});
