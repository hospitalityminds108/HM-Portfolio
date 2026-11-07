/* Homepage Films: an accordion of film panels that widen on hover and play inline (YouTube controls off,
   ring progress, letterbox reveal). One film plays at a time. */
(() => {
  'use strict';
  const deck = document.querySelector('[data-hf-deck]');
  if (!deck) return;
  const panels = [...deck.querySelectorAll('[data-hf-panel]')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RING = 2 * Math.PI * 46;
  let active = null;   // { panel, player, timer }

  const fmt = (t) => { t = Math.max(0, Math.round(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

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

  const open = (p) => {
    if (deck.classList.contains('has-playing')) return;
    panels.forEach((x) => x.classList.toggle('is-open', x === p));
  };

  const setRing = (p, frac) => {
    const c = p.querySelector('.hf__ring-fg');
    if (c) c.style.strokeDashoffset = String(RING * (1 - frac));
    const line = p.querySelector('[data-hf-prog]');
    if (line) line.style.transform = `scaleX(${frac})`;
  };

  const stop = () => {
    if (!active) return;
    const { panel, player, timer } = active;
    clearInterval(timer);
    try { player.destroy(); } catch (e) { /* already gone */ }
    panel.querySelector('[data-hf-player]').innerHTML = '';
    panel.classList.remove('is-playing', 'is-paused', 'is-loading', 'is-muted');
    panel.querySelector('.hf__play').setAttribute('aria-label', panel.dataset.label);
    setRing(panel, 0);
    deck.classList.remove('has-playing');
    active = null;
  };

  const HOSTS = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];
  const fail = (p) => {
    const id = p.dataset.film;
    stop();
    panels.forEach((x) => x.classList.toggle('is-open', x === p));
    p.classList.add('is-error');
    let f = p.querySelector('.hf__fallback');
    if (!f) {
      f = document.createElement('a');
      f.className = 'hf__fallback btn';
      f.target = '_blank'; f.rel = 'noopener';
      f.textContent = 'Watch on YouTube';
      p.appendChild(f);
    }
    f.href = `https://www.youtube.com/watch?v=${id}`;
  };

  const play = (p, hostIdx = 0) => {
    if (active && active.panel === p) {
      const st = active.player.getPlayerState && active.player.getPlayerState();
      st === 1 ? active.player.pauseVideo() : active.player.playVideo();
      return;
    }
    stop();
    p.classList.remove('is-error');
    panels.forEach((x) => x.classList.toggle('is-open', x === p));
    deck.classList.add('has-playing');
    p.classList.add('is-playing', 'is-loading');
    const host = document.createElement('div');
    p.querySelector('[data-hf-player]').appendChild(host);
    const time = p.querySelector('[data-hf-time]');
    loadApi().then((YT) => {
      const player = new YT.Player(host, {
        host: HOSTS[hostIdx],
        videoId: p.dataset.film,
        playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, autoplay: 1, origin: location.origin },
        events: {
          onReady: (e) => e.target.playVideo(),
          onError: () => { if (hostIdx === 0) { stop(); play(p, 1); } else fail(p); },
          onStateChange: (e) => {
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) { p.classList.remove('is-loading', 'is-paused'); p.querySelector('.hf__play').setAttribute('aria-label', 'Pause film'); }
            if (e.data === S.PAUSED) { p.classList.add('is-paused'); p.querySelector('.hf__play').setAttribute('aria-label', 'Play film'); }
            if (e.data === S.BUFFERING) p.classList.add('is-loading');
            if (e.data === S.ENDED) stop();
          },
        },
      });
      const timer = setInterval(() => {
        if (!player.getCurrentTime) return;
        const t = player.getCurrentTime() || 0;
        const d = player.getDuration() || Number(p.dataset.filmSecs) || 1;
        setRing(p, Math.min(1, t / d));
        if (time) time.textContent = `${fmt(t)} / ${fmt(d)}`;
      }, 200);
      active = { panel: p, player, timer };
    });
  };

  panels.forEach((p) => {
    p.dataset.label = p.querySelector('.hf__play').getAttribute('aria-label');
    p.addEventListener('pointerenter', () => open(p));
    p.addEventListener('focusin', () => open(p));
    p.querySelector('.hf__play').addEventListener('click', (e) => { e.stopPropagation(); play(p); });
    p.querySelector('.hf__media').addEventListener('click', () => { if (p.classList.contains('is-open') || active) play(p); else open(p); });
    p.querySelector('[data-hf-close]').addEventListener('click', (e) => { e.stopPropagation(); stop(); });
    p.querySelector('[data-hf-mute]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!active || active.panel !== p) return;
      const m = !p.classList.contains('is-muted');
      m ? active.player.mute() : active.player.unMute();
      p.classList.toggle('is-muted', m);
      e.currentTarget.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    });
    p.addEventListener('keydown', (e) => { if (e.key === 'Escape' && active && active.panel === p) stop(); });
    // light that follows the pointer
    p.addEventListener('pointermove', (e) => {
      const r = p.getBoundingClientRect();
      p.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
      p.style.setProperty('--my', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
    });
  });
  // pause when the section leaves the screen
  new IntersectionObserver(([en]) => { if (!en.isIntersecting && active && active.player.pauseVideo) active.player.pauseVideo(); }, { threshold: 0 }).observe(deck);

  const intro = () => {
    const g = window.gsap;
    if (!g || reduce) return;
    if (window.ScrollTrigger) g.registerPlugin(window.ScrollTrigger);
    g.fromTo(panels, { clipPath: 'inset(100% 0% 0% 0% round 22px)', y: 60 }, {
      clipPath: 'inset(0% 0% 0% 0% round 22px)', y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath,transform',
      scrollTrigger: { trigger: deck, start: 'top 82%', once: true },
    });
    g.fromTo(deck.querySelectorAll('.hf__index'), { yPercent: 120, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.12, delay: 0.35,
      scrollTrigger: { trigger: deck, start: 'top 82%', once: true },
    });
  };
  if (document.readyState === 'complete') intro(); else window.addEventListener('load', intro);
})();
