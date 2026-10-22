import copy
import hashlib
import html
import json
from pathlib import Path
import re
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import showroom_builder as builder
from photo_archive import validate,photo_view

class PhotographyFirstTests(unittest.TestCase):
    def setUp(self):
        self.doc=json.loads((ROOT/'data/photos.json').read_text())
        self.cars={c['id'] for c in json.loads((ROOT/'data/cars.json').read_text())}

    def test_baseline_137_photographs_are_preserved(self):
        baseline=json.loads((ROOT/'data/photography-first-baseline.json').read_text())
        current={p['key']:p for p in self.doc['images']}
        self.assertEqual(baseline['photo_count'],137)
        for key,fields in baseline['photos'].items():
            for field,value in fields.items(): self.assertEqual(current[key][field],value,(key,field))

    def test_car_only_photograph_is_complete_without_editorial_relations(self):
        photo=copy.deepcopy(next(p for p in self.doc['images'] if p.get('photography_first')))
        self.assertFalse(any(photo.get(k) for k in ('entry_id','livery_id','team','season','event','circuit')))
        validate(dict(images=[photo]),self.cars)
        view=photo_view(photo,'Verified car model')
        record=builder.photo_record(view)
        self.assertIn(photo['key'],record)
        self.assertNotIn('待核实',record)
        self.assertIn(photo['license_evidence']['author'],html.unescape(builder.rights(view)))
        for field in ('车队','赛事','赛季','涂装年份'):self.assertNotIn('<dt>'+field+'</dt>',record)
        for bad in ('car_id','source_url','sha256'):
            broken=copy.deepcopy(photo);broken.pop(bad)
            with self.subTest(field=bad),self.assertRaises((KeyError,ValueError)):validate(dict(images=[broken]),self.cars)

    def test_review_evidence_matches_every_new_photograph(self):
        raw=json.loads((ROOT/'data/rights/photography-first-metadata.json').read_text())
        review=json.loads((ROOT/'data/rights/photography-first-review.json').read_text())
        choices={r['page_id']:r for r in review['selection']}
        audit=json.loads((ROOT/'data/rights/photography-first-deduplication.json').read_text())
        photos=[p for p in self.doc['images'] if p.get('photography_first')]
        self.assertEqual({r['key'] for r in audit['accepted']},{p['key'] for p in photos})
        self.assertEqual(audit['baseline_count'],137)
        for p in photos:
            e=p['license_evidence'];s=raw[str(e['page_id'])];i=s['imageinfo'][0];m=i['extmetadata']
            self.assertEqual(p['car_id'],choices[e['page_id']]['car_id'])
            self.assertEqual(e['revision_id'],s['revisions'][0]['revid'])
            self.assertEqual(e['original_sha1'],i['sha1'])
            self.assertEqual(e['author'],html.unescape(re.sub('<[^>]+>','',m['Artist']['value'])).strip())
            self.assertEqual(e['license_name'],m['LicenseShortName']['value'])
            self.assertEqual(p['source_url'],i['descriptionurl'])
            self.assertTrue(e['attribution'] and e['model_evidence'] and e['changes'])
            for v in p['variants']:
                self.assertLessEqual(v['width'],e['download_width'])
                self.assertLessEqual(v['height'],e['download_height'])
                self.assertLessEqual(v['width'],e['original_width'])
                self.assertEqual(hashlib.sha256((ROOT/v['path']).read_bytes()).hexdigest(),v['sha256'])
            attrs=html.unescape(builder.responsive(photo_view(p,'Model')))
            self.assertNotIn('-2560.webp',attrs)
            self.assertLessEqual(p['width'],1600)

    def test_new_fingerprints_are_distinct_from_all_137_and_each_other(self):
        old=json.loads((ROOT/'data/rights/deduplication.json').read_text())
        known=[(r['key'],int(r['phash'],16)) for r in old['compared_baseline']]
        known += [(p['key'],int(p['phash'],16)) for p in self.doc['images'] if p['key'].startswith('commons-')]
        self.assertEqual(len(known),137)
        for p in self.doc['images']:
            if not p.get('photography_first'):continue
            value=int(p['phash'],16)
            for key,fingerprint in known:self.assertGreater(bin(value^fingerprint).count('1'),6,(p['key'],key))
            known.append((p['key'],value))

    def test_hd_rejects_invented_pixels(self):
        photo=copy.deepcopy(next(p for p in self.doc['images'] if any(v['width']==2560 for v in p.get('variants',[]))))
        photo['license_evidence']['original_width']=1600
        with self.assertRaises(ValueError):validate(dict(images=[photo]),self.cars)

    def test_optional_album_can_relate_directly_to_car(self):
        p=next(p for p in self.doc['images'] if p.get('photography_first'))
        doc=dict(images=[p],collections=[dict(id='car-only',car_id=p['car_id'],title='Car collection',photo_ids=[p['key']])])
        validate(doc,self.cars)
        doc['collections'][0]['car_id']='bmw' if p['car_id']!='bmw' else 'audi'
        with self.assertRaises(ValueError):validate(doc,self.cars)
