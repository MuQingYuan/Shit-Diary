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

/**
 * 折线 / 面积图（每日次数趋势）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w 布局宽(px)
 * @param {number} h 布局高(px)
 * @param {object} opt { labels:string[], values:number[], color:string }
 */
function drawTrend(ctx, w, h, opt) {
  const labels = opt.labels || [];
  const values = opt.values || [];
  const color = opt.color || '#34C759';
  const n = values.length;
  if (!n) return;

  const padL = 10, padR = 10, padT = 22, padB = 24;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const maxV = Math.max(opt.maxY || 0, ...values, 1);

  // 水平网格线（3 条）
  ctx.strokeStyle = '#ECECEF';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 2; g++) {
    const y = Math.round(padT + (plotH * g) / 2) + 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  const xAt = (i) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
  const yAt = (v) => padT + plotH * (1 - v / maxV);

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

  // 数据点 + 数值（点数较少时标注）
  if (n <= 7) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(xAt(i), yAt(values[i]), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
      if (values[i] > 0) {
        ctx.fillStyle = '#1C1C1E';
        ctx.font = '10px sans-serif';
        ctx.fillText(String(values[i]), xAt(i), yAt(values[i]) - 9);
      }
    }
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

module.exports = { drawTrend, drawRing, hexA };
