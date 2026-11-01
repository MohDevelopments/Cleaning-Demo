/* Cleaning Demo: vanilla JS, no dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = n => '$' + Math.round(n).toLocaleString('en-US');

  /* ---------- Theme (persisted, storage-safe) ---------- */
  const root = document.documentElement;
  const themeBtn = $('#theme');
  function setTheme(t) {
    root.dataset.theme = t;
    themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    themeBtn.setAttribute('aria-pressed', t === 'dark');
    try { localStorage.setItem('theme', t); } catch (e) { /* storage blocked */ }
  }
  setTheme(root.dataset.theme);
  themeBtn.onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- Mobile menu + active section ---------- */
  const menu = $('#menu'), burger = $('#burger');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  };
  burger.onclick = () => setMenu(!menu.classList.contains('open'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  const links = $$('a', menu);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------- Hero bubbles ---------- */
  if (!reduceMotion) {
    const field = $('#bubbles');
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('i');
      b.style.cssText = `--s:${10 + Math.random() * 38}px;left:${Math.random() * 100}%;` +
        `animation-duration:${6 + Math.random() * 7}s;animation-delay:${-Math.random() * 10}s`;
      field.append(b);
    }
  }

  /* ---------- Price estimator ---------- */
  const RATES = { standard: [60, 18, 22], deep: [110, 30, 38], move: [140, 36, 44] }; // base, bedroom, bathroom
  const DISCOUNT = { once: 0, weekly: .15, biweekly: .10, monthly: .05 };
  const NAMES = { standard: 'Everyday', deep: 'Deep', move: 'Move-out' };
  const form = $('#est'), totalEl = $('#total');
  let shown = 0, raf, last;

  function tween(to) {
    cancelAnimationFrame(raf);
    const from = shown, t0 = performance.now();
    (function step(t) {
      const p = reduceMotion ? 1 : Math.min((t - t0) / 350, 1);
      shown = from + (to - from) * (1 - Math.pow(1 - p, 3));
      totalEl.textContent = money(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    })(t0);
  }

  function calc() {
    const d = new FormData(form);
    const svc = d.get('svc'), beds = +d.get('beds'), baths = +d.get('baths');
    const [base, room, bath] = RATES[svc];
    const extras = $$('[name=add]:checked', form);
    const subtotal = base + beds * room + baths * bath + extras.reduce((s, a) => s + +a.value, 0);
    const discount = subtotal * DISCOUNT[d.get('freq')];

    $('#bedsV').textContent = beds;
    $('#bathsV').textContent = baths;
    $('#lines').innerHTML = [
      ['Base clean', base],
      [`${beds} bedroom${beds > 1 ? 's' : ''}`, beds * room],
      [`${baths} bathroom${baths > 1 ? 's' : ''}`, baths * bath],
      ...extras.map(a => [a.dataset.n, +a.value])
    ].map(([k, v]) => `<li><span>${k}</span><b>${money(v)}</b></li>`).join('');
    $('#save').textContent = discount ? `Repeat discount: -${money(discount)}` : 'Choose a schedule to save up to 15%';

    last = { svc, beds, baths, total: subtotal - discount };
    tween(last.total);
  }
  form.addEventListener('input', calc);
  calc();

  // Service tiles preload the estimator, then scroll to it
  $$('[data-svc]').forEach(btn => btn.addEventListener('click', () => {
    form.elements.svc.value = btn.dataset.svc;
    const wanted = (btn.dataset.add || '').split(',');
    $$('[name=add]', form).forEach(a => { a.checked = wanted.includes(a.dataset.k); });
    calc();
    $('#estimate').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    toast(`${NAMES[btn.dataset.svc]} clean loaded into the estimator`);
  }));

  /* ---------- Booking dialog ---------- */
  const dlg = $('#dlg'), book = $('#book'), done = $('#done');
  book.elements.day.min = new Date().toISOString().slice(0, 10);

  function openBooking(fromEstimate) {
    book.reset();
    book.hidden = false;
    done.hidden = true;
    $('#sum').textContent = fromEstimate
      ? `${NAMES[last.svc]} clean · ${last.beds} bed · ${last.baths} bath · ${money(last.total)}`
      : 'Pick a day and we’ll hold your slot.';
    dlg.showModal();
  }
  $$('[data-book]').forEach(b => b.addEventListener('click', () => openBooking(b.dataset.book === 'est')));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // backdrop click

  book.addEventListener('submit', e => {
    e.preventDefault();
    $('#who').textContent = new FormData(book).get('name');
    book.hidden = true;
    done.hidden = false;
    toast('Booking confirmed (demo)');
  });

  /* ---------- Before / after slider ---------- */
  const ba = $('.ba'), cmp = $('#cmp');
  const sync = () => ba.style.setProperty('--p', cmp.value + '%');
  cmp.addEventListener('input', sync);
  sync();

  $('#play').addEventListener('click', () => {
    let v = 0;
    (function step() {
      v += reduceMotion ? 100 : 1.6;
      cmp.value = Math.min(v, 100);
      sync();
      if (v < 100) requestAnimationFrame(step);
    })();
  });

  /* ---------- Reviews carousel ---------- */
  const track = $('.tr'), slides = $$('.q', track), dotsBox = $('.dots');
  let idx = 0, auto;
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', `Show review ${i + 1}`);
    d.onclick = () => go(i);
    dotsBox.append(d);
  });
  function go(i) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    $$('button', dotsBox).forEach((d, j) => d.setAttribute('aria-current', j === idx));
  }
  const play = () => { if (!reduceMotion) auto = setInterval(() => go(idx + 1), 6000); };
  const stop = () => clearInterval(auto);
  $('#prev').onclick = () => go(idx - 1);
  $('#next').onclick = () => go(idx + 1);
  const rv = $('.rv');
  ['mouseenter', 'focusin'].forEach(ev => rv.addEventListener(ev, stop));
  ['mouseleave', 'focusout'].forEach(ev => rv.addEventListener(ev, () => { stop(); play(); }));
  go(0);
  play();

  $('#yr').textContent = new Date().getFullYear();
})();
