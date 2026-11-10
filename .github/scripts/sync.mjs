// Pulls games from the Chess.com public API into data/<username>.pgn.
// First run for a player takes the whole history; later runs take the last two months.
import fs from 'node:fs';

const HEADERS = { 'User-Agent': 'shatranj-sync (https://github.com/mohhsen67/chess)' };
const players = fs.readFileSync('data/players.txt', 'utf8')
  .split('\n').map(s => s.trim().toLowerCase()).filter(s => s && !s.startsWith('#'));

function split(pgn) {
  return pgn.replace(/\r/g, '').split(/\n\s*\n(?=\[Event )/).map(s => s.trim()).filter(Boolean);
}
function key(g) {
  const link = g.match(/\[Link "([^"]+)"\]/);
  return link ? link[1] : g;
}
async function get(url, asText) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: HEADERS });
    if (r.status === 404) return null;
    if (r.status === 429) { await new Promise(res => setTimeout(res, 5000)); continue; }
    if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
    return asText ? r.text() : r.json();
  }
  throw new Error(url + ' -> rate limited');
}

let failed = false;
for (const u of players) {
  try {
    const file = `data/${u}.pgn`;
    const exists = fs.existsSync(file);
    const games = exists ? split(fs.readFileSync(file, 'utf8')) : [];
    const seen = new Set(games.map(key));
    const arc = await get(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`);
    if (!arc) { console.warn(`${u}: no such Chess.com player, skipped`); continue; }
    const months = exists ? arc.archives.slice(-2) : arc.archives;
    let added = 0;
    for (const m of months) {
      const txt = await get(m + '/pgn', true);
      if (!txt) continue;
      for (const g of split(txt)) {
        const k = key(g);
        if (!seen.has(k)) { seen.add(k); games.push(g); added++; }
      }
    }
    if (added || !exists) fs.writeFileSync(file, games.join('\n\n') + '\n');
    console.log(`${u}: ${added} new, ${games.length} total`);
  } catch (e) {
    console.error(`${u}: ${e.message}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
