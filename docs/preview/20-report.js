/* =====================================================================
 * 20-report.js — 肠道周报引擎（与小程序 utils/report.js 同源）
 * bristolName / wrapText / GRADE_PALETTE / gradeOf / scoreComment / buildTips / buildWeekReport / sectionTitle / drawReportCard。⚠️ 与 utils/report.js 保持同源：改动需同步。
 * ===================================================================== */

// ============ 肠道周报引擎（与 utils/report.js 同源） ============
function bristolName(type) {
  const it = BRISTOL.find((b) => b.type === Number(type));
  return it ? it.name : '未知';
}
function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
  const chars = String(text).split('');
  let line = '', lines = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); line = chars[i]; y += lh; lines++;
      if (maxLines && lines >= maxLines - 1) {
        let rest = chars.slice(i).join('');
        while (ctx.measureText(rest).width > maxW && rest.length > 1) rest = rest.slice(0, -1);
        if (rest !== chars.slice(i).join('')) rest += '…';
        ctx.fillText(rest, x, y); return y + lh;
      }
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}
const GRADE_PALETTE = {
  '肠道王者': { color: '#F5A623', soft: '#FFF3E0', grad: ['#FFC06E', '#F0972B'] },
  '顺滑宗师': { color: '#9B59B6', soft: '#F5ECFB', grad: ['#B57ED1', '#884EA0'] },
  '规律达人': { color: '#34C759', soft: '#EAF6EC', grad: ['#4FD86E', '#28A447'] },
  '渐入佳境': { color: '#15B8A6', soft: '#E3F7F4', grad: ['#3FD3C2', '#0E9384'] },
  '蓄力新兵': { color: '#3D9BE9', soft: '#E8F3FC', grad: ['#67B4F0', '#2C7FC6'] },
};
function gradeOf(score) {
  let title, emoji;
  if (score >= 90) { title = '肠道王者'; emoji = '👑'; }
  else if (score >= 80) { title = '顺滑宗师'; emoji = '🌟'; }
  else if (score >= 70) { title = '规律达人'; emoji = '💪'; }
  else if (score >= 60) { title = '渐入佳境'; emoji = '🌱'; }
  else { title = '蓄力新兵'; emoji = '🐣'; }
  const p = GRADE_PALETTE[title];
  return { title, emoji, color: p.color, soft: p.soft, grad: p.grad };
}
function scoreComment(r) {
  const topSym = r.symptomTop.length ? r.symptomTop[0].name : '';
  if (r.total === 0) return '这周肠道在放空？点一下记录，开启你的第一泡 💩';
  if (r.daysRecorded === 7) return '七日全勤！规律的你，连肠道都给你点赞 💪';
  if (r.score >= 90) return '肠道状态拉满，你就是本周的顺滑本滑 👑';
  if (r.idealPct >= 60) return '理想便型占比超高，肠道给你发敬业福了 💚';
  if (r.bestType <= 2) return '这周便便偏硬，肠道在提醒你：该补水补纤维啦 💧';
  if (r.bestType >= 6) return '偏稀了点，肠胃有点小情绪，注意保暖和饮食清淡 🍵';
  if (r.avgDurSec > 480) return '单次蹲坑有点久，别带手机，5 分钟内搞定更健康 📵';
  if (topSym && topSym !== '无') return '本周小状况「' + topSym + '」出现较多，下方建议帮你减负 ↓';
  if (r.daysRecorded < 4) return '本周打卡偏少，固定时间如厕能帮肠道建立生物钟 ⏰';
  return '稳扎稳打的一周，继续保持，肠道会记住你的好 🌿';
}
function buildTips(r) {
  const tips = [];
  if (r.bestType <= 2) tips.push('便便偏硬：每天喝够 1.5L 水，多吃燕麦、西兰花、火龙果等膳食纤维。');
  if (r.bestType >= 6) tips.push('偏稀溏：注意腹部保暖，少吃生冷油腻，温粥养肠最舒服。');
  if (r.avgDurSec > 480) tips.push('蹲坑别带手机：控制在 5 分钟内，减少久坐给直肠的压力。');
  const real = r.symptomTop.filter((s) => s.name === '出血' || s.name === '疼痛');
  if (real.length) tips.push('出现出血 / 疼痛请及时线下就医，记录只是帮你看趋势，别硬扛。');
  if (r.daysRecorded < 5) tips.push('建立如厕生物钟：每天固定时段（如晨起后）蹲 5 分钟，比偶尔猛补更有效。');
  if (tips.length < 2) tips.push('均衡饮食 + 规律作息是肠道最好的朋友，记录本身就是改变的开始。');
  if (tips.length < 3) tips.push('把「嗯嗯日记」当成每日小仪式，连续打卡 7 天解锁更多彩蛋 🎁。');
  return tips.slice(0, 3);
}
function buildWeekReport(records, opts) {
  const weekDays = opts.weekDays, streak = opts.streak || 0, list = records || [];
  const countByDay = {};
  list.forEach((r) => { countByDay[r.date] = (countByDay[r.date] || 0) + 1; });
  const weekDots = weekDays.map((d) => {
    const date = fmtDate(d), c = countByDay[date] || 0;
    return { date, label: ['一', '二', '三', '四', '五', '六', '日'][(d.getDay() + 6) % 7], recorded: c > 0, count: c, emoji: c > 0 ? '💩' : '·' };
  });
  const daysRecorded = weekDots.filter((x) => x.recorded).length;
  const total = list.length;
  const durList = list.filter((r) => r.durationSec > 0);
  const avgDurSec = durList.length ? Math.round(durList.reduce((s, r) => s + r.durationSec, 0) / durList.length) : 0;
  const ideal = list.filter((r) => Number(r.bristolType) === 4).length;
  const idealPct = total ? Math.round((ideal / total) * 100) : 0;
  const bristolDist = BRISTOL.map((b) => {
    const c = list.filter((r) => Number(r.bristolType) === b.type).length;
    return { type: b.type, name: bristolName(b.type), count: c, pct: total ? Math.round((c / total) * 100) : 0, color: BRISTOL_COLORS[b.type] };
  }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  const bestType = bristolDist.length ? bristolDist[0].type : 0;
  const symMap = {};
  list.forEach((r) => (r.symptomTags || []).forEach((t) => { if (t && t !== '无') symMap[t] = (symMap[t] || 0) + 1; }));
  const symptomTop = Object.keys(symMap).map((k) => ({ name: k, count: symMap[k] })).sort((a, b) => b.count - a.count).slice(0, 3);
  const moodMap = {};
  list.forEach((r) => { const m = r.mood || '正常'; moodMap[m] = (moodMap[m] || 0) + 1; });
  const moodAgg = ['轻松', '正常', '不适'].filter((m) => moodMap[m]).map((m) => ({ name: m, count: moodMap[m], pct: total ? Math.round((moodMap[m] / total) * 100) : 0 }));
  const regularity = daysRecorded / 7, idealRatio = idealPct / 100;
  const durScore = avgDurSec ? Math.max(0, Math.min(1, 1 - Math.abs(avgDurSec - 330) / 330)) : 0.6;
  const realSym = list.filter((r) => (r.symptomTags || []).some((t) => t && t !== '无')).length;
  const symScore = total ? Math.max(0, 1 - realSym / total) : 0.6;
  const score = total === 0 ? 0 : Math.round((regularity * 0.40 + idealRatio * 0.30 + durScore * 0.15 + symScore * 0.15) * 100);
  const grade = gradeOf(score);
  const comment = scoreComment({ total, daysRecorded, score, idealPct, bestType, avgDurSec, symptomTop });
  const tips = buildTips({ bestType, avgDurSec, daysRecorded, symptomTop });
  const first = weekDays[0], last = weekDays[6];
  const rangeLabel = (first.getMonth() + 1) + '/' + first.getDate() + ' - ' + (last.getMonth() + 1) + '/' + last.getDate();
  return { rangeLabel, daysRecorded, total, streak, score, grade, avgDurSec, avgDurText: durText(avgDurSec), idealPct, bristolDist, bestType, bestTypeName: bestType ? bristolName(bestType) : '—', symptomTop, moodAgg, weekDots, comment, tips };
}
function sectionTitle(ctx, text, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x, y - 15, 6, 19, 3); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#1C1C1E'; ctx.font = '600 18px sans-serif'; ctx.fillText(text, x + 16, y);
  ctx.restore();
}
function drawReportCard(ctx, w, h, r) {
  const g = r.grade;
  ctx.clearRect(0, 0, w, h);
  const R = 28;
  roundRect(ctx, 0, 0, w, h, R); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  const PAD = 32;
  // 顶部渐变头（段位配色）
  ctx.save(); roundRect(ctx, 0, 0, w, h, R); ctx.clip();
  const grad = ctx.createLinearGradient(0, 0, w, 190);
  grad.addColorStop(0, g.grad[0]); grad.addColorStop(1, g.grad[1]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, 178); ctx.restore();
  // 头文字
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px sans-serif'; ctx.fillText('我的肠道周报', PAD, 50);
  ctx.font = '400 16px sans-serif'; ctx.globalAlpha = 0.9; ctx.fillText(r.rangeLabel + ' · 本周', PAD, 80); ctx.globalAlpha = 1;
  ctx.textAlign = 'right';
  ctx.font = '42px sans-serif'; ctx.fillText(g.emoji, w - PAD, 82);
  ctx.font = '700 19px sans-serif'; ctx.fillText(g.title, w - PAD, 116);
  ctx.font = '400 12px sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText('本周段位', w - PAD, 136); ctx.globalAlpha = 1;
  // 评分圆环（优雅：柔光轨道 + 段位渐变弧 + 圆角端点）
  const cx = w / 2, cy = 250, rad = 56;
  const ang = (r.score / 100) * Math.PI * 2;
  ctx.save();
  ctx.shadowColor = g.color; ctx.shadowBlur = 12; ctx.lineWidth = 14; ctx.strokeStyle = '#F1F1F4';
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  const ag = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
  ag.addColorStop(0, g.grad[0]); ag.addColorStop(1, g.grad[1]);
  ctx.lineWidth = 14; ctx.strokeStyle = ag; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + ang); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#1C1C1E'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '700 40px sans-serif'; ctx.fillText(String(r.score), cx, cy + 2);
  ctx.fillStyle = '#8E8E93'; ctx.font = '400 13px sans-serif'; ctx.fillText('肠道健康分', cx, cy + 26);
  // 关键指标（值自动缩放，避免超出卡片背景）
  let y = 326;
  const chips = [{ k: '打卡', v: r.daysRecorded + '/7' }, { k: '时长', v: r.avgDurText }, { k: '理想', v: r.idealPct + '%' }];
  const cw = (w - PAD * 2 - 24) / 3;
  const fitVal = (val, cxx, yy, maxW) => {
    let fs = 22; ctx.font = '700 ' + fs + 'px sans-serif';
    const tw = ctx.measureText(val).width;
    if (tw > maxW) { fs = Math.max(13, Math.floor((fs * maxW) / tw)); ctx.font = '700 ' + fs + 'px sans-serif'; }
    ctx.fillText(val, cxx, yy);
  };
  chips.forEach((c, i) => {
    const x = PAD + i * (cw + 12);
    roundRect(ctx, x, y, cw, 72, 16); ctx.fillStyle = g.soft; ctx.fill();
    ctx.fillStyle = '#1C1C1E'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    fitVal(c.v, x + cw / 2, y + 38, cw - 14);
    ctx.fillStyle = '#8E8E93'; ctx.font = '400 13px sans-serif'; ctx.fillText(c.k, x + cw / 2, y + 58);
  });
  // 本周点评（紧凑气泡，2 行内）
  y += 72 + 20; const bubbleH = 84;
  roundRect(ctx, PAD, y, w - PAD * 2, bubbleH, 16); ctx.fillStyle = g.soft; ctx.fill();
  ctx.fillStyle = g.color; ctx.font = '600 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('本周点评', PAD + 16, y + 26);
  ctx.fillStyle = '#3A3A3A'; ctx.font = '400 14px sans-serif'; wrapText(ctx, r.comment, PAD + 16, y + 48, w - PAD * 2 - 32, 19, 2);
  // 肠道小贴士（最多 2 条，完整展示，不省略）
  y += bubbleH + 20; sectionTitle(ctx, '💡 肠道小贴士', PAD, y, g.color); y += 24;
  ctx.font = '400 13.5px sans-serif';
  r.tips.slice(0, 2).forEach((t) => { y = wrapText(ctx, '· ' + t, PAD, y, w - PAD * 2, 19, 4) + 9; });
  // 页脚
  ctx.fillStyle = '#C7C7CC'; ctx.font = '400 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('嗯嗯日记 · 数据来自你自己的记录', w / 2, h - 18);
}

