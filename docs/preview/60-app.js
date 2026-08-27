/* =====================================================================
 * 60-app.js — App 核心（路由 / 渲染调度 / 状态）
 * var App = { ... } 定义应用对象：页面栈、导航栏与 tabbar 渲染、render() 分发、全屏分享卡覆盖层、homeData。页面方法在 70-pages.js 通过 Object.assign 挂载。本文件只定义对象，不在加载时启动（启动见 80-bootstrap.js）。
 * ===================================================================== */

var App = {
  tab: 'home',
  stack: [],          // 子页栈（history/remind/guide）
  recordForm: null,
  durationPresets: DURATION_PRESETS,
  historyYear: null,   // null = 全部；否则 'YYYY'
  historyCollapsed: {}, // 收起的月份：{ 'YYYY-MM': true }
  noteExpanded: false,
  shareReady: false,   // 分享卡是否已生成
  generating: false,   // 是否正在生成分享卡
  overlayOpen: false,  // 分享卡是否以全屏覆盖层展示

  init() {
    loadDB();
    this.recordForm = {
      date: todayStr(), time: fmtHM(new Date()),
      bristolType: 4, durationSec: 300, color: '棕', amount: '中',
      symptomTags: ['无'], mood: '正常', note: ''
    };
    this.renderNav();
    this.renderTabbar();
    this.render();
    setInterval(() => { document.getElementById('sb-time').textContent = fmtHM(new Date()); }, 30000);
  },

  go(tab) {
    this.resetReportShare();
    this.stack = [];
    this.tab = tab;
    this.renderNav();
    this.render();
    this.resetScroll();
  },
  // 本周趋势 → 统计页并定位到「本周」tab
  goStatsWeek() { this.statsPeriod = 'week'; this.go('stats'); },

  push(page) {
    this.resetReportShare();
    this.stack.push(page);
    this.renderNav();
    this.render();
    this.resetScroll();
  },
  back() {
    this.resetReportShare();
    this.stack.pop();
    this.renderNav();
    this.render();
    this.resetScroll();
  },

  currentPage() { return this.stack.length ? this.stack[this.stack.length - 1] : this.tab; },

  resetScroll() {
    const page = document.getElementById('page');
    if (page) page.scrollTop = 0;
  },

  renderNav() {
    const nav = document.getElementById('navbar');
    const page = this.currentPage();
    const sub = this.stack.length > 0;
    const centered = page !== 'home';
    nav.className = 'navbar' + (centered ? ' centered' : '');
    if (sub) {
      const titles = { history: '历史记录', remind: '提醒设置', guide: '新手引导', report: '肠道周报' };
      nav.innerHTML = '<div class="nav-left"><button class="nav-back" onclick="App.back()">‹ 返回</button></div>' +
        '<div class="nav-title" style="font-size:18px">' + titles[page] + '</div><div class="nav-actions"></div>';
      return;
    }
    if (page === 'home') {
      nav.innerHTML = '<div><div class="nav-title">嗯嗯日记</div><div class="nav-date">' + cnToday() + '</div></div>' +
        '<div class="nav-actions">' +
        '<button class="circle-btn" onclick="App.share()">↗</button>' +
        '<div class="avatar" onclick="App.go(\'profile\')">' + avatarHtml() + '</div></div>';
    } else if (page === 'stats') {
      nav.innerHTML = '<div class="nav-title" style="font-size:24px">统计</div><div class="nav-actions"></div>';
    } else if (page === 'community') {
      nav.innerHTML = '<div class="nav-title" style="font-size:24px">广场</div><div class="nav-actions"></div>';
    } else if (page === 'profile') {
      nav.innerHTML = '<div class="nav-title" style="font-size:24px">我的</div><div class="nav-actions"></div>';
    } else if (page === 'record') {
      nav.innerHTML = '<div class="nav-title" style="font-size:24px">记录</div><div class="nav-actions"></div>';
    }
  },

  renderTabbar() {
    const el = document.getElementById('tabbar');
    if (this.stack.length) { el.innerHTML = ''; return; }
    const tabs = [
      { k: 'home', ic: '🏠', t: '首页' },
      { k: 'record', ic: '➕', t: '记录' },
      { k: 'stats', ic: '📊', t: '统计' },
      { k: 'community', ic: '👥', t: '广场' },
      { k: 'profile', ic: '👤', t: '我的' }
    ];
    el.innerHTML = tabs.map((t) =>
      '<button class="tab ' + (this.tab === t.k ? 'active' : '') + '" onclick="App.go(\'' + t.k + '\')">' +
      '<span class="ic">' + t.ic + '</span><span>' + t.t + '</span></button>').join('');
  },

  render() {
    const page = document.getElementById('page');
    const p = this.currentPage();
    page.innerHTML = this[this.renderMap[p]]();
    this.afterRender(p);
    this.renderOverlay();
  },

  // 管理全屏分享卡覆盖层（仅在 overlayOpen 且已生成时挂载并绘制）
  renderOverlay() {
    const root = document.getElementById('overlayRoot');
    if (!root) return;
    if (this.overlayOpen && this.shareReady) {
      root.innerHTML = this.shareOverlayHtml();
      const r = this.reportData();
      drawCanvas2D('shareCanvas', (ctx, w, h) => drawReportCard(ctx, w, h, r));
    } else {
      root.innerHTML = '';
    }
  },

  afterRender(page) {
    if (page === 'stats') {
      renderStatsCharts();
      const tc = document.getElementById('trendCanvas');
      if (tc) {
        tc.onclick = (e) => {
          const cfg = App._trendCfg;
          if (!cfg || !App._trendGeo) return;
          const rect = tc.getBoundingClientRect();
          const x = e.clientX - rect.left; // 相对画布
          let best = 0, bd = 1e9;
          App._trendGeo.points.forEach((p, i) => {
            const dd = Math.abs(p.x - x);
            if (dd < bd) { bd = dd; best = i; }
          });
          App.trendTipIndex = best;
          drawTrendCanvas();
        };
      }
    }
  },

  share() {
    toast('已复制分享卡片（演示）— 正式版调用微信分享');
  },

  /* ================= 首页 ================= */
  renderMap: { home: 'renderHome', record: 'renderRecord', stats: 'renderStats', community: 'renderCommunity', profile: 'renderProfile', history: 'renderHistory', remind: 'renderRemind', guide: 'renderGuide', report: 'renderReport' },

  homeData() {
    const records = DB.records;
    const days = currentWeekDays(); // 本周一~周日
    const byDay = {};
    records.forEach((r) => { byDay[r.date] = (byDay[r.date] || 0) + 1; });
    const bars = days.map((d, i) => {
      const c = byDay[d] || 0;
      return { date: d, day: WEEK[new Date(d + 'T00:00:00').getDay()], count: c, h: Math.max(8, Math.min(80, c * 34)), hot: c >= 2 };
    });
    const todayCount = byDay[todayStr()] || 0;
    const weekTotal = records.filter((r) => days.includes(r.date)).length;
    const streak = calcStreak();
    return { days, bars, todayCount, weekTotal, streak, total: DB.records.length, avgPerDay: (weekTotal / 7).toFixed(1) };
  }
};
