// Ambre' — TikTok motion piece, 1080x1920, 12 s.
// Deterministic: window.renderFrame(t) draws the frame at time t (seconds).
(() => {
  const W = 1080, H = 1920, DURATION = 12;
  const cv = document.getElementById('c');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const jarC = mk(W, H), jctx = jarC.getContext('2d');
  const reflC = mk(W, H), rctx = reflC.getContext('2d');
  const smokeWide = mk(W / 2, H / 2), swctx = smokeWide.getContext('2d');
  const smokeThin = mk(W, H), stctx = smokeThin.getContext('2d');

  // ---------- content ----------
  const TXT = {
    aromaLabel: 'АРОМАТ',
    aroma1: 'Янтарный',
    aroma2: 'плед',
    notes: 'амбра · ваниль · кашемир',
    slogan1: 'Зажги уют',
    slogan2: 'в своём доме',
    brand: 'Ambre’',
    brandSub: 'АРОМАТИЧЕСКИЕ СВЕЧИ',
    cta: 'Закажи в профиле',
  };
  const FONT = '"Cormorant Garamond", serif';

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${clamp(a).toFixed(4)})`;
  const lit = (r, g, b, k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise(x, seed) { // smooth 1D value noise in [-1, 1]
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i + seed * 97.13), hash(i + 1 + seed * 97.13), u) * 2 - 1;
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  const setFont = (c, size, weight = 600, italic = false) => { c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`; };

  // ---------- geometry ----------
  const CX = 540;
  const JAR = { top: 1130, bot: 1480, hw: 172, rimRy: 26 };
  const WAX_Y = JAR.top + 16;
  const WICK_TOP = { x: CX + 3, y: WAX_Y - 30 };
  const CAM = { x: CX, y: 1120 };
  const CANDLE_S = 1.15; // candle group is scaled around the jar rim
  const sy = y => JAR.top + (y - JAR.top) * CANDLE_S;

  // ---------- light / flame model ----------
  function light(t) {
    const on = ss(0.6, 1.9, t);
    const flicker = 1 + 0.035 * noise(t * 6.5, 1) + 0.02 * noise(t * 15, 2);
    const bloom = 0.12 * Math.exp(-Math.pow((t - 1.2) / 0.3, 2));
    return on * flicker + bloom * on;
  }
  function flameParams(t) {
    const g = ss(0.62, 1.55, t);
    const n1 = noise(t * 3.1, 11), n2 = noise(t * 7.3, 12), n3 = noise(t * 2.0, 13);
    return {
      g,
      h: 150 * g * (1 + 0.06 * n1 + 0.03 * n2),
      w: 44 * Math.sqrt(g) * (1 + 0.03 * n2),
      dx: (6 * n3 + 2.5 * noise(t * 5.5, 14)) * g,
      fx: WICK_TOP.x, fy: WICK_TOP.y + 12,
      ember: ss(0.15, 0.55, t),
    };
  }

  // ---------- backdrop ----------
  function drawBackdrop(c, L) {
    c.fillStyle = '#0a0503';
    c.fillRect(-300, -300, W + 600, H + 600);
    let g = c.createRadialGradient(CX, 1000, 0, CX, 1000, 900);
    g.addColorStop(0, 'rgba(38,20,10,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(-300, -300, W + 600, H + 600);
    g = c.createRadialGradient(CX, 980, 20, CX, 980, 1300);
    g.addColorStop(0, rgba(150, 78, 28, 0.55 * L));
    g.addColorStop(0.25, rgba(98, 50, 19, 0.48 * L));
    g.addColorStop(0.6, rgba(48, 24, 11, 0.38 * L));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(-300, -300, W + 600, H + 600);

    // table surface
    const hz = 1350;
    g = c.createLinearGradient(0, hz - 40, 0, H + 200);
    g.addColorStop(0, 'rgba(26,14,8,0)');
    g.addColorStop(0.07, 'rgba(30,16,9,0.92)');
    g.addColorStop(1, 'rgba(10,6,4,1)');
    c.fillStyle = g; c.fillRect(-300, hz - 40, W + 600, H - hz + 400);
    // warm light pool on the table
    c.save();
    c.translate(CX, sy(JAR.bot + 10)); c.scale(1, 0.22);
    g = c.createRadialGradient(0, 0, 0, 0, 0, 640);
    g.addColorStop(0, rgba(215, 128, 56, 0.45 * L));
    g.addColorStop(0.4, rgba(150, 80, 32, 0.22 * L));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(-700, -700, 1400, 1400);
    c.restore();
  }

  // ---------- bokeh ----------
  const R = rng(7);
  const BOKEH = Array.from({ length: 28 }, () => ({
    x: 50 + R() * 980, y: 150 + R() * 1550, r: 8 + R() * 28, sp: 10 + R() * 24,
    ph: R() * 6.283, a: 0.3 + R() * 0.7, front: R() < 0.28,
  }));
  function drawBokeh(c, L, t, front) {
    if (L <= 0.01) return;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const b of BOKEH) {
      if (b.front !== front) continue;
      const y = ((b.y - t * b.sp - 100) % 1800 + 1800) % 1800 + 100;
      const x = b.x + Math.sin(t * 0.4 + b.ph) * 18;
      const edge = ss(100, 380, y) * (1 - ss(1550, 1850, y));
      const a = b.a * L * 0.11 * edge * (front ? 1.3 : 1) * (0.75 + 0.25 * Math.sin(t * 1.3 + b.ph));
      if (a < 0.003) continue;
      const r = front ? b.r * 1.9 : b.r;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(255, 192, 112, a));
      g.addColorStop(0.65, rgba(255, 170, 90, a * 0.55));
      g.addColorStop(1, rgba(255, 160, 80, 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    }
    c.restore();
  }

  // ---------- jar ----------
  function bodyPath(c) {
    const { top, bot, hw, rimRy } = JAR, x0 = CX - hw, x1 = CX + hw;
    c.beginPath();
    c.moveTo(x0, top);
    c.lineTo(x0, bot - 6);
    c.ellipse(CX, bot - 6, hw, 22, 0, Math.PI, 0, true);
    c.lineTo(x1, top);
    c.ellipse(CX, top, hw, rimRy, 0, 0, Math.PI, false);
    c.closePath();
  }
  function drawJar(c, L, t, F) {
    const { top, bot, hw, rimRy } = JAR, x0 = CX - hw, x1 = CX + hw;
    const k = 0.1 + 0.9 * L;
    c.clearRect(0, 0, W, H);

    // opening: inner wall + wax surface
    c.save();
    c.beginPath(); c.ellipse(CX, top, hw, rimRy, 0, 0, Math.PI * 2); c.clip();
    let g = c.createLinearGradient(0, top - rimRy, 0, top + rimRy);
    g.addColorStop(0, lit(130, 64, 22, k)); g.addColorStop(1, lit(64, 30, 10, k));
    c.fillStyle = g; c.fillRect(x0 - 5, top - rimRy - 5, hw * 2 + 10, rimRy * 2 + 10);
    c.beginPath(); c.ellipse(CX, WAX_Y, hw - 10, rimRy - 6, 0, 0, Math.PI * 2);
    g = c.createRadialGradient(CX, WAX_Y, 4, CX, WAX_Y, hw);
    g.addColorStop(0, lit(255, 218, 160, k * 1.05));
    g.addColorStop(0.35, lit(238, 200, 146, k));
    g.addColorStop(1, lit(150, 104, 62, k));
    c.fillStyle = g; c.fill();
    const pool = ss(1, 5, t);
    c.beginPath(); c.ellipse(CX, WAX_Y, 14 + 70 * pool, 4 + 8 * pool, 0, 0, Math.PI * 2);
    c.fillStyle = rgba(255, 186, 92, 0.32 * L); c.fill();
    c.restore();

    // wick
    c.save();
    c.beginPath(); c.moveTo(CX, WAX_Y + 2);
    c.quadraticCurveTo(CX - 1, WAX_Y - 16, WICK_TOP.x, WICK_TOP.y);
    c.strokeStyle = '#140b06'; c.lineWidth = 4.5; c.lineCap = 'round'; c.stroke();
    c.restore();

    // glass body
    c.save(); bodyPath(c); c.clip();
    g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, lit(48, 20, 6, k)); g.addColorStop(0.12, lit(118, 54, 14, k));
    g.addColorStop(0.45, lit(178, 92, 28, k)); g.addColorStop(0.6, lit(165, 84, 24, k));
    g.addColorStop(0.88, lit(105, 46, 12, k)); g.addColorStop(1, lit(40, 16, 5, k));
    c.fillStyle = g; c.fillRect(x0, top - rimRy, hw * 2, bot - top + 60);
    c.globalCompositeOperation = 'lighter';
    g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, rgba(255, 200, 120, 0.26 * L)); g.addColorStop(0.5, rgba(220, 150, 80, 0.1 * L)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x0, top, hw * 2, bot - top + 30);
    g = c.createRadialGradient(CX, top + 10, 0, CX, top + 10, 300);
    g.addColorStop(0, rgba(255, 170, 80, 0.38 * L)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x0, top - rimRy, hw * 2, bot - top + 60);
    c.globalCompositeOperation = 'source-over';
    g = c.createLinearGradient(0, bot - 80, 0, bot + 20);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,3,0,0.55)');
    c.fillStyle = g; c.fillRect(x0, bot - 80, hw * 2, 110);
    c.restore();

    // label
    const lw = 252, lh = 178, lx = CX - lw / 2, ly = 1252;
    c.save();
    roundRect(c, lx, ly, lw, lh, 5);
    g = c.createLinearGradient(lx, 0, lx + lw, 0);
    g.addColorStop(0, lit(190, 170, 142, k)); g.addColorStop(0.5, lit(246, 234, 214, k)); g.addColorStop(1, lit(180, 160, 132, k));
    c.fillStyle = g; c.fill();
    c.strokeStyle = rgba(120, 76, 40, 0.5); c.lineWidth = 1.2;
    roundRect(c, lx + 9, ly + 9, lw - 18, lh - 18, 3); c.stroke();
    c.fillStyle = lit(70, 38, 18, Math.max(0.35, k));
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    setFont(c, 62, 600); c.fillText(TXT.brand, CX, ly + 86);
    c.fillRect(CX - 36, ly + 108, 72, 1.5);
    setFont(c, 17, 600); c.letterSpacing = '4px';
    c.fillText('ЯНТАРНЫЙ ПЛЕД', CX + 2, ly + 142);
    c.letterSpacing = '0px';
    c.restore();

    // glass highlights
    c.save(); bodyPath(c); c.clip();
    c.globalCompositeOperation = 'screen';
    const hA = 0.1 + 0.3 * L;
    g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, rgba(255, 240, 220, 0)); g.addColorStop(0.2, rgba(255, 240, 220, hA));
    g.addColorStop(0.7, rgba(255, 240, 220, hA * 0.6)); g.addColorStop(1, rgba(255, 240, 220, 0));
    c.fillStyle = g; c.filter = 'blur(3px)';
    c.fillRect(x0 + 24, top + 34, 15, bot - top - 76);
    c.fillRect(x1 - 34, top + 44, 5, bot - top - 96);
    c.filter = 'none';
    c.restore();

    // rim
    c.beginPath(); c.ellipse(CX, top, hw, rimRy, 0, 0, Math.PI * 2);
    c.strokeStyle = rgba(255, 222, 172, 0.14 + 0.42 * L); c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(CX, top, hw - 1, rimRy - 1, 0, 0.15, Math.PI - 0.15);
    c.strokeStyle = rgba(255, 200, 130, 0.08 + 0.32 * L); c.lineWidth = 5; c.stroke();
  }

  // ---------- smoke ----------
  const WISPS = [
    { p: 0.0, amp: 1.0, a: 1.0, drift: 0.05 },
    { p: 2.2, amp: 1.35, a: 0.65, drift: 0.09 },
    { p: 4.1, amp: 0.8, a: 0.5, drift: -0.02 },
  ];
  function smokeStrength(t) { return ss(2.6, 3.7, t) * (1 - 0.45 * ss(7.0, 8.2, t)); }
  function drawSmoke(c, t, F) {
    const S = smokeStrength(t);
    if (S <= 0.002) return;
    const len = 1050 * (1 - Math.exp(-0.28 * Math.max(0, t - 2.6)));
    if (len < 8) return;
    const baseX = F.fx, baseY = F.fy - F.h * 0.92;
    swctx.setTransform(1, 0, 0, 1, 0, 0); swctx.clearRect(0, 0, W / 2, H / 2);
    stctx.setTransform(1, 0, 0, 1, 0, 0); stctx.clearRect(0, 0, W, H);
    swctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    for (const w of WISPS) {
      let px = null, py = null;
      for (let d = 0; d <= len; d += 6) {
        const A = Math.min(95, 3 + d * 0.085) * w.amp;
        const x = baseX + F.dx * (1 - ss(0, 140, d)) + d * w.drift +
          A * (Math.sin(d * 0.0065 - t * 1.6 + w.p) + 0.45 * Math.sin(d * 0.017 - t * 2.7 + 1.7 * w.p) +
               0.3 * noise(d * 0.008 - t * 0.7, w.p * 10));
        const y = baseY - d;
        if (px !== null) {
          const a = S * w.a * ss(0, 70, d) * Math.pow(1 - d / len, 1.25);
          const warm = 1 - ss(0, 380, d);
          const r = lerp(228, 255, warm), g = lerp(212, 196, warm), b = lerp(192, 150, warm);
          swctx.strokeStyle = rgba(r, g, b, a * 0.3);
          swctx.lineWidth = 10 + d * 0.07;
          swctx.beginPath(); swctx.moveTo(px, py); swctx.lineTo(x, y); swctx.stroke();
          stctx.strokeStyle = rgba(r, g, b, a * 0.68);
          stctx.lineWidth = lerp(2.4, 1.2, d / 1050);
          stctx.beginPath(); stctx.moveTo(px, py); stctx.lineTo(x, y); stctx.stroke();
        }
        px = x; py = y;
      }
    }
    c.save();
    c.globalCompositeOperation = 'screen';
    c.filter = 'blur(7px)'; c.drawImage(smokeWide, 0, 0, W, H);
    c.filter = 'blur(1.3px)'; c.drawImage(smokeThin, 0, 0);
    c.restore();
  }

  // ---------- flame ----------
  function flamePath(c, fx, fy, w, h, dx) {
    const tx = fx + dx, ty = fy - h;
    c.beginPath();
    c.moveTo(tx, ty);
    c.bezierCurveTo(fx + dx * 0.6 - w * 0.12, fy - h * 0.62, fx - w * 0.5, fy - h * 0.4, fx - w * 0.5, fy - h * 0.16);
    c.bezierCurveTo(fx - w * 0.5, fy + w * 0.14, fx + w * 0.5, fy + w * 0.14, fx + w * 0.5, fy - h * 0.16);
    c.bezierCurveTo(fx + w * 0.5, fy - h * 0.4, fx + dx * 0.6 + w * 0.12, fy - h * 0.62, tx, ty);
    c.closePath();
  }
  function drawGlow(c, L, F) {
    if (L <= 0.002) return;
    const gx = F.fx + F.dx * 0.5, gy = F.fy - F.h * 0.45;
    c.save(); c.globalCompositeOperation = 'lighter';
    let g = c.createRadialGradient(gx, gy, 0, gx, gy, 580);
    g.addColorStop(0, rgba(255, 150, 60, 0.26 * L)); g.addColorStop(0.3, rgba(220, 110, 40, 0.1 * L)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(gx - 600, gy - 600, 1200, 1200);
    g = c.createRadialGradient(gx, gy, 0, gx, gy, 180);
    g.addColorStop(0, rgba(255, 200, 120, 0.36 * L)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(gx - 200, gy - 200, 400, 400);
    c.restore();
  }
  function drawFlame(c, F) {
    const { g, h, w, dx, fx, fy } = F;
    if (F.ember > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const e = F.ember * (1 - 0.4 * g);
      const gr = c.createRadialGradient(WICK_TOP.x, WICK_TOP.y, 0, WICK_TOP.x, WICK_TOP.y, 20);
      gr.addColorStop(0, rgba(255, 160, 70, 0.95 * e)); gr.addColorStop(0.4, rgba(255, 110, 30, 0.5 * e)); gr.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = gr; c.fillRect(WICK_TOP.x - 22, WICK_TOP.y - 22, 44, 44);
      c.restore();
    }
    if (g < 0.002) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.filter = 'blur(14px)';
    flamePath(c, fx, fy + 4, w * 1.55, h * 1.12, dx * 1.1);
    c.fillStyle = rgba(255, 118, 38, 0.42 * g); c.fill();

    c.filter = 'blur(2.5px)';
    flamePath(c, fx, fy, w, h, dx);
    let gr = c.createLinearGradient(0, fy - h, 0, fy);
    gr.addColorStop(0, 'rgba(255,140,50,0)'); gr.addColorStop(0.18, 'rgba(255,150,55,0.75)');
    gr.addColorStop(0.5, 'rgba(255,196,105,0.95)'); gr.addColorStop(0.85, 'rgba(255,212,145,0.95)');
    gr.addColorStop(1, 'rgba(255,160,80,0.55)');
    c.fillStyle = gr; c.fill();

    c.filter = 'blur(5px)';
    flamePath(c, fx, fy - h * 0.06, w * 0.5, h * 0.58, dx * 0.55);
    gr = c.createLinearGradient(0, fy - h * 0.64, 0, fy);
    gr.addColorStop(0, 'rgba(255,250,235,0)'); gr.addColorStop(0.35, 'rgba(255,252,240,0.95)');
    gr.addColorStop(0.8, 'rgba(255,240,210,0.7)'); gr.addColorStop(1, 'rgba(255,220,180,0.15)');
    c.fillStyle = gr; c.fill();

    c.globalCompositeOperation = 'source-over';
    c.filter = 'blur(4px)';
    c.beginPath(); c.ellipse(fx, fy - h * 0.07, w * 0.27, Math.max(2, h * 0.07), 0, 0, Math.PI * 2);
    c.fillStyle = rgba(80, 110, 230, 0.4 * g); c.fill();
    c.restore();
  }

  function drawVignette(c) {
    const g = c.createRadialGradient(CX, 950, 330, CX, 950, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  // ---------- typography ----------
  function textGradient(c, y, size) {
    const g = c.createLinearGradient(0, y - size * 0.75, 0, y + size * 0.08);
    g.addColorStop(0, '#fff6e9'); g.addColorStop(0.5, '#f5d9ab'); g.addColorStop(1, '#dc9c52');
    return g;
  }
  // Draws a centered line, revealing glyph by glyph (fade + rise + de-blur).
  function line(c, t, str, cx, y, o) {
    const vis = o.vis ?? 1;
    if (vis <= 0.002 || t < o.t0) return;
    c.save();
    setFont(c, o.size, o.weight ?? 600, o.italic);
    const track = o.track ?? 0;
    c.letterSpacing = track + 'px';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const total = c.measureText(str).width - track;
    const x0 = cx - total / 2;
    c.fillStyle = o.fill ?? textGradient(c, y, o.size);
    if (o.glow !== false) { c.shadowColor = rgba(255, 165, 75, o.glowA ?? 0.42); c.shadowBlur = o.size * 0.22; }
    const chars = [...str];
    let prefix = '';
    for (let i = 0; i < chars.length; i++) {
      const xi = i ? x0 + c.measureText(prefix).width : x0;
      prefix += chars[i];
      if (chars[i] === ' ') continue;
      const p = easeOut((t - o.t0 - i * o.stg) / o.dur);
      if (p <= 0) continue;
      c.globalAlpha = p * vis;
      const bl = (1 - p) * 12 + (o.ob ?? 0);
      c.filter = bl > 0.25 ? `blur(${bl.toFixed(2)}px)` : 'none';
      c.fillText(chars[i], xi, y + (1 - p) * 30 + (o.dy ?? 0));
    }
    c.restore();
  }
  function hairlines(c, cx, y, gap, len, p, alpha) {
    if (p <= 0 || alpha <= 0) return;
    const l = len * easeOut(p);
    c.save();
    c.globalAlpha = alpha;
    for (const s of [-1, 1]) {
      const g = c.createLinearGradient(cx + s * gap, 0, cx + s * (gap + len), 0);
      g.addColorStop(0, 'rgba(226,168,98,0.95)'); g.addColorStop(1, 'rgba(226,168,98,0)');
      c.fillStyle = g;
      c.fillRect(s > 0 ? cx + gap : cx - gap - l, y - 1, l, 2);
    }
    c.restore();
  }
  function diamond(c, x, y, r, alpha) {
    if (alpha <= 0) return;
    c.save(); c.globalAlpha = alpha; c.fillStyle = '#e2a862';
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fill();
    c.restore();
  }
  function drawCTA(c, t, cy) {
    const p = easeOut((t - 10.8) / 0.8);
    if (p <= 0) return;
    const w = 650, h = 128;
    c.save();
    c.translate(CX, cy + (1 - p) * 26);
    const s = 0.94 + 0.06 * p + 0.012 * Math.sin(Math.max(0, t - 11.6) * 5) * ss(11.6, 11.8, t);
    c.scale(s, s);
    c.globalAlpha = p;
    c.shadowColor = rgba(255, 160, 70, 0.5); c.shadowBlur = 50;
    roundRect(c, -w / 2, -h / 2, w, h, h / 2);
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#f3cb90'); g.addColorStop(1, '#cf8c3e');
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.shadowColor = 'transparent';
    const sp = (t - 11.15) / 0.9;
    if (sp > 0 && sp < 1) {
      c.save();
      roundRect(c, -w / 2, -h / 2, w, h, h / 2); c.clip();
      const sx = -w / 2 - 160 + (w + 320) * easeInOut(sp);
      const sg = c.createLinearGradient(sx - 90, -h / 2, sx + 30, h / 2);
      sg.addColorStop(0, 'rgba(255,252,240,0)'); sg.addColorStop(0.5, 'rgba(255,252,240,0.6)'); sg.addColorStop(1, 'rgba(255,252,240,0)');
      c.fillStyle = sg; c.fillRect(-w / 2, -h / 2, w, h);
      c.restore();
    }
    setFont(c, 64, 700);
    c.fillStyle = '#2a1509'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(TXT.cta, 0, 4);
    c.restore();
  }

  function drawTexts(c, t) {
    // 3–7 s: aroma name
    const outA = easeInOut((t - 6.45) / 0.7);
    if (t > 3.2 && outA < 1) {
      const vis = 1 - outA, dy = -26 * outA, ob = 8 * outA;
      setFont(c, 40, 600); c.letterSpacing = '14px';
      const lblHalf = (c.measureText(TXT.aromaLabel).width - 14) / 2;
      c.letterSpacing = '0px';
      hairlines(c, CX, 368 + dy, lblHalf + 26, 74, (t - 3.4) / 0.9, vis);
      line(c, t, TXT.aromaLabel, CX, 382, { size: 40, weight: 600, track: 14, t0: 3.3, stg: 0.04, dur: 0.8, fill: '#e2a862', glow: false, vis, dy, ob });
      line(c, t, TXT.aroma1, CX, 575, { size: 172, weight: 600, t0: 3.55, stg: 0.055, dur: 1.0, vis, dy, ob });
      line(c, t, TXT.aroma2, CX, 735, { size: 200, weight: 500, italic: true, t0: 3.95, stg: 0.07, dur: 1.0, vis, dy, ob });
      line(c, t, TXT.notes, CX, 845, { size: 52, weight: 500, italic: true, t0: 4.6, stg: 0.018, dur: 0.8, fill: 'rgba(246,234,214,0.9)', glowA: 0.25, vis, dy, ob });
    }
    // 7–10 s: slogan
    const outB = easeInOut((t - 9.6) / 0.6);
    if (t > 7.1 && outB < 1) {
      const vis = 1 - outB, dy = -26 * outB, ob = 8 * outB;
      line(c, t, TXT.slogan1, CX, 590, { size: 162, weight: 600, italic: true, t0: 7.25, stg: 0.05, dur: 1.0, vis, dy, ob });
      line(c, t, TXT.slogan2, CX, 730, { size: 116, weight: 500, t0: 7.75, stg: 0.035, dur: 0.9, vis, dy, ob });
      const pd = (t - 8.3) / 0.9;
      hairlines(c, CX, 808 + dy, 22, 90, pd, vis);
      diamond(c, CX, 808 + dy, 7, easeOut(pd) * vis);
    }
    // 10–12 s: logo + call to action
    if (t > 10.05) {
      const pt = easeOut((t - 10.15) / 1.5);
      line(c, t, TXT.brand, CX, 590, { size: 220, weight: 600, track: lerp(44, 6, pt), t0: 10.15, stg: 0.07, dur: 1.1 });
      setFont(c, 36, 600); c.letterSpacing = '9px';
      const subHalf = (c.measureText(TXT.brandSub).width - 9) / 2;
      c.letterSpacing = '0px';
      hairlines(c, CX, 655, subHalf + 22, 60, (t - 10.6) / 0.8, 1);
      line(c, t, TXT.brandSub, CX, 668, { size: 36, weight: 600, track: 9, t0: 10.5, stg: 0.02, dur: 0.7, fill: '#e2a862', glow: false });
      drawCTA(c, t, 820);
    }
  }

  // ---------- frame ----------
  window.DURATION = DURATION;
  window.renderFrame = function (t) {
    const L = light(t);
    const F = flameParams(t);
    const s = 1 + 0.055 * easeInOut(t / DURATION);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.letterSpacing = '0px';
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(CAM.x, CAM.y); ctx.scale(s, s); ctx.translate(-CAM.x, -CAM.y);
    drawBackdrop(ctx, L);
    drawBokeh(ctx, L, t, false);

    ctx.save();
    ctx.translate(CX, JAR.top); ctx.scale(CANDLE_S, CANDLE_S); ctx.translate(-CX, -JAR.top);
    drawJar(jctx, L, t, F);
    // reflection on the table
    const mirrorY = JAR.bot + 16;
    rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.globalCompositeOperation = 'source-over';
    rctx.clearRect(0, 0, W, H);
    rctx.save(); rctx.translate(0, 2 * mirrorY); rctx.scale(1, -1); rctx.drawImage(jarC, 0, 0); rctx.restore();
    rctx.globalCompositeOperation = 'destination-in';
    const mg = rctx.createLinearGradient(0, mirrorY, 0, mirrorY + 190);
    mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    rctx.fillStyle = mg; rctx.fillRect(0, 0, W, H);
    rctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha = 0.2; ctx.filter = 'blur(4px)'; ctx.drawImage(reflC, 0, 0); ctx.restore();
    // contact shadow
    ctx.save(); ctx.filter = 'blur(9px)';
    ctx.beginPath(); ctx.ellipse(CX, JAR.bot + 12, JAR.hw + 8, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill(); ctx.restore();

    ctx.drawImage(jarC, 0, 0);
    drawSmoke(ctx, t, F);
    drawGlow(ctx, L, F);
    drawFlame(ctx, F);
    ctx.restore();
    drawBokeh(ctx, L, t, true);
    ctx.restore();

    drawVignette(ctx);
    drawTexts(ctx, t);
  };
})();
