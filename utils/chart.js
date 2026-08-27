// utils/chart.js - 零依赖 Canvas2D 图表
// 同时适用于小程序 <canvas type="2d"> 与浏览器 <canvas>（HTML 预览版）。
// 调用方负责获取 2d context 并按 dpr 缩放，本模块所有坐标均以「CSS 像素 / 布局像素」为单位。

// #RRGGBB -> rgba(r,g,b,a)
function hexA(hex, a) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// 圆角矩形路径（兼容小程序与浏览器 canvas）
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 折线 / 面积图（每日次数趋势）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w 布局宽(px)
 * @param {number} h 布局高(px)
 * @param {object} opt {
 *   labels:string[], values:number[], color:string,
 *   showYAxis?:boolean(默认true),
 *   tip?:{ index:number, label:string }  // 高亮某点并显示气泡
 * }
 * @returns {null | { points:[{x,y,value}], plot:{left,right,top,bottom} }}
 *   points 供点击命中测试（坐标为布局像素，与 dpr 缩放前的 ctx 一致）。
 */
function drawTrend(ctx, w, h, opt) {
  const labels = opt.labels || [];
  const values = opt.values || [];
  const color = opt.color || '#34C759';
  const n = values.length;
  if (!n) return null;

  const showYAxis = opt.showYAxis !== false;
  const padL = showYAxis ? 28 : 10;
  const padR = 10, padT = 22, padB = 24;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // 整数上限，保证 Y 轴有可读刻度
  let maxV = Math.max(opt.maxY || 0, ...values, 1);
  maxV = Math.ceil(maxV);
  if (maxV < 1) maxV = 1;

  const xAt = (i) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
  const yAt = (v) => padT + plotH * (1 - v / maxV);

  // 水平网格线（0 / max 之间 3 等分，共 4 条）
  ctx.strokeStyle = '#ECECEF';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 3; g++) {
    const y = Math.round(padT + (plotH * g) / 3) + 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  // Y 轴刻度（顶部 = 上限，底部 = 0）
  if (showYAxis) {
    ctx.fillStyle = '#8E8E93';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(maxV), padL - 5, padT + 0.5);
    ctx.fillText('0', padL - 5, padT + plotH + 0.5);
  }

  // 面积填充
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, hexA(color, 0.30));
  grad.addColorStop(1, hexA(color, 0.02));
  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(values[0]));
  for (let i = 1; i < n; i++) ctx.lineTo(xAt(i), yAt(values[i]));
  ctx.lineTo(xAt(n - 1), padT + plotH);
  ctx.lineTo(xAt(0), padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折线
  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(values[0]));
  for (let i = 1; i < n; i++) ctx.lineTo(xAt(i), yAt(values[i]));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // 数值标签：本周(≤7)每天全标；本月等密集场景隔一天标一个，避免拥挤
  const showAll = n <= 7;
  const labelEvery = showAll ? 1 : 2; // 隔一天展示一个
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < n; i++) {
    if (!(showAll || values[i] > 0)) continue;
    ctx.beginPath();
    ctx.arc(xAt(i), yAt(values[i]), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    // 仅在「隔一天」位置标数值（本周点数少仍全标）
    if (values[i] > 0 && (labelEvery === 1 || i % labelEvery === 0)) {
      ctx.fillStyle = '#1C1C1E';
      ctx.font = '10px sans-serif';
      ctx.fillText(String(values[i]), xAt(i), yAt(values[i]) - 8);
    }
  }

  // 选中/高亮提示：竖直参考线 + 大圆点 + 气泡
  if (opt.tip && opt.tip.index >= 0 && opt.tip.index < n) {
    const i = opt.tip.index;
    const px = xAt(i), py = yAt(values[i]);
    ctx.strokeStyle = hexA(color, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    const text = opt.tip.label || String(values[i]);
    ctx.font = '600 12px sans-serif';
    const tw = ctx.measureText(text).width;
    const bw = tw + 16, bh = 22;
    let bx = px - bw / 2;
    bx = Math.max(padL, Math.min(bx, w - padR - bw));
    let by = py - bh - 12;
    if (by < padT - 2) by = py + 12;
    roundRect(ctx, bx, by, bw, bh, 6);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
  }

  // X 轴标签
  ctx.fillStyle = '#8E8E93';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const labelStep = n > 14 ? Math.ceil(n / 6) : 1;
  for (let i = 0; i < n; i++) {
    if (n <= 14 || i % labelStep === 0 || i === n - 1) {
      ctx.fillText(labels[i], xAt(i), h - 6);
    }
  }

  const points = [];
  for (let i = 0; i < n; i++) points.push({ x: xAt(i), y: yAt(values[i]), value: values[i] });
  return { points, plot: { left: padL, right: w - padR, top: padT, bottom: padT + plotH } };
}

/**
 * 环形图（Bristol 类型分布）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w 布局宽(px)
 * @param {number} h 布局高(px)
 * @param {object} opt { segments:[{value,color}], centerTop, centerBottom, emptyText, centerColor }
 */
function drawRing(ctx, w, h, opt) {
  const segments = (opt.segments || []).filter((s) => s.value > 0);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = w / 2;
  const cy = h / 2;
  const rOuter = Math.min(w, h) / 2 - 4;
  const rInner = rOuter * 0.62;
  const rMid = (rOuter + rInner) / 2;
  const thickness = rOuter - rInner;

  ctx.clearRect(0, 0, w, h);

  if (!total) {
    ctx.beginPath();
    ctx.arc(cx, cy, rMid, 0, Math.PI * 2);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = '#ECECEF';
    ctx.stroke();
    ctx.fillStyle = '#8E8E93';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.emptyText || '暂无数据', cx, cy);
    return;
  }

  let start = -Math.PI / 2;
  segments.forEach((seg) => {
    const ang = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rMid, start, start + ang);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = seg.color;
    ctx.stroke();
    start += ang;
  });

  // 中心文案
  ctx.textAlign = 'center';
  if (opt.centerTop) {
    ctx.fillStyle = opt.centerColor || '#1C1C1E';
    ctx.font = '600 22px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(opt.centerTop), cx, cy + 4);
  }
  if (opt.centerBottom) {
    ctx.fillStyle = '#8E8E93';
    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(opt.centerBottom, cx, cy + 22);
  }
}

module.exports = { drawTrend, drawRing, hexA, roundRect };
