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
