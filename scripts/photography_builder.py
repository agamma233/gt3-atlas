"""One complete, accessible gallery using the existing PhotoSwipe controller."""
from showroom_builder import PHOTOS, CARDS, SITE, a, gallery_thumbs, photo_filters, rights, responsive, relative, photo_data_attrs, photo_record
from pathlib import Path
from urllib.parse import quote
ROOT = Path(__file__).resolve().parents[1]

def build_photography():
    # Licensed work first, original images retained below with their own rights status.
    photos = sorted(PHOTOS, key=lambda p: not bool(p.get('license_evidence')))
    index_by_key = {p['key']:i for i,p in enumerate(photos)}
    blocks = []
    for i, photo in enumerate(photos):
        card = CARDS[photo['car_id']]
        blocks.append(f'''<article class="sr-archive-item" role="listitem" data-archive-item>
          <button class="sr-gallery-thumb" type="button" tabindex="0" {photo_data_attrs(photo,i)} aria-label="全屏查看 {a(card['title'])} · {a(photo['key'])}">
            <span class="sr-gallery-thumb-media"><img src="{a(relative(photo))}" {responsive(photo, '(max-width:700px) calc(100vw - 40px), (max-width:1100px) 46vw, 30vw')} width="{photo['width']}" height="{photo['height']}" loading="lazy" decoding="async" alt="{a(photo['alt'])}"></span>
            <span class="sr-gallery-thumb-copy"><b>{a(card['title'])}</b><small>{a(photo.get('photographer') or photo['credit'])}</small></span>
          </button>
          <div class="sr-ledger-rights">{rights(photo)} <a href="{a(photo['source_url'])}" target="_blank" rel="noopener">来源 ↗</a></div>
          {photo_record(photo)}
        </article>''')
    config_path=ROOT/'data/photography-first.json'
    config=__import__('json').loads(config_path.read_text()) if config_path.exists() else {}
    cover = next((p for p in photos if p['key']==config.get('cover')), photos[0])
    cover_html = f'''<figure class="sr-archive-cover"><a href="../{a(cover['local_path'])}" data-lightbox-open data-photo-index="{index_by_key[cover['key']]}"><img src="../{a(cover['local_path'])}" {responsive(cover, '(max-width:700px) 100vw, 70vw').replace('../../','../')} width="{cover['width']}" height="{cover['height']}" alt="{a(cover['alt'])}" fetchpriority="high"><span>VIEW PHOTOGRAPH ↗</span></a><figcaption>{rights(cover)} <a href="{a(cover['source_url'])}">来源 ↗</a></figcaption></figure>'''
    brands = sorted({c['brand_en'] for c in CARDS.values()})
    brand_links = ''.join(f'<a href="?brand={quote(brand)}#srGalleryMedia" data-brand-choice="{a(brand)}">{a(brand)}<small>{sum(CARDS[p["car_id"]]["brand_en"]==brand for p in photos):02d}</small></a>' for brand in brands)
    models = []
    for sid, card in CARDS.items():
        frames=[p for p in photos if p['car_id']==sid]
        chosen=next((p for p in frames if p.get('photography_first')),next((p for p in frames if p.get('license_evidence')),frames[0]))
        models.append(f'''<article><a href="?car={sid}#srGalleryMedia" data-model-choice="{sid}"><img src="{a(relative(chosen))}" {responsive(chosen,'260px')} width="{chosen['width']}" height="{chosen['height']}" loading="lazy" alt="{a(card['title'])}"><span>{a(card['brand_en'])} / {len(frames):02d} FRAMES</span><b>{a(card['title'])}</b></a><small>{rights(chosen)}</small></article>''')
    detail_photos=[p for p in photos if p.get('photo_type')=='detail' and p.get('license_evidence')]
    details=''.join(f'''<figure><a href="{a(relative(p))}" data-lightbox-open data-photo-index="{index_by_key[p['key']]}"><img src="{a(relative(p))}" {responsive(p,'(max-width:700px) 100vw, 30vw')} width="{p['width']}" height="{p['height']}" loading="lazy" alt="{a(p['alt'])}"></a><figcaption>{rights(p)}</figcaption></figure>''' for p in detail_photos[:3])
    tokens = {
        '@@COUNT@@':str(len(photos)), '@@SITE@@':SITE, '@@COVER@@':cover_html,
        '@@COVER_PRELOAD@@':f'<link rel="preload" as="image" href="../{a(cover["local_path"])}" {responsive(cover,"(max-width:700px) 100vw, 70vw").replace("srcset=","imagesrcset=").replace("sizes=","imagesizes=").replace("../../","../")}>',
        '@@SHOWROOM_LINKS@@':''.join(f'<a href="../cars/{sid}/">{a(CARDS[sid]["title"])} ↗</a>' for sid in ('ferrari26','bmw','porsche26')),
        '@@BRANDS@@':brand_links, '@@MODELS@@':''.join(models).replace('../../','../'), '@@DETAILS@@':details.replace('../../','../'),
        '@@FILTERS@@':archive_filters(photos), '@@GRID@@':''.join(blocks).replace('../../','../'),
    }
    html=(ROOT/'src/photography.html').read_text()
    for token,value in tokens.items(): html=html.replace(token,value)
    out=ROOT/'dist/photography';out.mkdir(parents=True,exist_ok=True);(out/'index.html').write_text(html)
    rows=''.join(f'<tr><td>{a(p["key"])}</td><td>{a(CARDS[p["car_id"]]["title"])}</td><td>{a(p.get("team", ""))} / {a(p.get("livery_year",""))}</td><td>{rights(p)}</td><td><a href="{a(p["source_url"])}">来源</a></td></tr>' for p in photos)
    (ROOT/'dist/photography-rights.html').write_text(f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>摄影授权清单 · GT3 ATLAS</title><style>body{{background:#111;color:#ddd;font:14px/1.7 sans-serif;padding:24px}}a{{color:#ffad91}}td,th{{padding:16px;border-bottom:1px solid #444}}table{{border-collapse:collapse;min-width:750px}}.scroll{{overflow:auto}}</style><h1>摄影来源与授权清单</h1><p>新增 Commons 摄影：作者、来源、许可证与修改说明逐张列明。原有 48 张来源引用图片并未因此取得再许可。CC BY-SA 衍生预览沿用各自原许可。图片所含商标、人物等其他权利并不由 CC 许可授予。</p><a href="photography/">返回摄影馆藏</a><div class="scroll"><table><thead><tr><th>PHOTO ID</th><th>车型</th><th>车队 / 年份</th><th>作者 / 许可 / 修改</th><th>出处</th></tr></thead><tbody>{rows}</tbody></table></div></html>')


def archive_filters(photos):
    legacy=photo_filters(photos,True)
    import re
    selects={}
    for key in ('car','type','team','season','livery'):
        match=re.search(r'<label>[^<]*<select data-photo-filter="'+key+r'".*?</select></label>',legacy)
        selects[key]=match.group() if match else ''
    brands=sorted({CARDS[p['car_id']]['brand_en'] for p in photos})
    brand='<label>品牌<select data-photo-filter="brand"><option value="">全部品牌 / ALL</option>'+''.join(f'<option value="{a(b)}">{a(b)}</option>' for b in brands)+'</select></label>'
    return '<div class="pf-filter-main">'+brand+selects['car']+selects['type']+'<label>搜索<input id="srPhotoSearch" type="search" placeholder="车型、品牌、照片 ID" autocomplete="off"></label><button type="button" id="srFiltersReset">重置 ↺</button></div><details class="pf-extra-filters"><summary>更多摄影资料筛选</summary><div class="sr-photo-filters">'+selects['team']+selects['season']+selects['livery']+'</div></details><p id="srFilterStatus" role="status">'+str(len(photos))+' 张摄影</p>'
