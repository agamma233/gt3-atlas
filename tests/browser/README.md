# Browser navigation regression

`showroom_navigation.mjs` verifies the V1.1 showroom entry points in a real
Chrome instance:

- serves `dist/` at the GitHub Pages subpath `/gt3-atlas/` on a temporary port;
- checks the three direct showroom routes return HTTP 200;
- clicks the hero Ferrari card, the three full-card showroom entries, one
  dossier CTA and the mobile INDEX entries;
- hit-tests each entry at multiple points to catch overlays or transparent
  layers that swallow clicks;
- verifies return-to-garage, browser back, console errors and failed resources.

It uses the Chrome DevTools Protocol directly, so there are no npm packages or
browser downloads.

```bash
python3 scripts/build.py --offline
python3 scripts/check.py
node tests/browser/showroom_navigation.mjs
```

Requirements: Node.js 22+ and Chrome/Chromium. Set `CHROME_PATH` if the browser
is installed outside the usual macOS/Linux locations. A failure writes
`tests/browser/.artifacts/failure.png` for inspection.

## V1.2 photography archive

```bash
python3 -m unittest discover -s tests -v
node tests/browser/photo_archive.mjs
```

The photography suite reuses the same CDP/server helpers. It tests the home and
three showroom pages at 1440×900, 1024×768, 390×844 and 375×812; thumbnail and
collection switching; zoom, pan, keyboard focus, ESC; actual CDP touch swipe
and two-finger pinch; search, brand/year/series filters, telemetry, legacy
compare URLs, offline garage, reduced motion, script-disabled content, and
blocked-image fallbacks. It captures screenshots and raw local performance
observations in `.artifacts/v1.2/`. A final cold-cache mobile scenario emulates
150 ms latency and 200,000 bytes/s download. These are browser observations,
not Lighthouse scores or physical-iPhone verification.

`showroom_navigation.mjs` still runs independently; its helpers are exported
without running tests when imported. CI runs both suites and uploads evidence.

## PR #3 review regressions and evidence upload

The photography suite clears its own `v1.2/` output before running, then saves
`checks.json` and `measurements.json` even when a browser assertion fails.
An isolated second-livery HTML fixture verifies native Enter activation,
collection filtering, focus transfer and the all-photos reset; the fixture is
removed during cleanup and does not enter the archive data. Blocked module
loading and a synthetic init/destroy exception verify that viewer failures
keep the showroom usable and expose keyboard-accessible fallback links.

Run `python3 scripts/check_browser_evidence.py` after the browser suite. It
requires 12 named, nonempty PNG screenshots, valid passing checks and the
measurements for every page/viewport pair. CI runs this checker before upload,
uses `include-hidden-files: true` for the narrowly scoped `.artifacts/` path,
and sets `if-no-files-found: error`. Upload still runs on failure so diagnostics
are available, while missing or incomplete evidence makes the job fail.

To audit an actual Actions download, run:

```bash
gh run download RUN_ID --name photography-browser-evidence --dir /tmp/gt3-evidence
python3 scripts/check_browser_evidence.py /tmp/gt3-evidence/v1.2
```
