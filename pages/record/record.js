const { call } = require('../../utils/cloud');
const fmt = require('../../utils/format');
const { BRISTOL, SYMPTOMS, COLORS } = require('../../utils/constants');

Page({
  data: {
    bristolList: BRISTOL.map((b) => ({ type: b.type, desc: b.desc })),
    symptomOptions: SYMPTOMS,
    colorOptions: COLORS,
    amountOptions: ['少', '中', '多'],
    moodOptions: ['轻松', '正常', '不适'],
    form: {
      date: '',
      time: '',
      bristolType: 4,
      durationSec: 300,
      color: '',
      amount: '中',
      symptomTags: [],
      mood: '正常',
      note: '',
    },
    submitting: false,
  },

  onLoad() {
    const now = new Date();
    this.setData({
      'form.date': fmt.todayStr(now),
      'form.time': fmt.hm(now),
    });
  },

  onDateChange(e) { this.setData({ 'form.date': e.detail.value }); },
  onTimeChange(e) { this.setData({ 'form.time': e.detail.value }); },
  onPickBristol(e) {
    this.setData({ 'form.bristolType': Number(e.currentTarget.dataset.type) });
  },
  onDuration(e) { this.setData({ 'form.durationSec': e.detail.value }); },
  onPickColor(e) {
    this.setData({ 'form.color': e.currentTarget.dataset.v });
  },
  onPickAmount(e) {
    this.setData({ 'form.amount': e.currentTarget.dataset.v });
  },
  onPickMood(e) {
    this.setData({ 'form.mood': e.currentTarget.dataset.v });
  },
  onToggleSymptom(e) {
    const v = e.currentTarget.dataset.v;
    const tags = this.data.form.symptomTags.slice();
    const i = tags.indexOf(v);
    i > -1 ? tags.splice(i, 1) : tags.push(v);
    this.setData({ 'form.symptomTags': tags });
  },
  onNote(e) { this.setData({ 'form.note': e.detail.value }); },

  async onSubmit() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中', mask: true });
    const f = this.data.form;
    try {
      await call('addRecord', {
        date: f.date,
        time: f.time,
        durationSec: f.durationSec,
        bristolType: f.bristolType,
        color: f.color,
        amount: f.amount,
        symptomTags: f.symptomTags,
        mood: f.mood,
        note: f.note,
      });
      wx.hideLoading();
      wx.setStorageSync('recorded_' + f.date, true);
      wx.showToast({ title: '已记录', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
    this.setData({ submitting: false });
  },
});
