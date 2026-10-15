// AG Style Design — 3D-weergave van de configurator (three.js).
// Bouwt de pui uit de uitkomst van DEUR.bouwDeur (deur-vorm.js), dus altijd gelijk aan de 2D-tekening.
// Maten in cm binnen een groep met schaal 0,01; de wereld (en het licht) is in meters.
// Sfeer: twee kamers — de deur zit in de wand ertussen, zodat je door het glas de kamer erachter ziet.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tekenVisgraat } from './visgraat.js';

const { K, R, DIEPTE_K, DIEPTE_R } = window.DEUR.maten;
const WAND = 12;            // wanddikte (cm)
const PLAFOND = 290;        // standaard plafondhoogte (cm)

// ---------- texturen (zelf getekend, geen beelden van derden) ----------
function canvasTex(w, h, teken, herhaal) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  teken(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (herhaal) t.repeat.set(...herhaal);
  t.anisotropy = 8;
  return t;
}
// eiken planken (vloer)
const vloerTex = () => {
  const t = canvasTex(1024, 1024, (x, w, h) => {
    const rijen = 8, ph = h / rijen;
    for (let r = 0; r < rijen; r++) {
      let px = -Math.random() * w * 0.5;
      while (px < w) {
        const pl = w * (0.45 + Math.random() * 0.4), tint = 150 + Math.random() * 22;
        x.fillStyle = `rgb(${tint},${Math.round(tint * 0.82)},${Math.round(tint * 0.66)})`;
        x.fillRect(px, r * ph, pl, ph);
        for (let k = 0; k < 26; k++) {   // nerf
          x.strokeStyle = `rgba(90,60,30,${0.04 + Math.random() * 0.06})`; x.lineWidth = 1 + Math.random() * 2;
          const yy = r * ph + Math.random() * ph; x.beginPath(); x.moveTo(px, yy);
          x.bezierCurveTo(px + pl * 0.3, yy + (Math.random() - 0.5) * 8, px + pl * 0.7, yy + (Math.random() - 0.5) * 8, px + pl, yy); x.stroke();
        }
        x.fillStyle = 'rgba(60,40,20,.35)'; x.fillRect(px, r * ph, 2, ph);
        px += pl;
      }
      x.fillStyle = 'rgba(60,40,20,.3)'; x.fillRect(0, r * ph, w, 2);
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
// fijne structuur van poedercoating
const ruisTex = () => canvasTex(256, 256, (x, w, h) => {
  const d = x.createImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 40; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
}, [1 / 12, 1 / 12]);
// tegels: marmer (2 × 2 tegels van 120 cm, uit BA Montage) of betonlook (3 × 3 tegels van 60 cm)
function tegelTex(soort) {
  const N = soort === 'marmer' ? 640 : 540, T = soort === 'marmer' ? N / 2 : N / 3;
  const t = canvasTex(N, N, (x) => {
    const img = x.createImageData(N, N), d = img.data;
    const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
    const ruis = (u, v) => { const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), e = h(i + 1, j + 1);
      const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv); return a + (b - a) * su + (c - a) * sv + (a - b - c + e) * su * sv; };
    const fbm = (u, v) => ruis(u, v) * .5 + ruis(u * 2.1, v * 2.1) * .25 + ruis(u * 4.3, v * 4.3) * .125 + ruis(u * 8.7, v * 8.7) * .0625;
    for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) {
      const tg = Math.floor(xx / T) + 3 * Math.floor(y / T), u = (xx % T) / T, v = (y % T) / T, o = tg * 7.3, i = (y * N + xx) * 4;
      const turb = fbm(u * 3 + o, v * 3 + o);
      if (soort === 'marmer') {
        const hoofd = Math.pow(1 - Math.abs(Math.sin((u * 1.3 + v * 0.8 + o) * 3.1 + turb * 7)), 22);
        const fijn = Math.pow(1 - Math.abs(Math.sin((u * 0.6 - v * 1.4 + o) * 6.3 + turb * 11)), 40) * 0.5;
        const ader = Math.min(1, hoofd + fijn), wolk = turb - 0.5;
        d[i] = 236 + wolk * 10 - ader * 70; d[i + 1] = 233 + wolk * 10 - ader * 72; d[i + 2] = 228 + wolk * 9 - ader * 74;
      } else {   // betonlook: rustige wolken en fijne korrel
        const v2 = 150 + (turb - 0.5) * 26 + (h(xx, y) - 0.5) * 10;
        d[i] = v2; d[i + 1] = v2 * 0.985; d[i + 2] = v2 * 0.96;
      }
      d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = soort === 'marmer' ? 'rgba(150,144,136,.55)' : 'rgba(80,78,74,.45)'; x.lineWidth = 2;
    for (let p = 0; p <= N; p += T) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, N); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(N, p); x.stroke(); }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// ribbelglas: verticale ribbels van 1,2 cm
const ribbelTex = () => canvasTex(64, 4, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#000'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}, [1 / 1.2, 1]);

// ---------- omgeving bij de vorm ----------
// recht = keuken met eettafel; schuin = trapkast (meestal een kleine bergruimte onder de trap);
// schuine hoek = zolder (de afschuining volgt het dakvlak). Wens Thomas, 12 oktober 2026.
const omgevingSoort = S => S.vorm === 'schuin' ? 'trap' : S.vorm === 'afgeschuind' ? 'zolder' : 'keuken';
// lijn van de trapboom (schuin) of het dak (schuine hoek), doorgetrokken over de hele wand (cm); null bij recht
function dakLijn(G) {
  const S = G.S;
  if (S.vorm === 'schuin') { const k = (S.h - S.laag) / G.W; return x => (S.kant === 'links' ? S.laag + k * x : S.laag + k * (G.W - x)) + 22; }
  if (S.vorm === 'afgeschuind') { const k = S.ah / S.ab; return x => (S.kant === 'links' ? S.h - S.ah + k * x : S.h - S.ah + k * (G.W - x)) + 15; }
  return null;
}

// bovenkant van de wand bij een trapkast: het zaagtandprofiel van de treden (18 cm), van x = W+600 naar −600 (cm)
// Optrede (cm) uit de helling, met de stapmaat 2 × optrede + aantrede ≈ 63 cm; Bouwbesluit woning: optrede ≤ 22, aantrede ≥ 22
function optredeVan(lijn) {
  const k = Math.max(0.05, Math.abs(lijn(1) - lijn(0)));   // stijging per cm
  return Math.min(22, Math.max(15, 63 / (2 + 1 / k)));
}
function trapProfiel(lijn, G, plafond, x0, x1) {
  const a = lijn(0), b = lijn(1) - a, xVan = y => (y - a) / b, opt = optredeVan(lijn);
  const voet = xVan(0);                                    // hier raakt de trap de vloer: daar houdt de wand op
  if (b > 0) x0 = Math.max(x0, voet); else x1 = Math.min(x1, voet);
  const top = x => Math.max(1, Math.min(plafond, lijn(x)));
  const pts = [];
  for (let y = opt; y <= plafond + opt; y += opt) {
    const yy = Math.min(y, plafond);
    pts.push([xVan(y - opt), yy], [xVan(y), yy]);     // stootbord omhoog, dan de trede vlak
  }
  if (b > 0) pts.reverse();                                // omtrek loopt van rechts naar links
  const binnen = pts.filter(([x]) => x > x0 && x < x1);
  const eind = x => top(x) <= opt ? 0 : Math.min(plafond, opt * Math.ceil(top(x) / opt));
  return [[x1, eind(x1)], ...binnen, [x0, eind(x0)]];
}

// ---------- de kamer achter de deur: keuken met een grote eettafel (eenvoudige vormen, meters) ----------
function maakKeuken(groep) {
  const mat = (color, roughness = 0.7, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const blok = (b, h, d, x, y, z, m, schaduw = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), m); o.position.set(x, y, z); o.castShadow = schaduw; o.receiveShadow = true; groep.add(o); return o; };
  const ZA = -6.5;                                   // achterwand (diepe kamer)
  const wand = mat('#d8cfc2', 0.95), front = mat('#cdc2b2', 0.55), steen = mat('#ebe7e1', 0.22), eik = mat('#a27b55', 0.55);
  const staal = mat('#1c1c1c', 0.5, 0.4), stof = mat('#bfb3a2', 0.9), groen = mat('#5d6e4f', 0.85);
  const achter = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wand); achter.position.set(0, 3, ZA); achter.receiveShadow = true; groep.add(achter);
  // zijwanden: zie kamer() in maak3D (één doorlopende kamer voor en achter de deur)
  // keukenwand: onderkasten, werkblad, achterwand van steen, open plank en hoge kasten
  const k0 = -2.6, k1 = 1.4, kz = ZA + 0.32;
  blok(k1 - k0, 0.82, 0.6, (k0 + k1) / 2, 0.49, kz, front);
  blok(k1 - k0, 0.1, 0.54, (k0 + k1) / 2, 0.05, kz - 0.03, mat('#3a3631', 0.8));           // plint
  for (let x = k0 + 0.6; x < k1 - 0.1; x += 0.6) blok(0.004, 0.8, 0.005, x, 0.49, kz + 0.301, mat('#a99d8c'), false);   // naden tussen de fronten
  blok(k1 - k0 + 0.02, 0.04, 0.64, (k0 + k1) / 2, 0.92, kz + 0.01, steen);
  const RX = 0.55, RO = 1.0;                         // midden van het raam (achter de kraan) en de onderkant van de vensterbank
  for (const [a, b] of [[k0, RX - 0.66], [RX + 0.66, k1]]) blok(b - a, 0.62, 0.02, (a + b) / 2, 1.25, ZA + 0.01, steen, false);
  blok(1.32, RO - 0.94, 0.02, RX, (0.94 + RO) / 2, ZA + 0.01, steen, false);
  // open plank, direct op de bovenrand van de stenen achterwand (1,56 m; Thomas: "op hoogte van de witte rand")
  blok(0.8, 0.04, 0.26, -2.12, 1.58, ZA + 0.13, eik);
  for (const [x, h] of [[-2.38, 0.2], [-2.16, 0.14], [-1.9, 0.24]]) blok(0.1, h, 0.1, x, 1.6 + h / 2, ZA + 0.13, mat(x < -2.3 ? '#e8e2d8' : '#6b5a48', 0.6));
  blok(0.62, 0.006, 0.42, RX, 0.943, kz + 0.02, mat('#8f8d89', 0.28, 0.7));               // spoelbak (rvs, in het werkblad)
  blok(0.05, 0.3, 0.05, RX, 1.08, kz - 0.14, staal);                                           // kraan
  blok(0.05, 0.03, 0.22, RX, 1.22, kz - 0.06, staal);
  blok(1.2, 2.5, 0.62, k1 + 0.6, 1.25, kz, front);                                            // hoge kasten
  blok(0.6, 0.6, 0.02, k1 + 0.6, 1.25, kz + 0.32, mat('#222', 0.3, 0.6));                     // oven
  blok(0.004, 2.4, 0.005, k1 + 0.6, 1.25, kz + 0.312, mat('#a99d8c'), false);
  // raam achter de kraan en de spoelbak, net boven het werkblad (helder licht); vensterbank van dezelfde steen
  // uitzicht: lucht, bomen in de verte en een haag (licht onscherp, zoals door een raam gezien)
  const tuin = canvasTex(512, 390, (c, w, h) => {
    const lucht = c.createLinearGradient(0, 0, 0, h * 0.7); lucht.addColorStop(0, '#cfe0ec'); lucht.addColorStop(1, '#f3f1ea');
    c.fillStyle = lucht; c.fillRect(0, 0, w, h);
    c.filter = 'blur(6px)';
    for (let i = 0; i < 14; i++) { c.fillStyle = ['#9fb08f', '#8a9f7c', '#b3bea1'][i % 3]; c.beginPath(); c.ellipse(i * 40 + (i % 2) * 14, h * (0.48 - (i % 4) * 0.03), 46, 70 + (i % 3) * 18, 0, 0, Math.PI * 2); c.fill(); }   // bomen
    c.fillStyle = '#6f8562'; c.fillRect(0, h * 0.62, w, h * 0.16);                                                       // haag
    c.fillStyle = '#b8c49a'; c.fillRect(0, h * 0.78, w, h * 0.22);                                                       // gras
    c.filter = 'none';
  });
  tuin.colorSpace = THREE.SRGBColorSpace;
  const rb = 1.25, rh = 0.95, ry = RO + 0.06 + rh / 2;
  const raam = new THREE.Mesh(new THREE.PlaneGeometry(rb, rh), new THREE.MeshBasicMaterial({ map: tuin, toneMapped: false })); raam.position.set(RX, ry, ZA + 0.012); groep.add(raam);
  blok(rb + 0.06, 0.04, 0.06, RX, ry + rh / 2 + 0.02, ZA + 0.03, staal, false); blok(rb + 0.06, 0.04, 0.06, RX, ry - rh / 2 - 0.02, ZA + 0.03, staal, false);
  for (const x of [RX - rb / 2 - 0.01, RX, RX + rb / 2 + 0.01]) blok(0.04, rh + 0.05, 0.06, x, ry, ZA + 0.03, staal, false);
  blok(rb + 0.14, 0.03, 0.12, RX, RO + 0.015, ZA + 0.06, steen);                              // vensterbank
  // eettafel: eiken blad op een stalen onderstel, zes stoelen, kleed — de lengte loopt de kamer in (langs z)
  const tz = -3.1, tb = 2.4, td = 1.0;
  const kleed = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.3), mat('#cfc6b8', 0.95)); kleed.rotation.x = -Math.PI / 2; kleed.position.set(0, 0.004, tz); kleed.receiveShadow = true; groep.add(kleed);
  blok(td, 0.05, tb, 0, 0.75, tz, eik);
  for (const z of [tz - tb / 2 + 0.3, tz + tb / 2 - 0.3]) {   // sledepoten van staal
    blok(0.06, 0.7, 0.06, -td / 2 + 0.12, 0.375, z, staal); blok(0.06, 0.7, 0.06, td / 2 - 0.12, 0.375, z, staal);
    blok(td - 0.18, 0.05, 0.06, 0, 0.7, z, staal); blok(td - 0.18, 0.04, 0.06, 0, 0.02, z, staal);
  }
  for (const x of [-td / 2 - 0.22, td / 2 + 0.22]) for (const z of [tz - 0.75, tz, tz + 0.75]) {
    const buiten = x > 0 ? 1 : -1;
    blok(0.44, 0.06, 0.46, x, 0.46, z, stof);                                    // zitting
    blok(0.05, 0.36, 0.46, x + buiten * 0.2, 0.68, z, stof);                      // rug aan de buitenkant
    for (const dx of [-0.18, 0.18]) for (const dz of [-0.2, 0.2]) blok(0.025, 0.44, 0.025, x + dx, 0.22, z + dz, staal);
  }
  // hanglamp boven de tafel: zwarte balk (langs de tafel) met warm licht
  blok(0.06, 0.05, 1.6, 0, 1.62, tz, staal);
  const gloed = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 1.5), new THREE.MeshBasicMaterial({ color: '#ffe3b8' })); gloed.rotation.x = Math.PI / 2; gloed.position.set(0, 1.594, tz); groep.add(gloed);
  for (const z of [tz - 0.7, tz + 0.7]) blok(0.006, 1.6, 0.006, 0, 2.42, z, staal, false);
  const lamp = new THREE.PointLight('#ffd9a8', 2.2, 4.5, 1.8); lamp.position.set(0, 1.5, tz); groep.add(lamp);
  // decoratie: schaal op tafel en een plant in de hoek
  blok(0.36, 0.06, 0.36, 0, 0.805, tz + 0.35, mat('#e9e3d9', 0.5));
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.45, 24), mat('#e4ddd2', 0.8)); pot.position.set(2.85, 0.225, ZA + 1.4); pot.castShadow = true; groep.add(pot);
  for (let i = 0; i < 7; i++) { const blad = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 - i * 0.012, 0), groen); blad.position.set(2.85 + Math.sin(i * 2.1) * 0.16, 0.6 + i * 0.13, ZA + 1.4 + Math.cos(i * 2.1) * 0.14); blad.castShadow = true; groep.add(blad); }
}

