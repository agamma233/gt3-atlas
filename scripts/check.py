"""Check source data, local references and generated card invariants."""
from pathlib import Path
import json, re
from build import render, ROOT
cars = json.loads((ROOT / 'data/cars.json').read_text())
page = render()
assert len(cars) == 16, 'Update coverage expectations when adding cars'
assert len(re.findall(r'<article\b[^>]*class="vehicle card"', page)) == len(cars)
assert all(c['specs'] and c['title'] and c['team'] for c in cars)
for ref in re.findall(r'(?:src|href)="(assets/[^"#?]+)', page):
    assert (ROOT / ref).is_file(), 'Missing asset: ' + ref
assert 'data:image/jpeg;base64,' not in page
print(f'OK: {len(cars)} cars, {sum(len(c["specs"]) for c in cars)} specification rows, local assets and template rendering')
