# Photography model — photos@2

`data/photos.json` is the sole authoritative photography source. It contains:

| Entity | Key | Relationship / authority |
|---|---|---|
| Car | `cars.json → id` | Existing chassis identity and engineering fields stay in cars.json. |
| Race entry | `entries[].id` | `car_id`, team, season, number; `series` nullable. An inventory entry does not assert a particular race appearance. |
| Livery | `liveries[].id` | `entry_id`, label, year. Multiple liveries per entry and entries per car are supported. |
| Collection | `collections[].id` | `car_id`, `livery_id`, ordered `photo_ids`; any positive number of photographs. |
| Photo | `images[].key` | `car_id`, `livery_id`, source URLs, paths, preview dimensions, hash, rights and nullable capture facts. |

Collections refer to photographs rather than copying their source records. A photograph can occur in several collections belonging to the same livery. Cross-livery stories can be assembled in the all-car gallery; individual collections deliberately describe one livery. Every photo must belong to at least one collection. Future collective stories can introduce collection groups without altering photo IDs.

The 48 original keys, local paths and SHA-256 values are frozen in `photos-baseline.json`. This file is a preservation assertion, **not** another editable inventory. All 48 image files remain byte-for-byte unchanged. The validator permits additional photos, instead of requiring an exact total of 48 or exactly three per car.

Existing `team` and `livery_year` on photos remain as compatibility snapshots for the original inventory. Archive rendering resolves entries/liveries instead of those snapshots. Garage templates retain their original three selected views; additional inventory photos belong to the archive and do not require updating those three slots. `cars.json.team` remains the garage's representative entry, not a constraint on all future photos. `showrooms.json` configures presentation, engineering groups and representative hero selection; it is not a photography source.

Migration uses only existing team/year/number text. Team names are taken from the original team string and car numbers from its credit. No photographer, event, circuit, capture date or licensing evidence was inferred from filenames, current technical seasons, or race result notes. These are `null`. The existing race-series strings in engineering dossiers must not be presented as verified photo events.

## Adding a photograph or collection

1. Verify the source and rights status. Add the existing or new entry/livery; leave unverified facts `null`.
2. Add the local preview with its actual dimensions, byte length and SHA-256. Use a stable unique photo key. Keep original and source URLs distinct.
3. Add the photo key to one or more ordered collections for that livery. Collections must have at least one photo and no repeated IDs.
4. Run `python3 -m unittest discover -s tests -v`, `python3 scripts/build.py --offline`, and `python3 scripts/check.py`.
5. Review original-image links and rendered metadata in a browser before publishing.

Local dimensions describe the preserved preview, not the remote original. Original-source dimensions remain in existing credit strings; they are not independently promoted into verified original-image metadata.

`photo_archive.validate` checks unique IDs, ownership through entries/liveries/collections, dimensions, HTTPS sources, coverage, and evidence for explicit licensed/public-domain claims. `check.py` additionally verifies every local SHA-256 and the frozen original baseline. The tests render the real shared template with 1, 2, 4 and 7 fixture frames and multiple entry/livery relations. Fixture frames never enter production JSON.


## PR #3 review corrections

`photo_record()` resolves `livery.year` independently of `entry.season`, and
an unknown livery year remains unknown. Each rendered collection carries its
`livery_id` and a stable fragment ID. VIEW COLLECTIONS links target the first
corresponding collection directly; JavaScript shows only that livery's
collection controls and transfers focus to the selected button. All photos
restores the full collection index. Legacy collection buttons without relation
attributes retain ordinary selection; without JavaScript the anchor still
reaches a real collection control.

Homepage inventory totals (including meta descriptions, structured data,
hero, mobile index and footer) are computed from `photos.json.images` on each
build. The garage's curated-view total is separately counted from rendered
card images; offline totals describe only those embedded garage images.
