/* Test helpers: load the core scripts into a vm context, a pixel-accurate fake canvas, a tiny fake DOM. */
const vm = require('node:vm');
const build = require('../../tools/build.js');

const EXPORTS = ['GAMES', 'PAL', 'COLOR_NAMES', 'FONT', 'SP', 'SPRITE_ART', 'makeLib', 'LIBDOC', 'LIBNAMES', 'INPUTDOC',
  'PRIME', 'min', 'pack', 'unpack', 'b43', 'd43', 'toPayload', 'fromPayload', 'toURL', 'urlSegs', 'QR', 'eng',
  'buildGameDoc', 'CSP', 'STARTER', 'vcompile', 'vdescribe', 'vnew', 'vrepair', 'vpurgeKind', 'vblank', 'vsafeName', 'vopts', 'vsplit', 'vctx', 'vvalid', 'vsanitize', 'vrenameVar', 'vpurgeVar', 'VNAMES',
  'VTEMPLATES', 'VB', 'BASE', 'U8', 'extractPayload', 'gameFromText', 'wordAt', 'completions', 'completionText', 'callAt', 'signatureAt',
  'spriteAt', 'colorAt', 'soundAt', 'contextAt', 'soundCode', 'SOUNDS', 'KEYWORDS', 'LIBFN'];

function loadCore(extra) {
  const ctx = vm.createContext(Object.assign({
    console, TextEncoder, TextDecoder, Math, Date, JSON, Object, Array, Number, String, Promise, setTimeout, clearTimeout, Error
  }, extra));
  vm.runInContext(build.coreSource(), ctx, { filename: 'core.js' });
  const names = EXPORTS.filter(n => { try { vm.runInContext(n, ctx); return true; } catch (e) { return false; } });
  const api = vm.runInContext('({' + names.join(',') + '})', ctx);
  api.__ctx = ctx;
  return api;
}

/* A 256x240 canvas that stores palette indexes, so tests can assert what was drawn. */
function pixelCtx(PAL) {
  const W = 256, H = 240, px = new Uint8Array(W * H).fill(255);     // 255 = never drawn
  const idx = {}; PAL.forEach((c, k) => { idx[c] = k; });
  const x = {
    fillStyle: '#000000', bad: 0, calls: 0, px,
    fillRect(a, b, w, h) {
      x.calls++;
      if (![a, b, w, h].every(Number.isFinite)) { x.bad++; return; }
      const k = idx[x.fillStyle];
      if (k === undefined) { x.bad++; return; }
      for (let yy = Math.max(0, b); yy < Math.min(H, b + h); yy++) for (let xx = Math.max(0, a); xx < Math.min(W, a + w); xx++) px[yy * W + xx] = k;
    },
    get: (u, v) => px[v * W + u],
    count: k => { let n = 0; for (const p of px) if (p === k) n++; return n; },
    drawn: () => { let n = 0; for (const p of px) if (p !== 255) n++; return n; },
    clearAll() { px.fill(255); },
    getImageData: () => { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { if (px[i] !== 255 && px[i] !== 0) d[i * 4] = 255; } return { data: d }; }
  };
  return x;
}

/* The shared input object plus a lib instance drawing on a pixelCtx. */
function makeEnv(api, over) {
  const x = pixelCtx(api.PAL), store = {}, saves = [];
  const I = { x: 0, y: 0, t: 0, C: 0, T: 0, l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0, L: 0, R: 0, U: 0, D: 0, A: 0, B: 0, S: 0 };
  const env = Object.assign({
    x, I, PAL: api.PAL, SP: api.SP, FONT: api.FONT, COLORS: api.COLOR_NAMES,
    save: (k, v) => { store[k] = v; saves.push([k, v]); }, load: k => store[k]
  }, over);
  const L = api.makeLib(env);
  return { x, I, L, env, store, saves };
}

/* Compiles game code the way the runtime does and returns the frame function. */
function compileGame(L, code) {
  const f = new Function('L', 'with(L){' + code + '\n}')(L);
  if (typeof f != 'function') throw new Error('game did not return a function');
  return f;
}

/* Fake browser for the runtime (eng). */
function fakeDom(api) {
  const x = pixelCtx(api.PAL), handlers = {}, msgs = [], raf = { cb: null };
  const mkEl = (extra) => Object.assign({
    dataset: {}, classList: { add() {}, remove() {} }, setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 256, height: 240 })
  }, extra);
  const canvas = mkEl({ getContext: () => x });
  const dp = mkEl({});
  const padBtns = ['l', 'r'].map(k => mkEl({ dataset: { k } }));
  const parent = { postMessage: m => msgs.push(m) };
  const globals = {
    document: { getElementById: id => ({ c: canvas, dp }[id]), querySelectorAll: () => padBtns },
    addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); },
    requestAnimationFrame: cb => { raf.cb = cb; },
    parent
  };
  const fire = (t, e) => (handlers[t] || []).forEach(f => f(e));
  let time = 0;
  const frames = n => { for (let j = 0; j < n; j++) { time += 16.8; const cb = raf.cb; raf.cb = null; if (cb) cb(time); } };
  const advance = ms => { time += ms; const cb = raf.cb; raf.cb = null; if (cb) cb(time); };
  return { x, canvas, dp, padBtns, msgs, globals, fire, frames, advance, handlers, parent };
}

module.exports = { loadCore, pixelCtx, makeEnv, compileGame, fakeDom };

/* Renders a PHP page the way a server would, for the only PHP constructs the player uses (see tests/lite.test.js). */
function renderPhp(src, opts) {
  let out = src.replace(/^<\?php[\s\S]*?\?>\n?/, '');                                                    // the header block
  out = out.replace(/<\?php if \(\$extras\): \?>\n?([\s\S]*?)<\?php endif; \?>\n?/g,                       // the one conditional
    (m, inner) => opts && opts.extras ? inner : '');
  return out;
}
module.exports.renderPhp = renderPhp;
