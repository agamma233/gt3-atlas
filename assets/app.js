
/* ==========================================================================
   GT3 MOTORSPORT / DIGITAL GARAGE
   Vanilla JS. No third-party libraries.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const doc = document;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  let reduceMotion = reducedMotionQuery.matches;

  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const pad2 = (value) => String(value).padStart(2, '0');
  const normalize = (value) => String(value || '').toLowerCase().trim();

  const cards = $$('.vehicle');
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const hero = $('#top');
  const heroImageWrap = $('#heroImageWrap');
  const header = $('#siteHeader');
  const progressBar = $('#scrollProgress');
  const toTop = $('#toTop');
  const searchInput = $('#q');
  const brandSelect = $('#brand');
  const yearSelect = $('#year');
  const statusEl = $('#status');
  const visibleCountEl = $('#visibleCount');
  const noResultsEl = $('#noResults');
  const vehicleList = $('#vehicleList');
  const expandAllBtn = $('#expand');
  const expandAllLabel = expandAllBtn ? $('span', expandAllBtn) : null;
  const telemetry = $('#telemetry');
  const telemetryConsole = $('#telemetryConsole');
  const telemetrySelect = $('#teleSelect');
  const rail = $('#dbRail');
  const drawer = $('#indexDrawer');
  const drawerScrim = $('#drawerScrim');
  const openIndexBtn = $('#openIndex');
  const closeIndexBtn = $('#closeIndex');
  const lightbox = $('#lightbox');
  const lbImage = $('#lbImage');
  const lbLoading = $('#lbLoading');
  const lbPrev = $('#lbPrev');
  const lbNext = $('#lbNext');
  const closeLightboxBtn = $('#close');
  const lbOriginal = $('#lbOriginal');
  const lbSource = $('#lbSource');
  const lbDownload = $('#lbDownload');
  const compareDialog = $('#compareDialog');
  const openCompareBtn = $('#openCompare');
  const closeCompareBtn = $('#compareClose');
  const compareSelectA = $('#compareA');
  const compareSelectB = $('#compareB');
  const compareSwapBtn = $('#compareSwap');
  const compareCopyBtn = $('#compareCopy');
  const compareCopyStatus = $('#compareStatus');
  const seriesChips = $$('[data-series-filter]');

  const state = {
    activeCardId: null,
    activeSection: null,
    activeSeries: 'all',
    selectedTelemetryId: 'ferrari26',
    lbCard: null,
    lbIndex: 0,
    lbOpener: null,
    lbCloseTimer: 0,
    drawerCloseTimer: 0,
    drawerScrimTimer: 0,
    drawerOpener: null,
    lbRegions: [],
    bootDone: false,
    filterTimer: 0,
    composing: false,
    countTimer: 0,
    compareA: '',
    compareB: '',
    compareOpener: null,
    compareCloseTimer: 0,
    compareCopyTimer: 0,
    compareRegions: []
  };

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const getFocusable = (scope) => $$(focusableSelector, scope)
    .filter((el) => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true');

  const trapFocus = (event, scope) => {
    if (event.key !== 'Tab') return;
    const items = getFocusable(scope);
    if (!items.length) {
      event.preventDefault();
      return;
    }
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

  /* ------------------------------------------------------------------------
     Boot sequence — progress is driven by real load stages, never a fake number
     ------------------------------------------------------------------------ */
  const boot = $('#boot');
  const bootBar = $('#bootBar');
  const bootStatus = $('#bootStatus');
  const bootTrack = $('#bootTrack');

  const setBootStage = (progress, label) => {
    if (bootBar) bootBar.style.width = `${progress}%`;
    if (bootStatus) bootStatus.textContent = label;
    if (bootTrack) bootTrack.setAttribute('aria-valuenow', String(progress));
  };

  const finishBoot = () => {
    if (state.bootDone) return;
    state.bootDone = true;
    setBootStage(100, 'SYSTEM READY');
    root.classList.add('is-loaded');
    root.classList.remove('is-booting');
    doc.dispatchEvent(new CustomEvent('gt3:ready'));
    if (boot) {
      window.setTimeout(() => {
        boot.classList.add('is-done');
        boot.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => {
          boot.hidden = true;
        }, reduceMotion ? 30 : 1150);
      }, reduceMotion ? 20 : 320);
    }
  };

  const runBoot = async () => {
    if (boot) boot.hidden = true;
    finishBoot();
  };

  /* ------------------------------------------------------------------------
     Toast-free feedback: the result counter flashes on query updates
     ------------------------------------------------------------------------ */
  const flashCount = () => {
    if (!visibleCountEl) return;
    visibleCountEl.classList.add('is-changing');
    window.clearTimeout(state.countTimer);
    state.countTimer = window.setTimeout(() => visibleCountEl.classList.remove('is-changing'), 380);
  };

  /* ------------------------------------------------------------------------
     Photo angle selector
     ------------------------------------------------------------------------ */
  const ANGLE_LABELS = ['FRONT', 'SIDE', 'REAR'];

  const syncPhotoLinks = (card, index) => {
    const tabs = $$('.angle-tab', card);
    const images = $$('.angle-img', card);
    if (!tabs[index] || !images[index]) return;
    const tab = tabs[index];
    const image = images[index];

    card.dataset.activePhoto = String(index);
    const angleEl = $('.current-angle', card);
    const creditEl = $('.current-credit', card);
    const frameEl = $('.frame-count', card);
    const mediaOpen = $('.media-open', card);
    const original = $('.photo-original', card);
    const source = $('.photo-source', card);
    const download = $('.photo-download', card);
    const ambient = $('.media-ambient', card);

    if (angleEl) angleEl.textContent = tab.dataset.angle || '';
    if (creditEl) creditEl.textContent = tab.dataset.credit || '';
    if (frameEl) frameEl.textContent = `FRAME ${pad2(index + 1)} / ${pad2(tabs.length)}`;
    if (mediaOpen) mediaOpen.setAttribute('aria-label', `放大查看 ${card.dataset.title || ''} · ${tab.dataset.angle || ''}`);
    if (original) original.href = tab.dataset.original || '#';
    if (source) source.href = tab.dataset.source || '#';
    if (ambient) ambient.style.backgroundImage = `url("${image.currentSrc || image.src}")`;
    if (download) {
      download.href = image.currentSrc || image.src;
      download.download = tab.dataset.download || `${card.id}_${index + 1}.jpg`;
    }
  };

  const selectAngle = (card, index, { moveFocus = false, animate = true } = {}) => {
    const tabs = $$('.angle-tab', card);
    const images = $$('.angle-img', card);
    if (!tabs.length) return;
    const next = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const isActive = i === next;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
    images.forEach((image, i) => {
      const isActive = i === next;
      image.classList.toggle('is-active', isActive);
      image.setAttribute('aria-hidden', String(!isActive));
      if (isActive && animate && !reduceMotion) {
        image.animate(
          [{ opacity: 0.35, transform: 'scale(1.018)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 430, easing: 'cubic-bezier(.22,.61,.36,1)' }
        );
      }
    });
    syncPhotoLinks(card, next);
    if (moveFocus && tabs[next]) tabs[next].focus();
  };

  const initCards = () => {
    cards.forEach((card) => {
      const tabs = $$('.angle-tab', card);
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectAngle(card, index));
        tab.addEventListener('keydown', (event) => {
          const key = event.key;
          let target = null;
          if (key === 'ArrowRight' || key === 'ArrowDown') target = index + 1;
          else if (key === 'ArrowLeft' || key === 'ArrowUp') target = index - 1;
          else if (key === 'Home') target = 0;
          else if (key === 'End') target = tabs.length - 1;
          if (target === null) return;
          event.preventDefault();
          selectAngle(card, (target + tabs.length) % tabs.length, { moveFocus: true });
        });
      });
      selectAngle(card, 0, { animate: false });
    });

    const setSpec = (card, open, { focusToggle = false } = {}) => {
      const toggle = $('.spec-toggle', card);
      const panel = $('.spec-panel', card);
      const inner = $('.spec-inner', card);
      if (!toggle || !panel || !inner) return;
      card.classList.toggle('spec-open', open);
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      inner.inert = !open;
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (!open && panel.contains(doc.activeElement)) {
        toggle.focus({ preventScroll: true });
      }
      if (focusToggle) toggle.focus({ preventScroll: true });
    };
    state.setSpec = setSpec;

    vehicleList.addEventListener('click', (event) => {
      const toggle = event.target.closest('.spec-toggle');
      if (toggle) {
        const card = toggle.closest('.vehicle');
        setSpec(card, !card.classList.contains('spec-open'));
        return;
      }
      const close = event.target.closest('.spec-close');
      if (close) {
        const card = close.closest('.vehicle');
        setSpec(card, false);
        return;
      }
      const mediaOpen = event.target.closest('.media-open');
      if (mediaOpen) {
        const card = mediaOpen.closest('.vehicle');
        if (card) openLightbox(card, Number(card.dataset.activePhoto || 0), mediaOpen);
        return;
      }
      const telemetryButton = event.target.closest('.telemetry-load');
      if (telemetryButton) {
        const id = telemetryButton.dataset.carId;
        if (id) {
          applyTelemetry(id);
          if (telemetry) {
            telemetry.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          }
        }
      }
    });

    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        const shouldOpen = cards.some((card) => !card.classList.contains('spec-open'));
        cards.forEach((card) => setSpec(card, shouldOpen));
        expandAllBtn.classList.toggle('is-open', shouldOpen);
        expandAllBtn.setAttribute('aria-expanded', String(shouldOpen));
        if (expandAllLabel) expandAllLabel.textContent = shouldOpen ? '收起全部参数' : '展开全部参数';
      });
    }

    // Mouse-tracked border light. Transform-only / custom property updates.
    if (hoverQuery.matches) {
      let pending = null;
      let frame = 0;
      vehicleList.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const card = event.target.closest('.vehicle');
        if (!card) return;
        pending = { card, x: event.clientX, y: event.clientY };
        if (frame) return;
        frame = requestAnimationFrame(() => {
          if (pending) {
            const rect = pending.card.getBoundingClientRect();
            pending.card.style.setProperty('--mx', `${pending.x - rect.left}px`);
            pending.card.style.setProperty('--my', `${pending.y - rect.top}px`);
          }
          frame = 0;
        });
      });
    }
  };

  /* ------------------------------------------------------------------------
     Query / filtering
     ------------------------------------------------------------------------ */
  const getMatches = () => {
    const query = normalize(searchInput ? searchInput.value : '');
    const brand = brandSelect ? brandSelect.value : '';
    const year = yearSelect ? yearSelect.value : '';
    return cards.filter((card) => {
      const search = normalize(card.dataset.search);
      return (!query || search.includes(query))
        && (!brand || card.dataset.brand === brand)
        && (!year || card.dataset.year === year)
        && (state.activeSeries === 'all' || card.dataset.series === state.activeSeries);
    });
  };

  const setSeriesFilter = (series) => {
    state.activeSeries = series || 'all';
    seriesChips.forEach((chip) => {
      const isActive = chip.dataset.seriesFilter === state.activeSeries;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
  };

  const updateFilterUI = (matches) => {
    const visible = new Set(matches.map((card) => card.id));
    cards.forEach((card) => {
      card.hidden = !visible.has(card.id);
    });
    const n = matches.length;

    if (visibleCountEl) visibleCountEl.textContent = String(n);
    if (statusEl) {
      const suffix = state.activeSeries !== 'all' ? ` · ${state.activeSeries}` : '';
      statusEl.innerHTML = `显示 <b>${n}</b> / ${cards.length} 款车型 · ${n * 3} 张照片${suffix}`;
    }
    if (noResultsEl) noResultsEl.hidden = n !== 0;

    const railCount = $('#railVisibleCount');
    if (railCount) railCount.textContent = String(n);

    $$('[data-rail-target]').forEach((link) => {
      link.classList.toggle('is-filtered', !visible.has(link.dataset.railTarget));
    });
    $$('[data-drawer-target]').forEach((link) => {
      link.hidden = !visible.has(link.dataset.drawerTarget);
    });

    if (state.activeCardId && !visible.has(state.activeCardId)) {
      state.activeCardId = null;
      $$('[data-rail-target].is-active').forEach((link) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
      $$('[data-drawer-target].is-active').forEach((link) => link.classList.remove('is-active'));
    }
    flashCount();
    updateScrollUI();
  };

  const applyFilters = () => {
    const matches = getMatches();
    const finish = () => updateFilterUI(matches);

    // View Transitions provide a clean enter/exit + layout morph where supported.
    if (doc.startViewTransition && !reduceMotion) {
      try {
        const transition = doc.startViewTransition(finish);
        if (transition && transition.ready) transition.ready.catch(() => {});
        if (transition && transition.finished) transition.finished.catch(() => {});
        return;
      } catch (_) { /* fall back below */ }
    }

    const before = new Set(cards.filter((card) => !card.hidden).map((card) => card.id));
    finish();
    if (!reduceMotion) {
      matches.forEach((card) => {
        if (!before.has(card.id)) {
          card.classList.remove('is-filtering-in');
          // Force animation restart only for newly revealed cards.
          void card.offsetWidth;
          card.classList.add('is-filtering-in');
          window.setTimeout(() => card.classList.remove('is-filtering-in'), 650);
        }
      });
    }
  };

  const scheduleFilter = () => {
    window.clearTimeout(state.filterTimer);
    state.filterTimer = window.setTimeout(applyFilters, 120);
  };

  const resetFilters = ({ focusSearch = false } = {}) => {
    if (searchInput) searchInput.value = '';
    if (brandSelect) brandSelect.value = '';
    if (yearSelect) yearSelect.value = '';
    setSeriesFilter('all');
    applyFilters();
    if (focusSearch && searchInput) searchInput.focus({ preventScroll: true });
  };

  const scrollToSearch = () => {
    closeIndexDrawer({ restoreFocus: false });
    const garage = $('#garage');
    if (garage) garage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => {
      if (searchInput) searchInput.focus({ preventScroll: true });
    }, reduceMotion ? 20 : 520);
  };

  const initFilters = () => {
    if (searchInput) {
      searchInput.addEventListener('compositionstart', () => { state.composing = true; });
      searchInput.addEventListener('compositionend', () => {
        state.composing = false;
        scheduleFilter();
      });
      searchInput.addEventListener('input', () => {
        if (!state.composing) scheduleFilter();
      });
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && searchInput.value) {
          event.preventDefault();
          searchInput.value = '';
          applyFilters();
        }
      });
    }
    if (brandSelect) brandSelect.addEventListener('change', applyFilters);
    if (yearSelect) yearSelect.addEventListener('change', applyFilters);
    seriesChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        setSeriesFilter(chip.dataset.seriesFilter || 'all');
        applyFilters();
      });
    });

    const reset = $('#resetFilters');
    if (reset) reset.addEventListener('click', () => resetFilters());
    const noResultsReset = $('#noResultsReset');
    if (noResultsReset) noResultsReset.addEventListener('click', () => resetFilters({ focusSearch: true }));

    const headerSearch = $('#headerSearch');
    if (headerSearch) headerSearch.addEventListener('click', scrollToSearch);

    doc.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      if (isTyping) return;
      if (lightbox && !lightbox.hidden) return;
      if (compareDialog && !compareDialog.hidden) return;
      if (drawer && drawer.classList.contains('is-open')) return;
      if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        scrollToSearch();
      }
    });

    // Initial count. No filtering on first paint.
    setSeriesFilter('all');
    const initialMatches = getMatches();
    const n = initialMatches.length;
    if (statusEl) statusEl.innerHTML = `显示 <b>${n}</b> / ${cards.length} 款车型 · ${n * 3} 张照片`;
  };

  /* ------------------------------------------------------------------------
     Telemetry console
     ------------------------------------------------------------------------ */
  const readCardData = (card) => {
    const specs = $$('.spec-row', card).map((row) => ({
      label: ($('dt', row) || {}).textContent || '',
      value: ($('dd', row) || {}).textContent || ''
    }));
    const sources = $$('.spec-sources a', card).map((link) => ({
      text: link.textContent.trim(),
      href: link.getAttribute('href')
    }));
    const hud = $$('.hud-cell b', card).map((node) => node.textContent.trim());
    const h2 = $('h2', card);
    const team = $('.v-team', card);
    const result = $('.v-result p', card);
    const resultScope = $('.v-result small', card);
    const number = $('.v-number', card);
    return {
      id: card.id,
      index: card.dataset.index || '00',
      title: h2 ? h2.textContent.trim() : '',
      brand: card.dataset.brand || '',
      series: card.dataset.series || '',
      team: team ? team.textContent.trim() : '',
      year: card.dataset.year || '',
      number: number ? number.textContent.trim() : '',
      hud,
      specs,
      sources,
      result: result ? result.textContent.trim() : '',
      resultScope: resultScope ? resultScope.textContent.trim() : '',
      displacementText: card.dataset.displacementText || '',
      displacementCc: card.dataset.displacementCc ? Number(card.dataset.displacementCc) : null,
      weightText: card.dataset.weightText || '',
      weightKg: card.dataset.weightKg ? Number(card.dataset.weightKg) : null
    };
  };

  const allCardData = cards.map(readCardData);
  const dataById = new Map(allCardData.map((item) => [item.id, item]));
  const displacementValues = allCardData.map((d) => d.displacementCc).filter((v) => Number.isFinite(v) && v > 0);
  const weightValues = allCardData.map((d) => d.weightKg).filter((v) => Number.isFinite(v) && v > 0);
  const dispMin = displacementValues.length ? Math.min(...displacementValues) : 0;
  const dispMax = displacementValues.length ? Math.max(...displacementValues) : 0;
  const weightMin = weightValues.length ? Math.min(...weightValues) : 0;
  const weightMax = weightValues.length ? Math.max(...weightValues) : 0;

  const fillPercent = (value, min, max) => {
    if (!Number.isFinite(value) || max <= min) return 0;
    return clamp(((value - min) / (max - min)) * 100, 0, 100);
  };

  const setBar = (bar, value, min, max) => {
    if (!bar) return;
    bar.style.setProperty('--fill', `${fillPercent(value, min, max).toFixed(2)}%`);
  };

  const applyTelemetry = (cardId, { initial = false } = {}) => {
    const item = dataById.get(cardId);
    if (!item) return;
    state.selectedTelemetryId = cardId;

    cards.forEach((card) => card.classList.toggle('is-telemetry', card.id === cardId));
    if (telemetrySelect) telemetrySelect.value = cardId;

    const teleIndex = $('#teleIndex');
    const teleName = $('#teleName');
    const teleTeam = $('#teleTeam');
    const teleNumber = $('#teleNumber');
    const teleYear = $('#teleYear');
    const teleEngine = $('#teleEngine');
    const telePower = $('#telePower');
    const teleLayout = $('#teleLayout');
    const teleDisplacement = $('#teleDisplacement');
    const teleWeight = $('#teleWeight');
    const teleDispScale = $('#teleDispScale');
    const teleWeightScale = $('#teleWeightScale');
    const teleSpecs = $('#teleSpecs');
    const teleSpecCount = $('#teleSpecCount');
    const teleSources = $('#teleSources');
    const teleSourceCount = $('#teleSourceCount');
    const teleResult = $('#teleResult');
    const teleResultScope = $('#teleResultScope');
    const teleDispBar = $('#teleDispBar');
    const teleWeightBar = $('#teleWeightBar');

    if (teleIndex) teleIndex.textContent = item.index;
    if (teleName) teleName.textContent = item.title;
    if (teleTeam) teleTeam.textContent = `${item.brand} · ${item.team}`;
    if (teleNumber) teleNumber.textContent = item.number;
    if (teleYear) teleYear.textContent = item.year;
    if (teleEngine) teleEngine.textContent = item.hud[0] || 'DATA NOT PUBLISHED';
    if (telePower) telePower.textContent = item.hud[1] || 'DATA NOT PUBLISHED';
    if (teleLayout) teleLayout.textContent = item.hud[2] || 'DATA NOT PUBLISHED';
    if (teleDisplacement) teleDisplacement.textContent = item.displacementText || 'DATA NOT PUBLISHED';
    if (teleWeight) teleWeight.textContent = item.weightText || 'DATA NOT PUBLISHED';
    if (teleDispScale) teleDispScale.textContent = `${dispMin} — ${dispMax} cc`;
    if (teleWeightScale) teleWeightScale.textContent = `${weightMin} — ${weightMax} kg`;
    setBar(teleDispBar, item.displacementCc, dispMin, dispMax);
    setBar(teleWeightBar, item.weightKg, weightMin, weightMax);

    if (teleSpecs) {
      const fragment = doc.createDocumentFragment();
      item.specs.forEach((spec, index) => {
        const row = doc.createElement('div');
        row.className = 'tele-spec-row';
        const idx = doc.createElement('span');
        idx.className = 'idx';
        idx.setAttribute('aria-hidden', 'true');
        idx.textContent = pad2(index + 1);
        const dt = doc.createElement('dt');
        dt.textContent = spec.label;
        const dd = doc.createElement('dd');
        dd.textContent = spec.value;
        row.append(idx, dt, dd);
        fragment.append(row);
      });
      teleSpecs.replaceChildren(fragment);
    }
    if (teleSpecCount) teleSpecCount.textContent = `${item.specs.length} FIELDS`;

    if (teleSources) {
      const fragment = doc.createDocumentFragment();
      item.sources.forEach((source, index) => {
        const link = doc.createElement('a');
        link.href = source.href;
        link.target = '_blank';
        link.rel = 'noopener';
        const number = doc.createElement('span');
        number.textContent = pad2(index + 1);
        link.append(number, doc.createTextNode(source.text));
        fragment.append(link);
      });
      teleSources.replaceChildren(fragment);
    }
    if (teleSourceCount) teleSourceCount.textContent = `· ${item.sources.length}`;
    if (teleResult) teleResult.textContent = item.result;
    if (teleResultScope) teleResultScope.textContent = item.resultScope;

    if (!initial && telemetryConsole && !reduceMotion) {
      telemetryConsole.classList.remove('is-switching');
      void telemetryConsole.offsetWidth;
      telemetryConsole.classList.add('is-switching');
      window.setTimeout(() => telemetryConsole.classList.remove('is-switching'), 520);
    }
  };

  const initTelemetry = () => {
    if (!telemetrySelect) return;
    const initialId = telemetrySelect.value || state.selectedTelemetryId;
    applyTelemetry(initialId, { initial: true });

    telemetrySelect.addEventListener('change', () => {
      applyTelemetry(telemetrySelect.value);
    });

    const teleToCard = $('#teleToCard');
    if (teleToCard) {
      teleToCard.addEventListener('click', () => {
        const card = cardById.get(state.selectedTelemetryId);
        if (!card) return;
        if (card.hidden) resetFilters();
        state.setSpec(card, true);
        window.setTimeout(() => {
          card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          const title = $('h2', card);
          if (title) {
            title.setAttribute('tabindex', '-1');
            title.focus({ preventScroll: true });
            title.addEventListener('blur', () => title.removeAttribute('tabindex'), { once: true });
          }
        }, card.hidden ? 280 : 30);
      });
    }
  };

  /* ------------------------------------------------------------------------
     Head-to-head compare
     ------------------------------------------------------------------------ */
  const compareFieldIds = ['compareIndex', 'compareNumber', 'compareName', 'compareSub', 'compareSeries', 'compareYear', 'compareImage'];
  const compareMetricIds = [
    ['compareEngineA', 'compareEngineB'],
    ['comparePowerA', 'comparePowerB'],
    ['compareLayoutA', 'compareLayoutB']
  ];

  const getCompareQuery = () => {
    try {
      const raw = new URLSearchParams(window.location.search).get('compare') || '';
      const [a, b] = raw.split(',').map((part) => part.trim());
      if (a && b && a !== b && cardById.has(a) && cardById.has(b)) return [a, b];
    } catch (_) { /* ignore malformed URLs */ }
    return null;
  };

  const syncCompareUrl = (a, b) => {
    if (location.protocol === 'file:') return;
    try {
      const url = new URL(location.href);
      if (a && b && a !== b) url.searchParams.set('compare', `${a},${b}`);
      else url.searchParams.delete('compare');
      history.replaceState(history.state, '', url.href);
    } catch (_) { /* URL state is a convenience, never a blocker */ }
  };

  const setCompareCopyStatus = (message = '') => {
    if (!compareCopyStatus) return;
    compareCopyStatus.textContent = message;
    window.clearTimeout(state.compareCopyTimer);
    if (message) {
      state.compareCopyTimer = window.setTimeout(() => {
        if (compareCopyStatus) compareCopyStatus.textContent = '';
      }, 2300);
    }
  };

  const fillCompareSources = (container, sources) => {
    if (!container) return;
    container.replaceChildren();
    sources.forEach((source) => {
      const link = doc.createElement('a');
      link.href = source.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.text;
      container.append(link);
    });
  };

  const renderComparison = ({ syncUrl = true } = {}) => {
    if (!compareDialog) return;
    const aId = compareSelectA ? compareSelectA.value : '';
    const bId = compareSelectB ? compareSelectB.value : '';
    state.compareA = aId;
    state.compareB = bId;
    const a = dataById.get(aId);
    const b = dataById.get(bId);
    const compareData = $('#compareData');
    const compareEmpty = $('#compareEmpty');
    const valid = Boolean(a && b && aId !== bId);

    if (!valid) {
      if (compareData) compareData.hidden = true;
      if (compareEmpty) compareEmpty.hidden = false;
      if (compareCopyBtn) compareCopyBtn.disabled = true;
      if (syncUrl) syncCompareUrl(null, null);
      return;
    }

    if (compareData) compareData.hidden = false;
    if (compareEmpty) compareEmpty.hidden = true;
    if (compareCopyBtn) compareCopyBtn.disabled = false;

    const setText = (id, value) => {
      const node = $('#' + id);
      if (node) node.textContent = value;
    };
    setText('compareIndexA', `CHASSIS / ${a.index}`);
    setText('compareIndexB', `CHASSIS / ${b.index}`);
    setText('compareNumberA', `# ${a.number}`);
    setText('compareNumberB', `# ${b.number}`);
    setText('compareNameA', `${a.brand} ${a.title}`);
    setText('compareNameB', `${b.brand} ${b.title}`);
    setText('compareSubA', a.team);
    setText('compareSubB', b.team);
    setText('compareSeriesA', a.series);
    setText('compareSeriesB', b.series);
    setText('compareYearA', `${a.year} LIVERY`);
    setText('compareYearB', `${b.year} LIVERY`);
    setText('compareColA', a.brand.toUpperCase() + ' / ' + a.title);
    setText('compareColB', b.brand.toUpperCase() + ' / ' + b.title);
    setText('compareEngineA', a.hud[0] || '未列明 / NOT PUBLISHED');
    setText('compareEngineB', b.hud[0] || '未列明 / NOT PUBLISHED');
    setText('comparePowerA', a.hud[1] || '未列明 / NOT PUBLISHED');
    setText('comparePowerB', b.hud[1] || '未列明 / NOT PUBLISHED');
    setText('compareLayoutA', a.hud[2] || '未列明 / NOT PUBLISHED');
    setText('compareLayoutB', b.hud[2] || '未列明 / NOT PUBLISHED');

    const cardA = cardById.get(aId);
    const cardB = cardById.get(bId);
    const imageA = cardA ? cardA.querySelector('.angle-img[data-photo-index="1"]') || cardA.querySelector('.angle-img') : null;
    const imageB = cardB ? cardB.querySelector('.angle-img[data-photo-index="1"]') || cardB.querySelector('.angle-img') : null;
    const compareImageA = $('#compareImageA');
    const compareImageB = $('#compareImageB');
    if (compareImageA && imageA) {
      compareImageA.src = imageA.src;
      compareImageA.alt = imageA.alt;
    }
    if (compareImageB && imageB) {
      compareImageB.src = imageB.src;
      compareImageB.alt = imageB.alt;
    }

    const fieldMap = new Map();
    a.specs.forEach((spec) => fieldMap.set(spec.label, { a: spec.value, b: '' }));
    b.specs.forEach((spec) => {
      if (!fieldMap.has(spec.label)) fieldMap.set(spec.label, { a: '', b: spec.value });
      else fieldMap.get(spec.label).b = spec.value;
    });

    const tbody = $('#compareTableBody');
    if (tbody) {
      const fragment = doc.createDocumentFragment();
      let i = 0;
      fieldMap.forEach((values, label) => {
        i += 1;
        const row = doc.createElement('tr');
        const heading = doc.createElement('th');
        heading.scope = 'row';
        heading.textContent = label;
        const cellA = doc.createElement('td');
        const cellB = doc.createElement('td');
        if (!values.a) {
          const missing = doc.createElement('span');
          missing.className = 'is-missing';
          missing.textContent = '未列明 / NOT PUBLISHED';
          cellA.append(missing);
        } else {
          cellA.textContent = values.a;
        }
        if (!values.b) {
          const missing = doc.createElement('span');
          missing.className = 'is-missing';
          missing.textContent = '未列明 / NOT PUBLISHED';
          cellB.append(missing);
        } else {
          cellB.textContent = values.b;
        }
        row.append(heading, cellA, cellB);
        fragment.append(row);
      });
      tbody.replaceChildren(fragment);
      setText('compareFieldCount', `${i} FIELDS`);
    }

    fillCompareSources($('#compareSourcesA'), a.sources);
    fillCompareSources($('#compareSourcesB'), b.sources);
    if (syncUrl) syncCompareUrl(aId, bId);
  };

  const closeCompare = ({ restoreFocus = true } = {}) => {
    if (!compareDialog || compareDialog.hidden) return;
    compareDialog.classList.remove('is-open');
    document.body.classList.remove('compare-open');
    (state.compareRegions || []).forEach((region) => { region.inert = false; });
    state.compareRegions = [];
    syncCompareUrl(null, null);
    setCompareCopyStatus('');
    window.clearTimeout(state.compareCloseTimer);
    state.compareCloseTimer = window.setTimeout(() => {
      compareDialog.hidden = true;
      if (restoreFocus && state.compareOpener && typeof state.compareOpener.focus === 'function') {
        state.compareOpener.focus({ preventScroll: true });
      }
    }, reduceMotion ? 0 : 320);
  };

  const openCompare = ({ a = null, b = null, opener = null } = {}) => {
    if (!compareDialog) return;
    closeIndexDrawer({ restoreFocus: false });
    window.clearTimeout(state.compareCloseTimer);

    let nextA = a || state.compareA;
    let nextB = b || state.compareB;
    if (a) {
      nextA = a;
      if (!nextB || nextB === nextA) nextB = nextA === 'ferrari26' ? 'bmw' : 'ferrari26';
    } else if (!a && !b && (!nextA || !nextB)) {
      nextA = 'bmw';
      nextB = 'ferrari26';
    }
    if (nextA === nextB) nextB = nextA === 'ferrari26' ? 'bmw' : 'ferrari26';
    if (!cardById.has(nextA)) nextA = 'bmw';
    if (!cardById.has(nextB) || nextB === nextA) nextB = nextA === 'ferrari26' ? 'bmw' : 'ferrari26';

    state.compareA = nextA;
    state.compareB = nextB;
    if (compareSelectA) compareSelectA.value = nextA;
    if (compareSelectB) compareSelectB.value = nextB;
    state.compareOpener = opener || doc.activeElement;
    state.compareRegions = [$('#main'), header, toTop].filter(Boolean);
    state.compareRegions.forEach((region) => { region.inert = true; });
    document.body.classList.add('compare-open');
    compareDialog.hidden = false;
    setCompareCopyStatus('');
    renderComparison({ syncUrl: true });
    const scroll = $('#compareScroll');
    if (scroll) scroll.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        compareDialog.classList.add('is-open');
        if (closeCompareBtn) closeCompareBtn.focus({ preventScroll: true });
      });
    });
  };

  const copyCompareLink = async () => {
    renderComparison({ syncUrl: true });
    const a = compareSelectA ? compareSelectA.value : '';
    const b = compareSelectB ? compareSelectB.value : '';
    if (!a || !b) return;
    const url = new URL(location.href);
    if (location.protocol !== 'file:') {
      url.searchParams.set('compare', `${a},${b}`);
    }
    const text = url.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = doc.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        doc.body.append(textarea);
        textarea.select();
        doc.execCommand('copy');
        textarea.remove();
      }
      setCompareCopyStatus('LINK COPIED / 已复制');
    } catch (_) {
      setCompareCopyStatus('COPY FAILED / 请复制地址栏');
    }
  };

  const initCompare = () => {
    if (!compareDialog) return;

    if (openCompareBtn) openCompareBtn.addEventListener('click', () => openCompare());
    $$('.compare-pick').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.compareId;
        openCompare({ a: id, opener: button });
      });
    });
    if (closeCompareBtn) closeCompareBtn.addEventListener('click', () => closeCompare());
    if (compareSwapBtn) {
      compareSwapBtn.addEventListener('click', () => {
        if (!compareSelectA || !compareSelectB) return;
        const a = compareSelectA.value;
        compareSelectA.value = compareSelectB.value;
        compareSelectB.value = a;
        renderComparison();
        compareSelectA.focus({ preventScroll: true });
      });
    }
    if (compareSelectA) {
      compareSelectA.addEventListener('change', () => {
        if (compareSelectB && compareSelectA.value === compareSelectB.value) {
          compareSelectB.value = state.compareA !== compareSelectA.value ? state.compareA : '';
        }
        renderComparison();
      });
    }
    if (compareSelectB) {
      compareSelectB.addEventListener('change', () => {
        if (compareSelectA && compareSelectB.value === compareSelectA.value) {
          compareSelectA.value = state.compareB !== compareSelectB.value ? state.compareB : '';
        }
        renderComparison();
      });
    }
    if (compareCopyBtn) compareCopyBtn.addEventListener('click', copyCompareLink);
    compareDialog.addEventListener('click', (event) => {
      if (event.target === compareDialog) closeCompare();
    });

    doc.addEventListener('keydown', (event) => {
      if (!compareDialog || compareDialog.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCompare();
        return;
      }
      trapFocus(event, compareDialog);
    });

    const requested = getCompareQuery();
    if (requested) {
      const launch = () => openCompare({ a: requested[0], b: requested[1] });
      if (state.bootDone) {
        window.setTimeout(launch, reduceMotion ? 20 : 200);
      } else {
        doc.addEventListener('gt3:ready', launch, { once: true });
      }
    }
  };

  /* ------------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------------ */
  const updateLightbox = (index) => {
    if (!state.lbCard) return;
    const card = state.lbCard;
    const tabs = $$('.angle-tab', card);
    const images = $$('.angle-img', card);
    if (!tabs.length) return;
    const total = tabs.length;
    state.lbIndex = (index + total) % total;
    const tab = tabs[state.lbIndex];
    const image = images[state.lbIndex];

    const lbCarTitle = $('#lbCarTitle');
    const lbTitle = $('#lightboxTitle');
    const lbAngle = $('#lbAngle');
    const lbCredit = $('#lbCredit');
    const lbCurrent = $('#lbCurrent');
    const lbTotal = $('#lbTotal');

    if (lbCarTitle) lbCarTitle.textContent = (($('h2', card) || {}).textContent || '').trim();
    const lbDescription = $('#lightboxDesc');
    if (lbDescription) lbDescription.textContent = `${card.dataset.brand || ''} · 三角度实拍 / IMAGE VIEWER`;
    if (lbTitle) lbTitle.textContent = `FRAME ${pad2(state.lbIndex + 1)} / ${pad2(total)}`;
    if (lbAngle) lbAngle.textContent = `${ANGLE_LABELS[state.lbIndex] || 'PHOTO'} / ${tab.dataset.angle || ''}`;
    if (lbCredit) lbCredit.textContent = tab.dataset.credit || '';
    if (lbCurrent) lbCurrent.textContent = pad2(state.lbIndex + 1);
    if (lbTotal) lbTotal.textContent = pad2(total);
    if (lbOriginal) lbOriginal.href = tab.dataset.original || '#';
    if (lbSource) lbSource.href = tab.dataset.source || '#';
    if (lbDownload) {
      lbDownload.href = image.currentSrc || image.src;
      lbDownload.download = tab.dataset.download || `${card.id}_${state.lbIndex + 1}.jpg`;
    }

    if (lbImage) {
      lbImage.classList.remove('is-loaded');
      if (lbLoading) {
        lbLoading.textContent = 'DECODING FRAME';
        lbLoading.classList.remove('is-hidden');
      }
      lbImage.alt = tab.dataset.alt || '';
      const showLoaded = () => {
        lbImage.classList.add('is-loaded');
        if (lbLoading) lbLoading.classList.add('is-hidden');
      };
      lbImage.onload = showLoaded;
      lbImage.onerror = showLoaded;
      lbImage.src = image.src;
      if (lbImage.complete && lbImage.naturalWidth) {
        requestAnimationFrame(showLoaded);
      }
    }
  };

  const openLightbox = (card, index, opener) => {
    if (!lightbox) return;
    closeIndexDrawer({ restoreFocus: false });
    window.clearTimeout(state.lbCloseTimer);
    state.lbCard = card;
    state.lbOpener = opener || doc.activeElement;
    state.lbRegions = [$('#main'), header].filter(Boolean);
    state.lbRegions.forEach((region) => { region.inert = true; });
    document.body.classList.add('lightbox-open');
    lightbox.hidden = false;
    updateLightbox(index);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lightbox.classList.add('is-open');
        if (closeLightboxBtn) closeLightboxBtn.focus({ preventScroll: true });
      });
    });
  };

  const closeLightbox = ({ restoreFocus = true } = {}) => {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    (state.lbRegions || []).forEach((region) => { region.inert = false; });
    state.lbRegions = [];
    window.clearTimeout(state.lbCloseTimer);
    const wait = reduceMotion ? 0 : 320;
    state.lbCloseTimer = window.setTimeout(() => {
      lightbox.hidden = true;
      if (restoreFocus && state.lbOpener && typeof state.lbOpener.focus === 'function') {
        state.lbOpener.focus({ preventScroll: true });
      }
    }, wait);
  };

  const initLightbox = () => {
    if (!lightbox) return;
    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', () => closeLightbox());
    if (lbPrev) lbPrev.addEventListener('click', () => updateLightbox(state.lbIndex - 1));
    if (lbNext) lbNext.addEventListener('click', () => updateLightbox(state.lbIndex + 1));
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    doc.addEventListener('keydown', (event) => {
      if (lightbox.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        updateLightbox(state.lbIndex - 1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        updateLightbox(state.lbIndex + 1);
        return;
      }
      trapFocus(event, lightbox);
    });

    // Touch / pointer swiping. It never interferes with controls.
    const stage = $('#lbStage');
    if (stage) {
      let startX = null;
      let startY = null;
      stage.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button,a')) return;
        startX = event.clientX;
        startY = event.clientY;
      });
      stage.addEventListener('pointerup', (event) => {
        if (startX === null) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        startX = null;
        startY = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          updateLightbox(state.lbIndex + (dx < 0 ? 1 : -1));
        }
      });
      stage.addEventListener('pointercancel', () => {
        startX = null;
        startY = null;
      });
    }
  };

  /* ------------------------------------------------------------------------
     Mobile index drawer
     ------------------------------------------------------------------------ */
  const closeIndexDrawer = ({ restoreFocus = true } = {}) => {
    if (!drawer || !drawer.classList.contains('is-open')) {
      if (drawerScrim && drawerScrim.classList.contains('is-open')) {
        drawerScrim.classList.remove('is-open');
        drawerScrim.hidden = true;
      }
      if (openIndexBtn) openIndexBtn.setAttribute('aria-expanded', 'false');
      return;
    }
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    if (openIndexBtn) openIndexBtn.setAttribute('aria-expanded', 'false');
    if (drawerScrim) {
      drawerScrim.classList.remove('is-open');
      window.clearTimeout(state.drawerScrimTimer);
      state.drawerScrimTimer = window.setTimeout(() => {
        if (!drawer.classList.contains('is-open')) drawerScrim.hidden = true;
      }, reduceMotion ? 0 : 320);
    }
    window.clearTimeout(state.drawerCloseTimer);
    state.drawerCloseTimer = window.setTimeout(() => {
      if (restoreFocus && state.drawerOpener && typeof state.drawerOpener.focus === 'function') {
        state.drawerOpener.focus({ preventScroll: true });
      }
    }, reduceMotion ? 0 : 120);
  };

  const openIndexDrawer = () => {
    if (!drawer) return;
    state.drawerOpener = doc.activeElement;
    window.clearTimeout(state.drawerCloseTimer);
    window.clearTimeout(state.drawerScrimTimer);
    document.body.classList.add('drawer-open');
    if (drawerScrim) {
      drawerScrim.hidden = false;
      requestAnimationFrame(() => drawerScrim.classList.add('is-open'));
    }
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (openIndexBtn) openIndexBtn.setAttribute('aria-expanded', 'true');
    window.clearTimeout(state.drawerCloseTimer);
    window.setTimeout(() => {
      if (closeIndexBtn) closeIndexBtn.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 60);
  };

  const initDrawer = () => {
    if (openIndexBtn) {
      openIndexBtn.addEventListener('click', () => {
        if (drawer && drawer.classList.contains('is-open')) closeIndexDrawer();
        else openIndexDrawer();
      });
    }
    if (closeIndexBtn) closeIndexBtn.addEventListener('click', () => closeIndexDrawer());
    if (drawerScrim) drawerScrim.addEventListener('click', () => closeIndexDrawer());
    if (drawer) {
      drawer.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (link) closeIndexDrawer({ restoreFocus: false });
      });
      doc.addEventListener('keydown', (event) => {
        if (!drawer.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          closeIndexDrawer();
          return;
        }
        trapFocus(event, drawer);
      });
    }
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1180 && drawer && drawer.classList.contains('is-open')) {
        closeIndexDrawer({ restoreFocus: false });
      }
    }, { passive: true });
  };

  /* ------------------------------------------------------------------------
     Scroll progress, active navigation, hero parallax
     ------------------------------------------------------------------------ */
  const sectionEls = {
    garage: $('#garage'),
    showrooms: $('#showrooms'),
    telemetry: $('#telemetry'),
    archive: $('#archive')
  };

  const setActiveNav = (cardId, section) => {
    if (state.activeCardId === cardId && state.activeSection === section) return;
    state.activeCardId = cardId;
    state.activeSection = section;

    $$('[data-rail-target]').forEach((link) => {
      const active = !!cardId && link.dataset.railTarget === cardId;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    $$('[data-rail-section]').forEach((link) => {
      const active = link.dataset.railSection === section;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    $$('[data-section-link]').forEach((link) => {
      const active = link.dataset.sectionLink === section;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    $$('[data-drawer-target]').forEach((link) => {
      const active = !!cardId && link.dataset.drawerTarget === cardId;
      link.classList.toggle('is-active', active);
    });
  };

  const updateActiveNav = () => {
    const marker = window.innerHeight * 0.42;
    let activeSection = null;

    if (sectionEls.garage && sectionEls.garage.getBoundingClientRect().top <= marker) activeSection = 'garage';
    if (sectionEls.showrooms) {
      const showroomsRect = sectionEls.showrooms.getBoundingClientRect();
      if (showroomsRect.top <= marker && showroomsRect.bottom > marker) activeSection = 'showrooms';
    }
    if (sectionEls.telemetry && sectionEls.telemetry.getBoundingClientRect().top <= marker) activeSection = 'telemetry';
    if (sectionEls.archive && sectionEls.archive.getBoundingClientRect().top <= marker) activeSection = 'archive';

    let activeCardId = null;
    if (activeSection === 'garage') {
      for (const card of cards) {
        if (card.hidden) continue;
        const rect = card.getBoundingClientRect();
        if (rect.top <= marker && rect.bottom > marker) {
          activeCardId = card.id;
          break;
        }
      }
    }
    setActiveNav(activeCardId, activeSection);
  };

  let scrollTicking = false;
  const updateScrollUI = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset || 0;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.documentElement.clientHeight
      );
      const maxScroll = Math.max(1, docHeight - window.innerHeight);
      const progress = clamp(y / maxScroll, 0, 1);

      if (header) header.classList.toggle('is-scrolled', y > 18);
      if (progressBar) progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
      if (toTop) {
        toTop.classList.toggle('is-visible', y > 680);
        toTop.style.setProperty('--progress', `${(progress * 360).toFixed(2)}deg`);
      }

      if (hero && heroImageWrap && !reduceMotion && y < hero.offsetHeight * 1.2) {
        const shift = Math.min(y * 0.12, 96);
        heroImageWrap.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      }

      updateActiveNav();
      scrollTicking = false;
    });
  };

  const initScroll = () => {
    window.addEventListener('scroll', updateScrollUI, { passive: true });
    window.addEventListener('resize', updateScrollUI, { passive: true });
    if (toTop) {
      toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    updateScrollUI();
  };

  /* ------------------------------------------------------------------------
     Reveal-on-scroll
     ------------------------------------------------------------------------ */
  const initReveals = () => {
    const revealNodes = $$('[data-reveal], .vehicle');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealNodes.forEach((node) => node.classList.add('is-inview'));
      cards.forEach((card) => card.classList.add('is-inview'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.055, rootMargin: '0px 0px -5% 0px' });
    revealNodes.forEach((node) => observer.observe(node));
  };

  /* ------------------------------------------------------------------------
     Global events
     ------------------------------------------------------------------------ */
  const initGlobal = () => {
    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener('change', (event) => {
        reduceMotion = event.matches;
        if (reduceMotion) {
          $$('[data-reveal], .vehicle').forEach((node) => node.classList.add('is-inview'));
        }
      });
    }
    // Guard against an unexpected image icon / missing asset state.
    $$('img').forEach((image) => {
      image.addEventListener('error', () => {
        image.style.opacity = '0.2';
      }, { once: true });
    });
    // Make internal anchors respect the fixed header without needing JS intercepts.
    $$('a[href^="#"]').forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      if (id) {
        const target = doc.getElementById(id);
        if (target && !target.hasAttribute('tabindex') && !target.matches('a,button,input,select,textarea')) {
          target.setAttribute('tabindex', '-1');
        }
      }
    });
  };

  /* ------------------------------------------------------------------------
     Initialization
     ------------------------------------------------------------------------ */
  const init = () => {
    try { initCards(); } catch (error) { console.error('[GT3] Card interface:', error); }
    try { initFilters(); } catch (error) { console.error('[GT3] Filters:', error); }
    try { initTelemetry(); } catch (error) { console.error('[GT3] Telemetry:', error); }
    try { initCompare(); } catch (error) { console.error('[GT3] Compare interface:', error); }
    try { initLightbox(); } catch (error) { console.error('[GT3] Lightbox:', error); }
    try { initDrawer(); } catch (error) { console.error('[GT3] Index drawer:', error); }
    try { initReveals(); } catch (error) { console.error('[GT3] Reveal observer:', error); }
    try { initScroll(); } catch (error) { console.error('[GT3] Scroll interface:', error); }
    try { initGlobal(); } catch (error) { console.error('[GT3] Global interface:', error); }

    runBoot().catch((error) => {
      console.error('[GT3] Boot sequence:', error);
      finishBoot();
    });
    // Hard release: the loading screen must never trap the page.
    window.setTimeout(finishBoot, 5200);
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

