// Minimal chess core: legal moves, SAN, PGN parsing, material search.
var Chess = (function () {
  var FILES = 'abcdefgh';
  var VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  var KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  var KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function isW(p) { return p && p === p.toUpperCase(); }
  function colorOf(p) { return p ? (isW(p) ? 'w' : 'b') : null; }
  function sqName(i) { return FILES[i % 8] + (Math.floor(i / 8) + 1); }
  function sqIdx(n) { return (parseInt(n[1], 10) - 1) * 8 + FILES.indexOf(n[0]); }

  function start() {
    var b = new Array(64).fill('');
    var back = 'RNBQKBNR';
    for (var f = 0; f < 8; f++) {
      b[f] = back[f]; b[8 + f] = 'P';
      b[48 + f] = 'p'; b[56 + f] = back[f].toLowerCase();
    }
    return { b: b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1 };
  }

  function fromFEN(fen) {
    var parts = fen.split(' ');
    var b = new Array(64).fill('');
    var rows = parts[0].split('/');
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var c of rows[r]) {
        if (/\d/.test(c)) f += parseInt(c, 10);
        else { b[(7 - r) * 8 + f] = c; f++; }
      }
    }
    var cs = parts[2] || '-';
    return {
      b: b, turn: parts[1] || 'w',
      castle: { K: cs.includes('K'), Q: cs.includes('Q'), k: cs.includes('k'), q: cs.includes('q') },
      ep: parts[3] && parts[3] !== '-' ? sqIdx(parts[3]) : -1
    };
  }

  function attacked(s, sq, by) {
    var b = s.b, f = sq % 8, r = Math.floor(sq / 8), i, nf, nr, p;
    // pawns
    var dir = by === 'w' ? -1 : 1;
    for (var df of [-1, 1]) {
      nf = f + df; nr = r + dir;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        p = b[nr * 8 + nf];
        if (p === (by === 'w' ? 'P' : 'p')) return true;
      }
    }
    for (i = 0; i < 8; i++) {
      nf = f + KN[i][0]; nr = r + KN[i][1];
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        p = b[nr * 8 + nf];
        if (p === (by === 'w' ? 'N' : 'n')) return true;
      }
      nf = f + KG[i][0]; nr = r + KG[i][1];
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        p = b[nr * 8 + nf];
        if (p === (by === 'w' ? 'K' : 'k')) return true;
      }
    }
    var sets = [[DIAG, 'BQ'], [ORTH, 'RQ']];
    for (var si = 0; si < 2; si++) {
      var dirs = sets[si][0], types = sets[si][1];
      for (var d of dirs) {
        nf = f + d[0]; nr = r + d[1];
        while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
          p = b[nr * 8 + nf];
          if (p) {
            if (colorOf(p) === by && types.includes(p.toUpperCase())) return true;
            break;
          }
          nf += d[0]; nr += d[1];
        }
      }
    }
    return false;
  }

  function kingSq(s, c) {
    var k = c === 'w' ? 'K' : 'k';
    return s.b.indexOf(k);
  }

  function inCheck(s, c) {
    var k = kingSq(s, c || s.turn);
    return k >= 0 && attacked(s, k, (c || s.turn) === 'w' ? 'b' : 'w');
  }

  function pseudo(s) {
    var b = s.b, c = s.turn, out = [], them = c === 'w' ? 'b' : 'w';
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p || colorOf(p) !== c) continue;
      var t = p.toUpperCase(), f = i % 8, r = Math.floor(i / 8), nf, nr, to;
      if (t === 'P') {
        var dir = c === 'w' ? 1 : -1, startR = c === 'w' ? 1 : 6, lastR = c === 'w' ? 7 : 0;
        nr = r + dir;
        if (nr >= 0 && nr < 8) {
          to = nr * 8 + f;
          if (!b[to]) {
            pushPawn(out, i, to, p, '', nr === lastR, false);
            if (r === startR && !b[(r + 2 * dir) * 8 + f]) out.push({ from: i, to: (r + 2 * dir) * 8 + f, p: p, cap: '', dbl: true });
          }
          for (var df of [-1, 1]) {
            nf = f + df;
            if (nf < 0 || nf > 7) continue;
            to = nr * 8 + nf;
            if (b[to] && colorOf(b[to]) === them) pushPawn(out, i, to, p, b[to], nr === lastR, false);
            else if (to === s.ep) pushPawn(out, i, to, p, c === 'w' ? 'p' : 'P', false, true);
          }
        }
      } else if (t === 'N' || t === 'K') {
        var offs = t === 'N' ? KN : KG;
        for (var o of offs) {
          nf = f + o[0]; nr = r + o[1];
          if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
          to = nr * 8 + nf;
          if (!b[to] || colorOf(b[to]) === them) out.push({ from: i, to: to, p: p, cap: b[to] });
        }
        if (t === 'K') {
          var home = c === 'w' ? 4 : 60;
          if (i === home && !attacked(s, home, them)) {
            var kc = c === 'w' ? 'K' : 'k', qc = c === 'w' ? 'Q' : 'q', rook = c === 'w' ? 'R' : 'r';
            if (s.castle[kc] && !b[home + 1] && !b[home + 2] && b[home + 3] === rook &&
              !attacked(s, home + 1, them) && !attacked(s, home + 2, them))
              out.push({ from: i, to: home + 2, p: p, cap: '', castle: 'K' });
            if (s.castle[qc] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === rook &&
              !attacked(s, home - 1, them) && !attacked(s, home - 2, them))
              out.push({ from: i, to: home - 2, p: p, cap: '', castle: 'Q' });
          }
        }
      } else {
        var dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
        for (var d of dirs) {
          nf = f + d[0]; nr = r + d[1];
          while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            to = nr * 8 + nf;
            if (!b[to]) out.push({ from: i, to: to, p: p, cap: '' });
            else { if (colorOf(b[to]) === them) out.push({ from: i, to: to, p: p, cap: b[to] }); break; }
            nf += d[0]; nr += d[1];
          }
        }
      }
    }
    return out;
  }

  function pushPawn(out, from, to, p, cap, promo, ep) {
    if (promo) {
      for (var q of 'QRBN') out.push({ from: from, to: to, p: p, cap: cap, promo: isW(p) ? q : q.toLowerCase() });
    } else out.push({ from: from, to: to, p: p, cap: cap, ep: ep });
  }

  function make(s, m) {
    var b = s.b.slice();
    var c = s.turn;
    b[m.to] = m.promo || m.p;
    b[m.from] = '';
    if (m.ep) b[m.to + (c === 'w' ? -8 : 8)] = '';
    if (m.castle === 'K') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ''; }
    if (m.castle === 'Q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ''; }
    var cs = { K: s.castle.K, Q: s.castle.Q, k: s.castle.k, q: s.castle.q };
    if (m.p === 'K') { cs.K = false; cs.Q = false; }
    if (m.p === 'k') { cs.k = false; cs.q = false; }
    if (m.from === 0 || m.to === 0) cs.Q = false;
    if (m.from === 7 || m.to === 7) cs.K = false;
    if (m.from === 56 || m.to === 56) cs.q = false;
    if (m.from === 63 || m.to === 63) cs.k = false;
    return { b: b, turn: c === 'w' ? 'b' : 'w', castle: cs, ep: m.dbl ? (m.from + m.to) / 2 : -1 };
  }

  function legal(s) {
    var out = [];
    var ps = pseudo(s);
    for (var m of ps) {
      var n = make(s, m);
      if (!inCheck(n, s.turn)) out.push(m);
    }
    return out;
  }

  function san(s, m, moves) {
    var str;
    if (m.castle) str = m.castle === 'K' ? 'O-O' : 'O-O-O';
    else {
      var t = m.p.toUpperCase();
      if (t === 'P') {
        str = (m.cap ? FILES[m.from % 8] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
      } else {
        var amb = (moves || legal(s)).filter(function (o) { return o.p === m.p && o.to === m.to && o.from !== m.from; });
        var dis = '';
        if (amb.length) {
          var sameF = amb.some(function (o) { return o.from % 8 === m.from % 8; });
          var sameR = amb.some(function (o) { return Math.floor(o.from / 8) === Math.floor(m.from / 8); });
          if (!sameF) dis = FILES[m.from % 8];
          else if (!sameR) dis = String(Math.floor(m.from / 8) + 1);
          else dis = sqName(m.from);
        }
        str = t + dis + (m.cap ? 'x' : '') + sqName(m.to);
      }
    }
    var n = make(s, m);
    if (inCheck(n)) str += legal(n).length ? '+' : '#';
    return str;
  }

  function parseSan(s, tok, moves) {
    var clean = tok.replace(/[+#!?]/g, '').replace(/0/g, 'O').replace(/^([a-h][18])([QRBN])$/, '$1=$2');
    moves = moves || legal(s);
    if (clean === 'O-O' || clean === 'O-O-O') {
      var side = clean === 'O-O' ? 'K' : 'Q';
      return moves.filter(function (m) { return m.castle === side; })[0] || null;
    }
    var mm = clean.match(/^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQ]))?$/);
    if (!mm) return null;
    var t = mm[1] || 'P', to = sqIdx(mm[4]);
    var cands = moves.filter(function (m) {
      if (m.castle) return false;
      if (m.p.toUpperCase() !== t || m.to !== to) return false;
      if (mm[2] && FILES[m.from % 8] !== mm[2]) return false;
      if (mm[3] && String(Math.floor(m.from / 8) + 1) !== mm[3]) return false;
      if (mm[5] && (!m.promo || m.promo.toUpperCase() !== mm[5])) return false;
      if (!mm[5] && m.promo && m.promo.toUpperCase() !== 'Q') return false;
      return true;
    });
    return cands.length === 1 ? cands[0] : null;
  }

  function material(s) {
    var w = 0, bl = 0;
    for (var p of s.b) {
      if (!p) continue;
      if (isW(p)) w += VAL[p]; else bl += VAL[p.toUpperCase()];
    }
    return w - bl;
  }

  // Negamax with alpha-beta and capture quiescence, material only.
  function qsearch(s, alpha, beta, depth) {
    var stand = (s.turn === 'w' ? 1 : -1) * material(s);
    if (depth <= 0) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var moves = legal(s).filter(function (m) { return m.cap || m.promo; });
    moves.sort(function (a, b) { return VAL[(b.cap || 'P').toUpperCase()] - VAL[(a.cap || 'P').toUpperCase()]; });
    for (var m of moves) {
      var v = -qsearch(make(s, m), -beta, -alpha, depth - 1);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  function search(s, depth, alpha, beta) {
    if (alpha === undefined) { alpha = -10000; beta = 10000; }
    var moves = legal(s);
    if (!moves.length) return inCheck(s) ? -1000 - depth : 0;
    if (depth <= 0) return qsearch(s, alpha, beta, 4);
    moves.sort(function (a, b) { return (b.cap ? VAL[b.cap.toUpperCase()] : 0) - (a.cap ? VAL[a.cap.toUpperCase()] : 0); });
    var best = -10000;
    for (var m of moves) {
      var v = -search(make(s, m), depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  function bestMoves(s, depth) {
    var moves = legal(s), scored = [];
    for (var m of moves) scored.push({ m: m, v: -search(make(s, m), depth - 1) });
    scored.sort(function (a, b) { return b.v - a.v; });
    return scored;
  }

  function parsePGN(text) {
    text = text.replace(/\r/g, '').replace(/^﻿/, '');
    var chunks = text.split(/\n\s*\n(?=\[)/);
    var games = [], cur = null;
    for (var ch of chunks) {
      ch = ch.trim();
      if (!ch) continue;
      var headerPart = '', movePart = '';
      var lines = ch.split('\n');
      var i = 0;
      while (i < lines.length && /^\s*\[/.test(lines[i])) { headerPart += lines[i] + '\n'; i++; }
      movePart = lines.slice(i).join(' ');
      if (headerPart && !movePart.trim()) { cur = { headers: headerPart, moves: '' }; continue; }
      if (!headerPart && cur) { cur.moves = movePart; games.push(cur); cur = null; continue; }
      games.push({ headers: headerPart, moves: movePart });
    }
    if (cur) games.push(cur);
    return games.map(parseOne).filter(Boolean);
  }

  function parseOne(g) {
    var h = {};
    g.headers.replace(/\[(\w+)\s+"([^"]*)"\]/g, function (_, k, v) { h[k] = v; return ''; });
    var mt = g.moves;
    // remove nested variations
    var prev;
    do { prev = mt; mt = mt.replace(/\([^()]*\)/g, ' '); } while (mt !== prev);
    var tokens = [], re = /\{([^}]*)\}|;[^\n]*|(\S+)/g, mm;
    while ((mm = re.exec(mt))) {
      if (mm[1] !== undefined) {
        var clk = mm[1].match(/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/);
        if (clk && tokens.length) tokens[tokens.length - 1].clk = (+clk[1]) * 3600 + (+clk[2]) * 60 + parseFloat(clk[3]);
      } else if (mm[2]) {
        var t = mm[2].replace(/^\d+\.(\.\.)?/, '');
        if (!t || /^\$\d+$/.test(t) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) continue;
        tokens.push({ san: t });
      }
    }
    var s = h.FEN ? fromFEN(h.FEN) : start();
    var plies = [];
    for (var tk of tokens) {
      var moves = legal(s);
      var m = parseSan(s, tk.san, moves);
      if (!m) break;
      var sanStr = san(s, m, moves);
      var before = s;
      s = make(s, m);
      plies.push({ san: sanStr, from: m.from, to: m.to, color: before.turn, clk: tk.clk, before: before, after: s, mat: material(s) });
    }
    if (!plies.length) return null;
    return { h: h, plies: plies, start: h.FEN ? fromFEN(h.FEN) : start() };
  }

  return {
    start: start, fromFEN: fromFEN, legal: legal, make: make, san: san, parseSan: parseSan,
    inCheck: inCheck, material: material, search: search, bestMoves: bestMoves,
    parsePGN: parsePGN, sqName: sqName, sqIdx: sqIdx, isW: isW, VAL: VAL
  };
})();
if (typeof module !== 'undefined') module.exports = Chess;
