# -*- coding: utf-8 -*-
"""Generate the three pilot Digital Showroom pages from data/*.json.

The same template is used for every showroom. Adding a new vehicle requires a
showroom configuration, photo inventory entries and a rebuild — never copying
a full page.
"""
from pathlib import Path
from html import escape as esc
import html as html_module
import json
import re

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TEMPLATE = (ROOT / "src" / "showroom.html").read_text(encoding="utf-8")
SITE = "https://agamma233.github.io/gt3-atlas"

cars_list = json.loads((DATA / "cars.json").read_text(encoding="utf-8"))
photos_doc = json.loads((DATA / "photos.json").read_text(encoding="utf-8"))
showrooms_doc = json.loads((DATA / "showrooms.json").read_text(encoding="utf-8"))

SHOWROOMS = showrooms_doc["showrooms"]
FEATURED = showrooms_doc["featured"]
CATEGORIES = showrooms_doc["categories"]


def clean_value(value):
    value = re.sub(r"<[^>]+>", "", str(value))
    return re.sub(r"\s+", " ", html_module.unescape(value)).strip()


def card_view(car):
    conf = SHOWROOMS.get(car["id"], {})
    return {
        "id": car["id"],
        "title": car["title"],
        "team": clean_value(car.get("team", "")),
        "year": str(car.get("metadata", {}).get("data-year", "")),
        "brand_en": car.get("metadata", {}).get("data-brand", ""),
        "brand_cn": conf.get("brand_cn", ""),
        "number": conf.get("number", ""),
        "specs": [
            {"label": row["label"], "value": clean_value(row.get("value_html", ""))}
            for row in car.get("specs", [])
        ],
        "sources": conf.get("sources", []),
        "result_main": conf.get("race_note", ""),
        "result_scope": conf.get("result_scope", ""),
        "series": conf.get("series", car.get("metadata", {}).get("data-series", "")),
    }


CARDS = {car["id"]: card_view(car) for car in cars_list}
cars_doc = {"cards": list(CARDS.values())}
PHOTOS = photos_doc["images"]
PHOTO_BY_KEY = {photo["key"]: photo for photo in PHOTOS}
PHOTOS_BY_CAR = {}
for photo in PHOTOS:
    PHOTOS_BY_CAR.setdefault(photo["car_id"], []).append(photo)


def a(value):
    return esc(str(value), quote=True)


def text(value):
    return esc(str(value))


def relative(photo):
    return "../../" + photo["local_path"]


def absolute(photo):
    return SITE + "/" + photo["local_path"]


def hex_rgb(value):
    value = value.lstrip("#")
    if len(value) != 6:
        return "223, 59, 49"
    return f"{int(value[0:2], 16)}, {int(value[2:4], 16)}, {int(value[4:6], 16)}"


def category_label(category):
    return category["id"]


def photo_data_attrs(photo, index):
    return (
        f'data-index="{index}" data-src="{a(relative(photo))}" data-alt="{a(photo["alt"])}" '
        f'data-angle="{a(photo["angle"])}" data-credit="{a(photo["credit"])}" '
        f'data-original="{a(photo["original_url"])}" data-source="{a(photo["source_url"])}" '
        f'data-width="{int(photo["width"])}" data-height="{int(photo["height"])}" '
        f'data-rights="{a(photo["license_status"])}"'
    )


def hero_frame_links(photos, hero_index, gallery_index):
    out = []
    for i, photo in enumerate(photos):
        active = " is-active" if i == gallery_index else ""
        out.append(
            f'<button class="sr-hero-frame-btn{active}" type="button" data-gallery-index="{i}" '
            f'aria-label="查看第 {i+1} 张照片：{a(photo["angle"])}">'
            f'<b>FRAME {i+1:02d}</b><span>{a(photo["angle"])}</span></button>'
        )
    return "\n".join(out)


def hero_specs(card, labels):
    rows = []
    for label in labels:
        spec = next((item for item in card["specs"] if item["label"] == label), None)
        value = spec["value"] if spec else "未列明 / NOT PUBLISHED"
        rows.append(
            f'<div class="sr-hero-spec"><span>{a(label)}</span><b>{a(value)}</b></div>'
        )
    return "\n".join(rows)


