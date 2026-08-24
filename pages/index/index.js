const { call } = require('../../utils/cloud');

Page({
  data: {
    today: '',
    heroTitle: '今天还未记录',
    heroSub: '点一下，记录此刻的顺畅',
    btnText: '立即记录',
    streak: 0,
    total: 0,
    remindOn: true,
    bars: [
      { day: '一', h: 88 }, { day: '二', h: 120 }, { day: '三', h: 168 },
      { day: '四', h: 96 }, { day: '五', h: 200 }, { day: '六', h: 136 },
      { day: '日', h: 176 },
    ],
  },

  onShow() {
    this.initToday();
    this.loadProfile();
  },

  initToday() {
    const now = new Date();
    const wd = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    const today = `${now.getMonth() + 1}月${now.getDate()}日 · 周${wd}`;
    const todayKey = `recorded_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (wx.getStorageSync(todayKey)) {
      this.setData({
        today,
        heroTitle: '今日已记录',
        heroSub: '规律打卡，从每一天开始',
        btnText: '再次记录',
      });
    } else {
      this.setData({
        today,
        heroTitle: '今天还未记录',
        heroSub: '点一下，记录此刻的顺畅',
        btnText: '立即记录',
      });
    }
  },

  async loadProfile() {
    const u = wx.getStorageSync('userProfile');
    if (u) {
      this.setData({ streak: u.streakDays || 0, total: u.totalRecords || 0 });
      return;
    }
    try {
      const data = await call('login');
      if (data) this.setData({ streak: 0, total: 0 });
    } catch (e) {
      // 未配置云环境时静默降级
    }
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },

  goStats() {
    wx.switchTab({ url: '/pages/stats/stats' });
  },

  onRemind(e) {
    this.setData({ remindOn: e.detail.value });
  },
});
