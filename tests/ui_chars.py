"""Headless phone test for Character Guess: skip, wrong guesses, win, reload, endless, loss, stats."""
import os, pathlib, shutil
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'dist' / 'characters-artifact.html').as_uri()
SH = ROOT / 'shots'; SH.mkdir(exist_ok=True)
CHROME = os.environ.get('CHROME') or shutil.which('google-chrome')
errs = []

def pick(pg, name):
    pg.fill('#q', name[:4]); pg.wait_for_selector('#sugg li')
    opts = pg.eval_on_selector_all('#sugg li', 'l => l.map(x => x.firstChild.textContent)')
    if name not in opts:
        pg.fill('#q', name); pg.wait_for_selector('#sugg li')
        opts = pg.eval_on_selector_all('#sugg li', 'l => l.map(x => x.firstChild.textContent)')
    pg.click(f'#sugg li:nth-child({opts.index(name) + 1})')

with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    for scheme in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme, device_scale_factor=2)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(URL); pg.wait_for_selector('#ladder li')
        st = pg.evaluate('window.__cg()'); answer = st['name']
        names = pg.evaluate('window.CHAR_DATA.rows.map(r => r[1])')
        wrong = [n for n in names if n != answer][:2]
        pg.click('#skipBtn'); pick(pg, wrong[0]); pick(pg, wrong[1])
        st = pg.evaluate('window.__cg()')
        print(scheme, 'after skip + 2 wrong: clues seen', st['seen'], '| points shown', pg.inner_text('#pts'))
        print('  clue 1:', pg.inner_text('#ladder li:nth-child(1) span'))
        pg.screenshot(path=str(SH / f'chars-{scheme}.png'))
        if scheme == 'dark': ctx.close(); continue
        pick(pg, answer); pg.wait_for_selector('.end')
        print('win:', pg.inner_text('.end h2'), '|', pg.inner_text('.end p'))
        pg.screenshot(path=str(SH / 'chars-won.png'), full_page=True)
        pg.reload(); pg.wait_for_selector('.end'); print('after reload:', pg.inner_text('.end h2'))
        # endless: lose by skipping to the last clue then guessing wrong
        pg.click('#moreBtn'); pg.wait_for_selector('#actions:not([hidden])')
        tgt = pg.evaluate('window.__cg()')['name']
        for _ in range(6): pg.click('#skipBtn')
        print('endless after 6 skips: seen', pg.evaluate('window.__cg()')['seen'], '| skip disabled', pg.is_disabled('#skipBtn'))
        pick(pg, [n for n in names if n != tgt][0]); pg.wait_for_selector('.end'); print('endless loss:', pg.inner_text('.end h2'))
        pg.click('[data-m=stats]'); print('stats:', pg.inner_text('#stats').replace('\n', ' ')[:90])
        print('scrollWidth', pg.evaluate('document.documentElement.scrollWidth'))
        ctx.close()
    b.close()
print('ERRORS:', errs or 'none')
