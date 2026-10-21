"""Validate the data layer, generated showroom routes, garage and offline build.

Run after `python3 scripts/build.py` and `python3 scripts/build.py --offline`.
The checks are intentionally static: they do not execute page JavaScript or
contact third-party source URLs.
"""
from pathlib import Path
import hashlib
import html as html_module
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

cars = json.loads((ROOT / "data/cars.json").read_text(encoding="utf-8"))
photos_doc = json.loads((ROOT / "data/photos.json").read_text(encoding="utf-8"))
showrooms_doc = json.loads((ROOT / "data/showrooms.json").read_text(encoding="utf-8"))
photos = photos_doc["images"]
showrooms = showrooms_doc["showrooms"]
featured = showrooms_doc["featured"]
categories = showrooms_doc["categories"]
car_by_id = {car["id"]: car for car in cars}
photo_by_key = {photo["key"]: photo for photo in photos}

results = []


def check(name, condition, detail=""):
    results.append((name, bool(condition), str(detail)))


def local_refs(page_text):
    return [html_module.unescape(ref) for ref in re.findall(r'(?:src|href)="([^"]+)"', page_text)]


def check_local_resources(path, text):
    errors = []
    for ref in local_refs(text):
        if ref.startswith(("http://", "https://", "//", "#", "data:", "mailto:", "tel:")):
            continue
        if ref.startswith("/"):
            errors.append("root-absolute " + ref)
            continue
        target_ref = ref.split("#", 1)[0].split("?", 1)[0]
        if not target_ref:
            continue
        target = (path.parent / target_ref).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            errors.append("outside root " + ref)
            continue
        if target_ref.endswith("/"):
            target = target / "index.html"
        if not target.is_file():
            errors.append(ref)
    return errors


# ---- data layer -----------------------------------------------------------
check("16 vehicle records", len(cars) == 16, len(cars))
check("vehicle IDs are unique", len(car_by_id) == len(cars))
check("captured photo records are 48", len(photos) == 48, len(photos))
check("photo keys are unique", len({p["key"] for p in photos}) == len(photos))
check("photo car IDs are valid", all(p["car_id"] in car_by_id for p in photos))
check("each vehicle has three photos", all(sum(1 for p in photos if p["car_id"] == cid) == 3 for cid in car_by_id))
check("photo team matches owning car", all(p.get("team") == car_by_id[p["car_id"]]["team"] for p in photos))
check("photo livery year matches owning car", all(str(p.get("livery_year")) == str(car_by_id[p["car_id"]]["metadata"]["data-year"]) for p in photos))
photo_hashes_ok = True
photo_hash_detail = []
for photo in photos:
    path = ROOT / photo["local_path"]
    if not path.is_file():
        photo_hashes_ok = False
        photo_hash_detail.append("missing " + photo["local_path"])
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != photo["sha256"]:
        photo_hashes_ok = False
        photo_hash_detail.append("sha " + photo["local_path"])
check("photo files match SHA-256", photo_hashes_ok, "; ".join(photo_hash_detail[:4]))
check("photo license/source fields are populated", all(p.get("license_status") and p.get("original_url") and p.get("source_url") for p in photos))

check("three pilot showrooms declared", featured == ["ferrari26", "bmw", "porsche26"], featured)
showrooms_ok = True
showroom_detail = []
for sid in featured:
    conf = showrooms.get(sid)
    if not conf or sid not in car_by_id:
        showrooms_ok = False
        showroom_detail.append("missing " + sid)
        continue
    if photo_by_key[conf["hero_photo"]]["car_id"] != sid:
        showrooms_ok = False
        showroom_detail.append("hero ownership " + sid)
    assigned = [label for labels in conf["field_groups"].values() for label in labels]
    labels = [row["label"] for row in car_by_id[sid]["specs"]]
    if sorted(assigned) != sorted(labels) or len(assigned) != len(set(assigned)):
        showrooms_ok = False
        showroom_detail.append("field groups " + sid)
    if conf["compare_default"] not in car_by_id or conf["compare_default"] == sid:
        showrooms_ok = False
        showroom_detail.append("compare default " + sid)
    if not conf.get("sources"):
        showrooms_ok = False
        showroom_detail.append("no sources " + sid)
    for related in conf.get("lineage", []):
        if related["id"] not in car_by_id:
            showrooms_ok = False
            showroom_detail.append("lineage " + sid)
check("showroom configs, field groups and sources are valid", showrooms_ok, "; ".join(showroom_detail))

