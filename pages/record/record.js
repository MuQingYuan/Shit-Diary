const { call } = require('../../utils/cloud');

Page({
  data: {
    bristolList: [
      { type: 1, desc: '硬块' }, { type: 2, desc: '块状' },
      { type: 3, desc: '裂纹' }, { type: 4, desc: '理想' },
      { type: 5, desc: '软团' }, { type: 6, desc: '糊状' },
      { type: 7, desc: '水样' },
    ],
    symptomOptions: ['费力', '出血', '疼痛', '腹胀', '未排净', '紧急'],
    form: { bristolType: 4, durationSec: 300, symptomTags: [], note: '' },
  },
  onPickBristol(e) {
    this.setData({ 'form.bristolType': Number(e.currentTarget.dataset.type) });
  },
  onDuration(e) {
    this.setData({ 'form.durationSec': e.detail.value });
  },
  onToggleSymptom(e) {
    const v = e.currentTarget.dataset.v;
    const tags = this.data.form.symptomTags.slice();
    const i = tags.indexOf(v);
    i > -1 ? tags.splice(i, 1) : tags.push(v);
    this.setData({ 'form.symptomTags': tags });
  },
  onNote(e) {
    this.setData({ 'form.note': e.detail.value });
  },
  async onSubmit() {
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    wx.showLoading({ title: '保存中' });
    try {
      await call('addRecord', {
        date, time,
        durationSec: this.data.form.durationSec,
        bristolType: this.data.form.bristolType,
        symptomTags: this.data.form.symptomTags,
        note: this.data.form.note,
      });
      wx.hideLoading();
      wx.showToast({ title: '已记录', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/stats/stats' }), 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
  },
});
