// Fetch the most popular anime from the AniList GraphQL API and write a compact JSON file.
// Usage: node scripts/fetch_anime.mjs [pages=30] > docs/anime.json
// Facts only (titles, year, studio, genres, etc.); no artwork, which belongs to its owners.
// AniList terms: free for non-commercial use and for commercial use under $150/month revenue.
const PAGES = +process.argv[2] || 30;
const Q = `query ($page: Int) { Page(page: $page, perPage: 50) { pageInfo { hasNextPage }
  media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
    id title { romaji english } seasonYear season startDate { year } format episodes genres
    averageScore popularity source studios(isMain: true) { nodes { name } }
    tags { name rank isMediaSpoiler isGeneralSpoiler } } } }`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(n) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: Q, variables: { page: n } }) });
    if (res.status === 429) { const wait = (+res.headers.get('retry-after') || 60) * 1000; console.error(`page ${n}: rate limited, waiting ${wait / 1000}s`); await sleep(wait); continue; }
    if (!res.ok) { console.error(`page ${n}: HTTP ${res.status}`); await sleep(5000); continue; }
    return (await res.json()).data.Page;
  }
  throw new Error('AniList unavailable for page ' + n);
}
const pretty = s => (s || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
const rows = [];
for (let n = 1; n <= PAGES; n++) {
  const p = await page(n);
  for (const m of p.media) {
    const year = m.seasonYear || (m.startDate && m.startDate.year);
    if (!year || !m.format) continue;
    const studio = (m.studios.nodes[0] || {}).name || 'Unknown';
    const tags = m.tags.filter(t => !t.isMediaSpoiler && !t.isGeneralSpoiler && t.rank >= 60).slice(0, 4).map(t => t.name);
    rows.push([m.id, m.title.romaji, m.title.english && m.title.english !== m.title.romaji ? m.title.english : null, year,
      m.season ? pretty(m.season) : null, m.format.replace('_', ' '), m.episodes || null, m.genres, studio,
      pretty(m.source || 'other'), m.averageScore || null, m.popularity, tags]);
  }
  console.error(`page ${n}: ${rows.length} titles`);
  if (!p.pageInfo.hasNextPage) break;
  await sleep(2600); // stay under the reduced 30 requests/minute limit
}
process.stdout.write(JSON.stringify({ v: 1, fetched: new Date().toISOString().slice(0, 10), source: 'AniList (https://anilist.co)',
  cols: ['id', 'romaji', 'english', 'year', 'season', 'format', 'episodes', 'genres', 'studio', 'source', 'score', 'popularity', 'tags'], rows }));
