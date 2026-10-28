/* Hospitality Minds portfolio — progressive enhancement.
   Every feature here is optional: pages are complete, navigable and readable
   without JavaScript or animation. */
(() => {
  'use strict';

  const html = document.documentElement;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  let lenis = null;
  const motionAllowed = () => !reduceMotion.matches && !saveData && !html.classList.contains('is-paused');

  /* ---------------------------------------------------------------------------
     Images: colour placeholder, then a soft fade once each image has decoded
     ------------------------------------------------------------------------ */
  html.classList.add('img-fade');
  $$('img[data-fade]').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });

  /* ---------------------------------------------------------------------------
     Floating WhatsApp button: appears after the hero, steps aside for the
     enquiry section and footer so it never covers the form or contact links
     ------------------------------------------------------------------------ */
  const fab = $('[data-fab]');
  if (fab) {
    const covering = new Set();
    const updateFab = () => fab.classList.toggle('is-visible', window.scrollY > 560 && covering.size === 0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? covering.add(e.target) : covering.delete(e.target)));
      updateFab();
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.site-footer, #start, .contact-layout').forEach((el) => io.observe(el));
    window.addEventListener('scroll', updateFab, { passive: true });
    updateFab();
  }

  /* ---------------------------------------------------------------------------
     Process: a smooth curve threaded through each step's dot (desktop).
     Catmull-Rom points converted to cubic Béziers, rebuilt on resize.
     ------------------------------------------------------------------------ */
  const wide = window.matchMedia('(min-width: 1000px)');
  const buildCurves = () => $$('[data-process]').forEach((proc) => {
    const svg = $('.process__curve', proc);
    if (!svg) return;
    proc.classList.toggle('has-curve', wide.matches);
    if (!wide.matches) return;
    const box = proc.getBoundingClientRect();
    const dots = $$('.process__dot', proc).map((d) => {
      const r = d.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    if (dots.length < 2) return;
    const pts = [[0, dots[0][1] + 28], ...dots, [box.width, dots[dots.length - 1][1] - 28]];
    const f = (n) => Math.round(n * 10) / 10;
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    svg.setAttribute('viewBox', `0 0 ${f(box.width)} ${f(box.height)}`);
    $$('path', svg).forEach((p) => p.setAttribute('d', d));
  });
  let curveTimer;
  window.addEventListener('resize', () => { clearTimeout(curveTimer); curveTimer = setTimeout(buildCurves, 150); });
  document.fonts?.ready.then(buildCurves);
  buildCurves();

  /* ---------------------------------------------------------------------------
     Header: solid after scrolling, hides on the way down, returns on the way up
     ------------------------------------------------------------------------ */
  const header = $('[data-header]');
  if (header) {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-solid', y > 40);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > 320 && !header.contains(document.activeElement)) header.classList.add('is-hidden');
      else if (goingUp || y < 320) header.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
    update();
  }

  /* ---------------------------------------------------------------------------
     Primary navigation: sliding indicator + accessible dropdowns
     ------------------------------------------------------------------------ */
  const nav = $('.primary-nav');
  if (nav) {
    const indicator = $('.nav-indicator', nav);
    const links = $$('.nav-link', nav);
    const current = links.find((l) => l.hasAttribute('aria-current'));
    const moveTo = (link) => {
      if (!link || !indicator) { if (indicator) indicator.style.opacity = '0'; return; }
      const navBox = nav.getBoundingClientRect();
      const box = link.getBoundingClientRect();
      const inset = 13;
      indicator.style.width = `${Math.max(0, box.width - inset * 2 + (link.parentElement.classList.contains('has-sub') ? 10 : 0))}px`;
      indicator.style.transform = `translateX(${box.left - navBox.left + inset}px)`;
      indicator.style.opacity = '1';
    };
    links.forEach((l) => {
      l.addEventListener('mouseenter', () => moveTo(l));
      l.addEventListener('focus', () => moveTo(l));
    });
    nav.addEventListener('mouseleave', () => moveTo(current));
    nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) moveTo(current); });
    window.addEventListener('resize', () => moveTo(current));
    document.fonts?.ready.then(() => moveTo(current));
    moveTo(current);

    const closeAll = (except) => $$('.has-sub.is-open', nav).forEach((li) => {
      if (li === except) return;
      li.classList.remove('is-open');
      $('.sub-toggle', li)?.setAttribute('aria-expanded', 'false');
    });
    $$('.sub-toggle', nav).forEach((btn) => {
      const li = btn.closest('.has-sub');
      btn.addEventListener('click', () => {
        const open = !li.classList.contains('is-open');
        closeAll(li);
        li.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (open) $('.sub a', li)?.focus();
      });
      li.addEventListener('focusout', (e) => {
        if (!li.contains(e.relatedTarget)) { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && li.classList.contains('is-open')) {
          li.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        }
      });
    });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) closeAll(); });
  }

  /* ---------------------------------------------------------------------------
     Mobile menu (native modal <dialog>)
     ------------------------------------------------------------------------ */
  const menu = $('#mobile-menu');
  const menuToggle = $('.menu-toggle');
  if (menu && menuToggle && typeof menu.showModal === 'function') {
    const close = () => { if (menu.open) menu.close(); };
    menuToggle.addEventListener('click', () => {
      menu.showModal();
      lenis?.stop();
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    });
    menu.addEventListener('close', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      lenis?.start();
      document.body.style.overflow = '';
      menuToggle.focus();
    });
    $('[data-menu-close]', menu)?.addEventListener('click', close);
    $$('a', menu).forEach((a) => a.addEventListener('click', close));
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) close(); });
  }

  /* ---------------------------------------------------------------------------
     Lightbox — images, self-hosted video and Vimeo, with gallery navigation
     ------------------------------------------------------------------------ */
  const lb = $('#lightbox');
  const lbState = { items: [], index: 0 };
  if (lb && typeof lb.showModal === 'function') {
    const mediaBox = $('[data-lb-media]', lb);
    const caption = $('[data-lb-caption]', lb);
    const count = $('[data-lb-count]', lb);

    const visible = (el) => !el.closest('[hidden]');
    const itemsFor = (opener) => {
      const g = opener.dataset.gallery;
      return g ? $$(`[data-lb][data-gallery="${CSS.escape(g)}"]`).filter(visible) : [opener];
    };

    const render = () => {
      const el = lbState.items[lbState.index];
      const d = el.dataset;
      mediaBox.replaceChildren();
      let node;
      if (d.lb === 'image') {
        node = document.createElement('img');
        if (d.srcset) { node.srcset = d.srcset; node.sizes = '100vw'; }
        node.src = d.src;
        node.alt = d.title || '';
        if (d.w && d.h) { node.width = Number(d.w); node.height = Number(d.h); }
      } else if (d.kind === 'vimeo') {
        node = document.createElement('iframe');
        node.src = `https://player.vimeo.com/video/${encodeURIComponent(d.vimeo)}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
        node.allow = 'autoplay; fullscreen; picture-in-picture';
        node.allowFullscreen = true;
        node.title = d.title || 'Video';
        lb.style.setProperty('--ratio', d.ratio || '1.7778');
      } else {
        node = document.createElement('video');
        node.controls = true;
        node.playsInline = true;
        node.preload = 'metadata';
        if (d.poster) node.poster = d.poster;
        node.src = d.src;
        node.setAttribute('aria-label', d.title || 'Video');
        // Opening the viewer is the user's request to watch, so play with sound.
        node.addEventListener('loadedmetadata', () => node.play().catch(() => {}), { once: true });
      }
      node.classList.add('lb-anim');
      mediaBox.append(node);
      caption.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = d.title || '';
      caption.append(strong);
      if (d.caption) caption.append(document.createTextNode(d.caption));
      const n = lbState.items.length;
      count.textContent = n > 1 ? `${lbState.index + 1} / ${n}` : '';
      lb.toggleAttribute('data-single', n < 2);
    };

    const open = (opener) => {
      lbState.opener = opener;
      lbState.items = itemsFor(opener);
      lbState.index = Math.max(0, lbState.items.indexOf(opener));
      render();
      lb.showModal();
      lenis?.stop();
      document.body.style.overflow = 'hidden';
      $$('video').forEach((v) => { if (!lb.contains(v)) v.pause(); });
    };
    const step = (dir) => {
      const n = lbState.items.length;
      if (n < 2) return;
      lbState.index = (lbState.index + dir + n) % n;
      render();
    };
    const close = () => {
      if (!lb.open) return;
      lb.classList.add('is-closing');
      setTimeout(() => { lb.classList.remove('is-closing'); lb.close(); }, reduceMotion.matches ? 0 : 220);
    };

    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-lb]');
      if (!opener || lb.contains(opener)) return;
      e.preventDefault();
      open(opener);
    });
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => step(1));
    lb.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    lb.addEventListener('close', () => {
      mediaBox.replaceChildren();
      document.body.style.overflow = '';
      lenis?.start();
      lbState.opener?.focus({ preventScroll: true });
      resumeHero();
    });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    $('.lightbox__stage', lb).addEventListener('click', (e) => {
      if (e.target.classList.contains('lightbox__stage') || e.target === mediaBox) close();
    });
    let startX = null;
    lb.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
  }

  /* ---------------------------------------------------------------------------
     Hover previews: short muted loops on reel cards (desktop, motion allowed)
     ------------------------------------------------------------------------ */
  $$('.reel__btn[data-preview]').forEach((btn) => {
    let video = null;
    btn.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !finePointer.matches || !motionAllowed()) return;
      if (!video) {
        video = document.createElement('video');
        Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto', src: btn.dataset.preview });
        video.setAttribute('aria-hidden', 'true');
        video.addEventListener('playing', () => video.classList.add('is-playing'));
        $('.reel__frame', btn).append(video);
      }
      btn.classList.add('is-previewing');
      video.play().catch(() => {});
    });
    btn.addEventListener('pointerleave', () => {
      btn.classList.remove('is-previewing');
      if (video) { video.pause(); video.classList.remove('is-playing'); }
    });
  });

  /* ---------------------------------------------------------------------------
     Hero: image sequence + featured reel, with a pause control
     ------------------------------------------------------------------------ */
  const heroSlides = $('[data-hero-slides]');
  const heroVideo = $('[data-hero-video]');
  const heroDots = $$('[data-hero-dot]');
  const heroWords = $$('.hero__word');
  const HERO_DELAY = 6500; // keep in step with the dot-fill animation in the CSS
  let heroTimer = null;
  let heroVisible = true;
  let heroIndex = 0;

  const activate = (slide) => {
    slide.querySelectorAll('[data-srcset]').forEach((el) => { el.srcset = el.dataset.srcset; el.removeAttribute('data-srcset'); });
    slide.querySelectorAll('img[data-src]').forEach((el) => { el.src = el.dataset.src; el.removeAttribute('data-src'); });
    slide.querySelectorAll('img[loading="lazy"]').forEach((el) => { el.loading = 'eager'; });
  };
  // Restart the active progress bar so it fills in step with the next timer
  const restartFill = () => {
    const dot = heroDots[heroIndex];
    if (!dot) return;
    dot.classList.remove('is-active');
    void dot.offsetWidth;
    dot.classList.add('is-active');
  };
  const scheduleNext = () => {
    clearTimeout(heroTimer);
    heroTimer = null;
    if (!heroSlides || !heroVisible || !motionAllowed() || document.hidden || (lb && lb.open)) return;
    const n = $$('.hero__slide', heroSlides).length;
    if (n > 1) heroTimer = setTimeout(() => showSlide((heroIndex + 1) % n), HERO_DELAY);
  };
  const showSlide = (i) => {
    const slides = $$('.hero__slide', heroSlides);
    const next = slides[i];
    if (!next || i === heroIndex) return;
    activate(next);
    const img = $('img', next);
    const swap = () => {
      // The outgoing photo stays underneath while the new one sweeps across it
      const prev = slides[heroIndex];
      prev.classList.add('is-leaving');
      prev.classList.remove('is-active');
      next.classList.add('is-active');
      setTimeout(() => prev.classList.remove('is-leaving'), 1800);
      heroIndex = i;
      const cap = $('[data-hero-caption]');
      const cnt = $('[data-hero-count]');
      if (cap) {
        cap.textContent = next.dataset.caption || '';
        cap.classList.remove('is-in');
        void cap.offsetWidth;
        cap.classList.add('is-in');
      }
      if (cnt) cnt.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      heroDots.forEach((d, n) => {
        d.classList.toggle('is-active', n === i);
        if (n === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      const w = i % (heroWords.length || 1);
      heroWords.forEach((el, n) => {
        el.classList.toggle('is-out', el.classList.contains('is-active') && n !== w);
        el.classList.toggle('is-active', n === w);
      });
      activate(slides[(i + 1) % slides.length]); // warm the following slide
      scheduleNext();
    };
    if (!img || img.complete) { swap(); return; }
    // Swap once the photo is ready, but never let a slow or failed image stall the show
    let done = false;
    const go = () => { if (!done) { done = true; swap(); } };
    img.addEventListener('load', go, { once: true });
    img.addEventListener('error', go, { once: true });
    setTimeout(go, 4000);
  };
  heroDots.forEach((dot) => dot.addEventListener('click', () => showSlide(Number(dot.dataset.heroDot))));
  const stopHero = () => { clearTimeout(heroTimer); heroTimer = null; heroVideo?.pause(); };
  function resumeHero() {
    if (!heroVisible || !motionAllowed() || document.hidden || (lb && lb.open)) return;
    if (heroSlides && !heroTimer) {
      restartFill();
      scheduleNext();
    }
    if (heroVideo) {
      if (!heroVideo.src) heroVideo.src = heroVideo.dataset.heroVideo;
      heroVideo.play().then(() => heroVideo.classList.add('is-playing')).catch(() => {});
    }
  }
  if (heroSlides || heroVideo) {
    const start = () => {
      const slides = heroSlides ? $$('.hero__slide', heroSlides) : [];
      if (slides[1] && motionAllowed()) activate(slides[1]);
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        heroVisible ? resumeHero() : stopHero();
      }, { threshold: 0.15 }).observe(heroSlides || $('.hero'));
      document.addEventListener('visibilitychange', () => (document.hidden ? stopHero() : resumeHero()));
    };
    // Wait for the first (LCP) image before loading anything else in the hero.
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
  }
  const pauseBtn = $('[data-motion-toggle]');
  pauseBtn?.addEventListener('click', () => {
    const paused = html.classList.toggle('is-paused');
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.querySelector('span').textContent = paused ? 'Play motion' : 'Pause motion';
    paused ? stopHero() : resumeHero();
  });

  // Hero depth: the photo and the reel card drift apart as the pointer moves
  const heroEl = $('.hero');
  if (heroEl && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    heroEl.addEventListener('pointermove', (e) => {
      const r = heroEl.getBoundingClientRect();
      heroEl.style.setProperty('--hx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      heroEl.style.setProperty('--hy', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    heroEl.addEventListener('pointerleave', () => {
      heroEl.style.setProperty('--hx', '0');
      heroEl.style.setProperty('--hy', '0');
    });
  }

  /* ---------------------------------------------------------------------------
     Filters — creatives collage (in place) and creatives pages (URL-synced)
     ------------------------------------------------------------------------ */
  const applyFilter = (groupName, value) => {
    const target = $(`[data-filter-target="${groupName}"]`);
    if (!target) return 0;
    let shown = 0;
    const revealed = [];
    $$('.collage__item, .gal__item', target).forEach((item) => {
      const match = value === 'all' || item.dataset.cats.split(' ').includes(value);
      if (match) revealed.push(item);
      item.hidden = !match;
      if (match) shown += 1;
    });
    if (window.gsap && motionAllowed() && revealed.length) {
      window.gsap.fromTo(revealed, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out', clearProps: 'transform' });
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    return shown;
  };

  $$('[data-filter-group]').forEach((group) => {
    const name = group.dataset.filterGroup;
    const status = $('[data-filter-status]', group.closest('section') || document) || $('[data-filter-status]');
    const countEl = $('[data-filter-count]');
    const urlMode = group.dataset.filterMode === 'url';
    const controls = $$('[data-filter]', group);

    const setActive = (value, push) => {
      controls.forEach((c) => {
        const on = c.dataset.filter === value;
        if (urlMode) on ? c.setAttribute('aria-current', 'page') : c.removeAttribute('aria-current');
        else c.setAttribute('aria-pressed', String(on));
      });
      const n = applyFilter(name, value);
      const label = controls.find((c) => c.dataset.filter === value)?.firstChild?.textContent.trim() || 'All';
      if (status && !group.hasAttribute('data-filter-quiet')) status.textContent = `Showing ${n} ${value === 'all' ? 'designs' : `${label.toLowerCase()} designs`}`;
      if (countEl) countEl.textContent = `${n} designs`;
      if (urlMode && push) {
        const link = controls.find((c) => c.dataset.filter === value);
        if (link && link.href !== location.href) history.pushState({ filter: value }, '', link.href);
      }
      if (urlMode) document.title = value === 'all' ? 'Creative Campaigns for Hotels & Resorts — Hospitality Minds' : `${label} — Hospitality Creatives — Hospitality Minds`;
    };

    controls.forEach((c) => c.addEventListener('click', (e) => {
      e.preventDefault();
      setActive(c.dataset.filter, true);
    }));
    if (urlMode) {
      window.addEventListener('popstate', () => {
        const match = controls.find((c) => new URL(c.href).pathname === location.pathname);
        setActive(match ? match.dataset.filter : 'all', false);
      });
    }
  });

  /* ---------------------------------------------------------------------------
     Website showcase: desktop / mobile preview toggle
     ------------------------------------------------------------------------ */
  $$('[data-devices]').forEach((stage) => {
    const view = $('.device-view', stage);
    const buttons = $$('[data-device]', stage);
    buttons.forEach((b) => b.addEventListener('click', () => {
      view.dataset.view = b.dataset.device;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
  });

  /* ---------------------------------------------------------------------------
     Enquiry forms: validation + submission. Success is shown only when the
     server confirms the message was accepted.
     ------------------------------------------------------------------------ */
  const messages = {
    name: 'Please enter your name.',
    email: 'Please enter a valid email address.',
    phone: 'Please enter a valid phone number (digits, spaces, + and - only).',
    message: 'Please tell us a little about the project (at least 10 characters).',
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  $$('form[data-enquiry]').forEach((form) => {
    const status = $('[data-form-status]', form);
    const success = form.nextElementSibling?.matches('[data-form-success]') ? form.nextElementSibling : null;
    const submit = $('button[type="submit"]', form);
    form.elements.started.value = String(Date.now());
    form.elements.page.value = location.pathname;

    const setError = (field, msg) => {
      const err = document.getElementById(`${field.id}-err`);
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };
    const check = (field) => {
      const v = field.value.trim();
      let msg = '';
      if (field.name === 'name' && v.length < 2) msg = messages.name;
      if (field.name === 'email' && !emailOk(v)) msg = messages.email;
      if (field.name === 'phone' && v && !/^[0-9+()\-\s]{7,24}$/.test(v)) msg = messages.phone;
      if (field.name === 'message' && v.length < 10) msg = messages.message;
      setError(field, msg);
      return !msg;
    };
    const fields = ['name', 'email', 'phone', 'message'].map((n) => form.elements[n]).filter(Boolean);
    fields.forEach((f) => {
      f.addEventListener('blur', () => { if (f.value) check(f); });
      f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') check(f); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.removeAttribute('data-state');
      const invalid = fields.filter((f) => !check(f));
      if (invalid.length) { invalid[0].focus(); return; }

      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        let data = null;
        try { data = await res.json(); } catch { /* non-JSON response */ }
        if (res.ok && data && data.ok === true) {
          form.reset();
          if (success) {
            form.hidden = true;
            success.hidden = false;
            success.focus();
          } else {
            status.dataset.state = 'success';
            status.textContent = 'Thank you — your enquiry has been sent.';
          }
          return;
        }
        if (data && data.errors) {
          Object.entries(data.errors).forEach(([name, msg]) => { const f = form.elements[name]; if (f) setError(f, msg); });
        }
        throw new Error((data && data.message) || 'The server could not accept the enquiry.');
      } catch (err) {
        status.dataset.state = 'error';
        const email = 'nilesh@hospitalityminds.com';
        status.innerHTML = '';
        status.append(document.createTextNode(`Sorry — your message was not sent. ${err.message && !/fetch/i.test(err.message) ? err.message + ' ' : ''}Please try again, or email `));
        const a = document.createElement('a');
        a.href = `mailto:${email}`;
        a.textContent = email;
        status.append(a, document.createTextNode('.'));
      } finally {
        submit.removeAttribute('aria-busy');
        submit.disabled = false;
      }
    });
  });

  /* ---------------------------------------------------------------------------
     Category chapters: horizontal rails and the sticky category nav
     ------------------------------------------------------------------------ */
  $$('[data-rail-for]').forEach((ctrl) => {
    const track = document.getElementById(ctrl.dataset.railFor);
    if (!track) return;
    const prev = $('[data-rail-prev]', ctrl);
    const next = $('[data-rail-next]', ctrl);
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };
    const by = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => by(-1));
    next.addEventListener('click', () => by(1));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    // Mouse drag; touch and trackpads already scroll natively
    let down = null;
    let moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = { x: e.clientX, left: track.scrollLeft };
      moved = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = down.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = null;
      track.classList.remove('is-dragging');
    });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  const chapterLinks = $$('.chapters a');
  if (chapterLinks.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        chapterLinks.forEach((a) => (a.getAttribute('href') === `#${en.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('.chap').forEach((c) => spy.observe(c));
  }

  /* ---------------------------------------------------------------------------
     Motion system (GSAP + ScrollTrigger). Skipped entirely when reduced motion
     is requested or the libraries are unavailable.
     ------------------------------------------------------------------------ */
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (!gsap || !ST || !html.classList.contains('motion')) {
    html.classList.remove('motion');
    html.classList.add('no-motion');
    $$('[data-process-step]').forEach((s) => s.classList.add('is-active'));
    return;
  }
  gsap.registerPlugin(ST);
  gsap.defaults({ ease: 'power3.out', duration: 1 });

  // Smooth scrolling for mouse users; native scrolling everywhere else
  if (window.Lenis && finePointer.matches && motionAllowed()) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, anchors: true });
      lenis.on('scroll', ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }

  // Cursor ring that grows over images and videos
  if (finePointer.matches && motionAllowed()) {
    const ring = document.createElement('div');
    ring.className = 'cursor';
    ring.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'cursor__label';
    ring.append(label);
    document.body.append(ring);
    const qx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
    const qy = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
    const mediaSel = '[data-lb], .gal__item a, .work-card__link, .tile, .hero__card, .reel__btn, .fwc, .page-hero__frame';
    window.addEventListener('pointermove', (e) => {
      qx(e.clientX);
      qy(e.clientY);
      ring.classList.add('is-on');
      const t = e.target.closest ? e.target.closest(mediaSel) : null;
      ring.classList.toggle('is-media', !!t);
      label.textContent = !t || t.matches('.fwc') ? '' : (t.matches('[data-lb="video"], .reel__btn, .hero__card--reel') ? 'Play' : (t.matches('[data-lb="image"]') ? 'View' : 'Open'));
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => ring.classList.remove('is-on'));
  }

  // Opening animations for the first screen; the safety net below can finish them early
  const intros = [];

  // Hero entrance
  const heroTitle = $('.hero__title');
  if ($('.hero')) {
    const words = heroTitle ? $$('.wi', heroTitle) : [];
    if (words.length) gsap.set(words, { y: 0, yPercent: 105 });
    const heroIntro = gsap.timeline({ delay: 0.15 });
    if ($('.hero__slide.is-active picture')) heroIntro.from('.hero__slide.is-active picture', { scale: 1.2, duration: 2.6, ease: 'power2.out' }, 0);
    if (words.length) heroIntro.to(words, { yPercent: 0, duration: 1.2, stagger: 0.07, ease: 'power4.out' }, 0.3);
    heroIntro.fromTo('[data-hero-fade]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.14, clearProps: 'transform' }, 0.5);
    intros.push(heroIntro);
    // On scroll the copy lifts away while the photo settles in a little closer
    const pastHero = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    if ($('.hero__inner')) gsap.to('.hero__inner', { yPercent: -10, opacity: 0.3, ease: 'none', scrollTrigger: pastHero });
    if ($('.hero__slide')) gsap.to('.hero__slide', { scale: 1.1, ease: 'none', scrollTrigger: { ...pastHero } });
    if ($('.hcats')) gsap.to('.hcat__media', { scale: 1.08, ease: 'none', scrollTrigger: { ...pastHero } });
  }

  // Inner page heroes: the copy lifts away as you scroll past
  if ($('.phero')) {
    gsap.to('.phero__inner', { yPercent: -8, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.phero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // Word-by-word headline reveals
  $$('[data-split]').forEach((el) => {
    if (el === heroTitle) return;
    const words = $$('.wi', el);
    gsap.set(words, { y: 0, yPercent: 105 });
    // Hero titles enter on load; waiting for a scroll trigger can leave them hidden below the fold
    if (el.closest('.phero, .cs-hero, .page-hero')) {
      intros.push(gsap.to(words, { yPercent: 0, duration: 1.1, stagger: 0.05, delay: 0.35, ease: 'power4.out' }));
      return;
    }
    ST.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.1, stagger: 0.05, ease: 'power4.out' }),
    });
  });

  // Hero copy (crumbs, labels, chips, buttons) enters on load as well
  const heroReveals = $$('.phero [data-reveal], .cs-hero [data-reveal], .page-hero [data-reveal]');
  if (heroReveals.length) {
    heroReveals.forEach((el) => { el.dataset.shown = ''; });
    intros.push(gsap.fromTo(heroReveals, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, delay: 0.5, clearProps: 'transform' }));
  }

  // Fade-up reveals, batched so items entering together stagger
  ST.batch('[data-reveal]:not([data-reveal="clip"])', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      const fresh = batch.filter((el) => !('shown' in el.dataset));
      if (fresh.length) gsap.fromTo(fresh, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.05, stagger: 0.08, clearProps: 'transform' });
    },
  });

  // Image clip reveals
  $$('[data-reveal="clip"]').forEach((el) => {
    const media = $('picture', el) || $('img', el);
    ST.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        if ('shown' in el.dataset) return;
        gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', onComplete: () => { el.style.clipPath = 'none'; } });
        if (media) gsap.fromTo(media, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'power3.out', clearProps: 'transform' });
      },
    });
  });

  // Inner page heroes: photos reveal one after another, then drift with the pointer
  $$('[data-hero-art]').forEach((art) => {
    const frames = $$('[data-hero-frame]', art);
    intros.push(gsap.timeline({ delay: 0.3 })
      .fromTo(frames, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, stagger: 0.18, ease: 'power4.inOut',
        onComplete: () => frames.forEach((f) => { f.style.clipPath = 'none'; }),
      }, 0)
      .from($$('picture', art), { scale: 1.25, duration: 2, stagger: 0.18, ease: 'power3.out', clearProps: 'transform' }, 0));
    const hero = art.closest('.page-hero, .phero');
    if (!hero || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      art.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      art.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => {
      art.style.setProperty('--mx', '0');
      art.style.setProperty('--my', '0');
    });
  });

  // Gentle parallax
  $$('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.1;
    gsap.fromTo(el, { yPercent: -speed * 50 }, {
      yPercent: speed * 50,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Process line draws as the section scrolls; steps light up as it passes
  $$('[data-process]').forEach((proc) => {
    const line = $('[data-process-line]', proc);
    const draw = $('[data-process-draw]', proc);
    const steps = $$('[data-process-step]', proc);
    const horizontal = () => window.matchMedia('(min-width: 1000px)').matches;
    gsap.set(line, { scaleX: horizontal() ? 0 : 1, scaleY: horizontal() ? 1 : 0 });
    ST.create({
      trigger: proc,
      start: 'top 75%',
      end: 'bottom 55%',
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        if (draw) draw.style.strokeDashoffset = String(1 - p);
        gsap.set(line, horizontal() ? { scaleX: p, scaleY: 1 } : { scaleY: p, scaleX: 1 });
        steps.forEach((s, i) => s.classList.toggle('is-active', p >= i / Math.max(1, steps.length - 1) - 0.02));
      },
    });
  });

  // Stats count up the first time they appear
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const state = { v: 0 };
    el.textContent = `0${suffix}`;
    ST.create({
      trigger: el,
      start: 'top bottom',
      once: true,
      onEnter: () => {
        if ('shown' in el.dataset) return;
        gsap.to(state, {
          v: end, duration: 2, ease: 'power3.out', delay: el.closest('.hero') ? 1 : 0,
          onUpdate: () => { el.textContent = `${Math.round(state.v)}${suffix}`; },
        });
      },
    });
  });

  // Films wall: a tilted track of tall reel cards. Seamless drift that speeds up with scrolling,
  // centre focus (live preview, travelling light ring, caption), pointer tilt, drag with inertia,
  // keyboard and button control, rolling counter. Clones keep the loop endless.
  $$('[data-fw]').forEach((wall) => {
    const stage = $('[data-fw-stage]', wall);
    const track = $('[data-fw-track]', wall);
    const row = $('[data-fw-row]', wall);
    const originals = $$('.fw__item', row);
    if (!stage || !track || !row || originals.length < 4) return;
    const N = originals.length;
    const ghost = $('[data-fw-ghost]', wall);
    const curEl = $('[data-fw-cur]', wall);
    const prog = $('[data-fw-prog]', wall);
    const toggle = $('[data-fw-toggle]', wall);
    const previews = originals.map((li) => $('.fwc', li).dataset.preview);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const tilt = window.matchMedia('(max-width: 640px)').matches ? -5 : -7;

    wall.classList.add('is-stage');
    track.style.setProperty('--fw-tilt', `${tilt}deg`);

    // Two extra sets: inert copies that forward their click to the real card
    for (let c = 0; c < 2; c++) {
      originals.forEach((li, i) => {
        const copy = li.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        const b = $('button', copy);
        const span = document.createElement('span');
        span.className = `${b.className} is-clone`;
        span.dataset.of = String(i);
        span.append(...b.childNodes);
        b.replaceWith(span);
        row.append(copy);
      });
    }
    const items = $$('.fw__item', row);
    const cards = items.map((li, idx) => ({
      li, el: $('.fwc', li), idx, orig: idx % N, cx: 0, cy: 0, d: 9, k: 0, tx: 0, ty: 0, hx: 0, hy: 0, hover: false,
      live: false, video: null, p: 0, tryAt: 0,
    }));
    const byEl = new Map(cards.map((c) => [c.el, c]));

    let W = 0; let H = 0; let setW = 1; let step = 1; let cos = 1; let sin = 0;
    const measure = () => {
      W = stage.clientWidth;
      H = track.offsetHeight;
      setW = Math.max(1, items[N].offsetLeft - items[0].offsetLeft);
      step = Math.max(1, items[1].offsetLeft - items[0].offsetLeft);
      const th = (tilt * Math.PI) / 180;
      cos = Math.cos(th);
      sin = Math.sin(th);
      cards.forEach((c) => {
        c.cx = c.li.offsetLeft + c.li.offsetWidth / 2;
        c.cy = c.li.offsetTop + c.li.offsetHeight / 2;
      });
    };
    measure();
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 150); });

    // State
    let x = 0; let shift = 0; let rate = 0; let inertia = 0; let skew = 0;
    let lastY = window.scrollY; let inView = false; let hovering = false; let dragging = false;
    let focusPause = false; let userPaused = false; let focusIdx = -1; let focusOrig = -1; let swallow = false; let wasMotion = true;
    const BASE = 42; // px per second

    const project = () => {
      for (const c of cards) {
        const px = c.cx + x - W / 2;
        const py = c.cy - H / 2;
        c.d = (px * cos - py * sin) / (W / 2);
      }
    };

    const setLive = (c, on) => {
      if (c.live === on) return;
      c.live = on;
      if (on) {
        if (!c.video) {
          const v = document.createElement('video');
          Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', src: previews[c.orig] });
          v.setAttribute('aria-hidden', 'true');
          v.tabIndex = -1;
          v.addEventListener('playing', () => v.classList.add('is-playing'));
          $('.fwc__media', c.el).append(v);
          c.video = v;
        }
        if (motionAllowed() && !userPaused) c.video.play().catch(() => {});
      } else if (c.video) {
        c.video.pause();
        c.video.classList.remove('is-playing');
        c.p = 0;
        c.el.style.setProperty('--p', '0');
      }
    };

    const pad = (n) => String(n + 1).padStart(2, '0');
    const setCounter = (o) => {
      const b = $('b', curEl);
      if (!b) return;
      gsap.killTweensOf(b);
      gsap.to(b, {
        yPercent: -100, duration: 0.22, ease: 'power2.in',
        onComplete: () => { b.textContent = pad(o); gsap.fromTo(b, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'power3.out' }); },
      });
    };

    const frame = (_t, ms) => {
      const sy = window.scrollY;
      const dy = sy - lastY;
      lastY = sy;
      if (!inView) return;
      const dt = Math.min(ms, 64) / 1000;
      const lbOpen = !!(lb && lb.open);
      const moving = motionAllowed() && !userPaused && !document.hidden;
      const target = moving && !focusPause && !dragging && !lbOpen ? (hovering ? 0.1 : 1) : 0;
      rate += (target - rate) * Math.min(1, dt * 3.2);
      x -= BASE * rate * dt;
      x -= dy * 0.6;
      if (inertia) {
        x += inertia * dt;
        inertia *= Math.exp(-dt * 3.2);
        if (Math.abs(inertia) < 8) inertia = 0;
      }
      if (shift) {
        const part = shift * (1 - Math.exp(-dt * 7));
        x += part;
        shift -= part;
        if (Math.abs(shift) < 0.3) { x += shift; shift = 0; }
      }
      x %= setW;
      if (x > 0) x -= setW;
      row.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      skew += (clamp(-dy * 0.22, -6, 6) - skew) * Math.min(1, dt * 6);
      track.style.setProperty('--fw-skew', `${skew.toFixed(2)}deg`);
      if (prog) prog.style.transform = `scaleX(${(-x / setW).toFixed(3)})`;
      project();

      let best = null;
      let bestD = 9;
      for (const c of cards) {
        const ad = Math.abs(c.d);
        if (ad > 1.3) { if (c.live) setLive(c, false); continue; }
        const k = Math.pow(1 - clamp(ad / 0.9, 0, 1), 1.4);
        c.k = k;
        c.hx += (c.tx - c.hx) * Math.min(1, dt * 9);
        c.hy += (c.ty - c.hy) * Math.min(1, dt * 9);
        const ry = clamp(c.d, -1.2, 1.2) * -13 + c.hx * 12;
        const rx = c.hy * -10;
        const sc = 0.9 + 0.17 * k + (c.hover ? 0.05 : 0);
        const lift = c.d * c.d * 26 - k * 10;
        c.el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(0,${lift.toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
        c.el.style.setProperty('--k', k.toFixed(3));
        if (ad < bestD) { bestD = ad; best = c; }
        setLive(c, ad < 0.78);
        const v = c.video;
        if (c.live && v) {
          if (moving && !lbOpen && v.paused && ms && performance.now() > c.tryAt) { c.tryAt = performance.now() + 600; v.play().catch(() => {}); }
          if (v.duration) {
            const p = v.currentTime / v.duration;
            if (Math.abs(p - c.p) > 0.004) { c.p = p; c.el.style.setProperty('--p', p.toFixed(3)); }
          }
        }
      }
      if (wasMotion !== moving) {
        wasMotion = moving;
        cards.forEach((c) => { if (c.video) { if (moving && c.live) c.video.play().catch(() => {}); else c.video.pause(); } });
      }
      if (best && best.idx !== focusIdx) {
        if (focusIdx > -1) cards[focusIdx].el.classList.remove('is-focus');
        best.el.classList.add('is-focus');
        focusIdx = best.idx;
        if (best.orig !== focusOrig) { focusOrig = best.orig; setCounter(best.orig); }
      }
    };
    gsap.ticker.add(frame);
    ST.create({
      trigger: wall, start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { inView = self.isActive; if (!inView) cards.forEach((c) => setLive(c, false)); },
    });
    project();

    // Pointer: tilt + glare on the card under the cursor; the wall slows while you look
    cards.forEach((c) => {
      c.el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || dragging) return;
        c.hover = true;
        c.el.classList.add('is-hover');
        row.classList.add('is-hovering');
        hovering = true;
      });
      c.el.addEventListener('pointermove', (e) => {
        if (!c.hover) return;
        const r = c.el.getBoundingClientRect();
        const nx = clamp((e.clientX - r.left) / r.width, 0, 1);
        const ny = clamp((e.clientY - r.top) / r.height, 0, 1);
        c.tx = nx * 2 - 1;
        c.ty = ny * 2 - 1;
        c.el.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
        c.el.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
      });
      c.el.addEventListener('pointerleave', () => {
        c.hover = false;
        c.tx = 0;
        c.ty = 0;
        c.el.classList.remove('is-hover');
        hovering = !!$('.fwc.is-hover', row);
        row.classList.toggle('is-hovering', hovering);
      });
    });
    if (finePointer.matches) {
      wall.addEventListener('pointermove', (e) => {
        const r = wall.getBoundingClientRect();
        wall.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        wall.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      }, { passive: true });
    }

    // Drag with inertia (mouse and touch); a drag never opens a reel
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, last: e.clientX, t: performance.now(), v: 0, moved: 0 };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.last;
      drag.moved += Math.abs(dx);
      if (!dragging && drag.moved > 6) {
        dragging = true;
        inertia = 0;
        stage.classList.add('is-dragging');
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      }
      const now = performance.now();
      if (dragging) {
        drag.v = drag.v * 0.7 + (dx / Math.max(1, now - drag.t)) * 1000 * 0.3;
        x += dx;
      }
      drag.t = now;
      drag.last = e.clientX;
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (dragging) {
        inertia = clamp(drag.v, -2600, 2600);
        dragging = false;
        stage.classList.remove('is-dragging');
        swallow = true;
        setTimeout(() => { swallow = false; }, 0);
      }
      drag = null;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    stage.addEventListener('click', (e) => { if (swallow) { e.preventDefault(); e.stopPropagation(); } }, true);
    stage.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) x -= e.deltaX; }, { passive: true });
    row.addEventListener('click', (e) => {
      const copy = e.target.closest('.fwc[data-of]');
      if (!copy) return;
      e.preventDefault();
      $('.fwc', originals[Number(copy.dataset.of)]).click();
    });

    // Buttons and keyboard
    $('[data-fw-prev]', wall)?.addEventListener('click', () => { shift += step; });
    $('[data-fw-next]', wall)?.addEventListener('click', () => { shift -= step; });
    toggle?.addEventListener('click', () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? 'Resume the moving reels' : 'Pause the moving reels');
    });
    row.addEventListener('focusin', (e) => {
      const el = e.target.closest('.fwc');
      if (!el || el.dataset.of) return;
      focusPause = true;
      stage.scrollLeft = 0;
      const base = byEl.get(el).orig;
      project();
      const nearest = [base, base + N, base + 2 * N].map((i) => cards[i]).sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
      shift = (-nearest.d * (W / 2)) / cos;
    });
    row.addEventListener('focusout', () => { setTimeout(() => { if (!row.contains(document.activeElement)) focusPause = false; }, 0); });
    row.addEventListener('keydown', (e) => {
      const el = e.target.closest('.fwc');
      if (!el || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      const o = byEl.get(el).orig + (e.key === 'ArrowRight' ? 1 : -1);
      $('.fwc', originals[(o + N) % N]).focus({ preventScroll: true });
    });

    // Scroll-driven extras: the ghost word slides, the cards fly in once, tilt swings into place
    if (ghost) {
      gsap.fromTo(ghost, { xPercent: 4 }, { xPercent: -16, ease: 'none', scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    if (stage.getBoundingClientRect().top > window.innerHeight * 0.82) {
      const sorted = cards.slice().sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
      const seen = sorted.filter((c) => Math.abs(c.d) < 1.3).map((c) => c.li);
      const rest = sorted.filter((c) => Math.abs(c.d) >= 1.3).map((c) => c.li);
      gsap.set(items, { '--in': 0 });
      track.style.setProperty('--fw-tilt', '0deg');
      ST.create({
        trigger: stage, start: 'top 82%', once: true,
        onEnter: () => {
          gsap.set(rest, { '--in': 1 });
          gsap.to(seen, { '--in': 1, duration: 1.4, stagger: 0.09, ease: 'power3.out' });
          gsap.to(track, { '--fw-tilt': `${tilt}deg`, duration: 1.8, ease: 'power3.out' });
        },
      });
    }
  });

  // Films pages: hero frames that play, a choreographed reel grid (entrance, scroll parallax, tilt and
  // glare, siblings dim, magnetic play button, previews), tiles that preview, and a marquee that
  // reacts to scrolling. Decoration only: the markup works without any of it.
  const reelPreview = (img) => {
    const m = img && /\/media\/reels\/([^/.]+)\.(?:jpg|webp)/.exec(img.getAttribute('src') || '');
    return m ? `/media/reels/${m[1]}-preview.mp4` : null;
  };
  const makeLoop = (host, url) => {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', src: url });
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    v.addEventListener('playing', () => v.classList.add('is-playing'));
    host.append(v);
    return v;
  };
  const stopLoop = (v) => { if (v) { v.pause(); v.classList.remove('is-playing'); } };
  const nudge = (v, a, b) => Math.min(b, Math.max(a, v));

  // Hero filmstrip frames play their reels
  const heroFrames = $$('.phero [data-hero-frame]').map((fr) => ({ fr, url: reelPreview($('img', fr)), v: null })).filter((x) => x.url);
  if (heroFrames.length && !saveData && 'IntersectionObserver' in window) {
    heroFrames.forEach((x, i) => {
      setTimeout(() => {
        if (!motionAllowed()) return;
        x.v = makeLoop(x.fr, x.url);
        x.v.play().catch(() => {});
      }, 1500 + i * 400);
    });
    new IntersectionObserver(([en]) => heroFrames.forEach((x) => {
      if (!x.v) return;
      if (en.isIntersecting && motionAllowed()) x.v.play().catch(() => {}); else x.v.pause();
    }), { threshold: 0.1 }).observe($('.phero'));
  }

  // Category tiles: tilt, glare and a live preview on hover
  if (finePointer.matches) {
    $$('.tiles .tile').forEach((tile) => {
      tile.insertAdjacentHTML('beforeend', '<span class="tile__glare" aria-hidden="true"></span>');
      const frame = $('.frame', tile);
      const url = reelPreview($('img', tile));
      let v = null;
      tile.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        tile.classList.add('is-hover');
        if (url && motionAllowed()) {
          if (!v) v = makeLoop(frame, url);
          v.play().catch(() => {});
        }
      });
      tile.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = tile.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        tile.style.setProperty('--rx', `${((0.5 - ny) * 9).toFixed(2)}deg`);
        tile.style.setProperty('--ry', `${((nx - 0.5) * 9).toFixed(2)}deg`);
        tile.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
        tile.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
      });
      tile.addEventListener('pointerleave', () => {
        tile.classList.remove('is-hover');
        tile.style.setProperty('--rx', '0deg');
        tile.style.setProperty('--ry', '0deg');
        stopLoop(v);
      });
    });
  }

  // Reel grids
  $$('.video-grid').forEach((grid) => {
    const reels = $$('.reel', grid);
    if (!reels.length) return;

    // Entrance: cards tip up out of the page row by row while their posters settle
    gsap.set(reels, { opacity: 0 });
    ST.batch(reels, {
      start: 'top 94%', once: true, interval: 0.1, batchMax: 8,
      onEnter: (batch) => {
        gsap.fromTo(batch, { opacity: 0, y: 90, rotateX: -16, scale: 0.92, transformPerspective: 1000, transformOrigin: '50% 100%' },
          { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 1.25, stagger: 0.09, ease: 'power4.out', clearProps: 'transform,opacity' });
        gsap.fromTo(batch.map((el) => $('picture', el)).filter(Boolean), { scale: 1.25 }, { scale: 1, duration: 1.8, stagger: 0.09, ease: 'power3.out', clearProps: 'transform' });
      },
    });

    // Scroll parallax: neighbouring columns drift in opposite directions
    const wide = window.matchMedia('(min-width: 900px)');
    const AMP = [24, -18, 30, -22];
    let cards = [];
    let inView = false;
    const docPos = (el) => { let x = 0; let y = 0; for (let n = el; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
    const measure = () => {
      cards = reels.filter((el) => el.offsetParent !== null).map((el) => ({ el, ...docPos(el), h: el.offsetHeight, v: '' }));
      const cols = [...new Set(cards.map((c) => Math.round(c.x / 12)))].sort((a, b) => a - b);
      cards.forEach((c) => { c.col = cols.indexOf(Math.round(c.x / 12)); });
    };
    measure();
    window.addEventListener('load', measure);
    window.addEventListener('resize', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(grid);
    $$('[data-filter-group] [data-filter]').forEach((b) => b.addEventListener('click', () => setTimeout(measure, 900)));
    ST.create({ trigger: grid, start: 'top bottom', end: 'bottom top', onToggle: (self) => { inView = self.isActive; } });
    gsap.ticker.add(() => {
      if (!inView || !wide.matches || !motionAllowed()) return;
      const mid = window.scrollY + window.innerHeight / 2;
      for (const c of cards) {
        const d = (c.y + c.h / 2 - mid) / window.innerHeight;
        if (Math.abs(d) > 1.25) continue;
        const v = (nudge(d, -1, 1) * AMP[c.col % AMP.length]).toFixed(1);
        if (v !== c.v) { c.v = v; c.el.style.setProperty('--par', v); }
      }
    });

    // Pointer: 3D tilt, travelling glare, magnetic play button, the others step back
    if (finePointer.matches) {
      reels.forEach((reel) => {
        const btn = $('.reel__btn', reel);
        const frame = $('.reel__frame', reel);
        if (!btn || !frame) return;
        frame.insertAdjacentHTML('beforeend', '<span class="reel__glare" aria-hidden="true"></span><span class="reel__prog" aria-hidden="true"><i></i></span>');
        btn.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse') return;
          reel.classList.add('is-hover');
          grid.classList.add('is-hovering');
        });
        btn.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse') return;
          const r = btn.getBoundingClientRect();
          const nx = nudge((e.clientX - r.left) / r.width, 0, 1);
          const ny = nudge((e.clientY - r.top) / r.height, 0, 1);
          frame.style.setProperty('--rx', `${((0.5 - ny) * 12).toFixed(2)}deg`);
          frame.style.setProperty('--ry', `${((nx - 0.5) * 12).toFixed(2)}deg`);
          frame.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
          frame.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
          frame.style.setProperty('--px', `${((nx - 0.5) * 34).toFixed(1)}px`);
          frame.style.setProperty('--py', `${((ny - 0.5) * 34).toFixed(1)}px`);
        });
        btn.addEventListener('pointerleave', () => {
          reel.classList.remove('is-hover');
          grid.classList.toggle('is-hovering', !!$('.reel.is-hover', grid));
          ['--rx', '--ry', '--px', '--py'].forEach((k) => frame.style.setProperty(k, k.startsWith('--r') ? '0deg' : '0px'));
        });
      });
    } else if ('IntersectionObserver' in window && !saveData) {
      // Touch screens: the reel crossing the middle of the screen plays its preview
      const loops = new WeakMap();
      const live = new Set();
      const off = (btn) => { live.delete(btn); btn.classList.remove('is-previewing'); stopLoop(loops.get(btn)); };
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const btn = en.target;
          if (en.isIntersecting && motionAllowed() && !(lb && lb.open)) {
            let v = loops.get(btn);
            if (!v && btn.dataset.preview) { v = makeLoop($('.reel__frame', btn), btn.dataset.preview); loops.set(btn, v); }
            if (v) { live.add(btn); btn.classList.add('is-previewing'); v.play().catch(() => {}); }
          } else off(btn);
        });
        // At most two reels play at once: the ones nearest the middle of the screen
        const mid = window.innerHeight / 2;
        const rank = [...live].sort((a, b) => {
          const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
          return Math.abs(ra.top + ra.height / 2 - mid) - Math.abs(rb.top + rb.height / 2 - mid);
        });
        rank.slice(2).forEach(off);
      }, { rootMargin: '-38% 0px -38% 0px' });
      $$('.reel__btn[data-preview]', grid).forEach((b) => io.observe(b));
    }
  });

  // Marquee: drifts on its own, hurries and turns with the scroll
  $$('[data-marquee]').forEach((m) => {
    const track = $('.reel-marquee__track', m);
    const anim = track && track.getAnimations ? track.getAnimations()[0] : null;
    if (!anim || !anim.updatePlaybackRate) return;
    let rate = 1; let dir = 1; let last = window.scrollY; let seen = false;
    new IntersectionObserver(([en]) => { seen = en.isIntersecting; }).observe(m);
    gsap.ticker.add(() => {
      const y = window.scrollY;
      const dy = y - last;
      last = y;
      if (!seen) return;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
      rate += (nudge(1 + Math.abs(dy) * 0.3, 1, 9) - rate) * 0.1;
      anim.updatePlaybackRate(dir * rate);
    });
  });

  // Safety net: when the animation clock barely runs (background tab, throttled preview,
  // struggling device), finish the opening animations so the first screen is never blank
  const startFrame = gsap.ticker.frame;
  setTimeout(() => {
    intros.forEach((tl) => tl.progress(1));
    if (gsap.ticker.frame - startFrame > 60) return;
    const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
    $$('.fw__item').forEach((li) => li.style.setProperty('--in', '1'));
    $$('.video-grid .reel').forEach((el) => gsap.set(el, { opacity: 1, clearProps: 'transform' }));
    $$('[data-fw-track]').forEach((t) => t.style.setProperty('--fw-tilt', `${window.matchMedia('(max-width: 640px)').matches ? -5 : -7}deg`));
    $$('[data-split]').filter(onScreen).forEach((el) => gsap.set($$('.wi', el), { yPercent: 0 }));
    $$('[data-reveal]').filter(onScreen).forEach((el) => {
      el.dataset.shown = '';
      gsap.set(el, { opacity: 1, clipPath: 'none' });
    });
    $$('[data-count]').filter(onScreen).forEach((el) => {
      el.dataset.shown = '';
      el.textContent = `${el.dataset.count}${el.dataset.suffix || ''}`;
    });
  }, 3200);

  html.classList.add('motion-ready');
  window.addEventListener('load', () => ST.refresh());
})();
