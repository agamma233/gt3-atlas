"""Reject missing, stale-looking or incomplete browser evidence before upload.

The same checker can inspect an extracted GitHub Actions artifact directory.
"""
from pathlib import Path
import argparse
import json
import struct

ROOT = Path(__file__).resolve().parents[1]


def validate_evidence(folder):
    folder = Path(folder)
    screenshots = [f'{name}-{width}.png' for name in ('home', 'ferrari26', 'bmw', 'porsche26') for width in (1440, 390)]
    screenshots += ['bmw-thumbnails-390.png', 'archive-1440.png', 'archive-390.png', 'stories-1440.png', 'gallery-1440.png', 'viewer-zoom-1440.png', 'viewer-touch-390.png', 'photography-first-hd-1440.png']
    for name in screenshots:
        data = (folder / name).read_bytes()
        if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n' or min(struct.unpack('>II', data[16:24])) <= 0:
            raise ValueError(f'Invalid screenshot: {name}')
    checks = json.loads((folder / 'checks.json').read_text())
    if not checks or not all(isinstance(row.get('ok'), bool) and row.get('name') for row in checks):
        raise ValueError('Missing or invalid browser checks')
    if not all(row['ok'] for row in checks):
        raise ValueError('Browser checks include failures; diagnostic evidence will still upload')
    measurements = json.loads((folder / 'measurements.json').read_text())
    required = {(w, h, route) for w, h in ((1440, 900), (1024, 768), (390, 844), (375, 812)) for route in ('', 'cars/ferrari26/', 'cars/bmw/', 'cars/porsche26/')}
    recorded = {(row.get('width'), row.get('height'), row.get('route')) for row in measurements if row.get('paints') and 'cls' in row}
    if not required <= recorded:
        raise ValueError('Incomplete page/viewport performance measurements')
    first_load = [r for r in measurements if r.get('scenario','').startswith('Photography First cold')]
    if len(first_load) != 2 or any(r.get('hd') != 0 or r.get('bytes',0) <= 0 or not r.get('resources') for r in first_load):
        raise ValueError('Missing real desktop/mobile first-load measurements or eager HD requests')
    budget = json.loads((folder/'storage-report.json').read_text())
    if budget['budget_status'] == 'manual-review-required' or budget['pages_bytes'] > budget['manual_review_bytes']:
        raise ValueError('Review image budget before release')
    if budget['photographs_with_2560'] <= 0 or budget['large_images_over_1_5_MiB']:
        raise ValueError('Missing genuine HD resources or unoptimised oversized images')
    return len(screenshots), len(checks), len(measurements)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', nargs='?', type=Path, default=ROOT / 'tests/browser/.artifacts/v1.3')
    count, checks, measurements = validate_evidence(parser.parse_args().folder)
    print(f'BROWSER EVIDENCE VERIFIED | {count} required PNGs, {checks} checks, {measurements} measurements')
