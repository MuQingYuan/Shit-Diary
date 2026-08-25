const { pad } = require('../../utils/format');
const { BRISTOL, BRISTOL_COLORS } = require('../../utils/constants');
const { drawTrend, drawRing } = require('../../utils/chart');

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']; // 月历表头（周一对齐）

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
    monthCells: [],      // 本月月历网格（含首周占位）
    selectedDate: '',    // 当前选中日期 YYYY-MM-DD
    selectedDay: null,   // 选中日详情 {date, dayNum, dow, count, avgDurText}
    weekHead: WEEK_HEAD, // 月历表头 周一~周日
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

    // 趋势图数据点（每日次数）+ 本月月历网格
    const bars = [];
    let monthCells = [];
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
      // 月历网格：周一对齐，首周补空白；绿色深浅表示次数
      const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
      for (let i = 0; i < firstDow; i++) monthCells.push({ blank: true });
      const todayS = this.todayStr();
      for (let dnum = 1; dnum <= daysInMonth; dnum++) {
        const date = `${y}-${pad(mo + 1)}-${pad(dnum)}`;
        const count = countByDay[date] || 0;
        const intensity = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
        monthCells.push({ blank: false, date, dayNum: dnum, count, intensity, isToday: date === todayS });
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

    // 选中日详情（本月默认选中今天）
    const selectedDate = isWeek ? '' : this.todayStr();
    const selectedDay = isWeek ? null : this.buildSelectedDay(selectedDate, countByDay, durByDay);
    this._month = { countByDay, durByDay };

    this.setData({
      total,
      avgPerDay: (total / (isWeek ? 7 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())).toFixed(1),
      avgDur: avgSec ? Math.round(avgSec / 6) / 10 + ' 分钟' : '—',
      idealPct: total ? Math.round((ideal / total) * 100) + '%' : '0%',
      bars,
      dist,
      symptoms,
      monthCells,
      selectedDate,
      selectedDay,
    }, () => this.drawCharts());
  },

  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  // 构造选中日详情（次数 + 当日平均时长）
  buildSelectedDay(date, countByDay, durByDay) {
    if (!date) return null;
    const count = countByDay[date] || 0;
    const dur = durByDay[date] || 0;
    const d = new Date(date + 'T00:00:00');
    const avgSec = count ? dur / count : 0;
    const avgDurText = avgSec ? Math.round(avgSec / 6) / 10 + ' 分钟' : '—';
    return { date, dayNum: Number(date.slice(8, 10)), dow: WEEK_LABELS[d.getDay()], count, avgDurText };
  },

  // 点击月历格子选中某一天
  selectDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return; // 首周占位空白格
    const m = this._month || { countByDay: {}, durByDay: {} };
    this.setData({ selectedDate: date, selectedDay: this.buildSelectedDay(date, m.countByDay, m.durByDay) });
  },

  drawCharts() {
    // 趋势折线图
    this.drawOnCanvas('trendCanvas', (ctx, w, h) => {
      const bars = this.data.bars;
      drawTrend(ctx, w, h, {
        labels: bars.map((b) => b.day),
        values: bars.map((b) => b.count),
        color: '#34C759',
      });
    });

    // Bristol 环形图
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