def gallery_thumbs(photos, hero_index, gallery_index):
    out = []
    for i, photo in enumerate(photos):
        active = " is-active" if i == gallery_index else ""
        selected = "true" if i == gallery_index else "false"
        tabindex = "0" if i == gallery_index else "-1"
        out.append(f'''<button class="sr-gallery-thumb{active}" type="button" role="tab" aria-selected="{selected}" tabindex="{tabindex}" aria-controls="srGalleryMedia" {photo_data_attrs(photo, i)}>
  <span class="sr-gallery-thumb-media"><img src="{a(relative(photo))}" alt="{a(photo["alt"])}" width="{int(photo["width"])}" height="{int(photo["height"])}" loading="lazy" decoding="async"></span>
  <span class="sr-gallery-thumb-copy"><span>FRAME {i+1:02d}</span><b>{a(photo["angle"])}</b><small>{a(photo["credit"])}</small></span>
</button>''')
    return "\n".join(out)


def photo_ledger(photos):
    out = []
    for i, photo in enumerate(photos):
        out.append(f'''<article class="sr-ledger-card">
  <button class="sr-ledger-image" type="button" data-photo-index="{i}" aria-label="放大查看 {a(photo["alt"])}">
    <img src="{a(relative(photo))}" alt="{a(photo["alt"])}" width="{int(photo["width"])}" height="{int(photo["height"])}" loading="lazy" decoding="async">
    <span>FRAME {i+1:02d}</span>
  </button>
  <div class="sr-ledger-copy">
    <b>{a(photo["angle"])}</b>
    <small>{a(photo["credit"])}</small>
    <div class="sr-ledger-links"><a href="{a(photo["original_url"])}" target="_blank" rel="noopener">原图 ↗</a><a href="{a(photo["source_url"])}" target="_blank" rel="noopener">图库出处 ↗</a></div>
    <span class="sr-ledger-rights">RIGHTS / 仅来源引用；版权归原权利人，未确认再许可。</span>
  </div>
</article>''')
    return "\n".join(out)


def tech_blocks(card, config):
    specs = {item["label"]: item["value"] for item in card["specs"]}
    assigned = []
    for labels in config["field_groups"].values():
        assigned.extend(labels)
    duplicate = sorted({label for label in assigned if assigned.count(label) > 1})
    unknown = sorted(set(assigned) - set(specs))
    unassigned = sorted(set(specs) - set(assigned))
    if duplicate or unknown or unassigned:
        raise ValueError(f"{card['id']} field groups invalid: duplicate={duplicate}, unknown={unknown}, unassigned={unassigned}")

    nav = []
    sections = []
    for index, category in enumerate(CATEGORIES, 1):
        cid = category["id"]
        labels = config["field_groups"].get(cid, [])
        count = len(labels)
        nav.append(
            f'<a class="sr-dossier-link{" is-active" if index == 1 else ""}" href="#tech-{a(cid.lower())}" data-tech-link="{a(cid.lower())}">'
            f'<span>{a(category["id"])} / {a(category["zh"])}</span><em>{count:02d}</em></a>'
        )
        fields = []
        for label in labels:
            value = specs[label]
            wide = " is-wide" if len(str(value)) > 55 else ""
            fields.append(f'<div class="sr-tech-field{wide}"><dt>{a(label)}</dt><dd>{a(value)}</dd></div>')
        if fields:
            body = f'<div class="sr-tech-grid">{"".join(fields)}</div>'
        else:
            empty_messages = {
                "CHASSIS": "本档案未提供独立底盘或悬架字段。不将综合性 Evo 描述拆成未经披露的单项数值。",
                "BRAKING": "本档案未提供独立制动字段。缺失不等于零值。",
                "AERODYNAMICS": "本档案未拆分独立空气动力字段；与 Evo 相关的披露保留在 REGULATIONS 分类。",
                "TRANSMISSION": "本档案未提供独立传动字段。",
            }
            body = f'<div class="sr-tech-empty">{a(empty_messages.get(cid, "未列明 / NOT PUBLISHED。"))}</div>'
        sections.append(f'''<article class="sr-tech-category{' is-empty' if not fields else ''}" id="tech-{a(cid.lower())}" data-tech-section="{a(cid.lower())}">
  <div class="sr-tech-head">
    <span class="sr-tech-index">{index:02d}</span>
    <div class="sr-tech-title"><h3>{a(category["zh"])}</h3><span>{a(category["id"])} / SOURCE FIELD GROUP</span></div>
    <span class="sr-tech-count">{count:02d} FIELDS</span>
  </div>
  <p class="sr-tech-description">{a(category["description"])}</p>
  {body}
</article>''')
    return "\n".join(nav), "\n".join(sections)


