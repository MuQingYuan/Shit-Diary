// utils/report.js - 肠道周报计算 + 分享卡片绘制
// 同时适用于小程序 page 与浏览器预览版（纯函数，不依赖 wx）。
const { hexA, roundRect } = require('./chart');
const { BRISTOL, BRISTOL_COLORS, bristolName } = require('./constants');

const pad = (n) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const durText = (sec) => {
  if (!sec) return '—';
  if (sec < 60) return sec + '秒';
  const m = Math.floor(sec / 60);
  return sec % 60 ? m + '分' + (sec % 60) + '秒' : m + '分钟';
};

// 段位称号（按评分）
function gradeOf(score) {
  if (score >= 90) return { title: '肠道王者', emoji: '👑' };
  if (score >= 80) return { title: '顺滑宗师', emoji: '🌟' };
  if (score >= 70) return { title: '规律达人', emoji: '💪' };
  if (score >= 60) return { title: '渐入佳境', emoji: '🌱' };
  return { title: '蓄力新兵', emoji: '🐣' };
}

// 趣味点评（按数据特征选取，确定性）
function scoreComment(r) {
  const topSym = r.symptomTop.length ? r.symptomTop[0].name : '';
  if (r.total === 0) return '这周肠道在放空？点一下记录，开启你的第一泡 💩';
  if (r.daysRecorded === 7) return '七日全勤！规律的你，连肠道都给你点赞 💪';
  if (r.score >= 90) return '肠道状态拉满，你就是本周的顺滑本滑 👑';
  if (r.idealPct >= 60) return '理想便型占比超高，肠道给你发敬业福了 💚';
  if (r.bestType <= 2) return '这周便便偏硬，肠道在提醒你：该补水补纤维啦 💧';
  if (r.bestType >= 6) return '偏稀了点，肠胃有点小情绪，注意保暖和饮食清淡 🍵';
  if (r.avgDurSec > 480) return '单次蹲坑有点久，别带手机，5 分钟内搞定更健康 📵';
  if (topSym && topSym !== '无') return `本周小状况「${topSym}」出现较多，下方建议帮你减负 ↓`;
  if (r.daysRecorded < 4) return '本周打卡偏少，固定时间如厕能帮肠道建立生物钟 ⏰';
  return '稳扎稳打的一周，继续保持，肠道会记住你的好 🌿';
}

// 健康小贴士（按数据特征生成，最多 3 条）
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

/**
 * 构建本周肠道报告。
 * @param {Array} records 本周记录 [{date,time,timestamp,bristolType,durationSec,color,amount,symptomTags,mood,note}]
 * @param {object} opts { weekDays:Date[7](周一~周日), streak:number }
 */
