const { call } = require('../../utils/cloud');
const fmt = require('../../utils/format');
const { BRISTOL, SYMPTOMS, COLORS } = require('../../utils/constants');

// 时长上限：1 小时 30 分钟
const MAX_DURATION = 5400;
const DURATION_PRESETS = [
  { sec: 120, label: '2 分钟' },
  { sec: 300, label: '5 分钟' },
  { sec: 600, label: '10 分钟' },
  { sec: 900, label: '15 分钟' },
  { sec: 1800, label: '30 分钟' },
  { sec: 3600, label: '1 小时' },
  { sec: 5400, label: '1 小时 30 分钟' },
];

function formatDuration(sec) {
  if (!sec) return '未记录';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0 && m > 0) return h + ' 小时 ' + m + ' 分钟';
  if (h > 0) return h + ' 小时';
  if (m > 0 && s > 0) return m + ' 分 ' + s + ' 秒';
  if (m > 0) return m + ' 分钟';
  return s + ' 秒';
}

Page({
  data: {
    bristolList: BRISTOL.map((b) => ({ type: b.type, desc: b.desc })),
    symptomOptions: SYMPTOMS,
    colorOptions: COLORS,
    amountOptions: ['少', '中', '多'],
    moodOptions: ['轻松', '正常', '不适'],
    durationPresets: DURATION_PRESETS,
    maxDuration: MAX_DURATION,
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
    durLabel: '',
    noteExpanded: false,
    noteLen: 0,
    submitting: false,
  },

  onLoad() {
    const now = new Date();
    const note = this.data.form.note;
    this.setData({
      'form.date': fmt.todayStr(now),
      'form.time': fmt.hm(now),
      durLabel: formatDuration(this.data.form.durationSec),
      noteExpanded: !!note,
      noteLen: note.length,
    });
  },

  onDateChange(e) { this.setData({ 'form.date': e.detail.value }); },
  onTimeChange(e) { this.setData({ 'form.time': e.detail.value }); },
  onPickBristol(e) {
    this.setData({ 'form.bristolType': Number(e.currentTarget.dataset.type) });
  },
  onPickDuration(e) {
    const sec = Number(e.currentTarget.dataset.sec);
    this.setData({ 'form.durationSec': sec, durLabel: formatDuration(sec) });
  },
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
  toggleNote() {
    this.setData({ noteExpanded: !this.data.noteExpanded });
  },
  onNote(e) {
    const v = e.detail.value;
    this.setData({ 'form.note': v, noteLen: v.length });
  },

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
