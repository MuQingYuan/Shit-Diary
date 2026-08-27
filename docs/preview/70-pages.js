/* =====================================================================
 * 70-pages.js — 各页面渲染与交互
 * 通过 Object.assign(App, { ... }) 挂载所有 renderXxx 与对应处理方法。新增页面：在此追加一个方法，并在 60-app.js 的 renderMap 注册。
 * ===================================================================== */

Object.assign(App, {
  renderHome() {
    const d = this.homeData();
    const recorded = d.todayCount > 0;
    const barsHtml = d.bars.map((b) =>
      '<div class="bar-item"><span class="bar-count">' + (b.count ? b.count : '') + '</span>' +
      '<div class="bar ' + (b.hot ? 'hot' : '') + '" style="height:' + b.h + 'px"></div>' +
      '<span class="bar-day">' + b.day + '</span></div>').join('');
    return '' +
      '<div class="card hero flat">' +
        '<div class="hero-icon ' + (recorded ? 'done' : '') + '">' + (recorded ? '✓' : '💩') + '</div>' +
        '<div class="hero-title">' + (recorded ? '今日已记录 ' + d.todayCount + ' 次' : '今天还未记录') + '</div>' +
        '<div class="hero-sub">' + (recorded ? '规律打卡，从每一天开始' : '点一下，3 秒完成记录') + '</div>' +
        '<button class="btn-primary" onclick="App.openQuick()">' + (recorded ? '再记一次' : '立即记录') + '</button>' +
        '<button class="link-btn" onclick="App.go(\'record\')">需要详细记录？去记录页 ›</button>' +
      '</div>' +
      '<div class="stat-row">' +
        '<div class="card stat" onclick="App.go(\'stats\')"><div class="stat-label">连续打卡</div>' +
          '<div class="stat-num">' + d.streak + '<span class="unit"> 天</span></div><span class="stat-arrow">›</span></div>' +
        '<div class="card stat" onclick="App.go(\'stats\')"><div class="stat-label">累计记录</div>' +
          '<div class="stat-num">' + d.total + '<span class="unit"> 次</span></div><span class="stat-arrow">›</span></div>' +
      '</div>' +
      '<div class="card" onclick="App.goStatsWeek()">' +
        '<div class="trend-head"><span class="card-title">本周趋势</span>' +
          '<span class="trend-tag">' + (d.weekTotal ? '共 ' + d.weekTotal + ' 次 · 日均 ' + d.avgPerDay : '近 7 天') + '</span></div>' +
        (d.weekTotal ? '<div class="bars">' + barsHtml + '</div>' : '<div class="empty">本周还没有记录，点我去打卡 ›</div>') +
      '</div>' +
      '<div class="card remind flat">' +
        '<div class="remind-main" onclick="App.push(\'remind\')"><div class="card-title">晨间提醒</div>' +
          '<div class="remind-sub">' + (DB.reminders.enabled ? '每天 ' + DB.reminders.time + ' · 服务通知' : '已关闭 · 点按开启提醒') + '</div></div>' +
        '<div class="switch ' + (DB.reminders.enabled ? 'on' : '') + '" onclick="App.toggleRemind(event)"><div class="knob"></div></div>' +
      '</div>' +
      '<div class="card" onclick="App.push(\'report\')">' +
        '<div class="card-title">肠道周报</div>' +
        '<div class="card-sub">连续记录 7 天，解锁专属肠道报告</div>' +
        '<div class="card-sub" style="color:#34C759;margin-top:8px;font-weight:600">去看看 ›</div>' +
      '</div>';
  },

  // ===== 半屏快捷记录面板 =====
  quickForm: { bristolType: 4, durationSec: 300, color: '棕', symptomTags: ['无'] },

  openQuick() {
    document.getElementById('quickMask').classList.add('show');
    this.renderQuickBristol();
    document.getElementById('quickDur').textContent = this.quickDurText(this.quickForm.durationSec);
    const inp = document.getElementById('quickDurMin');
    if (inp) inp.value = Math.round(this.quickForm.durationSec / 60);
    document.querySelectorAll('#quickMask .preset').forEach((p) =>
      p.classList.toggle('on', +p.dataset.s === this.quickForm.durationSec));
  },
  closeQuick() {
    document.getElementById('quickMask').classList.remove('show');
  },
  quickDurText(sec) { return sec < 60 ? sec + '秒' : Math.round(sec / 60) + '分钟'; },
  renderQuickBristol() {
    const el = document.getElementById('quickBristol');
    el.innerHTML = BRISTOL.map((b) =>
      '<div class="bristol-mini ' + (this.quickForm.bristolType === b.type ? 'active' : '') + '" ' +
      'onclick="App.quickPickBristol(' + b.type + ')">' + b.type + '</div>').join('');
  },
  quickPickBristol(type) {
    this.quickForm.bristolType = type;
    this.renderQuickBristol();
  },
  quickSetDurMin(v) {
    let min = parseInt(v, 10); if (isNaN(min)) min = 0;
    min = Math.max(0, Math.min(90, min));
    this.quickForm.durationSec = min * 60;
    const el = document.getElementById('quickDur');
    if (el) el.textContent = this.quickDurText(this.quickForm.durationSec);
  },
  quickClampDur(inp) {
    let min = parseInt(inp.value, 10); if (isNaN(min)) min = 0;
    min = Math.max(0, Math.min(90, min));
    this.quickForm.durationSec = min * 60;
    inp.value = min;
    const el = document.getElementById('quickDur');
    if (el) el.textContent = this.quickDurText(this.quickForm.durationSec);
  },
  quickPreset(sec) {
    this.quickForm.durationSec = sec;
    const dur = document.getElementById('quickDur');
    if (dur) dur.textContent = this.quickDurText(sec);
    const inp = document.getElementById('quickDurMin');
    if (inp) inp.value = Math.round(sec / 60);
    document.querySelectorAll('#quickMask .preset').forEach((p) =>
      p.classList.toggle('on', +p.dataset.s === sec));
  },

  confirmQuick() {
    const now = new Date();
    DB.records.push({
      id: 'q' + Date.now(), date: fmtDate(now), time: fmtHM(now), timestamp: now.getTime(),
      bristolType: this.quickForm.bristolType, durationSec: this.quickForm.durationSec,
      color: this.quickForm.color, amount: '中', symptomTags: this.quickForm.symptomTags, mood: '正常', note: ''
    });
    DB.users.totalRecords = DB.records.length;
    DB.users.streakDays = calcStreak();
    saveDB();
    // 提交后复原快捷面板默认值：Bristol=4 / 5 分钟 / 颜色=棕 / 症状=无
    this.quickForm = { bristolType: 4, durationSec: 300, color: '棕', symptomTags: ['无'] };
    this.closeQuick();
    toast('已记录 💩');
    this.render();
  },

  toggleRemind(e) {
    e.stopPropagation();
    DB.reminders.enabled = !DB.reminders.enabled;
    saveDB();
    toast(DB.reminders.enabled ? '提醒已开启' : '提醒已关闭');
    this.render();
  },

  /* ================= 记录表单 ================= */
  renderRecord() {
    const f = this.recordForm;
    const bristol = BRISTOL.map((b) =>
      '<div class="bristol-item ' + (f.bristolType === b.type ? 'active' : '') + '" onclick="App.pickBristol(' + b.type + ')">' +
      '<div class="bt">' + b.type + '</div><div class="bd">' + b.name.slice(3) + '</div></div>').join('');
    const tags = SYMPTOMS.map((t) =>
      '<span class="tag ' + (f.symptomTags.includes(t) ? 'active' : '') + '" onclick="App.toggleSymptom(\'' + t + '\')">' + t + '</span>').join('');
    const moods = MOODS.map((m) =>
      '<span class="tag ' + (f.mood === m ? 'active' : '') + '" onclick="App.pickMood(\'' + m + '\')">' + m + '</span>').join('');
    const amounts = AMOUNTS.map((a) =>
      '<span class="tag ' + (f.amount === a ? 'active' : '') + '" onclick="App.pickAmount(\'' + a + '\')">' + a + '</span>').join('');
    const colors = COLORS.map((c) =>
      '<span class="tag ' + (f.color === c ? 'active' : '') + '" onclick="App.pickColor(\'' + c + '\')">' + c + '</span>').join('');
    return '' +
      '<div class="card flat"><div class="field">' +
        '<span class="label">Bristol 类型</span>' +
        '<div class="bristol-grid">' + bristol + '</div></div>' +
        '<div class="field"><span class="label">时长</span>' +
        '<div class="dur-summary"><span class="dur-ico">⏱</span><span class="dur-value" id="durValue">' + formatDuration(f.durationSec) + '</span><span class="dur-max">最长 1 小时 30 分钟</span></div>' +
        '<div class="dur-chips">' + this.durationPresets.map((p) =>
          '<span class="dur-chip ' + (f.durationSec === p.sec ? 'active' : '') + '" onclick="App.pickDuration(' + p.sec + ')">' + p.label + '</span>').join('') + '</div>' +
        '<div class="dur-custom"><span class="dur-custom-label">自定义（分钟，最长 90）</span>' +
        '<div class="dur-input-row"><input class="dur-input" id="durMin" type="number" min="0" max="90" value="' + Math.round(f.durationSec / 60) + '" placeholder="如 12" oninput="App.setDurMin(this.value)" onblur="App.clampDurMin(this)"><span class="dur-input-unit">分钟</span></div></div>' +
        '<div class="field"><span class="label">时间</span><div class="picker-row">' +
        '<input type="date" value="' + f.date + '" onchange="App.recordForm.date=this.value">' +
        '<input type="time" value="' + f.time + '" onchange="App.recordForm.time=this.value"></div></div>' +
        '<div class="field"><span class="label">量</span><div class="tag-row">' + amounts + '</div></div>' +
        '<div class="field"><span class="label">颜色</span><div class="tag-row">' + colors + '</div></div>' +
        '<div class="field"><span class="label">症状（可多选）</span><div class="tag-row">' + tags + '</div></div>' +
        '<div class="field"><span class="label">心情</span><div class="tag-row">' + moods + '</div></div>' +
        '<div class="field"><div class="note-head ' + (this.noteExpanded ? 'open' : '') + '" onclick="App.toggleNote()">' +
          '<span class="note-ico">📝</span><span class="note-title">备注</span>' +
          '<span class="note-action">' + (this.noteExpanded ? '收起' : (f.note ? '编辑' : '添加')) + '</span></div>' +
        (this.noteExpanded
          ? '<textarea class="note-area" id="noteArea" placeholder="今天感觉如何？有什么想记录的～" maxlength="200" oninput="App.recordForm.note=this.value;var c=document.getElementById(\'noteCount\');if(c)c.textContent=this.value.length+\'/200\'">' + esc(f.note) + '</textarea><div class="note-foot"><span class="note-count" id="noteCount">' + f.note.length + '/200</span></div>'
          : (f.note ? '<div class="note-preview" onclick="App.toggleNote()">' + esc(f.note) + '</div>' : '')) +
        '</div>' +
        '<button class="btn-primary" onclick="App.submitRecord()">保存记录</button></div>';
  },
  renderRecordForm() { this.render(); },
  pickBristol(t) { this.recordForm.bristolType = t; this.render(); },
  pickDuration(sec) { this.recordForm.durationSec = sec; this.render(); },
  setDurMin(v) {
    let min = parseInt(v, 10); if (isNaN(min)) min = 0;
    min = Math.max(0, Math.min(90, min));
    this.recordForm.durationSec = min * 60;
    const el = document.getElementById('durValue');
    if (el) el.textContent = formatDuration(this.recordForm.durationSec);
  },
  clampDurMin(inp) {
    let min = parseInt(inp.value, 10); if (isNaN(min)) min = 0;
    min = Math.max(0, Math.min(90, min));
    this.recordForm.durationSec = min * 60;
    inp.value = min;
    const el = document.getElementById('durValue');
    if (el) el.textContent = formatDuration(this.recordForm.durationSec);
  },
  toggleNote() { this.noteExpanded = !this.noteExpanded; this.render(); },
  durTextShort(sec) { return durText(sec); },
  toggleSymptom(t) {
    let tags = this.recordForm.symptomTags;
    if (t === '无') {
      // 选「无」即清空其它症状；再次点「无」则取消
      this.recordForm.symptomTags = tags.includes('无') ? [] : ['无'];
    } else {
      const i = tags.indexOf(t);
      if (i > -1) tags.splice(i, 1); else tags.push(t);
      // 选了真实症状则移除「无」
      const j = tags.indexOf('无');
      if (j > -1) tags.splice(j, 1);
    }
    this.render();
  },
  pickMood(m) { this.recordForm.mood = m; this.render(); },
  pickAmount(a) { this.recordForm.amount = a; this.render(); },
  pickColor(c) { this.recordForm.color = c; this.render(); },
  submitRecord() {
    const f = this.recordForm;
    DB.records.push({
      id: 'r' + Date.now(), date: f.date, time: f.time,
      timestamp: new Date(f.date + 'T' + f.time + ':00').getTime(),
      bristolType: f.bristolType, durationSec: f.durationSec,
      color: f.color, amount: f.amount, symptomTags: f.symptomTags.slice(), mood: f.mood, note: f.note
    });
    DB.users.totalRecords = DB.records.length;
    DB.users.streakDays = calcStreak();
    saveDB();
    toast('已记录，数据已保存');
    // 提交后复原所有选择为默认（Bristol=4 / 5分钟 / 当前时间 / 量=中 / 颜色=棕 / 症状=无 / 心情=正常）
    this.recordForm = {
      date: todayStr(), time: fmtHM(new Date()),
      bristolType: 4, durationSec: 300, color: '棕', amount: '中',
      symptomTags: ['无'], mood: '正常', note: ''
    };
    this.noteExpanded = false;
    this.go('stats');
  },

  /* ================= 统计 ================= */
  statsData(period) {
    const isWeek = period !== 'month';
    const days = isWeek ? currentWeekDays() : (() => {
      const now = new Date(); const y = now.getFullYear(), mo = now.getMonth();
      const dim = new Date(y, mo + 1, 0).getDate(); const a = [];
      for (let dnum = 1; dnum <= dim; dnum++) { a.push(fmtDate(new Date(y, mo, dnum))); }
      return a;
    })();
    const list = DB.records.filter((r) => days.includes(r.date));
    const byDay = {};
    list.forEach((r) => { byDay[r.date] = (byDay[r.date] || 0) + 1; });
    const bars = days.map((d) => {
      const c = byDay[d] || 0;
      const dayLabel = isWeek ? WEEK[new Date(d + 'T00:00:00').getDay()] : String(Number(d.slice(8, 10)));
      const ctxLabel = isWeek ? ('周' + dayLabel) : d.slice(5);
      return { date: d, day: dayLabel, count: c, h: Math.max(8, Math.min(80, c * 34)), hot: c >= 2, tipLabel: ctxLabel + ' · ' + c + '次' };
    });
    const total = list.length;
    const durList = list.filter((r) => r.durationSec > 0);
    const avgSec = durList.length ? durList.reduce((s, r) => s + r.durationSec, 0) / durList.length : 0;
    const ideal = list.filter((r) => r.bristolType === 4).length;
    const dist = BRISTOL.map((b) => {
      const c = list.filter((r) => r.bristolType === b.type).length;
      return { ...b, count: c, pct: total ? Math.round(c / total * 100) : 0, color: BRISTOL_COLORS[b.type] };
    });
    const symMap = {};
    list.forEach((r) => r.symptomTags.forEach((t) => { symMap[t] = (symMap[t] || 0) + 1; }));
    const symptoms = Object.keys(symMap).map((k) => ({ name: k, count: symMap[k] })).sort((a, b) => b.count - a.count).slice(0, 5);
    return { total, avgPerDay: (total / (isWeek ? 7 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())).toFixed(1), avgDur: avgSec ? (avgSec / 60).toFixed(1) + ' 分钟' : '—', idealPct: total ? Math.round(ideal / total * 100) + '%' : '0%', bars, dist, symptoms };
  },
  statsPeriod: 'week',
  renderStats() {
    const d = this.statsData(this.statsPeriod);
    const legendHtml = d.dist.map((b) =>
      '<div class="legend-item"><span class="legend-dot" style="background:' + b.color + '"></span>' +
      '<span class="legend-name">' + b.name + '</span>' +
      '<span class="legend-pct">' + b.pct + '%</span></div>').join('');
    return '' +
      '<div class="seg"><div class="seg-item ' + (this.statsPeriod === 'week' ? 'on' : '') + '" onclick="App.switchPeriod(\'week\')">本周</div>' +
      '<div class="seg-item ' + (this.statsPeriod === 'month' ? 'on' : '') + '" onclick="App.switchPeriod(\'month\')">本月</div></div>' +
      '<div class="metric-grid">' +
        '<div class="metric"><div class="metric-label">记录次数</div><div class="metric-num">' + d.total + '</div></div>' +
        '<div class="metric"><div class="metric-label">日均次数</div><div class="metric-num">' + d.avgPerDay + '</div></div>' +
        '<div class="metric"><div class="metric-label">平均时长</div><div class="metric-num small">' + d.avgDur + '</div></div>' +
        '<div class="metric"><div class="metric-label">理想型占比</div><div class="metric-num small">' + d.idealPct + '</div></div>' +
      '</div>' +
      '<div class="card flat"><div class="trend-head"><span class="card-title">每日次数</span>' +
        '<span class="trend-tag" onclick="App.push(\'history\')" style="color:#34C759;cursor:pointer">明细 ›</span></div>' +
        '<div class="trend-hint">轻点折线可查看某一天的次数（默认高亮今天）</div>' +
        '<canvas id="trendCanvas" class="chart-canvas trend"></canvas></div>' +
      '<div class="card flat"><div class="card-title">Bristol 类型分布</div>' +
        '<div class="ring-wrap"><canvas id="ringCanvas" class="ring-canvas"></canvas>' +
        '<div class="ring-legend">' + legendHtml + '</div></div></div>' +
      '<div class="card flat"><div class="card-title">高频症状</div>' +
        (d.symptoms.length
          ? '<div class="chip-row">' + d.symptoms.map((s) => '<span class="chip">' + s.name + ' ×' + s.count + '</span>').join('') + '</div>'
          : '<div class="empty">本周期暂无症状记录</div>') + '</div>';
  },
  /* ================= 肠道周报 ================= */
  reportData() {
    const weekDayStrs = currentWeekDays(); // 字符串数组 YYYY-MM-DD（与 r.date 同格式）
    const daySet = new Set(weekDayStrs);
    const records = DB.records.filter((r) => daySet.has(r.date));
    // buildWeekReport 内部用 Date 方法（getDay/getMonth），需转成 Date 对象
    const weekDays = weekDayStrs.map((s) => new Date(s + 'T00:00:00'));
    return buildWeekReport(records, { weekDays, streak: calcStreak() });
  },
  renderReport() {
    const r = this.reportData();
    const distHtml = r.bristolDist.length
      ? r.bristolDist.map((b) =>
        '<div class="dist-row"><span class="dot" style="background:' + b.color + '"></span>' +
        '<span class="dist-name">' + b.name + '</span>' +
        '<span class="dist-bar"><span class="dist-fill" style="width:' + b.pct + '%;background:' + b.color + '"></span></span>' +
        '<span class="dist-pct">' + b.pct + '%</span></div>').join('')
      : '<div class="empty">本周还没有记录，去打卡解锁吧 💩</div>';
    const symHtml = r.symptomTop.length
      ? r.symptomTop.map((s) => '<div class="tag-row"><span class="tag">' + s.name + '</span><span class="tag-count">' + s.count + ' 次</span></div>').join('')
      : '<div class="empty small">无异常，状态轻松 👍</div>';
    const moodHtml = r.moodAgg.length
      ? r.moodAgg.map((m) => '<div class="tag-row"><span class="tag">' + m.name + '</span><span class="tag-count">' + m.pct + '%</span></div>').join('')
      : '<div class="empty small">—</div>';
    const weekHtml = r.weekDots.map((d) =>
      '<div class="wday ' + (d.recorded ? 'on' : '') + '"><span class="wemoji">' + d.emoji + '</span><span class="wlabel">' + d.label + '</span></div>').join('');
    const tipHtml = r.tips.map((t) => '<div class="tip"><span class="tip-dot">·</span><span class="tip-text">' + t + '</span></div>').join('');
    return '' +
      '<div class="card hero rp-hero">' +
        '<div class="hero-range">' + r.rangeLabel + ' · 本周</div>' +
        '<div class="hero-grade">' + r.grade.emoji + '</div>' +
        '<div class="ring"><div class="ring-in">' +
          '<div class="hero-score">' + r.score + '<span class="hero-score-unit">分</span></div>' +
          '<div class="hero-score-cap">肠道得分</div>' +
        '</div></div>' +
        '<div class="hero-title">' + r.grade.title + '</div>' +
        '<div class="hero-comment">' + r.comment + '</div>' +
      '</div>' +
      '<div class="card metrics-card"><div class="metrics">' +
        '<div class="metric"><div class="metric-num">' + r.daysRecorded + '<span class="metric-unit">/7</span></div><div class="metric-label">打卡天数</div></div>' +
        '<div class="metric"><div class="metric-num">' + r.avgDurText + '</div><div class="metric-label">平均时长</div></div>' +
        '<div class="metric"><div class="metric-num">' + r.idealPct + '%</div><div class="metric-label">理想占比</div></div>' +
        '<div class="metric"><div class="metric-num">' + r.streak + '<span class="metric-unit">天</span></div><div class="metric-label">连续打卡</div></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-title"><span class="sec-ico">💩</span>便型偏好</div>' + distHtml + '</div>' +
      '<div class="cols"><div class="card col"><div class="card-title"><span class="sec-ico">💢</span>本周小状况</div>' + symHtml + '</div>' +
        '<div class="card col"><div class="card-title"><span class="sec-ico">😊</span>心情分布</div>' + moodHtml + '</div></div>' +
      '<div class="card"><div class="card-title"><span class="sec-ico">📅</span>一周打卡</div><div class="week">' + weekHtml + '</div></div>' +
      '<div class="card tips"><div class="card-title"><span class="sec-ico">💡</span>肠道小贴士</div>' + tipHtml + '</div>' +
      this.shareBlockHtml();
  },
  // 分享卡按需生成：未生成→按钮；生成中→loading；已生成→「查看分享卡」按钮
  shareBlockHtml() {
    if (!this.shareReady) {
      if (this.generating) {
        return '<div class="gen-loading"><div class="spinner"></div><div class="gen-loading-text">正在生成专属分享卡…</div></div>';
      }
      return '<button class="btn-gen" onclick="App.generateShare()"><span class="btn-gen-ico">🖼️</span>生成周报分享卡</button>';
    }
    return '<button class="btn-view" onclick="App.openOverlay()"><span class="btn-view-ico">🖼️</span>查看分享卡</button>';
  },
  // 全屏覆盖层（游戏抽卡式展示）
  shareOverlayHtml() {
    return '<div class="share-mask" onclick="App.closeOverlay()">' +
      '<div class="share-card-box" onclick="event.stopPropagation()">' +
        '<div class="share-close" onclick="App.closeOverlay()">×</div>' +
        '<div class="share-shine"></div>' +
        '<canvas id="shareCanvas" class="share-card-canvas"></canvas>' +
        '<button class="btn-save" onclick="App.saveReportCard()">保存图片到相册</button>' +
      '</div></div>';
  },
  // 点击生成：先显示 loading，短暂停顿后再以全屏覆盖层展示并绘制
  generateShare() {
    if (this.shareReady || this.generating) return;
    this.generating = true;
    this.render();
    setTimeout(() => {
      this.generating = false;
      this.shareReady = true;
      this.overlayOpen = true;
      this.render();
    }, 480);
  },
  // 重新打开已生成的分享卡（全屏覆盖层）
  openOverlay() {
    if (!this.shareReady || this.overlayOpen) return;
    this.overlayOpen = true;
    this.render();
  },
  // 关闭全屏覆盖层（保留已生成状态，可再次查看）
  closeOverlay() {
    this.overlayOpen = false;
    this.renderOverlay();
  },
  // 离开周报页：不保留分享卡状态，下次进入需重新生成
  resetReportShare() {
    this.shareReady = false;
    this.generating = false;
    this.overlayOpen = false;
  },
  saveReportCard() {
    const el = document.getElementById('shareCanvas');
    if (!el) return;
    try {
      const url = el.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = '肠道周报.png'; a.click();
      toast('已生成分享卡（演示下载）');
    } catch (e) { toast('生成失败'); }
  },

  switchPeriod(p) { this.statsPeriod = p; this.render(); },

  /* ================= 广场 ================= */
  renderCommunity() {
    const d = this.homeData();
    return '' +
      '<div class="community-hero"><div class="big">🎉</div>' +
        '<div class="t">本周打卡 ' + d.weekTotal + ' 次</div>' +
        '<div class="s">连续 ' + d.streak + ' 天 · 肠道规律看得见</div>' +
        '<button class="btn-primary" style="margin-top:14px;background:#fff;color:#2E9E4F" onclick="App.share()">把战绩分享给好友</button></div>' +
      '<div class="card" onclick="App.comingSoon()"><div class="card-title">🏆 好友打卡排行榜</div>' +
        '<div class="card-sub">和朋友一起比拼连续打卡天数</div><span style="float:right;color:#C7C7CC;font-size:20px">›</span></div>' +
      '<div class="card" onclick="App.comingSoon()"><div class="card-title">🌱 肠道知识科普</div>' +
        '<div class="card-sub">便秘、腹泻、饮食调理实用指南</div><span style="float:right;color:#C7C7CC;font-size:20px">›</span></div>' +
      '<div class="card" onclick="App.comingSoon()"><div class="card-title">🧪 趣味肠道测试</div>' +
        '<div class="card-sub">测测你的肠道年龄与健康指数</div><span style="float:right;color:#C7C7CC;font-size:20px">›</span></div>' +
      '<div class="card" style="background:#EAF6EC;text-align:center" onclick="App.go(\'record\')">' +
        '<span style="color:#2E9E4F;font-size:13px;font-weight:600">还没有记录？现在开始你的第一条 ›</span></div>';
  },
  comingSoon() { toast('该功能即将上线，敬请期待'); },

  /* ================= 我的 ================= */
  renderProfile() {
    const u = DB.users;
    const d = this.homeData();
    const todayCount = d.todayCount;
    return '' +
      '<div class="card flat"><div class="profile-head">' +
        '<div class="profile-avatar" onclick="App.editProfile()">' + (u.avatarUrl ? '<img src="' + u.avatarUrl + '">' : u.nickname[0]) + '</div>' +
        '<div class="profile-nick">' + u.nickname + '</div>' +
        '<button class="profile-edit" onclick="App.editProfile()">编辑昵称与头像</button></div>' +
        '<div class="mini-stat-row">' +
          '<div class="mini-stat"><div class="n">' + u.streakDays + '</div><div class="l">连续天数</div></div>' +
          '<div class="mini-stat"><div class="n">' + u.totalRecords + '</div><div class="l">累计记录</div></div>' +
          '<div class="mini-stat"><div class="n">' + todayCount + '</div><div class="l">今日</div></div>' +
        '</div></div>' +
      '<div class="card flat">' +
        '<div class="cell-row" onclick="App.push(\'guide\')"><span class="cell-label">新手引导</span><span class="cell-value">›</span></div>' +
        '<div class="cell-row" onclick="App.push(\'remind\')"><span class="cell-label">提醒设置</span><span class="cell-value">›</span></div>' +
        '<div class="cell-row" onclick="App.push(\'history\')"><span class="cell-label">历史记录</span><span class="cell-value">›</span></div>' +
        '<div class="cell-row" onclick="App.share()"><span class="cell-label">分享给好友</span><span class="cell-value">›</span></div>' +
        '<div class="cell-row" onclick="App.confirmReset()"><span class="cell-label">重置演示数据</span><span class="cell-value">›</span></div>' +
        '<div class="cell-row" onclick="App.about()"><span class="cell-label">关于与免责声明</span><span class="cell-value">›</span></div>' +
      '</div>';
  },
  editProfile() {
    openModal('编辑资料', '<input type="text" id="mp-nick" placeholder="输入昵称" value="' + DB.users.nickname + '">', [
      { text: '取消', cls: 'cancel' },
      { text: '保存', cls: 'ok', onClick: () => {
        const v = document.getElementById('mp-nick').value.trim() || '我';
        DB.users.nickname = v;
        saveDB(); toast('已保存'); this.render();
      } }
    ]);
    setTimeout(() => { const el = document.getElementById('mp-nick'); if (el) el.focus(); }, 100);
  },
  confirmReset() {
    openModal('重置演示数据', '将清空所有演示记录并重新生成近 7 天数据。', [
      { text: '取消', cls: 'cancel' },
      { text: '重置', cls: 'danger', onClick: () => { resetDB(); toast('已重置'); this.render(); } }
    ]);
  },
  about() {
    openModal('关于「嗯嗯日记」', '本小程序用于个人排便健康记录与习惯参考，所有数据仅作记录与趋势展示，不构成任何医疗建议。如有身体不适，请及时就医。', [
      { text: '知道了', cls: 'ok' }
    ]);
  },

  /* ================= 历史 ================= */
  renderHistory() {
    const sorted = DB.records.slice().sort((a, b) => b.timestamp - a.timestamp);
    // 按月份分组：key = 'YYYY-MM'
    const monthMap = {};
    const yearSet = {};
    sorted.forEach((r) => {
      const m = (r.date || '').slice(0, 7);
      if (!m) return;
      yearSet[m.slice(0, 4)] = true;
      (monthMap[m] = monthMap[m] || []).push(r);
    });
    const months = Object.keys(monthMap).sort().reverse();
    const years = ['全部'].concat(Object.keys(yearSet).sort().reverse());
    const sel = this.historyYear; // null = 全部

    if (!months.length) return '<div class="empty" style="padding:80px 0">📖 还没有记录，快去打卡吧</div>';

    const groups = months.map((m) => {
      const [y, mo] = m.split('-');
      return { key: m, year: y, mLabel: Number(mo) + '月', label: y + '年' + Number(mo) + '月', items: monthMap[m] };
    });
    const filtered = sel
      ? groups.filter((g) => g.year === sel).map((g) => ({ ...g, label: g.mLabel }))
      : groups;
    const total = filtered.reduce((s, g) => s + g.items.length, 0);

    const yearBar = '<div class="hist-years">' + years.map((y) =>
      '<span class="hist-year ' + ((sel || '全部') === y ? 'on' : '') + '" onclick="App.setHistoryYear(\'' + (y === '全部' ? '' : y) + '\')">' + y + '</span>').join('') + '</div>';

    const groupsHtml = filtered.map((g) => {
      const collapsed = this.historyCollapsed[g.key];
      const rows = collapsed ? '' : g.items.map((r) =>
        '<div class="list-row" onclick="App.showDetail(\'' + r.id + '\')">' +
        '<span class="row-time">' + r.time + '</span>' +
        '<div class="row-body"><span class="row-bristol">' + r.bristolType + ' 型</span>' +
        '<span class="row-dur">' + durText(r.durationSec) + '</span></div>' +
        '<span class="row-arrow">›</span></div>').join('');
      return '<div class="list-group' + (collapsed ? ' collapsed' : '') + '">' +
        '<div class="group-head" onclick="App.toggleHistoryGroup(\'' + g.key + '\')">' +
        '<span class="group-date">' + g.label + '</span>' +
        '<span class="group-right"><span class="group-count">' + g.items.length + ' 次</span>' +
        '<span class="group-toggle' + (collapsed ? ' collapsed' : '') + '"></span></span></div>' +
        rows + '</div>';
    }).join('');

    return yearBar +
      '<div class="hist-total">共 ' + total + ' 条记录</div>' +
      '<div class="hist-list">' + groupsHtml + '<div class="list-bottom">没有更多了</div></div>';
  },
  setHistoryYear(y) { this.historyYear = y || null; this.render(); },
  toggleHistoryGroup(key) { this.historyCollapsed[key] = !this.historyCollapsed[key]; this.render(); },
  showDetail(id) {
    const r = DB.records.find((x) => x.id === id);
    if (!r) return;
    const b = BRISTOL.find((x) => x.type === r.bristolType);
    const bc = (b && BRISTOL_COLORS[b.type]) || '#34C759';
    const tags = (r.symptomTags && r.symptomTags.length)
      ? r.symptomTags.map((t) => '<span class="d-tag">' + t + '</span>').join('')
      : '<span class="d-empty">无</span>';
    const note = r.note ? '<div class="d-note">' + esc(r.note) + '</div>' : '<div class="d-note d-empty">无备注</div>';
    const body =
      '<div class="d-hero" style="background:' + bc + '18">' +
        '<div class="d-badge" style="background:' + bc + '">' + r.bristolType + '</div>' +
        '<div class="d-hero-info"><div class="d-name">' + (b ? b.name : '未知') + '</div>' +
        '<div class="d-desc">' + (b ? b.desc : '') + '</div></div>' +
      '</div>' +
      '<div class="d-when">' + r.date + ' ' + r.time + '</div>' +
      '<div class="d-grid">' +
        '<div class="d-cell"><span>时长</span><b>' + durText(r.durationSec) + '</b></div>' +
        '<div class="d-cell"><span>量</span><b>' + (r.amount || '未记录') + '</b></div>' +
        '<div class="d-cell"><span>颜色</span><b>' + (r.color || '未记录') + '</b></div>' +
        '<div class="d-cell"><span>心情</span><b>' + (r.mood || '未记录') + '</b></div>' +
      '</div>' +
      '<div class="d-sec"><div class="d-sec-title">症状</div><div class="d-tags">' + tags + '</div></div>' +
      '<div class="d-sec"><div class="d-sec-title">备注</div>' + note + '</div>';
    openModal('记录详情', body, [
      { text: '删除', cls: 'danger', onClick: () => {
        DB.records = DB.records.filter((x) => x.id !== id);
        DB.users.totalRecords = DB.records.length;
        saveDB(); toast('已删除'); this.render();
      } },
      { text: '关闭', cls: 'ok' }
    ]);
  },

  /* ================= 提醒 ================= */
  renderRemind() {
    const r = DB.reminders;
    const days = [1, 2, 3, 4, 5, 6, 0].map((k) =>
      '<div class="day-chip ' + (r.repeatDays.includes(k) ? 'on' : '') + '" onclick="App.toggleDay(' + k + ')">' + WEEK[k] + '</div>').join('');
    return '' +
      '<div class="card flat">' +
        '<div class="cell-row"><span class="cell-label">开启提醒</span>' +
        '<div class="switch ' + (r.enabled ? 'on' : '') + '" onclick="App.remindSwitch()"><div class="knob"></div></div></div>' +
        '<div class="cell-row"><span class="cell-label">提醒时间</span>' +
        '<input type="time" value="' + r.time + '" style="width:110px;text-align:right" onchange="App.remindTime=this.value"></div>' +
      '</div>' +
      '<div class="card flat"><div class="card-title" style="margin-bottom:12px">重复周期</div>' +
        '<div class="days">' + days + '</div></div>' +
      '<div class="card flat"><div class="card-title" style="margin-bottom:8px">推送方式</div>' +
        '<div class="card-sub">提醒将通过微信「服务通知」推送（演示版仅保存设置）。</div></div>' +
      '<button class="btn-primary" onclick="App.saveRemind()">保存设置</button>' +
      '<div class="note">⚠️ 演示版提醒仅保存在本地，正式版需接入微信订阅消息。</div>';
  },
  remindTime: '08:00',
  remindSwitch() { DB.reminders.enabled = !DB.reminders.enabled; saveDB(); this.render(); },
  toggleDay(k) {
    const i = DB.reminders.repeatDays.indexOf(k);
    i > -1 ? DB.reminders.repeatDays.splice(i, 1) : DB.reminders.repeatDays.push(k);
    saveDB(); this.render();
  },
  saveRemind() {
    DB.reminders.time = this.remindTime || DB.reminders.time;
    saveDB();
    toast('已保存');
    this.back();
  },

  /* ================= 引导 ================= */
  guideActive: 4,
  faqOpen: 0,
  renderGuide() {
    const bristolHtml = BRISTOL.map((b) =>
      '<div class="guide-item" onclick="App.guideActive=' + b.type + ';App.render()">' +
      '<div class="g-badge">' + b.type + '</div><div class="g-info"><div class="g-name">' + b.name + '</div>' +
      (this.guideActive === b.type ? '<div class="g-desc">' + b.desc + '</div>' : '') + '</div>' +
      '<span class="g-arrow">›</span></div>').join('');
    const faq = [
      { q: '为什么要记录排便？', a: '排便习惯是肠道健康的晴雨表。连续记录可以发现频率、形态、时间的变化规律，及时察觉异常。' },
      { q: 'Bristol 分型是什么？', a: '医学上常用的粪便形态分类（1-7 型）。4 型是理想状态；1-2 型偏便秘，6-7 型偏腹泻。' },
      { q: '多久一次算正常？', a: '正常范围是每天 3 次到每周 3 次，个体差异大。更重要的是你自己的规律是否稳定。' },
      { q: '数据会泄露吗？', a: '记录默认仅自己可见（云数据库「仅创建者可读写」），分享的内容才对外可见。' },
      { q: '这是医疗建议吗？', a: '不是。本小程序仅作记录与参考，不构成诊断或治疗建议。持续异常请及时就医。' }
    ];
    const faqHtml = faq.map((f, i) =>
      '<div class="faq-item"><div class="faq-q" onclick="App.faqOpen=' + i + ';App.render()">' +
      '<span>' + f.q + '</span><span style="color:#C7C7CC">' + (this.faqOpen === i ? '▾' : '▸') + '</span></div>' +
      (this.faqOpen === i ? '<div class="faq-a">' + f.a + '</div>' : '') + '</div>').join('');
    return '' +
      '<div class="card flat" style="background:#34C759;color:#fff;text-align:center">' +
        '<div style="font-size:17px;font-weight:700">看懂你的每一次「嗯嗯」</div>' +
        '<div style="font-size:12px;opacity:.85;margin-top:6px">3 分钟学会用 Bristol 分型读懂肠道信号</div>' +
        '<button class="btn-primary" style="margin-top:14px;background:#fff;color:#2E9E4F" onclick="App.go(\'record\')">去记录一次</button></div>' +
      '<div class="card flat"><div class="card-title" style="margin-bottom:6px">Bristol 大便分型（1-7）</div>' + bristolHtml + '</div>' +
      '<div class="card flat"><div class="card-title" style="margin-bottom:6px">常见问题</div>' + faqHtml + '</div>' +
      '<div class="note">⚠️ 本小程序数据仅作记录与参考，不构成医疗建议。持续异常请及时就医。</div>';
  }

});
