// utils/constants.js - 业务常量
const BRISTOL = [
  { type: 1, name: '1型 · 硬块', desc: '分离的硬块（兔粪状），通常意味着便秘' },
  { type: 2, name: '2型 · 块状', desc: '块状香肠状，偏硬，接近便秘' },
  { type: 3, name: '3型 · 裂纹', desc: '香肠状表面有裂纹，正常' },
  { type: 4, name: '4型 · 理想', desc: '光滑柔软的香肠状，最理想的状态' },
  { type: 5, name: '5型 · 软团', desc: '软团状、边缘清晰，偏软' },
  { type: 6, name: '6型 · 糊状', desc: '糊状、边缘不规则，接近腹泻' },
  { type: 7, name: '7型 · 水样', desc: '完全水样无固体，腹泻' },
];

const SYMPTOMS = ['费力', '出血', '疼痛', '腹胀', '未排净', '紧急'];
const COLORS = ['棕', '深棕', '浅棕', '绿', '黑', '红', '其他'];

// 周几（0=周日）
const WEEK_DAYS = [
  { key: 1, label: '一' },
  { key: 2, label: '二' },
  { key: 3, label: '三' },
  { key: 4, label: '四' },
  { key: 5, label: '五' },
  { key: 6, label: '六' },
  { key: 0, label: '日' },
];

function bristolName(type) {
  const item = BRISTOL.find((b) => b.type === Number(type));
  return item ? item.name : '未知';
}

module.exports = { BRISTOL, SYMPTOMS, COLORS, WEEK_DAYS, bristolName };
