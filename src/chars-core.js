/* Character Guess — game logic (no DOM). Browser: window.CG; Node: module.exports. */
(function (root) {
  'use strict';
  const LAUNCH = '2026-11-17';
  const STEPS = 7; // clues on the ladder; score = 8 - clues seen when you get it
  const C = { id: 0, name: 1, alt: 2, gender: 3, age: 4, month: 5, day: 6, blood: 7, favourites: 8, rank: 9, role: 10,
    seriesId: 11, series: 12, format: 13, year: 14, studio: 15, genres: 16, va: 17, other: 18 };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const FORMAT = { 'TV': 'TV series', 'TV SHORT': 'short TV series', 'MOVIE': 'film', 'ONA': 'web series', 'OVA': 'OVA', 'SPECIAL': 'special' };
  const ROLE = { MAIN: 'Main', SUPPORTING: 'Supporting', BACKGROUND: 'Minor' };

  function dayNumber(dateStr) {
    const p = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return Math.round((p(dateStr) - p(LAUNCH)) / 86400000) + 1;
  }
  // Daily answers: well-loved characters that have hand-written trivia.
  function dailyPool(rows, trivia) {
    const p = rows.filter(r => trivia[String(r[C.id])]);
    return (p.length >= 7 ? p : rows.slice(0, 150)).slice().sort((a, b) => a[C.id] - b[C.id]);
  }
  function endlessPool(rows) { return rows.filter(r => r[C.rank] <= 600); }
  function dailyIndex(n, day) {
    if (n <= 1) return 0;
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    let a = Math.floor(n * 0.6180339887) | 1; while (gcd(a, n) !== 1) a++;
    const i = ((day - 1) % n + n) % n;
    return (a * i + (15485863 % n)) % n;
  }

  const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function search(rows, q, exclude, limit) {
    const n = norm(q); if (n.length < 2) return [];
    const words = n.split(' '), out = [];
    for (const r of rows) {
      if (exclude && exclude.has(r[C.id])) continue;
      let s = -1;
      for (const t of [r[C.name]].concat(r[C.alt] || []).map(norm)) {
        if (!t) continue;
        if (t === n) s = Math.max(s, 100);
        else if (t.startsWith(n) || t.split(' ').some(w => w.startsWith(n))) s = Math.max(s, 80);
        else if (words.every(w => t.includes(w))) s = Math.max(s, 50);
      }
      if (s >= 0) out.push([s - r[C.rank] / 1000, r]);
    }
    return out.sort((a, b) => b[0] - a[0]).slice(0, limit || 8).map(x => x[1]);
  }

  // Compare a guess with the answer. Tiles: hit | near | miss, with direction hints.
  function compare(g, t) {
    const eq = (a, b, show) => ({ s: a != null && a === b ? 'hit' : 'miss', v: a == null ? '?' : (show || (x => x))(a) });
    const year = g[C.year] == null || t[C.year] == null ? { s: 'miss', v: g[C.year] || '?', dir: '' }
      : g[C.year] === t[C.year] ? { s: 'hit', v: g[C.year], dir: '' }
      : { s: Math.abs(g[C.year] - t[C.year]) <= 2 ? 'near' : 'miss', v: g[C.year], dir: t[C.year] > g[C.year] ? 'up' : 'down' };
    // Popularity: arrow up means the answer is MORE popular (a smaller rank number).
    const pop = g[C.rank] === t[C.rank] ? { s: 'hit', v: '#' + g[C.rank], dir: '' }
      : { s: Math.abs(g[C.rank] - t[C.rank]) <= 25 ? 'near' : 'miss', v: '#' + g[C.rank], dir: t[C.rank] < g[C.rank] ? 'up' : 'down' };
    let bday;
    if (!g[C.month] || !t[C.month]) bday = { s: 'miss', v: g[C.month] ? MONTHS[g[C.month] - 1].slice(0, 3) : '?' };
    else {
      const d = Math.min((g[C.month] - t[C.month] + 12) % 12, (t[C.month] - g[C.month] + 12) % 12);
      bday = { s: d === 0 ? 'hit' : d === 1 ? 'near' : 'miss', v: MONTHS[g[C.month] - 1].slice(0, 3) };
    }
    const series = g[C.seriesId] === t[C.seriesId] ? { s: 'hit', v: g[C.series] }
      : { s: g[C.studio] && g[C.studio] === t[C.studio] ? 'near' : 'miss', v: g[C.series] };
    return {
      correct: g[C.id] === t[C.id], series,
      gender: eq(g[C.gender], t[C.gender]), role: eq(g[C.role], t[C.role], x => ROLE[x] || x),
      year, popularity: pop, birthday: bday, va: eq(g[C.va], t[C.va])
    };
  }

  function facts(t) {
    const f = [];
    if (t[C.gender]) f.push(t[C.gender]);
    if (t[C.age]) f.push('listed age ' + String(t[C.age]).replace(/-/g, '–'));
    if (t[C.month]) f.push('birthday in ' + MONTHS[t[C.month] - 1]);
    if (t[C.blood]) f.push('blood type ' + t[C.blood]);
    return f;
  }
  function initials(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.map(p => p[0].toUpperCase() + '.').join(' ') + ` (${parts.map(p => p.replace(/[^\p{L}\p{N}]/gu, '').length).join(' + ')} letters)`;
  }
  // The seven-step clue ladder, hardest first.
  function clues(t, trivia) {
    const tv = trivia[String(t[C.id])] || [], f = facts(t);
    const role = (ROLE[t[C.role]] || 'A').toLowerCase();
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const first = `${cap(role === 'a' ? 'a' : 'a ' + role)} character in a ${t[C.year] || 'mystery-year'} ${FORMAT[t[C.format]] || 'production'}.`;
    const fallbackA = f.length ? cap(f.slice(0, 2).join(', ')) + '.' : 'No personal details are listed.';
    const fallbackB = f.length > 2 ? cap(f.slice(2).join(', ')) + '.' : (t[C.other] && t[C.other].length ? `Also appears in ${t[C.other].length} other listed show${t[C.other].length > 1 ? 's' : ''}.` : 'Ranked #' + t[C.rank] + ' by fan favourites.');
    return [
      first,
      tv[0] || fallbackA,
      `Their best-known show is ${(t[C.genres] || []).slice(0, 3).join(', ') || 'unclassified'}${t[C.studio] ? `, made by ${t[C.studio]}` : ''}.`,
      t[C.va] ? `Japanese voice: ${t[C.va]}.` : (f.length ? cap(f.join(', ')) + '.' : 'No voice actor is listed.'),
      tv[1] || fallbackB,
      'Initials: ' + initials(t[C.name]) + '.',
      `From: ${t[C.series]}.`
    ];
  }
  const score = cluesSeen => Math.max(0, 8 - cluesSeen);

  const api = { LAUNCH, STEPS, C, MONTHS, dayNumber, dailyPool, endlessPool, dailyIndex, search, compare, clues, score, initials, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CG = api;
})(typeof window !== 'undefined' ? window : this);
