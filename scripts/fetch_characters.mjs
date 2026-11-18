// Fetch the most-favourited anime characters from the AniList GraphQL API (facts only, no images).
// Usage:
//   node scripts/fetch_characters.mjs [pages=30] > docs/characters/characters.json
//   node scripts/fetch_characters.mjs 3 --notes 150 > /dev/null   # also prints spoiler-stripped notes
//     for the top N to stderr, so trivia can be written by hand (notes are never published by the app)
// AniList terms: free for non-commercial use and for commercial use under $150/month revenue.
const PAGES = +process.argv[2] || 30;
const NOTES = process.argv.includes('--notes') ? +process.argv[process.argv.indexOf('--notes') + 1] : 0;
const Q = `query ($page: Int) { Page(page: $page, perPage: 50) { pageInfo { hasNextPage }
  characters(sort: FAVOURITES_DESC) {
    id name { full native alternative } gender age dateOfBirth { month day } bloodType favourites
    description(asHtml: false)
    media(type: ANIME, sort: POPULARITY_DESC, perPage: 6) { edges { characterRole
      voiceActorRoles(language: JAPANESE, sort: [FAVOURITES_DESC]) { roleNotes voiceActor { id name { full } } }
      node { id title { romaji english } format seasonYear startDate { year } genres popularity isAdult
        studios(isMain: true) { nodes { name } } } } } } } }`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function gql(query, variables, label) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try { res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) }); }
    catch (err) { console.error(`${label}: network error (${err.cause && err.cause.code || err.message}), retrying`); await sleep(8000 * (attempt + 1)); continue; }
    if (res.status === 429) { const wait = (+res.headers.get('retry-after') || 60) * 1000; console.error(`${label}: rate limited, waiting ${wait / 1000}s`); await sleep(wait); continue; }
    if (!res.ok) { console.error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`); await sleep(5000); continue; }
    const j = await res.json(); if (j.errors) { console.error(label + ': ' + JSON.stringify(j.errors).slice(0, 500)); await sleep(5000); continue; }
    return j.data.Page;
  }
  throw new Error('AniList unavailable for ' + label);
}
const page = n => gql(Q, { page: n }, `page ${n}`);
// Other well-known characters each voice actor plays, for the "Also voices" clue.
const SQ = `query ($ids: [Int]) { Page(perPage: 50) { staff(id_in: $ids) { id
  characters(sort: FAVOURITES_DESC, perPage: 6) { nodes { id name { full } } } } } }`;

const clean = s => (s || '')
  .replace(/~!([\s\S]*?)!~/g, '')                 // AniList spoiler blocks
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')        // markdown links
  .replace(/<[^>]+>/g, ' ').replace(/__|\*\*|~~/g, '').replace(/\s+/g, ' ').trim();
const rows = []; let rank = 0;
for (let n = 1; n <= PAGES; n++) {
  const p = await page(n);
  for (const c of p.characters) {
    // Best-known show: the most popular one where they are main or supporting cast; cameos only as a last resort.
    const ROLE = { MAIN: 0, SUPPORTING: 0, BACKGROUND: 1 };
    const edges = (c.media && c.media.edges || []).filter(e => e.node && !e.node.isAdult)
      .map((e, i) => ({ e, i })).sort((a, b) => ((ROLE[a.e.characterRole] ?? 3) - (ROLE[b.e.characterRole] ?? 3)) || a.i - b.i).map(x => x.e);
    if (!edges.length) continue;
    const e = edges[0], m = e.node;
    const year = m.seasonYear || (m.startDate && m.startDate.year) || null;
    rank++;
    // Main voice: skip child/young/past-version roles, prefer the most-favourited actor.
    const roles = (e.voiceActorRoles || []).filter(v => v.voiceActor);
    const adult = roles.filter(v => !/child|young|kid|past|teen|baby|boy|girl|\(/i.test(v.roleNotes || ''));
    const vaObj = (adult[0] || roles[0] || {}).voiceActor || null;
    const va = vaObj ? vaObj.name.full : null, vaId = vaObj ? vaObj.id : null;
    const series = m.title.english || m.title.romaji;
    rows.push([c.id, c.name.full, (c.name.alternative || []).filter(Boolean).slice(0, 4), c.gender || null, c.age || null,
      c.dateOfBirth && c.dateOfBirth.month || null, c.dateOfBirth && c.dateOfBirth.day || null, c.bloodType || null,
      c.favourites, rank, e.characterRole || null, m.id, series, (m.format || '').replace('_', ' ') || null, year,
      (m.studios.nodes[0] || {}).name || null, m.genres || [], va, edges.slice(1, 4).map(x => x.node.title.english || x.node.title.romaji), vaId, []]);
    if (NOTES && rank <= NOTES) {
      process.stderr.write('NOTE\t' + JSON.stringify({ id: c.id, rank, name: c.name.full, series, notes: clean(c.description).slice(0, 700) }) + '\n');
    }
  }
  console.error(`page ${n}: ${rows.length} characters`);
  if (!p.pageInfo.hasNextPage) break;
  await sleep(2600);
}
const vaIds = [...new Set(rows.map(r => r[19]).filter(Boolean))];
const also = new Map();
for (let i = 0; i < vaIds.length; i += 50) {
  const p = await gql(SQ, { ids: vaIds.slice(i, i + 50) }, `voice actors ${i + 1}-${Math.min(i + 50, vaIds.length)}`);
  for (const st of p.staff) also.set(st.id, st.characters.nodes.map(n => ({ id: n.id, name: n.name.full })));
  await sleep(2600);
}
for (const r of rows) {
  // Skip the answer itself and anyone sharing part of its name (younger versions, relatives): those would give it away.
  const tokens = r[1].toLowerCase().split(/\s+/).filter(t => t.length > 2);
  r[20] = (also.get(r[19]) || []).filter(n => n.id !== r[0] && n.name && !n.name.toLowerCase().split(/\s+/).some(t => tokens.includes(t))).slice(0, 2).map(n => n.name);
}
console.error(`voice actors: ${vaIds.length}, characters with "also voices": ${rows.filter(r => r[20].length).length}`);
process.stdout.write(JSON.stringify({ v: 1, fetched: new Date().toISOString().slice(0, 10), source: 'AniList (https://anilist.co)',
  cols: ['id', 'name', 'alt', 'gender', 'age', 'month', 'day', 'blood', 'favourites', 'rank', 'role', 'seriesId', 'series', 'format', 'year', 'studio', 'genres', 'va', 'other', 'vaId', 'vaAlso'], rows }));
