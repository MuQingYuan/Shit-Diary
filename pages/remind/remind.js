const WEEK_DAYS = [
  { key: 1, label: '一' }, { key: 2, label: '二' }, { key: 3, label: '三' },
  { key: 4, label: '四' }, { key: 5, label: '五' }, { key: 6, label: '六' }, { key: 0, label: '日' },
];

// TODO: 在微信公众平台申请订阅消息模板后替换
const TMPL_IDS = [];

Page({
  data: {
    enabled: false,
    time: '08:00',
    days: WEEK_DAYS.map((d) => ({ key: d.key, label: d.label, on: true })),
    saving: false,
  },

  onLoad() { this.load(); },

  load() {
    const db = wx.cloud.database();
    db.collection('reminders')
      .limit(1)
      .get()
      .then((res) => {
        if (!res.data.length) return;
        const r = res.data[0];
        const set = r.repeatDays || [];
        this.setData({
          enabled: !!r.enabled,
          time: r.time || '08:00',
          days: this.data.days.map((d) => ({ ...d, on: set.includes(d.key) })),
        });
      })
      .catch(() => {});
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },

  toggleDay(e) {
    const key = Number(e.currentTarget.dataset.key);
    this.setData({
      days: this.data.days.map((d) => (d.key === key ? { ...d, on: !d.on } : d)),
    });
  },

  onEnabledChange(e) {
    this.setData({ enabled: e.detail.value });
  },

  onSubscribe() {
    if (!TMPL_IDS.length) {
      wx.showToast({ title: '请先配置模板 ID', icon: 'none' });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: TMPL_IDS,
      success: (res) => {
        const accepted = TMPL_IDS.some((id) => res[id] === 'accept');
        wx.showToast({ title: accepted ? '订阅成功' : '未授权订阅', icon: 'none' });
      },
      fail: () => wx.showToast({ title: '订阅失败', icon: 'none' }),
    });
  },

  save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    const repeatDays = this.data.days.filter((d) => d.on).map((d) => d.key);
    const db = wx.cloud.database();
    const coll = db.collection('reminders');
    const payload = {
      enabled: this.data.enabled,
      time: this.data.time,
      repeatDays,
      updatedAt: db.serverDate(),
    };
    coll
      .limit(1)
      .get()
      .then((res) => (res.data.length
        ? coll.doc(res.data[0]._id).update({ data: payload })
        : coll.add({ data: { ...payload, createdAt: db.serverDate() } })))
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      })
      .catch(() => wx.showToast({ title: '保存失败', icon: 'none' }))
      .finally(() => this.setData({ saving: false }));
  },
});
