Page({
  data: {
    user: null,
    weekTotal: 0,
    streak: 0,
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
        this.setData({ user: u, streak: u.streakDays || 0 });
      })
      .catch(() => {});

    // 本周次数
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    db.collection('records')
      .where({ timestamp: db.command.gte(start.getTime()) })
      .count()
      .then((res) => this.setData({ weekTotal: res.total }))
      .catch(() => {});
  },

  goStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  goRecord() { wx.switchTab({ url: '/pages/record/record' }); },

  comingSoon() {
    wx.showToast({ title: '好友排行榜即将上线', icon: 'none' });
  },

  onShareAppMessage() {
    return { title: '我用「嗯嗯日记」记录肠道健康，快来一起打卡', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return { title: '嗯嗯日记 · 用数据读懂你的肠道' };
  },
});
