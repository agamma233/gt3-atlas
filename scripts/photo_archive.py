"""Photography relations and validation, independent of presentation templates."""
from urllib.parse import urlparse


def validate(doc, car_ids):
    def unique(rows, key):
        index = {row[key]: row for row in rows}
        if len(index) != len(rows):
            raise ValueError(f"Duplicate {key}")
        return index

    photos = unique(doc['images'], 'key')
    entries = unique(doc['entries'], 'id')
    liveries = unique(doc['liveries'], 'id')
    unique(doc['collections'], 'id')
    for entry in entries.values():
        if entry['car_id'] not in car_ids:
            raise ValueError('Unknown entry car')
    for livery in liveries.values():
        if livery['entry_id'] not in entries:
            raise ValueError('Unknown livery entry')
    for photo in photos.values():
        entry = entries[liveries[photo['livery_id']]['entry_id']]
        if entry['car_id'] != photo['car_id']:
            raise ValueError('Photo/livery car mismatch')
        if photo['width'] <= 0 or photo['height'] <= 0:
            raise ValueError('Invalid image dimensions')
        for field in ('source_url', 'original_url'):
            if urlparse(photo[field]).scheme != 'https':
                raise ValueError('Photography sources must use HTTPS')
        if photo['license_status'] in ('licensed', 'public-domain') and not photo.get('license_evidence'):
            raise ValueError('License assertion requires evidence')
    for photo in photos.values():
        if not photo['key'].startswith('commons-'): continue
        evidence = photo.get('license_evidence') or {}
        allowed = {'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/', 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/'}
        if evidence.get('license_name') not in allowed or evidence.get('license_url') != allowed[evidence['license_name']]:
            raise ValueError('Unsupported Commons license')
        if not all(evidence.get(field) for field in ('page_id', 'revision_id', 'author', 'attribution', 'changes', 'original_sha1', 'model_evidence')):
            raise ValueError('Incomplete Commons evidence')
        if photo.get('photographer') != evidence['author'] or photo['source_url'] != evidence['source_url']:
            raise ValueError('Commons attribution mismatch')
        if not photo.get('phash') or len(photo.get('variants', [])) != 3:
            raise ValueError('Missing photography derivatives or hash')
        if len({v['path'] for v in photo['variants']}) != 3 or photo['variants'][-1]['sha256'] != photo['sha256']:
            raise ValueError('Invalid photography variants')
    covered = set()
    for collection in doc['collections']:
        ids = collection['photo_ids']
        if not ids or len(ids) != len(set(ids)):
            raise ValueError('Empty or duplicate collection frames')
        entry = entries[liveries[collection['livery_id']]['entry_id']]
        if collection['car_id'] != entry['car_id']:
            raise ValueError('Collection/livery car mismatch')
        for key in ids:
            photo = photos[key]
            if photo['car_id'] != collection['car_id'] or photo['livery_id'] != collection['livery_id']:
                raise ValueError('Collection/photo ownership mismatch')
        covered.update(ids)
    if covered != set(photos):
        raise ValueError('Every photograph must belong to a collection')


def collections_for(doc, car_id):
    return [c for c in doc['collections'] if c['car_id'] == car_id]


def livery_for(doc, photo):
    return next(l for l in doc['liveries'] if l['id'] == photo['livery_id'])


def entry_for(doc, photo):
    livery = livery_for(doc, photo)
    return next(e for e in doc['entries'] if e['id'] == livery['entry_id'])
