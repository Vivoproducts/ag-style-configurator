// Visgraatvloer als naadloze tegel (canvas, 2048 × 2048 px = 132 × 132 cm): planken 66 × 11 cm in trapvorm,
// elke plank een eigen tint uit het palet, fijne nerf, soms kathedraal of knoest, V-voegen.
// Draai de textuur 45° voor de bekende V. Overgenomen uit de BA Montage-configurator (eigen code Vivo).
export function tekenVisgraat(EIKEN) {
  const W = 11, K = 6, L = W * K, P = 2 * L, n = 2048, px = n / P;   // plank 66 × 11 cm; patroon herhaalt elke 2 planklengtes
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d');
  x.fillStyle = EIKEN[4]; x.fillRect(0, 0, n, n);
  let zaad = 7; const rnd = () => (zaad = (zaad * 16807) % 2147483647) / 2147483647;   // vast patroon bij elke opbouw
  const plank = (cx, cy, liggend) => {
    const tintP = EIKEN[Math.floor(rnd() * EIKEN.length)], kathedraal = rnd() < 0.35, knoest = rnd() < 0.12;
    const lengte = L * px, breedte = W * px;
    // plank tekenen in eigen assenstelsel (lengte langs x), op alle ±periode-posities voor naadloosheid
    const teken = () => {
      x.fillStyle = tintP; x.fillRect(0, 0, lengte, breedte);
      const g = x.createLinearGradient(0, 0, 0, breedte);          // lichte glans over de breedte
      g.addColorStop(0, 'rgba(255,255,255,.035)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.03)');
      x.fillStyle = g; x.fillRect(0, 0, lengte, breedte);
      for (let i = 0; i < 70; i++) {                                // fijne rechte nerf
        const y = rnd() * breedte, donker = rnd() < 0.65;
        x.strokeStyle = donker ? `rgba(90,70,50,${0.05 + rnd() * 0.09})` : `rgba(255,248,235,${0.04 + rnd() * 0.07})`;
        x.lineWidth = 0.4 + rnd() * 1.1;
        x.beginPath(); x.moveTo(0, y);
        for (let k = 1; k <= 6; k++) x.lineTo(k * lengte / 6, y + (rnd() - .5) * 1.6);
        x.stroke();
      }
      if (kathedraal) {                                             // vlammend kathedraalpatroon
        const mx = lengte * (0.3 + rnd() * 0.4), my = breedte * (0.3 + rnd() * 0.4);
        for (let k = 1; k < 7; k++) {
          x.strokeStyle = `rgba(95,72,50,${0.07 + rnd() * 0.05})`; x.lineWidth = 0.8;
          x.beginPath(); x.ellipse(mx, my, k * lengte * 0.035, k * breedte * 0.09, 0, Math.PI * 0.15, Math.PI * 1.85); x.stroke();
        }
      }
      if (knoest) { x.fillStyle = 'rgba(85,62,40,.28)'; x.beginPath(); x.ellipse(lengte * rnd(), breedte * (0.3 + rnd() * .4), 3.5, 2.2, 0, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(70,52,36,.38)'; x.lineWidth = 1.3; x.strokeRect(0.6, 0.6, lengte - 1.2, breedte - 1.2);   // V-voeg
      x.strokeStyle = 'rgba(255,250,240,.18)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(1.6, 1.8); x.lineTo(lengte - 1.6, 1.8); x.stroke();
    };
    const zaadNu = zaad;
    for (const ox of [-P, 0, P]) for (const oy of [-P, 0, P]) {
      const X = (cx + ox) * px, Y = (cy + oy) * px, bw = (liggend ? L : W) * px, bh = (liggend ? W : L) * px;
      if (X > n || Y > n || X + bw < 0 || Y + bh < 0) continue;
      zaad = zaadNu;                                                // elke kopie exact gelijk
      x.save(); x.beginPath(); x.rect(X, Y, bw, bh); x.clip();
      if (liggend) x.translate(X, Y); else { x.translate(X + bw, Y); x.rotate(Math.PI / 2); }
      teken(); x.restore();
    }
  };
  // trapvorm: per stap een liggende plank (L × W) en daarboven een staande (W × L). De volgende trap ligt
  // een hele planklengte verder (L, −L); na twee trappen herhaalt het patroon zich (periode 2L).
  for (let st = 0; st < 2; st++) for (let i = 0; i < 2 * K; i++) {
    const bx = (((i * W + st * L) % P) + P) % P, by = (((i * W - st * L) % P) + P) % P;
    plank(bx, by, true);
    plank(bx, (((by + W) % P) + P) % P, false);
  }
  return c;
}
