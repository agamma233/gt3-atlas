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
