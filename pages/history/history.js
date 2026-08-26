const { pad, durText } = require('../../utils/format');
const { BRISTOL, BRISTOL_COLORS } = require('../../utils/constants');

Page({
  data: {
    loading: true,
    list: [],          // 按月分组后的 [{ key, year, mLabel, label, items: [] }]
    years: ['全部'],   // ['全部', '2026', '2025', ...]（倒序）
    yearIndex: 0,      // 0 = 全部
    total: 0,          // 当前筛选下的总条数
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
    // 按月份分组：key = 'YYYY-MM'
    const monthMap = {};
    const yearSet = {};
    records.forEach((r) => {
      const m = (r.date || '').slice(0, 7);
      if (!m) return;
      yearSet[m.slice(0, 4)] = true;
      (monthMap[m] = monthMap[m] || []).push(r);
    });

    // 月份列表（倒序）
    const months = Object.keys(monthMap).sort().reverse();
    const allList = months.map((m) => {
      const [y, mo] = m.split('-');
      return {
        key: m,
        year: y,
        mLabel: Number(mo) + '月',
        label: y + '年' + Number(mo) + '月',
        collapsed: false,
        items: monthMap[m].map((r) => ({ ...r, durText: durText(r.durationSec) })),
      };
    });

    // 年份列表（倒序）
    const years = ['全部'].concat(Object.keys(yearSet).sort().reverse());

    this._allList = allList;
    this.setData({
      years,
      yearIndex: 0,
      total: records.length,
      list: this.applyYear(allList, 0, years),
      loading: false,
    });
  },

  // 0 = 全部；否则按年份过滤，单年模式下标题只显示「月」
  applyYear(list, idx, years) {
    if (!idx) return list;
    const y = years[idx];
    return list
      .filter((g) => g.year === y)
      .map((g) => ({ ...g, label: g.mLabel }));
  },

  onYearChange(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({
      yearIndex: idx,
      list: this.applyYear(this._allList, idx, this.data.years),
      total: this.applyYear(this._allList, idx, this.data.years).reduce((s, g) => s + g.items.length, 0),
    });
  },

  // 点击月份分组标题：展开 / 收起该月记录
  toggleGroup(e) {
    const gi = Number(e.currentTarget.dataset.gi);
    if (!this.data.list[gi]) return;
    const path = 'list[' + gi + '].collapsed';
    this.setData({ [path]: !this.data.list[gi].collapsed });
  },

  openDetail(e) {
    const { gi, ii } = e.currentTarget.dataset;
    const group = this.data.list[gi];
    if (!group) return;
    const item = group.items[ii];
    const bristol = BRISTOL.find((b) => b.type === Number(item.bristolType));
    this.setData({
      detail: {
        id: item._id,
        date: item.date,
        time: item.time || '',
        bristolType: Number(item.bristolType),
        bristolName: bristol ? bristol.name : '未知',
        bristolDesc: bristol ? bristol.desc : '',
        bristolColor: bristol ? (BRISTOL_COLORS[bristol.type] || '#34C759') : '#34C759',
        dur: durText(item.durationSec),
        amount: item.amount || '未记录',
        color: item.color || '未记录',
        mood: item.mood || '未记录',
        symptomTags: item.symptomTags || [],
        note: item.note || '',
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
