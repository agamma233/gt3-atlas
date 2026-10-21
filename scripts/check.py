"""Validate the data layer, generated showroom routes, garage and offline build.

Run after `python3 scripts/build.py` and `python3 scripts/build.py --offline`.
The checks are intentionally static: they do not execute page JavaScript or
contact third-party source URLs.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
import hashlib
import html as html_module
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
SITE = "https://agamma233.github.io/gt3-atlas/"

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


def attr_value(attrs, name):
    match = re.search(r'\b' + re.escape(name) + r'="([^"]*)"', attrs)
    return html_module.unescape(match.group(1)) if match else ""


def has_class(attrs, class_name):
    return class_name in attr_value(attrs, "class").split()


def anchors(fragment):
    return re.findall(r"<a\b([^>]*)>(.*?)</a>", fragment, re.S)


def visible_text(fragment):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fragment)).strip()


class AnchorNestingParser(HTMLParser):
    """Detect invalid nested anchors in generated markup."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        if self.depth:
            self.errors.append((self.getpos(), dict(attrs).get("class", "")))
        self.depth += 1

    def handle_endtag(self, tag):
        if tag == "a" and self.depth:
            self.depth -= 1


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

# ---- homepage showroom entry points -------------------------------------
nav_match = re.search(r'<nav class="primary-nav".*?</nav>', page, re.S)
nav_anchors = anchors(nav_match.group(0)) if nav_match else []
nav_showroom = [(attrs, inner) for attrs, inner in nav_anchors if has_class(attrs, "nav-showroom")]
nav_href = attr_value(nav_showroom[0][0], "href") if nav_showroom else ""
nav_label = visible_text(nav_showroom[0][1]) if nav_showroom else ""
check("showroom entry in primary navigation", len(nav_showroom) == 1, len(nav_showroom))
check("primary showroom nav targets the showroom rail", nav_href == "#showrooms", nav_href)
check("primary showroom nav label is explicit", "数字展厅" in nav_label and "SHOWROOM" in nav_label, nav_label)

drawer_match = re.search(r'<aside class="index-drawer".*?</aside>', page, re.S)
drawer_anchors = anchors(drawer_match.group(0)) if drawer_match else []
drawer_links = [(attrs, inner) for attrs, inner in drawer_anchors if has_class(attrs, "drawer-showroom-link")]
drawer_hrefs = [attr_value(attrs, "href") for attrs, _ in drawer_links]
check("mobile index has three showroom entries", len(drawer_links) == 3, len(drawer_links))
check("mobile index showroom links cover all routes", drawer_hrefs == [f"cars/{sid}/" for sid in featured], drawer_hrefs)
check("mobile index showroom entries are labelled", all("SHOWROOM" in visible_text(inner) for _, inner in drawer_links))

hero_tags = [attrs for attrs in re.findall(r"<a\b([^>]*)>", page) if has_class(attrs, "hero-feature")]
hero_href = attr_value(hero_tags[0], "href") if hero_tags else ""
check("single hero featured card", len(hero_tags) == 1, len(hero_tags))
check("hero featured card opens the Ferrari showroom", hero_href == "cars/ferrari26/", hero_href)
check("hero featured card is not an in-page anchor", hero_href != "#ferrari26", hero_href)

rail_match = re.search(r'<section class="showroom-rail".*?</section>', page, re.S)
rail_anchors = anchors(rail_match.group(0)) if rail_match else []
rail_cards = [(attrs, inner) for attrs, inner in rail_anchors if has_class(attrs, "showroom-preview")]
rail_hrefs = [attr_value(attrs, "href") for attrs, _ in rail_cards]
check("three full-card showroom entries", len(rail_cards) == 3, len(rail_cards))
check("showroom rail cards cover all routes", rail_hrefs == [f"cars/{sid}/" for sid in featured], rail_hrefs)
check("showroom rail cards wrap media and copy", all("showroom-preview-media" in inner and "showroom-preview-copy" in inner for _, inner in rail_cards))
check("showroom rail entries identify their source", all(attr_value(attrs, "data-showroom-source") == "rail" for attrs, _ in rail_cards))

