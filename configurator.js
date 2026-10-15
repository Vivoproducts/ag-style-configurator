// AG Style Design — configurator: keuzepaneel, 2D-tekening met maten, aanvraag.
// Alle keuzes komen uit DEUR.KEUZES (deur-vorm.js); de 3D-weergave laadt apart (configurator-3d.js).
const D = window.DEUR;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ico = n => `<svg class="ico" aria-hidden="true"><use href="iconen.svg#i-${n}"/></svg>`;
const WHATSAPP = '31612717417', MAIL = 'info@agstyledesign.nl';

let S = D.uitAdres(location.search);
let G = D.bouwDeur(S);
let drie = null, weergave = '3d', open = false;

// ---------- iconen voor het type deur (eigen lijntekeningen) ----------
const TYPE_ICO = {
  taats: '<svg viewBox="0 0 48 48"><rect x="15" y="6" width="18" height="36" rx="1"/><circle cx="19" cy="42" r="1.6" class="vol"/><path d="M19 6v36M8 24c0-4 3-8 7-9M40 24c0 4-3 8-7 9" class="dun"/></svg>',
  scharnier: '<svg viewBox="0 0 48 48"><rect x="12" y="6" width="22" height="36" rx="1"/><path d="M12 12v4M12 32v4" class="dik"/><path d="M34 42c4-4 6-9 6-15" class="dun"/></svg>',
  schuif: '<svg viewBox="0 0 48 48"><path d="M4 6h40" class="dik"/><rect x="8" y="9" width="20" height="33" rx="1"/><path d="M32 24h10M38 20l4 4-4 4" class="dun"/></svg>',
  vast: '<svg viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="1"/><path d="M24 6v36M8 20h32" class="dun"/></svg>',
  doorgang: '<svg viewBox="0 0 48 48"><path d="M17 42V15h14v27M6 42V6h36v36"/><path d="M6 15h36" class="dun"/></svg>',
};

// iconen voor de grepen: stijl van de deur met de greep ernaast (eigen lijntekening)
function greepIco(g) {
  const l = g.lengte === null ? 34 : Math.min(34, Math.max(10, g.lengte / 3)), y0 = 24 - l / 2, y1 = 24 + l / 2;
  const v = {
    hoek: `<rect x="20" y="${y0}" width="4" height="${l}" class="vol"/>`,
    beugel: `<path d="M20 ${y0}h6v${l}h-6"/>`,
    buis: `<path d="M20 ${y0 + 2}h6M20 ${y1 - 2}h6"/><path d="M27 ${y0}v${l}" class="dik"/>`,
    koker: `<path d="M20 ${y0 + 2}h5M20 ${y1 - 2}h5"/><rect x="25" y="${y0}" width="3.5" height="${l}" class="vol"/>`,
    maan: '<path d="M20 17a7 7 0 0 1 0 14z" class="vol"/>',
    klink: '<circle cx="22.5" cy="24" r="2.6"/><path d="M22.5 24h12" class="dik"/>',
    kom: '<rect x="21" y="16" width="4" height="16" rx="1" class="vol"/>',
    geen: '',
  }[g.vorm];
  return `<svg viewBox="0 0 48 48"><path d="M16 4v40" class="dik"/>${v}</svg>`;
}

// ---------- stappen ----------
const STAPPEN = [
  // volgorde (Thomas, 14 okt): eerst de vorm, dat onderscheidt AG; daarna type en maat
  { id: 'vorm', titel: 'Vorm', nieuw: true, samenvatting: () => D.vind('vorm', S.vorm).naam },
  { id: 'type', titel: 'Type en maat', samenvatting: () => `${D.vind('type', S.type).naam}${S.type !== 'vast' && S.deuren === 2 ? ', dubbel' : ''} · ${G.W} × ${S.h} cm` },
  { id: 'indeling', titel: 'Indeling', samenvatting: () => D.vind('indeling', S.indeling).naam },
  { id: 'afwerking', titel: 'Kleur en glas', samenvatting: () => `${D.vind('kleur', S.kleur).naam} · ${D.vind('glas', S.glas).naam} glas` },
  { id: 'aanvraag', titel: 'Aanvraag', samenvatting: () => 'Inclusief inmeten en montage' },
];

