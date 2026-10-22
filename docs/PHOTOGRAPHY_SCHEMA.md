# Photography model — photos@4

`data/photos.json` remains the canonical inventory. `cars.json` keeps all 16 engineering dossiers unchanged. A photograph now joins the complete archive through **car_id alone**; editorial relationships are optional.

| Record | Required relation | Optional facts |
|---|---|---|
| Image | `key`, valid `car_id` | `entry_id`, `livery_id`, photographer presentation override, angle, team, event, circuit, captured_at, photo_type |
| Entry | Existing `id`, `car_id` | Team, season, number, series |
| Livery | Existing `id`, `entry_id` | Label, year |
| Editorial collection | `id`, `car_id`, title, nonempty unique `photo_ids` | `livery_id`; when supplied every photograph must match it |

Images require HTTPS source/original URLs, local path, positive dimensions, bytes, SHA-256 and rights status. Explicit licensed/public-domain assertions require evidence. Commons evidence requires exact permitted license URL, author, attribution, source revision/page ID, original SHA-1, real original dimensions, model evidence and changes. New imports also record the downloaded bytes' SHA-256 and dimensions. Unknown capture facts are omitted, not inferred from car season or replaced with zero. Missing optional metadata rows are absent from the rendered panel.

`photo_view()` provides model/ID alt text and source-derived credits for presentation without mutating canonical records. Old `angle`, credit, entry and livery data still work. Livery year resolves independently of entry season. A photo need not belong to an editorial collection to appear in the complete car archive.

## Preservation and provenance

`photos-baseline.json` freezes the original 48 files. `photography-first-baseline.json` additionally freezes all 137 pre-upgrade image keys, car ownership, main paths/hashes and rights status at main commit cc3f6a5. Existing technical data, sources, metadata and old derivatives remain intact. The original 48 remain **unconfirmed republication**, not newly authorized.

`rights/commons-*` and `deduplication.json` retain the historical 89-image import. `rights/photography-first-review.json`, `photography-first-metadata.json` and `photography-first-deduplication.json` record the new selection, explicit exclusions, raw Commons metadata and duplicate checks. `scripts/photo_import/import_photography_first.py --cache /external/cache` reproduces only reviewed imports with Pillow/numpy; production builds remain Python standard library only.

New records deliberately omit entry/livery/collection information. Do not make up race history to satisfy an importer. The source file description and manually checked body/version establish model identity. Commons categories alone are insufficient: misclassified cars, foreground mismatches, distant subjects and near-identical compositions are excluded.

## Image pipeline and delivery

New images have 480/960/1600px WebP previews where the downloaded pixels permit, plus 2560px only when the actual downloaded source permits. A 1206px photo keeps its real 1206px maximum. No upscaling occurs. Original downloads are outside Git/Pages. Stable filenames include Commons page ID, downloaded SHA-256 prefix and width. Re-encoding produces one resource per selected width. No LFS, external CDN, backend or object storage is required.

HTML srcset/preload and viewer previews exclude 2560px. PhotoSwipe picks an appropriate local preview; its explicit HD button loads just the current high-resolution image on demand. Zoom/pan coordinates use the same full-frame aspect ratio, and focus/scroll restoration remain in the existing viewer. Failed HD requests keep the preview and offer retry; original/source links remain available. Images without HD say so explicitly.

Brand/car/type/search are primary archive filters; optional team/season/livery filters remain in an expandable panel. Filters intersect, live counts update, URL query parameters share the state, and popstate restores it. Existing livery VIEW COLLECTIONS anchors and keyboard behavior are retained.

## Project-owned Pages budget

Builds publish `storage-report.json`: photo count, resource bytes by actual width, 1600/2560 counts, oversized files, exact self-inclusive output bytes and delta from the 137-image baseline. 300 MiB is a warning and 600 MiB requires human assessment; these are **project soft budgets**, not GitHub official limits. CI verifies every derivative decodes and matches its recorded dimensions/hash. Chrome records actual desktop/mobile first-navigation transfer resources separately from total storage.
