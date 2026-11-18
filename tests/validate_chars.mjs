// Checks character data, trivia and game logic. Usage: node tests/validate_chars.mjs [file]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const CG = createRequire(import.meta.url)('../src/chars-core.js');
const file = process.argv[2] || new URL('./chars-fixture.json', import.meta.url);
const d = JSON.parse(readFileSync(file, 'utf8'));
const trivia = JSON.parse(readFileSync(new URL('../src/trivia.json', import.meta.url), 'utf8')).trivia;
let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
const C = CG.C, ids = new Set();
for (const r of d.rows) {
  if (r.length !== d.cols.length) fail('row length ' + r[0]);
  if (ids.has(r[C.id])) fail('duplicate id ' + r[0]); ids.add(r[C.id]);
  if (!r[C.name] || !r[C.series] || !(r[C.rank] > 0)) fail('missing field ' + r[0]);
}
const fixture = String(file).includes('fixture');
if (!fixture && d.rows.length < 500) fail('only ' + d.rows.length + ' rows');
// trivia must never contain the character's name or series title
let withTrivia = 0;
for (const r of d.rows) {
  const tv = trivia[String(r[C.id])]; if (!tv) continue; withTrivia++;
  const parts = r[C.name].split(/\s+/).filter(p => p.length > 2).map(p => p.toLowerCase());
  const series = r[C.series].split(':')[0].toLowerCase();
  for (const line of tv) {
    const l = line.toLowerCase();
    if (parts.some(p => l.includes(p))) fail(`trivia names the character: ${r[C.name]}: ${line}`);
    if (series.length > 3 && l.includes(series)) fail(`trivia names the show: ${r[C.name]}: ${line}`);
  }
}
// logic
const [a, b] = d.rows;
if (!CG.compare(a, a).correct) fail('self compare');
if (CG.compare(a, b).correct) fail('different rows equal');
const cl = CG.clues(a, trivia);
if (cl.length !== CG.STEPS || cl.some(x => !x || /undefined|null|NaN/.test(x))) fail('bad clues ' + JSON.stringify(cl));
if (cl.slice(0, 6).some(x => x.toLowerCase().includes(a[C.name].toLowerCase()))) fail('a clue gives away the name');
if (CG.search(d.rows, a[C.name].slice(0, 4)).length === 0) fail('search finds nothing');
if (CG.score(1) !== 7 || CG.score(7) !== 1) fail('score');
const pool = CG.dailyPool(d.rows, trivia), seen = new Set(), days = Math.min(365, pool.length);
for (let i = 1; i <= days; i++) seen.add(CG.dailyIndex(pool.length, i));
if (seen.size !== days) fail('daily repeats');
console.log(`${d.rows.length} characters, ${withTrivia} with trivia, daily pool ${pool.length}: ${bad ? bad + ' problems' : 'ok'}`);
process.exit(bad ? 1 : 0);
