// CSS for the piece sets in /pieces (one class per set on <body>).
const SETS = ['cburnett', 'merida', 'chessnut', 'fantasy'];
function css() {
  let out = '';
  for (const s of SETS) for (const c of ['w', 'b']) for (const t of 'KQRBNP') {
    out += `body[data-pieces="${s}"] .pc.${c}${t}{background-image:url(pieces/${s}/${c}${t}.svg)}\n`;
  }
  return out;
}
module.exports = { css, SETS };
