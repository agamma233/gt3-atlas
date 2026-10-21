/* ==========================================================================
   GT3 ATLAS — PHOTOGRAPHY ARCHIVE V1.2
   Vanilla JS gallery, lightbox, scroll navigation and compare handoff.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad2 = (value) => String(value).padStart(2, '0');
  const galleryThumbs = $$('.sr-gallery-thumb');
  const photos = galleryThumbs.map((thumb) => ({
    src: thumb.dataset.src || '',
    alt: thumb.dataset.alt || '',
    angle: thumb.dataset.angle || '',
    credit: thumb.dataset.credit || '',
    original: thumb.dataset.original || '',
    source: thumb.dataset.source || '',
    width: Number(thumb.dataset.width) || 1000,
    height: Number(thumb.dataset.height) || 666,
    rights: thumb.dataset.rights || ''
  }));

  let current = Math.max(0, galleryThumbs.findIndex((thumb) => thumb.classList.contains('is-active')));
  let galleryRequest = 0;

  const galleryImage = $('#srGalleryImage');
  const mediaLoading = $('#srMediaLoading');
  const mediaError = $('#srMediaError');
  const galleryCurrent = $('#srGalleryCurrent');
  const galleryTotal = $('#srGalleryTotal');
  const galleryAngle = $('#srGalleryAngle');
  const galleryCredit = $('#srGalleryCredit');
  const galleryOriginal = $('#srGalleryOriginal');
  const gallerySource = $('#srGallerySource');
  const galleryExpand = $('.sr-gallery-expand');
  const heroFrames = $$('.sr-hero-frame-btn');

  const setGalleryMeta = (index) => {
    const photo = photos[index];
    if (!photo) return;
    if (galleryCurrent) galleryCurrent.textContent = pad2(index + 1);
    if (galleryTotal) galleryTotal.textContent = pad2(photos.length);
    if (galleryAngle) galleryAngle.textContent = photo.angle;
    if (galleryCredit) galleryCredit.textContent = photo.credit;
    if (galleryOriginal) galleryOriginal.href = photo.original;
    if (gallerySource) gallerySource.href = photo.source;
    if (galleryExpand) galleryExpand.dataset.photoIndex = String(index);
    galleryThumbs.forEach((thumb, i) => {
      const active = i === index;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-selected', String(active));
      thumb.tabIndex = active ? 0 : -1;
    });
    heroFrames.forEach((button, i) => button.classList.toggle('is-active', i === index));
  };

  const setGalleryImage = (index, { announce = false } = {}) => {
    const photo = photos[index];
    if (!photo || !galleryImage) return;
    const request = ++galleryRequest;
    setGalleryMeta(index);
    const next = new Image();
    next.decoding = 'async';
    next.onload = () => {
      if (request !== galleryRequest) return;
      galleryImage.style.visibility = 'visible';
      galleryImage.src = photo.src;
      galleryImage.alt = photo.alt;
      galleryImage.width = photo.width;
      galleryImage.height = photo.height;
      galleryImage.classList.remove('is-changing');
      if (mediaLoading) mediaLoading.classList.remove('is-visible');
      if (mediaError) mediaError.hidden = true;
      current = index;
      setGalleryMeta(index);
      if (announce) {
        galleryImage.focus?.({ preventScroll: true });
      }
    };
    next.onerror = () => {
      if (request !== galleryRequest) return;
      current = index;
      galleryImage.alt = photo.alt;
      galleryImage.style.visibility = 'hidden';
      galleryImage.classList.remove('is-changing');
      if (mediaLoading) mediaLoading.classList.remove('is-visible');
      if (mediaError) mediaError.hidden = false;
      if (galleryAngle) galleryAngle.textContent = photo.angle;
      if (galleryCredit) galleryCredit.textContent = photo.credit;
    };
    if (mediaError) mediaError.hidden = true;
    if (mediaLoading) mediaLoading.classList.add('is-visible');
    galleryImage.classList.add('is-changing');
    next.src = photo.src;
  };

  const showGallery = (index, options = {}) => {
    if (!photos.length) return;
    const next = (index + photos.length) % photos.length;
    setGalleryImage(next, options);
  };

  galleryThumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => showGallery(index));
    thumb.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const visible = galleryThumbs.map((t, i) => t.hidden ? -1 : i).filter(i => i >= 0);
      const position = visible.indexOf(index);
      let target = index;
      if (event.key === 'ArrowLeft') target = visible[(position - 1 + visible.length) % visible.length];
      if (event.key === 'ArrowRight') target = visible[(position + 1) % visible.length];
      if (event.key === 'Home') target = visible[0];
      if (event.key === 'End') target = visible.at(-1);
      showGallery(target);
      galleryThumbs[target]?.focus();
    });
  });

  if (photos.length) setGalleryMeta(current);
  if (galleryImage) {
    const failed = () => { if (mediaError) mediaError.hidden = false; };
    galleryImage.addEventListener('error', failed);
    if (galleryImage.complete && !galleryImage.naturalWidth) failed();
  }

  heroFrames.forEach((button, index) => {
    button.addEventListener('click', () => {
      showGallery(index);
      const section = $('#photos');
      if (section) section.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ------------------------------------------------------------------------
     Hero image failure fallback
     ------------------------------------------------------------------------ */
  const heroImage = $('#srHeroImage');
  if (heroImage) {
    heroImage.addEventListener('error', () => {
      const media = heroImage.closest('.sr-hero-media');
      if (!media || media.querySelector('.sr-media-error')) return;
      const fallback = doc.createElement('div');
      fallback.className = 'sr-media-error';
      fallback.innerHTML = '<b>照片加载失败</b><span>请通过下方原图/图库出处链接查看。</span>';
      media.append(fallback);
    }, { once: true });
  }
  $$('.sr-gallery-thumb img, .sr-ledger-image img, .sr-related-media img, .sr-more-card img').forEach((image) => {
    const failed = () => {
      image.style.opacity = '.18';
      const parent = image.closest('button, a');
      parent?.classList.add('is-media-failed');
      parent?.setAttribute('aria-label', '照片加载失败 — ' + image.alt);
    };
    image.addEventListener('error', failed, { once: true });
    if (image.complete && !image.naturalWidth) failed();
  });

  // Load the single, locally pinned viewer only when requested.
  let viewerModule;
  let viewer;
  let opening = false;
  let collectionIndexes = photos.map((_, i) => i);
  const collectionButtons = $$('[data-collection]');
  collectionButtons.forEach(button => button.addEventListener('click', () => {
    collectionIndexes = button.dataset.collection === 'all'
      ? photos.map((_, i) => i) : button.dataset.collection.split(',').map(Number);
    galleryThumbs.forEach((thumb, i) => { thumb.hidden = !collectionIndexes.includes(i); });
    collectionButtons.forEach(item => {
      item.classList.toggle('is-active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    $('#srCollectionStatus').textContent = `${collectionIndexes.length} 张摄影 · ${$('b', button).textContent}`;
    showGallery(collectionIndexes[0], { force: true });
  }));

  const openLightbox = async (index, opener) => {
    if (opening || viewer) return;
    opening = true;
    const indexes = collectionIndexes.includes(index) ? collectionIndexes : photos.map((_, i) => i);
    try {
      viewerModule ||= import('./vendor/photoswipe/photoswipe.esm.js');
      const { default: PhotoSwipe } = await viewerModule;
      viewer = new PhotoSwipe({
        dataSource: indexes.map(i => ({ ...photos[i], w: photos[i].width, h: photos[i].height })),
        index: indexes.indexOf(index), bgOpacity: 1, loop: indexes.length > 1,
        preload: navigator.connection?.saveData ? [0, 0] : [0, 1],
        showHideAnimationType: reducedMotion.matches ? 'none' : 'fade',
        showAnimationDuration: 180, hideAnimationDuration: 180,
        maxZoomLevel: 4, secondaryZoomLevel: 2,
        paddingFn: () => ({ top: 60, bottom: innerWidth < 600 ? 155 : 100, left: 8, right: 8 }),
        closeTitle: '关闭 / ESC', zoomTitle: '放大 / 缩小',
        arrowPrevTitle: '上一张', arrowNextTitle: '下一张',
        errorMsg: '照片加载失败，请通过下方原图或图库出处查看。',
        returnFocus: false
      });
      const regions = [$('#showroom-main'), $('.sr-topbar'), $('.sr-jump-wrap'), $('.sr-footer'), $('.sr-to-top'), $('.sr-skip')].filter(Boolean);
      viewer.on('uiRegister', () => {
        viewer.ui.registerElement({
          name: 'archive-caption', order: 9, isButton: false, appendTo: 'root',
          onInit: element => {
            const title = doc.createElement('b');
            const credit = doc.createElement('span');
            const links = doc.createElement('div');
            const source = doc.createElement('a');
            const original = doc.createElement('a');
            source.textContent = '图库出处 ↗'; original.textContent = '原始照片 ↗';
            [source, original].forEach(link => { link.target = '_blank'; link.rel = 'noopener'; });
            links.append(original, source);
            element.append(title, credit, links);
            element.setAttribute('aria-live', 'polite');
            viewer.on('change', () => {
              const photo = viewer.currSlide.data;
              title.textContent = `${viewer.currIndex + 1} / ${indexes.length} — ${photo.angle}`;
              credit.textContent = `${photo.credit} · 来源引用，未确认再许可`;
              source.href = photo.source; original.href = photo.original;
            });
          }
        });
      });
      viewer.on('afterInit', () => {
        regions.forEach(region => { region.inert = true; });
        doc.body.classList.add('is-lightbox-open');
      });
      viewer.on('destroy', () => {
        regions.forEach(region => { region.inert = false; });
        doc.body.classList.remove('is-lightbox-open');
        viewer = null;
        opener?.focus({ preventScroll: true });
      });
      viewer.init();
    } catch (error) {
      viewer = null;
      // The actual image remains available even when the optional module fails.
      location.href = photos[index].src;
    } finally { opening = false; }
  };
  $$('[data-lightbox-open], .sr-ledger-image, .sr-story-image').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      openLightbox(Number(button.dataset.photoIndex || 0), button);
    });
  });

  /* ------------------------------------------------------------------------
     Compare handoff
     ------------------------------------------------------------------------ */
  const compareSelect = $('#srComparePartner');
  const compareGo = $('#srCompareGo');
  const syncCompare = () => {
    if (!compareSelect || !compareGo) return;
    const base = compareSelect.dataset.compareBase || '';
    const value = compareSelect.value;
    if (base && value) compareGo.href = base + encodeURIComponent(value);
  };
  if (compareSelect) {
    compareSelect.addEventListener('change', syncCompare);
    syncCompare();
  }

  /* ------------------------------------------------------------------------
     Scroll reveal / spy / utility
     ------------------------------------------------------------------------ */
  const revealNodes = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .04, rootMargin: '0px 0px -4% 0px' });
    revealNodes.forEach((node) => revealObserver.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-inview'));
  }

  const topbar = $('#srTopbar');
  const toTop = $('#srToTop');
  const sectionLinks = $$('[data-sr-jump]');
  const sections = sectionLinks.map((link) => ({ link, section: doc.getElementById(link.dataset.srJump) })).filter((item) => item.section);
  let ticking = false;

  const updateScrollUI = () => {
    const y = window.scrollY || doc.documentElement.scrollTop;
    topbar?.classList.toggle('is-scrolled', y > 18);
    toTop?.classList.toggle('is-visible', y > 650);
    if (sections.length) {
      const anchor = y + (parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--sr-topbar')) || 62) + 100;
      let active = sections[0];
      sections.forEach((item) => {
        if (item.section.offsetTop <= anchor) active = item;
      });
      sectionLinks.forEach((link) => {
        link.classList.toggle('is-active', link === active.link);
        if (link === active.link) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }
    ticking = false;
  };

  const requestScrollUI = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollUI);
  };

  window.addEventListener('scroll', requestScrollUI, { passive: true });
  window.addEventListener('resize', requestScrollUI, { passive: true });
  updateScrollUI();

  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
  }

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener('change', (event) => {
      if (event.matches) revealNodes.forEach((node) => node.classList.add('is-inview'));
    });
  }
})();
