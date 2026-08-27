const { call } = require('../../utils/cloud');
const { buildWeekReport, drawReportCard } = require('../../utils/report');

const pad = (n) => (n < 10 ? '0' + n : '' + n);

Page({
  data: {
    loading: true,
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
    this.setData({ loading: true, error: '' });
    const weekDays = this.currentWeekDays();
    const start = new Date(weekDays[0]); start.setHours(0, 0, 0, 0);
    const end = new Date(weekDays[6]); end.setHours(23, 59, 59, 999);
    const range = { start: start.getTime(), end: end.getTime() };

    const db = wx.cloud.database();
    const recP = db.collection('records')
      .where({ timestamp: db.command.gte(range.start).and(db.command.lte(range.end)) })
      .orderBy('timestamp', 'desc').limit(500).get()
      .catch(() => ({ data: [] }));
    const homeP = call('getHomeData').catch(() => null);

    return Promise.all([recP, homeP]).then((res) => {
      const records = res[0].data || [];
      const streak = (res[1] && res[1].data && res[1].data.streak) || 0;
      const report = buildWeekReport(records, { weekDays, streak });
      this.setData({ loading: false, report }, () => this.drawCard());
    }).catch(() => {
      this.setData({ loading: false, error: '周报生成失败，请确认云环境已配置后下拉重试' });
    });
  },

  // 绘制分享卡到 canvas
  drawCard() {
    const report = this.data.report;
    if (!report) return;
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
