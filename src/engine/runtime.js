/* Console runtime
 * ===============
 * Runs inside the game iframe: input (on-screen pad, keyboard, touch gestures), the fixed 60 Hz game loop,
 * the bridge to the parent page (errors, persistent storage, test hooks) and compilation of the game code.
 * It is stringified into the iframe document together with makeLib, so it may only use makeLib,
 * the DOM and standard globals.
 *
 * Messages to the parent (untrusted by the parent):
 *   {q:'ready'}            game code was compiled and started
 *   {q:'err', m}           compile or runtime error
 *   {q:'save', k, v}       persistent storage request
 *   {q:'snap', px, fr, ok} reply to a 'snap' request: number of non-black pixels, frame counter, running flag
 * Messages from the parent (only accepted from window.parent):
 *   {q:'in', k, v}         press/release a pad button (l r u d a b s)
 *   {q:'ptr', x, y, t}     move the finger (screen coordinates) and set whether it is down
 *   {q:'snap'}             request a frame snapshot summary
 */
function eng(code, cfg) {
  const W = 256, H = 240, c = document.getElementById('c'), x = c.getContext('2d');
  const I = { x: 0, y: 0, t: 0, C: 0, T: 0 };
  const K = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };      // held state of the pad / keyboard
  const pl = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };     // touch-gesture pulses: frames left (counts as held)
  const pe = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };     // touch-gesture press events (one per swipe segment / tap)
  const hc = {}, SV = cfg.sv || {};
  let f = 0, last = 0, acc = 0, tc = 0;

  const post = m => { try { parent.postMessage(m, '*'); } catch (e) { /* no parent */ } };
  const L = makeLib({
    x, I, PAL: cfg.pal, SP: cfg.sp, FONT: cfg.font, COLORS: cfg.colors,
    save: (k, v) => { SV[k] = v; post({ q: 'save', k, v }); },
    load: k => SV[k]
  });

  const fail = e => {
    const m = String(e && e.message || e);
    f = 0; L.cls(0); L.t('ERROR', 8, 8, 8, 2);
    (m.toUpperCase().match(/.{1,30}/g) || []).map((s, i) => L.t(s, 8, 30 + i * 8, 7));
    post({ q: 'err', m });
  };

  /* keyboard */
  const key = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', KeyZ: 'a', Space: 'a', KeyX: 'b', Enter: 's' };
  addEventListener('keydown', e => { if (key[e.code]) { K[key[e.code]] = 1; e.preventDefault(); L.resume(); } });
  addEventListener('keyup', e => { if (key[e.code]) K[key[e.code]] = 0; });

  /* on-screen pad: A / B / Start buttons */
  document.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k, up = () => { K[k] = 0; b.classList.remove('on'); };
    b.onpointerdown = e => { e.preventDefault(); K[k] = 1; b.classList.add('on'); if (b.setPointerCapture) b.setPointerCapture(e.pointerId); L.resume(); };
    b.onpointerup = b.onpointercancel = up;
  });
  /* RESET key: press twice within 3 seconds to restart the game from the beginning and forget what it saved */
  const rs = document.getElementById('rs');
  if (rs) {
    let armed = 0;
    rs.onpointerdown = e => {
      e.preventDefault();
      if (armed) { armed = 0; rs.textContent = 'RESET'; post({ q: 'reset' }); return; }
      armed = 1; rs.textContent = 'SURE?';
      setTimeout(() => { armed = 0; rs.textContent = 'RESET'; }, 3000);
    };
  }
  /* on-screen pad: the cross works like a joystick (slide the thumb between directions) */
  const dp = document.getElementById('dp');
  const dpd = e => {
    const b = dp.getBoundingClientRect(), dx = (e.clientX - b.left) / b.width - .5, dy = (e.clientY - b.top) / b.height - .5;
    K.l = dx < -.14 ? 1 : 0; K.r = dx > .14 ? 1 : 0; K.u = dy < -.14 ? 1 : 0; K.d = dy > .14 ? 1 : 0;
  };
  dp.onpointerdown = e => { e.preventDefault(); dp.setPointerCapture(e.pointerId); dpd(e); L.resume(); };
  dp.onpointermove = e => { if (e.buttons || e.pressure) dpd(e); };
  dp.onpointerup = dp.onpointercancel = () => { K.l = K.r = K.u = K.d = 0; };

  /* touch on the screen: position, swipe -> directions (repeats while dragging), tap -> A */
  const q = e => { const b = c.getBoundingClientRect(); I.x = (e.clientX - b.left) / b.width * W; I.y = (e.clientY - b.top) / b.height * H; };
  let gx = 0, gy = 0, gt = 0, gs = 0;
  c.onpointerdown = e => {
    q(e); I.t = 1; tc = 1; gx = e.clientX; gy = e.clientY; gt = Date.now(); gs = 0;
    if (c.setPointerCapture) c.setPointerCapture(e.pointerId);
    L.resume();
  };
  c.onpointermove = e => {
    q(e);
    if (!I.t) return;
    const dx = e.clientX - gx, dy = e.clientY - gy;
    if (Math.hypot(dx, dy) > 22) { const k = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); pl[k] = 4; pe[k] = 1; gs = 1; gx = e.clientX; gy = e.clientY; }
  };
  c.onpointerup = c.onpointercancel = () => { I.t = 0; if (!gs && Date.now() - gt < 350) { pl.a = 4; pe.a = 1; } };

  /* messages from the parent page (tests and tooling) */
  addEventListener('message', e => {
    if (e.source !== parent) return;
    const m = e.data || {};
    if (m.q === 'in' && K[m.k] !== undefined) K[m.k] = m.v ? 1 : 0;
    else if (m.q === 'ptr') { I.x = +m.x || 0; I.y = +m.y || 0; I.t = m.t ? 1 : 0; if (m.t) tc = 1; }
    else if (m.q === 'snap') {
      const px = x.getImageData(0, 0, W, H).data;
      let n = 0;
      for (let j = 0; j < px.length; j += 4) if (px[j] | px[j + 1] | px[j + 2]) n++;
      post({ q: 'snap', px: n, fr: I.T, ok: f ? 1 : 0 });
    }
  });

  /* compile the game: user variables shadow library names because the library sits in a `with` scope */
  try {
    f = new Function('L', 'with(L){' + code + '\n}')(L);
    if (typeof f != 'function') throw Error('the game must end with: return i => { ... }');
  } catch (e) { fail(e); }
  post({ q: 'ready' });

  /* fixed 60 Hz loop (also correct on 120 Hz screens) */
  const loop = n => {
    requestAnimationFrame(loop);
    if (!f) return;
    acc += Math.min(n - last, 100); last = n;
    for (; acc >= 16.7; acc -= 16.7) {
      for (const k in K) {
        const h = K[k] || pl[k] > 0;
        if (pl[k] > 0) pl[k]--;
        hc[k] = h ? (hc[k] | 0) + 1 : 0;
        I[k] = h ? 1 : 0;
        const rep = K[k] && 'lrud'.includes(k) && hc[k] > 12 && (hc[k] - 12) % 4 == 0;   // auto-repeat only for real held keys
        I[k.toUpperCase()] = hc[k] == 1 || pe[k] || rep ? 1 : 0;
        pe[k] = 0;
      }
      I.C = tc; tc = 0; I.T++;
      try { f(I); } catch (e) { fail(e); return; }
    }
  };
  requestAnimationFrame(loop);
}