function buildWeekReport(records, opts) {
  const weekDays = opts.weekDays;
  const streak = opts.streak || 0;
  const list = records || [];

  const countByDay = {};
  list.forEach((r) => { countByDay[r.date] = (countByDay[r.date] || 0) + 1; });

  const weekDots = weekDays.map((d) => {
    const date = fmtDate(d);
    const c = countByDay[date] || 0;
    return {
      date,
      label: ['一', '二', '三', '四', '五', '六', '日'][(d.getDay() + 6) % 7],
      recorded: c > 0,
      count: c,
      emoji: c > 0 ? '💩' : '·',
    };
  });

  const daysRecorded = weekDots.filter((x) => x.recorded).length;
  const total = list.length;

  // 平均时长
  const durList = list.filter((r) => r.durationSec > 0);
  const avgDurSec = durList.length
    ? Math.round(durList.reduce((s, r) => s + r.durationSec, 0) / durList.length)
    : 0;

  // 理想便型(4型)占比
  const ideal = list.filter((r) => Number(r.bristolType) === 4).length;
  const idealPct = total ? Math.round((ideal / total) * 100) : 0;

  // 便型分布
  const bristolDist = BRISTOL.map((b) => {
    const c = list.filter((r) => Number(r.bristolType) === b.type).length;
    return {
      type: b.type,
      name: bristolName(b.type),
      count: c,
      pct: total ? Math.round((c / total) * 100) : 0,
      color: BRISTOL_COLORS[b.type],
    };
  }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);

  const bestType = bristolDist.length ? bristolDist[0].type : 0;

  // 症状排行（排除「无」）
  const symMap = {};
  list.forEach((r) => (r.symptomTags || []).forEach((t) => {
    if (t && t !== '无') symMap[t] = (symMap[t] || 0) + 1;
  }));
  const symptomTop = Object.keys(symMap)
    .map((k) => ({ name: k, count: symMap[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 心情分布
  const moodMap = {};
  list.forEach((r) => { const m = r.mood || '正常'; moodMap[m] = (moodMap[m] || 0) + 1; });
  const moodOrder = ['轻松', '正常', '不适'];
  const moodAgg = moodOrder
    .filter((m) => moodMap[m])
    .map((m) => ({ name: m, count: moodMap[m], pct: total ? Math.round((moodMap[m] / total) * 100) : 0 }));

  // ===== 评分（0~100）=====
  const regularity = daysRecorded / 7;               // 规律性 40%
  const idealRatio = idealPct / 100;                  // 理想占比 30%
  const durScore = avgDurSec
    ? Math.max(0, Math.min(1, 1 - Math.abs(avgDurSec - 330) / 330)) // 3~8 分钟最佳
    : 0.6;                                            // 无数据给中性分
  const realSym = list.filter((r) => (r.symptomTags || []).some((t) => t && t !== '无')).length;
  const symScore = total ? Math.max(0, 1 - realSym / total) : 0.6; // 症状越少越好 15%
  const score = total === 0
    ? 0
    : Math.round((regularity * 0.40 + idealRatio * 0.30 + durScore * 0.15 + symScore * 0.15) * 100);

  const grade = gradeOf(score);
  const comment = scoreComment({ total, daysRecorded, score, idealPct, bestType, avgDurSec, symptomTop });
  const tips = buildTips({ bestType, avgDurSec, daysRecorded, symptomTop });

  const first = weekDays[0], last = weekDays[6];
  const rangeLabel = `${first.getMonth() + 1}/${first.getDate()} - ${last.getMonth() + 1}/${last.getDate()}`;

  return {
    rangeLabel,
    daysRecorded,
    total,
    streak,
    score,
    grade,
    avgDurSec,
    avgDurText: durText(avgDurSec),
    idealPct,
    bristolDist,
    bestType,
    bestTypeName: bestType ? bristolName(bestType) : '—',
    symptomTop,
    moodAgg,
    weekDots,
    comment,
    tips,
  };
}

/* ================= 分享卡片绘制 ================= */

function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
  const chars = String(text).split('');
  let line = '';
  let lines = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = chars[i];
      y += lh;
      lines++;
      if (maxLines && lines >= maxLines - 1) {
        // 余下压缩到最后一行
        let rest = chars.slice(i).join('');
        while (ctx.measureText(rest).width > maxW && rest.length > 1) rest = rest.slice(0, -1);
        if (rest !== chars.slice(i).join('')) rest += '…';
        ctx.fillText(rest, x, y);
        return y + lh;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

// 在画布上绘制一张竖版分享卡（逻辑像素 w×h）。调用方负责 dpr 缩放。
function drawReportCard(ctx, w, h, r) {
  ctx.clearRect(0, 0, w, h);
  const R = 28;
  // 卡片底
  roundRect(ctx, 0, 0, w, h, R);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  const PAD = 36;
  // 头部绿色渐变带
  const grad = ctx.createLinearGradient(0, 0, w, 200);
  grad.addColorStop(0, '#34C759');
  grad.addColorStop(1, '#2BA84B');
  ctx.save();
  roundRect(ctx, 0, 0, w, h, R);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, 150);
  ctx.restore();

  // 头部文字
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 30px sans-serif';
  ctx.fillText('我的肠道周报', PAD, 64);
  ctx.font = '400 20px sans-serif';
  ctx.globalAlpha = 0.9;
  ctx.fillText(r.rangeLabel + ' · 本周', PAD, 96);
  ctx.globalAlpha = 1;
  ctx.font = '44px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(r.grade.emoji, w - PAD, 96);

  // 评分圆环
  const cx = w / 2, cy = 250, rad = 78;
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#ECECEF';
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  const start = -Math.PI / 2;
  const ang = (r.score / 100) * Math.PI * 2;
  ctx.strokeStyle = '#34C759';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, rad, start, start + ang);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#1C1C1E';
  ctx.textAlign = 'center';
  ctx.font = '700 46px sans-serif';
  ctx.fillText(String(r.score), cx, cy + 6);
  ctx.fillStyle = '#8E8E93';
  ctx.font = '400 18px sans-serif';
  ctx.fillText('肠道健康分', cx, cy + 34);
  ctx.fillStyle = '#34C759';
  ctx.font = '700 22px sans-serif';
  ctx.fillText(r.grade.title, cx, cy + 70);

  // 关键指标三连
  const chips = [
    { k: '打卡', v: `${r.daysRecorded}/7` },
    { k: '平均时长', v: r.avgDurText },
    { k: '理想占比', v: r.idealPct + '%' },
  ];
  const cw = (w - PAD * 2 - 24) / 3;
  chips.forEach((c, i) => {
    const x = PAD + i * (cw + 12);
    const y = 360;
    roundRect(ctx, x, y, cw, 84, 18);
    ctx.fillStyle = '#F4FAF5';
    ctx.fill();
    ctx.fillStyle = '#1C1C1E';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 26px sans-serif';
    ctx.fillText(c.v, x + cw / 2, y + 42);
    ctx.fillStyle = '#8E8E93';
    ctx.font = '400 16px sans-serif';
    ctx.fillText(c.k, x + cw / 2, y + 66);
  });

  // 一周打卡日历
  let y = 480;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1C1C1E';
  ctx.font = '600 20px sans-serif';
  ctx.fillText('一周打卡', PAD, y);
  y += 18;
  const dw = (w - PAD * 2) / 7;
  r.weekDots.forEach((d, i) => {
    const dx = PAD + i * dw + dw / 2;
    const dy = y + 30;
    ctx.beginPath();
    ctx.arc(dx, dy, 18, 0, Math.PI * 2);
    ctx.fillStyle = d.recorded ? '#EAF6EC' : '#F2F2F7';
    ctx.fill();
    ctx.font = (d.recorded ? '16px' : '18px') + ' sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.emoji, dx, dy + 1);
    ctx.fillStyle = d.recorded ? '#34C759' : '#C7C7CC';
    ctx.font = '400 13px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.label, dx, dy + 36);
  });

  // 趣味点评气泡
  y += 86;
  roundRect(ctx, PAD, y, w - PAD * 2, 92, 18);
  ctx.fillStyle = '#FFF7E6';
  ctx.fill();
  ctx.fillStyle = '#B6791F';
  ctx.font = '600 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('本周点评', PAD + 20, y + 32);
  ctx.fillStyle = '#5A4A2A';
  ctx.font = '400 17px sans-serif';
  wrapText(ctx, r.comment, PAD + 20, y + 58, w - PAD * 2 - 40, 24, 2);

  // 健康贴士
  y += 112;
  ctx.fillStyle = '#1C1C1E';
  ctx.font = '600 20px sans-serif';
  ctx.fillText('肠道小贴士', PAD, y);
  y += 24;
  ctx.font = '400 16px sans-serif';
  r.tips.forEach((t) => {
    const lines = wrapText(ctx, '· ' + t, PAD, y, w - PAD * 2, 23, 2);
    y = lines + 6;
  });

  // 页脚
  ctx.fillStyle = '#C7C7CC';
  ctx.font = '400 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('嗯嗯日记 · 数据来自你自己的记录', w / 2, h - 26);
}

module.exports = { buildWeekReport, gradeOf, scoreComment, buildTips, drawReportCard, durText };
