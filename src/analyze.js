// Turns parsed games into a player report. Material-based heuristics, no engine.
var Analyze = (function () {
  var C = (typeof Chess !== 'undefined') ? Chess : require('./engine.js');

  function detectUser(games, name) {
    if (name) {
      var n = name.trim().toLowerCase();
      var hit = games.some(function (g) { return (g.h.White || '').toLowerCase() === n || (g.h.Black || '').toLowerCase() === n; });
      if (hit) return n;
    }
    var cnt = {};
    games.forEach(function (g) {
      [g.h.White, g.h.Black].forEach(function (p) { if (p) { p = p.toLowerCase(); cnt[p] = (cnt[p] || 0) + 1; } });
    });
    var best = null;
    Object.keys(cnt).forEach(function (k) { if (!best || cnt[k] > cnt[best]) best = k; });
    return best;
  }

  function openingName(h) {
    if (h.ECOUrl) {
      var seg = h.ECOUrl.split('/').pop().split('?')[0];
      seg = seg.replace(/-\d.*$/, '').replace(/\.{3}.*$/, '');
      var words = seg.split('-').filter(Boolean);
      var cut = [];
      for (var w of words) { if (/^(with|Accepted|Declined|Variation|Line|Attack|Defense|Opening|Game|System|Gambit)$/i.test(w) && cut.length >= 2) { cut.push(w); break; } cut.push(w); if (cut.length >= 4) break; }
      return cut.join(' ').replace(/Kings/g, "King's").replace(/Queens/g, "Queen's").replace(/Petrovs/g, "Petrov's").replace(/Caro Kann/g, 'Caro-Kann');
    }
    if (h.Opening) return h.Opening.split(':')[0];
    return h.ECO || 'نامشخص';
  }

  function termType(h, res) {
    var t = (h.Termination || '').toLowerCase();
    if (/time|zeit/.test(t)) return 'time';
    if (/checkmate|mate/.test(t)) return 'mate';
    if (/resign/.test(t)) return 'resign';
    if (/abandon/.test(t)) return 'abandon';
    if (res === 'D') return 'draw';
    return 'other';
  }

  function pieceValue(s) {
    var v = 0;
    for (var p of s.b) if (p && !/[PpKk]/.test(p)) v += C.VAL[p.toUpperCase()];
    return v;
  }

  function one(g, user) {
    var h = g.h;
    var meW = (h.White || '').toLowerCase() === user;
    var meB = (h.Black || '').toLowerCase() === user;
    if (!meW && !meB) return null;
    var me = meW ? 'w' : 'b', sign = meW ? 1 : -1;
    var res = h.Result === '1/2-1/2' ? 'D' : h.Result === '1-0' ? (meW ? 'W' : 'L') : h.Result === '0-1' ? (meW ? 'L' : 'W') : null;
    if (!res) return null;
    var tc = (h.TimeControl || '').split('+');
    var base = parseFloat(tc[0]) || null, inc = parseFloat(tc[1]) || 0;
    var p = g.plies, n = p.length;
    var mat = p.map(function (x) { return sign * x.mat; });
    var blunders = [];
    for (var i = 0; i < n; i++) {
      if (p[i].color !== me) continue;
      var before = i > 0 ? mat[i - 1] : 0;
      var after = mat[Math.min(i + 2, n - 1)];
      var persist = mat[Math.min(i + 4, n - 1)];
      if (after - before <= -2 && persist - before <= -2) {
        var pv = pieceValue(p[i].before);
        var phase = i < 20 ? 'opening' : pv <= 26 ? 'endgame' : 'middlegame';
        var prevClk = null;
        for (var j = i - 2; j >= 0; j -= 2) { if (p[j].clk != null) { prevClk = p[j].clk; break; } }
        var spent = (prevClk != null && p[i].clk != null) ? prevClk - p[i].clk + inc : null;
        blunders.push({ ply: i, loss: before - persist, clk: p[i].clk, spent: spent, phase: phase, san: p[i].san });
        i += 3;
      }
    }
    var maxAdv = 0;
    for (var k = 10; k < n - 1; k++) {
      var sustained = Math.min(mat[k], mat[k + 1]);
      if (sustained > maxAdv) maxAdv = sustained;
    }
    var myClocks = p.filter(function (x) { return x.color === me && x.clk != null; }).map(function (x) { return x.clk; });
    var minClk = myClocks.length ? Math.min.apply(null, myClocks) : null;
    var tt = base ? Math.max(15, base * 0.1) : 15;
    var term = termType(h, res);
    var oppName = meW ? h.Black : h.White;
    return {
      id: g._i, g: g, me: me, res: res, term: term, base: base, inc: inc,
      opening: openingName(h), eco: h.ECO || '', date: h.Date || h.UTCDate || '',
      opp: oppName, oppElo: meW ? h.BlackElo : h.WhiteElo, myElo: meW ? h.WhiteElo : h.BlackElo,
      mat: mat, blunders: blunders, maxAdv: maxAdv, minClk: minClk, myClocks: myClocks,
      lostOnTime: res === 'L' && term === 'time',
      ttBlunders: blunders.filter(function (b) { return b.clk != null && b.clk < Math.max(30, tt * 1.5); }).length,
      fastBlunders: blunders.filter(function (b) { return b.spent != null && b.spent < 3; }).length,
      convertFail: res !== 'W' && maxAdv >= 3,
      moves: Math.ceil(n / 2)
    };
  }

  function run(games, name) {
    games.forEach(function (g, i) { g._i = i; });
    var user = detectUser(games, name);
    var list = games.map(function (g) { return one(g, user); }).filter(Boolean);
    list.sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : b.id - a.id; });
    var tot = { W: 0, D: 0, L: 0 }, col = { w: { W: 0, D: 0, L: 0 }, b: { W: 0, D: 0, L: 0 } };
    list.forEach(function (x) { tot[x.res]++; col[x.me][x.res]++; });
    function score(o) { var n = o.W + o.D + o.L; return n ? (o.W + o.D / 2) / n : 0; }
    var notWon = list.filter(function (x) { return x.res !== 'W'; });
    var losses = list.filter(function (x) { return x.res === 'L'; });

    var ops = {};
    list.forEach(function (x) {
      var k = x.me + '|' + x.opening;
      if (!ops[k]) ops[k] = { name: x.opening, color: x.me, W: 0, D: 0, L: 0, n: 0 };
      ops[k][x.res]++; ops[k].n++;
    });
    var openings = Object.keys(ops).map(function (k) { var o = ops[k]; o.score = score(o); return o; })
      .sort(function (a, b) { return b.n - a.n || a.score - b.score; });

    var phase = { opening: 0, middlegame: 0, endgame: 0 };
    list.forEach(function (x) { x.blunders.forEach(function (b) { phase[b.phase]++; }); });

    var W = [];
    var blunderLoss = losses.filter(function (x) { return x.blunders.length; });
    W.push({
      id: 'blunder', count: blunderLoss.length, of: losses.length,
      title: 'مهره‌ی بی‌دفاع', detail: 'در ' + fa(blunderLoss.length) + ' باخت از ' + fa(losses.length) + ' مهره‌ای را بدون جبران از دست دادی.',
      tip: 'قبل از هر حرکت یک سؤال: بعد از این حرکت، کدام مهره‌ام بی‌دفاع می‌ماند؟',
      filter: function (x) { return x.res === 'L' && x.blunders.length; }
    });
    var timeG = losses.filter(function (x) { return x.lostOnTime || x.ttBlunders; });
    W.push({
      id: 'time', count: timeG.length, of: losses.length,
      title: 'فشار زمان', detail: fa(losses.filter(function (x) { return x.lostOnTime; }).length) + ' باخت روی زمان، و ' + fa(losses.filter(function (x) { return !x.lostOnTime && x.ttBlunders; }).length) + ' باخت دیگر با اشتباهی که در ثانیه‌های آخر زدی.',
      tip: 'در ۱۵ حرکت اول سریع‌تر بازی کن تا برای آخر بازی وقت بماند.',
      filter: function (x) { return x.res === 'L' && (x.lostOnTime || x.ttBlunders); }
    });
    var conv = list.filter(function (x) { return x.convertFail; });
    W.push({
      id: 'convert', count: conv.length, of: notWon.length,
      title: 'تبدیل برتری به برد', detail: 'در ' + fa(conv.length) + ' بازی حداقل ۳ امتیاز مهره جلو بودی و نبردی.',
      tip: 'وقتی جلویی، مهره‌ها را معاوضه کن و از ضدحمله فرار کن؛ عجله لازم نیست.',
      filter: function (x) { return x.convertFail; }
    });
    var weakOp = openings.filter(function (o) { return o.n >= 3; }).sort(function (a, b) { return a.score - b.score; })[0];
    if (weakOp && weakOp.score < 0.45) {
      W.push({
        id: 'opening', count: weakOp.L, of: weakOp.n,
        title: 'گشایش ' + weakOp.name, detail: 'با ' + (weakOp.color === 'w' ? 'سفید' : 'سیاه') + ' در ' + fa(weakOp.n) + ' بازی فقط ' + fa(Math.round(weakOp.score * 100)) + '٪ امتیاز گرفتی.',
        tip: 'ده حرکت اول همین گشایش را مرور کن، یا فعلاً یک گشایش ساده‌تر انتخاب کن.',
        opening: weakOp,
        filter: function (x) { return x.opening === weakOp.name && x.me === weakOp.color; }
      });
    }
    W.forEach(function (w) { w.share = w.of ? w.count / w.of : 0; });
    W.sort(function (a, b) { return b.count - a.count; });

    var train = [];
    list.forEach(function (x) {
      x.blunders.forEach(function (b) {
        if (b.loss >= 2) train.push({ game: x, b: b, pos: x.g.plies[b.ply].before, played: x.g.plies[b.ply] });
      });
    });

    var clockCurve = null;
    var withClk = list.filter(function (x) { return x.myClocks.length > 10 && x.base; });
    if (withClk.length >= 3) {
      var maxM = 40, sumW = [], cW = [], sumL = [], cL = [];
      for (var m = 0; m < maxM; m++) { sumW[m] = 0; cW[m] = 0; sumL[m] = 0; cL[m] = 0; }
      withClk.forEach(function (x) {
        x.myClocks.slice(0, maxM).forEach(function (c, m) {
          var pct = c / x.base;
          if (x.res === 'W') { sumW[m] += pct; cW[m]++; } else if (x.res === 'L') { sumL[m] += pct; cL[m]++; }
        });
      });
      clockCurve = {
        win: sumW.map(function (s, m) { return cW[m] >= 2 ? s / cW[m] : null; }),
        loss: sumL.map(function (s, m) { return cL[m] >= 2 ? s / cL[m] : null; })
      };
    }

    return {
      user: user, games: list, tot: tot, col: col, score: score(tot),
      scoreW: score(col.w), scoreB: score(col.b), openings: openings, phase: phase,
      weaknesses: W, train: train, clockCurve: clockCurve
    };
  }

  function fa(n) { return Number(n).toLocaleString('fa-IR'); }

  return { run: run, fa: fa };
})();
if (typeof module !== 'undefined') module.exports = Analyze;
