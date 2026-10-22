"""Reproduce reviewed car-only imports. Originals stay outside Git/Pages.
Requires requirements.txt; review/metadata files are intentionally explicit.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urljoin
from PIL import Image, ImageOps
from import_commons import phash, clean, LICENSES
ROOT=Path(__file__).resolve().parents[2]
def main(cache):
    doc=json.loads((ROOT/'data/photos.json').read_text())
    doc['images']=[p for p in doc['images'] if not p.get('photography_first')]
    review=json.loads((ROOT/'data/rights/photography-first-review.json').read_text())
    sources=json.loads((ROOT/'data/rights/photography-first-metadata.json').read_text())
    known=[(p['key'],phash(Image.open(ROOT/p['local_path']))) for p in doc['images']]
    audit={'algorithm':'63 AC coefficients of 32x32 DCT; median threshold','hamming_reject_at_most':6,'baseline_count':len(known),'accepted':[],'rejected':[]}
    for row in review['selection']:
        pid=str(row['page_id']);source=sources[pid];info=source['imageinfo'][0];meta=info['extmetadata'];lic=meta['LicenseShortName']['value']
        if lic not in LICENSES or re.sub(r'/deed\.[a-zA-Z-]+/?$', '', meta['LicenseUrl']['value'].replace('http:','https:')).rstrip('/') != LICENSES[lic].rstrip('/'): raise ValueError('License mismatch '+pid)
        artist=clean(meta['Artist']['value'])
        if not artist:raise ValueError('Missing author '+pid)
        raw=(cache/(pid+'.jpg')).read_bytes();digest=hashlib.sha256(raw).hexdigest()
        image=ImageOps.exif_transpose(Image.open(cache/(pid+'.jpg'))).convert('RGB');fingerprint=phash(image)
        if image.width>info['width'] or image.height>info['height']:raise ValueError('Upscaled source '+pid)
        matches=[(key,(int(fingerprint,16)^int(value,16)).bit_count()) for key,value in known if (int(fingerprint,16)^int(value,16)).bit_count()<=6]
        if matches:audit['rejected'].append({'page_id':row['page_id'],'matches':matches});continue
        variants=[]
        widths=[w for w in (480,960,1600,2560) if w<=image.width]
        if not widths or image.width<1600:widths=sorted(set(widths+[image.width]))
        for width in widths:
            preview=image.resize((width,round(image.height*width/image.width)),Image.Resampling.LANCZOS)
            path=ROOT/f'assets/photos/pf-{pid}-{digest[:12]}-{width}.webp'
            if not path.exists():
                for quality in (84,80,76,72):
                    preview.save(path,'WEBP',quality=quality,method=6)
                    if path.stat().st_size<=1536*1024:break
            with Image.open(path) as encoded:
                if encoded.size != preview.size: raise ValueError('Invalid cached derivative '+pid)
            if path.stat().st_size>1536*1024:raise ValueError('Oversize derivative '+pid)
            variants.append(dict(path=str(path.relative_to(ROOT)),width=preview.width,height=preview.height,bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        main_image=max((v for v in variants if v['width']<=1600),key=lambda v:v['width'])
        links=re.findall(r'href=[\"\']([^\"\']+)',meta['Artist']['value'])
        download=info['url'] if image.width==info['width'] else re.sub(r'/2560px-',f'/{image.width}px-',info.get('thumburl',info['url']))
        evidence=dict(provider='Wikimedia Commons',page_id=int(pid),revision_id=source['revisions'][0]['revid'],source_url=info['descriptionurl'],license_name=lic,license_url=LICENSES[lic],author=artist,author_url=urljoin('https://commons.wikimedia.org',links[0]) if links else info['descriptionurl'],attribution=clean(meta.get('Attribution',{}).get('value','')) or artist,changes='Resized and WebP encoded; full frame retained.',restrictions=clean(meta.get('Restrictions',{}).get('value','')) or None,original_sha1=info['sha1'],original_width=info['width'],original_height=info['height'],download_url=download,download_sha256=digest,download_width=image.width,download_height=image.height,model_evidence=row['model_evidence'],description=clean(meta.get('ImageDescription',{}).get('value','')))
        key='pf-'+pid
        doc['images'].append(dict(key=key,car_id=row['car_id'],photo_type=row['photo_type'],local_path=main_image['path'],width=main_image['width'],height=main_image['height'],bytes=main_image['bytes'],sha256=main_image['sha256'],source_url=info['descriptionurl'],original_url=info['url'],license_status='public-domain' if lic=='CC0' else 'licensed',license_evidence=evidence,phash=fingerprint,variants=variants,photography_first=True))
        known.append((key,fingerprint));audit['accepted'].append(dict(key=key,page_id=int(pid),phash=fingerprint,sha256=main_image['sha256'],download_sha256=digest))
    doc['schema']='photos@4'
    (ROOT/'data/photos.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/rights/photography-first-deduplication.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print('Imported',len(audit['accepted']),'Rejected',len(audit['rejected']),'Total',len(doc['images']))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache',type=Path,required=True);main(parser.parse_args().cache)
