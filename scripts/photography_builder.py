"""One complete, accessible gallery using the existing PhotoSwipe controller."""
from showroom_builder import PHOTOS, CARDS, SITE, a, gallery_thumbs, photo_filters, rights, responsive
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def build_photography():
    # Licensed work first, original images retained below with their own rights status.
    photos = sorted(PHOTOS, key=lambda p: not bool(p.get('license_evidence')))
    thumbs = gallery_thumbs(photos, 0, 0).replace('../../','../')
    blocks = []
    for photo, button in zip(photos, thumbs.split('</button>')[:-1]):
        button = button.replace(' role="tab"', '').replace(' aria-controls="srGalleryMedia"', '')
        button = button.replace('aria-selected="true"', '').replace('aria-selected="false"', '').replace('tabindex="-1"', 'tabindex="0"')
        credit = rights(photo) + f' <a href="{a(photo["source_url"])}" target="_blank" rel="noopener">来源 / SOURCE ↗</a>'
        blocks.append(f'<article class="sr-archive-item" role="listitem" data-archive-item>{button}</button><div class="sr-ledger-rights">{credit}</div></article>')
    cover = photos[0]
    cover_html = f'''<figure class="sr-archive-cover"><a href="../cars/{a(cover['car_id'])}/#photos"><img src="../{a(cover['local_path'])}" {responsive(cover).replace('../../','../')} width="{cover['width']}" height="{cover['height']}" alt="{a(cover['alt'])}" fetchpriority="high"><span>ENTER THE SHOWROOM ↗</span></a><figcaption>{rights(cover)} <a href="{a(cover['source_url'])}">来源 ↗</a></figcaption></figure>'''
    tokens = {
        '@@COUNT@@': str(len(photos)), '@@SITE@@': SITE,
        '@@COVER@@': cover_html,
        '@@SHOWROOM_LINKS@@': ''.join(f'<a href="../cars/{sid}/">{a(CARDS[sid]["title"])} ↗</a>' for sid in ('ferrari26','bmw','porsche26')),
        '@@FILTERS@@': photo_filters(photos, True), '@@GRID@@': ''.join(blocks),
    }
    html = (ROOT/'src/photography.html').read_text()
    for token, value in tokens.items(): html = html.replace(token, value)
    out=ROOT/'dist/photography';out.mkdir(parents=True,exist_ok=True);(out/'index.html').write_text(html)
    rows=''.join(f'<tr><td>{a(p["key"])}</td><td>{a(CARDS[p["car_id"]]["title"])}</td><td>{a(p.get("team", ""))} / {a(p.get("livery_year",""))}</td><td>{rights(p)}</td><td><a href="{a(p["source_url"])}">来源</a></td></tr>' for p in photos)
    (ROOT/'dist/photography-rights.html').write_text(f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>摄影授权清单 · GT3 ATLAS</title><style>body{{background:#111;color:#ddd;font:14px/1.7 sans-serif;padding:24px}}a{{color:#ffad91}}td,th{{padding:16px;border-bottom:1px solid #444}}table{{border-collapse:collapse;min-width:750px}}.scroll{{overflow:auto}}</style><h1>摄影来源与授权清单</h1><p>新增 Commons 摄影：作者、来源、许可证与修改说明逐张列明。原有 48 张来源引用图片并未因此取得再许可。CC BY-SA 衍生预览沿用各自原许可。图片所含商标、人物等其他权利并不由 CC 许可授予。</p><a href="photography/">返回摄影馆藏</a><div class="scroll"><table><thead><tr><th>PHOTO ID</th><th>车型</th><th>车队 / 年份</th><th>作者 / 许可 / 修改</th><th>出处</th></tr></thead><tbody>{rows}</tbody></table></div></html>')
