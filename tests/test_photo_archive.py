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
        counts = {len(c['photo_ids']) for c in self.doc['collections'] if c['car_id'] == 'ferrari26'}
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

    def test_original_unknown_metadata_stays_empty(self):
        for photo in self.doc['images']:
            for field in ('photographer', 'event', 'circuit', 'captured_at', 'license_evidence'):
                self.assertIsNone(photo[field])


if __name__ == '__main__': unittest.main()
