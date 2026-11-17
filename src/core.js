/* Anime Guess — game logic (no DOM). Browser: window.AG; Node: module.exports. */
(function (root) {
  'use strict';
  const LAUNCH = '2026-11-17';
  const MAX_GUESSES = 8;
  const C = { id: 0, romaji: 1, english: 2, year: 3, season: 4, format: 5, episodes: 6, genres: 7, studio: 8, source: 9, score: 10, popularity: 11, tags: 12 };

  function dayNumber(dateStr) {
    const p = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return Math.round((p(dateStr) - p(LAUNCH)) / 86400000) + 1;
  }
  // Daily answers come from well-known TV series and films, so they are guessable.
  function dailyPool(rows) {
    const p = rows.filter(r => (r[C.format] === 'TV' || r[C.format] === 'MOVIE') && r[C.year] >= 1990)
      .sort((a, b) => b[C.popularity] - a[C.popularity]).slice(0, 400);
    return p.sort((a, b) => a[C.id] - b[C.id]);
  }
  function dailyIndex(n, day) {
    if (n <= 1) return 0;
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    let a = Math.floor(n * 0.6180339887) | 1; while (gcd(a, n) !== 1) a++;
    const i = ((day - 1) % n + n) % n;
    return (a * i + (104729 % n)) % n;
  }

  const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function search(rows, q, exclude, limit) {
    const n = norm(q); if (n.length < 2) return [];
    const words = n.split(' ');
    const scored = [];
    for (const r of rows) {
      if (exclude && exclude.has(r[C.id])) continue;
      const a = norm(r[C.romaji]), b = norm(r[C.english]);
      let s = -1;
      for (const t of [a, b]) {
        if (!t) continue;
        if (t === n) s = Math.max(s, 100);
        else if (t.startsWith(n)) s = Math.max(s, 80);
        else if (words.every(w => t.includes(w))) s = Math.max(s, 50);
      }
      if (s >= 0) scored.push([s + Math.min(20, Math.log10(1 + r[C.popularity]) * 3), r]);
    }
    return scored.sort((x, y) => y[0] - x[0]).slice(0, limit || 8).map(x => x[1]);
  }

  // Compare one guess with the answer. Each tile: status hit | near | miss, plus a direction hint.
  function compare(g, t) {
    const num = (a, b, nearFn) => {
      if (a == null || b == null) return { s: 'miss', dir: '', v: a == null ? '?' : a };
      if (a === b) return { s: 'hit', dir: '', v: a };
      return { s: nearFn(a, b) ? 'near' : 'miss', dir: b > a ? 'up' : 'down', v: a };
    };
    const eq = (a, b) => ({ s: a != null && a === b ? 'hit' : 'miss', v: a == null ? '?' : a });
    const gs = new Set(g[C.genres]), shared = t[C.genres].filter(x => gs.has(x));
    const sameSet = shared.length === t[C.genres].length && shared.length === g[C.genres].length;
    return {
      correct: g[C.id] === t[C.id],
      year: num(g[C.year], t[C.year], (a, b) => Math.abs(a - b) <= 2),
      season: eq(g[C.season], t[C.season]),
      format: eq(g[C.format], t[C.format]),
      episodes: num(g[C.episodes], t[C.episodes], (a, b) => Math.abs(a - b) <= Math.max(3, 0.25 * b)),
      studio: eq(g[C.studio], t[C.studio]),
      source: eq(g[C.source], t[C.source]),
      score: num(g[C.score], t[C.score], (a, b) => Math.abs(a - b) <= 5),
      genres: { s: sameSet ? 'hit' : shared.length ? 'near' : 'miss', v: g[C.genres].join(', '), shared }
    };
  }
  function title(r) { return r[C.english] || r[C.romaji]; }

  const api = { LAUNCH, MAX_GUESSES, C, dayNumber, dailyPool, dailyIndex, search, compare, title, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AG = api;
})(typeof window !== 'undefined' ? window : this);
