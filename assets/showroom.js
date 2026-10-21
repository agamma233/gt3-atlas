/* ==========================================================================
   GT3 ATLAS — DIGITAL SHOWROOM V1.1
   Vanilla JS gallery, lightbox, scroll navigation and compare handoff.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad2 = (value) => String(value).padStart(2, '0');
  const focusableSelector = [
    'a[href]', 'button:not([disabled])', 'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

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
  let pendingGallery = current;
  let lbIndex = 0;
  let lbOpener = null;
  let lbCloseTimer = 0;

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
    const next = new Image();
    next.decoding = 'async';
    next.onload = () => {
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
    pendingGallery = next;
    if (next === current && !options.force) {
      setGalleryMeta(next);
      return;
    }
    setGalleryImage(next, options);
  };

  galleryThumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => showGallery(index));
    thumb.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let target = index;
      if (event.key === 'ArrowLeft') target = (index - 1 + photos.length) % photos.length;
      if (event.key === 'ArrowRight') target = (index + 1) % photos.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = photos.length - 1;
      showGallery(target);
      galleryThumbs[target]?.focus();
    });
  });

  if (photos.length) setGalleryMeta(current);

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
    image.addEventListener('error', () => {
      image.style.opacity = '.18';
      image.closest('button, a')?.classList.add('is-media-failed');
    }, { once: true });
  });

  /* ------------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------------ */
  const lightbox = $('#srLightbox');
  const lbImage = $('#srLightboxImage');
  const lbLoading = $('#srLightboxLoading');
  const lbClose = $('#srLightboxClose');
  const lbPrev = $('#srLightboxPrev');
  const lbNext = $('#srLightboxNext');
  const lbAngle = $('#srLightboxAngle');
  const lbCredit = $('#srLightboxCredit');
  const lbCurrent = $('#srLightboxCurrent');
  const lbTotal = $('#srLightboxTotal');
  const lbOriginal = $('#srLightboxOriginal');
  const lbSource = $('#srLightboxSource');
  const lbStatus = $('#srLightboxStatus');
  const lbRegions = [$('#showroom-main'), $('.sr-topbar'), $('.sr-jump-wrap'), $('.sr-footer'), $('.sr-to-top')].filter(Boolean);

  const trapFocus = (event) => {
    if (event.key !== 'Tab' || !lightbox) return;
    const items = $$(focusableSelector, lightbox).filter((el) => el.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const updateLightbox = (index, { focus = false } = {}) => {
    if (!photos.length) return;
    lbIndex = (index + photos.length) % photos.length;
    const photo = photos[lbIndex];
    if (lbAngle) lbAngle.textContent = photo.angle;
    if (lbCredit) lbCredit.textContent = photo.credit;
    if (lbCurrent) lbCurrent.textContent = pad2(lbIndex + 1);
    if (lbTotal) lbTotal.textContent = pad2(photos.length);
    if (lbOriginal) lbOriginal.href = photo.original;
    if (lbSource) lbSource.href = photo.source;
    if (lbImage) {
      if (lbLoading) {
        lbLoading.textContent = 'DECODING FRAME';
        lbLoading.hidden = false;
      }
      const preload = new Image();
      preload.onload = () => {
        lbImage.src = photo.src;
        lbImage.alt = photo.alt;
        lbImage.width = photo.width;
        lbImage.height = photo.height;
        if (lbLoading) lbLoading.hidden = true;
      };
      preload.onerror = () => {
        lbImage.alt = photo.alt;
        if (lbLoading) {
          lbLoading.textContent = 'FRAME UNAVAILABLE / 照片加载失败';
          lbLoading.hidden = false;
        }
      };
      preload.src = photo.src;
    }
    if (focus && lbClose) lbClose.focus({ preventScroll: true });
  };

  const openLightbox = (index, opener = null) => {
    if (!lightbox || !photos.length) return;
    window.clearTimeout(lbCloseTimer);
    lbOpener = opener || doc.activeElement;
    lbRegions.forEach((region) => { region.inert = true; });
    doc.body.classList.add('is-lightbox-open');
    lightbox.hidden = false;
    updateLightbox(index);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lightbox.classList.add('is-open');
        lbClose?.focus({ preventScroll: true });
      });
    });
  };

  const closeLightbox = ({ restoreFocus = true } = {}) => {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove('is-open');
    doc.body.classList.remove('is-lightbox-open');
    lbRegions.forEach((region) => { region.inert = false; });
    if (lbStatus) lbStatus.textContent = '';
    window.clearTimeout(lbCloseTimer);
    lbCloseTimer = window.setTimeout(() => {
      lightbox.hidden = true;
      if (restoreFocus && lbOpener && typeof lbOpener.focus === 'function') {
        lbOpener.focus({ preventScroll: true });
      }
    }, reducedMotion.matches ? 0 : 300);
  };

  $$('[data-lightbox-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.photoIndex || current || 0);
      openLightbox(index, button);
    });
  });

  $$('.sr-ledger-image').forEach((button) => {
    button.addEventListener('click', () => openLightbox(Number(button.dataset.photoIndex || 0), button));
  });

  if (lbClose) lbClose.addEventListener('click', () => closeLightbox());
  if (lbPrev) lbPrev.addEventListener('click', () => updateLightbox(lbIndex - 1));
  if (lbNext) lbNext.addEventListener('click', () => updateLightbox(lbIndex + 1));
  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }

  doc.addEventListener('keydown', (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateLightbox(lbIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateLightbox(lbIndex + 1);
    }
    trapFocus(event);
  });

  /* Touch / pointer swipe in lightbox. */
  let swipeStart = null;
  const lbStage = $('#srLightboxStage');
  if (lbStage) {
    lbStage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      swipeStart = { x: event.clientX, y: event.clientY };
    });
    lbStage.addEventListener('pointerup', (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
      updateLightbox(lbIndex + (dx < 0 ? 1 : -1));
    });
    lbStage.addEventListener('pointercancel', () => { swipeStart = null; });
  }

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
