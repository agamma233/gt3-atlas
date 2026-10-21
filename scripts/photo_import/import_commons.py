"""Import reviewed Commons files, retaining evidence and rejecting hash duplicates.
Maintainer tool only: pip install -r scripts/photo_import/requirements.txt
python scripts/photo_import/import_commons.py --cache /path/to/downloads
The static build remains standard-library only. No automatic discovery approval.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.request
from urllib.parse import urljoin
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
LICENSES = {'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/', 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/'}

def clean(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()

def phash(image):
    pixels = np.asarray(image.convert('L').resize((32, 32), Image.Resampling.LANCZOS), dtype=float)
    n = np.arange(32)
    basis = np.cos(np.pi / 32 * (n + .5)[None, :] * n[:, None])
    values = (basis @ pixels @ basis.T)[:8, :8].flatten()[1:]
    return f'{sum(int(v > np.median(values)) << i for i, v in enumerate(values)):016x}'

def main(cache):
    cache.mkdir(parents=True, exist_ok=True)
    doc = json.loads((ROOT / 'data/photos.json').read_text())
    # Re-running only replaces this import's records; existing photographs survive.
    for field, key in [('images', 'key'), ('entries', 'id'), ('liveries', 'id'), ('collections', 'id')]:
        doc[field] = [r for r in doc[field] if not r[key].startswith('commons-')]
    review = json.loads((ROOT / 'data/rights/commons-review.json').read_text())
    sources = json.loads((ROOT / 'data/rights/commons-metadata.json').read_text())
    known = [(p['key'], phash(Image.open(ROOT / p['local_path'])), p['sha256']) for p in doc['images']]
    audit = {'algorithm': '63 AC coefficients of 32x32 DCT; median threshold', 'hamming_reject_at_most': 4, 'accepted': [], 'rejected': [], 'compared_baseline': [{'key': key, 'phash': value, 'sha256': sha} for key,value,sha in known]}
    output = ROOT / 'assets/photos'; output.mkdir(exist_ok=True)
    for row in review['selection']:
        pid = str(row['page_id']); source = sources[pid]; info = source['imageinfo'][0]; meta = info['extmetadata']
        license_name = meta['LicenseShortName']['value']
        if license_name not in LICENSES: raise ValueError(f'Unsupported license {pid}')
        raw_license = meta['LicenseUrl']['value'].replace('http:', 'https:').rstrip('/')
        if not raw_license.startswith(LICENSES[license_name].rstrip('/')): raise ValueError(f'License mismatch {pid}')
        artist = clean(meta['Artist']['value'])
        if not artist: raise ValueError(f'Missing author {pid}')
        downloaded = cache / (pid + '.jpg')
        download_url = info.get('thumburl', info['url'])
        if not downloaded.exists():
            request = urllib.request.Request(download_url, headers={'User-Agent': 'GT3Atlas/1.3 (https://github.com/agamma233/gt3-atlas)'})
            downloaded.write_bytes(urllib.request.urlopen(request, timeout=60).read())
        raw = downloaded.read_bytes(); digest = hashlib.sha256(raw).hexdigest()
        image = ImageOps.exif_transpose(Image.open(downloaded)).convert('RGB'); fingerprint = phash(image)
        matches = [(key, (int(fingerprint,16)^int(value,16)).bit_count()) for key,value,sha in known if sha == digest or (int(fingerprint,16)^int(value,16)).bit_count() <= 4]
        if matches:
            audit['rejected'].append({'page_id':int(pid), 'reason':'SHA-256 / perceptual duplicate', 'matches':matches}); continue
        key = 'commons-' + pid; variants = []
        for width in (320, 800, 1600):
            preview = image.copy(); preview.thumbnail((width, 100000), Image.Resampling.LANCZOS)
            path = output / f'{pid}-{width}.webp'; preview.save(path, 'WEBP', quality=82, method=6)
            variants.append({'path':str(path.relative_to(ROOT)), 'width':preview.width, 'height':preview.height, 'bytes':path.stat().st_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        main_image = variants[-1]; year = row['season']; rel = 'commons-' + row['car_id'] + '-' + re.sub('[^a-z0-9]+','-',row['team'].lower()).strip('-') + '-' + row['number'] + '-' + year
        if not any(e['id']==rel for e in doc['entries']):
            doc['entries'].append(dict(id=rel,car_id=row['car_id'],team=row['team'],season=year,number=row['number'],series=row['series']))
            doc['liveries'].append(dict(id=rel,entry_id=rel,label=row['team']+' #'+row['number']+' · '+year,year=year))
            doc['collections'].append(dict(id=rel,car_id=row['car_id'],livery_id=rel,title=row['team']+' #'+row['number']+' · '+year,photo_ids=[]))
        collection = next(c for c in doc['collections'] if c['id']==rel); collection['photo_ids'].append(key)
        links = re.findall(r'href=[\"\']([^\"\']+)',meta['Artist']['value'])
        evidence = {'provider':'Wikimedia Commons','page_id':int(pid),'revision_id':source['revisions'][0]['revid'],'source_url':info['descriptionurl'],'license_name':license_name,'license_url':LICENSES[license_name],'author':artist,'author_url':urljoin('https://commons.wikimedia.org',links[0]) if links else info['descriptionurl'],'attribution':clean(meta.get('Attribution',{}).get('value','')) or artist,'changes':'Resized and WebP encoded; full frame retained.','restrictions':clean(meta.get('Restrictions',{}).get('value','')) or None,'original_sha1':info['sha1'],'original_width':info['width'],'original_height':info['height'],'download_url':download_url,'download_sha256':digest,'model_evidence':row['model_evidence'],'description':clean(meta.get('ImageDescription',{}).get('value','')),'raw_date':meta.get('DateTimeOriginal',{}).get('value')}
        date = evidence['raw_date']; match = re.search(r'20\d{2}-\d{2}-\d{2}',date or '')
        captured = match.group() if match else None
        if '24hNbr' in source['title'] or 'BMW Welt' in source['title']: captured='2025-06-28'
        doc['images'].append(dict(key=key,car_id=row['car_id'],angle=row['angle'],credit=f'{artist} · {license_name} · Wikimedia Commons · 缩放 / WebP',alt=clean(source['title'].removeprefix('File:')),local_path=main_image['path'],original_url=info['url'],source_url=info['descriptionurl'],download_name=source['title'].removeprefix('File:'),width=main_image['width'],height=main_image['height'],bytes=main_image['bytes'],sha256=main_image['sha256'],license_status='public-domain' if license_name=='CC0' else 'licensed',team=row['team'],livery_year=year,livery_id=rel,photographer=artist,event=row['event'],circuit=row['circuit'],captured_at=captured,photo_type=row['photo_type'],license_evidence=evidence,variants=variants,phash=fingerprint))
        known.append((key,fingerprint,digest));audit['accepted'].append({'page_id':int(pid),'key':key,'phash':fingerprint,'sha256':main_image['sha256']})
    doc['schema']='photos@3'
    (ROOT/'data/photos.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/rights/deduplication.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(f"Imported {len(audit['accepted'])}; rejected {len(audit['rejected'])} duplicates; total {len(doc['images'])}")

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache',type=Path,required=True);main(parser.parse_args().cache)
