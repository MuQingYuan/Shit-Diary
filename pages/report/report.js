const { call } = require('../../utils/cloud');
const { buildWeekReport, drawReportCard } = require('../../utils/report');

const pad = (n) => (n < 10 ? '0' + n : '' + n);

Page({
  data: {
    state: 'loading', // loading | error | done
    error: '',
    report: null,
    saving: false,
  },

  onLoad() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  // 本周一至周日的 7 个 Date（周一开头）
  currentWeekDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = (today.getDay() + 6) % 7;
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

  load() {
    this.setData({ state: 'loading', error: '' });
    const weekDays = this.currentWeekDays();
    const start = new Date(weekDays[0]); start.setHours(0, 0, 0, 0);
    const end = new Date(weekDays[6]); end.setHours(23, 59, 59, 999);
    const range = { start: start.getTime(), end: end.getTime() };

    // 云是否可用（占位 env / 未初始化时直接降级，避免无限 loading）
    let cloudReady = false;
    try { cloudReady = !!(wx.cloud && wx.cloud.database && wx.cloud.database()); } catch (e) { cloudReady = false; }

    const renderEmpty = () => {
      this.setData({ state: 'done', report: buildWeekReport([], { weekDays, streak: 0 }) }, () => this.drawCard());
    };

    if (!cloudReady) {
      // 没有云能力：立刻渲染空态周报，保证页面有内容
      renderEmpty();
      return Promise.resolve();
    }

    let fetchP;
    try {
      const db = wx.cloud.database();
      const recP = db.collection('records')
        .where({ timestamp: db.command.gte(range.start).and(db.command.lte(range.end)) })
        .orderBy('timestamp', 'desc').limit(500).get()
        .catch(() => ({ data: [] }));
      const homeP = (wx.cloud.callFunction ? call('getHomeData') : Promise.resolve(null)).catch(() => null);
      fetchP = Promise.all([recP, homeP]).then((res) => ({
        records: (res[0] && res[0].data) || [],
        streak: (res[1] && res[1].streak) || 0,
      }));
    } catch (e) {
      // 同步异常（云未就绪等）：降级为空数据
      fetchP = Promise.resolve({ records: [], streak: 0 });
    }

    // 兜底超时：云查询挂起（占位 env 常见问题）时，2.5s 后强制渲染空态周报
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ records: [], streak: 0 }), 2500));

    return Promise.race([fetchP, timeout]).then((res) => {
      const records = (res && res.records) || [];
      const streak = (res && res.streak) || 0;
      const report = buildWeekReport(records, { weekDays, streak });
      this.setData({ state: 'done', report }, () => this.drawCard());
    }).catch(() => {
      // 极端兜底：任何异常都渲染空态，保证页面永远有内容、不白屏
      renderEmpty();
    });
  },

  // 绘制分享卡到 canvas
  drawCard() {
    const report = this.data.report;
    if (!report) return;
    try {
      const q = wx.createSelectorQuery();
      q.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        let dpr = 2;
        try { dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2; } catch (e) { dpr = 2; }
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        drawReportCard(ctx, res[0].width, res[0].height, report);
      });
    } catch (e) {
      // 绘制失败不影响页面内容展示
      console.warn('drawReportCard failed', e);
    }
  },

  // 保存分享卡到相册
  saveCard() {
    if (this.data.saving) return;
    const q = wx.createSelectorQuery();
    q.select('#shareCanvas').fields({ node: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) { wx.showToast({ title: '卡片未就绪', icon: 'none' }); return; }
      this.setData({ saving: true });
      wx.canvasToTempFilePath({
        canvas: res[0].node,
        success: (r) => {
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
            fail: (err) => {
              if (err && /auth|deny/i.test(err.errMsg || '')) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '保存图片需要授权访问相册，请在设置中开启。',
                  confirmText: '去设置', success: (m) => { if (m.confirm) wx.openSetting(); },
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            },
            complete: () => this.setData({ saving: false }),
          });
        },
        fail: () => { wx.showToast({ title: '生成图片失败', icon: 'none' }); this.setData({ saving: false }); },
      });
    });
  },

  goBack() { wx.navigateBack(); },
});
