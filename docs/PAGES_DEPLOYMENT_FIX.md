# V1.2 Pages build failure: investigation and regression fix

## Evidence and root cause

The failed main run [39626107577](https://github.com/agamma233/gt3-atlas/actions/runs/39626107577)
used merge commit `7e1a9ce05e75c75dd31cf14abf68390483ee7560`.
Its Python build/static checks and 62 navigation assertions passed. Photography
stopped after 38 assertions, waiting for the zoom-icon CSS class. Missing
`viewer-zoom-1440.png` was a consequence; the evidence checker correctly failed.
The downloaded failure screenshot contains viewer controls/caption but no
visible photograph. It does not contain enough state to retrospectively prove
which individual image/decode/animation callback was delayed.

The successful PR run [39624823993](https://github.com/agamma233/gt3-atlas/actions/runs/39624823993)
and failed main run have **identical** showroom JS, photography test and workflow
contents. Both ran Ubuntu 24.04.5 and Node 24, but runner images were respectively
`20261012.334.1` and `20261018.339.1`. The old test did not record Chrome version,
so a particular browser upgrade cannot be established as the cause.

The reproducible defect is a readiness race in the test: `.pswp--open` appears
before PhotoSwipe's opening transition and heavy image attachment complete.
The previous helper proceeded after fixed pauses and treated
`.pswp--zoomed-in` as proof of zoom, without checking the loaded current image.
PhotoSwipe 5.4.4's UI derives that class from current/initial/secondary zoom and
opening state; it is a UI detail rather than an authoritative rendered-scale
measurement. Its gestures also reject pointer-down while the opener is not open.

References inspected: [PhotoSwipe events](https://photoswipe.com/events/),
[zoom levels](https://photoswipe.com/adjusting-zoom-level/), and the pinned
[v5.4.4 UI](https://github.com/dimsemenov/PhotoSwipe/blob/v5.4.4/src/js/ui/ui.js),
[slide](https://github.com/dimsemenov/PhotoSwipe/blob/v5.4.4/src/js/slide/slide.js),
[opener](https://github.com/dimsemenov/PhotoSwipe/blob/v5.4.4/src/js/opener.js)
and [gesture](https://github.com/dimsemenov/PhotoSwipe/blob/v5.4.4/src/js/gestures/gestures.js) implementations.

## Minimal repair

Only browser-test code and documentation change. Production JS/CSS, vendored
PhotoSwipe 5.4.4, photography/data, Pages paths and workflow gates are unchanged.

- `photoswipe_driver.mjs` uses CDP's read-only prototype/object inspection to
  find the actual live PhotoSwipe instance. It does not expose a product global,
  change its methods, or replace coordinate clicks with calls to `zoomTo()`.
- Readiness requires the active image to be loaded, attached and visible, and
  the actual root/image/slide CSS transitions to have completed.
- Zoom-in/out checks compare public `currSlide.currZoomLevel` and configured
  initial/secondary levels with `getBoundingClientRect().width / slide.width`.
  A changed icon class alone cannot pass. Drag checks both the current slide's
  pan and its actual displayed position; it no longer guesses an array slot.
- Coordinate clicks wait for a stable, hit-testable target, send a mouse move
  and explicit pressed/released button states. There is no added stabilization
  sleep or unconditional retry of the zoom action. Frame changes, pinch and
  close/focus restoration also use actual state predicates.
- A scoped response fixture subclasses the **real** pinned library and extends
  only its documented opening-duration option. An `afterInit` observation proves
  the root exists while opening and before image attachment. The regular input
  tests then wait for readiness and verify real zoom/pan. No fake zoom result,
  missing screenshot substitute or product configuration change is introduced.
- `diagnostics.json` records browser version, click/state timeline, image state,
  zoom levels, rendered ratio, pan/transform and relevant network results. On
  exceptions **or failed assertions**, `failure.png` and the current viewer/DOM
  state are saved before cleanup. Existing checks/measurements and full artifact
  uploads remain intact. Incomplete evidence still fails the checker.

## Executed verification

All required commands were executed locally:

| Check | Result |
|---|---|
| `python3 scripts/build.py` | Passed |
| `python3 scripts/build.py --offline` | Passed |
| `python3 -m unittest discover -s tests -v` | 12/12 |
| `python3 scripts/check.py` | 116/116 |
| `node tests/browser/showroom_navigation.mjs` | 62/62 |
| `node tests/browser/photo_archive.mjs` | Three consecutive full runs, each 67/67 |
| `python3 scripts/check_browser_evidence.py` | Passed after each run: 12 required PNGs, 67 checks, 17 measurements |

Desktop observations include initial zoom 1, secondary zoom 2, real image widths
1000 → 2000 → 1000 px and a changed pan/rendered x position during mouse drag.
The mobile pinch test measures actual zoom and rendered scale; keyboard,
collection, fallback, focus and all four viewport regressions remain covered.
Each run retains the additional module-error screenshot and diagnostics JSON.

A new PR must pass the unchanged Actions build/test/evidence workflow and its
actual artifact must be downloaded and verified before handoff. Pages upload
and deploy remain gated on a push to main; no deployment or merge is performed
by this repair. After review and merge, main runs the same repaired tests before
Upload Pages Artifact → Deploy. This is not a claim that the still-unmerged
repair has already updated the public website.