def source_ledger(card):
    return "\n".join(
        f'<a href="{a(source["href"])}" target="_blank" rel="noopener"><span>{i:02d}</span>{a(source["text"])}</a>'
        for i, source in enumerate(card["sources"], 1)
    )


def related_cards(config):
    cards = []
    for related in config["lineage"]:
        car = CARDS.get(related["id"])
        if not car:
            raise ValueError(f"unknown related car {related['id']}")
        photos = PHOTOS_BY_CAR.get(car["id"], [])
        if not photos:
            raise ValueError(f"related car has no photo: {car['id']}")
        photo = photos[0]
        has_showroom = car["id"] in SHOWROOMS
        href = f'../{car["id"]}/' if has_showroom else f'../../#{car["id"]}'
        action = "OPEN SHOWROOM ↗" if has_showroom else "GARAGE DOSSIER ↗"
        cards.append(f'''<a class="sr-related-card" href="{a(href)}">
  <div class="sr-related-media"><img src="{a(relative(photo))}" alt="{a(photo["alt"])}" width="{int(photo["width"])}" height="{int(photo["height"])}" loading="lazy" decoding="async"></div>
  <div class="sr-related-copy"><span>{a(related["relation"])}</span><h3>{a(car["title"])}</h3><p>{a(related["note"])}</p><a href="{a(href)}">{action}</a></div>
</a>''')
    if not cards:
        cards.append(
            '<div class="sr-related-empty">本图鉴未收录同族其他版本，因此不构建无法核实的换代或技术继承关系。可继续查看下方同场展厅。</div>'
        )
    return "\n".join(cards)


def more_showrooms(current_id):
    out = []
    for sid in FEATURED:
        if sid == current_id:
            continue
        conf = SHOWROOMS[sid]
        car = CARDS[sid]
        photo = PHOTO_BY_KEY[conf["hero_photo"]]
        out.append(f'''<a class="sr-more-card" href="../{a(sid)}/">
  <img src="{a(relative(photo))}" alt="{a(photo["alt"])}" width="{int(photo["width"])}" height="{int(photo["height"])}" loading="lazy" decoding="async">
  <div><span>SHOWROOM / {a(sid.upper())}</span><b>{a(car["title"])}</b><small>{a(car["team"])}</small></div>
</a>''')
    return "\n".join(out)


def render_showroom_link(sid):
    """Small card CTA used by the garage; empty when no showroom is configured."""
    if sid not in SHOWROOMS:
        return ""
    return f'''<a class="btn-ghost showroom-link" href="cars/{a(sid)}/">
  <span><span>进入数字展厅</span><small>OPEN SHOWROOM</small></span>
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M6 3h7v7"/></svg>
</a>'''


def render_showroom_rail():
    cards = []
    for i, sid in enumerate(FEATURED, 1):
        conf = SHOWROOMS[sid]
        car = CARDS[sid]
        photo = PHOTO_BY_KEY[conf["hero_photo"]]
        cards.append(f'''<a class="showroom-preview" href="cars/{a(sid)}/">
  <div class="showroom-preview-media">
    <span class="showroom-preview-index">{i:02d}</span>
    <span class="showroom-preview-enter" aria-hidden="true">↗</span>
    <img src="{a(photo["local_path"])}" alt="{a(photo["alt"])}" width="{int(photo["width"])}" height="{int(photo["height"])}" loading="lazy" decoding="async">
  </div>
  <div class="showroom-preview-copy">
    <span>DIGITAL SHOWROOM / {a(car["brand_en"].upper())}</span>
    <h4>{a(car["title"])}</h4>
    <p>{a(car["team"])}</p>
    <small>三角度实拍 · 工程档案 · 对比入口 <b>OPEN ↗</b></small>
  </div>
</a>''')
    return f'''<section class="showroom-rail" id="showrooms" data-reveal aria-labelledby="showrooms-title">
  <div class="showroom-rail-head">
    <div>
      <span class="mini-label">DIGITAL SHOWROOM / 01</span>
      <h3 id="showrooms-title">三款车型，独立数字展厅</h3>
    </div>
    <p>以大幅实拍、完整工程字段与可追溯来源构成的单车型展厅。先从三款现役 GT3 开始。</p>
  </div>
  <div class="showroom-rail-grid">
    {"".join(cards)}
  </div>
</section>'''


