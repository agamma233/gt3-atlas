"""Project-owned soft Pages budgets; these are not GitHub platform limits."""
from pathlib import Path
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
MIB = 1024 * 1024
WARNING = 300 * MIB
REVIEW = 600 * MIB


def report(root=ROOT, out=None):
    root = Path(root); out = Path(out or root/'dist')
    doc = json.loads((root/'data/photos.json').read_text())
    baseline = json.loads((root/'data/photography-first-baseline.json').read_text())
    files = sorted(p for p in out.rglob('*') if p.is_file())
    images = [p for p in files if p.suffix.lower() in ('.jpg','.jpeg','.webp','.png','.avif')]
    widths = {}; referenced = set(); variant_issues = []
    for photo in doc['images']:
        rows = photo.get('variants') or [dict(path=photo['local_path'],width=photo['width'],height=photo['height'],bytes=photo['bytes'],sha256=photo['sha256'])]
        for row in rows:
            if row['path'] in referenced: continue
            referenced.add(row['path']); p = root/row['path']
            raw = p.read_bytes()
            if len(raw)!=row['bytes'] or hashlib.sha256(raw).hexdigest()!=row['sha256']:
                variant_issues.append(row['path'])
            group = widths.setdefault(str(row['width']), {'files':0,'bytes':0})
            group['files']+=1; group['bytes']+=len(raw)
    if variant_issues: raise ValueError('Invalid derivative integrity: '+str(variant_issues))
    large = [{'path':str(p.relative_to(out)), 'bytes':p.stat().st_size} for p in images if p.stat().st_size>1536*1024]
    result = {
        'photographs':len(doc['images']), 'baseline_photographs':baseline['photo_count'],
        'image_resources':len(images), 'image_bytes':sum(p.stat().st_size for p in images),
        'by_actual_width':widths,
        'photographs_with_1600':sum(any(v['width']==1600 for v in p.get('variants',[])) or p['width']==1600 for p in doc['images']),
        'photographs_with_2560':sum(any(v['width']==2560 for v in p.get('variants',[])) for p in doc['images']),
        'large_images_over_1_5_MiB':large,
        'baseline_pages_bytes':baseline['pages_bytes'],
        'warning_bytes':WARNING,'manual_review_bytes':REVIEW,
        'budget_note':'Project soft budgets, not GitHub official limits. Above 600 MiB requires explicit recorded human assessment before release.',
    }
    target=out/'storage-report.json'
    # Include this report itself in the final published directory size.
    for _ in range(4):
        size=sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
        result.update(pages_bytes=size, delta_pages_bytes=size-baseline['pages_bytes'], budget_status='manual-review-required' if size>REVIEW else ('warning' if size>WARNING else 'within-budget'))
        target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    size=sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
    if result['pages_bytes'] != size: raise ValueError('Storage report did not converge')
    print(f"PAGES BUDGET | {size/MIB:.2f} MiB | {len(doc['images'])} photographs | {result['budget_status']}")
    if size>REVIEW: raise ValueError('Project 600 MiB soft budget requires human assessment; optimise before release')
    return result

if __name__=='__main__': report()
