// Generates sample blitz games (clearly fake) for the demo state.
const C = require('./engine.js');
let seed = 20261110;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }

const ME = 'Mannheim_Blitz';
const OPP = ['K_Weber', 'schachfreund88', 'LudwigsBauer', 'NeckarKnight', 'rhein_rook', 'Teodor_M', 'blitzmaus', 'KaiserPawn', 'felix_hd', 'Odenwald64', 'quadrat_q7', 'Lindenhof_Lars'];
const OPEN = {
  w: [
    { eco: 'C50', url: 'Italian-Game-Giuoco-Pianissimo', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6' },
    { eco: 'B12', url: 'Caro-Kann-Defense-Advance-Variation', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5' },
    { eco: 'B01', url: 'Scandinavian-Defense-Mieses-Kotroc-Variation', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6' },
    { eco: 'C42', url: 'Petrovs-Defense', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5' }
  ],
  b: [
    { eco: 'B90', url: 'Sicilian-Defense-Najdorf-Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', weak: true },
    { eco: 'D53', url: 'Queens-Gambit-Declined', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O' },
    { eco: 'D02', url: 'London-System', moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6' },
    { eco: 'E90', url: 'Kings-Indian-Defense', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O' }
  ]
};

const CENTER = [0, 1, 2, 3, 3, 2, 1, 0];
function pos(s, color) {
  let v = 0;
  for (let i = 0; i < 64; i++) {
    const p = s.b[i]; if (!p) continue;
    const w = C.isW(p), sign = (w ? 'w' : 'b') === color ? 1 : -1;
    const t = p.toUpperCase(), f = i % 8, r = Math.floor(i / 8), rr = w ? r : 7 - r;
    if (t === 'N' || t === 'B') v += sign * (CENTER[f] + CENTER[r]) * 4 + sign * (rr > 0 ? 8 : 0);
    if (t === 'P') v += sign * rr * 3 + sign * CENTER[f] * 2;
    if (t === 'K') v += sign * ((f >= 6 || f <= 1) && rr === 0 ? 20 : 0);
    if (t === 'R' || t === 'Q') v += sign * rr * 1;
  }
  return v;
}

function choose(s, blunderP) {
  const moves = C.legal(s);
  const scored = moves.map(m => {
    const n = C.make(s, m);
    const mat = -C.search(n, 1);
    return { m, mat, v: mat * 100 + pos(n, s.turn) + rnd() * 18 };
  });
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0];
  if (rnd() < blunderP) {
    const bad = scored.filter(x => x.mat <= best.mat - 2 && x.mat > -900);
    if (bad.length) return pick(bad).m;
  }
  return best.m;
}

function fmtClk(t) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = t - m * 60;
  return '0:' + String(m).padStart(2, '0') + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
}

function game(idx) {
  const meWhite = rnd() < 0.5;
  const op = pick(OPEN[meWhite ? 'w' : 'b']);
  const opp = pick(OPP);
  const myElo = 1430 + Math.round(rnd() * 70), opElo = myElo - 60 + Math.round(rnd() * 120);
  let s = C.start();
  const out = [];
  const clk = { w: 180, b: 180 };
  const meC = meWhite ? 'w' : 'b';
  let result = null, term = null;
  const book = op.moves.split(' ');
  for (let ply = 0; ply < 170; ply++) {
    const mover = s.turn, isMe = mover === meC;
    let m;
    if (ply < book.length) m = C.parseSan(s, book[ply]);
    else {
      let bp = isMe ? 0.022 : 0.05;
      if (isMe && clk[mover] < 25) bp = 0.22;
      if (isMe && op.weak && ply < 40) bp = 0.12;
      m = choose(s, bp);
    }
    let spend;
    if (isMe) spend = ply < 20 ? 3 + rnd() * 6 : clk[mover] < 30 ? 1.6 + rnd() * 3.4 : 3.5 + rnd() * 11;
    else spend = 0.8 + rnd() * 5;
    if (clk[mover] - spend <= 0) {
      const winner = mover === 'w' ? 'b' : 'w';
      result = winner === 'w' ? '1-0' : '0-1';
      term = (winner === meC ? ME : opp) + ' won on time';
      break;
    }
    clk[mover] = clk[mover] - spend + 2;
    const sanStr = C.san(s, m);
    s = C.make(s, m);
    out.push({ san: sanStr, clk: clk[mover], color: mover });
    const moves = C.legal(s);
    if (!moves.length) {
      if (C.inCheck(s)) { result = mover === 'w' ? '1-0' : '0-1'; term = (mover === meC ? ME : opp) + ' won by checkmate'; }
      else { result = '1/2-1/2'; term = 'Game drawn by stalemate'; }
      break;
    }
    const mat = C.material(s);
    if (ply > 50 && Math.abs(mat) >= 9) {
      const winner = mat > 0 ? 'w' : 'b';
      result = winner === 'w' ? '1-0' : '0-1';
      term = (winner === meC ? ME : opp) + ' won by resignation';
      break;
    }
    const pieces = s.b.filter(Boolean).length;
    if (pieces <= 3) { result = '1/2-1/2'; term = 'Game drawn by insufficient material'; break; }
  }
  if (!result) {
    const mat = C.material(s);
    if (Math.abs(mat) >= 3) {
      const winner = mat > 0 ? 'w' : 'b';
      result = winner === 'w' ? '1-0' : '0-1';
      term = (winner === meC ? ME : opp) + ' won by resignation';
    } else { result = '1/2-1/2'; term = 'Game drawn by agreement'; }
  }
  const day = 12 + Math.floor(idx * 28 / 40);
  const date = day <= 31 ? '2026.10.' + String(day).padStart(2, '0') : '2026.11.' + String(day - 31).padStart(2, '0');
  const W = meWhite ? ME : opp, B = meWhite ? opp : ME;
  const hdr = [
    ['Event', 'Live Chess'], ['Site', 'Chess.com'], ['Date', date], ['Round', '-'],
    ['White', W], ['Black', B], ['Result', result],
    ['WhiteElo', String(meWhite ? myElo : opElo)], ['BlackElo', String(meWhite ? opElo : myElo)],
    ['TimeControl', '180+2'], ['ECO', op.eco], ['ECOUrl', 'https://www.chess.com/openings/' + op.url], ['Termination', term]
  ];
  let txt = hdr.map(([k, v]) => `[${k} "${v}"]`).join('\n') + '\n\n';
  out.forEach((p, i) => {
    const n = Math.floor(i / 2) + 1;
    txt += (i % 2 === 0 ? n + '. ' : n + '... ') + p.san + ' {[%clk ' + fmtClk(p.clk) + ']} ';
  });
  txt += result + '\n';
  return txt;
}

const games = [];
for (let i = 0; i < 40; i++) games.push(game(i));
require('fs').writeFileSync('samples.pgn', games.join('\n'));
const parsed = C.parsePGN(games.join('\n'));
let st = { W: 0, D: 0, L: 0 };
const terms = {};
parsed.forEach(g => {
  const meW = g.h.White === ME, r = g.h.Result;
  const res = r === '1/2-1/2' ? 'D' : ((r === '1-0') === meW ? 'W' : 'L');
  st[res]++;
  const t = g.h.Termination.replace(ME, 'ME').replace(/^\S+ won/, x => x.startsWith('ME') ? x : 'OPP won');
  terms[t] = (terms[t] || 0) + 1;
});
console.log(parsed.length, st, terms, 'bytes', games.join('\n').length, 'avg plies', parsed.reduce((a, g) => a + g.plies.length, 0) / parsed.length);
