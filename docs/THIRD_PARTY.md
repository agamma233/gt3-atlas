# Third-party implementation review — 2026-10-21

## Imported runtime dependency

PhotoSwipe **5.4.4**, MIT, vendored unchanged from the official `v5.4.4` tag:

- [Project and release](https://github.com/dimsemenov/PhotoSwipe/releases/tag/v5.4.4)
- [Getting started](https://photoswipe.com/getting-started/)
- [Local license](../assets/vendor/photoswipe/LICENSE)
- `photoswipe.esm.js` (official `dist/photoswipe.esm.min.js`): 54,270 bytes, SHA-256 `542069771beb34dc461cdb9374da8af643c591ebf65d8ec36331dd9a0681ebd4`
- `photoswipe.css`: 7,003 bytes, SHA-256 `bb5e956812a813e1bd5be5d7641cc78d05d7e7d3f7ab10187bc2725d70b52c94`

The module is imported on first viewer use. No CDN, package manager, runtime transitive dependencies or network calls are required by the viewer. On 2026-10-21, querying `https://api.osv.dev/v1/query` for npm `photoswipe` version `5.4.4` returned `{}` (no matching published advisories). This is a point-in-time advisory lookup, not a security guarantee. Captions use DOM `textContent` and source links, not photo-supplied HTML. There is one active viewer per showroom; the previous custom showroom lightbox was removed. The offline garage retains its existing independent implementation.

## Studied, not imported

| Project | Ideas applied | Decision |
|---|---|---|
| [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe) | Zoom/pan, pinch/swipe, adjacent preload, keyboard navigation, focus handling, image-error UI | Only imported gallery library. Preserve local preview dimensions. |
| [Splide](https://github.com/Splidejs/splide) | Active thumbnail synchronization, roving keyboard focus and lazy media | Existing gallery already handles these; another carousel adds duplicate responsibility. |
| [Lenis](https://github.com/darkroomengineering/lenis) | Deliberate scroll pacing, respect for native navigation and motion preferences | Use native anchor scrolling; no additional animation loop. |
| [Motion](https://github.com/motiondivision/motion) | Short opacity/transform transitions, reduced motion | Small CSS transitions suffice. No framework migration. |
| [Veloce](https://github.com/warcit0/veloce-3d-showroom) | Dark cinematic composition, large typography and chapter rhythm | Visual reference only; no source, model, photography, or other assets copied. Repository license was not established, so no code reuse. |

PhotoSwipe, Splide, Lenis and Motion identify MIT licensing in their upstream repositories. Only the imported pinned PhotoSwipe version requires a runtime version/advisory review. No claim is made that unimported reference projects were audited. Third-party photography remains excluded from the code's MIT license; see NOTICE.md.
