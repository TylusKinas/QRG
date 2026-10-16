const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, makeEnv } = require('./helpers/load.js');
const api = loadCore();
const fresh = () => makeEnv(api);
const arr = a => Array.from(a);

test('library object has no prototype (so `with` never exposes Object.prototype names)', () => {
  assert.equal(Object.getPrototypeOf(fresh().L), null);
});

test('r fills exactly the rounded rectangle and clips at the screen edge', () => {
  const { x, L } = fresh();
  L.r(10, 20, 5, 3, 8);
  assert.equal(x.count(8), 15);
  assert.equal(x.get(10, 20), 8);
  assert.equal(x.get(14, 22), 8);
  assert.equal(x.get(15, 22), 255);
  L.r(250, 235, 20, 20, 3);                     // partly off-screen
  assert.equal(x.get(255, 239), 3);
  assert.equal(x.bad, 0);
});

test('adjacent fractional rectangles leave no gap', () => {
  const { x, L } = fresh();
  L.r(0, 0, 10.5, 1, 2);
  L.r(10.5, 0, 10.5, 1, 2);
  for (let i = 0; i < 21; i++) assert.equal(x.get(i, 0), 2, 'pixel ' + i);
});

test('cls fills the whole screen', () => {
  const { x, L } = fresh();
  L.cls(1);
  assert.equal(x.count(1), 256 * 240);
});

test('box draws a one-pixel outline', () => {
  const { x, L } = fresh();
  L.box(5, 5, 10, 6, 7);
  assert.equal(x.count(7), 10 * 2 + 4 * 2);
  assert.equal(x.get(6, 6), 255);
});

test('line includes both end points and is connected', () => {
  const { x, L } = fresh();
  L.line(10, 10, 40, 25, 9);
  assert.equal(x.get(10, 10), 9);
  assert.equal(x.get(40, 25), 9);
  assert.ok(x.count(9) >= 31);
  L.line(5, 100, 5, 100, 4);
  assert.equal(x.get(5, 100), 4);
});

test('circ is filled and symmetric, ring is hollow', () => {
  const { x, L } = fresh();
  L.circ(50, 50, 5, 12);
  L.ring(150, 150, 8, 13);
  assert.equal(x.get(50, 50), 12);
  assert.equal(x.get(55, 50), 12);
  assert.equal(x.get(45, 50), 12);
  assert.equal(x.get(50, 56), 255);
  assert.equal(x.get(150, 150), 255);
  assert.equal(x.get(158, 150), 13);
  for (let d = 1; d <= 5; d++) assert.equal(x.get(50 + d, 50), x.get(50 - d, 50));
});

test('t draws the 3x5 font exactly (glyph A) and ignores unknown characters', () => {
  const { x, L } = fresh();
  L.t('A', 10, 10, 7);
  const rows = api.FONT.f[api.FONT.g.indexOf('A')];
  for (let j = 0; j < 5; j++) for (let q = 0; q < 3; q++) assert.equal(x.get(10 + q, 10 + j), (+rows[j] >> (2 - q)) & 1 ? 7 : 255);
  const before = x.drawn();
  L.t('~`^', 50, 50, 7);
  assert.equal(x.drawn(), before);
});

test('font table is consistent: one 5-digit octal glyph per character', () => {
  assert.equal(api.FONT.g.length, api.FONT.f.length);
  for (const g of api.FONT.f) assert.match(g, /^[0-7]{5}$/);
  assert.equal(new Set(api.FONT.g).size, api.FONT.g.length);
});

test('lower case is drawn as upper case', () => {
  const a = fresh(), b = fresh();
  a.L.t('score 12', 3, 3, 7);
  b.L.t('SCORE 12', 3, 3, 7);
  assert.deepEqual(arr(a.x.px), arr(b.x.px));
});

test('tw and tc measure and center text', () => {
  const { x, L } = fresh();
  assert.equal(L.tw('AB'), 7);
  assert.equal(L.tw('AB', 2), 14);
  assert.equal(L.tw(''), 0);
  L.tc('A', 10, 7);
  const x0 = Math.round((256 - 3) / 2);
  assert.equal(x.get(x0 + 1, 10), 7);
});

test('d draws a sprite from bytes, from a name, and scaled', () => {
  const { x, L } = fresh();
  L.d(api.SP.heart, 0, 0, 8);
  api.SPRITE_ART.heart.forEach((row, y) => [...row].forEach((c, q) => assert.equal(x.get(q, y), c == '#' ? 8 : 255)));
  const s2 = fresh();
  s2.L.d('heart', 100, 100, 3, 2);
  assert.equal(s2.x.get(102, 100), 3);
  assert.equal(s2.x.get(103, 101), 3);
  const lit = api.SPRITE_ART.heart.join('').replace(/\./g, '').length;
  assert.equal(s2.x.count(3), lit * 4);
});

