(function () {
  var fa = Analyze.fa;
  var GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  var PNAME = { K: 'شاه', Q: 'وزیر', R: 'رخ', B: 'فیل', N: 'اسب', P: 'سرباز' };
  var app = document.getElementById('app');
  var S = {
    rep: null, profile: null, stage: null, amode: 'in', prog: {}, tatt: 0, club: null, board: null, clubLoaded: false, view: 'report', filter: 'all', weakFilter: null,
    gid: null, gview: false, page: 0, ply: -1, ti: 0, tsel: null, tfb: null, tdone: false, tcache: {}, user: ''
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(x) { return fa(Math.round(x * 100)) + '٪'; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function forget(k) { try { localStorage.removeItem(k); } catch (e) { } }
  function faDate(d) {
    var m = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(d || '');
    if (!m) return '';
    // Gregorian calendar, month names in Persian.
    var MONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
    var s = fa(+m[3]) + ' ' + MONTHS[+m[2] - 1];
    return +m[1] === new Date().getFullYear() ? s : s + ' ' + fa(+m[1]).replace(/٬/g, '');
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
  var KNIGHT = '<svg viewBox="96 76 300 370" aria-hidden="true"><path d="M182 382 C 178 336, 196 304, 232 276 C 214 270, 196 266, 176 270 L 150 284 C 132 292, 112 280, 114 260 C 116 238, 136 214, 160 190 C 182 168, 196 146, 204 124 L 214 92 L 236 116 L 254 90 L 266 120 C 324 136, 362 196, 362 270 C 362 320, 352 364, 340 400 L 176 400 C 178 392, 180 388, 182 382 Z" fill="currentColor"/><path d="M160 398 H352 C362 398 368 404 368 414 V420 C368 428 362 432 354 432 H158 C150 432 144 428 144 420 V414 C144 404 150 398 160 398 Z" fill="currentColor"/></svg>';
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
        if (p) inner += '<span class="pc ' + (Chess.isW(p) ? 'w' : 'b') + p.toUpperCase() + '" aria-hidden="true"></span>';
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
    return '<a class="uchip" href="#account" aria-label="حساب"><span class="mono">' + esc(S.rep.user) + '</span><span>· ' + fa(S.rep.games.length) + ' بازی</span>' + EDIT + '</a>';
  }

  function reportCards() {
    var R = S.rep, w = R.weaknesses, top = w[0], n = R.games.length, t = R.tot, cards = [];
    var c = '<div class="wm-head">' + wtile(top.id) + '<p class="eyebrow">ضعف اصلی تو</p></div><h1>' + esc(top.title) + '</h1><p class="detail">' + esc(top.detail) + '</p>';
    c += '<div class="meter"><div class="track"><div class="fill" style="width:' + Math.round(top.share * 100) + '%"></div></div><span>' + fa(top.count) + ' از ' + fa(top.of) + (top.id === 'opening' ? ' بازی' : top.id === 'convert' ? ' بازیِ نبرده' : ' باخت') + '</span></div>';
    c += '<div class="tip">' + ICON.bulb + '<span>' + esc(top.tip) + '</span></div>';
    c += '<div class="row2 push"><button type="button" class="btn ghost" data-weak="' + top.id + '">بازی‌ها</button><a class="btn primary" href="#train">تمرین</a></div>';
    cards.push(['weak-main', 'ضعف اصلی', c]);

    var chrono = R.games.slice().reverse().slice(-60).map(function (g) { return g.res; });
    var nB = R.col.b.W + R.col.b.D + R.col.b.L, nWh = R.col.w.W + R.col.w.D + R.col.w.L;
    var last = R.games[0];
    c = '<div class="ph"><h2>خلاصه</h2><p>' + (last && last.myElo ? 'ریتینگ <span class="mono">' + esc(last.myElo) + '</span>' : '') + '</p></div><div class="rings">';
    c += '<div class="ring"><div class="rv">' + ringSVG(R.scoreW, scoreCol(R.scoreW)) + '<div class="in"><small>با سفید</small><b>' + pct(R.scoreW) + '</b></div></div><span class="cap">' + fa(nWh) + ' بازی</span></div>';
    c += '<div class="ring"><div class="rv">' + tickSVG(chrono) + '<div class="in"><small>همه</small><b>' + pct(R.score) + '</b></div></div><span class="cap">' + fa(n) + ' بازی</span></div>';
    c += '<div class="ring"><div class="rv">' + ringSVG(R.scoreB, scoreCol(R.scoreB)) + '<div class="in"><small>با سیاه</small><b>' + pct(R.scoreB) + '</b></div></div><span class="cap">' + fa(nB) + ' بازی</span></div></div>';
    c += '<div class="legend" style="justify-content:center"><span><i class="dot" style="background:var(--win)"></i>' + fa(t.W) + ' برد</span><span><i class="dot" style="background:var(--draw)"></i>' + fa(t.D) + ' مساوی</span><span><i class="dot" style="background:var(--loss)"></i>' + fa(t.L) + ' باخت</span></div>';
    cards.push(['center', 'خلاصه', c]);

    if (w.length > 1) {
      c = '<div class="ph"><h2>الگوهای دیگر</h2></div><div>';
      w.slice(1).forEach(function (x) {
        c += '<button type="button" class="prow" data-weak="' + x.id + '">' + wtile(x.id, true) + '<span class="pt"><h3>' + esc(x.title) + '</h3><p>' + esc(x.detail) + '</p><span class="pbar"><span class="track"><span class="fill" style="display:block;width:' + Math.round(x.share * 100) + '%"></span></span><span>' + fa(x.count) + ' از ' + fa(x.of) + '</span></span></span></button>';
      });
      cards.push(['', 'الگوها', c + '</div>']);
    }

    c = '<div class="ph"><h2>گشایش‌ها</h2><p>امتیاز</p></div><div>';
    R.openings.slice(0, 5).forEach(function (o) {
      var col = o.score >= 0.55 ? 'var(--win)' : o.score < 0.4 ? 'var(--loss)' : '#C4CCDC';
      c += '<div class="orow"><div class="on"><b>' + esc(o.name) + '</b><small>با ' + (o.color === 'w' ? 'سفید' : 'سیاه') + ' · ' + fa(o.n) + ' بازی</small></div><div class="os"><span>' + pct(o.score) + '</span><div class="track"><div class="fill" style="width:' + Math.round(o.score * 100) + '%;background:' + col + '"></div></div></div></div>';
    });
    cards.push(['', 'گشایش‌ها', c + '</div>']);

    var ph = R.phase, totB = ph.opening + ph.middlegame + ph.endgame;
    c = '<div class="ph"><h2>مدیریت زمان</h2><p>وقت باقی‌مانده</p></div>';
    c += R.clockCurve ? clockChart(R.clockCurve) : '';
    c += '<div class="ph"><h2>اشتباه‌ها</h2></div><div class="phases">';
    ['opening', 'middlegame', 'endgame'].forEach(function (k) {
      c += '<div class="phase"><span>' + PHASE[k] + '</span><b>' + fa(ph[k]) + '</b><span>' + (totB ? pct(ph[k] / totB) : '–') + '</span></div>';
    });
    c += '</div>';
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
    s += '<div class="legend"><span><i class="dot" style="background:var(--win)"></i>بردها</span><span><i class="dot" style="background:var(--loss)"></i>باخت‌ها</span></div>';
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
    if (bl) h += '<div class="note bad"><span><b class="mono">' + esc(bl.san) + '</b> · −' + fa(bl.loss) + ' مهره' + (bl.clk != null ? ' · ' + fa(Math.round(bl.clk)) + ' ثانیه' : '') + '</span><button type="button" class="linkbtn" data-trainfrom="' + x.id + ':' + bl.ply + '">تمرین</button></div>';
    else if (x.blunders.length) h += '<div class="note"><span>' + fa(x.blunders.length) + ' اشتباه</span><button type="button" class="linkbtn" data-ply="' + x.blunders[0].ply + '">اولی</button></div>';
    else h += '<div class="note"><span>بدون اشتباه بزرگ</span></div>';
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
    var solvedN = items.filter(function (x) { var p = S.prog[trainKey(x)]; return p && p.solved; }).length;
    var mine = S.prog[trainKey(it)];
    var h = '<div class="view tview">' + head('تمرین', '<span class="fine">' + fa(S.ti + 1) + ' از ' + fa(items.length) + ' · ' + fa(solvedN) + ' حل‌شده</span>');
    h += '<div class="tprog"><div class="track"><div class="fill" style="width:' + (solvedN / items.length * 100) + '%"></div></div></div>';
    h += '<p class="tq">نوبت ' + (me === 'w' ? 'سفید' : 'سیاه') + ' · در بازی <span class="mono">' + esc(it.played.san) + '</span> زدی (−' + fa(it.b.loss) + ')</p>';
    h += '<div class="bwrap">' + boardHTML(pos, { flip: me === 'b', click: !S.tdone, sel: S.tsel, tgts: tg, hl: hl, bad: S.tfb && S.tfb.kind === 'no' }) + '</div>';
    var fb = S.tfb;
    if (fb) h += '<div class="fb ' + (fb.kind === 'ok' ? 'ok' : fb.kind === 'no' ? 'no' : '') + '" role="status">' + (fb.kind === 'ok' ? ICON.ok : fb.kind === 'no' ? ICON.no : ICON.think) + '<span>' + fb.text + '</span></div>';
    else if (mine && mine.solved) h += '<div class="fb ok" role="status">' + ICON.ok + '<span>قبلاً حلش کرده‌ای.</span></div>';
    else h += '<div class="fb" role="status"><span style="color:var(--muted)">حرکت بهتر را روی صفحه بزن.</span></div>';
    h += '<div class="tact"><button type="button" class="btn" data-t="prev"' + (S.ti === 0 ? ' disabled' : '') + '>قبلی</button><button type="button" class="btn" data-t="reveal">جواب</button><button type="button" class="btn primary" data-t="next">بعدی</button></div></div>';
    return h;
  }

  // ---------- render ----------
  function render() {
    var v = S.view;
    document.querySelectorAll('.nav a').forEach(function (a) { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.classList.toggle('noreport', !S.rep);
    var gl = document.getElementById('glist'), keep = gl ? gl.scrollTop : null;
    document.body.classList.toggle('signedout', !session);
    var html;
    if (!session) html = viewAuth();
    else if (S.stage === 'loading' || !S.stage || S.fatal) html = viewLoading();
    else if (v === 'account') html = viewAccount();
    else if (v === 'club') html = viewClub();
    else if (!S.profile.chess_username) html = viewLink();
    else if (!S.rep) html = viewSync();
    else html = v === 'games' ? viewGames() : v === 'train' ? viewTrain() : viewReport();
    app.innerHTML = html;
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
    S.view = ['report', 'games', 'train', 'club', 'account'].indexOf(hsh) >= 0 ? hsh : 'report';
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
    if (t.dataset.ply) { S.ply = +t.dataset.ply; render(); focusBoard(); return; }
    if (t.dataset.nav) { navPly(t.dataset.nav); return; }
    if (t.dataset.trainfrom) {
      var pp = t.dataset.trainfrom.split(':');
      var idx = S.rep.train.findIndex(function (it) { return it.game.id === +pp[0] && it.b.ply === +pp[1]; });
      if (idx >= 0) { S.ti = idx; resetTrain(); }
      go('train'); return;
    }
    if (t.dataset.t) { trainAction(t.dataset.t); return; }
    if (t.dataset.act) { act(t.dataset.act, t); return; }
    if (t.dataset.copy) { copyText(t.dataset.copy, t); return; }
    if (t.dataset.board) { setBoard(t.dataset.board); return; }
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

  function resetTrain() { S.tsel = null; S.tfb = null; S.tdone = false; S.tatt = 0; }
  function nextUnsolved(from) {
    var items = S.rep.train, n = items.length;
    for (var k = 1; k <= n; k++) { var i = (from + k) % n, p = S.prog[trainKey(items[i])]; if (!p || !p.solved) return i; }
    return (from + 1) % n;
  }

  function bestFor(i) {
    if (!S.tcache[i]) S.tcache[i] = Chess.bestMoves(S.rep.train[i].pos, 3);
    return S.tcache[i];
  }

  function trainAction(a) {
    var n = S.rep.train.length;
    if (a === 'next') { S.ti = nextUnsolved(S.ti); resetTrain(); render(); return; }
    if (a === 'prev') { S.ti = Math.max(0, S.ti - 1); resetTrain(); render(); return; }
    if (a === 'reveal') {
      S.tfb = { kind: 'think', text: 'در حال محاسبه…' }; render();
      setTimeout(function () {
        var it = S.rep.train[S.ti], sc = bestFor(S.ti), b = sc[0];
        var sanStr = Chess.san(it.pos, b.m);
        S.tdone = { m: b.m, after: Chess.make(it.pos, b.m) };
        saveProgress(it, false);
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
        saveProgress(it, true);
        S.tfb = { kind: 'ok', text: '<b>درست.</b> با <span class="mono">' + esc(sanStr) + '</span> مهره‌ای از دست نمی‌رود.' };
      } else if ((S.tatt = (S.tatt || 0) + 1) && playedV != null && mine > playedV) {
        S.tfb = { kind: 'no', m: mv, text: '<span class="mono">' + esc(sanStr) + '</span> بهتر از حرکت بازی است، ولی هنوز ' + fa(best - mine) + ' امتیاز مهره از دست می‌رود. دوباره امتحان کن.' };
      } else {
        S.tfb = { kind: 'no', m: mv, text: 'با <span class="mono">' + esc(sanStr) + '</span> هم ' + fa(Math.max(1, best - mine)) + ' امتیاز مهره از دست می‌رود. دوباره امتحان کن.' };
      }
      render();
    }, 30);
  }

  var RECENT = 300;

  // ---------- account (Supabase) ----------
  var SB = { url: 'https://ktofakscjsegdiwwjdqm.supabase.co', key: 'sb_publishable_bjRnZXoQ0uKchjDRw82fPA_q4U5skmK' };
  var session = null;

  function saveSession(s) { session = s; if (s) store('shatranj.session', JSON.stringify(s)); else forget('shatranj.session'); }
  function parse(r) {
    return r.text().then(function (t) {
      var j = null;
      try { j = t ? JSON.parse(t) : null; } catch (e) { j = { message: t }; }
      if (!r.ok) {
        var e = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status));
        e.status = r.status; e.code = j && (j.code || j.error_code);
        throw e;
      }
      return j;
    });
  }
  function authReq(path, body, tok) {
    var h = { apikey: SB.key, 'Content-Type': 'application/json' };
    if (tok) h.Authorization = 'Bearer ' + tok;
    return fetch(SB.url + '/auth/v1/' + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }).then(parse);
  }
  function toSession(j) {
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || (Math.floor(Date.now() / 1000) + (+j.expires_in || 3600)), user: j.user };
  }
  function signUp(email, pw, name) {
    return authReq('signup', { email: email, password: pw, data: { display_name: name } }).then(function (j) {
      if (j && j.access_token) { saveSession(toSession(j)); return 'in'; }
      return 'confirm';
    });
  }
  function signIn(email, pw) { return authReq('token?grant_type=password', { email: email, password: pw }).then(function (j) { saveSession(toSession(j)); }); }
  function token() {
    if (!session) return Promise.resolve(null);
    if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve(session.access_token);
    return authReq('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then(function (j) { saveSession(toSession(j)); return session.access_token; })
      .catch(function (e) { if (e.status >= 400 && e.status < 500) saveSession(null); throw e; });
  }
  function signOut() {
    var t = session && session.access_token;
    saveSession(null);
    if (t) fetch(SB.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + t } }).catch(function () { });
    S.rep = null; S.profile = null; S.stage = null; S.club = null; S.board = null; S.clubLoaded = false; S.prog = {}; S.sync = null; S.syncErr = null; S.fatal = null;
    go('report');
  }
  function db(method, path, body, prefer) {
    return token().then(function (t) {
      var h = { apikey: SB.key, 'Content-Type': 'application/json' };
      if (t) h.Authorization = 'Bearer ' + t;
      if (prefer) h.Prefer = prefer;
      return fetch(SB.url + '/rest/v1/' + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(parse);
    });
  }
  function rpc(fn, args) { return db('POST', 'rpc/' + fn, args || {}); }

  function errText(e) {
    var m = String((e && e.message) || e || '');
    var map = [
      [/Invalid login credentials/i, 'ایمیل یا رمز اشتباه است.'],
      [/already registered|already exists/i, 'با این ایمیل قبلاً حساب ساخته شده. وارد شو.'],
      [/Password should be|at least 6/i, 'رمز باید حداقل ۶ حرف باشد.'],
      [/Email not confirmed/i, 'ایمیلت هنوز تأیید نشده. لینک تأیید را در ایمیلت بزن.'],
      [/valid email|invalid format|email address/i, 'ایمیل درست نیست.'],
      [/rate limit|too many/i, 'درخواست‌ها زیاد شد. چند دقیقه بعد دوباره امتحان کن.'],
      [/invalid username/, 'نام کاربری Chess.com درست نیست.'],
      [/^taken$/, 'این حساب Chess.com قبلاً به کاربر دیگری وصل شده.'],
      [/no such player/, 'چنین کاربری در Chess.com پیدا نشد.'],
      [/code not found/, 'کد هنوز در پروفایل Chess.com دیده نمی‌شود. اگر ذخیره‌اش کرده‌ای، Chess.com پروفایل را با کمی تأخیر به‌روز می‌کند؛ چند دقیقه بعد دوباره «بررسی کن» را بزن.'],
      [/no such club/, 'باشگاهی با این کد پیدا نشد.'],
      [/chess\.com responded/, 'Chess.com الان جواب نمی‌دهد. کمی بعد دوباره امتحان کن.'],
      [/Failed to fetch|NetworkError|Load failed/i, 'اتصال برقرار نشد. اینترنت را بررسی کن.']
    ];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(m)) return map[i][1];
    return 'خطا: ' + m;
  }

  // ---------- account data ----------
  function loadAccount() {
    S.stage = 'loading'; S.fatal = null; render();
    db('GET', 'profiles?select=*&id=eq.' + session.user.id).then(function (rows) {
      S.profile = rows && rows[0];
      if (!S.profile) throw new Error('پروفایل پیدا نشد. یک بار خارج شو و دوباره وارد شو.');
      if (S.profile.settings && S.profile.settings.board) { applyBoard(S.profile.settings.board); store('shatranj.board', S.board); }
      if (!S.profile.chess_username) { S.stage = 'ready'; render(); return; }
      S.stage = 'ready'; S.user = S.profile.chess_username; render();
      loadProgress();
      return fetchGames().then(function () { render(); syncLoop(0); });
    }).catch(fail);
    loadClub();
  }
  function fail(e) {
    if (e && e.status === 401) { signOut(); return; }
    S.fatal = errText(e); render();
  }
  function fetchGames() {
    var u = S.profile.chess_username;
    return db('GET', 'games?select=pgn&username=eq.' + encodeURIComponent(u) + '&order=end_time.desc&limit=' + RECENT).then(function (rows) {
      if (!rows || !rows.length) return;
      var keep = { view: S.view, gid: S.gid, ply: S.ply, gview: S.gview, page: S.page, ti: S.ti };
      var r = load(rows.reverse().map(function (x) { return x.pgn; }).join('\n\n'), u);
      if (r.ok && S.rep) { S.page = keep.page; S.ti = keep.ti; }
    });
  }
  function syncLoop(added) {
    S.syncing = true; S.syncErr = null;
    rpc('sync_me').then(function (r) {
      S.sync = r; added += r.added || 0;
      if (!r.finished) { if (!S.rep) render(); return syncLoop(added); }
      S.syncing = false;
      if (added > 0 || !S.rep) return fetchGames().then(function () { render(); });
      if (S.view === 'account') render();
    }).catch(function (e) { S.syncing = false; S.syncErr = errText(e); render(); });
  }
  function loadProgress() {
    db('GET', 'train_progress?select=game_url,ply,solved,attempts').then(function (rows) {
      S.prog = {};
      (rows || []).forEach(function (p) { S.prog[p.game_url + ':' + p.ply] = p; });
      if (S.view === 'train') render();
    }).catch(function () { });
  }
  function trainKey(it) { return (it.game.g.h.Link || it.game.g.h.Site + it.game.date) + ':' + it.b.ply; }
  function saveProgress(it, solved) {
    var k = trainKey(it), prev = S.prog[k] || {};
    var row = { user_id: session.user.id, game_url: k.slice(0, k.lastIndexOf(':')), ply: it.b.ply, solved: solved || !!prev.solved, attempts: (prev.attempts || 0) + (S.tatt || 0) + 1, updated_at: new Date().toISOString() };
    S.prog[k] = row;
    db('POST', 'train_progress', row, 'resolution=merge-duplicates,return=minimal').catch(function () { });
  }
  function loadClub() {
    db('GET', 'club_members?select=role,clubs(id,name,join_code)&user_id=eq.' + session.user.id).then(function (rows) {
      var r = rows && rows[0];
      S.club = r && r.clubs ? { id: r.clubs.id, name: r.clubs.name, code: r.clubs.join_code, role: r.role } : null;
      S.clubLoaded = true; S.board = null;
      if (S.view === 'club') render();
      if (S.club) rpc('club_board', { cid: S.club.id }).then(function (b) { S.board = b || []; if (S.view === 'club') render(); }).catch(function () { S.board = []; });
    }).catch(function () { S.clubLoaded = true; });
  }

  // ---------- account views ----------
  function brandHead(big) {
    if (big) return '<div class="brand-big"><img src="icon.svg" alt="" width="64" height="64"><b>شطرنج</b></div>';
    return '<div class="wm-head"><span class="tile t-purple">' + KNIGHT + '</span><p class="eyebrow" style="color:var(--accent)">شطرنج</p></div>';
  }
  function fld(id, label, attrs) { return '<div class="field"><label class="sr" for="' + id + '">' + label + '</label><input id="' + id + '" placeholder="' + label + '" required ' + (attrs || '') + '></div>'; }
  function msg(id, t) { return t ? '<p class="fine" id="' + id + '" role="status">' + esc(t) + '</p>' : '<p class="sr" id="' + id + '" role="status"></p>'; }

  function viewAuth() {
    var up = S.amode === 'up';
    var h = '<section class="welcome"><div class="card wcard">' + brandHead(true);
    h += '<div class="seg" role="group" aria-label="ورود یا ثبت‌نام"><button type="button" data-act="amode-in" aria-pressed="' + !up + '">ورود</button><button type="button" data-act="amode-up" aria-pressed="' + up + '">ثبت‌نام</button></div>';
    h += '<form id="authf" class="form" novalidate>';
    if (up) h += fld('aname', 'نام کاربری', 'dir="ltr" autocomplete="username" autocapitalize="off" spellcheck="false"');
    h += fld('aemail', 'ایمیل', 'type="email" dir="ltr" autocomplete="email" autocapitalize="off"');
    h += fld('apw', 'رمز عبور', 'type="password" dir="ltr" minlength="6" autocomplete="' + (up ? 'new-password' : 'current-password') + '"');
    h += '<button type="submit" class="btn primary">' + (up ? 'ساختن حساب' : 'ورود') + '</button>';
    h += msg('amsg', S.amsg) + '</form></div>';
    return h + '</section>';
  }

  function viewLoading() {
    var h = '<section class="welcome"><div class="card wcard">' + brandHead(true);
    if (S.fatal) h += '<h1>چیزی درست کار نکرد</h1><p class="err">' + esc(S.fatal) + '</p><div class="actions"><button type="button" class="btn primary" data-act="retry">دوباره امتحان کن</button><button type="button" class="btn ghost" data-act="signout">خروج</button></div>';
    else h += '<p class="fine" style="text-align:center">در حال بارگذاری…</p>';
    return h + '</div></section>';
  }

  function viewLink() {
    var titles = { report: 'گزارش', games: 'بازی‌ها', train: 'تمرین' };
    var h = '<div class="view iwrap">' + head(titles[S.view] || 'گزارش') + '<div class="card icard">';
    h += '<div class="wm-head">' + wtile('blunder') + '<div><h2>بازی‌هایت را بیاور</h2><p class="fine">گزارش از روی بازی‌های تو در Chess.com ساخته می‌شود.</p></div></div>';
    h += '<form id="linkf" class="form" novalidate><div class="inrow">' + fld('cuser', 'نام کاربری Chess.com', 'dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false"') + '<button type="submit" class="btn primary">آوردن</button></div>' + msg('lmsg', S.lmsg) + '</form>';
    return h + '</div></div>';
  }

  function viewSync() {
    var s = S.sync, h = '<section class="welcome"><div class="card wcard">' + brandHead();
    if (S.syncErr) {
      h += '<h1>آوردن بازی‌ها متوقف شد</h1><p class="err">' + esc(S.syncErr) + '</p><button type="button" class="btn primary" data-act="sync">دوباره امتحان کن</button>';
    } else if (s && s.finished && !S.rep) {
      h += '<h1>هنوز بازی‌ای نیست</h1><p class="lead">بعد از چند بازی در Chess.com برگرد.</p>';
    } else {
      var pc = s && s.total ? s.done / s.total : 0;
      h += '<h1>آوردن بازی‌ها از Chess.com</h1>';
      h += '<div class="meter"><div class="track"><div class="fill" style="width:' + Math.round(pc * 100) + '%"></div></div><span>' + (s && s.total ? 'ماه ' + fa(s.done) + ' از ' + fa(s.total) : 'شروع…') + '</span></div>';
    }
    return h + '</div></section>';
  }

  function viewAccount() {
    var p = S.profile || {}, s = S.sync;
    var st = !p.chess_username ? '–' : S.syncing ? 'در حال همگام‌سازی…' : S.syncErr ? S.syncErr : s ? 'به‌روز' : '–';
    var h = '<div class="view iwrap">' + head('حساب') + '<div class="card icard"><div class="kv">';
    h += '<div><span>نام کاربری</span><span class="mono">' + esc(p.display_name || '') + '</span></div>';
    h += '<div><span>ایمیل</span><span class="mono">' + esc(session.user && session.user.email || '') + '</span></div>';
    h += '<div><span>Chess.com</span>' + (p.chess_username ? '<span class="mono">' + esc(p.chess_username) + '</span>' : '<button type="button" class="linkbtn inline" style="font-size:14px" data-act="show-link">وصل کردن</button>') + '</div>';
    h += '<div><span>همگام‌سازی</span><span>' + esc(st) + '</span></div>';
    h += '<div><span>رنگ صفحه</span>' + boardPicker() + '</div>';
    h += '</div>';
    h += '<div class="stack">' + (p.chess_username ? '<button type="button" class="btn" data-act="sync"' + (S.syncing ? ' disabled' : '') + '>همگام‌سازی</button>' : '') + '<button type="button" class="btn ghost" data-act="signout">خروج</button></div>';
    return h + '</div></div>';
  }

  function viewClub() {
    var h = '<div class="view iwrap">';
    if (!S.clubLoaded) return h + head('باشگاه') + '<div class="card fine">در حال بارگذاری…</div></div>';
    if (!S.club) {
      h += head('باشگاه') + '<div class="card icard">';
      h += '<form id="joinf" class="form" novalidate><h2>پیوستن</h2><div class="inrow">' + fld('jcode', 'کد باشگاه', 'dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false"') + '<button type="submit" class="btn primary">پیوستن</button></div></form>';
      h += '<hr class="sep">';
      h += '<form id="newf" class="form" novalidate><h2>باشگاه تازه</h2><div class="inrow">' + fld('cname', 'اسم باشگاه', 'autocomplete="off"') + '<button type="submit" class="btn">ساختن</button></div></form>';
      h += msg('cmsg', S.cmsg) + '</div></div>';
      return h;
    }
    h += head(esc(S.club.name), '<button type="button" class="uchip" data-copy="' + esc(S.club.code) + '" aria-label="کپی کد باشگاه"><span>کد</span><span class="mono">' + esc(S.club.code) + '</span></button>');
    h += '<div class="card blist">';
    if (!S.board) h += '<p class="fine">در حال بارگذاری رده‌بندی…</p>';
    else if (!S.board.length) h += '<p class="fine">هنوز عضوی نیست.</p>';
    else S.board.forEach(function (m, i) {
      var sc = m.score_30d == null ? '–' : pct(+m.score_30d);
      h += '<div class="brow' + (m.is_me ? ' me' : '') + '"><span class="rank">' + fa(i + 1) + '</span><span class="who"><b><bdi dir="ltr">' + esc(m.display_name) + '</bdi>' + (m.is_me ? ' <small class="fine">(تو)</small>' : '') + '</b><small class="mono">' + esc(m.chess_username || 'وصل نشده') + '</small></span>';
      h += '<span class="meta"><b class="mono">' + (m.rating != null ? esc(m.rating) : '–') + '</b><span>' + fa(m.games_30d || 0) + ' بازی · ' + sc + '</span></span></div>';
    });
    h += '</div><p class="fine" style="flex:none">ریتینگ بلیتز · <button type="button" class="linkbtn inline" data-act="leave">ترک باشگاه</button></p>';
    return h + '</div>';
  }

  // ---------- board colors ----------
  var BOARDS = [['lavender', 'یاسی', '#E6E1F5', '#8F82C6'], ['green', 'سبز', '#EBECD0', '#779556'], ['blue', 'آبی', '#DEE3E6', '#8CA2AD'], ['wood', 'چوبی', '#F0D9B5', '#B58863']];
  function applyBoard(name) {
    var b = BOARDS.filter(function (x) { return x[0] === name; })[0] || BOARDS[0];
    S.board = b[0];
    document.body.style.setProperty('--sq-light', b[2]);
    document.body.style.setProperty('--sq-dark', b[3]);
  }
  function boardPicker() {
    var h = '<div class="swatches" role="group" aria-label="رنگ صفحه">';
    BOARDS.forEach(function (b) {
      h += '<button type="button" class="swatch" data-board="' + b[0] + '" aria-pressed="' + (S.board === b[0]) + '" aria-label="' + b[1] + '"><i style="background:' + b[2] + '"></i><i style="background:' + b[3] + '"></i><i style="background:' + b[3] + '"></i><i style="background:' + b[2] + '"></i></button>';
    });
    return h + '</div>';
  }
  function setBoard(name) {
    applyBoard(name); store('shatranj.board', name); render();
    if (S.profile && session) {
      var st = Object.assign({}, S.profile.settings || {}, { board: name });
      S.profile.settings = st;
      db('PATCH', 'profiles?id=eq.' + session.user.id, { settings: st }, 'return=minimal').catch(function () { });
    }
  }

  // ---------- account events ----------
  function act(a, t) {
    if (a === 'amode-in' || a === 'amode-up') { S.amode = a === 'amode-up' ? 'up' : 'in'; S.amsg = ''; render(); return; }
    if (a === 'retry') { loadAccount(); return; }
    if (a === 'show-link') { S.lmsg = ''; go('report'); var c = document.getElementById('cuser'); if (c) c.focus(); return; }
    if (a === 'signout') { signOut(); return; }
    if (a === 'sync') { S.syncErr = null; syncLoop(0); render(); return; }
    if (a === 'leave') {
      if (!S.club) return;
      rpc('leave_club', { cid: S.club.id }).then(function () { S.club = null; S.board = null; render(); }).catch(function (e) { S.cmsg = errText(e); render(); });
    }
  }

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, val = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    if (f.id === 'authf') {
      var up = S.amode === 'up', email = val('aemail'), pw = document.getElementById('apw').value, name = val('aname');
      if (!email || !pw || (up && !name)) { S.amsg = 'همه‌ی خانه‌ها را پر کن.'; render(); return; }
      S.amsg = up ? 'در حال ساختن حساب…' : 'در حال ورود…'; render();
      (up ? signUp(email, pw, name) : signIn(email, pw).then(function () { return 'in'; })).then(function (r) {
        if (r === 'confirm') { S.amode = 'in'; S.amsg = 'حساب ساخته شد. لینک تأیید به ایمیلت رفت؛ بزنش و بعد وارد شو.'; render(); return; }
        S.amsg = ''; loadAccount();
      }).catch(function (err) { S.amsg = errText(err); render(); });
    }
    if (f.id === 'linkf') {
      var cu = val('cuser');
      if (!cu) return;
      S.lmsg = 'در حال وصل کردن…'; render();
      rpc('link_chess', { u: cu }).then(function (name) { S.profile.chess_username = name; S.lmsg = ''; S.stage = 'ready'; S.user = name; S.sync = null; render(); loadProgress(); syncLoop(0); })
        .catch(function (err) { S.lmsg = errText(err); render(); });
    }
    if (f.id === 'joinf' || f.id === 'newf') {
      var j = f.id === 'joinf', v = val(j ? 'jcode' : 'cname');
      if (!v) return;
      S.cmsg = j ? 'در حال پیوستن…' : 'در حال ساختن…'; render();
      rpc(j ? 'join_club' : 'create_club', j ? { code: v } : { club_name: v }).then(function () { S.cmsg = ''; S.clubLoaded = false; render(); loadClub(); })
        .catch(function (err) { S.cmsg = errText(err); render(); });
    }
  });

  function copyText(t, btn) {
    var done = function () { var o = btn.innerHTML; btn.textContent = 'کپی شد'; setTimeout(function () { btn.innerHTML = o; }, 1400); };
    try { navigator.clipboard.writeText(t).then(done, function () { }); } catch (e) { }
  }

  // ---------- boot ----------
  (function () {
    try { session = JSON.parse(recall('shatranj.session') || 'null'); } catch (e) { session = null; }
    applyBoard(recall('shatranj.board'));
    forget('shatranj.pgn'); forget('shatranj.src');
    // Coming back from an email confirmation link: Supabase puts the session in the hash.
    var hp = /access_token=([^&]+)/.exec(location.hash || '');
    if (hp) {
      var p = {};
      location.hash.slice(1).split('&').forEach(function (kv) { var a = kv.split('='); p[a[0]] = decodeURIComponent(a[1] || ''); });
      try { history.replaceState(null, '', location.pathname + '#report'); } catch (e) { location.hash = 'report'; }
      authReq('user', null, p.access_token).then(function (u) {
        saveSession({ access_token: p.access_token, refresh_token: p.refresh_token, expires_at: +p.expires_at || Math.floor(Date.now() / 1000) + (+p.expires_in || 3600), user: u });
        loadAccount();
      }).catch(function () { render(); });
    }
    window.addEventListener('hashchange', route);
    route();
    if (session && !hp) loadAccount();
  })();
})();
