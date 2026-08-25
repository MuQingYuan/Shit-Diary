const { BRISTOL } = require('../../utils/constants');

const FAQ = [
  { q: '为什么要记录排便？', a: '排便习惯是肠道健康的晴雨表。连续记录可以帮你发现频率、形态、时间的变化规律，及时察觉异常。' },
  { q: 'Bristol 分型是什么？', a: '医学上常用的粪便形态分类（1-7 型）。4 型（光滑柔软的香肠状）是理想状态；1-2 型偏便秘，6-7 型偏腹泻。' },
  { q: '多久一次算正常？', a: '正常范围是每天 3 次到每周 3 次，个体差异大。更重要的是你自己的规律是否稳定，而不是绝对次数。' },
  { q: '数据会泄露吗？', a: '记录默认仅自己可见（云数据库「仅创建者可读写」）。分享到社区的内容才对外可见。' },
  { q: '这是医疗建议吗？', a: '不是。本小程序仅作记录与参考，不构成诊断或治疗建议。持续异常请及时就医。' },
];

Page({
  data: {
    bristolList: BRISTOL,
    activeType: 4,
    faq: FAQ.map((f, i) => ({ ...f, open: i === 0 })),
  },

  onTypeTap(e) {
    this.setData({ activeType: Number(e.currentTarget.dataset.type) });
  },

  toggleFaq(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({
      faq: this.data.faq.map((f, i) => ({ ...f, open: i === idx ? !f.open : false })),
    });
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },
});
