// AG Style Design — menu (lade op mobiel) en oplopende cijfers. Klein en zonder afhankelijkheden.
(function () {
  'use strict';
  const knop = document.querySelector('.menu-knop'), lade = document.getElementById('lade');
  if (!knop || !lade) return;
  const zet = open => {
    lade.classList.toggle('open', open);
    knop.setAttribute('aria-expanded', String(open));
    knop.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    knop.querySelector('use').setAttribute('href', 'iconen.svg#i-' + (open ? 'sluit' : 'menu'));
  };
  knop.addEventListener('click', () => zet(!lade.classList.contains('open')));
  lade.addEventListener('click', e => { if (e.target.closest('a')) zet(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') zet(false); });
})();

// oplopende cijfers: <strong data-tel="45" data-achter="K">45K</strong> telt op van 0 als het in beeld komt
// (zonder JavaScript of met "minder beweging" staat het eindgetal er gewoon)
(function () {
  'use strict';
  const cijfers = document.querySelectorAll('[data-tel]');
  if (!cijfers.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tel = (el, vertraging) => {
    const doel = Number(el.dataset.tel), achter = el.dataset.achter || '', duur = 1400;
    el.textContent = '0' + achter;
    setTimeout(() => {
      const t0 = performance.now();
      (function stap(t) {
        const p = Math.min(1, (t - t0) / duur), e = 1 - Math.pow(1 - p, 3);   // snel beginnen, zacht uitlopen
        el.textContent = Math.round(doel * e) + achter;
        if (p < 1) requestAnimationFrame(stap);
      })(t0);
    }, vertraging);
  };
  const io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); tel(e.target, [...cijfers].indexOf(e.target) * 150); }
  }, { threshold: 0.6 });
  for (const c of cijfers) { c.style.minWidth = (c.dataset.tel.length + (c.dataset.achter || '').length) + 'ch'; io.observe(c); }
})();

// plattegronden bij de soorten deuren: alleen bewegen zolang ze in beeld zijn
(function () {
  const plannen = document.querySelectorAll('.plan');
  if (!plannen.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(items => { for (const i of items) i.target.classList.toggle('speelt', i.isIntersecting); }, { threshold: 0.4 });
  for (const p of plannen) io.observe(p);
})();

// WhatsApp-knop op telefoons pas tonen als de hero (bijna) voorbij is (zie huisstijl.css)
(function () {
  const hero = document.querySelector('.hero, .pagina-kop');
  if (!hero || !('IntersectionObserver' in window)) return;
  document.body.classList.add('heeft-hero');
  new IntersectionObserver(([e]) => document.body.classList.toggle('voorbij-hero', !e.isIntersecting || e.intersectionRatio < 0.35), { threshold: [0, 0.35, 1] }).observe(hero);
})();
// …en ook niet zolang de materiaalstudio in beeld is: daar zou hij over "Verder in 3D" en de stalen vallen
(function () {
  const studio = document.querySelector('.materialen');
  if (!studio || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => document.body.classList.toggle('in-studio', e.isIntersecting), { rootMargin: '-15% 0px -15% 0px' }).observe(studio);
})();

// PREVIEW: rijen met rij-extra — tekst schuift zacht in, maatlijn tekent zich, foto zoomt heel licht mee tijdens het scrollen
(function () {
  const rijen = document.querySelectorAll('.rij-extra');
  if (!rijen.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(items => { for (const i of items) if (i.isIntersecting) { i.target.classList.add('in-beeld'); io.unobserve(i.target); } }, { threshold: 0.25 });
  for (const r of rijen) { r.classList.add('klaar'); io.observe(r); }
  const beelden = [...document.querySelectorAll('.rij-extra[data-beweeg] figure:not(.rij-detail) img')];
  let bezig = false;
  const zoom = () => {
    bezig = false;
    const vh = innerHeight;
    for (const img of beelden) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));   // 0 = net onder in beeld, 1 = net boven uit beeld
      img.style.transform = `scale(${(1.07 - 0.07 * p).toFixed(4)})`;
    }
  };
  addEventListener('scroll', () => { if (!bezig) { bezig = true; requestAnimationFrame(zoom); } }, { passive: true });
  zoom();
})();

