const { pad, durText } = require('../../utils/format');
const { BRISTOL } = require('../../utils/constants');

Page({
  data: {
    loading: true,
    list: [],          // 分组后的 [{ date, label, items: [] }]
    months: [],        // 可选月份 ['2026-08', ...]
    monthIndex: 0,     // 0 = 全部
    detail: null,      // 详情弹窗数据
  },

  onLoad() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    db.collection('records')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get()
      .then((res) => this.build(res.data))
      .catch(() => {
        this.setData({ loading: false, list: [] });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  build(records) {
    const months = ['全部'];
    const map = {};
    records.forEach((r) => {
      const m = (r.date || '').slice(0, 7);
      if (m && months.indexOf(m) === -1) months.push(m);
      const key = r.date || '未知日期';
      (map[key] = map[key] || []).push(r);
    });
    const keys = Object.keys(map).sort().reverse();
    const list = keys.map((date) => ({
      date,
      label: this.fmtLabel(date),
      items: map[date].map((r) => ({
        ...r,
        durText: durText(r.durationSec),
      })),
    }));

    this._allList = list;
    this.setData({
      months,
      monthIndex: 0,
      list: this.applyFilter(list, 0, months),
      loading: false,
    });
  },

  fmtLabel(date) {
    const d = new Date(date + 'T00:00:00');
    const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日 周${wd}`;
  },

  applyFilter(list, idx, months) {
    if (!idx || !months[idx]) return list;
    const m = months[idx];
    return list.filter((g) => (g.date || '').slice(0, 7) === m);
  },

  onMonthChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ monthIndex: idx });
    this.setData({ list: this.applyFilter(this._allList, idx, this.data.months) });
  },

  openDetail(e) {
    const { gi, ii } = e.currentTarget.dataset;
    const group = this.data.list[gi];
    if (!group) return;
    const item = group.items[ii];
    const bristol = BRISTOL.find((b) => b.type === Number(item.bristolType));
    this.setData({
      detail: {
        time: `${item.date} ${item.time || ''}`,
        bristol: bristol ? bristol.name : '未知',
        dur: durText(item.durationSec),
        symptoms: (item.symptomTags || []).join('、') || '无',
        note: item.note || '无',
        id: item._id,
      },
    });
  },

  closeDetail() { this.setData({ detail: null }); },
  noop() {},

  onDelete() {
    const { detail } = this.data;
    if (!detail) return;
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条记录吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#E24B4A',
      success: (res) => {
        if (!res.confirm) return;
        wx.cloud.database().collection('records').doc(detail.id).remove()
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.setData({ detail: null });
            this.load();
          })
          .catch(() => wx.showToast({ title: '删除失败', icon: 'none' }));
      },
    });
  },
});