card_links = [(attrs, inner) for attrs, inner in anchors(page) if has_class(attrs, "showroom-link") and has_class(attrs, "btn-ghost")]
card_href_by_sid = {attr_value(attrs, "data-showroom-entry"): attr_value(attrs, "href") for attrs, _ in card_links}
check("three dossier showroom links", len(card_links) == 3, len(card_links))
check("dossier showroom links cover all routes", set(card_href_by_sid) == set(featured) and all(card_href_by_sid.get(sid) == f"cars/{sid}/" for sid in featured), card_href_by_sid)

page_entries = [("hero", hero_href, "ferrari26")]
page_entries += [(f"rail {sid}", href, sid) for sid, href in zip(featured, rail_hrefs)]
page_entries += [(f"dossier {sid}", card_href_by_sid.get(sid, ""), sid) for sid in featured]
page_entries += [(f"mobile index {sid}", href, sid) for sid, href in zip(featured, drawer_hrefs)]
for label, href, sid in page_entries:
    expected = f"{SITE}cars/{sid}/"
    actual = urljoin(SITE, href) if href else ""
    check(f"{label} resolves under /gt3-atlas/", bool(href) and actual == expected, f"{href} -> {actual}")

nesting = AnchorNestingParser()
nesting.feed(page)
check("garage has no nested anchors", not nesting.errors and nesting.depth == 0, nesting.errors[:2])

style_css = (ROOT / "assets/style.css").read_text(encoding="utf-8")
css_blocks = re.findall(r"([^{}]+)\{([^{}]*)\}", style_css)


def click_disabled(selector):
    for selectors, body in css_blocks:
        if "pointer-events: none" not in body:
            continue
        if selector in [item.strip() for item in selectors.split(",")]:
            return True
    return False


for selector in (".hero-feature", ".showroom-preview", ".showroom-link", ".drawer-showroom-link", ".nav-showroom"):
    check(f"{selector} is not click-disabled", not click_disabled(selector))
check("showroom card children pass clicks to the card link", ".showroom-preview > * { pointer-events: none; }" in style_css)

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
    related_cards = [(attrs, inner) for attrs, inner in anchors(text) if has_class(attrs, "sr-related-card")]
    related_ok = (bool(related_cards) and all("<a" not in inner for _, inner in related_cards)) or (not related_cards and 'class="sr-related-empty"' in text)
    check(f"{sid} related cards are single links or an explicit empty state", related_ok, len(related_cards))
    check(f"{sid} related cards expose an action label", all("sr-related-action" in inner for _, inner in related_cards))
    more_cards = [(attrs, inner) for attrs, inner in anchors(text) if has_class(attrs, "sr-more-card")]
    check(f"{sid} links the other two showrooms", len(more_cards) == 2, len(more_cards))
    next_match = re.search(r'<a class="sr-next-showroom" href="([^"]+)"', text)
    next_target = (path.parent / next_match.group(1)).resolve() / "index.html" if next_match else None
    check(f"{sid} next showroom route resolves", bool(next_target and next_target.is_file()), next_match.group(1) if next_match else "")
    nesting = AnchorNestingParser()
    nesting.feed(text)
    check(f"{sid} has no nested anchors", not nesting.errors and nesting.depth == 0, nesting.errors[:2])
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
    check("offline hides showroom nav and drawer", 'class="nav-showroom"' not in offline and 'class="drawer-link drawer-showroom-link"' not in offline)
    check("offline hero feature falls back to the garage dossier", 'class="hero-feature" href="#ferrari26"' in offline)
    check("offline contains no showroom route links", all(f'href="cars/{sid}/"' not in offline for sid in featured))
    check("offline has no unresolved tokens", not re.search(r"@@[A-Z_]+@@|\{\{[^}]+\}\}", offline))

for name, ok, detail in results:
    print(("PASS" if ok else "FAIL") + " | " + name + ((" | " + detail) if detail and not ok else ""))
failed = [item for item in results if not item[1]]
print(f"\n{'ALL CHECKS PASSED' if not failed else str(len(failed)) + ' CHECK(S) FAILED'} | {len(results)-len(failed)}/{len(results)}")
sys.exit(1 if failed else 0)