test('d ignores unknown sprite names and missing bytes', () => {
  const { x, L } = fresh();
  L.d('nope', 0, 0, 7);
  L.d(undefined, 0, 0, 7);
  L.d([], 0, 0, 7);
  assert.equal(x.drawn(), 0);
});

test('flip mirrors a sprite and is its own inverse', () => {
  const { L } = fresh();
  const s = api.SP.sword, f = L.flip(s);
  assert.notDeepEqual(arr(f), arr(s));
  assert.deepEqual(arr(L.flip(f)), arr(s));
  assert.deepEqual(arr(L.flip('heart')), arr(api.SP.heart));      // the heart is symmetric
});

test('sprite art is valid: 8 rows of 8 characters; derived arrows exist and differ', () => {
  for (const [name, art] of Object.entries(api.SPRITE_ART)) {
    assert.equal(art.length, 8, name);
    for (const row of art) assert.match(row, /^[.#]{8}$/, name);
    assert.equal(api.SP[name].length, 8, name);
  }
  for (const n of ['up', 'down', 'left', 'right']) assert.equal(api.SP[n].length, 8, n);
  assert.notDeepEqual(arr(api.SP.up), arr(api.SP.down));
  assert.notDeepEqual(arr(api.SP.left), arr(api.SP.right));
});

test('colour constants match the palette order', () => {
  const { L } = fresh();
  api.COLOR_NAMES.forEach((n, k) => assert.equal(L[n], k));
  assert.equal(L.RED, 8);
  assert.equal(L.WHITE, 7);
  assert.equal(L.PEACH, 15);
  assert.equal(api.PAL.length, 16);
});

test('unknown colour falls back to white instead of throwing', () => {
  const { x, L } = fresh();
  L.r(0, 0, 2, 2, 99);
  assert.equal(x.get(0, 0), 7);
});

test('inb, tap, over', () => {
  const { I, L } = fresh();
  assert.equal(L.inb(5, 5, 0, 0, 10, 10), true);
  assert.equal(L.inb(10, 5, 0, 0, 10, 10), false);
  I.x = 20; I.y = 20; I.C = 1; I.t = 1;
  assert.equal(L.tap(10, 10, 20, 20), true);
  assert.equal(L.tap(30, 30, 5, 5), false);
  I.C = 0;
  assert.equal(L.tap(10, 10, 20, 20), false);
  assert.equal(L.over(10, 10, 20, 20), true);
  I.t = 0;
  assert.equal(L.over(10, 10, 20, 20), false);
});

test('btn draws and reports taps', () => {
  const { x, I, L } = fresh();
  I.x = 50; I.y = 50; I.C = 1; I.t = 1;
  assert.equal(L.btn('OK', 40, 40, 30, 20), true);
  assert.ok(x.drawn() >= 600);
  I.x = 5;
  assert.equal(L.btn('OK', 40, 40, 30, 20), false);
});

test('seed makes random numbers repeatable', () => {
  const { L } = fresh();
  L.seed(5); const a = [L.R(1000), L.R(1000), L.R(1000), L.rand()];
  L.seed(5); const b = [L.R(1000), L.R(1000), L.R(1000), L.rand()];
  L.seed(6); const c = [L.R(1000), L.R(1000), L.R(1000), L.rand()];
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('R, rr, pick, shuf stay in range and shuf is a permutation', () => {
  const { L } = fresh();
  for (let n = 0; n < 500; n++) {
    const v = L.R(7);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 7);
    const w = L.rr(3, 5);
    assert.ok(w >= 3 && w <= 5);
  }
  assert.ok([1, 2, 3].includes(L.pick([1, 2, 3])));
  assert.deepEqual(arr(L.shuf([1, 2, 3, 4, 5, 6])).sort(), [1, 2, 3, 4, 5, 6]);
});

test('math helpers', () => {
  const { L } = fresh();
  assert.equal(L.clamp(5, 0, 3), 3);
  assert.equal(L.clamp(-1, 0, 3), 0);
  assert.equal(L.lerp(10, 20, .5), 15);
  assert.equal(L.dist(0, 0, 3, 4), 5);
  assert.equal(L.sign(-4), -1);
  assert.equal(L.wrap(-1, 5), 4);
  assert.equal(L.wrap(7, 5), 2);
});

test('every fires on multiples of n frames', () => {
  const { I, L } = fresh();
  I.T = 60;
  assert.equal(L.every(60), true);
  assert.equal(L.every(7), false);
  I.T = 61;
  assert.equal(L.every(60), false);
  assert.equal(L.every(0.2), true);
});

test('now() is wall-clock seconds', () => {
  const { L } = fresh();
  assert.ok(Math.abs(L.now() - Date.now() / 1000) < 1);
});

test('actors: add, all, each, touch, step, kill, draw, clear', () => {
  const { x, L } = fresh();
  const A = L.kind('block', 8, 1), B = L.kind('block', 3, 2);
  const a = L.add(A, 10, 10, { vx: 1 }), b = L.add(B, 14, 10);
  assert.equal(a.w, 8);
  assert.equal(b.w, 16);
  assert.equal(L.all().length, 2);
  assert.equal(L.all(A).length, 1);
  let touched = 0;
  L.touch(A, B, (p, q) => { assert.equal(p, a); assert.equal(q, b); touched++; });
  assert.equal(touched, 1);
  L.step();
  assert.equal(a.x, 11);
  L.draw();
  assert.equal(x.get(11, 10), 8);
  assert.equal(x.get(14, 10), 3);
  let seen = 0;
  L.each(B, q => { seen++; L.kill(q); });
  assert.equal(seen, 1);
  assert.equal(L.all(B).length, 0);               // killed actors disappear from all() immediately
  L.step();
  assert.equal(L.all().length, 1);
  L.clear();
  assert.equal(L.all().length, 0);
});

test('actors: touching the same kind never pairs an actor with itself', () => {
  const { L } = fresh();
  const A = L.kind('block', 1, 1);
  L.add(A, 0, 0); L.add(A, 4, 0); L.add(A, 100, 100);
  let n = 0;
  L.touch(A, A, () => n++);
  assert.equal(n, 2);                              // (a,b) and (b,a)
});

test('hit is plain rectangle overlap', () => {
  const { L } = fresh();
  assert.equal(L.hit({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 }), true);
  assert.equal(L.hit({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 }), false);
});

test('grid, gget, gset', () => {
  const { L } = fresh();
  const g = L.grid(4, 3, 7);
  assert.equal(g.length, 12);
  assert.equal(g.c, 4);
  assert.equal(g.r, 3);
  L.gset(g, 2, 1, 9);
  L.gset(g, 99, 1, 5);
  assert.equal(L.gget(g, 2, 1), 9);
  assert.equal(L.gget(g, 0, 0), 7);
  assert.equal(L.gget(g, -1, 0), -1);
  assert.equal(L.gget(g, 4, 0), -1);
});

test('flood: uniform cost, limit, walls and weighted cells', () => {
  const { L } = fresh();
  assert.deepEqual(arr(L.flood(5, 1, 0, 0)), [0, 1, 2, 3, 4]);
  assert.deepEqual(arr(L.flood(5, 1, 0, 0, 2)), [0, 1, 2, -1, -1]);
  assert.deepEqual(arr(L.flood(5, 1, 0, 0, null, x => x == 2 ? null : 1)), [0, 1, -1, -1, -1]);
  assert.deepEqual(arr(L.flood(5, 1, 0, 0, null, x => x == 2 ? 3 : 1)), [0, 1, 4, 5, 6]);
  const wall = new Set([1, 4]);                    // cells (1,0) and (1,1)
  const D = L.flood(3, 3, 0, 0, null, (x, y) => wall.has(y * 3 + x) ? false : 1);
  assert.equal(D[2], 6);                           // around the wall: down 2, right 2, up 2
  assert.equal(D[1], -1);
});

test('flood prefers the cheaper route', () => {
  const { L } = fresh();
  const D = L.flood(3, 2, 0, 0, null, (x, y) => (y == 0 && x == 1) ? 5 : 1);
  assert.equal(D[2], 4);
});

test('save and load go through the environment hooks', () => {
  const { L, saves, store } = fresh();
  L.save('hi', { a: [1, 2] });
  assert.equal(saves[0][0], 'hi');
  assert.deepEqual(store.hi, { a: [1, 2] });
  assert.deepEqual(L.load('hi'), { a: [1, 2] });
  assert.equal(L.load('missing', 42), 42);
  assert.equal(L.load('missing'), undefined);
});

test('sound functions never throw without an audio device', () => {
  const { L } = fresh();
  L.s(440);
  L.s(440, 100, 'sine');
  L.mel([523, 0, 659], 80);
  L.resume();
});

test('library works without save/load hooks', () => {
  const { L } = makeEnv(api, { save: undefined, load: undefined });
  L.save('a', 1);
  assert.equal(L.load('a', 5), 5);
});
