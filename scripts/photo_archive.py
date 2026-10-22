"""Photography relations and validation, independent of presentation templates."""
from urllib.parse import urlparse
import re


def validate(doc, car_ids):
    def unique(rows, key):
        index = {row[key]: row for row in rows}
        if len(index) != len(rows):
            raise ValueError(f"Duplicate {key}")
        return index

    photos = unique(doc['images'], 'key')
    entries = unique(doc.get('entries', []), 'id')
    liveries = unique(doc.get('liveries', []), 'id')
    unique(doc.get('collections', []), 'id')
    for entry in entries.values():
        if entry['car_id'] not in car_ids:
            raise ValueError('Unknown entry car')
    for livery in liveries.values():
        if livery['entry_id'] not in entries:
            raise ValueError('Unknown livery entry')
    for photo in photos.values():
        if not re.fullmatch(r'[0-9a-f]{64}', photo['sha256']): raise ValueError('Invalid photograph SHA-256')
        if not photo['local_path'].startswith('assets/') or '..' in photo['local_path'].split('/'): raise ValueError('Invalid local image path')
        if photo['car_id'] not in car_ids: raise ValueError('Unknown photo car')
        if photo.get('livery_id'):
            entry = entries[liveries[photo['livery_id']]['entry_id']]
            if entry['car_id'] != photo['car_id']: raise ValueError('Photo/livery car mismatch')
        if photo.get('entry_id') and entries[photo['entry_id']]['car_id'] != photo['car_id']:
            raise ValueError('Photo/entry car mismatch')
        if photo['width'] <= 0 or photo['height'] <= 0:
            raise ValueError('Invalid image dimensions')
        for field in ('source_url', 'original_url'):
            if urlparse(photo[field]).scheme != 'https':
                raise ValueError('Photography sources must use HTTPS')
        if photo['license_status'] in ('licensed', 'public-domain') and not photo.get('license_evidence'):
            raise ValueError('License assertion requires evidence')
    for photo in photos.values():
        if not (photo.get('license_evidence') or {}).get('provider') == 'Wikimedia Commons': continue
        evidence = photo.get('license_evidence') or {}
        allowed = {'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/', 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/'}
        if evidence.get('license_name') not in allowed or evidence.get('license_url') != allowed[evidence['license_name']]:
            raise ValueError('Unsupported Commons license')
        if not all(evidence.get(field) for field in ('page_id', 'revision_id', 'author', 'attribution', 'changes', 'original_sha1', 'model_evidence')):
            raise ValueError('Incomplete Commons evidence')
        if (photo.get('photographer') or evidence['author']) != evidence['author'] or photo['source_url'] != evidence['source_url']:
            raise ValueError('Commons attribution mismatch')
        if not photo.get('phash') or not photo.get('variants'):
            raise ValueError('Missing photography derivatives or hash')
        if len({v['path'] for v in photo['variants']}) != len(photo['variants']) or photo['sha256'] not in {v['sha256'] for v in photo['variants']}:
            raise ValueError('Invalid photography variants')
        for variant in photo['variants']:
            if variant['width'] <= 0 or variant['height'] <= 0: raise ValueError('Invalid derivative dimensions')
            if variant['width'] == 2560 and evidence.get('original_width', 0) < 2560:
                raise ValueError('HD cannot exceed real source pixels')
        main = next((v for v in photo['variants'] if v['path'] == photo['local_path']), None)
        if not main or main['sha256'] != photo['sha256'] or main['width'] != photo['width'] or main['height'] != photo['height']:
            raise ValueError('Main preview must match its derivative record')
    covered = set()
    for collection in doc.get('collections', []):
        ids = collection['photo_ids']
        if not ids or len(ids) != len(set(ids)):
            raise ValueError('Empty or duplicate collection frames')
        if collection['car_id'] not in car_ids: raise ValueError('Unknown collection car')
        if collection.get('livery_id'):
            entry = entries[liveries[collection['livery_id']]['entry_id']]
            if collection['car_id'] != entry['car_id']: raise ValueError('Collection/livery car mismatch')
        for key in ids:
            photo = photos[key]
            if photo['car_id'] != collection['car_id'] or (collection.get('livery_id') and photo.get('livery_id') != collection['livery_id']):
                raise ValueError('Collection/photo ownership mismatch')
        covered.update(ids)
    # The complete car archive is derived from car_id; editorial albums are optional.
    # Any supplied relations above remain strict, including legacy livery ownership.


def collections_for(doc, car_id):
    return [c for c in doc.get('collections', []) if c['car_id'] == car_id]


def livery_for(doc, photo):
    return next((l for l in doc.get('liveries', []) if l['id'] == photo.get('livery_id')), {})


def entry_for(doc, photo):
    livery = livery_for(doc, photo)
    return next((e for e in doc.get('entries', []) if e['id'] == (livery.get('entry_id') or photo.get('entry_id'))), {})


def photo_view(photo, model):
    """Presentation defaults, never invented capture or technical metadata."""
    value = dict(photo)
    evidence = photo.get('license_evidence') or {}
    value.setdefault('alt', model + ' · ' + photo['key'])
    types = {'track':'赛道动态','detail':'车身细节','night':'夜间比赛','wet':'雨战与湿地','paddock':'维修区与围场','exhibition':'静态展示','group':'追逐与远景'}
    value.setdefault('angle', types.get(photo.get('photo_type'), '摄影作品'))
    value.setdefault('photographer', evidence.get('author'))
    value.setdefault('credit', ' · '.join(str(v) for v in (evidence.get('author'), evidence.get('license_name')) if v))
    return value