SHOWROOM_HERO_LINK = '<a class="text-link showroom-hero-link" href="#showrooms">三款数字展厅 <span aria-hidden="true">↘</span></a>'


def build_showroom(sid):
    config = SHOWROOMS[sid]
    card = CARDS.get(sid)
    if not card:
        raise ValueError(f"showroom car missing: {sid}")
    photos = PHOTOS_BY_CAR.get(sid, [])
    if len(photos) < 2:
        raise ValueError(f"showroom needs at least two photos: {sid}")
    hero = PHOTO_BY_KEY[config["hero_photo"]]
    if hero not in photos:
        raise ValueError(f"hero photo not owned by {sid}")
    hero_index = photos.index(hero)
    showroom_index = FEATURED.index(sid) + 1
    gallery_index = hero_index
    gallery_photo = photos[gallery_index]
    series = config["series"]
    partner = config["compare_default"]
    if partner not in CARDS or partner == sid:
        partner = next(item for item in FEATURED if item != sid)
    compare_options = []
    for other in cars_doc["cards"]:
        if other["id"] == sid:
            continue
        selected = " selected" if other["id"] == partner else ""
        compare_options.append(
            f'<option value="{a(other["id"])}"{selected}>{a(other["brand_en"])} · {a(other["title"])} · {a(other["year"])}</option>'
        )
    compare_href = f"../../?compare={sid},{partner}"
    tech_nav, tech_sections = tech_blocks(card, config)
    related = related_cards(config)
    more = more_showrooms(sid)
    next_index = FEATURED[(showroom_index) % len(FEATURED)]
    next_conf = SHOWROOMS[next_index]
    next_car = CARDS[next_index]

    intro = (
        f"{card['title']} 的独立数字展厅。以现有资料中的三角度实拍、工程字段与来源账本构成；"
        "页面不加入模拟参数、虚构性能或未经核实的车队信息。"
    )
    meta_description = (
        f"{card['brand_en']} {card['title']} 数字展厅：{len(photos)} 张实拍、"
        f"{len(card['specs'])} 个技术字段，{card['team']}。保留原始单位、BoE/BoP 语境与来源。"
    ).replace("BoE/BoP", "BoP")
    page_title = f"{card['brand_en']} {card['title']} · GT3 ATLAS Digital Showroom"
    canonical = f"{SITE}/cars/{sid}/"
    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Car",
        "name": card["title"],
        "brand": {"@type": "Brand", "name": card["brand_en"]},
        "model": config["model"],
        "vehicleConfiguration": config["variant"],
        "image": absolute(hero),
        "url": canonical,
        "description": meta_description,
    }, ensure_ascii=False).replace("</", "<\\/")

    tokens = {
        "@@PAGE_TITLE@@": text(page_title),
        "@@META_DESCRIPTION@@": a(meta_description),
        "@@CANONICAL@@": a(canonical),
        "@@OG_IMAGE@@": a(absolute(hero)),
        "@@HERO_PRELOAD@@": a(relative(hero)),
        "@@JSON_LD@@": json_ld,
        "@@ACCENT@@": a(config["accent"]),
        "@@ACCENT_RGB@@": hex_rgb(config["accent"]),
        "@@SHOWROOM_INDEX@@": f"{showroom_index:02d}",
        "@@ID@@": a(sid),
        "@@BRAND@@": a(card["brand_en"]),
        "@@BRAND_UPPER@@": a(card["brand_en"].upper()),
        "@@BRAND_CN@@": a(card["brand_cn"]),
        "@@MODEL@@": a(config["model"]),
        "@@VARIANT@@": a(config["variant"]),
        "@@HERO_TITLE_CLASS@@": "is-long" if len(config["model"]) > 8 else "",
        "@@TITLE@@": a(card["title"]),
        "@@YEAR@@": a(card["year"]),
        "@@TEAM@@": a(card["team"]),
        "@@NUMBER@@": a(card["number"]),
        "@@SERIES@@": a(series),
        "@@RESULT@@": a(card["result_main"]),
        "@@RESULT_SCOPE@@": a(card["result_scope"]),
        "@@INTRO@@": a(intro),
        "@@HERO_SPECS@@": hero_specs(card, config["headline_fields"]),
        "@@HERO_FRAME_LINKS@@": hero_frame_links(photos, hero_index, gallery_index),
        "@@HERO_IMAGE@@": a(hero["local_path"]),
        "@@HERO_ALT@@": a(hero["alt"]),
        "@@HERO_WIDTH@@": str(int(hero["width"])),
        "@@HERO_HEIGHT@@": str(int(hero["height"])),
        "@@HERO_ANGLE@@": a(hero["angle"]),
        "@@HERO_CREDIT@@": a(hero["credit"]),
        "@@HERO_ORIGINAL@@": a(hero["original_url"]),
        "@@HERO_SOURCE@@": a(hero["source_url"]),
        "@@HERO_INDEX@@": str(hero_index),
        "@@HERO_FRAME@@": f"{hero_index+1:02d}",
        "@@PHOTO_TOTAL@@": f"{len(photos):02d}",
        "@@PHOTO_COUNT@@": str(len(photos)),
        "@@SPEC_COUNT@@": str(len(card["specs"])),
        "@@GALLERY_IMAGE@@": a(gallery_photo["local_path"]),
        "@@GALLERY_ALT@@": a(gallery_photo["alt"]),
        "@@GALLERY_FRAME@@": f"{gallery_index+1:02d}",
        "@@GALLERY_INDEX@@": str(gallery_index),
        "@@GALLERY_WIDTH@@": str(int(gallery_photo["width"])),
        "@@GALLERY_HEIGHT@@": str(int(gallery_photo["height"])),
        "@@GALLERY_ANGLE@@": a(gallery_photo["angle"]),
        "@@GALLERY_CREDIT@@": a(gallery_photo["credit"]),
        "@@GALLERY_ORIGINAL@@": a(gallery_photo["original_url"]),
        "@@GALLERY_SOURCE@@": a(gallery_photo["source_url"]),
        "@@GALLERY_THUMBS@@": gallery_thumbs(photos, hero_index, gallery_index),
        "@@PHOTO_LEDGER@@": photo_ledger(photos),
        "@@TECH_NAV@@": tech_nav,
        "@@TECH_SECTIONS@@": tech_sections,
        "@@SOURCES@@": source_ledger(card),
        "@@SOURCE_COUNT@@": f"{len(card['sources']):02d}",
        "@@LINEAGE_NOTE@@": a(config["lineage_note"]),
        "@@RELATED_CARDS@@": related,
        "@@MORE_SHOWROOMS@@": more,
        "@@NEXT_HREF@@": f"../{next_index}/",
        "@@NEXT_INDEX@@": f"{FEATURED.index(next_index)+1:02d}",
        "@@NEXT_LABEL@@": a(next_car["title"]),
        "@@COMPARE_OPTIONS@@": "\n".join(compare_options),
        "@@COMPARE_HREF@@": a(compare_href),
    }

    html = TEMPLATE
    for token, value in tokens.items():
        html = html.replace(token, value)
    unresolved = sorted(set(__import__("re").findall(r"@@[A-Z0-9_]+@@", html)))
    if unresolved:
        raise ValueError(f"unresolved showroom placeholders for {sid}: {unresolved}")

    out = ROOT / "dist" / "cars" / sid / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return {
        "id": sid,
        "title": card["title"],
        "path": f"cars/{sid}/index.html",
        "canonical": canonical,
        "photos": len(photos),
        "specs": len(card["specs"]),
    }


def build_showrooms():
    pages = []
    for sid in FEATURED:
        pages.append(build_showroom(sid))
    return pages


if __name__ == "__main__":
    pages = build_showrooms()
    for page in pages:
        print(f"showroom {page['id']}: {page['photos']} photos, {page['specs']} specs -> {page['path']}")