const knop = (naam, waarde, inhoud, extra = '') => `<button type="button" class="kz" data-zet="${naam}" data-waarde="${esc(waarde)}" aria-pressed="false" ${extra}>${inhoud}</button>`;
const groep = (titel, inhoud, als = '', uitleg = '') => `<div class="cfg-groep"${als ? ` data-als="${als}"` : ''}><p class="cfg-groep-titel">${titel}</p>${inhoud}${uitleg ? `<p class="cfg-uitleg">${uitleg}</p>` : ''}</div>`;
const getal = (naam, label, min, max, eenheid = 'cm') => `<label class="getal"><span>${label}</span><span class="getal-veld"><button type="button" data-stap-getal="${naam}" data-d="-1" aria-label="${label} kleiner">−</button><input type="number" inputmode="numeric" data-getal="${naam}" min="${min}" max="${max}" step="1"><button type="button" data-stap-getal="${naam}" data-d="1" aria-label="${label} groter">+</button><em>${eenheid}</em></span></label>`;
const schuif = (naam, label, min, max) => `<label class="schuif"><span>${label} <output data-uit="${naam}"></output></span><input type="range" data-schuif="${naam}" min="${min}" max="${max}" step="1"></label>`;

function inhoud(id) {
  if (id === 'type') return [
    groep('Wat wil je laten maken?', `<div class="kz-raster kz-5">${D.KEUZES.type.map(t => knop('type', t.code, `${TYPE_ICO[t.code]}<span>${t.naam}</span>`, `title="${esc(t.uitleg)}"`)).join('')}</div>`),
    groep('Aantal deuren', `<div class="kz-rij">${knop('deuren', 1, 'Enkel')}${knop('deuren', 2, 'Dubbel')}</div>`, 'type!=vast&type!=doorgang'),
    groep('Zijpanelen', `<div class="kz-rij">${D.KEUZES.zij.map(z => knop('zij', z.code, z.naam, z.code === 'geen' ? 'data-als="type!=doorgang"' : '')).join('')}</div>`),
    groep('Bovenlicht', `<label class="schakel"><input type="checkbox" data-vink="bovenlicht"><span data-als="type!=doorgang&type!=vast">Glas boven de deur</span><span data-als="type=vast">Glaspaneel erboven</span><span data-als="type=doorgang">Glaspaneel boven de doorgang</span></label>`, 'type!=schuif&vorm!=schuin&vorm!=afgeschuind'),
    groep('Maten (indicatie)', `<div class="getallen"><span class="getal-totaal">${getal('totaal', 'Totale breedte', 40, 900)}</span><span data-als="type!=doorgang&type!=vast">${getal('db', 'Breedte deur', 40, 150)}</span><span data-als="type=vast">${getal('db', 'Breedte wand', 40, 400)}</span><span data-als="type=doorgang">${getal('db', 'Breedte doorgang', 40, 400)}</span>${getal('h', 'Hoogte', 120, 360)}<span data-als="zij!=geen">${getal('zb', 'Breedte zijpaneel', 20, 300)}</span><span data-als="bovenlicht=true&type!=doorgang">${getal('hd', 'Hoogte deur', 120, 330)}</span><span data-als="bovenlicht=true&type=doorgang">${getal('hd', 'Hoogte doorgang', 120, 330)}</span><span data-als="bovenlicht=true&type=doorgang">${getal('bp', 'Hoogte glaspaneel', 30, 240)}</span></div>`, '', 'Ahmet komt langs en meet alles exact in. Je hoeft het hier niet op de millimeter te weten.'),
    // vaste wand: meestal kiezen mensen hier zelf staanders en liggers, dus meteen bij de maten (zet de indeling op "zelf")
    groep('Verdeling van de wand', `<div class="getallen">${getal('staanders', 'Staanders per paneel', 0, 4, '')}${getal('liggers', 'Liggers', 0, 8, '')}</div>`, 'type=vast', 'Staanders lopen van onder naar boven, liggers van links naar rechts. Liever een boog of een figuur? Kies dan een indeling in stap 3.'),
  ].join('');
  if (id === 'vorm') return [
    `<p class="cfg-lead">Hier maakt AG Style Design het verschil: <strong>elke vorm is mogelijk</strong>, ook onder de trap of op zolder.</p>`,
    groep('Vorm van de bovenkant', `<div class="kz-raster kz-3" data-iconen="vorm">${D.KEUZES.vorm.map(v => knop('vorm', v.code, `<span class="kz-ico"></span><span>${v.naam}</span>`, `title="${esc(v.uitleg)}"`)).join('')}</div>`),
    groep('Welke kant is lager?', `<div class="kz-rij">${knop('kant', 'links', 'Links')}${knop('kant', 'rechts', 'Rechts')}</div>${schuif('laag', 'Hoogte aan de lage kant', 60, 350)}<p class="cfg-uitleg" id="trapHelling"></p>`, 'vorm=schuin'),
    groep('Welke hoek is schuin?', `<div class="kz-rij">${knop('kant', 'links', 'Links')}${knop('kant', 'rechts', 'Rechts')}</div>${schuif('ab', 'Breedte van de schuine hoek', 10, 200)}${schuif('ah', 'Hoogte van de schuine hoek', 10, 200)}`, 'vorm=afgeschuind'),
    `<div class="cfg-eigen">${ico('vorm')}<p><strong>Een vorm die er niet tussen staat?</strong> Geen probleem. Stuur bij de aanvraag een schets of foto mee, dan maakt Ahmet hem precies zo.</p></div>`,
  ].join('');
  if (id === 'indeling') return [
    ...[['lijnen', 'Lijnen'], ['bogen', 'Bogen'], ['figuren', 'Figuren en eigen ontwerp']].map(([g, titel]) => groep(titel, `<div class="kz-raster kz-4" data-iconen="indeling">${D.KEUZES.indeling.filter(i => i.groep === g).map(i => knop('indeling', i.code, `<span class="kz-ico"></span><span>${i.naam}</span>`)).join('')}</div>`)),
    `<p class="cfg-uitleg" data-als="indeling=eigen">Stuur bij de aanvraag een schets of foto van je eigen ontwerp mee. Ahmet maakt hem precies zo.</p>`,
    groep('Spiegelen', `<label class="schakel"><input type="checkbox" data-vink="spiegel"><span>Figuur aan de andere kant</span></label>`, `indeling=${D.SPIEGELBAAR.join('|')}&deuren=1`),
    groep('Of deel zelf in', `<div class="kz-rij">${knop('indeling', 'zelf', 'Zelf indelen')}</div><div class="getallen" data-als="indeling=zelf">${getal('liggers', 'Liggers', 0, 8, '')}${getal('staanders', 'Staanders', 0, 4, '')}</div>`),
    groep('Zijpanelen', `<p class="cfg-sub">Staanders</p><div class="kz-rij">${['gelijk', 0, 1, 2, 3, 4].map(v => knop('zs', v, v === 'gelijk' ? 'Als deur' : v)).join('')}</div><p class="cfg-sub">Liggers</p><div class="kz-rij">${['gelijk', 0, 1, 2, 3, 4, 5, 6].map(v => knop('zl', v, v === 'gelijk' ? 'Als deur' : v)).join('')}</div>`, 'zij!=geen', 'Handig bij brede zijpanelen. "Als deur" houdt de lijnen van deur en zijpanelen precies gelijk.'),
    groep('Onderkant', `<label class="schakel"><input type="checkbox" data-vink="onderplaat"><span>Dichte stalen plaat onderin</span></label>`),
    `<p class="cfg-uitleg">De liggers lopen door over de deur en de zijpanelen, zodat alle lijnen precies op elkaar aansluiten.</p>`,
  ].join('');
  if (id === 'afwerking') return [
    groep('Kleur van het staal', `<div class="kz-raster kz-staal">${D.KEUZES.kleur.map(k => knop('kleur', k.code, `<span class="staal-staal" style="--c:${k.hex}"></span><span>${k.naam}<small>${k.sub}</small></span>`)).join('')}</div>`),
    groep('Glas', `<div class="kz-raster kz-glas">${D.KEUZES.glas.map(g => knop('glas', g.code, `<span class="glas-staal glas-${g.code}" style="--c:${g.hex}"></span><span>${g.naam}</span>`)).join('')}</div>`, '', 'Alle glassoorten zijn veiligheidsglas. Andere soorten (zoals draadglas of glas-in-lood) zijn ook mogelijk, vraag ernaar.'),
    groep('Structuur', `<div class="kz-rij">${D.KEUZES.structuur.map(k => knop('structuur', k.code, k.naam)).join('')}</div>`),
    groep('Greep', `<div class="kz-raster kz-4">${D.KEUZES.greep.map(g => knop('greep', g.code, `${greepIco(g)}<span>${g.naam}</span>`)).join('')}</div>`, 'type!=vast&type!=doorgang'),
    groep('Comfort', `<label class="schakel"><input type="checkbox" data-vink="softclose"><span>Softclose: de deur sluit zacht en stil</span></label>`, 'type!=vast&type!=doorgang'),
    groep('Scharnierkant', `<div class="kz-rij">${knop('draai', 'links', 'Links')}${knop('draai', 'rechts', 'Rechts')}</div>`, 'deuren=1&type!=vast&type!=doorgang&type!=schuif'),
    groep('Beslag en kozijn', `<label class="schakel"><input type="checkbox" data-vink="onzichtbaar"><span>Onzichtbare scharnieren</span></label><div class="kz-rij">${D.KEUZES.kozijn.map(k => knop('kozijn', k.code, k.naam)).join('')}</div>`, 'type=scharnier'),
  ].join('');
  if (id === 'aanvraag') return `
    <p class="cfg-lead">Stuur je ontwerp naar Ahmet. Je krijgt een vrijblijvende offerte, <strong>inclusief inmeten en montage</strong>.</p>
    <dl class="overzicht" id="overzicht"></dl>
    <div class="velden">
      <label><span>Naam</span><input type="text" id="vNaam" autocomplete="name"></label>
      <label><span>Plaats</span><input type="text" id="vPlaats" autocomplete="address-level2"></label>
      <label class="breed"><span>Opmerking (optioneel)</span><textarea id="vOpmerking" rows="3" placeholder="Bijvoorbeeld: deur naar de woonkamer, vloerverwarming aanwezig"></textarea></label>
    </div>
    <div class="knoppen-kolom">
      <a class="knop knop-goud" id="naarWhatsApp" href="#" target="_blank" rel="noopener">${ico('whatsapp')}Verstuur via WhatsApp</a>
      <a class="knop knop-donker" id="naarMail" href="#">${ico('mail')}Verstuur per e-mail</a>
      <div class="knoppen-twee"><button type="button" class="knop knop-rand" id="knopFoto">${ico('download')}Afbeelding</button><button type="button" class="knop knop-rand" id="knopLink">${ico('delen')}Link kopiëren</button></div>
    </div>
    <p class="cfg-uitleg">Tip: stuur in WhatsApp ook een foto van de plek waar de deur komt, dan kan Ahmet meteen meedenken.</p>`;
}

