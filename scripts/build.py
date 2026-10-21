"""Build the static site using Python 3 standard library only."""
from pathlib import Path
import html, json, re, shutil, argparse, base64
ROOT = Path(__file__).resolve().parents[1]

def render():
    cars = json.loads((ROOT / 'data/cars.json').read_text())
    assert len({c['id'] for c in cars}) == len(cars), 'Duplicate car IDs'
    page = (ROOT / 'src/page.html').read_text()
    for car in cars:
        card = (ROOT / 'src/cards' / (car['id'] + '.html')).read_text()
        for key in ('title', 'team'):
            if key in car:
                card = card.replace('{{' + key + '}}', html.escape(car[key]))
        for key, value in car['metadata'].items():
            if key == 'data-title':
                value = car['title']
            card = card.replace('{{meta:' + key + '}}', html.escape(str(value), quote=True))
        rows = ''.join('<div class="spec-row"><span class="idx" aria-hidden="true">'
                       + str(i).zfill(2) + '</span><dt>' + html.escape(row['label'])
                       + '</dt><dd>' + row['value_html'] + '</dd></div>'
                       for i, row in enumerate(car['specs'], 1))
        card = card.replace('{{specs}}', rows)
        page = page.replace('{{card:' + car['id'] + '}}', card)
    assert not re.search(r'\{\{(?:card:|meta:|title|team|specs)', page), 'Unresolved template token'
    return page

def build(offline=False):
    page = render()
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    shutil.copytree(ROOT / 'assets', out / 'assets', dirs_exist_ok=True)
    for name in ('.nojekyll', 'robots.txt', 'sitemap.xml', 'NOTICE.md', 'LICENSE'):
        shutil.copy2(ROOT / name, out / name)
    (out / 'index.html').write_text(page)
    if offline:
        page = page.replace('<link rel="stylesheet" href="assets/style.css">',
                            '<style>' + (ROOT / 'assets/style.css').read_text() + '</style>')
        page = page.replace('<script src="assets/app.js"></script>',
                            '<script>' + (ROOT / 'assets/app.js').read_text() + '</script>')
        def embed(match):
            path = ROOT / match[0]
            mime = 'image/jpeg' if path.suffix == '.jpg' else 'image/' + path.suffix[1:]
            return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()
        page = re.sub(r'assets/images/[a-f0-9]+\.(?:jpg|png|webp)', embed, page)
        (out / 'gt3-atlas-offline.html').write_text(page)
    print('Built dist/index.html (' + str((out / 'index.html').stat().st_size) + ' bytes)')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline', action='store_true', help='Also generate a single-file offline copy')
    build(parser.parse_args().offline)
