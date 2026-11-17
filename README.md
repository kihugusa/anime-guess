# Anime Guess

Play: https://kihugusa.github.io/anime-guess/

A daily anime guessing game. Pick any title and the app compares it with the hidden answer on eight facts:

| Fact | Close (amber) when |
|---|---|
| Year | within 2 years (arrow shows higher or lower) |
| Episodes | within 25% or 3 episodes (with an arrow) |
| Score | within 5 points (with an arrow) |
| Genres | some genres shared (green only if all match) |
| Season, format, studio, source | (match or no match only) |

- **Guesses:** eight per puzzle. After three wrong guesses the app shows the answer's tags. After six, it shows the first letter of the title.
- **Daily:** everyone gets the same answer each day. It comes from the 400 most popular TV series and films since 1990, in a fixed shuffled order with no repeats.
- **Endless:** a new random answer every round.
- **Stats:** win rate, streak and how many guesses each win took. Progress stays in the browser.

## Data

- `scripts/fetch_anime.mjs` pulls the 1,500 most popular non-adult anime from the [AniList](https://anilist.co) API. It runs monthly, and on demand from the Actions tab.
- It keeps **facts only**: titles, year, season, format, episodes, genres, main studio, source, average score, popularity and non-spoiler tags. Cover art and other artwork belong to their owners and aren't used.
- AniList's terms allow free use for non-commercial projects, and for commercial ones earning under $150 a month.

## Build

```bash
node tests/validate.mjs [docs/anime.json]   # data shape + game logic (defaults to invented test titles)
node build.mjs                              # dist/artifact.html + dist/web/ (installable app)
python3 tests/ui_test.py                    # headless phone test (Playwright)
```

Not affiliated with AniList or any studio.
