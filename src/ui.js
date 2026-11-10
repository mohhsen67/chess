(function () {
  var fa = Analyze.fa;
  var GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  var PNAME = { K: 'شاه', Q: 'وزیر', R: 'رخ', B: 'فیل', N: 'اسب', P: 'سرباز' };
  var app = document.getElementById('app');
  var S = {
    rep: null, view: 'report', filter: 'all', weakFilter: null,
    gid: null, gview: false, page: 0, imode: 'auto', ply: -1, ti: 0, tsel: null, tfb: null, tdone: false, tcache: {}, user: '', importMsg: null
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(x) { return fa(Math.round(x * 100)) + '٪'; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function forget(k) { try { localStorage.removeItem(k); } catch (e) { } }
  function faDate(d) {
    var m = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(d || '');
    if (!m) return '';
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' }); } catch (e) { return d; }
  }
  var RES = { W: 'برد', L: 'باخت', D: 'مساوی' };
  var TERM = { time: 'روی زمان', mate: 'با مات', resign: 'با انصراف', draw: 'مساوی', abandon: 'ترک بازی', other: '' };
  var PHASE = { opening: 'گشایش', middlegame: 'وسط بازی', endgame: 'آخر بازی' };

  var ICON = {
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
    first: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6l-6 6 6 6M7 5v14"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    last: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l6 6-6 6M17 5v14"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/></svg>',
    no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    think: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".3"/><path d="M12 3a9 9 0 0 1 9 9"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>'
  };


  var WICON = {
    blunder: ['t-purple', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5a2.6 2.6 0 0 1 1.7 4.6c1.3.6 2.2 1.8 2.2 3.3H8.1c0-1.5.9-2.7 2.2-3.3A2.6 2.6 0 0 1 12 3.5z"/><path d="M9.7 11.4 8.8 17h6.4l-.9-5.6M6.8 20.5h10.4"/></svg>'],
    time: ['t-amber', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.8l2.4 2.2M9.5 2.8h5"/></svg>'],
    convert: ['t-blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l6 6 4-4 7.5 7.5"/><path d="M21 11v6h-6"/></svg>'],
    opening: ['t-teal', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2z"/><path d="M12 6.5v13"/></svg>']
  };
  var ROOK = '<svg viewBox="6 4.5 20 21" aria-hidden="true"><path d="M10 7h2.6v2.4h2.1V7h2.6v2.4h2.1V7H22v5l-2.4 2.2v6.3H22V24H10v-3.5h2.4v-6.3L10 12z" fill="currentColor"/></svg>';
  var RTONE = { W: 't-teal', L: 't-red', D: 't-gray' };
  function wtile(id, sm) { var w = WICON[id] || WICON.blunder; return '<span class="tile' + (sm ? ' sm' : '') + ' ' + w[0] + '">' + w[1] + '</span>'; }

  function ringSVG(v, col) {
    var r = 50, c = 2 * Math.PI * r, d = Math.max(0, Math.min(1, v)) * c;
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#26344F" stroke-width="9"/>' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + d.toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 60 60)"/></svg>';
  }
  function tickSVG(results) {
    var n = results.length, s = '<svg viewBox="0 0 120 120" aria-hidden="true">';
    var w = Math.max(2.2, Math.min(7, 2 * Math.PI * 49 / Math.max(n, 1) * 0.55));
    var col = { W: '#4CD4A8', L: '#F05A6E', D: '#93A0B8' };
    results.forEach(function (r, i) {
      var a = (-90 + i * 360 / n) * Math.PI / 180;
      var x1 = 60 + 43 * Math.cos(a), y1 = 60 + 43 * Math.sin(a), x2 = 60 + 54 * Math.cos(a), y2 = 60 + 54 * Math.sin(a);
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col[r] + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round"/>';
    });
    return s + '</svg>';
  }
  function scoreCol(v) { return v >= 0.55 ? '#4CD4A8' : v < 0.45 ? '#F05A6E' : '#B9A6FF'; }

  // ---------- data ----------
  function load(text, user) {
    var games;
    try { games = Chess.parsePGN(text); } catch (e) { games = []; }
    if (!games.length) return { error: 'هیچ بازی‌ای در این متن پیدا نشد. مطمئن شو فایل PGN است.' };
    var rep = Analyze.run(games, user);
    if (!rep.games.length) return { error: 'بازی‌ها خوانده شد، ولی نام کاربری «' + user + '» در هیچ‌کدام نبود.' };
    S.rep = rep; S.gid = null; S.ply = -1; S.ti = 0; S.tsel = null; S.tfb = null; S.tdone = false; S.tcache = {};
    S.weakFilter = null; S.filter = 'all';
    return { ok: true, n: rep.games.length, skipped: games.length - rep.games.length };
  }

  // ---------- board ----------
  function boardHTML(s, o) {
    o = o || {};
    var flip = !!o.flip, html = '', clickable = !!o.click;
    for (var vr = 0; vr < 8; vr++) {
      for (var vf = 0; vf < 8; vf++) {
        var r = flip ? vr : 7 - vr, f = flip ? 7 - vf : vf, i = r * 8 + f;
        var p = s.b[i], dark = (f + r) % 2 === 0;
        var cls = 'sq' + (dark ? ' d' : '');
        if (o.hl && o.hl.indexOf(i) >= 0) cls += o.bad ? ' bad' : ' hl';
        if (o.sel === i) cls += ' sel';
        if (o.tgts && o.tgts.indexOf(i) >= 0) cls += ' tgt' + (p ? ' cap' : '');
        var inner = '';
        if (p) inner += '<span class="' + (Chess.isW(p) ? 'pw' : 'pb') + '" aria-hidden="true">' + GLYPH[p.toUpperCase()] + '︎</span>';
        if (vr === 7) inner += '<span class="coord f" aria-hidden="true">' + 'abcdefgh'[f] + '</span>';
        if (vf === 0) inner += '<span class="coord r" aria-hidden="true">' + (r + 1) + '</span>';
        var label = Chess.sqName(i) + (p ? ' ' + PNAME[p.toUpperCase()] + ' ' + (Chess.isW(p) ? 'سفید' : 'سیاه') : '');
        if (clickable) html += '<button type="button" class="' + cls + '" data-sq="' + i + '" aria-label="' + label + '">' + inner + '</button>';
        else html += '<div class="' + cls + '">' + inner + '</div>';
      }
    }
    return '<div class="board"' + (clickable ? ' role="grid" aria-label="صفحه‌ی تمرین"' : ' role="img" aria-label="صفحه‌ی شطرنج"') + '>' + html + '</div>';
  }

  // ---------- views ----------
  function head(title, extra) { return '<div class="vh"><h1>' + title + '</h1>' + (extra || '') + '</div>'; }
  var EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
  function userChip() {
    return '<a class="uchip" href="#import" aria-label="تغییر بازی‌ها"><span class="mono">' + esc(S.rep.user) + '</span><span>· ' + fa(S.rep.games.length) + ' بازی</span>' + EDIT + '</a>';
  }

  function autoBlock() {
    return '<div class="field"><label for="uname">نام کاربری تو در Chess.com یا Lichess</label><input id="uname" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="username" value="' + esc(S.user || '') + '"></div>' +
      '<div class="actions"><button type="button" class="btn primary" id="auto-cc">دریافت از Chess.com</button><button type="button" class="btn" id="auto-li">دریافت از Lichess</button></div>' +
      '<p class="fine" id="auto-msg" role="status"></p>';
  }

  function viewWelcome() {
    var h = '<section class="welcome"><div class="card wcard"><div class="wm-head"><span class="tile t-purple">' + ROOK + '</span><p class="eyebrow" style="color:var(--accent)">شطرنج</p></div>';
    h += '<h1>ضعف‌های تکراری بازی‌ات را پیدا کن</h1>';
    h += '<p class="lead">نام کاربری‌ات را بنویس. شطرنج بازی‌های دو ماه اخیرت را می‌خواند و نشان می‌دهد بیشتر کجا امتیاز از دست می‌دهی.</p>';
    h += autoBlock();
    h += '<a class="fine" href="#import">یا فایل PGN را دستی وارد کن</a></div>';
    h += '<div class="feat">';
    [['blunder', 'گزارش', 'ضعف اصلی و الگوهای تکراری تو'], ['opening', 'بازی‌ها', 'مرور حرکت به حرکت، با اشتباه‌های مشخص'], ['time', 'تمرین', 'موقعیت‌هایی از بازی‌های خودت']].forEach(function (f) {
      h += '<div class="frow">' + wtile(f[0], true) + '<div><b>' + f[1] + '</b><span>' + f[2] + '</span></div></div>';
    });
    h += '</div></section>';
    return h;
  }

  function reportCards() {
    var R = S.rep, w = R.weaknesses, top = w[0], n = R.games.length, t = R.tot, cards = [];
    var c = '<div class="wm-head">' + wtile(top.id) + '<p class="eyebrow">ضعف اصلی تو</p></div><h1>' + esc(top.title) + '</h1><p class="detail">' + esc(top.detail) + '</p>';
    c += '<div class="meter"><div class="track"><div class="fill" style="width:' + Math.round(top.share * 100) + '%"></div></div><span>' + fa(top.count) + ' از ' + fa(top.of) + (top.id === 'opening' ? ' بازی' : top.id === 'convert' ? ' بازیِ نبرده' : ' باخت') + '</span></div>';
    c += '<div class="tip">' + ICON.bulb + '<span>' + esc(top.tip) + '</span></div>';
    c += '<div class="stack"><a class="btn primary" href="#train">تمرین روی اشتباه‌های خودت</a><button type="button" class="btn ghost" data-weak="' + top.id + '">دیدن این بازی‌ها</button></div>';
    cards.push(['weak-main', 'ضعف اصلی', c]);

    var chrono = R.games.slice().reverse().slice(-60).map(function (g) { return g.res; });
    var nB = R.col.b.W + R.col.b.D + R.col.b.L, nWh = R.col.w.W + R.col.w.D + R.col.w.L;
    c = '<div class="ph"><h2>خلاصه</h2><p>' + fa(n) + ' بازی</p></div><div class="rings">';
    c += '<div class="ring"><div class="rv">' + ringSVG(R.scoreW, scoreCol(R.scoreW)) + '<div class="in"><small>با سفید</small><b>' + pct(R.scoreW) + '</b></div></div><span class="cap">' + fa(nWh) + ' بازی</span></div>';
    c += '<div class="ring"><div class="rv">' + tickSVG(chrono) + '<div class="in"><small>امتیاز کل</small><b>' + pct(R.score) + '</b></div></div><span class="cap">هر خط یک بازی</span></div>';
    c += '<div class="ring"><div class="rv">' + ringSVG(R.scoreB, scoreCol(R.scoreB)) + '<div class="in"><small>با سیاه</small><b>' + pct(R.scoreB) + '</b></div></div><span class="cap">' + fa(nB) + ' بازی</span></div></div>';
    c += '<div class="legend" style="justify-content:center"><span><i class="dot" style="background:var(--win)"></i>' + fa(t.W) + ' برد</span><span><i class="dot" style="background:var(--draw)"></i>' + fa(t.D) + ' مساوی</span><span><i class="dot" style="background:var(--loss)"></i>' + fa(t.L) + ' باخت</span></div>';
    var last = R.games[0];
    c += '<div class="kv">' + (last && last.myElo ? '<div><span>ریتینگ آخرین بازی</span><span class="mono">' + esc(last.myElo) + '</span></div>' : '') + '<div><span>اشتباه‌های مهره‌ای</span><span>' + fa(R.phase.opening + R.phase.middlegame + R.phase.endgame) + '</span></div></div>';
    cards.push(['', 'خلاصه', c]);

    if (w.length > 1) {
      c = '<div class="ph"><h2>الگوهای دیگر</h2><p>بزن تا بازی‌ها را ببینی</p></div><div>';
      w.slice(1).forEach(function (x) {
        c += '<button type="button" class="prow" data-weak="' + x.id + '">' + wtile(x.id, true) + '<span class="pt"><h3>' + esc(x.title) + '</h3><p>' + esc(x.detail) + '</p><span class="pbar"><span class="track"><span class="fill" style="display:block;width:' + Math.round(x.share * 100) + '%"></span></span><span>' + fa(x.count) + ' از ' + fa(x.of) + '</span></span></span></button>';
      });
      cards.push(['', 'الگوها', c + '</div>']);
    }

    c = '<div class="ph"><h2>گشایش‌ها</h2><p>امتیاز تو در هر گشایش</p></div><div>';
    R.openings.slice(0, 5).forEach(function (o) {
      var col = o.score >= 0.55 ? 'var(--win)' : o.score < 0.4 ? 'var(--loss)' : '#C4CCDC';
      c += '<div class="orow"><div class="on"><b>' + esc(o.name) + '</b><small>با ' + (o.color === 'w' ? 'سفید' : 'سیاه') + ' · ' + fa(o.n) + ' بازی</small></div><div class="os"><span>' + pct(o.score) + '</span><div class="track"><div class="fill" style="width:' + Math.round(o.score * 100) + '%;background:' + col + '"></div></div></div></div>';
    });
    cards.push(['', 'گشایش‌ها', c + '</div>']);

    var ph = R.phase, totB = ph.opening + ph.middlegame + ph.endgame;
    c = '<div class="ph"><h2>مدیریت زمان</h2><p>وقت باقی‌مانده در هر حرکت</p></div>';
    c += R.clockCurve ? clockChart(R.clockCurve) : '<p class="fine">این بازی‌ها زمان حرکت‌ها را ندارند.</p>';
    c += '<div class="phases">';
    ['opening', 'middlegame', 'endgame'].forEach(function (k) {
      c += '<div class="phase"><span>اشتباه در ' + PHASE[k] + '</span><b>' + fa(ph[k]) + '</b><span>' + (totB ? pct(ph[k] / totB) : '–') + '</span></div>';
    });
    c += '</div><p class="fine">«اشتباه» یعنی حرکتی که بعدش حداقل ۲ امتیاز مهره از دست رفت و جبران نشد.</p>';
    cards.push(['', 'زمان', c]);
    return cards;
  }

  function viewReport() {
    var cards = reportCards();
    if (S.page >= cards.length) S.page = 0;
    var h = '<div class="view">' + head('گزارش', userChip()) + '<div class="pager" id="pager">';
    cards.forEach(function (c, i) { h += '<section class="card pcard ' + c[0] + '" aria-label="' + c[1] + '">' + c[2] + '</section>'; });
    h += '</div><div class="dots" id="dots">';
    cards.forEach(function (c, i) { h += '<button type="button" data-page="' + i + '" aria-label="' + c[1] + '" aria-current="' + (i === S.page) + '"><i></i></button>'; });
    return h + '</div></div>';
  }

  function clockChart(cc) {
    var W = 600, H = 210, L = 40, Rr = 12, T = 14, B = 30, n = 40;
    function x(m) { return L + (W - L - Rr) * m / (n - 1); }
    function y(v) { return T + (H - T - B) * (1 - v); }
    function path(arr) {
      var d = '', on = false;
      arr.forEach(function (v, m) { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + x(m).toFixed(1) + ' ' + y(v).toFixed(1); on = true; });
      return d;
    }
    function lastPt(arr, col) {
      for (var m = arr.length - 1; m >= 0; m--) if (arr[m] != null) return '<circle cx="' + x(m).toFixed(1) + '" cy="' + y(arr[m]).toFixed(1) + '" r="4" fill="' + col + '"/>';
      return '';
    }
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" dir="ltr" role="img" aria-label="نمودار زمان باقی‌مانده در بردها و باخت‌ها">';
    [0, 0.5, 1].forEach(function (v) {
      s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#26344F"/>';
      s += '<text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fa(v * 100) + '٪</text>';
    });
    [1, 10, 20, 30, 40].forEach(function (m) { s += '<text x="' + x(m - 1) + '" y="' + (H - 8) + '" text-anchor="middle">' + fa(m) + '</text>'; });
    s += '<path d="' + path(cc.win) + '" fill="none" stroke="#4CD4A8" stroke-width="2.4" stroke-linejoin="round"/>';
    s += '<path d="' + path(cc.loss) + '" fill="none" stroke="#F05A6E" stroke-width="2.4" stroke-linejoin="round"/>';
    s += lastPt(cc.win, '#4CD4A8') + lastPt(cc.loss, '#F05A6E') + '</svg>';
    s += '<div class="legend"><span><i class="dot" style="background:var(--win)"></i>بردها</span><span><i class="dot" style="background:var(--loss)"></i>باخت‌ها</span><span>محور افقی: شماره‌ی حرکت</span></div>';
    return s;
  }

  function filteredGames() {
    var R = S.rep, list = R.games;
    if (S.weakFilter) {
      var w = R.weaknesses.filter(function (x) { return x.id === S.weakFilter; })[0];
      if (w) return list.filter(w.filter);
    }
    if (S.filter === 'L') return list.filter(function (x) { return x.res === 'L'; });
    if (S.filter === 'W') return list.filter(function (x) { return x.res === 'W'; });
    if (S.filter === 'blun') return list.filter(function (x) { return x.blunders.length; });
    return list;
  }

  function viewGames() {
    var R = S.rep, list = filteredGames();
    if (S.gid == null || !list.some(function (x) { return x.id === S.gid; })) { S.gid = list.length ? list[0].id : null; S.ply = -2; }
    var h = '<div class="gwrap' + (S.gview ? ' open' : '') + '"><section class="glistp" aria-label="فهرست بازی‌ها">' + head('بازی‌ها', '<span class="fine">' + fa(list.length) + ' بازی</span>') + '<div class="filters">';
    if (S.weakFilter) {
      var w = R.weaknesses.filter(function (x) { return x.id === S.weakFilter; })[0];
      h += '<button type="button" class="chip" aria-pressed="true" data-clearweak="1">' + esc(w ? w.title : '') + ' ×</button>';
    }
    [['all', 'همه'], ['L', 'باخت‌ها'], ['W', 'بردها'], ['blun', 'با اشتباه']].forEach(function (f) {
      h += '<button type="button" class="chip" data-filter="' + f[0] + '" aria-pressed="' + (!S.weakFilter && S.filter === f[0]) + '">' + f[1] + '</button>';
    });
    h += '</div><div class="glist" id="glist">';
    if (!list.length) h += '<p class="fine" style="text-align:center;padding:30px">بازی‌ای با این فیلتر نیست.</p>';
    list.forEach(function (x) {
      h += '<button type="button" class="gitem" data-gid="' + x.id + '" aria-current="' + (x.id === S.gid) + '"><span class="tile sm ' + RTONE[x.res] + '">' + ROOK + '</span>';
      h += '<span class="who"><b dir="auto">' + esc(x.opp) + (x.oppElo ? ' <span class="mono" style="color:var(--muted);font-size:12px">' + esc(x.oppElo) + '</span>' : '') + '</b><small>' + faDate(x.date) + ' | با ' + (x.me === 'w' ? 'سفید' : 'سیاه') + ' | <span dir="ltr">' + esc(x.opening) + '</span></small></span>';
      h += '<span class="meta"><span class="gres ' + x.res + '">' + RES[x.res] + '</span>' + (x.blunders.length ? '<span class="flag">' + fa(x.blunders.length) + ' اشتباه</span>' : '<span>' + fa(x.moves) + ' حرکت</span>') + '</span></button>';
    });
    h += '</div></section><section class="gview" aria-label="مرور بازی">' + viewer() + '</section></div>';
    return h;
  }

  function viewer() {
    var x = S.rep.games.filter(function (g) { return g.id === S.gid; })[0];
    if (!x) return '<div class="card fine" style="text-align:center">یک بازی انتخاب کن.</div>';
    var plies = x.g.plies;
    if (S.ply === -2) S.ply = x.blunders.length ? x.blunders[0].ply : plies.length - 1;
    var cur = S.ply, s = cur < 0 ? x.g.start : plies[cur].after;
    var bl = x.blunders.filter(function (b) { return b.ply === cur; })[0];
    var hl = cur >= 0 ? [plies[cur].from, plies[cur].to] : [];
    var term = x.res === 'D' ? 'مساوی' : RES[x.res] + (TERM[x.term] ? ' ' + TERM[x.term] : '');
    var h = '<div class="vtop"><button type="button" class="iconbtn back" data-back="1" aria-label="برگشت به فهرست">' + ICON.next + '</button>';
    h += '<div class="vt"><b><span class="pill ' + x.res + '">' + RES[x.res] + '</span><bdi>' + esc(x.opp) + '</bdi></b><small>با ' + (x.me === 'w' ? 'سفید' : 'سیاه') + ' · ' + term + ' · ' + faDate(x.date) + ' · <bdi>' + esc(x.opening) + '</bdi></small></div></div>';
    h += '<div class="bwrap" id="vboard" tabindex="0" aria-label="صفحه‌ی بازی؛ با کلیدهای جهت حرکت کن">' + boardHTML(s, { flip: x.me === 'b', hl: hl, bad: !!bl }) + '</div>';
    h += '<div class="ctrls"><button type="button" data-nav="first" aria-label="شروع بازی">' + ICON.first + '</button><button type="button" data-nav="prev" aria-label="حرکت قبل">' + ICON.prev + '</button><button type="button" data-nav="next" aria-label="حرکت بعد">' + ICON.next + '</button><button type="button" data-nav="last" aria-label="آخر بازی">' + ICON.last + '</button></div>';
    h += '<div class="matc">' + matChart(x, cur) + '</div>';
    h += '<div class="mstrip" id="mstrip">';
    plies.forEach(function (p, j) {
      var isB = x.blunders.some(function (b) { return b.ply === j; });
      h += '<button type="button" data-ply="' + j + '" class="' + (j === cur ? 'cur ' : '') + (isB ? 'blun' : '') + '">' + (j % 2 === 0 ? '<small>' + (j / 2 + 1) + '.</small>' : '') + esc(p.san) + '</button>';
    });
    h += '</div>';
    if (bl) h += '<div class="note bad"><span><b>اشتباه: <span class="mono">' + esc(bl.san) + '</span></b> · ' + fa(bl.loss) + ' امتیاز مهره از دست رفت' + (bl.clk != null ? '، با ' + fa(Math.round(bl.clk)) + ' ثانیه وقت' : '') + '</span><button type="button" class="linkbtn" data-trainfrom="' + x.id + ':' + bl.ply + '">تمرین</button></div>';
    else if (x.blunders.length) h += '<div class="note"><span><b>' + fa(x.blunders.length) + ' اشتباه در این بازی.</b> حرکت‌های قرمز را بزن.</span><button type="button" class="linkbtn" data-ply="' + x.blunders[0].ply + '">اولین اشتباه</button></div>';
    else h += '<div class="note"><span><b>اشتباه بزرگی پیدا نشد.</b> مهره‌ای بی‌جبران از دست نرفت.</span></div>';
    return h;
  }

  function matChart(x, cur) {
    var W = 600, H = 60, n = x.mat.length, mx = 5;
    x.mat.forEach(function (v) { mx = Math.max(mx, Math.abs(v)); });
    function px(i) { return n > 1 ? i / (n - 1) * W : 0; }
    function py(v) { return H / 2 - v / mx * (H / 2 - 4); }
    var d = 'M0 ' + py(0);
    x.mat.forEach(function (v, i) { d += 'L' + px(i).toFixed(1) + ' ' + py(v).toFixed(1); });
    var area = d + 'L' + W + ' ' + py(0) + 'Z';
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="height:36px" role="img" aria-label="تعادل مهره‌ها در طول بازی">';
    s += '<defs><clipPath id="up"><rect x="0" y="0" width="' + W + '" height="' + py(0) + '"/></clipPath><clipPath id="dn"><rect x="0" y="' + py(0) + '" width="' + W + '" height="' + H + '"/></clipPath></defs>';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="8" fill="#1C2A42"/>';
    s += '<path d="' + area + '" fill="rgba(76,212,168,.3)" clip-path="url(#up)"/><path d="' + area + '" fill="rgba(240,90,110,.3)" clip-path="url(#dn)"/>';
    if (cur >= 0) s += '<line x1="' + px(cur).toFixed(1) + '" x2="' + px(cur).toFixed(1) + '" y1="0" y2="' + H + '" stroke="#B9A6FF" stroke-width="3"/>';
    return s + '</svg>';
  }

  function viewTrain() {
    var items = S.rep.train;
    if (!items.length) return '<div class="view tview">' + head('تمرین') + '<div class="card fine" style="text-align:center">در این بازی‌ها اشتباه مهره‌ای پیدا نشد که تمرین بسازد.</div></div>';
    if (S.ti >= items.length) S.ti = 0;
    var it = items[S.ti], pos = S.tdone && S.tdone.after ? S.tdone.after : it.pos, me = it.game.me;
    var tg = [];
    if (S.tsel != null && !S.tdone) tg = Chess.legal(it.pos).filter(function (m) { return m.from === S.tsel; }).map(function (m) { return m.to; });
    var hl = S.tdone && S.tdone.m ? [S.tdone.m.from, S.tdone.m.to] : (S.tfb && S.tfb.m ? [S.tfb.m.from, S.tfb.m.to] : []);
    var h = '<div class="view tview">' + head('تمرین', '<span class="fine">' + fa(S.ti + 1) + ' از ' + fa(items.length) + '</span>');
    h += '<div class="tprog"><div class="track"><div class="fill" style="width:' + ((S.ti + 1) / items.length * 100) + '%"></div></div></div>';
    h += '<p class="tq">نوبت ' + (me === 'w' ? 'سفید' : 'سیاه') + '. در بازی با <bdi>' + esc(it.game.opp) + '</bdi> این‌جا <span class="mono">' + esc(it.played.san) + '</span> زدی و ' + fa(it.b.loss) + ' امتیاز مهره از دست رفت. حرکت امن‌تری پیدا کن.</p>';
    h += '<div class="bwrap">' + boardHTML(pos, { flip: me === 'b', click: !S.tdone, sel: S.tsel, tgts: tg, hl: hl, bad: S.tfb && S.tfb.kind === 'no' }) + '</div>';
    var fb = S.tfb;
    if (fb) h += '<div class="fb ' + (fb.kind === 'ok' ? 'ok' : fb.kind === 'no' ? 'no' : '') + '" role="status">' + (fb.kind === 'ok' ? ICON.ok : fb.kind === 'no' ? ICON.no : ICON.think) + '<span>' + fb.text + '</span></div>';
    else h += '<div class="fb" role="status"><span style="color:var(--muted)">روی یک مهره‌ی ' + (me === 'w' ? 'سفید' : 'سیاه') + ' بزن، بعد روی خانه‌ی مقصد.</span></div>';
    h += '<div class="tact"><button type="button" class="btn" data-t="prev"' + (S.ti === 0 ? ' disabled' : '') + '>قبلی</button><button type="button" class="btn" data-t="reveal">جواب</button><button type="button" class="btn primary" data-t="next">بعدی</button></div></div>';
    return h;
  }

  function viewImport() {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
    var pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    function two(n) { return n < 10 ? '0' + n : '' + n; }
    var h = '<div class="view iwrap">' + head('ورود بازی‌ها', S.rep ? userChip() : '');
    h += '<div class="seg" role="group" aria-label="روش ورود"><button type="button" data-imode="auto" aria-pressed="' + (S.imode !== 'file') + '">خودکار</button><button type="button" data-imode="file" aria-pressed="' + (S.imode === 'file') + '">فایل PGN</button></div>';
    h += '<div class="card icard">';
    if (S.imode !== 'file') {
      h += '<p style="color:#C4CCDC">نام کاربری‌ات را بنویس. بازی‌های دو ماه اخیر خوانده می‌شود.</p>' + autoBlock();
      if (S.rep) h += '<button type="button" class="btn ghost" id="reset" style="margin-top:auto">پاک کردن بازی‌ها از این مرورگر</button>';
    } else {
      h += '<label class="drop" id="drop" for="file">' + ICON.upload + '<span><b style="color:var(--text)">فایل PGN را انتخاب کن</b><br>یا این‌جا رها کن</span><input id="file" type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" multiple class="sr"></label>';
      h += '<div class="field"><label for="paste">یا متن PGN را بچسبان</label><textarea id="paste" placeholder="[Event &quot;Live Chess&quot;] ..."></textarea></div>';
      h += '<button type="button" class="btn primary" id="go">تحلیل کن</button>';
      h += '<div class="dl" id="dl">' + dlLinks(S.user || '', y, m, py, pm, two) + '</div>';
      if (S.importMsg) h += '<p class="' + (S.importMsg.err ? 'err' : 'fine') + '" role="status">' + esc(S.importMsg.text) + '</p>';
    }
    return h + '</div></div>';
  }

  function dlLinks(u, y, m, py, pm, two) {
    if (!u) return '<p class="fine">فایل PGN را از بخش آرشیو Chess.com یا Lichess دانلود کن.</p>';
    var e = encodeURIComponent(u.trim());
    return '<p class="fine">دانلود فایل برای <span class="mono">' + esc(u) + '</span>:</p>' +
      '<a href="https://api.chess.com/pub/player/' + e.toLowerCase() + '/games/' + y + '/' + two(m) + '/pgn" target="_blank" rel="noopener">Chess.com: این ماه</a>' +
      '<a href="https://api.chess.com/pub/player/' + e.toLowerCase() + '/games/' + py + '/' + two(pm) + '/pgn" target="_blank" rel="noopener">Chess.com: ماه قبل</a>' +
      '<a href="https://lichess.org/api/games/user/' + e + '?max=100&amp;clocks=true&amp;opening=true" target="_blank" rel="noopener">Lichess: ۱۰۰ بازی آخر</a>';
  }

  // ---------- render ----------
  function render() {
    var v = S.view;
    document.querySelectorAll('.nav a').forEach(function (a) { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.classList.toggle('noreport', !S.rep);
    var gl = document.getElementById('glist'), keep = gl ? gl.scrollTop : null;
    var html = v === 'import' ? viewImport() : !S.rep ? viewWelcome() : v === 'games' ? viewGames() : v === 'train' ? viewTrain() : viewReport();
    app.innerHTML = html;
    bindAuto();
    if (v === 'import') bindImport();
    var gl2 = document.getElementById('glist');
    if (gl2 && keep != null) gl2.scrollTop = keep;
    var ms = document.getElementById('mstrip'), c = ms && ms.querySelector('.cur');
    if (ms && c) ms.scrollLeft = c.offsetLeft - ms.clientWidth / 2 + c.offsetWidth / 2;
    var pg = document.getElementById('pager');
    if (pg) {
      var w = pg.firstElementChild ? pg.firstElementChild.getBoundingClientRect().width + 14 : 1;
      pg.scrollLeft = (getComputedStyle(pg).direction === 'rtl' ? -1 : 1) * S.page * w;
      pg.addEventListener('scroll', function () {
        var i = Math.round(Math.abs(pg.scrollLeft) / w);
        if (i !== S.page) {
          S.page = i;
          document.querySelectorAll('#dots button').forEach(function (b) { b.setAttribute('aria-current', +b.dataset.page === i ? 'true' : 'false'); });
        }
      }, { passive: true });
    }
  }

  function route() {
    var hsh = (location.hash || '').replace('#', '');
    S.view = ['report', 'games', 'train', 'import'].indexOf(hsh) >= 0 ? hsh : 'report';
    render();
  }

  // ---------- events ----------
  app.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.weak) { S.weakFilter = t.dataset.weak; S.gid = null; S.gview = false; go('games'); return; }
    if (t.dataset.clearweak) { S.weakFilter = null; S.filter = 'all'; S.gid = null; render(); return; }
    if (t.dataset.filter) { S.weakFilter = null; S.filter = t.dataset.filter; S.gid = null; render(); var g = document.getElementById('glist'); if (g) g.scrollTop = 0; return; }
    if (t.dataset.gid) { S.gid = +t.dataset.gid; S.ply = -2; S.gview = true; render(); return; }
    if (t.dataset.back) { S.gview = false; render(); return; }
    if (t.dataset.page) { var pg = document.getElementById('pager'), w = pg.firstElementChild.getBoundingClientRect().width + 14; pg.scrollTo({ left: (getComputedStyle(pg).direction === 'rtl' ? -1 : 1) * (+t.dataset.page) * w, behavior: 'smooth' }); return; }
    if (t.dataset.imode) { S.imode = t.dataset.imode; S.importMsg = null; render(); return; }
    if (t.dataset.ply) { S.ply = +t.dataset.ply; render(); focusBoard(); return; }
    if (t.dataset.nav) { navPly(t.dataset.nav); return; }
    if (t.dataset.trainfrom) {
      var pp = t.dataset.trainfrom.split(':');
      var idx = S.rep.train.findIndex(function (it) { return it.game.id === +pp[0] && it.b.ply === +pp[1]; });
      if (idx >= 0) { S.ti = idx; resetTrain(); }
      go('train'); return;
    }
    if (t.dataset.t) { trainAction(t.dataset.t); return; }
    if (t.dataset.sq) { trainClick(+t.dataset.sq); return; }
  });

  function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }
  function focusBoard() { var b = document.getElementById('vboard'); if (b) b.focus({ preventScroll: true }); }

  function navPly(k) {
    var x = S.rep.games.filter(function (g) { return g.id === S.gid; })[0];
    if (!x) return;
    var n = x.g.plies.length;
    if (k === 'first') S.ply = -1;
    else if (k === 'prev') S.ply = Math.max(-1, S.ply - 1);
    else if (k === 'next') S.ply = Math.min(n - 1, S.ply + 1);
    else if (k === 'last') S.ply = n - 1;
    render(); focusBoard();
  }

  app.addEventListener('keydown', function (e) {
    if (!e.target.closest || !e.target.closest('#vboard')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); navPly('next'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); navPly('prev'); }
    else if (e.key === 'Home') { e.preventDefault(); navPly('first'); }
    else if (e.key === 'End') { e.preventDefault(); navPly('last'); }
  });

  function resetTrain() { S.tsel = null; S.tfb = null; S.tdone = false; }

  function bestFor(i) {
    if (!S.tcache[i]) S.tcache[i] = Chess.bestMoves(S.rep.train[i].pos, 3);
    return S.tcache[i];
  }

  function trainAction(a) {
    var n = S.rep.train.length;
    if (a === 'next') { S.ti = (S.ti + 1) % n; resetTrain(); render(); return; }
    if (a === 'prev') { S.ti = Math.max(0, S.ti - 1); resetTrain(); render(); return; }
    if (a === 'reveal') {
      S.tfb = { kind: 'think', text: 'در حال محاسبه…' }; render();
      setTimeout(function () {
        var it = S.rep.train[S.ti], sc = bestFor(S.ti), b = sc[0];
        var sanStr = Chess.san(it.pos, b.m);
        S.tdone = { m: b.m, after: Chess.make(it.pos, b.m) };
        S.tfb = { kind: 'ok', text: 'یک حرکت امن این‌جا <span class="mono">' + esc(sanStr) + '</span> بود. ' + gainText(sc, it) };
        render();
      }, 30);
    }
  }

  function gainText(sc, it) {
    var playedV = null;
    sc.forEach(function (x) { if (x.m.from === it.played.from && x.m.to === it.played.to) playedV = x.v; });
    if (playedV == null) return '';
    var diff = sc[0].v - playedV;
    return diff > 0 ? 'این حرکت ' + fa(diff) + ' امتیاز مهره بهتر از حرکت بازی است.' : '';
  }

  function trainClick(sq) {
    var it = S.rep.train[S.ti], pos = it.pos, me = it.game.me;
    var p = pos.b[sq];
    if (S.tsel == null || (p && Chess.isW(p) === (me === 'w'))) {
      if (p && Chess.isW(p) === (me === 'w')) { S.tsel = sq; S.tfb = null; render(); }
      return;
    }
    var mv = Chess.legal(pos).filter(function (m) { return m.from === S.tsel && m.to === sq && (!m.promo || m.promo.toUpperCase() === 'Q'); })[0];
    if (!mv) { S.tsel = null; render(); return; }
    S.tsel = null;
    S.tfb = { kind: 'think', text: 'در حال بررسی حرکت تو…', m: mv }; render();
    setTimeout(function () {
      var sc = bestFor(S.ti), best = sc[0].v, mine = null, playedV = null;
      sc.forEach(function (x) {
        if (x.m.from === mv.from && x.m.to === mv.to && (x.m.promo || '') === (mv.promo || '')) mine = x.v;
        if (x.m.from === it.played.from && x.m.to === it.played.to) playedV = x.v;
      });
      var sanStr = Chess.san(pos, mv);
      if (mine >= best) {
        S.tdone = { m: mv, after: Chess.make(pos, mv) };
        S.tfb = { kind: 'ok', text: '<b>درست.</b> با <span class="mono">' + esc(sanStr) + '</span> مهره‌ای از دست نمی‌رود.' };
      } else if (playedV != null && mine > playedV) {
        S.tfb = { kind: 'no', m: mv, text: '<span class="mono">' + esc(sanStr) + '</span> بهتر از حرکت بازی است، ولی هنوز ' + fa(best - mine) + ' امتیاز مهره از دست می‌رود. دوباره امتحان کن.' };
      } else {
        S.tfb = { kind: 'no', m: mv, text: 'با <span class="mono">' + esc(sanStr) + '</span> هم ' + fa(Math.max(1, best - mine)) + ' امتیاز مهره از دست می‌رود. دوباره امتحان کن.' };
      }
      render();
    }, 30);
  }

  // ---------- import ----------
  function bindImport() {
    var rs = document.getElementById('reset');
    if (rs) rs.addEventListener('click', function () { forget('shatranj.pgn'); S.rep = null; S.importMsg = null; go('report'); });
    var drop = document.getElementById('drop'), file = document.getElementById('file');
    if (!drop) return;
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { readFiles(e.dataTransfer.files); });
    file.addEventListener('change', function () { readFiles(file.files); });
    document.getElementById('go').addEventListener('click', function () {
      var txt = document.getElementById('paste').value;
      if (!txt.trim()) { S.importMsg = { err: true, text: 'اول یک فایل انتخاب کن یا متن PGN را بچسبان.' }; render(); return; }
      finish(txt);
    });
  }

  function autoFetch(src) {
    var u = (S.user || '').trim(), msg = document.getElementById('auto-msg');
    function say(t, err) { if (msg) { msg.textContent = t; msg.className = err ? 'err' : 'fine'; } }
    if (!u) { say('اول نام کاربری‌ات را بنویس.', true); return; }
    S.src = src;
    say('در حال دریافت بازی‌های ' + u + '…');
    var job;
    if (src === 'cc') {
      var base = 'https://api.chess.com/pub/player/' + encodeURIComponent(u.toLowerCase());
      job = fetch(base + '/games/archives').then(function (r) {
        if (r.status === 404) throw new Error('nouser');
        if (!r.ok) throw new Error('http');
        return r.json();
      }).then(function (j) {
        var arcs = (j.archives || []).slice(-2);
        if (!arcs.length) throw new Error('nogames');
        return Promise.all(arcs.map(function (a) { return fetch(a + '/pgn').then(function (r) { return r.ok ? r.text() : ''; }); }));
      }).then(function (parts) { return parts.join('\n\n'); });
    } else {
      job = fetch('https://lichess.org/api/games/user/' + encodeURIComponent(u) + '?max=100&clocks=true&opening=true', { headers: { Accept: 'application/x-chess-pgn' } })
        .then(function (r) { if (r.status === 404) throw new Error('nouser'); if (!r.ok) throw new Error('http'); return r.text(); });
    }
    job.then(function (txt) {
      if (!txt || !txt.trim()) throw new Error('nogames');
      say('بازی‌ها رسید. در حال تحلیل…');
      finish(txt);
    }).catch(function (e) {
      if (e.message === 'nouser') say('کاربری با این نام پیدا نشد.', true);
      else if (e.message === 'nogames') say('برای این کاربر بازی‌ای در دو ماه اخیر پیدا نشد.', true);
      else say('اتصال برقرار نشد. اینترنت را بررسی کن و دوباره امتحان کن، یا فایل PGN را دستی وارد کن.', true);
    });
  }

  function bindAuto() {
    var un = document.getElementById('uname');
    if (!un) return;
    un.addEventListener('input', function () { S.user = un.value; });
    un.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); autoFetch('cc'); } });
    document.getElementById('auto-cc').addEventListener('click', function () { autoFetch('cc'); });
    document.getElementById('auto-li').addEventListener('click', function () { autoFetch('li'); });
  }

  function readFiles(files) {
    if (!files || !files.length) return;
    var parts = [], left = files.length;
    Array.prototype.forEach.call(files, function (f) {
      var r = new FileReader();
      r.onload = function () { parts.push(String(r.result)); if (--left === 0) finish(parts.join('\n\n')); };
      r.onerror = function () { if (--left === 0) finish(parts.join('\n\n')); };
      r.readAsText(f);
    });
  }

  function finish(txt) {
    S.importMsg = { err: false, text: 'در حال خواندن بازی‌ها…' }; render();
    setTimeout(function () {
      var u = (S.user || '').trim();
      var r = load(txt, u);
      if (r.error) { S.importMsg = { err: true, text: r.error }; render(); return; }
      store('shatranj.pgn', txt); store('shatranj.user', u); S.page = 0; S.gview = false;
      if (S.src) store('shatranj.src', S.src);
      if (u && S.src) { try { history.replaceState(null, '', location.pathname + '?u=' + encodeURIComponent(u) + (S.src === 'li' ? '&src=li' : '') + location.hash); } catch (e) { } }
      S.importMsg = null;
      go('report');
    }, 20);
  }

  // ---------- boot ----------
  var saved = recall('shatranj.pgn');
  S.user = recall('shatranj.user') || '';
  var q = null, qsrc = recall('shatranj.src') || 'cc';
  try { var sp = new URLSearchParams(location.search); q = sp.get('u'); if (sp.get('src') === 'li') qsrc = 'li'; } catch (e) { }
  if (q && q.toLowerCase() !== S.user.toLowerCase()) saved = null;
  if (q) S.user = q;
  if (saved) load(saved, S.user);
  window.addEventListener('hashchange', route);
  route();
  // No games in this browser but we know whose games to show: fetch them again.
  if (!S.rep && S.user && (q || recall('shatranj.src'))) autoFetch(qsrc);
})();
