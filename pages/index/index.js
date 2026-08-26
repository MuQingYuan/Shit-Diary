const { call } = require('../../utils/cloud');

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const pad = (n) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

Page({
  data: {
    loading: true,
    error: '',
    today: '',
    nickname: '我',
    avatarUrl: '',
    recordedToday: false,
    todayCount: 0,
    streak: 0,
    total: 0,
    weekTotal: 0,
    avgPerDay: '0',
    bars: [],
    remindOn: true,
    remindTime: '08:00',
    submitting: false,
    // 半屏快捷面板
    showQuick: false,
    bristolTypes: [1, 2, 3, 4, 5, 6, 7],
    quickForm: { bristolType: 4, durationSec: 300, color: '棕', symptomTags: ['无'] },
    quickDurText: '5 分钟',
    quickDurMin: '5',
  },

  onLoad() {
    this.setData({ today: fmtDate(new Date()) });
    this._loaded = false;
  },
  onShow() {
    // 首次进入显示骨架屏，之后切回 tab 静默刷新
    this.loadHome(!this._loaded);
  },
  onPullDownRefresh() {
    this.loadHome(false).finally(() => wx.stopPullDownRefresh());
  },

  // 拉取首页聚合数据
  loadHome(showLoading) {
    if (showLoading) this.setData({ loading: true, error: '' });
    return call('getHomeData')
      .then((data) => {
        const bars = (data.weekTrend || []).map((it) => {
          const day = WEEK_LABELS[new Date(it.date + 'T00:00:00').getDay()];
          return { date: it.date, day, count: it.count, h: Math.max(20, it.count * 44), hot: it.count >= 3 };
        });
        this.setData({
          loading: false,
          nickname: (data.user && data.user.nickname) || '我',
          avatarUrl: (data.user && data.user.avatarUrl) || '',
          recordedToday: data.todayCount > 0,
          todayCount: data.todayCount || 0,
          streak: data.streak || 0,
          total: data.total || 0,
          weekTotal: data.weekTotal || 0,
          avgPerDay: ((data.weekTotal || 0) / 7).toFixed(1),
          bars,
          remindOn: data.remindOn !== false,
          remindTime: data.remindTime || '08:00',
        });
        wx.setStorageSync('userProfile', { totalRecords: data.total || 0, streakDays: data.streak || 0 });
        this._loaded = true;
        return data;
      })
      .catch(() => {
        this.setData({ loading: false, error: '数据加载失败，请确认云环境已配置后下拉重试' });
        return null;
      });
  },

  // ===== 半屏快捷记录面板 =====
  durText(sec) {
    if (sec < 60) return sec + '秒';
    return Math.round(sec / 60) + '分钟';
  },

  openQuick() {
    const f = this.data.quickForm;
    this.setData({
      showQuick: true,
      quickDurText: this.durText(f.durationSec),
      quickDurMin: String(Math.round(f.durationSec / 60)),
    });
  },

  closeQuick() {
    if (this.data.submitting) return;
    this.setData({ showQuick: false });
  },
  noop() {},

  quickPickBristol(e) {
    const type = Number(e.currentTarget.dataset.type);
    if (type === this.data.quickForm.bristolType) return;
    this.setData({ 'quickForm.bristolType': type });
  },

  quickSetDurInput(e) {
    let min = parseInt(e.detail.value, 10);
    if (isNaN(min)) min = 0;
    min = Math.max(0, Math.min(90, min)); // 0~90 分钟（最长 1 小时 30 分钟）
    this.setData({ 'quickForm.durationSec': min * 60, quickDurText: this.durText(min * 60), quickDurMin: String(min) });
  },

  quickPreset(e) {
    const sec = Number(e.currentTarget.dataset.sec);
    this.setData({ 'quickForm.durationSec': sec, quickDurText: this.durText(sec), quickDurMin: String(Math.round(sec / 60)) });
  },

  // 面板确认 → 提交云函数
  confirmQuick() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '记录中', mask: true });
    const now = new Date();
    const date = fmtDate(now);
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    call('addRecord', {
      date,
      time,
      durationSec: this.data.quickForm.durationSec,
      bristolType: this.data.quickForm.bristolType,
      color: this.data.quickForm.color,
      symptomTags: this.data.quickForm.symptomTags,
      note: '',
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已记录', icon: 'success' });
        if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
        wx.setStorageSync('recorded_' + date, true);
        // 提交后复原快捷面板默认值：Bristol=4 / 5 分钟 / 颜色=棕 / 症状=无
        this.setData({
          showQuick: false,
          quickForm: { bristolType: 4, durationSec: 300, color: '棕', symptomTags: ['无'] },
          quickDurText: '5 分钟',
          quickDurMin: '5',
        });
        return this.loadHome(false);
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '记录失败', icon: 'none' });
      })
      .finally(() => this.setData({ submitting: false }));
  },

  // 提醒开关：保存到 reminders 集合
  onRemindChange(e) {
    const val = e.detail.value;
    this.setData({ remindOn: val });
    const db = wx.cloud.database();
    const coll = db.collection('reminders');
    coll
      .limit(1)
      .get()
      .then((res) => {
        const data = { enabled: val, updatedAt: db.serverDate() };
        if (res.data.length) return coll.doc(res.data[0]._id).update({ data });
        return coll.add({
          data: { ...data, time: '08:00', repeatDays: [1, 2, 3, 4, 5, 6, 7], createdAt: db.serverDate() },
        });
      })
      .then(() => wx.showToast({ title: val ? '提醒已开启' : '提醒已关闭', icon: 'none' }))
      .catch(() => {
        this.setData({ remindOn: !val });
        wx.showToast({ title: '设置保存失败', icon: 'none' });
      });
  },

  goRecord() { wx.switchTab({ url: '/pages/record/record' }); },
  goStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  goRemind() { wx.navigateTo({ url: '/pages/remind/remind' }); },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },

  onShareAppMessage() {
    return { title: '我用「嗯嗯日记」记录肠道健康，快来一起打卡', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return { title: '嗯嗯日记 · 用数据读懂你的肠道' };
  },
});
