"""Headless phone test: wrong guesses, hints, a win, share, endless and stats."""
import os, pathlib, shutil
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'dist' / 'artifact.html').as_uri()
SH = ROOT / 'shots'; SH.mkdir(exist_ok=True)
CHROME = os.environ.get('CHROME') or shutil.which('google-chrome')
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    for scheme in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme, device_scale_factor=2)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(URL); pg.wait_for_selector('#slots i')
        st = pg.evaluate('window.__ag()'); answer = st['title']
        titles = pg.evaluate("window.ANIME_DATA.rows.map(r => r[2] || r[1])")
        wrongs = [t for t in titles if t != answer][:4]
        for t in wrongs:
            pg.fill('#q', t[:6]); pg.wait_for_selector('#sugg li')
            opts = pg.eval_on_selector_all('#sugg li', 'l => l.map(x => x.firstChild.textContent)')
            pg.click(f'#sugg li:nth-child({opts.index(t) + 1})')
        print(scheme, 'after 4 wrong:', pg.evaluate('window.__ag()')['guesses'], 'guesses | hints:', pg.inner_text('#hints').replace('\n', ' ')[:90])
        pg.screenshot(path=str(SH / f'play-{scheme}.png'))
        if scheme == 'dark': ctx.close(); continue
        pg.fill('#q', answer[:5]); pg.wait_for_selector('#sugg li'); pg.keyboard.press('ArrowDown')
        opts = pg.eval_on_selector_all('#sugg li', 'l => l.map(x => x.firstChild.textContent)')
        pg.click(f'#sugg li:nth-child({opts.index(answer) + 1})')
        pg.wait_for_selector('.end'); print('end:', pg.inner_text('.end h2'))
        pg.screenshot(path=str(SH / 'won.png'), full_page=True)
        pg.reload(); pg.wait_for_selector('.end'); print('after reload still done:', pg.inner_text('.end h2'))
        pg.click('#moreBtn'); pg.wait_for_selector('#searchBox:not([hidden])'); print('endless target set:', pg.evaluate('window.__ag()')['mode'])
        pg.click('[data-m=stats]'); print('stats:', pg.inner_text('#stats').replace('\n', ' ')[:80])
        print('scrollWidth', pg.evaluate('document.documentElement.scrollWidth'))
        ctx.close()
    b.close()
print('ERRORS:', errs or 'none')
