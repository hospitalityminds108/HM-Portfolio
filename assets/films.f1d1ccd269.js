/* Films page: YouTube films in a custom player (YouTube's own controls off), cinema mode, card motion. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stage = $('[data-cinema-stage]');
  if (!stage) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = $$('[data-film]');
  const frame = $('.cinema__frame', stage);
  const host = $('[data-cinema-player]', stage);
  const poster = $('[data-cinema-poster]', stage);
  const posterImg = $('img', poster);
  const ambient = $('[data-cinema-ambient]');
  const ui = {
    toggle: $('[data-cinema-toggle]', stage), play: $('[data-cinema-play]', stage), mute: $('[data-cinema-mute]', stage),
    fs: $('[data-cinema-fs]', stage), track: $('[data-cinema-track]', stage), prog: $('[data-cinema-prog]', stage),
    buf: $('[data-cinema-buf]', stage), cur: $('[data-cinema-cur]', stage), dur: $('[data-cinema-dur]', stage),
    tip: $('[data-cinema-tip]', stage), title: $('[data-cinema-title]'), num: $('[data-cinema-num]'), len: $('[data-cinema-len]'),
    prev: $('[data-cinema-prev]'), next: $('[data-cinema-next]'), upnext: $('[data-cinema-upnext]', stage),
  };

  let index = 0;
  let player = null;
  let ready = false;
  let wantPlay = false;
  let tick = 0;
  let idle = 0;
  let upTimer = 0;
  let duration = 0;

  const fmt = (t) => {
    t = Math.max(0, Math.round(t || 0));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  };
  const film = (i) => cards[(i + cards.length) % cards.length];
  const visible = () => cards.filter((c) => !c.closest('[hidden]'));

  /* ---- YouTube IFrame API, loaded on first play ---- */
  let apiPromise = null;
  const loadApi = () => apiPromise || (apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  }));

  const vars = { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, cc_load_policy: 0, autoplay: 1, origin: location.origin };

  // YouTube refuses some films on the privacy host (e.g. claimed music): retry on youtube.com, then offer a link
  const HOSTS = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];
  let hostIdx = 0;
  const retried = new Set();
  const fallback = document.createElement('div');
  fallback.className = 'cinema__fallback';
  fallback.innerHTML = '<p>This film can’t play here.</p><a class="btn" target="_blank" rel="noopener">Watch on YouTube</a>';
  frame.appendChild(fallback);
  const onError = () => {
    const id = film(index).dataset.film;
    if (!retried.has(id) && hostIdx === 0) {
      retried.add(id);
      hostIdx = 1;
      try { player.destroy(); } catch (e) { /* gone */ }
      player = null; ready = false; host.innerHTML = '';
      wantPlay = true;
      createPlayer(id).then(() => { if (wantPlay) player.loadVideoById(id); });
      return;
    }
    stopTick();
    fallback.querySelector('a').href = `https://www.youtube.com/watch?v=${id}`;
    stage.dataset.state = 'error';
  };

  const createPlayer = (id) => loadApi().then((YT) => new Promise((resolve) => {
    const mount = document.createElement('div');
    host.appendChild(mount);
    player = new YT.Player(mount, {
      host: HOSTS[hostIdx],
      videoId: id,
      playerVars: vars,
      events: {
        onReady: () => { ready = true; resolve(); },
        onStateChange: onState,
        onError,
      },
    });
  }));

  /* ---- state ---- */
  const setState = (s) => { stage.dataset.state = s; document.documentElement.classList.toggle('is-cinema', s === 'playing' && inView); };
  const onState = (e) => {
    const S = window.YT.PlayerState;
    if (e.data === S.PLAYING) {
      duration = player.getDuration() || duration;
      ui.dur.textContent = fmt(duration);
      setState('playing');
      ui.play.setAttribute('aria-label', 'Pause');
      ui.toggle.setAttribute('aria-label', 'Pause film');
      startTick();
      nudge();
    } else if (e.data === S.PAUSED) {
      setState('paused');
      ui.play.setAttribute('aria-label', 'Play');
      ui.toggle.setAttribute('aria-label', 'Play film');
      stopTick();
    } else if (e.data === S.BUFFERING) {
      stage.dataset.state = 'buffering';
    } else if (e.data === S.ENDED) {
      stopTick();
      setState('ended');
      upNext();
    }
  };

  const startTick = () => {
    stopTick();
    const step = () => {
      if (player && ready) {
        const t = player.getCurrentTime() || 0;
        const d = duration || player.getDuration() || 1;
        const p = Math.min(1, t / d);
        ui.prog.style.transform = `scaleX(${p})`;
        ui.track.style.setProperty('--p', p);
        ui.buf.style.transform = `scaleX(${player.getVideoLoadedFraction() || 0})`;
        ui.cur.textContent = fmt(t);
        ui.track.setAttribute('aria-valuenow', String(Math.round(p * 100)));
        ui.track.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(d)}`);
      }
    };
    step();
    tick = setInterval(step, 200);
  };
  const stopTick = () => clearInterval(tick);

  /* ---- actions ---- */
  const play = () => {
    clearUpNext();
    const id = film(index).dataset.film;
    stage.dataset.state = 'loading';
    if (!player) { wantPlay = true; createPlayer(id).then(() => { if (wantPlay) player.playVideo(); }); return; }
    if (ready) player.playVideo();
  };
  const pause = () => { wantPlay = false; if (player && ready) player.pauseVideo(); };
  const toggle = () => (stage.dataset.state === 'playing' || stage.dataset.state === 'buffering' ? pause() : play());

  const select = (i, autoplay) => {
    index = (i + cards.length) % cards.length;
    const c = film(index);
    cards.forEach((x) => x.classList.toggle('is-current', x === c));
    cards.forEach((x) => (x === c ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current')));
    const thumb = c.dataset.filmThumb;
    duration = Number(c.dataset.filmSecs) || 0;
    const swap = () => {
      posterImg.src = `${thumb}-1280.webp`;
      posterImg.srcset = `${thumb}-640.webp 640w, ${thumb}-1280.webp 1280w`;
      posterImg.closest('picture').style.backgroundColor = c.dataset.filmColor;
      if (ambient) ambient.src = `${thumb}-640.webp`;
      ui.title.textContent = c.dataset.filmTitle;
      ui.num.textContent = c.dataset.filmN;
      ui.len.textContent = c.dataset.filmLen;
      ui.dur.textContent = c.dataset.filmLen;
      ui.cur.textContent = '0:00';
      ui.prog.style.transform = 'scaleX(0)';
      ui.buf.style.transform = 'scaleX(0)';
      ui.track.style.setProperty('--p', 0);
    };
    clearUpNext();
    const first = !select.done;
    select.done = true;
    swap();   // content changes at once; the fade below is decoration only
    if (!reduce && !first) {
      [poster, document.querySelector('.cinema__meta-in')].forEach((el) => {
        if (!el) return;
        el.classList.remove('is-swapping');
        void el.offsetWidth;
        el.classList.add('is-swapping');
      });
    }
    if (player && ready) {
      autoplay ? player.loadVideoById(c.dataset.film) : player.cueVideoById(c.dataset.film);
      if (!autoplay) setState('idle');
    } else if (autoplay) play();
    else setState('idle');
  };

  const seekTo = (frac) => {
    if (!player || !ready) return;
    const d = duration || player.getDuration();
    player.seekTo(Math.max(0, Math.min(1, frac)) * d, true);
  };
  const seekBy = (s) => { if (player && ready) player.seekTo(Math.max(0, player.getCurrentTime() + s), true); };

  const setMute = (m) => {
    if (!player || !ready) return;
    m ? player.mute() : player.unMute();
    stage.classList.toggle('is-muted', m);
    ui.mute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
  };

  /* ---- up next after a film ends ---- */
  const clearUpNext = () => { clearTimeout(upTimer); stage.classList.remove('is-upnext'); };
  const upNext = () => {
    const list = visible();
    const pos = list.indexOf(film(index));
    const nxt = list[(pos + 1) % list.length];
    if (!nxt || nxt === film(index)) return;
    ui.upnext.querySelector('[data-upnext-title]').textContent = `${nxt.dataset.filmTitle} ${nxt.dataset.filmN}`;
    stage.classList.add('is-upnext');
    upTimer = setTimeout(() => select(cards.indexOf(nxt), true), 5000);
  };

  /* ---- controls ---- */
  ui.toggle.addEventListener('click', toggle);
  ui.play.addEventListener('click', toggle);
  ui.mute.addEventListener('click', () => setMute(!stage.classList.contains('is-muted')));
  ui.upnext.querySelector('[data-upnext-go]').addEventListener('click', () => { clearTimeout(upTimer); const l = visible(); select(cards.indexOf(l[(l.indexOf(film(index)) + 1) % l.length]), true); });
  ui.upnext.querySelector('[data-upnext-cancel]').addEventListener('click', clearUpNext);
  const step = (dir) => { const l = visible(); const pos = l.indexOf(film(index)); select(cards.indexOf(l[(pos + dir + l.length) % l.length]), stage.dataset.state === 'playing'); };
  ui.prev.addEventListener('click', () => step(-1));
  ui.next.addEventListener('click', () => step(1));

  const fsSupported = !!(frame.requestFullscreen || frame.webkitRequestFullscreen);
  if (!fsSupported) ui.fs.hidden = true;
  ui.fs.addEventListener('click', () => {
    const el = document.fullscreenElement || document.webkitFullscreenElement;
    if (el) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame);
  });
  document.addEventListener('fullscreenchange', () => stage.classList.toggle('is-fs', !!document.fullscreenElement));

  // scrubbing
  const fracAt = (x) => { const r = ui.track.getBoundingClientRect(); return (x - r.left) / r.width; };
  let dragging = false;
  ui.track.addEventListener('pointerdown', (e) => { dragging = true; ui.track.setPointerCapture(e.pointerId); seekTo(fracAt(e.clientX)); });
  ui.track.addEventListener('pointermove', (e) => {
    const f = Math.max(0, Math.min(1, fracAt(e.clientX)));
    ui.tip.textContent = fmt(f * (duration || 0));
    ui.tip.style.left = `${f * 100}%`;
    if (dragging) seekTo(f);
  });
  ui.track.addEventListener('pointerup', () => { dragging = false; });
  ui.track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { seekBy(5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { seekBy(-5); e.preventDefault(); }
  });

  // keyboard on the stage
  stage.addEventListener('keydown', (e) => {
    if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { toggle(); e.preventDefault(); }
    else if (k === 'arrowright' && e.target === stage) { seekBy(5); e.preventDefault(); }
    else if (k === 'arrowleft' && e.target === stage) { seekBy(-5); e.preventDefault(); }
    else if (k === 'm') setMute(!stage.classList.contains('is-muted'));
    else if (k === 'f' && fsSupported) ui.fs.click();
  });

  // controls hide while playing and the pointer rests
  const nudge = () => {
    stage.classList.add('is-active');
    clearTimeout(idle);
    idle = setTimeout(() => { if (stage.dataset.state === 'playing') stage.classList.remove('is-active'); }, 2600);
  };
  ['pointermove', 'pointerdown', 'focusin', 'keydown'].forEach((ev) => stage.addEventListener(ev, nudge));

  // cinema mode only while the stage is on screen
  let inView = true;
  new IntersectionObserver(([en]) => {
    inView = en.intersectionRatio > 0.45;
    document.documentElement.classList.toggle('is-cinema', inView && stage.dataset.state === 'playing');
  }, { threshold: [0, 0.45, 1] }).observe(stage);

  /* ---- film cards ---- */
  cards.forEach((c, i) => {
    c.addEventListener('click', () => {
      select(i, true);
      const top = stage.getBoundingClientRect().top + window.scrollY - (window.innerHeight - stage.offsetHeight) / 2;
      if (window.__lenis) window.__lenis.scrollTo(Math.max(0, top), { duration: 1.2 });
      else window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    });
    if (reduce || !window.matchMedia('(hover: hover)').matches) return;
    const media = c.querySelector('.film-card__media');
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
      c.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
      c.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      c.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
      if (media) media.style.setProperty('--sx', `${(-x * 14).toFixed(1)}px`);
    });
    c.addEventListener('pointerleave', () => { ['--rx', '--ry', '--mx', '--my'].forEach((p) => c.style.removeProperty(p)); if (media) media.style.removeProperty('--sx'); });
  });

  /* ---- entrance motion ---- */
  const intro = () => {
    const g = window.gsap;
    if (!g || reduce) return;
    if (window.ScrollTrigger) g.registerPlugin(window.ScrollTrigger);
    g.fromTo(frame, { clipPath: 'inset(12% 9% 12% 9% round 28px)', scale: 0.96 }, {
      clipPath: 'inset(0% 0% 0% 0% round 18px)', scale: 1, ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top 92%', end: 'top 35%', scrub: 0.6 },
    });
    g.fromTo('.cinema__ambient', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top 85%', end: 'top 40%', scrub: true } });
    if (window.ScrollTrigger) {
      window.ScrollTrigger.batch('.film-card', {
        start: 'top 92%',
        once: true,
        onEnter: (els) => g.fromTo(els, { opacity: 0, y: 60, rotateX: -12 }, { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, clearProps: 'opacity,transform' }),
      });
    }
  };
  if (document.readyState === 'complete') intro(); else window.addEventListener('load', intro);

  select(0, false);
})();