function bouwPaneel() {
  $('#cfgStappen').innerHTML = STAPPEN.map((s, i) => `
    <section class="stap" data-stap="${s.id}">
      <h2><button type="button" class="stap-kop" aria-expanded="${i === 0}" aria-controls="stap-${s.id}">
        <span class="stap-nr">${i + 1}</span><span class="stap-titel">${s.titel}${s.nieuw ? '<em class="stap-tag">Uniek</em>' : ''}<small data-samenvatting="${s.id}"></small></span>${ico('pijl')}
      </button></h2>
      <div class="stap-inhoud" id="stap-${s.id}" ${i === 0 ? '' : 'hidden'}>${inhoud(s.id)}${i < STAPPEN.length - 1 ? `<button type="button" class="knop knop-donker stap-verder" data-naar="${STAPPEN[i + 1].id}">Verder: ${STAPPEN[i + 1].titel}${ico('pijl')}</button>` : ''}</div>
    </section>`).join('');
}

// ---------- toestand → scherm ----------
function voldoet(regel) {
  return regel.split('&').every(r => {
    const [k, v] = r.split(/!?=/), niet = r.includes('!=');
    const is = v.split('|').includes(String(S[k]));   // a=x|y: een van beide
    return niet ? !is : is;
  });
}
function iconen() {
  // vorm- en indelingsiconen tekenen met de echte rekenkern, op basis van de huidige keuzes
  for (const el of document.querySelectorAll('[data-iconen="vorm"] .kz')) {
    const g = D.bouwDeur({ ...S, vorm: el.dataset.waarde, indeling: 'leeg', zij: 'geen', deuren: 1, bovenlicht: false, db: 90, h: 220, laag: 150, boog: 22, straal: 26, ah: 70, ab: 45 });
    el.querySelector('.kz-ico').innerHTML = D.svgDeur(g, { klein: true, staal: 'currentColor', glas: '#ffffff' });
  }
  for (const el of document.querySelectorAll('[data-iconen="indeling"] .kz')) {
    if (el.dataset.waarde === 'eigen') { el.querySelector('.kz-ico').innerHTML = '<svg viewBox="0 0 48 72" style="stroke:currentColor;fill:none;stroke-width:2"><rect x="8" y="4" width="32" height="64"/><path d="M19 28a5 5 0 1 1 7 4.6c-1.4.7-2 1.6-2 3.2V39M24 45v1.5" stroke-linecap="round"/></svg>'; continue; }
    const g = D.bouwDeur({ ...S, indeling: el.dataset.waarde, onderplaat: false });
    el.querySelector('.kz-ico').innerHTML = D.svgDeur(g, { klein: true, staal: 'currentColor', glas: '#ffffff' });
  }
}
let vorigeIconen = '';
function render(bron) {
  S = D.normaliseer(S);
  G = D.bouwDeur(S);
  for (const b of document.querySelectorAll('[data-zet]')) b.setAttribute('aria-pressed', String(String(S[b.dataset.zet]) === b.dataset.waarde));
  for (const i of document.querySelectorAll('[data-getal]')) if (i !== bron) i.value = i.dataset.getal === 'totaal' ? G.W : i.dataset.getal === 'bp' ? S.h - S.hd : S[i.dataset.getal];   // bp = glaspaneel boven de doorgang
  for (const i of document.querySelectorAll('[data-schuif]')) {
    if (i.dataset.schuif === 'laag') i.max = S.h - 10;
    if (i.dataset.schuif === 'ah') i.max = S.h - 60;
    if (i.dataset.schuif === 'ab') i.max = G.W - 10;
    if (i !== bron) i.value = S[i.dataset.schuif];
    const uit = $(`[data-uit="${i.dataset.schuif}"]`); if (uit) uit.textContent = S[i.dataset.schuif] + ' cm';
  }
  const helling = $('#trapHelling');   // schuin = onder de trap: een gewone trap is 30–42° (optrede ≤ 22 cm, aantrede ≥ 22 cm)
  if (helling && S.vorm === 'schuin') {
    const g = Math.round(Math.atan((S.h - S.laag) / G.W) * 180 / Math.PI);
    helling.textContent = g > 45 ? `Helling ${g}°: steiler dan een gewone trap (max. 45°), eerder een zoldertrap. Ahmet meet de echte helling in.`
      : g < 25 ? `Helling ${g}°: flauwer dan een gewone trap (meestal 30–42°). Klopt de hoogte aan de lage kant?`
      : `Helling ${g}°: past bij een gewone trap (meestal 30–42°).`;
  }
  for (const v of document.querySelectorAll('[data-vink]')) v.checked = !!S[v.dataset.vink];
  for (const b of document.querySelectorAll('[data-vloer]')) b.setAttribute('aria-pressed', String(b.dataset.vloer === S.vloer));
  for (const el of document.querySelectorAll('[data-als]')) el.hidden = !voldoet(el.dataset.als);
  for (const s of STAPPEN) { const el = $(`[data-samenvatting="${s.id}"]`); if (el) el.textContent = s.samenvatting(); }
  const sleutel = JSON.stringify([S.type, S.deuren, S.zij, S.db, S.zb, S.h, S.vorm, S.kant, S.laag, S.boog, S.straal, S.ah, S.ab, S.bovenlicht, S.hd, S.liggers, S.staanders, S.spiegel]);
  if (sleutel !== vorigeIconen) { vorigeIconen = sleutel; iconen(); }
  $('#cfgSamenvatting').textContent = `${D.vind('type', S.type).naam} · ${D.vind('vorm', S.vorm).naam.toLowerCase()} · ${G.W} × ${S.h} cm`;
  $('#overzicht').innerHTML = D.overzicht(S).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  teken2D();
  plan3D();
  const q = D.naarAdres(S);
  history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  verzendLinks();
}
function teken2D() {
  if (weergave !== '2d' && drie) return;
  $('#cfg2d').innerHTML = D.svgDeur(G, { maten: true, muur: '#e9e3d9', sparing: '#dcd4c8' });
}
let gepland = false;
function plan3D() { if (!drie || gepland) return; gepland = true; requestAnimationFrame(() => { gepland = false; drie.toon(G); drie.vloer(S.vloer); }); }

