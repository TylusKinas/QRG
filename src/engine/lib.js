/* QRG standard library
 * ====================
 * Everything a game can call. `makeLib(env)` returns an object whose members are placed in scope of the
 * game code with `with(lib){ ... }`, so a game may freely declare its own variables with the same names.
 *
 * makeLib is stringified into the sandboxed iframe, so it must stay completely self-contained:
 * it may only use what arrives through `env` (see below) and standard JavaScript globals.
 *
 *   env.x      2D canvas context (256x240 pixels)
 *   env.I      the live input object (also passed to the frame function)
 *   env.PAL    palette (array of 16 CSS colors)
 *   env.SP     sprite library (name -> 8 bytes)
 *   env.FONT   {g: glyph characters, f: glyph bitmaps}
 *   env.COLORS names of the 16 palette colors (become constants BLACK ... PEACH)
 *   env.save   (key, value) => void   persistent storage hook (optional)
 *   env.load   key => value           persistent storage hook (optional)
 *
 * Every public member must have an entry in src/engine/libdoc.js (a test enforces it).
 */

const PAL = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
             '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];

const COLOR_NAMES = ['BLACK', 'NAVY', 'PURPLE', 'GREEN', 'BROWN', 'GRAY', 'SILVER', 'WHITE',
                     'RED', 'ORANGE', 'YELLOW', 'LIME', 'BLUE', 'LAVENDER', 'PINK', 'PEACH'];

/* 3x5 pixel font. Each glyph is five octal digits: one per row, 3 bits per row (bit 2 = left pixel). */
const FONT = {
  g: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:.-! /+%?,=><()*\'#_',
  f: ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71122', '75757', '75717',
      '25755', '65656', '34443', '65556', '74647', '74644', '34553', '55755', '72227', '11152', '55655', '44447', '57755',
      '65555', '25552', '65644', '25563', '65655', '34216', '72222', '55557', '55552', '55775', '55255', '55222', '71247',
      '02020', '00002', '00700', '22202', '00000',
      '11244', '02720', '51245', '71302', '00024', '07070', '42124', '12421', '24442', '21112', '05250', '22000', '57575', '00007']
};

