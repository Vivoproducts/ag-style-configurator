// AG Style Design — rekenkern van de configurator (isomorf: browser én Node).
// Uit één toestand S (maten in cm) rekent bouwDeur(S) de hele pui uit: panelen (deuren, zijpanelen, bovenlicht) met
// hun buitenrand, binnenrand en glas, de roeden, bogen, platen, grepen en maatlijnen. De 2D-tekening (svgDeur) en
// de 3D-weergave (configurator-3d.js) gebruiken allebei deze uitkomst, zodat ze altijd hetzelfde laten zien.
// Assen: x van links naar rechts, y van de vloer omhoog; (0,0) = linksonder in de sparing.
(function () {
  'use strict';

  // ---------- keuzes (één bron voor de knoppen, de tekening, 3D en het overzicht) ----------
  const KEUZES = {
    type: [
      { code: 'taats', naam: 'Taatsdeur', uitleg: 'Draait om een as in de vloer en het plafond, beide kanten op.' },
      { code: 'scharnier', naam: 'Scharnierdeur', uitleg: 'Klassiek aan scharnieren, ook met softclose of onzichtbare scharnieren.' },
      { code: 'schuif', naam: 'Schuifdeur', uitleg: 'Loopt langs de wand aan een rail, ook met dubbele softclose.' },
      { code: 'vast', naam: 'Vaste wand', uitleg: 'Een stalen wand zonder deur.' },
      { code: 'doorgang', naam: 'Doorgang', uitleg: 'Een open doorgang zonder deur, met vaste glaspanelen ernaast en eventueel erboven.' },
    ],
    zij: [{ code: 'geen', naam: 'Geen' }, { code: 'links', naam: 'Links' }, { code: 'rechts', naam: 'Rechts' }, { code: 'beide', naam: 'Beide' }],
    vorm: [
      { code: 'recht', naam: 'Recht', uitleg: 'De klassieke rechthoek.' },
      { code: 'schuin', naam: 'Schuin', uitleg: 'Voor onder de trap of op zolder: een kant lager dan de andere.' },
      { code: 'afgeschuind', naam: 'Schuine hoek', uitleg: 'Eén bovenhoek schuin, zoals een zolderdeur onder het dakvlak.' },
    ],
    // Ronde bovenkanten (boog, rondboog, ronde hoeken) kan de rekenkern ook tekenen, maar ze staan er niet in:
    // Ahmet heeft er (nog) geen project van (12 oktober 2026). Terugzetten = hier opnemen; topY() kent ze al:
    // { code: 'boog', naam: 'Boog' }, { code: 'rondboog', naam: 'Rondboog' }, { code: 'hoeken', naam: 'Ronde hoeken' }
    indeling: [
      // groep: lijnen, bogen of figuren (zo staan ze in de configurator)
      { code: 'leeg', naam: 'Strak', groep: 'lijnen', liggers: 0, staanders: 0 },
      { code: 'een', naam: '1 ligger', groep: 'lijnen', liggers: 1, staanders: 0 },
      { code: 'twee', naam: '2 liggers', groep: 'lijnen', liggers: 2, staanders: 0 },
      { code: 'drie', naam: '3 liggers', groep: 'lijnen', liggers: 3, staanders: 0 },
      { code: 'vier', naam: '4 liggers', groep: 'lijnen', liggers: 4, staanders: 0 },
      { code: 'raster', naam: 'Raster', groep: 'lijnen', liggers: 3, staanders: 1 },
      { code: 'loft', naam: 'Loft', groep: 'lijnen', liggers: 5, staanders: 1 },
      { code: 'staand', naam: 'Staand', groep: 'lijnen', liggers: 0, staanders: 2 },
      { code: 'kader', naam: 'Kader', groep: 'lijnen', liggers: 2, staanders: 0, extra: 'kader' },
      { code: 'raam', naam: 'Raam-in-raam', groep: 'lijnen', liggers: 0, staanders: 0, extra: 'raam' },
      // lh/sx = vaste plekken van liggers en staanders (breuk van de hoogte/breedte), zoals Ahmet ze vaak maakt
      { code: 'kruis', naam: 'Kruis laag', groep: 'lijnen', liggers: 1, staanders: 1, lh: [0.38], sx: [0.5] },
      { code: 'kruishoog', naam: 'Kruis hoog', groep: 'lijnen', liggers: 1, staanders: 1, lh: [0.75], sx: [0.5] },
      { code: 'hollands', naam: 'Hollands', groep: 'lijnen', liggers: 2, staanders: 1, lh: [0.36, 0.72], sx: [0.34] },
      { code: 'liggerhoog', naam: 'Ligger hoog', groep: 'lijnen', liggers: 1, staanders: 0, lh: [0.8] },
      { code: 'smal', naam: 'Smal midden', groep: 'lijnen', liggers: 1, staanders: 2, lh: [0.8], sx: [0.4, 0.6] },
      { code: 'binnenboog', naam: 'Binnenboog', groep: 'bogen', liggers: 0, staanders: 0, extra: 'boog' },
      { code: 'boogbreed', naam: 'Boog over zijpanelen', groep: 'bogen', liggers: 0, staanders: 0, extra: 'boogbreed' },
      { code: 'hogeboog', naam: 'Hoge boog', groep: 'bogen', liggers: 0, staanders: 0, extra: 'hogeboog' },
      { code: 'boogliggers', naam: 'Boog + liggers', groep: 'bogen', liggers: 2, staanders: 0, extra: 'boog' },
      { code: 'boograster', naam: 'Boog + raster', groep: 'bogen', liggers: 3, staanders: 1, extra: 'boog' },
      { code: 'boogstaand', naam: 'Boog + staanders', groep: 'bogen', liggers: 0, staanders: 2, extra: 'boog' },
      { code: 'halveboog', naam: 'Halve boog', groep: 'bogen', liggers: 0, staanders: 0, extra: 'halveboog' },
      { code: 'hoekboog', naam: 'Hoekboog', groep: 'bogen', liggers: 0, staanders: 0, extra: 'hoekboog' },
      { code: 'zijvak', naam: 'Boog met zijvak', groep: 'bogen', liggers: 0, staanders: 0, extra: 'zijvak' },
      { code: 'dubbelboog', naam: 'Dubbele boog', groep: 'bogen', liggers: 0, staanders: 0, extra: 'dubbelboog' },
      { code: 'cirkel', naam: 'Cirkel', groep: 'figuren', liggers: 0, staanders: 0, extra: 'cirkel' },
      // Gecontroleerd op alle 112 werkvideo's (12 oktober 2026): trede, kwartcirkels, zijboog, ovaal en vlinder komen in
      // Ahmets werk niet voor en staan er daarom niet in. PATROON kent ze nog; terugzetten = hier weer opnemen.
      { code: 'artdeco', naam: 'Art deco', groep: 'figuren', liggers: 0, staanders: 0, extra: 'artdeco' },
      { code: 'artdecoraster', naam: 'Art deco met raster', groep: 'figuren', liggers: 0, staanders: 0, extra: 'artdecoraster' },
      { code: 'eigen', naam: 'Eigen ontwerp', groep: 'figuren', liggers: 0, staanders: 0, eigen: true },
      { code: 'zelf', naam: 'Zelf indelen', liggers: null, staanders: null },
    ],
    kleur: [
      { code: 'zwart', naam: 'Zwart', sub: 'RAL 9005', hex: '#1d1d1d', metaal: 0.25, ruw: 0.62 },
      { code: 'noble', naam: 'Noble Bronze', sub: 'fijne structuur', hex: '#4f3d2c', metaal: 0.55, ruw: 0.5 },
      { code: 'supra', naam: 'Supra Brown', sub: 'poedercoating', hex: '#3e2e24', metaal: 0.45, ruw: 0.5 },
      { code: 'brons', naam: 'Brons', sub: 'poedercoating', hex: '#6b5235', metaal: 0.55, ruw: 0.45 },
      { code: 'zand', naam: 'Zandkleur', sub: 'poedercoating', hex: '#b3a38c', metaal: 0.15, ruw: 0.6 },
      { code: 'goud', naam: 'Goud', sub: 'poedercoating', hex: '#b48b4c', metaal: 0.8, ruw: 0.35 },
      { code: 'antraciet', naam: 'Antraciet', sub: 'RAL 7016', hex: '#383e42', metaal: 0.25, ruw: 0.6 },
      { code: 'zwartgrijs', naam: 'Zwartgrijs', sub: 'RAL 7021', hex: '#2c2f32', metaal: 0.25, ruw: 0.6 },
      { code: 'grijsbeige', naam: 'Grijsbeige', sub: 'RAL 7006', hex: '#73695b', metaal: 0.2, ruw: 0.6 },
      { code: 'lichtgrijs', naam: 'Lichtgrijs', sub: 'RAL 7035', hex: '#c6c8c5', metaal: 0.1, ruw: 0.6 },
      { code: 'wit', naam: 'Crèmewit', sub: 'RAL 9010', hex: '#efe9dc', metaal: 0.05, ruw: 0.55 },
      { code: 'ral', naam: 'Eigen RAL-kleur', sub: 'elke kleur', hex: '#7a6a5a', metaal: 0.2, ruw: 0.55 },
    ],
    glas: [
      { code: 'helder', naam: 'Helder', hex: '#dfe9e6', dekking: 0.16 },
      { code: 'smoke', naam: 'Smoke', hex: '#3b3b3a', dekking: 0.55 },
      { code: 'brons', naam: 'Brons', hex: '#6d5034', dekking: 0.5 },
      { code: 'zwart', naam: 'Zwart', hex: '#0d0d0d', dekking: 0.9 },
      { code: 'mat', naam: 'Mat (melk)', hex: '#f1f1ec', dekking: 0.84 },
      { code: 'matbrons', naam: 'Mat brons', hex: '#7a5f45', dekking: 0.86 },
      { code: 'matgrijs', naam: 'Mat grijs', hex: '#585b5d', dekking: 0.86 },
      { code: 'ribbel', naam: 'Ribbelglas', hex: '#e6ece8', dekking: 0.42 },
      { code: 'spiegel', naam: 'Spiegel', hex: '#c9ccca', dekking: 1 },
    ],
    // vloer in de 3D-weergave (alleen sfeer, geen onderdeel van de offerte)
    vloer: [
      { code: 'visgraat-licht', naam: 'Visgraat licht eiken', soort: 'visgraat', tint: '#ffffff', css: '#cdbca6' },
      { code: 'visgraat-naturel', naam: 'Visgraat naturel', soort: 'visgraat', tint: '#d7b48c', css: '#b8946c' },
      { code: 'visgraat-donker', naam: 'Visgraat donker', soort: 'visgraat', tint: '#8a6c52', css: '#6b5340' },
      { code: 'planken', naam: 'Eiken planken', soort: 'planken', tint: '#ffffff', css: '#c4a37c' },
      { code: 'beton', naam: 'Betonlook tegels', soort: 'beton', tint: '#ffffff', css: '#9a9590' },
      { code: 'marmer', naam: 'Marmer', soort: 'marmer', tint: '#ffffff', css: '#e6e1da' },
    ],
    // vorm = hoe hij getekend wordt; lengte in cm (null = met de deurhoogte mee)
    greep: [
      { code: 'hoek', naam: 'Hoekgreep', vorm: 'hoek', lengte: 40 },
      { code: 'hoeklang', naam: 'Hoekgreep lang', vorm: 'hoek', lengte: 100 },
      { code: 'beugel', naam: 'Beugel', vorm: 'beugel', lengte: 32 },
      { code: 'beugellang', naam: 'Beugel lang', vorm: 'beugel', lengte: 80 },
      { code: 'buis', naam: 'Buis', vorm: 'buis', lengte: 60 },
      { code: 'buislang', naam: 'Buis lang', vorm: 'buis', lengte: null },
      { code: 'koker', naam: 'Koker', vorm: 'koker', lengte: 60 },
      { code: 'kokerlang', naam: 'Koker lang', vorm: 'koker', lengte: null },
      { code: 'maan', naam: 'Halve maan', vorm: 'maan', lengte: 14 },
      { code: 'klink', naam: 'Deurkruk', vorm: 'klink', lengte: 14 },
      { code: 'kom', naam: 'Komgreep', vorm: 'kom', lengte: 16 },
      { code: 'geen', naam: 'Greeploos', vorm: 'geen', lengte: 0 },
    ],
    structuur: [{ code: 'fijn', naam: 'Fijnstructuur' }, { code: 'glad', naam: 'Glad mat' }],
    kozijn: [{ code: 'staal', naam: 'Nieuw stalen kozijn' }, { code: 'bestaand', naam: 'In het bestaande kozijn' }],
  };
  const vind = (lijst, code) => KEUZES[lijst].find(k => k.code === code) || KEUZES[lijst][0];

  const STANDAARD = {
    type: 'taats', deuren: 1, zij: 'geen', bovenlicht: false,
    db: 90, zb: 40, h: 240, hd: 210,          // deurbreedte, zijpaneelbreedte, hoogte sparing, deurhoogte bij bovenlicht
    vorm: 'recht', laag: 170, kant: 'links',  // schuin: hoogte aan de lage kant, welke kant laag is
    boog: 25, straal: 25,                      // boog: hoogte van de boog; hoeken: straal
    ah: 60, ab: 50,                            // schuine hoek: hoogte en breedte van de afschuining
    vloer: 'visgraat-licht',                   // alleen voor de 3D-weergave
    indeling: 'drie', liggers: 3, staanders: 0, onderplaat: false,
    zs: 'gelijk', zl: 'gelijk',               // zijpanelen: eigen aantal staanders en liggers, of gelijk aan de deur
    kleur: 'zwart', structuur: 'fijn', glas: 'helder', greep: 'hoek', softclose: true, draai: 'rechts',
    spiegel: false,                           // figuur (halve boog, hoekboog, art deco, zijvak, dubbele boog) aan de andere kant
    onzichtbaar: false, kozijn: 'staal',      // scharnierdeur: onzichtbare scharnieren, kozijn
  };
  const SPIEGELBAAR = ['halveboog', 'hoekboog', 'artdeco', 'zijvak', 'dubbelboog', 'artdecoraster'];   // indelingen die niet symmetrisch zijn
  const geenDeur = S => S.type === 'vast' || S.type === 'doorgang';
  const K = 4, R = 2.2, DIEPTE_K = 4.5, DIEPTE_R = 2.6, NAAD = 0.4;   // kader, roede (cm), dieptes, naad tussen deuren

  // grenzen; past een toestand aan zodat hij altijd te bouwen is
  function normaliseer(inv) {
    const S = Object.assign({}, STANDAARD, inv || {});
    const tal = (v, min, max, std) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : std; };
    for (const [lijst, sleutel] of [['type', 'type'], ['zij', 'zij'], ['vorm', 'vorm'], ['indeling', 'indeling'], ['kleur', 'kleur'], ['glas', 'glas'], ['greep', 'greep'], ['vloer', 'vloer'], ['structuur', 'structuur'], ['kozijn', 'kozijn']])
      if (!KEUZES[lijst].some(k => k.code === S[sleutel])) S[sleutel] = STANDAARD[sleutel];
    S.deuren = geenDeur(S) ? 1 : tal(S.deuren, 1, 2, 1);
    S.db = tal(S.db, 40, geenDeur(S) ? 400 : 150, 90);
    if (S.type === 'doorgang' && S.zij === 'geen') S.zij = 'beide';   // een doorgang heeft altijd panelen ernaast
    S.zb = tal(S.zb, 20, 300, 40);
    S.h = tal(S.h, 120, 360, 240);
    S.bovenlicht = !!S.bovenlicht && S.type !== 'schuif' && S.vorm !== 'schuin' && S.vorm !== 'afgeschuind';   // geen bovenlicht onder een trap of dakschuinte
    S.hd = tal(S.hd, 120, S.h - 30, Math.min(210, S.h - 30));
    S.laag = tal(S.laag, 60, S.h - 10, Math.round(S.h * 0.7));
    S.kant = S.kant === 'rechts' ? 'rechts' : 'links';
    const W = breedte(S);
    S.boog = tal(S.boog, 5, Math.min(120, Math.round(W / 2)), 25);
    S.straal = tal(S.straal, 5, Math.round(Math.min(W / 2, S.h / 3)), 25);
    S.ah = tal(S.ah, 10, S.h - 60, 60); S.ab = tal(S.ab, 10, W - 10, 50);
    const sj = vind('indeling', S.indeling);
    if (sj.code !== 'zelf') { S.liggers = sj.liggers; S.staanders = sj.staanders; }
    S.liggers = tal(S.liggers, 0, 8, 0); S.staanders = tal(S.staanders, 0, 4, 0);
    S.zs = S.zs === 'gelijk' || S.zs == null ? 'gelijk' : tal(S.zs, 0, 4, 0);
    S.zl = S.zl === 'gelijk' || S.zl == null ? 'gelijk' : tal(S.zl, 0, 6, 0);
    S.onderplaat = !!S.onderplaat; S.softclose = !!S.softclose; S.onzichtbaar = !!S.onzichtbaar;
    S.draai = S.draai === 'links' ? 'links' : 'rechts';
    S.spiegel = !!S.spiegel;
    if (S.bovenlicht) S.hd = Math.min(S.hd, Math.floor(minTop(S, 0, W) - 30));
    return S;
  }
  const zijL = S => (S.zij === 'links' || S.zij === 'beide') ? 1 : 0;
  const zijR = S => (S.zij === 'rechts' || S.zij === 'beide') ? 1 : 0;
  const breedte = S => (zijL(S) + zijR(S)) * S.zb + S.deuren * S.db;

  // bovenkant van de sparing op plek x (de vorm)
  function topY(S, x) {
    const W = breedte(S), H = S.h;
    x = Math.min(W, Math.max(0, x));
    if (S.vorm === 'schuin') { const t = x / W; return S.kant === 'links' ? S.laag + (H - S.laag) * t : H - (H - S.laag) * t; }
    if (S.vorm === 'boog' || S.vorm === 'rondboog') {
      const b = S.vorm === 'rondboog' ? Math.min(W / 2, H - 60) : S.boog;
      const Rb = (W * W / 4 + b * b) / (2 * b), cy = H - Rb, dx = x - W / 2;
      return cy + Math.sqrt(Math.max(0, Rb * Rb - dx * dx));
    }
    if (S.vorm === 'afgeschuind') {   // één hoek schuin; kant = welke hoek
      const d = S.kant === 'links' ? x : W - x;
      return d < S.ab ? H - S.ah + S.ah * d / S.ab : H;
    }
    if (S.vorm === 'hoeken') {
      const r = S.straal;
      if (x < r) return H - r + Math.sqrt(Math.max(0, r * r - (r - x) * (r - x)));
      if (x > W - r) return H - r + Math.sqrt(Math.max(0, r * r - (x - (W - r)) * (x - (W - r))));
      return H;
    }
    return H;
  }
  function minTop(S, a, b) { let m = Infinity; for (let i = 0; i <= 40; i++) m = Math.min(m, topY(S, a + (b - a) * i / 40)); return m; }
  const recht = S => S.vorm === 'recht';

  // omtrek van een paneel: onder recht, boven (optioneel) de vorm; inset = rand naar binnen
  function omtrek(S, x0, x1, y0, y1, vormBoven, inset) {
    const a = x0 + inset, b = x1 - inset, onder = y0 + inset;
    const pts = [[a, onder], [b, onder]];
    const n = vormBoven && !recht(S) ? Math.max(8, Math.ceil((b - a) / 3)) : 1;
    for (let i = n; i >= 0; i--) {
      const x = a + (b - a) * i / n;
      let y = vormBoven ? topY(S, x) : y1;
      if (vormBoven && inset) {   // loodrecht inspringen op een schuine of ronde bovenkant
        const h = 0.5, d = (topY(S, x + h) - topY(S, x - h)) / (2 * h);
        y -= inset * Math.sqrt(1 + d * d);
      } else y -= inset;
      pts.push([x, Math.max(onder + 1, y)]);
    }
    return pts;
  }
  // bovenkant van de binnenrand van een paneel op plek x
  const binnenTop = (P, x) => { const p = P.binnen; for (let i = 2; i < p.length - 1; i++) { const [xa, ya] = p[i], [xb, yb] = p[i + 1]; if ((x <= xa && x >= xb) || (x >= xa && x <= xb)) { const t = xa === xb ? 0 : (x - xa) / (xb - xa); return ya + (yb - ya) * t; } } return p[2][1]; };

  function bouwDeur(invoer) {
    const S = normaliseer(invoer);
    const W = breedte(S), panelen = [], staven = [], bogen = [], platen = [], grepen = [];
    // horizontale indeling: zijpaneel links, deuren, zijpaneel rechts
    const vakken = [];
    let x = 0;
    if (zijL(S)) { vakken.push({ soort: 'zij', x0: x, x1: x + S.zb }); x += S.zb; }
    for (let d = 0; d < S.deuren; d++) { vakken.push({ soort: S.type === 'vast' ? 'vast' : S.type === 'doorgang' ? 'open' : 'deur', x0: x, x1: x + S.db, deur: d }); x += S.db; }
    if (zijR(S)) vakken.push({ soort: 'zij', x0: x, x1: x + S.zb });
    const yDeur = S.bovenlicht ? S.hd : null;
    for (const v of vakken) {
      if (v.soort === 'open') continue;   // doorgang: het middenvak blijft open
      const x0 = v.x0 + (v.soort === 'deur' && S.deuren === 2 ? (v.deur === 1 ? NAAD / 2 : 0) : 0);
      const x1 = v.x1 - (v.soort === 'deur' && S.deuren === 2 ? (v.deur === 0 ? NAAD / 2 : 0) : 0);
      const vormBoven = !S.bovenlicht;
      const P = { id: panelen.length, soort: v.soort, deur: v.deur, x0, x1, y0: 0, vormBoven, yBoven: yDeur };
      P.buiten = omtrek(S, x0, x1, 0, yDeur, vormBoven, 0);
      P.binnen = omtrek(S, x0, x1, 0, yDeur, vormBoven, K);
      panelen.push(P);
    }
    if (S.bovenlicht) {
      const P = { id: panelen.length, soort: 'boven', x0: 0, x1: W, y0: S.hd, vormBoven: true };
      P.buiten = omtrek(S, 0, W, S.hd, null, true, 0).map(([px, py], i) => i < 2 ? [px, S.hd] : [px, py]);
      P.binnen = omtrek(S, 0, W, S.hd, null, true, K).map(([px, py], i) => i < 2 ? [px, S.hd + K] : [px, py]);
      panelen.push(P);
    }

    // liggers: vaste hoogtes, gelijk over alle panelen onder het bovenlicht ("alle lijnen lopen door")
    const hoofd = panelen.filter(p => p.soort !== 'boven');
    const hRef = S.bovenlicht ? S.hd : minTop(S, hoofd[0].x0, hoofd[hoofd.length - 1].x1);
    const hoogtes = [];
    const sj = vind('indeling', S.indeling);
    if (sj.lh) for (const fr of sj.lh) hoogtes.push(K + (hRef - 2 * K) * fr);   // vaste plekken uit het sjabloon
    else for (let i = 1; i <= S.liggers; i++) hoogtes.push(K + (hRef - 2 * K) * i / (S.liggers + 1));
    const plaatTot = S.onderplaat ? (hoogtes[0] || hRef * 0.28) : 0;
    const zijHoogtes = [];   // zijpanelen met een eigen aantal liggers
    if (S.zl !== 'gelijk') for (let i = 1; i <= S.zl; i++) zijHoogtes.push(K + (hRef - 2 * K) * i / (S.zl + 1));
    for (const P of hoofd) {
      const a = P.x0 + K, b = P.x1 - K, zij = P.soort === 'zij';
      const nSt = zij && S.zs !== 'gelijk' ? S.zs : S.staanders, eigenHoogtes = zij && S.zl !== 'gelijk' ? zijHoogtes : hoogtes;
      // staanders: gelijk verdeeld over het paneel; boven tot de binnenrand
      const vasteSx = sj.sx && !(zij && S.zs !== 'gelijk') ? sj.sx.map(fr => S.deuren === 2 && P.deur === 0 ? 1 - fr : fr) : null;   // dubbel: gespiegeld
      for (let i = 1; i <= (vasteSx ? vasteSx.length : nSt); i++) {
        const sx = a + (b - a) * (vasteSx ? vasteSx[i - 1] : i / (nSt + 1));
        const top = Math.min(binnenTop(P, sx - R / 2), binnenTop(P, sx + R / 2));
        staven.push({ paneel: P.id, x: sx - R / 2, y: K, w: R, h: top - K, richting: 'staand' });
      }
      for (const y of eigenHoogtes) {
        // stuk waar de ligger past (bij schuin of rond kan hij aan één kant tegen de bovenrand lopen)
        let xa = null, xb = null;
        for (let i = 0; i <= 60; i++) { const sx = a + (b - a) * i / 60; if (binnenTop(P, sx) > y + R / 2 + 0.5) { if (xa === null) xa = sx; xb = sx; } }
        if (xa === null || xb - xa < 4) continue;
        if (xa > a + 0.1) xa = zoekRand(P, a, xa, y); if (xb < b - 0.1) xb = zoekRand(P, b, xb, y);
        staven.push({ paneel: P.id, x: xa, y: y - R / 2, w: xb - xa, h: R, richting: 'ligger' });
      }
      if (plaatTot) platen.push({ paneel: P.id, pts: [[a, K], [b, K], [b, plaatTot - R / 2], [a, plaatTot - R / 2]] });
    }
    // extra's over de deurengroep (bij dubbele deuren doorlopend over de naad)
    // boogbreed: de boog loopt door over deur(en) én zijpanelen (zoals in zijn doorgangen met vaste panelen)
    // doorgang: elk paneel naast de opening is een eigen groep (een boog loopt niet over de open doorgang heen)
    const groepen = S.type === 'doorgang' ? hoofd.map(p => [p]) : [sj.extra === 'boogbreed' ? hoofd : hoofd.filter(p => p.soort === 'deur' || p.soort === 'vast')];
    // welke helft van een symmetrisch paar (dubbele deur of de panelen van een doorgang); null = losse deur of wand
    const helft = P => S.deuren === 2 ? P.deur : S.type === 'doorgang' ? (P.x0 > W / 2 ? 1 : 0) : null;
    for (const groep of groepen) {
      if (groep.length && sj.extra) {
        const g0 = groep[0].x0 + K, g1 = groep[groep.length - 1].x1 - K, span = g1 - g0, mid = (g0 + g1) / 2;
        const welk = px => (groep.find(p => px >= p.x0 && px <= p.x1) || groep[0]).id;
        const topMin = Math.min(...groep.map(p => minTop(S, p.x0, p.x1))) - K;
        if (sj.extra === 'boog' || sj.extra === 'hogeboog' || sj.extra === 'boogbreed') {
          const ins = sj.extra === 'hogeboog' ? 0.07 : 0.2, xa = g0 + span * ins, xb = g1 - span * ins, r = (xb - xa) / 2;
          const yS = Math.max(hRef * 0.3, Math.min(hRef, topMin) - (sj.extra === 'hogeboog' ? 8 : 22) - r);
          const pts = [[xa, K]];
          for (let i = 0; i <= 32; i++) { const t = Math.PI - Math.PI * i / 32; pts.push([mid + r * Math.cos(t), yS + r * Math.sin(t)]); }
          pts.push([xb, K]);
          // per deur een eigen stuk, zodat het bij openen meedraait
          let stuk = [pts[0]], huidig = welk(pts[0][0]);
          for (let i = 1; i < pts.length; i++) {
            const p = welk((pts[i][0] + pts[i - 1][0]) / 2);
            if (p !== huidig) { bogen.push({ paneel: huidig, pts: stuk }); stuk = [pts[i - 1]]; huidig = p; }
            stuk.push(pts[i]);
          }
          bogen.push({ paneel: huidig, pts: stuk });
        }
        // cirkel = twee halve cirkels die bij een dubbele deur samen een ring vormen (kastdeuren van Ahmet);
        // bij een enkele deur of vast paneel één halve cirkel tegen de sluitkant (Thomas, 12 oktober 2026)
        if (sj.extra === 'cirkel' && groep.length === 1) {
          const P = groep[0], w = P.x1 - P.x0 - 2 * K, r = Math.min(w * 0.6, 42), cy = Math.min(hRef * 0.56, topMin - r - 15);
          const rechts = S.type === 'vast' || S.draai !== 'rechts';   // draai = scharnierkant; de halve cirkel zit aan de andere kant
          const cx = rechts ? P.x1 - K : P.x0 + K, pts = [];
          for (let i = 0; i <= 32; i++) { const t = (rechts ? Math.PI / 2 : Math.PI / 2) + (rechts ? 1 : -1) * Math.PI * i / 32; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
          bogen.push({ paneel: P.id, pts });
        } else if (sj.extra === 'cirkel') {
          const r = Math.min(span * 0.3, 42), cy = Math.min(hRef * 0.56, topMin - r - 15);
          let stuk = [], huidig = null;
          for (let i = 0; i <= 64; i++) {
            const t = Math.PI / 2 - 2 * Math.PI * i / 64, p = [mid + r * Math.cos(t), cy + r * Math.sin(t)], w = welk(p[0]);
            if (huidig !== null && w !== huidig) { bogen.push({ paneel: huidig, pts: stuk }); stuk = [stuk[stuk.length - 1]]; }
            huidig = w; stuk.push(p);
          }
          bogen.push({ paneel: huidig, pts: stuk });
        }
      }
      // extra's per deur of paneel (in zijn werk: halve boog, art deco met bogen boven en onder, kader-in-kader)
      if (groep.length && ['halveboog', 'artdeco', 'kader'].includes(sj.extra)) for (const P of groep) {
        const a = P.x0 + K, b = P.x1 - K, top = minTop(S, P.x0, P.x1) - K;
        // bij een dubbele deur gespiegeld, zodat de bogen samen één vorm maken; een losse deur vanaf links, of gespiegeld
        const d = helft(P), vanRechts = d === null ? S.spiegel : d === 0, sx = vanRechts ? b : a, rx = (vanRechts ? a : b) - sx;
        const boog = (yVast, yBoog, omlaag) => {   // kwart ellips van (sx, yBoog) naar (sx + rx, yVast)
          const pts = [];
          for (let i = 0; i <= 24; i++) { const t = Math.PI / 2 * (1 - i / 24); pts.push([sx + rx * Math.cos(t), yVast + (omlaag ? -1 : 1) * Math.abs(yBoog - yVast) * Math.sin(t)]); }
          bogen.push({ paneel: P.id, pts });
        };
        if (sj.extra === 'halveboog') boog(Math.min(hRef, top) * 0.36, top, false);
        if (sj.extra === 'artdeco') { boog(Math.min(hRef, top) * 0.58, top, false); boog(Math.min(hRef, top) * 0.42, K, true); }
        if (sj.extra === 'kader') {
          const y0 = hoogtes[0] || hRef * 0.33, y1 = hoogtes[1] || hRef * 0.66;
          for (const fx of [0.28, 0.72]) staven.push({ paneel: P.id, x: a + (b - a) * fx - R / 2, y: y0, w: R, h: y1 - y0, richting: 'staand' });
        }
      }
      if (groep.length && PATROON[sj.extra]) for (const P of groep) {
        const a = P.x0 + K, b = P.x1 - K, top = Math.min(hRef, minTop(S, P.x0, P.x1)) - K, w = b - a, h = top - K;
        const d = helft(P), spiegel = d === null ? S.spiegel : d === (PATROON[sj.extra].naarMidden ? 1 : 0);   // paar: samen symmetrisch
        const naar = ([u, v]) => { const x = a + (spiegel ? 1 - u : u) * w; return [x, Math.min(K + v * h, binnenTop(P, x) - R / 2)]; };
        for (const lijn of PATROON[sj.extra](w / h)) bogen.push({ paneel: P.id, pts: lijn.map(naar) });
      }
    }
    // grepen en draaipunt per deur
    const deuren = panelen.filter(p => p.soort === 'deur');
    for (const P of deuren) {
      const kantGreep = S.deuren === 2 ? (P.deur === 0 ? 'rechts' : 'links') : (S.draai === 'rechts' ? 'links' : 'rechts');   // draai = scharnierkant
      P.scharnierKant = kantGreep === 'rechts' ? 'links' : 'rechts';
      P.draaiX = S.type === 'taats' ? (P.scharnierKant === 'links' ? P.x0 + Math.min(16, (P.x1 - P.x0) / 5) : P.x1 - Math.min(16, (P.x1 - P.x0) / 5)) : (P.scharnierKant === 'links' ? P.x0 : P.x1);
      const gr = vind('greep', S.greep);
      if (gr.vorm !== 'geen') {
        const gx = kantGreep === 'rechts' ? P.x1 - K / 2 : P.x0 + K / 2;
        const lengte = gr.lengte === null ? Math.round(Math.min(160, hRef * 0.7)) : Math.min(gr.lengte, hRef * 0.6);
        grepen.push({ paneel: P.id, type: gr.vorm, x: gx, y: gr.vorm === 'klink' ? Math.min(105, hRef * 0.45) : Math.max(lengte / 2 + 15, Math.min(105, hRef * 0.45)), lengte, kant: kantGreep });
      }
    }
    return { S, W, H: S.h, panelen, staven, bogen, platen, grepen, hRef, hoogtes, zijHoogtes, topY: x2 => topY(S, x2) };
  }
  // ---------- patronen per paneel ----------
  // Elk patroon geeft lijnen terug in breuken (u, v) van het glasvlak; asp = breedte / hoogte (voor ronde cirkels).
  const ellips = (cu, cv, ru, rv, t0, t1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const t = (t0 + (t1 - t0) * i / n) * Math.PI / 180; return [cu + ru * Math.cos(t), cv + rv * Math.sin(t)]; });
  const PATROON = {
    // staander op een derde, die bovenin met een kwartcirkel naar de hoek buigt
    hoekboog: asp => { const ru = 0.68, rv = Math.min(0.6, ru * asp), vS = 1 - rv; return [[[0.32, 0], [0.32, vS]], ellips(1, vS, ru, rv, 180, 90)]; },
    // boog met zijvak: smalle strook langs de zijkant (staander over de hele hoogte), daarnaast een volle boog
    zijvak: asp => { const u0 = 0.26, ru = (1 - u0) / 2, rv = Math.min(0.3, ru * asp), vS = 0.97 - rv; return [[[u0, 0], [u0, 1]], ellips(u0 + ru, vS, ru, rv, 180, 0)]; },
    // dubbele boog (foto Ahmet, bogen.jpg): twee staanders die recht omhoog gaan en met een bocht van 90° tegen de
    // zijkant uitkomen; de hoge buigt naar de ene stijl, de lage naar de andere
    dubbelboog: asp => { const u0 = 0.26, ru = 1 - u0, rv = Math.min(0.32, ru * asp), vH = 0.93 - rv, vL = 0.56 - rv;
      return [[[u0, 0], [u0, vH], ...ellips(1, vH, ru, rv, 180, 90)], [[1 - u0, 0], [1 - u0, vL], ...ellips(0, vL, ru, rv, 0, 90)]]; },
    // art deco met raster (video AG, scharnierdeur met vast paneel, Capelle a/d IJssel, 11 mei 2025), getekend voor de helft
    // met de naad rechts (u = 1): grote boog over de naad, twee liggers over de volle breedte, een staander die onderaan
    // overgaat in een boog naar de onderhoek, en de poot van de grote boog die doorloopt tot op die onderste boog
    artdecoraster: () => {
      const s = 0.64, l = 0.31, a = 0.74, b = 0.31, top = 0.97;                       // gemeten op de video (gemiddeld over beide deuren, tegen perspectief)
      const poot = 1 - a, voet = 1 - b, tPoot = Math.acos(poot / voet);              // poot snijdt de onderste boog
      return [
        ellips(1, s, a, top - s, 180, 90),                                           // grote boog (helft)
        [[0, s], [1, s]], [[0, l], [1, l]],                                          // liggers
        [[voet, 1], [voet, l]], ellips(0, l, voet, l, 0, -90),                       // staander, dan boog naar de onderhoek
        [[poot, s], [poot, l - l * Math.sin(tPoot)]],                                // poot van de grote boog
      ];
    },
    // halve ellips vanaf de zijkant
    zijboog: () => [ellips(0, 0.5, 0.62, 0.36, 90, -90)],
    // twee kwartcirkels in de bovenhoek
    kwartcirkels: asp => [0.42, 0.72].map(r => ellips(1, 1, r, Math.min(0.9, r * asp), 180, 270)),
    // trede: staander, knik met twee rondingen, staander
    trede: asp => { const ru = 0.12, rv = ru * asp, m = 0.5; return [[[0.3, 0], ...ellips(0.3 + ru, m - rv, ru, rv, 180, 90), ...ellips(0.7 - ru, m + rv, ru, rv, 270, 360), [0.7, 1]]]; },
    // ovaal (capsule) in het midden, met staanders naar boven en onder
    ovaal: asp => { const ru = 0.26, rv = ru * asp, v0 = 0.24 + rv, v1 = 0.76 - rv;
      return [[...ellips(0.5, v1, ru, rv, 0, 180), ...ellips(0.5, v0, ru, rv, 180, 360), [0.5 + ru, v1]], [[0.5, 0], [0.5, v0 - rv]], [[0.5, v1 + rv], [0.5, 1]]]; },
    // vlinder: twee bogen die elkaar in het midden raken
    vlinder: () => [ellips(0, 0.5, 0.5, 0.5, 90, -90), ellips(1, 0.5, 0.5, 0.5, 90, 270)],
    // raam-in-raam: een kader in het glas, met staanders naar boven en onder
    raam: () => [[[0.24, 0.22], [0.76, 0.22], [0.76, 0.78], [0.24, 0.78], [0.24, 0.22]], [[0.5, 0], [0.5, 0.22]], [[0.5, 0.78], [0.5, 1]]],
  };
  PATROON.hoekboog.naarMidden = true;      // bij een dubbele deur vormen de twee hoekbogen samen één boog
  PATROON.zijvak.naarMidden = true;        // dubbele deur: de zijvakken buiten, de bogen naar het midden
  PATROON.dubbelboog.naarMidden = true;    // dubbele deur: de hoge bogen naar het midden
  PATROON.artdecoraster.naarMidden = true; // dubbele deur of deur + vast paneel: de grote boog over de naad

  // precieze rand waar een ligger de schuine/ronde bovenrand raakt (bisectie)
  function zoekRand(P, buiten, binnen, y) {
    let a = buiten, b = binnen;
    for (let i = 0; i < 20; i++) { const m = (a + b) / 2; if (binnenTop(P, m) > y + R / 2 + 0.5) b = m; else a = m; }
    return b;
  }

  // ---------- adres (ontwerp delen via de link) ----------
  const KORT = { zs: 'zs', zl: 'zl', structuur: 'sr', onzichtbaar: 'oz', kozijn: 'kz', type: 't', deuren: 'n', zij: 'z', bovenlicht: 'bl', db: 'b', zb: 'zb', h: 'h', hd: 'hd', vorm: 'v', laag: 'l', kant: 'k', boog: 'bo', straal: 'r', ah: 'ah', ab: 'ab', vloer: 'vl', indeling: 'i', liggers: 'li', staanders: 'st', onderplaat: 'op', kleur: 'c', glas: 'g', greep: 'gr', softclose: 'sc', draai: 'd', spiegel: 'sp' };
  function naarAdres(S) {
    const q = [];
    for (const [k, c] of Object.entries(KORT)) {
      if (S[k] === STANDAARD[k]) continue;
      if ((k === 'liggers' || k === 'staanders') && S.indeling !== 'zelf') continue;   // volgt uit het sjabloon
      q.push(c + '=' + encodeURIComponent(typeof S[k] === 'boolean' ? (S[k] ? 1 : 0) : S[k]));
    }
    return q.join('&');
  }
  function uitAdres(zoek) {
    const p = new URLSearchParams(zoek), S = {};
    for (const [k, c] of Object.entries(KORT)) if (p.has(c)) {
      const v = p.get(c);
      S[k] = typeof STANDAARD[k] === 'boolean' ? v === '1' : typeof STANDAARD[k] === 'number' ? Number(v) : v;
    }
    return normaliseer(S);
  }

  // ---------- overzicht in woorden (aanvraag, WhatsApp) ----------
  function overzicht(S) {
    const r = [];
    r.push(['Type', (S.type === 'doorgang' ? 'Doorgang zonder deur' : vind('type', S.type).naam) + (!geenDeur(S) ? (S.deuren === 2 ? ', dubbel' : ', enkel') : '')]);
    r.push(['Maat (indicatie)', `${breedte(S)} × ${S.h} cm` + (S.type === 'doorgang' ? ` (doorgang ${S.db} cm breed)` : S.type !== 'vast' ? ` (deur ${S.db} cm breed)` : '')]);
    if (S.zij !== 'geen') r.push(['Zijpanelen', `${vind('zij', S.zij).naam.toLowerCase()}, ${S.zb} cm` + (S.zs !== 'gelijk' || S.zl !== 'gelijk' ? `, eigen indeling (${S.zs === 'gelijk' ? 'staanders als deur' : S.zs + ' staanders'}, ${S.zl === 'gelijk' ? 'liggers als deur' : S.zl + ' liggers'})` : '')]);
    if (S.bovenlicht) r.push(S.type === 'doorgang' ? ['Glaspaneel boven', `${S.h - S.hd} cm hoog, doorgang ${S.hd} cm hoog`] : ['Bovenlicht', `ja, deurhoogte ${S.hd} cm`]);
    let vorm = vind('vorm', S.vorm).naam;
    if (S.vorm === 'schuin') vorm += `, ${S.kant} ${S.laag} cm, ${S.kant === 'links' ? 'rechts' : 'links'} ${S.h} cm`;
    if (S.vorm === 'boog') vorm += `, boog ${S.boog} cm`;
    if (S.vorm === 'hoeken') vorm += `, straal ${S.straal} cm`;
    if (S.vorm === 'afgeschuind') vorm += `, hoek ${S.kant} ${S.ab} × ${S.ah} cm`;
    r.push(['Vorm', vorm]);
    const ind = vind('indeling', S.indeling);
    r.push(['Indeling', (ind.code === 'zelf' ? `${S.liggers} liggers, ${S.staanders} staanders` : ind.eigen ? 'eigen ontwerp (schets of foto stuur ik mee)' : ind.naam) + (S.spiegel && S.deuren === 1 && SPIEGELBAAR.includes(ind.code) ? ', gespiegeld' : '') + (S.onderplaat ? ', dichte onderplaat' : '')]);
    const kl = vind('kleur', S.kleur);
    r.push(['Kleur staal', kl.naam + (/^RAL/.test(kl.sub || '') ? ` (${kl.sub})` : '') + ', ' + vind('structuur', S.structuur).naam.toLowerCase()]);   // alleen RAL-codes: "fijne structuur" zou botsen met glad mat
    r.push(['Glas', vind('glas', S.glas).naam]);
    if (!geenDeur(S)) r.push(['Greep', vind('greep', S.greep).naam + (S.softclose ? ', softclose' : '')]);
    if (!geenDeur(S) && S.deuren === 1 && S.type !== 'schuif') r.push(['Scharnierkant', S.draai]);
    if (S.type === 'scharnier') r.push(['Beslag', `${S.onzichtbaar ? 'onzichtbare' : 'zichtbare'} scharnieren, ${vind('kozijn', S.kozijn).naam.toLowerCase()}`]);
    return r;
  }

  // ---------- 2D-tekening (SVG) ----------
  const f = n => Math.round(n * 10) / 10;
  const pad = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(-p[1])).join('L') + 'Z';
  const lijn = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(-p[1])).join('L');
  // opties: maten (maatlijnen), klein (icoon), muur (sparing in een wand), kleur/glas overschrijven
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function svgDeur(G, o) {
    o = o || {};
    const S = G.S, kl = vind('kleur', S.kleur), gl = vind('glas', S.glas);
    const staal = o.staal || kl.hex, glasKleur = o.glas || gl.hex, marge = o.maten ? 46 : (o.klein ? 6 : 16);
    const vb = [-marge - (o.maten ? 14 : 0), -(G.H + marge), G.W + 2 * marge + (o.maten ? 26 : 0), G.H + marge * 2 + (o.maten ? 18 : 0)];
    const lw = o.klein ? Math.max(1.2, G.W / 70) : 0;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f).join(' ')}" ${o.klein ? '' : `role="img" aria-label="${esc2(o.maten ? 'Tekening met maten: ' + overzicht(S).map(([k, v]) => k + ' ' + v).join('; ') : 'Vooraanzicht van het ontwerp')}"`} preserveAspectRatio="xMidYMid meet">`;
    if (o.muur) s += `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${o.muur}"/><path d="${pad(omtrek(S, 0, G.W, 0, null, true, 0))}" fill="${o.sparing || '#d9d3c9'}"/>`;
    for (const P of G.panelen) {
      const glasOp = gl.code === 'spiegel' ? 1 : Math.max(0.35, gl.dekking);
      s += `<path d="${pad(P.binnen)}" fill="${glasKleur}" fill-opacity="${o.klein ? 0.25 : glasOp}"/>`;
      s += `<path d="${pad(P.buiten)} ${pad(P.binnen)}" fill="${staal}" fill-rule="evenodd"/>`;
    }
    for (const p of G.platen) s += `<path d="${pad(p.pts)}" fill="${staal}"/>`;
    for (const b of G.staven) s += `<rect x="${f(b.x)}" y="${f(-(b.y + b.h))}" width="${f(Math.max(b.w, lw))}" height="${f(Math.max(b.h, lw))}" fill="${staal}"/>`;
    for (const b of G.bogen) s += `<path d="${lijn(b.pts)}" fill="none" stroke="${staal}" stroke-width="${o.klein ? Math.max(R, lw) : R}" stroke-linejoin="round"/>`;
    if (!o.klein) for (const g of G.grepen) {
      const gx = g.kant === 'rechts' ? g.x - 3 : g.x + 1;
      const z = g.kant === 'rechts' ? -1 : 1, rand = 'stroke="#000" stroke-opacity=".3" stroke-width=".4"';
      if (g.type === 'maan') s += `<path d="M${f(g.x + z * 1)} ${f(-g.y - 7)}a7 7 0 0 ${z > 0 ? 1 : 0} 0 14z" fill="${staal}" ${rand}/>`;
      else if (g.type === 'klink') s += `<circle cx="${f(g.x + z * 4)}" cy="${f(-g.y)}" r="2.6" fill="${staal}" ${rand}/><rect x="${f(z > 0 ? g.x + 4 : g.x - 17)}" y="${f(-g.y - 1)}" width="13" height="2" fill="${staal}" ${rand}/>`;
      else if (g.type === 'kom') s += `<rect x="${f(g.x + z * 4 - 2)}" y="${f(-g.y - 8)}" width="4" height="16" rx="1" fill="#111" fill-opacity=".6"/>`;
      else s += `<rect x="${f(gx)}" y="${f(-(g.y + g.lengte / 2))}" width="2" height="${f(g.lengte)}" fill="${staal}" stroke="#000" stroke-opacity=".3" stroke-width=".4"/>`;
    }
    if (o.maten) s += matenSvg(G);
    return s + '</svg>';
  }
  function matenSvg(G) {
    const S = G.S, kleur = '#8a7a66', t = (x, y, tekst, rot) => `<text x="${f(x)}" y="${f(y)}" font-size="8.5" font-family="Manrope,system-ui,sans-serif" font-weight="600" fill="#5e5750" text-anchor="middle"${rot ? ` transform="rotate(-90 ${f(x)} ${f(y)})"` : ''}>${tekst}</text>`;
    const hl = (x0, x1, y, tekst) => `<path d="M${f(x0)} ${f(y)}H${f(x1)}M${f(x0)} ${f(y - 4)}v8M${f(x1)} ${f(y - 4)}v8" stroke="${kleur}" stroke-width=".7" fill="none"/>` + t((x0 + x1) / 2, y - 3.5, tekst);
    const vl = (x, y0, y1, tekst) => `<path d="M${f(x)} ${f(-y0)}V${f(-y1)}M${f(x - 4)} ${f(-y0)}h8M${f(x - 4)} ${f(-y1)}h8" stroke="${kleur}" stroke-width=".7" fill="none"/>` + t(x - 4, -(y0 + y1) / 2, tekst, true);
    let s = hl(0, G.W, 22, `${G.W} cm`);
    const delen = [...new Set(G.panelen.filter(p => p.soort !== 'boven').flatMap(p => [Math.round(p.x0), Math.round(p.x1)]))].sort((a, b) => a - b);
    if (delen.length > 2) for (let i = 0; i < delen.length - 1; i++) s += hl(delen[i], delen[i + 1], 11, `${delen[i + 1] - delen[i]}`);
    const links = Math.round(G.topY(0)), rechts = Math.round(G.topY(G.W));
    s += vl(-14, 0, links, `${links} cm`);
    if (rechts !== links || S.vorm === 'boog' || S.vorm === 'rondboog') s += vl(G.W + 18, 0, /schuin/.test(S.vorm) ? rechts : G.H, `${/schuin/.test(S.vorm) ? rechts : G.H} cm`);
    if (S.bovenlicht) s += vl(-30, 0, S.hd, `${S.hd}`);
    // maatketting van de liggers (hart op hart): vloer → ligger → … → bovenkant van de deur
    const ketting = (x, hs, tot) => {
      const p = [0, ...hs, tot]; let k = '';
      for (let i = 0; i < p.length - 1; i++) {
        const y0 = p[i], y1 = p[i + 1];
        k += `<path d="M${f(x)} ${f(-y0)}V${f(-y1)}M${f(x - 3)} ${f(-y1)}h6" stroke="${kleur}" stroke-width=".6" fill="none"/>` + t(x - 3.5, -(y0 + y1) / 2, `${Math.round(y1) - Math.round(y0)}`, true);   // posities afronden: stukken tellen op tot het totaal
      }
      return `<path d="M${f(x - 3)} 0h6" stroke="${kleur}" stroke-width=".6"/>` + k;
    };
    const deurTop = S.bovenlicht ? S.hd : Math.round(G.hRef);
    if (G.hoogtes.length) s += ketting(G.W + (rechts !== links || S.vorm === 'boog' || S.vorm === 'rondboog' ? 34 : 18), G.hoogtes, deurTop);
    if (G.zijHoogtes.length && S.zij !== 'geen') s += ketting(S.bovenlicht ? -44 : -30, G.zijHoogtes, deurTop);
    return s;
  }

  const API = { SPIEGELBAAR, KEUZES, STANDAARD, vind, normaliseer, bouwDeur, breedte, svgDeur, naarAdres, uitAdres, overzicht, maten: { K, R, DIEPTE_K, DIEPTE_R, NAAD } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else window.DEUR = API;
})();
