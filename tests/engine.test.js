/* Tests for the console runtime (eng): input, gestures, loop, errors, storage bridge, messages. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, fakeDom } = require('./helpers/load.js');

const api = loadCore();

function start(code, sv) {
  const dom = fakeDom(api);
  Object.assign(api.__ctx, dom.globals);
  api.eng(code, { pal: api.PAL, sp: api.SP, font: api.FONT, colors: api.COLOR_NAMES, sv: sv || {} });
  const saves = () => dom.msgs.filter(m => m.q === 'save');
  const last = () => { const s = saves(); return s.length ? s[s.length - 1].v : null; };
  return { dom, saves, last };
}

/* the game reports what it sees through save() */
const OBS = "return i => { save('o', [i.T, i.l, i.r, i.u, i.d, i.a, i.L, i.R, i.U, i.D, i.A, i.t, Math.round(i.x), Math.round(i.y)].join(',')) }";
const seen = g => g.last().split(',').map(Number);
const F = { T: 0, l: 1, r: 2, u: 3, d: 4, a: 5, L: 6, R: 7, U: 8, D: 9, A: 10, t: 11, x: 12, y: 13 };

test('the loop runs the game once per 60 Hz step', () => {
  const g = start(OBS);
  g.dom.frames(10);
  assert.equal(seen(g)[F.T], 10);
  g.dom.advance(100);                        // a long frame: 100 ms = 5-6 steps
  assert.ok(seen(g)[F.T] >= 15 && seen(g)[F.T] <= 16);
});

test('a very long pause is capped (no catch-up storm)', () => {
  const g = start(OBS);
  g.dom.frames(1);
  g.dom.advance(60000);
  assert.ok(seen(g)[F.T] <= 8);
});

test('keyboard: held state, single press, auto-repeat of directions', () => {
  const g = start(OBS);
  g.dom.frames(2);
  g.dom.fire('keydown', { code: 'ArrowLeft', preventDefault() {} });
  g.dom.frames(1);
  assert.equal(seen(g)[F.l], 1);
  assert.equal(seen(g)[F.L], 1);
  g.dom.frames(1);
  assert.equal(seen(g)[F.l], 1);
  assert.equal(seen(g)[F.L], 0);             // pressed only in the first frame
  let repeats = 0;
  for (let n = 0; n < 40; n++) { g.dom.frames(1); if (seen(g)[F.L]) repeats++; }
  assert.ok(repeats >= 5, 'auto-repeat fired ' + repeats + ' times');
  g.dom.fire('keyup', { code: 'ArrowLeft' });
  g.dom.frames(1);
  assert.equal(seen(g)[F.l], 0);
});

test('keyboard mapping: Z/Space = A, X = B, Enter = Start, arrows', () => {
  const g = start("return i => save('o', [i.a, i.b, i.s, i.r, i.u, i.d].join(','))");
  for (const [code, idx] of [['KeyZ', 0], ['Space', 0], ['KeyX', 1], ['Enter', 2], ['ArrowRight', 3], ['ArrowUp', 4], ['ArrowDown', 5]]) {
    g.dom.fire('keydown', { code, preventDefault() {} });
    g.dom.frames(1);
    assert.equal(g.last().split(',')[idx], '1', code);
    g.dom.fire('keyup', { code });
    g.dom.frames(1);
  }
});

test('on-screen A/B/Start buttons set and release the pad state', () => {
  const g = start(OBS);
  const btn = g.dom.padBtns[0];              // dataset.k = 'l'
  btn.onpointerdown({ preventDefault() {}, pointerId: 1 });
  g.dom.frames(1);
  assert.equal(seen(g)[F.l], 1);
  btn.onpointerup();
  g.dom.frames(1);
  assert.equal(seen(g)[F.l], 0);
});

test('the d-pad works like a joystick', () => {
  const g = start(OBS);
  const e = (x, y) => ({ preventDefault() {}, pointerId: 1, clientX: x, clientY: y, buttons: 1 });
  g.dom.dp.onpointerdown(e(10, 120));        // far left, vertical middle
  g.dom.frames(1);
  assert.deepEqual([seen(g)[F.l], seen(g)[F.r], seen(g)[F.u], seen(g)[F.d]], [1, 0, 0, 0]);
  g.dom.dp.onpointermove(e(128, 5));         // slide to the top
  g.dom.frames(1);
  assert.deepEqual([seen(g)[F.l], seen(g)[F.r], seen(g)[F.u], seen(g)[F.d]], [0, 0, 1, 0]);
  g.dom.dp.onpointerup();
  g.dom.frames(1);
  assert.deepEqual([seen(g)[F.l], seen(g)[F.r], seen(g)[F.u], seen(g)[F.d]], [0, 0, 0, 0]);
});

test('touch: position is mapped to screen coordinates and i.t follows the finger', () => {
  const g = start(OBS);
  const c = g.dom.canvas;
  c.onpointerdown({ clientX: 128, clientY: 60, pointerId: 1 });
  g.dom.frames(1);
  assert.equal(seen(g)[F.x], 128);
  assert.equal(seen(g)[F.y], 60);
  assert.equal(seen(g)[F.t], 1);
  c.onpointerup();
  g.dom.frames(1);
  assert.equal(seen(g)[F.t], 0);
});

