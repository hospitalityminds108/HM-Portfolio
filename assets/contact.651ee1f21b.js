/* Contact page: enquiry builder. Visitors pick what they need, see the message being written, and send it on
   WhatsApp or by email. Nothing is stored or sent by this site. */
(() => {
  'use strict';
  const form = document.querySelector('[data-ct-builder]');
  if (!form) return;
  const WA = '919967333442';
  const MAIL = 'nilesh@hospitalityminds.com';
  const preview = form.querySelector('[data-enquiry-preview]');
  const count = form.querySelector('[data-enquiry-count]');

  const picked = (name) => [...form.querySelectorAll(`[data-pick="${name}"][aria-pressed="true"]`)].map((b) => b.dataset.value);
  const val = (name) => (form.elements[name] ? form.elements[name].value.trim() : '');
  const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

  const compose = () => {
    const name = val('name');
    const property = val('property');
    const city = val('city');
    const services = picked('service');
    const type = picked('type')[0];
    const when = picked('when')[0];
    const note = val('message');
    const lines = ['Hi Hospitality Minds,'];
    let intro = name ? `I'm ${name}` : "I'm getting in touch";
    if (property) intro += ` from ${property}`;
    if (city) intro += `, ${city}`;
    lines.push(`${intro}.`);
    if (type || services.length) {
      let ask = type ? `We're a ${type.toLowerCase()}` : 'We';
      ask += services.length ? ` looking for ${list(services.map((s) => s.toLowerCase()))}` : ' would like to talk about a shoot';
      lines.push(`${ask}.`);
    }
    if (when) lines.push(`Timing: ${when.toLowerCase()}.`);
    if (note) lines.push(note);
    lines.push('Could we set up a quick call?');
    return lines;
  };

  const render = () => {
    const lines = compose();
    preview.innerHTML = '';
    lines.forEach((l, i) => {
      const p = document.createElement('p');
      p.textContent = l;
      if (i === lines.length - 1) p.className = 'is-last';
      preview.appendChild(p);
    });
    preview.classList.remove('is-pulse');
    void preview.offsetWidth;
    preview.classList.add('is-pulse');
    if (count) {
      const n = picked('service').length;
      count.textContent = n ? `${n} selected` : 'Pick any';
    }
  };

  form.querySelectorAll('[data-pick]').forEach((b) => {
    b.addEventListener('click', () => {
      const group = b.dataset.pick;
      const multi = b.closest('[data-multi]');
      if (!multi) form.querySelectorAll(`[data-pick="${group}"]`).forEach((x) => { if (x !== b) x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      render();
    });
  });
  form.addEventListener('input', render);

  form.querySelectorAll('[data-send]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const text = compose().join('\n');
      if (btn.dataset.send === 'whatsapp') {
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      } else {
        const subject = `Shoot enquiry${val('property') ? ` — ${val('property')}` : ''}`;
        window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      }
    });
  });

  // FAQ: smooth open and close
  document.querySelectorAll('.ct-faq details').forEach((d) => {
    const s = d.querySelector('summary');
    const body = d.querySelector('.ct-faq__a');
    s.addEventListener('click', (e) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      if (d.open) {
        body.style.height = `${body.scrollHeight}px`;
        requestAnimationFrame(() => { body.style.height = '0px'; });
        body.addEventListener('transitionend', () => { d.open = false; body.style.height = ''; }, { once: true });
      } else {
        d.open = true;
        body.style.height = '0px';
        requestAnimationFrame(() => { body.style.height = `${body.scrollHeight}px`; });
        body.addEventListener('transitionend', () => { body.style.height = ''; }, { once: true });
      }
    });
  });

  render();
})();
