/* =====================================================================
 * 30-canvas.js — 浏览器端画布辅助
 * drawCanvas2D（按 dpr 缩放）/ drawTrendCanvas / renderStatsCharts。
 * ===================================================================== */

// 取 canvas 并按 dpr 缩放后绘制（浏览器版）
function drawCanvas2D(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  const dpr = window.devicePixelRatio || 2;
  const w = el.clientWidth, h = el.clientHeight;
  if (!w || !h) return;
  el.width = w * dpr; el.height = h * dpr;
  const ctx = el.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fn(ctx, w, h);
}
function drawTrendCanvas() {
  const cfg = App._trendCfg; if (!cfg) return;
  drawCanvas2D('trendCanvas', (ctx, w, h) => {
    const geo = drawTrend(ctx, w, h, {
      labels: cfg.labels,
      values: cfg.values,
      color: '#34C759',
      tip: App.trendTipIndex != null ? { index: App.trendTipIndex, label: cfg.tipLabels[App.trendTipIndex] } : null,
    });
    App._trendGeo = geo;
  });
}
function renderStatsCharts() {
  const d = App.statsData(App.statsPeriod);
  App._trendCfg = { labels: d.bars.map((b) => b.day), values: d.bars.map((b) => b.count), tipLabels: d.bars.map((b) => b.tipLabel) };
  // 每次渲染默认高亮今天（切换周期/页面时重置；点击查看某天走 drawTrendCanvas 单独更新，不会被覆盖）
  const ti = d.bars.findIndex((b) => b.date === todayStr());
  App.trendTipIndex = ti >= 0 ? ti : 0;
  drawTrendCanvas();
  const total = d.dist.reduce((s, b) => s + b.count, 0);
  const dom = d.dist.slice().sort((a, b) => b.count - a.count)[0];
  drawCanvas2D('ringCanvas', (ctx, w, h) => drawRing(ctx, w, h, {
    segments: d.dist.map((b) => ({ value: b.count, color: b.color })),
    centerTop: String(total), centerBottom: '总记录', emptyText: '暂无数据',
    centerColor: dom && dom.count ? dom.color : '#1C1C1E'
  }));
}

