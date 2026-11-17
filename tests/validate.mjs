// Checks a data file's shape and the game logic. Usage: node tests/validate.mjs [file]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const AG = createRequire(import.meta.url)('../src/core.js');
const file = process.argv[2] || new URL('./fixture.json', import.meta.url);
const d = JSON.parse(readFileSync(file, 'utf8'));
let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
const C = AG.C, ids = new Set();
for (const r of d.rows) {
  if (r.length !== d.cols.length) fail('row length ' + r[0]);
  if (ids.has(r[C.id])) fail('duplicate id ' + r[C.id]); ids.add(r[C.id]);
  if (!r[C.romaji] || !(r[C.year] > 1900) || !Array.isArray(r[C.genres]) || !r[C.studio]) fail('missing field ' + r[C.id]);
}
const minRows = file.toString().includes('fixture') ? 10 : 500;
if (d.rows.length < minRows) fail(`only ${d.rows.length} rows`);
// logic
const [a, b] = d.rows;
const self = AG.compare(a, a);
if (!self.correct || ['year', 'format', 'studio', 'source', 'genres'].some(k => self[k].s !== 'hit')) fail('self-compare not all hits');
const ab = AG.compare(a, b);
if (ab.correct) fail('different rows compared as correct');
if (a[C.year] !== b[C.year] && ab.year.dir !== (b[C.year] > a[C.year] ? 'up' : 'down')) fail('year arrow');
if (AG.search(d.rows, AG.title(a).slice(0, 4)).length === 0) fail('search finds nothing');
const pool = AG.dailyPool(d.rows), seen = new Set(), days = Math.min(365, pool.length);
for (let i = 1; i <= days; i++) seen.add(AG.dailyIndex(pool.length, i));
if (seen.size !== days) fail('daily repeats');
console.log(`${d.rows.length} titles, daily pool ${pool.length}: ${bad ? bad + ' problems' : 'ok'}`);
process.exit(bad ? 1 : 0);