test('gesture: a swipe becomes a direction press, a tap becomes A', () => {
  const g = start(OBS);
  const c = g.dom.canvas;
  c.onpointerdown({ clientX: 100, clientY: 100, pointerId: 1 });
  c.onpointermove({ clientX: 130, clientY: 102, pointerId: 1 });     // 30 px right
  g.dom.frames(1);
  assert.equal(seen(g)[F.R], 1);
  assert.equal(seen(g)[F.A], 0);
  c.onpointerup();
  g.dom.frames(6);
  assert.equal(seen(g)[F.A], 0, 'a swipe is not a tap');

  c.onpointerdown({ clientX: 50, clientY: 50, pointerId: 1 });
  c.onpointerup();
  g.dom.frames(1);
  assert.equal(seen(g)[F.A], 1);
  assert.equal(seen(g)[F.a], 1);
});

test('gesture: dragging far keeps emitting directions; each axis is detected', () => {
  const g = start(OBS);
  const c = g.dom.canvas;
  c.onpointerdown({ clientX: 100, clientY: 100, pointerId: 1 });
  let ups = 0;
  for (let n = 1; n <= 4; n++) { c.onpointermove({ clientX: 100, clientY: 100 - 30 * n, pointerId: 1 }); g.dom.frames(1); if (seen(g)[F.U]) ups++; }
  assert.equal(ups, 4, 'one press per 22+ px segment');
  c.onpointermove({ clientX: 100, clientY: 130, pointerId: 1 });
  g.dom.frames(1);
  assert.equal(seen(g)[F.D], 1);
});

test('a syntax error is reported to the parent and drawn on the screen', () => {
  const g = start('return i => {');
  assert.ok(g.dom.msgs.some(m => m.q === 'err'));
  assert.ok(g.dom.msgs.some(m => m.q === 'ready'));
  assert.ok(g.dom.x.count(8) > 0, 'ERROR title is red');
  g.dom.frames(3);                             // must not crash
});

test('a game that does not return a function is reported', () => {
  const g = start('let a = 1;');
  const e = g.dom.msgs.find(m => m.q === 'err');
  assert.ok(e && /return i/.test(e.m));
});

test('a runtime error stops the game once and is reported', () => {
  const g = start("let n = 0; return i => { n++; if (n > 3) throw new Error('boom'); }");
  g.dom.frames(10);
  const errs = g.dom.msgs.filter(m => m.q === 'err');
  assert.equal(errs.length, 1);
  assert.equal(errs[0].m, 'boom');
});

test('user variables may shadow library names', () => {
  const g = start("const r = 5, t = 6, s = 7; let W = 1, H = 2, clear = 3, grid = 4; return i => save('v', [r, t, s, W, H, clear, grid].join())");
  g.dom.frames(1);
  assert.equal(g.last(), '5,6,7,1,2,3,4');
});

test('library functions are in scope', () => {
  const g = start("return i => { cls(NAVY); r(0, 0, W, 10, RED); tc('HI', 100, WHITE); save('v', [typeof kind, typeof flood, typeof btn, RED].join()) }");
  g.dom.frames(1);
  assert.equal(g.last(), 'function,function,function,8');
  assert.ok(g.dom.x.count(8) >= 256 * 10);
});

test('load() sees the values injected by the parent; save() is forwarded', () => {
  const g = start("return i => { if (i.T == 1) save('got', load('best', 0)); }", { best: 9 });
  g.dom.frames(1);
  const m = g.saves().find(s => s.k === 'got');
  assert.equal(m.v, 9);
});

test('messages from the parent: pad input, pointer, snapshot', () => {
  const g = start(OBS);
  const msg = data => g.dom.fire('message', { source: g.dom.parent, data });
  msg({ q: 'in', k: 'r', v: 1 });
  g.dom.frames(1);
  assert.equal(seen(g)[F.r], 1);
  msg({ q: 'in', k: 'r', v: 0 });
  msg({ q: 'ptr', x: 40, y: 50, t: 1 });
  g.dom.frames(1);
  assert.equal(seen(g)[F.x], 40);
  assert.equal(seen(g)[F.t], 1);
  msg({ q: 'snap' });
  const snap = g.dom.msgs.find(m => m.q === 'snap');
  assert.ok(snap && snap.ok === 1 && snap.fr >= 2);
});

test('messages from any other window are ignored', () => {
  const g = start(OBS);
  g.dom.fire('message', { source: { other: 1 }, data: { q: 'in', k: 'l', v: 1 } });
  g.dom.frames(1);
  assert.equal(seen(g)[F.l], 0);
});

test('a game can draw sprites and text through the full runtime path', () => {
  const g = start("return i => { cls(0); d('heart', 10, 10, RED, 2); t('A', 100, 100, WHITE) }");
  g.dom.frames(1);
  assert.equal(g.dom.x.get(12, 10), 8);
  assert.equal(g.dom.x.bad, 0);
});