// ---------- aanvraag ----------
const ontwerpLink = () => location.origin + location.pathname + location.search;
function bericht() {
  const naam = $('#vNaam').value.trim(), plaats = $('#vPlaats').value.trim(), opm = $('#vOpmerking').value.trim();
  return [
    'Hallo Ahmet, ik heb een stalen deur ontworpen op jullie website:', '',
    ...D.overzicht(S).map(([k, v]) => `• ${k}: ${v}`), '',
    naam ? `Naam: ${naam}` : null, plaats ? `Plaats: ${plaats}` : null, opm ? `Opmerking: ${opm}` : null,
    `Bekijk het ontwerp: ${ontwerpLink()}`,
  ].filter(x => x !== null).join('\n');
}
function verzendLinks() {
  const wa = $('#naarWhatsApp'), ml = $('#naarMail');
  if (!wa) return;
  wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(bericht())}`;
  ml.href = `mailto:${MAIL}?subject=${encodeURIComponent('Ontwerp stalen deur via de website')}&body=${encodeURIComponent(bericht())}`;
}

// ---------- totale breedte ----------
// Het totaal volgt uit deur(en) + zijpanelen. Vul je zelf een totaal in, dan veranderen alleen de zijpanelen (20–300 cm);
// de deur blijft gelijk (wens Thomas). Zonder zijpanelen is de deur het totaal en past die zich aan.
function zetTotaal(T) {
  if (!Number.isFinite(T)) return;
  const zij = (S.zij === 'beide' ? 2 : S.zij === 'geen' ? 0 : 1), n = S.type === 'vast' || S.type === 'doorgang' ? 1 : S.deuren;
  if (zij) S.zb = Math.min(300, Math.max(20, Math.round((T - n * S.db) / zij)));
  else S.db = Math.round(T / n);   // normaliseer() houdt de deur binnen 40–150 cm
}

// ---------- bediening ----------
function openStap(id, scroll) {
  for (const s of document.querySelectorAll('.stap')) {
    const aan = s.dataset.stap === id;
    s.querySelector('.stap-kop').setAttribute('aria-expanded', String(aan));
    s.querySelector('.stap-inhoud').hidden = !aan;
  }
  if (scroll) {
    const el = $(`.stap[data-stap="${id}"]`);
    const paneel = $('#cfgPaneel');
    if (paneel.scrollHeight > paneel.clientHeight + 4 && getComputedStyle(paneel).overflowY !== 'visible') paneel.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (innerWidth < 1024 ? innerHeight * 0.46 + 8 : 88), behavior: 'smooth' });
  }
}
function koppel() {
  const paneel = $('#cfgPaneel');
  paneel.addEventListener('click', e => {
    const kop = e.target.closest('.stap-kop');
    if (kop) { const id = kop.closest('.stap').dataset.stap; const open = kop.getAttribute('aria-expanded') === 'true'; if (open) { kop.setAttribute('aria-expanded', 'false'); kop.closest('.stap').querySelector('.stap-inhoud').hidden = true; } else openStap(id, true); return; }
    const verder = e.target.closest('[data-naar]'); if (verder) { openStap(verder.dataset.naar, true); return; }
    const z = e.target.closest('[data-zet]');
    if (z) {
      const k = z.dataset.zet, v = z.dataset.waarde;
      S[k] = typeof D.STANDAARD[k] === 'number' || ((k === 'zs' || k === 'zl') && v !== 'gelijk') ? Number(v) : v;
      if (k === 'vorm' && v === 'schuin' && S.laag >= S.h - 10) S.laag = Math.round(S.h * 0.65);
      render(); return;
    }
    const st = e.target.closest('[data-stap-getal]');
    if (st) { const k = st.dataset.stapGetal; if (k === 'totaal') zetTotaal(G.W + Number(st.dataset.d) * 5); else if (k === 'bp') S.hd -= Number(st.dataset.d) * 5; else { if (k === 'liggers' || k === 'staanders') S.indeling = 'zelf'; S[k] = Number(S[k]) + Number(st.dataset.d) * (k === 'liggers' || k === 'staanders' ? 1 : 5); } render(); return; }
    if (e.target.closest('#knopFoto')) { downloadAfbeelding(); return; }
    if (e.target.closest('#knopLink')) { kopieerLink(e.target.closest('#knopLink')); return; }
  });
  paneel.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.schuif) { S[t.dataset.schuif] = Number(t.value); render(t); }
    if (t.matches('#vNaam,#vPlaats,#vOpmerking')) verzendLinks();
  });
  paneel.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.getal === 'totaal') { zetTotaal(Number(t.value)); render(); }
    else if (t.dataset.getal === 'bp') { S.hd = S.h - Number(t.value); render(); }   // hoger glaspaneel = lagere doorgang
    else if (t.dataset.getal) { if (t.dataset.getal === 'liggers' || t.dataset.getal === 'staanders') S.indeling = 'zelf'; S[t.dataset.getal] = Number(t.value); render(); }
    if (t.dataset.vink) { S[t.dataset.vink] = t.checked; render(); }
  });
  $('#knopNaarAanvraag').addEventListener('click', () => openStap('aanvraag', true));
  // opnieuw beginnen: eerst bevestigen (tweede klik binnen 3 seconden), dan alles terug naar de beginstand
  const reset = $('#knopReset'), resetTekst = reset.querySelector('span');
  let resetKlok = null;
  const resetTerug = () => { clearTimeout(resetKlok); reset.classList.remove('zeker'); resetTekst.textContent = 'Opnieuw beginnen'; };
  reset.addEventListener('click', () => {
    if (!reset.classList.contains('zeker')) { reset.classList.add('zeker'); resetTekst.textContent = 'Zeker? Klik nog een keer'; resetKlok = setTimeout(resetTerug, 3000); return; }
    resetTerug();
    S = D.normaliseer({});
    if (open) $('#knopOpen').click();
    if (weergave !== '3d') zetWeergave('3d');
    render();
    if (drie && drie.reset) drie.reset();
    openStap(STAPPEN[0].id, false);
    const paneel = $('#cfgPaneel');
    if (paneel.scrollHeight > paneel.clientHeight + 4 && getComputedStyle(paneel).overflowY !== 'visible') paneel.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  for (const b of document.querySelectorAll('[data-weergave]')) b.addEventListener('click', () => zetWeergave(b.dataset.weergave));
  for (const b of document.querySelectorAll('[data-zoom]')) b.addEventListener('click', () => { if (drie && drie.zoom) drie.zoom(Number(b.dataset.zoom)); });
  $('#knopOpen').addEventListener('click', e => { open = !open; e.currentTarget.setAttribute('aria-pressed', String(open)); e.currentTarget.querySelector('span').textContent = open ? 'Dicht' : 'Open'; if (drie) drie.open(open); if (weergave === '2d' && open) zetWeergave('3d'); });
  // vloer kiezen (alleen voor de sfeer in 3D)
  const vk = $('#vloerKeuze'), vKnop = $('#knopVloer');
  vk.innerHTML = D.KEUZES.vloer.map(v => `<button type="button" data-vloer="${v.code}" aria-pressed="false"><span class="vloer-staal vloer-${v.soort}" style="--c:${v.css}"></span>${esc(v.naam)}</button>`).join('');
  const zetVloerOpen = open => { vk.hidden = !open; vKnop.setAttribute('aria-expanded', String(open)); };
  vKnop.addEventListener('click', () => zetVloerOpen(vk.hidden));
  vk.addEventListener('click', e => { const b = e.target.closest('[data-vloer]'); if (!b) return; S.vloer = b.dataset.vloer; zetVloerOpen(false); if (weergave !== '3d') zetWeergave('3d'); render(); });
  document.addEventListener('click', e => { if (!vk.hidden && !e.target.closest('.cfg-vloer')) zetVloerOpen(false); });
}
function zetWeergave(w) {
  if (w === '3d' && !drie) w = '2d';
  weergave = w;
  for (const b of document.querySelectorAll('[data-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.weergave === w));
  $('#cfg2d').hidden = w !== '2d';
  $('#cfg3d').hidden = w !== '3d';
  $('#cfgHint').hidden = w !== '3d';
  $('#cfgZoom').hidden = w !== '3d';
  teken2D();
}
// afbeelding van het ontwerp (3D of de tekening met maten), met het logo en de contactgegevens erop:
// zo gaat AG Style Design mee als de klant het ontwerp doorstuurt
function downloadAfbeelding() {
  let bron;
  if (drie && weergave === '3d') bron = drie.foto();
  else {
    let svg = D.svgDeur(G, { maten: true, muur: '#e9e3d9' });
    const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1].split(' ').map(Number);
    svg = svg.replace('<svg ', `<svg width="1600" height="${Math.round(1600 * vb[3] / vb[2])}" `);
    bron = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const beeld = new Image(), logo = new Image(), woord = new Image();
  let geladen = 0;
  const bewaar = href => { const a = document.createElement('a'); a.href = href; a.download = 'ontwerp-stalen-deur-ag-style-design.jpg'; a.click(); };
  const teken = () => {
    if (++geladen < 3) return;
    const sc = Math.max(1, 1400 / (beeld.naturalWidth || 1400)), c = document.createElement('canvas');
    c.width = Math.round((beeld.naturalWidth || 1400) * sc); c.height = Math.round((beeld.naturalHeight || 1050) * sc);
    const x = c.getContext('2d');
    x.fillStyle = '#e9e3d9'; x.fillRect(0, 0, c.width, c.height); x.drawImage(beeld, 0, 0, c.width, c.height);
    const u = c.width / 100, lh = 4.2 * u, lw = lh * 400 / 285, tel = (document.querySelector('[data-cms="telefoon"]') || {}).textContent || '06 12 71 74 17';
    // woordmerk "STYLE Design" letterlijk uit het logo, met de website en het telefoonnummer eronder
    const wh = lh * 0.7, ww = wh * woord.naturalWidth / woord.naturalHeight;
    x.font = `500 ${1.15 * u}px Manrope, system-ui, sans-serif`;
    const regel2 = `agstyledesign.nl · ${tel}`, tw = Math.max(ww, x.measureText(regel2).width);
    const bw = lw + 1.4 * u + tw + 2.4 * u, bh = lh + 1.6 * u, bx = c.width - bw - 1.6 * u, by = c.height - bh - 1.6 * u;
    x.fillStyle = 'rgba(251,250,247,.9)'; x.fillRect(bx, by, bw, bh);
    x.drawImage(logo, bx + 1.2 * u, by + 0.8 * u, lw, lh);
    x.drawImage(woord, bx + 2.4 * u + lw, by + 0.6 * u, ww, wh);
    x.fillStyle = '#5C5850'; x.font = `500 ${1.15 * u}px Manrope, system-ui, sans-serif`; x.fillText(regel2, bx + 2.4 * u + lw, by + 0.8 * u + lh * 0.96);
    try { bewaar(c.toDataURL('image/jpeg', 0.92)); } catch (e) { bewaar(bron); }
  };
  beeld.onload = logo.onload = woord.onload = teken;
  beeld.onerror = logo.onerror = woord.onerror = () => bewaar(bron);
  beeld.src = bron; logo.src = 'logo/png/merk.png'; woord.src = 'logo/png/woordmerk-licht.png';
}
function kopieerLink(knopEl) {
  const klaar = () => { const oud = knopEl.innerHTML; knopEl.innerHTML = `${ico('check')}Gekopieerd`; setTimeout(() => { knopEl.innerHTML = oud; }, 1800); };
  if (navigator.clipboard) navigator.clipboard.writeText(ontwerpLink()).then(klaar, () => prompt('Kopieer deze link:', ontwerpLink()));
  else prompt('Kopieer deze link:', ontwerpLink());
}

// ---------- start ----------
bouwPaneel();
koppel();
render();
const laden = $('#cfgLaden');
function zonder3D() { laden.hidden = true; $('[data-weergave="3d"]').disabled = true; zetWeergave('2d'); }
try {
  const c = document.createElement('canvas');
  if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('geen WebGL');
  const { maak3D } = await import('./configurator-3d.js');
  drie = maak3D($('#cfg3d'));
  drie.toon(G);
  drie.vloer(S.vloer);
  laden.hidden = true;
  window.cfg3d = drie;   // voor tests
} catch (e) { console.warn('3D niet beschikbaar:', e.message); zonder3D(); }
