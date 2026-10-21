# V1.2 verification — 2026-10-21

Development baseline: `4b21c4f` on `origin/main`, the merge commit for PR #2. Its homepage, mobile INDEX, full-card routing and offline fallbacks are retained. Work is on `feature/motorsport-photo-archive-v1.2`. No merge or production deployment was performed.

## Executed checks

| Command | Actual result |
|---|---|
| `python3 scripts/build.py` | Garage + all three showroom routes generated. |
| `python3 scripts/build.py --offline` | Three routes + self-contained 9,566,117-byte garage generated. |
| `python3 scripts/check.py` | 116/116 passed: data relations, photo hashes/bytes, baseline, vendor hashes, paths, engineering fields, offline output. |
| `python3 -m unittest discover -s tests -v` | 8/8 passed; actual shared template rendered with 1, 2, 4 and 7 fixture frames. Includes multiple entries/liveries, invalid ownership, duplicate IDs and unsubstantiated licensing. |
| `node tests/browser/showroom_navigation.mjs` | 62/62 passed in real installed Chrome: homepage entries, mobile INDEX, hit-testing, three routes, history, console and resource failures. |
| `node tests/browser/photo_archive.mjs` | 56/56 passed in real installed Chrome. |
| `node --check assets/app.js` / `assets/showroom.js` | Passed. |
| Python compile / `git diff --check` | Passed (Python bytecode cache redirected to `/tmp`). |

The photography browser suite checks every home/showroom route at **1440×900, 1024×768, 390×844 and 375×812**. It performs real coordinate clicks, keyboard events, mouse panning, CDP touch swipes and two-finger pinch gestures. It verifies collection sizes 3 and 2, original/source links, zoom in/out, focus trapping, ESC/close focus restoration, brand/year/series/search filters, telemetry switching, `?compare=bmw,ferrari26`, offline embedded images, reduced motion, script-disabled content, and explicit gallery/viewer failure messages with a deliberately blocked image.

No horizontal overflow or uncaught/console errors were observed during the normal photography pass. The original navigation suite also observed zero failed requests or HTTP 4xx/5xx resources. The intentionally blocked-image scenarios are separate from normal network checks.

## Measured performance

See [performance-observations.json](performance-observations.json) for the recorded browser observations. Tests used the installed macOS Chrome with local HTTP and a new isolated profile. This is not a Lighthouse audit, production-network benchmark or cross-device performance guarantee.

- Across the 16 unthrottled page/viewport observations, FCP ranged from **16 to 80 ms**; observed CLS was **0** at the sampled points.
- A cold-cache mobile Ferrari page with **150 ms latency and 200,000 bytes/s download**, at 390×844, recorded **FCP 1,024 ms**, observed **CLS 0**, and **337,182 transferred resource bytes** at sampling.
- Resource bytes exclude the HTML document itself. Sampling happens after document completion plus a short settling interval; below-fold lazy images and later interactions can add bytes and shifts.
- The PhotoSwipe JS module is approximately 54 KB and imported only on first viewer use. On constrained save-data connections, adjacent viewer preloading is disabled; otherwise only one adjacent frame is preloaded.

No Lighthouse score, physical iPhone/Safari result or remote-source availability claim is made.

## Visual evidence

All images below are actual browser captures of this branch:

- [Desktop homepage](screenshots/home-1440.png) / [mobile homepage](screenshots/home-390.png)
- [Desktop Ferrari cover](screenshots/ferrari26-1440.png) / [mobile Ferrari cover](screenshots/ferrari26-390.png)
- [Editorial photo stories](screenshots/stories-1440.png)
- [Complete gallery and collections](screenshots/gallery-1440.png)
- [Mobile viewer after pinch zoom](screenshots/viewer-touch-390.png)

CI uploads the full browser artifact directory, including all three marque covers, the zoomed desktop viewer, checks and measurements. Screenshots contain the same third-party photography as the archive and grant no additional image rights.

## Delivery scope and limits

- 48 original photographs and 16 cars preserved; no new racing photography, invented capture facts or technical numbers.
- Three marque pages share one template, renderer and interaction script. Other 13 cars keep the existing garage.
- Multiple entries/liveries/collections are supported; current data still represents the original archive entries. The two-frame perspective collections reuse existing photographs rather than claiming new shoots.
- The viewer zooms the preserved local previews. Remote high-resolution originals remain explicit external links; they are not automatically downloaded.
- No native application fullscreen API, 3D renderer, Lenis scroll interception or redundant carousel dependency was added. The lightbox occupies the browser viewport and provides pinch/zoom/pan.
- Photography licensing remains source-referenced and unconfirmed for republication. Capture dates, photographers and circuits remain unverified.


## PR #3 review follow-up

The five review issues were corrected on the original feature branch:

- Actions includes the hidden `.artifacts/` directory, errors on no files,
  and validates screenshots/checks/measurements before uploading. The old run
  `39622418512` returned an empty artifacts list and logged “No files were
  found”; a successful step alone is no longer treated as upload evidence.
- Livery links select their own collections via `livery_id`, using real
  collection anchors with keyboard focus transfer and a working all-photos reset.
- Photo metadata uses livery year, independently of entry season; tests include
  2026/2027 liveries on a 2025 entry and an unknown year.
- PhotoSwipe module/init failures render an in-page alert with explicit original
  and local-preview links, clean partial overlays/inert/scroll-lock state, and
  restore trigger focus when dismissed. No automatic navigation occurs.
- Homepage totals are read from the photography source, while curated garage
  and offline counts remain accurate. Fixtures test inventories of 49 and 51
  photographs without adding production images.

Follow-up local results: Python build/offline build passed, static checks
116/116, Python tests 12/12, original navigation browser checks 62/62, and
photography browser checks 66/66. The photography evidence checker verified
12 required PNGs, 66 passing checks and 17 measurement records. The extra
`viewer-module-error-390.png` records the new inline error UI. CI artifact
presence and contents are audited through the Actions API and by downloading
the actual archive, rather than relying on the upload step's status.