export function maak3D(houder) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  houder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8d0c4');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.32; controls.maxPolarAngle = Math.PI * 0.56;
  controls.minAzimuthAngle = -Math.PI * 0.36; controls.maxAzimuthAngle = Math.PI * 0.36;

  // licht
  const hemi = new THREE.HemisphereLight('#fffaf2', '#8a7a68', 0.9); scene.add(hemi);
  const zon = new THREE.DirectionalLight('#fff4e4', 2.2);
  zon.position.set(-3.6, 3.2, 1.8); zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048); zon.shadow.bias = -0.0004; zon.shadow.normalBias = 0.02;
  Object.assign(zon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -1, near: 0.5, far: 12 });
  scene.add(zon);

  // vaste kamer (vloer, achterwand, raam en een kast in de achterkamer)
  const vast = new THREE.Group(); scene.add(vast);
  const VLOER_B = 40, VLOER_D = 40;   // m; ruim groter dan de kamer
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(VLOER_B, VLOER_D), new THREE.MeshStandardMaterial({ roughness: 0.62 }));
  vloer.position.z = 0; vloer.rotation.x = -Math.PI / 2; vloer.receiveShadow = true; vast.add(vloer);
  const keukenGroep = new THREE.Group(); vast.add(keukenGroep); maakKeuken(keukenGroep);

  const wereld = new THREE.Group(); wereld.scale.setScalar(0.01); scene.add(wereld);
  let zijWanden = [], deurGroepen = [], openStand = 0, openDoel = 0, huidig = null, wandMat = null, rail = null;
  const ruis = ruisTex(), ribbel = ribbelTex();

  function staalMat(S) {
    const k = window.DEUR.vind('kleur', S.kleur);
    const glad = S.structuur === 'glad';   // fijnstructuur: lichte korrel; glad: egaal en iets gladder
    return new THREE.MeshStandardMaterial({ color: k.hex, metalness: k.metaal, roughness: glad ? Math.max(0.3, k.ruw - 0.15) : k.ruw, bumpMap: glad ? null : ruis, bumpScale: 0.25, envMapIntensity: 0.9 });
  }
  function glasMat(S) {
    const g = window.DEUR.vind('glas', S.glas);
    if (g.code === 'spiegel') return new THREE.MeshStandardMaterial({ color: '#dfe2e1', metalness: 1, roughness: 0.03, envMapIntensity: 1.4 });
    return new THREE.MeshPhysicalMaterial({
      color: g.hex, transparent: true, opacity: g.dekking, depthWrite: false, side: THREE.DoubleSide,
      roughness: g.code.startsWith('mat') ? 0.85 : g.code === 'ribbel' ? 0.22 : 0.04, metalness: 0, envMapIntensity: 1.3,
      bumpMap: g.code === 'ribbel' ? ribbel : null, bumpScale: g.code === 'ribbel' ? 3 : 0,
    });
  }
  const vormVan = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
  const pad = pts => { const p = new THREE.Path(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
  const schaduw = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  function wis(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); g.clear(); }

  // ---------- de kamer om de deur heen: zijwanden voor en achter, achterwand achter de camera, plinten rondom ----------
  const plafondVan = G => Math.max(PLAFOND + 160, G.H + 200);
  const cameraAfstand = G => Math.max(3.6, Math.max(G.W / 100 * 1.4, G.H / 100 * 1.6) + 1.9);
  function kamerMaten(G) {   // cm, in wereld-coördinaten (x = 0 is de linkerkant van de pui)
    const d = cameraAfstand(G) * 1.5, half = Math.max(G.W / 200 + 150, d * 93 + 40);   // breed genoeg bij maximaal draaien
    const k = { xa: G.W / 2 - half, xb: G.W / 2 + half, zf: d * 100 + 80, za: -650, door: 0 };   // door: zo ver mag de camera buiten de zijmuren
    if (omgevingSoort(G.S) === 'trap') {   // trapkast: muren dicht op de voet van de trap en op de deur (camera wordt begrensd)
      const lijn = dakLijn(G), a = lijn(0), b = lijn(1) - a, voet = -a / b, eind = (plafondVan(G) - a) / b;
      k.door = 300;
      if (b > 0) { k.xa = voet - 150; k.xb = Math.max(G.W + 120, eind + 30); }
      else { k.xb = voet + 150; k.xa = Math.min(-120, eind - 30); }
    }
    return k;
  }
  function kamer(G, K3, plafond, plintMat) {
    const mat = new THREE.MeshStandardMaterial({ color: '#dcd4c8', roughness: 0.95, side: THREE.DoubleSide });
    const vlak = (b, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; wereld.add(m); return m; };
    const plint = (l, x, z, ry) => { const p = new THREE.Mesh(new THREE.BoxGeometry(l, 9, 1.2), plintMat); p.position.set(x, 4.5, z); p.rotation.y = ry; p.receiveShadow = true; wereld.add(p); return p; };
    const diep = K3.zf - K3.za, zm = (K3.zf + K3.za) / 2, achterKamer = omgevingSoort(G.S) === 'keuken';
    zijWanden = [];
    for (const [x, kant] of [[K3.xa, 1], [K3.xb, -1]]) {
      const delen = [vlak(diep, plafond, x, plafond / 2, zm, kant * Math.PI / 2)];          // zijwand
      const voor = K3.zf - WAND / 2;                                                        // plint voorkamer
      delen.push(plint(voor, x + kant * 0.6, WAND / 2 + voor / 2, Math.PI / 2));
      zijWanden.push({ x, kant, delen });                                                   // verdwijnt als de camera erachter staat
    }
    const breed = K3.xb - K3.xa + 2 * K3.door;
    vlak(breed, plafond, (K3.xa + K3.xb) / 2, plafond / 2, K3.zf, Math.PI);                 // achterwand achter de camera
    if (omgevingSoort(G.S) !== 'zolder') {   // plafond (de zolder heeft een eigen dak)
      const pf = new THREE.Mesh(new THREE.PlaneGeometry(breed, diep), new THREE.MeshStandardMaterial({ color: '#f1ece5', roughness: 0.95, side: THREE.DoubleSide, emissive: '#c4bdb2', emissiveIntensity: 0.8 })); pf.rotation.x = Math.PI / 2; pf.position.set((K3.xa + K3.xb) / 2, plafond, zm); wereld.add(pf);
    }
    plint(breed, (K3.xa + K3.xb) / 2, K3.zf - 0.6, 0);
    if (achterKamer) {   // keuken: eigen zijwanden vlak naast de keuken (anders kijk je schuin door de deur een open ruimte in)
      const ka = G.W / 2 - Math.max(330, G.W / 2 + 60), kb = G.W / 2 + Math.max(345, G.W / 2 + 60), a = -WAND / 2 - K3.za, zk = K3.za + a / 2;
      for (const [x, kant] of [[ka, 1], [kb, -1]]) { vlak(a, plafond, x, plafond / 2, zk, kant * Math.PI / 2); plint(a, x + kant * 0.6, zk, Math.PI / 2); }
      for (const [a0, b0] of [[ka, 0], [G.W, kb]]) plint(b0 - a0, (a0 + b0) / 2, -WAND / 2 - 0.6, 0);   // plint achter de deurwand, onderbroken door de deur
    }
  }

  // ---------- omgeving bij de vorm (cm, in de wereldgroep): trapkast bij schuin, zolder bij schuine hoek ----------
  function bouwOmgeving(G) {
    const S = G.S, soort = omgevingSoort(S), lijn = dakLijn(G);
    keukenGroep.visible = soort === 'keuken';
    if (soort === 'keuken') return;
    const m = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
    const blok = (b, h, d, x, y, z, mat, schaduw = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat); o.position.set(x, y, z); o.castShadow = schaduw; o.receiveShadow = true; wereld.add(o); return o; };
    const wit = m('#ece7df', 0.92, { side: THREE.DoubleSide }), eik = m('#b08a60', 0.6), donkerEik = m('#6f5440', 0.65);
    const dakWit = m('#f1ece5', 0.95, { side: THREE.DoubleSide, emissive: '#c4bdb2', emissiveIntensity: 0.8 });   // onderkant dak: krijgt weinig licht
    const a = lijn(0), b = lijn(1) - a, xVan = y => (y - a) / b, op = b > 0 ? 1 : -1;   // op: kant waar de lijn stijgt
    const K3 = kamerMaten(G), plafond = plafondVan(G), staal = staalMat(S);

    if (soort === 'trap') {
      // trap boven de kast: optrede uit de helling (zie optredeVan), 90 cm breed, achter het wandvlak; de wand is de trapboom.
      // De trap loopt door tot het plafond (daar gaat hij door het trapgat naar boven)
      const TOP = plafond, diep = 90, z0 = -WAND / 2, z1 = z0 - diep, zm = (z0 + z1) / 2, opt = optredeVan(lijn);
      // onderkant van de trap: schuin plafond van de kast (dicht, geen kier tussen de treden)
      const xs = Math.max(K3.xa, Math.min(xVan(0), xVan(TOP))), xe = Math.min(K3.xb, Math.max(xVan(0), xVan(TOP)));
      const bodem = new THREE.Shape([[xs, lijn(xs)], [xe, lijn(xe)], [xe, lijn(xe) - 3], [xs, lijn(xs) - 3]].map(([x, y]) => new THREE.Vector2(x, Math.max(0, y))));
      const bg = new THREE.ExtrudeGeometry(bodem, { depth: diep, bevelEnabled: false }); bg.translate(0, 0, z1);
      const bm = new THREE.Mesh(bg, wit); bm.receiveShadow = true; wereld.add(bm);
      for (let y = opt; y <= TOP; y += opt) {
        const xa = xVan(y - opt), xb = xVan(y), x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
        if (x1 < K3.xa || x0 > K3.xb) continue;
        blok(x1 - x0 + 2, 4, diep, (x0 + x1) / 2, y - 2, zm, eik);                        // trede
        blok(2, opt - 4, diep, xa, y - opt / 2 - 2, zm, wit);                              // stootbord aan de lage kant
      }
      // plint loopt door in de hoek naast de voet van de trap: langs de zijmuur naar achteren en dan langs de trapwand
      { const pm = m('#efeae2', 0.5), voet = xVan(0), muur = zijWanden.find(w => w.kant === op), xm = muur.x;
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(voet - xm), 9, 1.2), pm);
        p1.position.set((voet + xm) / 2, 4.5, z1 + 0.6); p1.receiveShadow = true; wereld.add(p1);
        const l = WAND / 2 - z1, p2 = new THREE.Mesh(new THREE.BoxGeometry(l, 9, 1.2), pm);
        p2.position.set(xm + op * 0.6, 4.5, z1 + l / 2); p2.rotation.y = Math.PI / 2; p2.receiveShadow = true; wereld.add(p2);
        muur.delen.push(p2); }
      const trapwand = new THREE.Mesh(new THREE.PlaneGeometry(K3.xb - K3.xa + 2 * K3.door, TOP), wit); trapwand.position.set((K3.xa + K3.xb) / 2, TOP / 2, z1); trapwand.receiveShadow = true; wereld.add(trapwand);
      // de kast: zijwand aan de hoge kant, planken met voorraad, een warm lampje
      const xEind = op > 0 ? G.W + 25 : -25, hEind = Math.min(330, lijn(xEind));
      blok(2, hEind, diep, xEind, hEind / 2, zm, wit);
      const flesKleur = [m('#2f4a32', 0.25), m('#5a2b22', 0.25), m('#1e1e1e', 0.3), m('#d9cfbf', 0.7)];
      [32, 72, 112, 152].forEach((hp, r) => {
        const xa = xVan(hp + 35), x0 = Math.max(Math.min(xa, xEind), -600), x1 = Math.min(Math.max(xa, xEind), G.W + 600);
        if (x1 - x0 < 30) return;
        blok(x1 - x0, 2.5, 30, (x0 + x1) / 2, hp, z1 + 16, donkerEik);
        for (let x = x0 + 10, i = 0; x < x1 - 8; x += 9, i++) {
          if ((i + r) % 7 === 5) { blok(22, 16, 22, x + 6, hp + 9, z1 + 16, flesKleur[3]); x += 18; continue; }   // doos
          const fl = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 26, 14), flesKleur[(i + r) % 3]);
          fl.position.set(x, hp + 14, z1 + 14); fl.castShadow = true; wereld.add(fl);
          const hals = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 8, 10), flesKleur[(i + r) % 3]); hals.position.set(x, hp + 31, z1 + 14); wereld.add(hals);
        }
      });
      const lampje = new THREE.PointLight('#ffd7a0', 1.4, 2.2, 1.6); lampje.position.set(G.W / 2, Math.min(lijn(G.W / 2), 200) - 30, zm); wereld.add(lampje);
      // traphek op de open kant van de trap (stalen kader met smoke glas, kleur = deur) en een stalen leuning aan de wand
      const neus = x => lijn(x) + opt;                                                       // lijn door de voorkant van de treden
      const hekEind = TOP - opt - 100 - 8;                                                     // het hek houdt op vóór het plafond
      const tA = Math.max(K3.xa + 20, Math.min(xVan(0), xVan(hekEind))), tB = Math.min(K3.xb - 20, Math.max(xVan(0), xVan(hekEind)));
      const staaf = (xA, yA, xB, yB, z, dik, mat, diep = dik) => {
        const l = Math.hypot(xB - xA, yB - yA), o = new THREE.Mesh(new THREE.BoxGeometry(l, dik, diep), mat);
        o.position.set((xA + xB) / 2, (yA + yB) / 2, z); o.rotation.z = Math.atan2(yB - yA, xB - xA); o.castShadow = true; wereld.add(o);
      };
      const zH = 0, HEK = 100;   // midden op de witte rand (de wand volgt de treden)
      const rand = x => opt * Math.ceil((lijn(x) - 0.01) / opt);   // hoogte van de rand (bovenkant trede) op plek x
      staaf(tA, neus(tA) + HEK, tB, neus(tB) + HEK, zH, 5, staal, 5);                       // bovenregel
      staaf(tA, neus(tA) + 10, tB, neus(tB) + 10, zH, 3.5, staal, 3.5);                     // onderregel
      const vakken = Math.max(2, Math.round((tB - tA) / 115));
      const rook = new THREE.MeshPhysicalMaterial({ color: '#3b3b3a', transparent: true, opacity: 0.55, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
      for (let i = 0; i <= vakken; i++) {
        const x = tA + (tB - tA) * i / vakken;
        const voet = rand(x), top = neus(x) + HEK;
        blok(4, top - voet, 4, x, (voet + top) / 2, zH, staal);                               // staander, staat op de rand
        if (i < vakken) {                                                                     // glasvak, schuin mee met de trap
          const xn = tA + (tB - tA) * (i + 1) / vakken;
          const g = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([[x + 2, neus(x + 2) + 12], [xn - 2, neus(xn - 2) + 12], [xn - 2, neus(xn - 2) + HEK - 3], [x + 2, neus(x + 2) + HEK - 3]].map(([px, py]) => new THREE.Vector2(px, py)))), rook);
          g.position.z = zH; g.renderOrder = 2; wereld.add(g);
        }
      }
      // leuning aan de wand: ronde stalen buis op 90 cm boven de treden, met dragers
      const zL = z1 + 7, ronde = (l, r) => new THREE.CylinderGeometry(r, r, l, 16);
      { const l = Math.hypot(tB - tA, neus(tB) - neus(tA)), o = new THREE.Mesh(ronde(l, 2.1), staal);
        o.position.set((tA + tB) / 2, (neus(tA) + neus(tB)) / 2 + 90, zL); o.rotation.z = Math.atan2(neus(tB) - neus(tA), tB - tA) - Math.PI / 2; o.castShadow = true; wereld.add(o); }
      for (let x = tA + 30; x < tB - 10; x += 120) {
        const d = new THREE.Mesh(ronde(7, 0.9), staal); d.rotation.x = Math.PI / 2; d.position.set(x, neus(x) + 86, z1 + 3.5); wereld.add(d);
        const pl = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 20), staal); pl.rotation.x = Math.PI / 2; pl.position.set(x, neus(x) + 86, z1 + 0.5); wereld.add(pl);
      }
    }

    if (soort === 'zolder') {
      // dakvlak met spanten over voor- én achterkamer, knieschot van 70 cm, dakramen, en achter de deur een slaapkamertje
      const knie = 70, nok = plafond, xk = xVan(knie), xn = xVan(nok);
      const lengte = Math.hypot(xn - xk, nok - knie), hoek = Math.atan2(nok - knie, xn - xk), nx = -Math.sin(hoek), ny = Math.cos(hoek);
      const inDak = (geo, mat, t, z, af) => {   // vlak of balk in het dak: t = plek langs de helling (0..1), af = cm onder het dakvlak
        geo.rotateX(-Math.PI / 2);
        const o = new THREE.Mesh(geo, mat); o.rotation.z = hoek;
        o.position.set(xk + (xn - xk) * t - nx * af * Math.sign(ny), knie + (nok - knie) * t - Math.abs(ny) * af, z); wereld.add(o); return o;
      };
      const zDak = (K3.za + K3.zf) / 2, lDak = K3.zf - K3.za + 100, SPANT = 90, RAMEN = [225, -315];   // spanten om de 90 cm; dakramen precies tussen twee spanten
      inDak(new THREE.PlaneGeometry(lengte, lDak), dakWit, 0.5, zDak, 0).receiveShadow = true;
      // plat plafond voorbij de nok (anders zie je daar de lucht)
      const pX0 = op > 0 ? xn : K3.xa, pX1 = op > 0 ? K3.xb : xn;
      if (pX1 > pX0) { const pf = new THREE.Mesh(new THREE.PlaneGeometry(pX1 - pX0, lDak), dakWit); pf.rotation.x = Math.PI / 2; pf.position.set((pX0 + pX1) / 2, plafond, zDak); wereld.add(pf); }
      for (let z = Math.ceil(K3.za / SPANT) * SPANT; z <= K3.zf; z += SPANT) inDak(new THREE.BoxGeometry(lengte, 6, 7), m('#d2b48b', 0.7, { emissive: '#9a7f5c', emissiveIntensity: 0.6 }), 0.5, z, 4);   // spanten
      for (const z of RAMEN) {   // dakramen: 78 breed (past tussen de spanten), 118 lang langs de helling
        inDak(new THREE.PlaneGeometry(118, 78), m('#2b2b2b', 0.5, { side: THREE.DoubleSide }), 0.42, z, 0.6);
        inDak(new THREE.PlaneGeometry(106, 66), new THREE.MeshBasicMaterial({ color: '#f5f7f8', side: THREE.DoubleSide }), 0.42, z, 1.2);
      }
      const knieschot = new THREE.Mesh(new THREE.PlaneGeometry(lDak, knie), dakWit); knieschot.rotation.y = Math.PI / 2; knieschot.position.set(xk, knie / 2, zDak); knieschot.receiveShadow = true; wereld.add(knieschot);
      const kp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, lDak), m('#efeae2', 0.5)); kp.position.set(xk + op * 0.6, 4.5, zDak); kp.receiveShadow = true; wereld.add(kp);   // plint langs het knieschot
      const gevel = new THREE.Mesh(new THREE.PlaneGeometry(2000, 600), wit); gevel.position.set(G.W / 2, 300, -600); wereld.add(gevel);
      // slaapkamertje: laag bed langs het knieschot, nachtkastje, plant
      const bx = xk + op * 105, bz = -340;
      blok(170, 28, 215, bx, 14, bz, donkerEik);
      blok(160, 18, 205, bx, 37, bz, m('#f1eee8', 0.95));
      blok(150, 6, 120, bx, 48, bz + 30, m('#cdbfa9', 0.95));                                        // plaid
      for (const dx of [-38, 38]) blok(60, 14, 34, bx + dx, 52, bz - 82, m('#f7f5f1', 0.95));       // kussens
      blok(40, 45, 38, bx + op * 120, 22.5, bz - 80, eik);
      const vaas = new THREE.Mesh(new THREE.CylinderGeometry(8, 6, 26, 16), m('#e4ddd2')); vaas.position.set(bx + op * 120, 58, bz - 80); wereld.add(vaas);
      const kleed = new THREE.Mesh(new THREE.PlaneGeometry(240, 300), m('#d8cfc1', 0.95)); kleed.rotation.x = -Math.PI / 2; kleed.position.set(bx, 0.5, bz); kleed.receiveShadow = true; wereld.add(kleed);
    }
  }

  function toon(G) {
    wis(wereld); deurGroepen = []; huidig = G;
    const S = G.S, staal = staalMat(S), glas = glasMat(S);
    const schuif = S.type === 'schuif', zDeur = schuif ? WAND / 2 + 3 : 0;

    // wand met sparing in de vorm van de pui
    const plafond = plafondVan(G);   // hoger dan het beeld: geen rand zichtbaar
    // één doorlopende omtrek met de sparing als inham: een gat dat de onderrand raakt gaf rare driehoeken op de vloer
    // de kamer: breed en diep genoeg dat de camera er altijd binnen blijft (cm, wereld-coördinaten)
    const K3 = kamerMaten(G), xa = K3.xa - K3.door, xb = K3.xb + K3.door;   // de wand loopt door achter de zijmuren
    const n = Math.max(24, Math.ceil(G.W / 3)), rand = [[xa, 0], [0, 0]];
    for (let i = 0; i <= n; i++) { const x = G.W * i / n; rand.push([x, G.topY(x)]); }
    // bovenkant van de wand: plafond, of de trapboom (schuin) of het dakvlak (schuine hoek)
    const lijn = dakLijn(G), wandTop = x => lijn ? Math.max(1, Math.min(plafond, lijn(x))) : plafond;
    rand.push([G.W, 0], [xb, 0]);
    let p0 = xa, p1 = xb;   // plinten aan de voorkant lopen tot hier (bij een trapkast: tot de voet van de trap)
    if (omgevingSoort(S) === 'trap') {
      const prof = trapProfiel(lijn, G, plafond, xa, xb); rand.push(...prof);   // dichte trapwang: wand volgt de treden
      p1 = prof[0][0]; p0 = prof[prof.length - 1][0];
      if (p0 > xa) rand[0][0] = p0;                                    // wand begint pas bij de voet van de trap
      if (p1 < xb) { const i = rand.findIndex(([x, y]) => x === xb && y === 0); if (i > 0) rand[i][0] = p1; }
    } else for (let x = xb; x >= xa - 1; x -= 10) rand.push([Math.max(x, xa), wandTop(Math.max(x, xa))]);
    const wandVorm = vormVan(rand);
    wandMat = new THREE.MeshStandardMaterial({ color: '#dcd4c8', roughness: 0.95 });
    const wand = new THREE.Mesh(new THREE.ExtrudeGeometry(wandVorm, { depth: WAND, bevelEnabled: false, curveSegments: 4 }), wandMat);
    wand.position.z = -WAND / 2; wand.receiveShadow = true; wand.castShadow = true; wereld.add(wand);
    // plint aan de voorkant, onderbroken door de sparing
    const plintMat = new THREE.MeshStandardMaterial({ color: '#efeae2', roughness: 0.5 });
    for (const [a, b] of [[p0, 0], [G.W, p1]]) if (b - a > 1) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(b - a, 9, 1.2), plintMat);
      p.position.set((a + b) / 2, 4.5, WAND / 2 + 0.6); p.receiveShadow = true; wereld.add(p);
    }
    kamer(G, K3, plafond, plintMat);

    bouwOmgeving(G);

    // panelen
    for (const P of G.panelen) {
      const groep = new THREE.Group();
      const kader = new THREE.Shape(); P.buiten.forEach(([x, y], i) => i ? kader.lineTo(x, y) : kader.moveTo(x, y)); kader.closePath();
      kader.holes.push(pad(P.binnen));
      const kg = new THREE.ExtrudeGeometry(kader, { depth: DIEPTE_K, bevelEnabled: false, curveSegments: 2 });
      kg.translate(0, 0, -DIEPTE_K / 2);
      groep.add(schaduw(new THREE.Mesh(kg, staal)));
      const gg = new THREE.ShapeGeometry(vormVan(P.binnen));
      const gm = new THREE.Mesh(gg, glas); gm.renderOrder = 2; groep.add(gm);
      for (const b of G.staven.filter(s => s.paneel === P.id)) {
        const m = schaduw(new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, DIEPTE_R), staal));
        m.position.set(b.x + b.w / 2, b.y + b.h / 2, 0); groep.add(m);
      }
      for (const b of G.bogen.filter(s => s.paneel === P.id)) for (let i = 1; i < b.pts.length; i++) {
        const [x0, y0] = b.pts[i - 1], [x1, y1] = b.pts[i], l = Math.hypot(x1 - x0, y1 - y0);
        const m = schaduw(new THREE.Mesh(new THREE.BoxGeometry(l + R * 0.6, R, DIEPTE_R), staal));
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.rotation.z = Math.atan2(y1 - y0, x1 - x0); groep.add(m);
      }
      for (const p of G.platen.filter(s => s.paneel === P.id)) {
        const pg = new THREE.ExtrudeGeometry(vormVan(p.pts), { depth: 1.2, bevelEnabled: false }); pg.translate(0, 0, -0.6);
        groep.add(schaduw(new THREE.Mesh(pg, staal)));
      }
      for (const g of G.grepen.filter(s => s.paneel === P.id)) groep.add(maakGreep(g, staal));

      if (P.soort === 'deur') {
        const draai = new THREE.Group();
        const px = schuif ? 0 : P.draaiX;
        const pz = schuif ? 0 : -DIEPTE_K / 2;   // scharnier/taats: draaipunt aan de achterkant van het kader
        draai.position.set(px, 0, zDeur + pz); groep.position.set(-px, 0, -pz);
        draai.add(groep); wereld.add(draai);
        deurGroepen.push({ draai, P, S });
      } else { groep.position.z = 0; wereld.add(groep); }
    }
    // rail boven de schuifdeur
    // alleen boven de deur(en) plus de ruimte waar ze naartoe schuiven (niet over de hele pui)
    if (schuif && deurGroepen.length) {
      let r0 = Infinity, r1 = -Infinity, top = 0;
      for (const { P } of deurGroepen) {
        const breed = P.x1 - P.x0, richting = S.deuren === 2 ? (P.deur === 0 ? -1 : 1) : (S.draai === 'links' ? -1 : 1);
        r0 = Math.min(r0, P.x0, P.x0 + richting * breed * 0.92); r1 = Math.max(r1, P.x1, P.x1 + richting * breed * 0.92);
        top = Math.max(top, ...P.buiten.map(q => q[1]));
      }
      rail = schaduw(new THREE.Mesh(new THREE.BoxGeometry(r1 - r0 + 10, 5, 3), staal));
      rail.position.set((r0 + r1) / 2, top + 4, zDeur);
      wereld.add(rail);
    }
    wereld.position.set(-G.W / 200, 0, 0);
    zetOpen(openStand);
    const maat = G.W + 'x' + G.H + omgevingSoort(S) + S.kant;   // andere maat of omgeving: camera opnieuw zo zetten dat de hele pui in beeld is
    if (!camera.userData.gezet || camera.userData.maat !== maat) { camera.userData.maat = maat; reset(); } else grenzen();
  }

  // grepen aan beide kanten van de deur; g.type = vorm uit DEUR.KEUZES.greep (hoek, beugel, buis, koker, maan, klink, kom)
  function maakGreep(g, staal) {
    const grp = new THREE.Group(), d = DIEPTE_K / 2;
    const zijde = g.kant === 'rechts' ? -1 : 1, gx = g.x + zijde * 3.2;
    const zet = (geo, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, staal); m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; m.castShadow = true; grp.add(m); return m; };
    for (const z of [1, -1]) {
      if (g.type === 'hoek') { zet(new THREE.BoxGeometry(2, g.lengte, 3.2), gx, g.y, z * (d + 1.6)); zet(new THREE.BoxGeometry(3.4, g.lengte, 0.6), gx + zijde * 1.2, g.y, z * (d + 3)); continue; }
      if (g.type === 'beugel' || g.type === 'buis' || g.type === 'koker') {
        const af = 4.5, staaf = g.type === 'buis' ? new THREE.CylinderGeometry(1.1, 1.1, g.lengte, 20) : g.type === 'koker' ? new THREE.BoxGeometry(2.4, g.lengte, 2.4) : new THREE.BoxGeometry(2, g.lengte, 1.4);
        zet(staaf, gx, g.y, z * (d + af + 1));
        for (const dy of [-1, 1]) zet(g.type === 'buis' ? new THREE.CylinderGeometry(0.7, 0.7, af, 12) : new THREE.BoxGeometry(1.4, 1.4, af), gx, g.y + dy * (g.lengte / 2 - 4), z * (d + af / 2), g.type === 'buis' ? Math.PI / 2 : 0);
        continue;
      }
      if (g.type === 'maan') {   // halve schijf tegen de stijl
        zet(new THREE.CylinderGeometry(7, 7, 1.6, 32, 1, false, 0, Math.PI), gx - zijde * 1.5, g.y, z * (d + 1.6), Math.PI / 2, zijde > 0 ? 0 : Math.PI);
        continue;
      }
      if (g.type === 'klink') {   // rozet met kruk naar binnen
        zet(new THREE.CylinderGeometry(2.6, 2.6, 1, 24), gx + zijde * 1, g.y, z * (d + 0.5), Math.PI / 2);
        zet(new THREE.CylinderGeometry(0.9, 0.9, 5, 12), gx + zijde * 1, g.y, z * (d + 3), Math.PI / 2);
        zet(new THREE.BoxGeometry(13, 1.8, 1.4), gx + zijde * 7, g.y, z * (d + 5.2));
        continue;
      }
      if (g.type === 'kom') { const m = zet(new THREE.BoxGeometry(3.4, g.lengte, 0.4), gx + zijde * 1, g.y, z * (d + 0.2)); m.material = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.5 }); }
    }
    return grp;
  }

  // open/dicht: scharnier en taats draaien, schuifdeuren schuiven
  function zetOpen(t) {
    for (const { draai, P, S } of deurGroepen) {
      const breed = P.x1 - P.x0;
      if (S.type === 'schuif') {
        const richting = S.deuren === 2 ? (P.deur === 0 ? -1 : 1) : (S.draai === 'links' ? -1 : 1);
        draai.position.x = richting * breed * 0.92 * t;
        draai.rotation.y = 0;
      } else {
        const hoek = (S.type === 'taats' ? 75 : 82) * Math.PI / 180 * t;
        draai.rotation.y = P.scharnierKant === 'links' ? hoek : -hoek;
      }
    }
  }
  function open(aan) { openDoel = aan ? 1 : 0; }

  // ---------- vloer (alleen voor de sfeer; keuzes in DEUR.KEUZES.vloer) ----------
  const vloerCache = {}, maxAniso = renderer.capabilities.getMaxAnisotropy();
  const EIKEN = ['#b8a289', '#b5a591', '#bba78f', '#bfaa8f', '#bcab96', '#bfac96', '#c0ae9a', '#c2b19f'];   // tinten uit BA Montage
  let visgraatTex = null;
  function maakVloer(code) {
    const k = window.DEUR.vind('vloer', code);
    let map, tegelCm, ruw = 0.62, env = 0.15;
    if (k.soort === 'visgraat') {
      if (!visgraatTex) {
        visgraatTex = new THREE.CanvasTexture(tekenVisgraat(EIKEN));
        visgraatTex.colorSpace = THREE.SRGBColorSpace; visgraatTex.wrapS = visgraatTex.wrapT = THREE.RepeatWrapping;
        visgraatTex.center.set(0.5, 0.5); visgraatTex.rotation = Math.PI * 3 / 4;   // V-rijen lopen de kamer in
        visgraatTex.anisotropy = maxAniso;
      }
      map = visgraatTex; tegelCm = 132;
    } else if (k.soort === 'planken') { map = vloerTex(); tegelCm = 240; }
    else { map = tegelTex(k.soort); tegelCm = k.soort === 'marmer' ? 240 : 180; ruw = k.soort === 'marmer' ? 0.16 : 0.75; env = k.soort === 'marmer' ? 0.55 : 0.2; }
    map.anisotropy = maxAniso;
    const mat = new THREE.MeshStandardMaterial({ color: k.tint || '#ffffff', map, roughness: ruw, envMapIntensity: env });
    mat.userData.tegelCm = tegelCm;
    return mat;
  }
  function vloerKeuze(code) {
    if (!vloerCache[code]) vloerCache[code] = maakVloer(code);
    const m = vloerCache[code];
    m.map.repeat.set(VLOER_B * 100 / m.userData.tegelCm, VLOER_D * 100 / m.userData.tegelCm);
    vloer.material = m;
  }

  function reset() {
    if (!huidig) return;
    const W = huidig.W / 100, H = huidig.H / 100;
    const afstand = cameraAfstand(huidig);
    controls.target.set(0, Math.min(H * 0.5, 1.25), 0);
    camera.position.set(omgevingSoort(huidig.S) === 'zolder' ? 0 : afstand * 0.28, 1.45, afstand);   // zolder: recht ervoor, onder het dak
    straal = afstand; vorige = 0;
    grenzen();
    camera.userData.gezet = true;
    controls.update(); binnenKamer();
  }

  // grenzen van de camera bij de huidige kamer; opnieuw bij elke wijziging (ook kant of schuinte), zonder de camera te verzetten
  function grenzen() {
    const afstand = cameraAfstand(huidig);
    const zolder = omgevingSoort(huidig.S) === 'zolder', laagLinks = huidig.S.kant === 'links';
    const K = kamerMaten(huidig), m = 0.3, dx = -huidig.W / 200;
    // de camera mag rondom draaien; botst hij op een muur of het plafond, dan schuift hij naar voren (zie binnenKamer)
    kooi = { x0: (K.xa - K.door) / 100 + dx + m, x1: (K.xb + K.door) / 100 + dx - m, y0: 0.25, y1: plafondVan(huidig) / 100 - m, z0: 0.35, z1: K.zf / 100 - m,
      min: afstand * 0.45, max: Math.min(afstand * (zolder ? 1.2 : 1.5), K.zf / 100 - 0.4) };
    if (zolder) {   // onder het schuine dak blijven, en niet voorbij het knieschot
      const lijn = dakLijn(huidig), pl = plafondVan(huidig), a = lijn(0), b = lijn(1) - a, xk = (70 - a) / b / 100 + dx;
      if (b > 0) kooi.x0 = Math.max(kooi.x0, xk + m); else kooi.x1 = Math.min(kooi.x1, xk - m);
      kooi.dak = xw => Math.min(pl, lijn((xw - dx) * 100)) / 100 - m;
    }
    controls.minDistance = 0.2; controls.maxDistance = 100;   // de echte grenzen bewaakt binnenKamer
    // trapkast: rondom (de zijmuur verdwijnt als je erachter komt); keuken en zolder: zo ver dat de camera vrij van de muren blijft
    const hoek = r => K.door ? Math.PI * 0.45 : Math.min(Math.PI * 0.36, Math.asin(Math.max(0.05, Math.min(1, r / kooi.max))));
    const links = hoek((huidig.W / 2 - K.xa) / 100 - 0.45), rechts = hoek((K.xb - huidig.W / 2) / 100 - 0.45);
    controls.minAzimuthAngle = zolder && laagLinks ? 0 : -links;
    controls.maxAzimuthAngle = zolder && !laagLinks ? 0 : rechts;
    controls.minPolarAngle = Math.PI * (zolder ? 0.44 : 0.3);
  }

  // houd de camera binnen de kamer: gewenste afstand (scrollen/knijpen) vasthouden, maar inkorten tot vóór muur of plafond
  let kooi = null, straal = 0, vorige = 0, zoomDoel = null;
  const _o = new THREE.Vector3();
  function binnenKamer() {
    if (!kooi) return;
    const t = controls.target; _o.subVectors(camera.position, t);
    const r = _o.length(); if (r < 1e-6) return;
    straal = Math.min(kooi.max, Math.max(kooi.min, straal * (vorige ? r / vorige : 1)));   // zoom van OrbitControls overnemen
    _o.divideScalar(r);
    let ruimte = straal;
    for (const [as, lo, hi] of [['x', kooi.x0, kooi.x1], ['y', kooi.y0, kooi.y1], ['z', kooi.z0, kooi.z1]]) {
      const d = _o[as], p = t[as];
      if (d > 1e-6) ruimte = Math.min(ruimte, (hi - p) / d); else if (d < -1e-6) ruimte = Math.min(ruimte, (lo - p) / d);
    }
    if (kooi.dak) {   // schuin dak: zoek het punt waar de lijn van doel naar camera het dak raakt
      const vrij = s => kooi.dak(t.x + _o.x * s) - (t.y + _o.y * s) >= 0;
      if (!vrij(ruimte)) { let lo = 0, hi = ruimte; for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (vrij(mid)) lo = mid; else hi = mid; } ruimte = lo; }
    }
    ruimte = Math.max(0.4, ruimte);
    camera.position.copy(t).addScaledVector(_o, ruimte); camera.lookAt(t);
    vorige = ruimte;
    const cx = (camera.position.x - wereld.position.x) * 100;   // camera achter een zijmuur: die muur weg (poppenhuis)
    for (const { x, kant, delen } of zijWanden) { const zien = kant > 0 ? cx > x : cx < x; for (const d of delen) d.visible = zien; }
  }

  function maat() {
    const w = houder.clientWidth || 1, h = houder.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(maat).observe(houder); maat();

  let zichtbaar = true;
  document.addEventListener('visibilitychange', () => { zichtbaar = !document.hidden; });
  (function lus() {
    requestAnimationFrame(lus);
    if (!zichtbaar) return;
    if (Math.abs(openStand - openDoel) > 0.001) { openStand += (openDoel - openStand) * 0.08; zetOpen(openStand); }
    if (zoomDoel !== null) { straal += (zoomDoel - straal) * 0.18; if (Math.abs(zoomDoel - straal) < 0.003) { straal = zoomDoel; zoomDoel = null; } }
    controls.update(); binnenKamer();
    renderer.render(scene, camera);
  })();

  return {
    toon, open, vloer: vloerKeuze, reset,
    zoom: f => { if (kooi) zoomDoel = Math.min(kooi.max, Math.max(kooi.min, (zoomDoel ?? straal) * f)); },   // f < 1 = inzoomen
    foto: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
    canvas: renderer.domElement,
  };
}
