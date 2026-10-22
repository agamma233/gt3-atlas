"""Regression fixtures are synthetic relations over existing files, never published."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import showroom_builder as builder
import build as site_builder
from check_browser_evidence import validate_evidence
from photo_archive import validate


class PhotoArchiveTests(unittest.TestCase):
    def setUp(self):
        self.doc = copy.deepcopy(builder.photos_doc)
        self.cars = set(builder.CARDS)

    def test_variable_counts_render_real_template(self):
        for count in (1, 2, 4, 7):
            with self.subTest(count=count):
                doc = copy.deepcopy(self.doc)
                original = next(p for p in doc['images'] if p['car_id'] == 'ferrari26')
                frames = [dict(original, key=f'fixture-{i}') for i in range(count)]
                doc['images'] = [p for p in doc['images'] if p['car_id'] != 'ferrari26'] + frames
                doc['collections'] = [c for c in doc['collections'] if c['car_id'] != 'ferrari26'] + [dict(id='fixture-set', car_id='ferrari26', livery_id=original['livery_id'], title='Test fixture', photo_ids=[p['key'] for p in frames])]
                validate(doc, self.cars)
                config = copy.deepcopy(builder.SHOWROOMS)
                config['ferrari26']['hero_photo'] = frames[0]['key']
                by_car = dict(builder.PHOTOS_BY_CAR, ferrari26=frames)
                by_key = {p['key']:p for p in doc['images']}
                with tempfile.TemporaryDirectory() as folder, patch.multiple(builder, ROOT=Path(folder), photos_doc=doc, SHOWROOMS=config, PHOTOS_BY_CAR=by_car, PHOTO_BY_KEY=by_key):
                    result = builder.build_showroom('ferrari26')
                    rendered = (Path(folder) / 'dist/cars/ferrari26/index.html').read_text()
                    self.assertEqual(result['photos'], count)
                    self.assertEqual(rendered.count('role="tab"'), count)
                    self.assertEqual(rendered.count('class="sr-ledger-card"'), count)

    def test_different_collection_counts(self):
        validate(self.doc, self.cars)
        counts = {len(c['photo_ids']) for c in self.doc['collections'] if c['id'] in ('ferrari26-complete', 'ferrari26-perspectives')}
        self.assertEqual(counts, {2, 3})

    def test_multiple_entries_and_liveries_per_car(self):
        entry = dict(self.doc['entries'][0], id='test-entry', season=None, team='Fixture')
        livery = dict(self.doc['liveries'][0], id='test-livery', entry_id=entry['id'])
        photo = dict(self.doc['images'][0], key='test-photo', livery_id=livery['id'])
        self.doc['entries'].append(entry)
        self.doc['liveries'].append(livery)
        self.doc['images'].append(photo)
        self.doc['collections'].append(dict(id='test-set', car_id=photo['car_id'], livery_id=livery['id'], title='Fixture', photo_ids=[photo['key']]))
        validate(self.doc, self.cars)

    def test_livery_year_is_independent_of_entry_season(self):
        photo = self.doc['images'][0]
        livery = next(l for l in self.doc['liveries'] if l['id'] == photo['livery_id'])
        entry = next(e for e in self.doc['entries'] if e['id'] == livery['entry_id'])
        entry['season'] = '2025'
        for year, expected in (('2026', '2026'), ('2027', '2027'), (None, '待核实')):
            with self.subTest(year=year), patch.object(builder, 'photos_doc', self.doc):
                livery['year'] = year
                record = builder.photo_record(photo)
                if year is None: self.assertNotIn('<dt>涂装年份</dt>', record)
                else: self.assertIn(f'<dt>涂装年份</dt><dd>{expected}</dd>', record)
                self.assertNotIn('<dt>涂装年份</dt><dd>2025</dd>', record)

    def test_livery_links_target_only_related_collections(self):
        original = next(l for l in self.doc['liveries'] if l['id'] == 'ferrari26-livery')
        other = dict(original, id='fixture-livery', year='2027')
        self.doc['liveries'].append(other)
        photo = dict(next(p for p in self.doc['images'] if p['car_id'] == 'ferrari26'), key='fixture-photo', livery_id=other['id'])
        self.doc['images'].append(photo)
        self.doc['collections'].append(dict(id='fixture-collection', car_id='ferrari26', livery_id=other['id'], title='Fixture only', photo_ids=[photo['key']]))
        validate(self.doc, self.cars)
        with patch.object(builder, 'photos_doc', self.doc):
            links = builder.livery_cards('ferrari26')
            cards = builder.collection_cards('ferrari26', [p for p in self.doc['images'] if p['car_id'] == 'ferrari26'])
            self.assertIn('href="#collection-ferrari26-complete" data-livery-id="ferrari26-livery"', links)
            self.assertIn('href="#collection-fixture-collection" data-livery-id="fixture-livery"', links)
            index = len([p for p in self.doc['images'] if p['car_id']=='ferrari26']) - 1
            self.assertIn(f'id="collection-fixture-collection" data-livery-id="fixture-livery" data-collection="{index}"', cards)

    def test_homepage_count_tracks_inventory_and_offline_tracks_garage(self):
        root = site_builder.ROOT
        with tempfile.TemporaryDirectory() as folder:
            fixture = Path(folder)
            (fixture / 'data').mkdir()
            (fixture / 'src').symlink_to(root / 'src', target_is_directory=True)
            (fixture / 'data/cars.json').write_text((root / 'data/cars.json').read_text())
            for extra in (1, 3):
                doc = copy.deepcopy(self.doc)
                photo = doc['images'][0]
                for i in range(extra):
                    added = dict(photo, key=f'fixture-{i}')
                    doc['images'].append(added)
                    doc['collections'][0]['photo_ids'].append(added['key'])
                validate(doc, self.cars)
                (fixture / 'data/photos.json').write_text(json.dumps(doc))
                with patch.object(site_builder, 'ROOT', fixture):
                    page = site_builder.render()
                    offline = site_builder.render(showrooms=False)
                count = len(doc['images'])
                self.assertIn(f'<div class="hero-stat"><b>{count}</b><span>张实拍照片', page)
                self.assertIn(f'{count} SOURCED FRAMES', page)
                self.assertIn(f'{count} 张实拍照片', page)
                self.assertIn('48 张车库照片', page)
                self.assertIn('<div class="hero-stat"><b>48</b><span>张实拍照片', offline)
                self.assertNotIn('{{photo-count}}', page + offline)

    def test_evidence_rejects_empty_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(FileNotFoundError): validate_evidence(folder)

    def test_reject_wrong_owner(self):
        self.doc['collections'][0]['photo_ids'].append('bmw-1')
        with self.assertRaises(ValueError): validate(self.doc, self.cars)

    def test_reject_duplicate_photo(self):
        self.doc['images'].append(self.doc['images'][0])
        with self.assertRaises(ValueError): validate(self.doc, self.cars)

    def test_reject_unsupported_license_assertion(self):
        self.doc['images'][0]['license_status'] = 'licensed'
        with self.assertRaises(ValueError): validate(self.doc, self.cars)

    def test_missing_photo_relation(self):
        self.doc['collections'][0]['photo_ids'].append('missing')
        with self.assertRaises(KeyError): validate(self.doc, self.cars)

    def test_commons_requires_author_license_and_revision_evidence(self):
        for field in ('author', 'revision_id', 'changes', 'license_url'):
            doc = copy.deepcopy(self.doc)
            photo = next(p for p in doc['images'] if p['key'].startswith('commons-'))
            photo['license_evidence'].pop(field)
            with self.subTest(field=field), self.assertRaises(ValueError): validate(doc, self.cars)

    def test_licensed_credits_are_visible_and_linked(self):
        photo = next(p for p in self.doc['images'] if p['key'].startswith('commons-'))
        result = builder.photo_ledger([photo])
        self.assertIn(photo['photographer'], result)
        self.assertIn(photo['license_evidence']['license_url'], result)
        self.assertIn('WebP', result)
        self.assertNotIn('未确认再许可', result)
        self.assertIn('srcset=', result)

    def test_commons_evidence_matches_saved_source_metadata(self):
        import html, re
        raw = json.loads((builder.DATA/'rights/commons-metadata.json').read_text())
        review = json.loads((builder.DATA/'rights/commons-review.json').read_text())
        decisions = {r['page_id']: r for r in review['selection']}
        for photo in self.doc['images']:
            if not photo['key'].startswith('commons-'): continue
            evidence = photo['license_evidence']
            source = raw[str(evidence['page_id'])]
            info = source['imageinfo'][0]; meta = info['extmetadata']
            self.assertEqual(photo['car_id'], decisions[evidence['page_id']]['car_id'])
            self.assertEqual(photo['team'], decisions[evidence['page_id']]['team'])
            self.assertEqual(evidence['revision_id'], source['revisions'][0]['revid'])
            self.assertEqual(evidence['author'], html.unescape(re.sub('<[^>]+>', '', meta['Artist']['value'])).strip())
            self.assertEqual(evidence['license_name'], meta['LicenseShortName']['value'])
            self.assertEqual(photo['original_url'], info['url'])
            self.assertEqual(evidence['original_sha1'], info['sha1'])

    def test_import_audit_matches_inventory_and_files(self):
        import hashlib
        audit = json.loads((builder.DATA/'rights/deduplication.json').read_text())
        licensed = [p for p in self.doc['images'] if p['key'].startswith('commons-')]
        self.assertEqual({r['key'] for r in audit['accepted']}, {p['key'] for p in licensed})
        self.assertEqual(len({p['sha256'] for p in self.doc['images']}), len(self.doc['images']))
        for photo in licensed:
            for variant in photo['variants']:
                raw = (builder.ROOT/variant['path']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), variant['sha256'])
                self.assertEqual(len(raw), variant['bytes'])
                self.assertGreater(variant['width'], 0)
        fingerprints = [(p['key'],int(p['phash'],16)) for p in licensed]
        baseline = [int(row['phash'],16) for row in audit['compared_baseline']]
        self.assertEqual(len(baseline), 48)
        for key,value in fingerprints:
            self.assertTrue(all(bin(value^other).count('1')>4 for other in baseline), key)
        for i,(key,value) in enumerate(fingerprints):
            self.assertTrue(all(bin(value^other).count("1")>4 for _,other in fingerprints[i+1:]), key)

    def test_original_unknown_metadata_stays_empty(self):
        for photo in self.doc['images']:
            if photo['key'].startswith(('commons-', 'pf-')): continue
            for field in ('photographer', 'event', 'circuit', 'captured_at', 'license_evidence'):
                self.assertIsNone(photo[field])


if __name__ == '__main__': unittest.main()