# ---- garage render -------------------------------------------------------
page_path = DIST / "index.html"
check("garage generated", page_path.is_file())
page = page_path.read_text(encoding="utf-8") if page_path.is_file() else ""
check("garage keeps 16 cards", len(re.findall(r'<article\b[^>]*class="vehicle card"', page)) == 16, len(re.findall(r'<article\b[^>]*class="vehicle card"', page)))
check("garage has three showroom previews", len(re.findall(r'class="showroom-preview"', page)) == 3, len(re.findall(r'class="showroom-preview"', page)))
check("garage has three showroom card links", len(re.findall(r'class="btn-ghost showroom-link"', page)) == 3, len(re.findall(r'class="btn-ghost showroom-link"', page)))
check("garage links all showroom routes", all(f'href="cars/{sid}/"' in page for sid in featured))
check("garage has no unresolved tokens", not re.search(r"@@[A-Z_]+@@|\{\{[^}]+\}\}", page))
check("garage has no embedded data images", "data:image/jpeg;base64," not in page)

# ---- generated showrooms -------------------------------------------------
for sid in featured:
    path = DIST / "cars" / sid / "index.html"
    if not path.is_file():
        check(f"{sid} route generated", False)
        continue
    text = path.read_text(encoding="utf-8")
    car = car_by_id[sid]
    conf = showrooms[sid]
    check(f"{sid} route generated", True)
    check(f"{sid} has seven technical categories", len(re.findall(r'class="sr-tech-category(?: is-empty)?"', text)) == 7, len(re.findall(r'class="sr-tech-category(?: is-empty)?"', text)))
    thumbs = len(re.findall(r'class="sr-gallery-thumb(?: is-active)?"', text))
    check(f"{sid} gallery count matches photos", thumbs == 3, thumbs)
    check(f"{sid} photo ledger count matches photos", len(re.findall(r'class="sr-ledger-card"', text)) == 3, len(re.findall(r'class="sr-ledger-card"', text)))
    fields = len(re.findall(r'class="sr-tech-field(?: is-wide)?"', text))
    check(f"{sid} all technical fields rendered", fields == len(car["specs"]), f"{fields}/{len(car['specs'])}")
    missing_labels = [row["label"] for row in car["specs"] if html_module.escape(row["label"]) not in text]
    check(f"{sid} all source labels rendered", not missing_labels, ", ".join(missing_labels))
    check(f"{sid} source ledger rendered", len(re.findall(r'class="sr-source-ledger"', text)) == 1)
    select_match = re.findall(r'<select id="srComparePartner".*?</select>', text, re.S)
    check(f"{sid} compare options exclude current car", bool(select_match) and f'value="{sid}"' not in select_match[0])
    check(f"{sid} garage return link", "../../#garage" in text)
    check(f"{sid} no unresolved tokens", not re.search(r"@@[A-Z_]+@@|\{\{[^}]+\}\}", text))
    check(f"{sid} has no duplicate IDs", len(re.findall(r'\bid="([^"]+)"', text)) == len(set(re.findall(r'\bid="([^"]+)"', text))))
    resource_errors = check_local_resources(path, text)
    check(f"{sid} local resources resolve", not resource_errors, "; ".join(resource_errors[:4]))

# ---- sitemap, offline ----------------------------------------------------
sitemap_path = DIST / "sitemap.xml"
sitemap = sitemap_path.read_text(encoding="utf-8") if sitemap_path.is_file() else ""
check("sitemap includes all showrooms", all(f"/cars/{sid}/" in sitemap for sid in featured), sitemap[:200])
offline_path = DIST / "gt3-atlas-offline.html"
check("offline single-file archive exists", offline_path.is_file())
if offline_path.is_file():
    offline = offline_path.read_text(encoding="utf-8")
    check("offline retains 16 cards", len(re.findall(r'<article\b[^>]*class="vehicle card"', offline)) == 16)
    check("offline embeds 48 images", offline.count("data:image/jpeg;base64,") >= 48, offline.count("data:image/jpeg;base64,"))
    check("offline has no external stylesheet", not re.search(r'<link[^>]+rel="stylesheet"[^>]+href="(?!data:)', offline))
    check("offline has no external script", not re.search(r'<script[^>]+src="(?!data:)', offline))
    check("offline has no showroom links", not re.search(r'class="showroom-preview|class="btn-ghost showroom-link|id="showrooms"', offline))
    check("offline has no unresolved tokens", not re.search(r"@@[A-Z_]+@@|\{\{[^}]+\}\}", offline))

for name, ok, detail in results:
    print(("PASS" if ok else "FAIL") + " | " + name + ((" | " + detail) if detail and not ok else ""))
failed = [item for item in results if not item[1]]
print(f"\n{'ALL CHECKS PASSED' if not failed else str(len(failed)) + ' CHECK(S) FAILED'} | {len(results)-len(failed)}/{len(results)}")
sys.exit(1 if failed else 0)
