// Piece set drawn for Shatranj (45x45 viewBox). Builds CSS with data-URI backgrounds.
const KNIGHT_BODY = 'M182 382 C 178 336, 196 304, 232 276 C 214 270, 196 266, 176 270 L 150 284 C 132 292, 112 280, 114 260 C 116 238, 136 214, 160 190 C 182 168, 196 146, 204 124 L 214 92 L 236 116 L 254 90 L 266 120 C 324 136, 362 196, 362 270 C 362 320, 352 364, 340 400 L 176 400 C 178 392, 180 388, 182 382 Z';
const BASE = (x, w) => `<rect x="${x}" y="34" width="${w}" height="5" rx="2.2"/>`;

function shapes(c) {
  // c: {fill, line, cut}
  const g = (inner, extra = '') => `<g fill="${c.fill}" stroke="${c.line}" stroke-width="1.4" stroke-linejoin="round">${inner}</g>${extra}`;
  return {
    P: g(`<circle cx="22.5" cy="12.5" r="5"/><path d="M18.6 19.2h7.8l-.9 2.4c2.6 2.9 4 7 4.4 12.1H15.1c.4-5.1 1.8-9.2 4.4-12.1z"/>${BASE(11, 23)}`),
    R: g(`<path d="M12 8.5H16V11.5H19.6V8.5H25.4V11.5H29V8.5H33V15.8L30 18.4V29.6L32.6 33.2H12.4L15 29.6V18.4L12 15.8Z"/><path d="M15 18.4H30" fill="none"/>${BASE(10, 25)}`),
    B: g(`<circle cx="22.5" cy="7.4" r="2.3"/><path d="M22.5 9.9C17 13.9 15.4 19 17 23c1 2.5 3 3.6 5.5 3.6S27 25.5 28 23c1.6-4-0-9.1-5.5-13.1z"/><path d="M17.6 26.9H27.4L26.6 29.4H18.4Z"/><path d="M18.4 29.4C18 31.4 16.2 33 13.8 34H31.2C28.8 33 27 31.4 26.6 29.4Z"/>${BASE(11, 23)}`,
      `<path d="M24.6 14.6L20.6 19" stroke="${c.cut}" stroke-width="1.6" stroke-linecap="round"/>`),
    N: `<g transform="translate(-1.3 -3.7) scale(.0988)" fill="${c.fill}" stroke="${c.line}" stroke-width="14" stroke-linejoin="round"><path d="${KNIGHT_BODY}"/></g><g fill="${c.fill}" stroke="${c.line}" stroke-width="1.4">${BASE(10.5, 24)}</g>` +
      `<circle cx="19.6" cy="13.3" r="1.2" fill="${c.cut}"/><path d="M26 10.2c4 2.8 5.8 7.4 5.6 13" fill="none" stroke="${c.cut}" stroke-width="1" stroke-linecap="round" opacity=".7"/>`,
    Q: g(`<path d="M10 14.2L14.6 26.4L16 13L19.6 25.2L22.5 10.8L25.4 25.2L29 13L30.4 26.4L35 14.2L32 30H13Z"/><path d="M13 30H32L31 33.4H14Z"/>${BASE(10.5, 24)}<circle cx="10" cy="13.2" r="2"/><circle cx="16" cy="11.8" r="2"/><circle cx="22.5" cy="9.4" r="2"/><circle cx="29" cy="11.8" r="2"/><circle cx="35" cy="13.2" r="2"/>`),
    K: g(`<path d="M21.4 3.6h2.2v2.6h2.6v2.2h-2.6v3.2h-2.2V8.4h-2.6V6.2h2.6z"/><path d="M22.5 11.6c-2.4 0-3 2.4 0 5.6 3-3.2 2.4-5.6 0-5.6z"/><path d="M12.6 30C9 25 9.2 19.2 13.6 17.2c3.5-1.6 7 .4 8.9 3.8 1.9-3.4 5.4-5.4 8.9-3.8 4.4 2 4.6 7.8 1 12.8z"/><path d="M12.6 30H32.4L31.4 33.4H13.6Z"/>${BASE(10.5, 24)}`)
  };
}

const COLORS = {
  w: { fill: '#FBF8F1', line: '#1C2131', cut: '#1C2131' },
  b: { fill: '#2B3144', line: '#0E121C', cut: '#B9C1D4' }
};

function svgFor(color, type) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">${shapes(COLORS[color])[type]}</svg>`;
}

function css() {
  let out = '';
  for (const c of ['w', 'b']) for (const t of 'KQRBNP') {
    out += `.pc.${c}${t}{background-image:url("data:image/svg+xml,${encodeURIComponent(svgFor(c, t))}")}\n`;
  }
  return out;
}

module.exports = { svgFor, css };