function makeLib(env) {
  const { x, I, PAL, SP, FONT } = env, W = 256, H = 240;
  const L = Object.create(null);

  /* ---------------------------------------------------------------- drawing */
  const col = k => PAL[k] || PAL[7];

  const r = (u, v, w, h, k) => {                        // filled rectangle (rounded so neighbours never leave gaps)
    const X = Math.round(u), Y = Math.round(v);
    x.fillStyle = col(k);
    x.fillRect(X, Y, Math.round(u + w) - X, Math.round(v + h) - Y);
  };
  const cls = k => r(0, 0, W, H, k || 0);
  const box = (u, v, w, h, k) => { r(u, v, w, 1, k); r(u, v + h - 1, w, 1, k); r(u, v, 1, h, k); r(u + w - 1, v, 1, h, k); };

  const line = (a, b, c, e, k) => {                     // Bresenham
    a = Math.round(a); b = Math.round(b); c = Math.round(c); e = Math.round(e);
    const dx = Math.abs(c - a), dy = -Math.abs(e - b), sx = a < c ? 1 : -1, sy = b < e ? 1 : -1;
    let er = dx + dy;
    for (let n = 0; n < 1000; n++) {
      r(a, b, 1, 1, k);
      if (a == c && b == e) break;
      const e2 = 2 * er;
      if (e2 >= dy) { er += dy; a += sx; }
      if (e2 <= dx) { er += dx; b += sy; }
    }
  };
  const circ = (cx, cy, q, k) => {                      // filled circle
    q = Math.round(q);
    for (let y = -q; y <= q; y++) { const w = Math.floor(Math.sqrt(q * q - y * y)); r(cx - w, cy + y, 2 * w + 1, 1, k); }
  };
  const ring = (cx, cy, q, k) => {                      // circle outline (midpoint algorithm)
    q = Math.round(q);
    let a = q, b = 0, er = 1 - q;
    while (a >= b) {
      [[a, b], [b, a], [-b, a], [-a, b], [-a, -b], [-b, -a], [b, -a], [a, -b]].map(([p, o]) => r(cx + p, cy + o, 1, 1, k));
      b++;
      if (er < 0) er += 2 * b + 1; else { a--; er += 2 * (b - a) + 1; }
    }
  };

  const tw = (s, z) => Math.max(0, String(s).length * 4 - 1) * (z || 1);   // width of a text in pixels
  const t = (s, u, v, k, z) => {
    z = z || 1; u = Math.round(u); v = Math.round(v);
    x.fillStyle = col(k);
    const str = String(s).toUpperCase();
    for (let n = 0; n < str.length; n++) {
      const g = FONT.f[FONT.g.indexOf(str[n])];
      if (!g) continue;
      for (let j = 0; j < 5; j++) {
        const b = +g[j];
        for (let q = 0; q < 3; q++) if (b >> (2 - q) & 1) x.fillRect(u + n * 4 * z + q * z, v + j * z, z, z);
      }
    }
  };
  const tc = (s, v, k, z) => t(s, (W - tw(s, z)) / 2, v, k, z);

  const d = (b, u, v, k, z) => {                        // 8x8 sprite: 8 bytes or a name from SP
    if (typeof b == 'string') b = SP[b];
    if (!b) return;
    z = z || 1;
    for (let y = 0; y < 8; y++) {
      const row = b[y] | 0;
      for (let q = 0; q < 8; q++) {
        if (row >> (7 - q) & 1) {                       // draw each horizontal run as one rectangle
          let e = q + 1;
          while (e < 8 && row >> (7 - e) & 1) e++;
          r(u + q * z, v + y * z, (e - q) * z, z, k);
          q = e;
        }
      }
    }
  };
  const flip = b => (typeof b == 'string' ? SP[b] : b).map(row => {
    let o = 0;
    for (let q = 0; q < 8; q++) if (row >> q & 1) o |= 1 << (7 - q);
    return o;
  });

  const bar = (u, v, w, h, val, max, k) => {            // progress bar; color turns yellow/red when low unless k is given
    const f = clamp(val / (max || 100), 0, 1);
    r(u, v, w, h, 0); box(u, v, w, h, 5);
    r(u + 1, v + 1, Math.round((w - 2) * f), h - 2, k == null ? (f > .5 ? 11 : f > .25 ? 10 : 8) : k);
  };

  /* ---------------------------------------------------------------- input helpers */
  const inb = (px, py, u, v, w, h) => px >= u && px < u + w && py >= v && py < v + h;
  const tap = (u, v, w, h) => !!I.C && inb(I.x, I.y, u, v, w, h);      // finger went down inside the rectangle this frame
  const over = (u, v, w, h) => !!I.t && inb(I.x, I.y, u, v, w, h);     // finger is down inside the rectangle
  const btn = (label, u, v, w, h, k) => {                               // draws a button, returns true when tapped
    const dn = over(u, v, w, h);
    r(u, v, w, h, dn ? 6 : k == null ? 5 : k);
    box(u, v, w, h, 7);
    t(label, u + (w - tw(label)) / 2, v + (h - 5) / 2, dn ? 0 : 7);
    return tap(u, v, w, h);
  };

  /* ---------------------------------------------------------------- random & math */
  let rs = null;                                        // null = Math.random, number = seeded generator state
  const rand = () => {
    if (rs === null) return Math.random();
    rs = (rs + 0x6D2B79F5) | 0;
    let q = Math.imul(rs ^ rs >>> 15, 1 | rs);
    q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
    return ((q ^ q >>> 14) >>> 0) / 4294967296;
  };
  const seed = n => { rs = n | 0; };
  const R = n => rand() * n | 0;
  const rr = (a, b) => a + R(b - a + 1);
  const pick = a => a[R(a.length)];
  const shuf = a => {
    const b = a.slice();
    for (let j = b.length - 1; j > 0; j--) { const k = R(j + 1); [b[j], b[k]] = [b[k], b[j]]; }
    return b;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const dist = (a, b, c, e) => Math.hypot(c - a, e - b);
  const sign = Math.sign;
  const wrap = (v, n) => (v % n + n) % n;
  const every = n => I.T % Math.max(1, Math.round(n)) == 0;          // true once every n frames (60 frames = 1 second)
  const now = () => Date.now() / 1000;                                // wall clock in seconds

  /* ---------------------------------------------------------------- actors (moving objects) */
  let AC = [];
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const kind = (spr, c, z) => { z = z || 1; return { spr, c: c == null ? 7 : c, z }; };
  const add = (k, u, v, p) => {
    const a = Object.assign({ k, x: u, y: v, vx: 0, vy: 0, w: 8 * k.z, h: 8 * k.z, c: k.c, on: 1 }, p);
    AC.push(a);
    return a;
  };
  const all = k => AC.filter(a => a.on && (!k || a.k === k));
  const each = (k, f) => all(k).map(f);
  const kill = a => { a.on = 0; };
  const touch = (k1, k2, f) => all(k1).map(a => all(k2).map(b => { if (a !== b && a.on && b.on && hit(a, b)) f(a, b); }));
  const step = () => { for (const a of AC) if (a.on) { a.x += a.vx; a.y += a.vy; } AC = AC.filter(a => a.on); };
  const draw = () => AC.map(a => a.on && d(a.k.spr, a.x, a.y, a.c, a.k.z));
  const clear = () => { AC = []; };

  /* ---------------------------------------------------------------- grids & path finding */
  const grid = (c, rw, v) => { const g = Array(c * rw).fill(v == null ? 0 : v); g.c = c; g.r = rw; return g; };
  const gget = (g, u, v) => u < 0 || v < 0 || u >= g.c || v >= g.r ? -1 : g[v * g.c + u];
  const gset = (g, u, v, val) => { if (u >= 0 && v >= 0 && u < g.c && v < g.r) g[v * g.c + u] = val; };
  const flood = (c, rw, sx, sy, max, cost) => {         // cheapest cost from (sx,sy) to every cell, -1 = unreachable
    const D = Array(c * rw).fill(-1), q = [[sx, sy]];
    D[sy * c + sx] = 0;
    while (q.length) {
      let bi = 0;
      for (let j = 1; j < q.length; j++) if (D[q[j][1] * c + q[j][0]] < D[q[bi][1] * c + q[bi][0]]) bi = j;
      const [cx, cy] = q.splice(bi, 1)[0], dc = D[cy * c + cx];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= c || ny >= rw) continue;
        const k = cost ? cost(nx, ny) : 1;
        if (typeof k != 'number' || !(k >= 0) || k === Infinity) continue;   // blocked
        const nd = dc + k;
        if (max != null && nd > max) continue;
        if (D[ny * c + nx] < 0 || nd < D[ny * c + nx]) { D[ny * c + nx] = nd; q.push([nx, ny]); }
      }
    }
    return D;
  };

  /* ---------------------------------------------------------------- sound */
  let ctxA = null;
  const ac = () => ctxA || (ctxA = new (window.AudioContext || window.webkitAudioContext)());
  const tone = (hz, ms, type, at) => {
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (at || 0);
      o.type = type || 'square'; o.frequency.value = hz;
      g.gain.setValueAtTime(.05, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + ms / 1000);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + ms / 1000);
    } catch (e) { /* no audio available */ }
  };
  const s = (hz, ms, type) => tone(hz, ms || 70, type);
  const mel = (notes, ms, type) => notes.map((hz, j) => hz && tone(hz, ms || 100, type, j * (ms || 100) / 1000));
  const resume = () => { try { const a = ac(); if (a.state == 'suspended') a.resume(); } catch (e) { /* ignore */ } };

  /* ---------------------------------------------------------------- persistent storage */
  const save = (k, v) => { if (env.save) env.save(String(k), v); };
  const load = (k, def) => { const v = env.load ? env.load(String(k)) : undefined; return v === undefined ? def : v; };

  const colors = {};                                    // BLACK=0 ... PEACH=15
  (env.COLORS || []).forEach((n, k) => { colors[n] = k; });

  Object.assign(L, colors, {
    W, H, SP, PAL,
    r, cls, box, line, circ, ring, bar, t, tc, tw, d, flip,
    inb, tap, over, btn,
    rand, seed, R, rr, pick, shuf, clamp, lerp, dist, sign, wrap, every, now,
    hit, kind, add, all, each, kill, touch, step, draw, clear,
    grid, gget, gset, flood,
    s, mel, resume, save, load
  });
  return L;
}
