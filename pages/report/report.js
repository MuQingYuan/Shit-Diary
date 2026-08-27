const { call } = require('../../utils/cloud');
const { buildWeekReport, drawReportCard } = require('../../utils/report');
const { currentWeekDays } = require('../../utils/date');

Page({
  data: {
    state: 'loading', // loading | error | done
    error: '',
    report: null,
    saving: false,
    shareReady: false,   // 分享卡是否已生成
    generating: false,   // 是否正在生成分享卡
    overlayOpen: false,  // 分享卡是否以全屏覆盖层展示
  },

  onLoad() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    this.setData({ state: 'loading', error: '' });
    const weekDays = currentWeekDays();
    const start = new Date(weekDays[0]); start.setHours(0, 0, 0, 0);
    const end = new Date(weekDays[6]); end.setHours(23, 59, 59, 999);
    const range = { start: start.getTime(), end: end.getTime() };

    // 云是否可用（占位 env / 未初始化时直接降级，避免无限 loading）
    let cloudReady = false;
    try { cloudReady = !!(wx.cloud && wx.cloud.database && wx.cloud.database()); } catch (e) { cloudReady = false; }

    const renderEmpty = () => {
      this.setData({ state: 'done', report: buildWeekReport([], { weekDays, streak: 0 }) });
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
      this.setData({ state: 'done', report });
    }).catch(() => {
      // 极端兜底：任何异常都渲染空态，保证页面永远有内容、不白屏
      renderEmpty();
    });
  },

  // 绘制分享卡到 canvas（done 为绘制完成回调）
  drawCard(done) {
    const report = this.data.report;
    if (!report) { if (done) done(); return; }
    try {
      const q = wx.createSelectorQuery();
      q.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) { if (done) done(); return; }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        let dpr = 2;
        try { dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2; } catch (e) { dpr = 2; }
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        drawReportCard(ctx, res[0].width, res[0].height, report);
        if (done) done();
      });
    } catch (e) {
      // 绘制失败不影响页面内容展示
      console.warn('drawReportCard failed', e);
      if (done) done();
    }
  },

  // 点击「生成周报分享卡」后才绘制分享卡；过程带 loading，完成后以全屏覆盖层展示
  generateShare() {
    if (this.data.generating || this.data.shareReady) return;
    this.setData({ generating: true });
    // 先展示「生成中」状态，稍作停顿再真正绘制，避免一闪而过显得突兀
    setTimeout(() => {
      this.setData({ generating: false, shareReady: true, overlayOpen: true }, () => {
        this.drawCard();
      });
    }, 420);
  },

  // 重新打开已生成的分享卡（全屏覆盖层）
  openOverlay() {
    if (!this.data.shareReady || this.data.overlayOpen) return;
    this.setData({ overlayOpen: true }, () => this.drawCard());
  },

  // 关闭全屏覆盖层（保留已生成状态，可再次查看）
  closeOverlay() { this.setData({ overlayOpen: false }); },

  // 阻止点击卡片区域时冒泡关闭覆盖层
  stopMask() {},

  // 离开周报页：不保留分享卡状态，下次进入需重新生成
  onUnload() {
    this.setData({ shareReady: false, generating: false, overlayOpen: false });
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
