const { todayStr } = require('../../utils/format');

Page({
  data: {
    nickname: '我',
    avatarUrl: '',
    streak: 0,
    total: 0,
    todayCount: 0,
    saving: false,
    showAbout: false,
  },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    const db = wx.cloud.database();
    db.collection('users')
      .limit(1)
      .get()
      .then((res) => {
        if (!res.data.length) return;
        const u = res.data[0];
        this.setData({
          nickname: u.nickname || '我',
          avatarUrl: u.avatarUrl || '',
          streak: u.streakDays || 0,
          total: u.totalRecords || 0,
        });
      })
      .catch(() => {});

    // 今日次数
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    db.collection('records')
      .where({ timestamp: db.command.gte(start.getTime()).and(db.command.lte(end.getTime())) })
      .count()
      .then((res) => this.setData({ todayCount: res.total }))
      .catch(() => {});
  },

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl });
  },
  onNickname(e) {
    this.setData({ nickname: e.detail.value });
  },

  save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    const db = wx.cloud.database();
    const coll = db.collection('users');
    const payload = {
      nickname: this.data.nickname,
      avatarUrl: this.data.avatarUrl,
      updatedAt: db.serverDate(),
    };
    coll
      .limit(1)
      .get()
      .then((res) => (res.data.length
        ? coll.doc(res.data[0]._id).update({ data: payload })
        : coll.add({ data: { ...payload, totalRecords: 0, streakDays: 0, createdAt: db.serverDate() } })))
      .then(() => wx.showToast({ title: '已保存', icon: 'success' }))
      .catch(() => wx.showToast({ title: '保存失败', icon: 'none' }))
      .finally(() => this.setData({ saving: false }));
  },

  goGuide() { wx.navigateTo({ url: '/pages/guide/guide' }); },
  goRemind() { wx.navigateTo({ url: '/pages/remind/remind' }); },
  goHistory() { wx.navigateTo({ url: '/pages/history/history' }); },
  openAbout() { this.setData({ showAbout: true }); },
  closeAbout() { this.setData({ showAbout: false }); },
  noop() {},

  clearCache() {
    wx.showModal({
      title: '清除本地缓存',
      content: '将清除本地登录态与临时数据，云端记录不受影响。',
      confirmText: '清除',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  },

  onShareAppMessage() {
    return { title: '我用「嗯嗯日记」记录肠道健康，快来一起打卡', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return { title: '嗯嗯日记 · 用数据读懂你的肠道' };
  },
});
