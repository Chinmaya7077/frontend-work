/* =========================================================
   MexLot — script.js
   Vanilla JS. No dependencies.

   Features:
     1. Sticky header — appears when scrolled past first fold,
        hides on scroll-up (and at top of page).
     2. Image carousel — thumbnail click, arrows, keyboard nav.
     3. Hover zoom — lens + magnified preview pane.
     4. Process tabs — switch content + image.
     5. Applications horizontal scroll buttons.
     6. Mobile hamburger menu.
   ========================================================= */

(function () {
  'use strict';

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // ----------------------------------------------------------
  // 1. STICKY HEADER
  //    Appears once user scrolls past the hero (first fold).
  //    Disappears on scroll-up or when back near the top.
  // ----------------------------------------------------------
  const stickyHeader = $('#stickyHeader');
  const hero         = $('#hero');

  let lastScrollY      = window.scrollY;
  let stickyVisible    = false;
  let ticking          = false;

  function getFoldThreshold() {
    // Trigger sticky after the hero section has scrolled out of view.
    // Fallback to viewport height if hero is missing.
    if (!hero) return window.innerHeight * 0.8;
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    return heroBottom - 80; // small overlap so it appears just before nav hits the top
  }

  function updateStickyHeader() {
    const y         = window.scrollY;
    const threshold = getFoldThreshold();
    const goingDown = y > lastScrollY;
    const atTop     = y < 80;

    // Show when scrolling DOWN past the fold; hide when scrolling UP or near top.
    if (!atTop && goingDown && y > threshold) {
      if (!stickyVisible) {
        stickyHeader.classList.add('is-visible');
        stickyHeader.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-sticky');
        stickyVisible = true;
      }
    } else if (!goingDown || atTop) {
      if (stickyVisible) {
        stickyHeader.classList.remove('is-visible');
        stickyHeader.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-sticky');
        stickyVisible = false;
      }
    }

    lastScrollY = y;
    ticking = false;
  }

  // Use rAF for smooth scroll handling.
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateStickyHeader);
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // ----------------------------------------------------------
  // 2. IMAGE CAROUSEL — thumbnails, arrows, keyboard
  // ----------------------------------------------------------
  const mainImage = $('#mainImage');
  const thumbs    = $$('.thumb');
  const prevBtn   = $('#prevBtn');
  const nextBtn   = $('#nextBtn');
  let currentIdx  = 0;

  function activateThumb(idx) {
    if (!thumbs.length) return;
    idx = (idx + thumbs.length) % thumbs.length;
    currentIdx = idx;
    const btn = thumbs[idx];
    const src  = btn.dataset.src;
    const zoom = btn.dataset.zoom;

    thumbs.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    // Cross-fade by re-setting src once loaded.
    if (mainImage && src) {
      const tmp = new Image();
      tmp.onload = () => {
        mainImage.src = src;
        mainImage.dataset.zoom = zoom;
        // re-bind zoom background-image on next mouseover
      };
      tmp.src = src;
    }
  }

  thumbs.forEach((btn, idx) => {
    btn.addEventListener('click', () => activateThumb(idx));
  });
  if (prevBtn) prevBtn.addEventListener('click', () => activateThumb(currentIdx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => activateThumb(currentIdx + 1));

  // Keyboard support when carousel focused
  $('#carousel')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  activateThumb(currentIdx - 1);
    if (e.key === 'ArrowRight') activateThumb(currentIdx + 1);
  });

  // ----------------------------------------------------------
  // 3. HOVER ZOOM — magnify on hover.
  //    A "lens" follows the cursor; a "result" pane shows a
  //    high-res crop of the position under the lens.
  // ----------------------------------------------------------
  const stage      = $('#carouselMain');
  const lens       = $('#zoomLens');
  const result     = $('#zoomResult');

  if (stage && lens && result && mainImage) {

    function showZoom() {
      lens.style.display   = 'block';
      result.style.display = 'block';
    }
    function hideZoom() {
      lens.style.display   = 'none';
      result.style.display = 'none';
    }
    function updateZoom(e) {
      const rect = stage.getBoundingClientRect();
      // Cursor position inside the stage
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      const lensW = lens.offsetWidth;
      const lensH = lens.offsetHeight;

      // Center lens on cursor and clamp inside stage
      let lensX = clamp(x - lensW / 2, 0, rect.width  - lensW);
      let lensY = clamp(y - lensH / 2, 0, rect.height - lensH);

      lens.style.left = lensX + 'px';
      lens.style.top  = lensY + 'px';

      // Compute zoom ratio between result pane and lens
      const resW = result.offsetWidth;
      const resH = result.offsetHeight;
      const ratioX = resW / lensW;
      const ratioY = resH / lensH;

      // Use high-res image (data-zoom) when available
      const zoomSrc = mainImage.dataset.zoom || mainImage.src;
      // Use current rendered size of the main image for background sizing
      const imgW = mainImage.clientWidth;
      const imgH = mainImage.clientHeight;

      result.style.backgroundImage     = `url("${zoomSrc}")`;
      result.style.backgroundSize      = `${imgW * ratioX}px ${imgH * ratioY}px`;
      result.style.backgroundPosition  = `-${lensX * ratioX}px -${lensY * ratioY}px`;
    }

    stage.addEventListener('mouseenter', showZoom);
    stage.addEventListener('mouseleave', hideZoom);
    stage.addEventListener('mousemove',  updateZoom);

    // Touch fallback — single tap toggles a simple "tap to zoom"
    stage.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      showZoom();
      updateZoom({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: true });
    stage.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      updateZoom({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: true });
    stage.addEventListener('touchend', hideZoom);

    // Disable browser image drag inside the stage
    mainImage.addEventListener('dragstart', (e) => e.preventDefault());
  }

  // ----------------------------------------------------------
  // 4. PROCESS TABS
  // ----------------------------------------------------------
  const processData = [
    {
      title: 'High-Grade Raw Material Selection',
      desc:  'We source only premium-grade virgin HDPE resin compliant with international quality and density standards. Each batch undergoes rigorous MFI, density, and carbon-content verification before entering production.',
      bullets: ['PE100 grade resin', 'Carbon-black UV stabilisation', 'Batch-level certificate of analysis'],
      img: 'https://picsum.photos/seed/process1/900/540'
    },
    {
      title: 'Precision Extrusion',
      desc:  'Twin-screw extruders with closed-loop control maintain consistent wall thickness, ovality, and dimensional accuracy across every metre of pipe produced.',
      bullets: ['±0.1mm tolerance', 'Continuous laser gauging', 'Twin-screw, multi-zone heating'],
      img: 'https://picsum.photos/seed/process2/900/540'
    },
    {
      title: 'Calibrated Cooling',
      desc:  'Vacuum-spray cooling tanks lock in dimensional accuracy and surface finish, producing pipes with superior pressure-retention characteristics.',
      bullets: ['Vacuum calibration', 'Multi-stage water cooling', 'Zero deformation guarantee'],
      img: 'https://picsum.photos/seed/process3/900/540'
    },
    {
      title: 'Automated Cutting',
      desc:  'Programmable cutting stations deliver square, burr-free ends ready for fusion welding — no on-site re-machining required.',
      bullets: ['Burr-free finish', 'Programmable lengths', 'Square cuts within ±0.5°'],
      img: 'https://picsum.photos/seed/process4/900/540'
    },
    {
      title: 'In-Line Quality Testing',
      desc:  'Every batch is hydrostatically pressure-tested, dimensionally verified, and certified before despatch.',
      bullets: ['Hydrostatic burst testing', 'Density verification', 'Per-coil traceability'],
      img: 'https://picsum.photos/seed/process5/900/540'
    },
    {
      title: 'Coiling & Packaging',
      desc:  'Continuous coiling for small diameters and stack-bundling for large diameters — protected for long-haul logistics across India.',
      bullets: ['50m–200m coils', 'Weather-proof bundling', 'Custom labelling available'],
      img: 'https://picsum.photos/seed/process6/900/540'
    }
  ];

  const tabBtns    = $$('.process__tab');
  const titleEl    = $('#processTitle');
  const descEl     = $('#processDesc');
  const imageEl    = $('#processImage');
  const infoEl     = $('#processInfo');

  function activateTab(idx) {
    tabBtns.forEach(b => b.classList.remove('is-active'));
    tabBtns[idx]?.classList.add('is-active');
    const data = processData[idx];
    if (!data) return;
    if (titleEl) titleEl.textContent = data.title;
    if (descEl)  descEl.textContent  = data.desc;
    if (imageEl) imageEl.src         = data.img;
    // Re-render bullets
    if (infoEl) {
      const ul = infoEl.querySelector('ul');
      if (ul) ul.innerHTML = data.bullets.map(b => `<li>✓ ${b}</li>`).join('');
    }
  }
  tabBtns.forEach((btn, idx) => btn.addEventListener('click', () => activateTab(idx)));

  // ----------------------------------------------------------
  // 5. APPLICATIONS — horizontal scroll arrows
  // ----------------------------------------------------------
  const appsRow  = $('#appsRow');
  const appsPrev = $('#appsPrev');
  const appsNext = $('#appsNext');
  if (appsRow && appsPrev && appsNext) {
    const step = () => Math.max(280, appsRow.clientWidth * 0.66);
    appsPrev.addEventListener('click', () => appsRow.scrollBy({ left: -step(), behavior: 'smooth' }));
    appsNext.addEventListener('click', () => appsRow.scrollBy({ left:  step(), behavior: 'smooth' }));
  }

  // ----------------------------------------------------------
  // 6. MOBILE HAMBURGER
  // ----------------------------------------------------------
  const hamburger = $('#hamburger');
  const menu      = $('.navbar__menu');
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(open));
    });
    // Close on link click
    menu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        menu.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      })
    );
  }

  // Init
  updateStickyHeader();
})();
