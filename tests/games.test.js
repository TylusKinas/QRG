/* Every demo game: metadata, fuzzing, determinism, and the rules of the two big games. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, makeEnv, compileGame } = require('./helpers/load.js');
const { launchGame } = require('./helpers/play.js');

const api = loadCore();
const game = name => api.GAMES.find(g => g.name === name).code;

/* ------------------------------------------------------------------ all games */

test('metadata: unique names, colors, descriptions, a frame function', () => {
  const names = new Set();
  assert.ok(api.GAMES.length >= 12);
  for (const g of api.GAMES) {
    assert.ok(g.name && !names.has(g.name), 'name ' + g.name);
    names.add(g.name);
    assert.match(g.color, /^#[0-9a-f]{6}$/i, g.name);
    assert.ok(g.about.length > 10, g.name + ' has a description');
    assert.ok(/return i\s*=>/.test(g.code), g.name + ' returns a frame function');
    assert.ok(!/<\/script/i.test(g.code), g.name);
    assert.ok(!g.code.split('\n').some(l => /^\/\/ @\w+ /.test(l)), g.name + ': metadata lines must be stripped');
    const lines = g.code.split('\n');
    assert.ok(lines[0].startsWith('// ====='), g.name + ' starts with a header block explaining the game');
    assert.ok(lines.filter(l => l.trim().startsWith('//')).length >= 20, g.name + ' is explained with comments');
    assert.ok(g.code.length > api.min(g.code).length * 1.3, g.name + ': the commented source is clearly bigger than what goes into the QR code');
  }
});

function fuzz(code, frames, seed) {
  const env = makeEnv(api);
  env.L.seed(seed);
  const f = compileGame(env.L, code), I = env.I;
  let rs = seed;
  const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  const drawn = new Set();
  for (let n = 1; n <= frames; n++) {
    I.T = n;
    if (n % 10 == 1) {
      for (const k of 'lrudabs') { I[k] = rnd() < .3 ? 1 : 0; I[k.toUpperCase()] = I[k] && rnd() < .5 ? 1 : 0; }
      I.x = rnd() * 256; I.y = rnd() * 240; I.t = rnd() < .4 ? 1 : 0; I.C = I.t && rnd() < .6 ? 1 : 0;
    } else { for (const k of 'LRUDABSC') I[k] = 0; }
    f(I);
    if (n % 50 == 0) drawn.add(env.x.drawn());
  }
  assert.equal(env.x.bad, 0, 'invalid drawing arguments (NaN or bad color)');
  return env;
}

for (const g of api.GAMES) {
  test('fuzz: ' + g.name + ' survives 6000 random frames and only draws valid things', () => {
    for (const seed of [1, 2, 3]) {
      const env = fuzz(g.code, 2000, seed);
      assert.ok(env.x.drawn() > 1000, 'something is on the screen');
    }
  });
}

test('every game is deterministic for a fixed seed', () => {
  const hash = (code) => { const env = fuzz(code, 400, 9); let h = 0; for (const p of env.x.px) h = (h * 31 + p) | 0; return h; };
  for (const g of api.GAMES) {
    if (g.name === 'Tiny Pet') continue;                       // depends on the wall clock
    assert.equal(hash(g.code), hash(g.code), g.name);
  }
});

test('every game works when its variable names collide with library names', () => {
  // the demos declare things like `d`, `s`, `r`... the `with` scope must let them
  for (const g of api.GAMES) assert.doesNotThrow(() => fuzz(g.code, 50, 5), g.name);
});

/* ------------------------------------------------------------------ Tactics */

const TNAMES = 'map,U,sel,D,mv,ph,turn,wait,msg,fl,C,Rw,OY';
const tactics = seed => launchGame(api, game('Tactics'), { seed, names: TNAMES });
const cellTap = (g, x, y) => g.tapAt(x * 16 + 8, 8 + y * 16 + 8);
const WALK = [1, 2];

test('tactics: the map is valid for many seeds (spawn areas are clear, the armies can reach each other)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = tactics(seed), { map, U } = g.dbg();
    assert.equal(U.length, 8);
    assert.equal(U.filter(u => u.e).length, 4);
    for (const u of U) assert.equal(map[u.y * 16 + u.x], 0, 'seed ' + seed + ' unit on grass');
    const reach = g.L.flood(16, 11, 1, 5, null, (x, y) => [1, 2][map[y * 16 + x]] || null);
    assert.ok(reach[5 * 16 + 14] >= 0, 'seed ' + seed + ' armies connected');
    assert.equal(new Set(U.map(u => u.x + ',' + u.y)).size, 8, 'units do not overlap');
  }
});

test('tactics: selecting a unit lights up exactly the squares it can walk to', () => {
  const g = tactics(3);
  g.frame(1);
  const { U, map } = g.dbg(), knight = U.find(u => !u.e && u.t === 0);
  cellTap(g, knight.x, knight.y);
  const { sel, D } = g.dbg();
  assert.equal(sel, knight);
  let lit = 0;
  for (let k = 0; k < 176; k++) {
    if (D[k] >= 0) {
      lit++;
      assert.ok(D[k] <= 3, 'knight moves 3');
      assert.ok(!(map[k] >= 2), 'never onto water or rock');
    }
  }
  assert.ok(lit >= 4);
  assert.equal(D[knight.y * 16 + knight.x], 0);
});

test('tactics: a unit moves once, can then only act, and cannot walk through enemies', () => {
  const g = tactics(5);
  g.frame(1);
  const { U, map } = g.dbg(), u = U.find(x => !x.e && x.t === 0);
  cellTap(g, u.x, u.y);
  const { D } = g.dbg();
  let target = null;
  for (let k = 0; k < 176; k++) if (D[k] > 0 && !U.some(o => o.x == k % 16 && o.y == (k / 16 | 0))) { target = [k % 16, k / 16 | 0]; break; }
  assert.ok(target);
  cellTap(g, target[0], target[1]);
  assert.deepEqual([u.x, u.y], target);
  assert.equal(g.dbg().mv, 1);
  assert.equal(g.dbg().D, null);
  cellTap(g, target[0] + 1, target[1]);                        // a second move is not allowed
  assert.deepEqual([u.x, u.y], target);
  assert.equal(g.dbg().sel, u, 'still selected, waiting for an action');
  cellTap(g, target[0], target[1]);                            // tap itself after moving = wait
  assert.equal(u.d, 1);
  assert.equal(g.dbg().sel, null);
});

test('tactics: tapping a far or blocked square deselects without moving', () => {
  const g = tactics(5);
  g.frame(1);
  const { U } = g.dbg(), u = U.find(x => !x.e && x.t === 0), from = [u.x, u.y];
  cellTap(g, u.x, u.y);
  cellTap(g, 12, 2);
  assert.deepEqual([u.x, u.y], from);
  assert.equal(g.dbg().sel, null);
});

function fight(attackerType, defenderType, dist, forest) {
  const g = tactics(7);
  g.frame(1);
  const { U, map } = g.dbg();
  const a = U.find(u => !u.e && u.t === attackerType), d = U.find(u => u.e && u.t === defenderType);
  // clear the board of everyone else so nothing interferes, put the two on a clean grass strip
  for (let k = 0; k < map.length; k++) map[k] = 0;
  U.length = 0; U.push(a, d);
  a.x = 5; a.y = 5; d.x = 5 + dist; d.y = 5;
  if (forest) map[d.y * 16 + d.x] = 1;
  return { g, a, d, U, map };
}

test('tactics: a knight hits for its attack value and the defender strikes back', () => {
  const { g, a, d } = fight(0, 0, 1, false);
  cellTap(g, a.x, a.y);
  cellTap(g, d.x, d.y);
  assert.equal(d.hp, 12 - 5);
  assert.equal(a.hp, 12 - 5, 'counter attack');
  assert.equal(a.d, 1);
  assert.equal(g.dbg().sel, null);
});

test('tactics: forest reduces damage by one', () => {
  const { g, a, d } = fight(0, 0, 1, true);
  cellTap(g, a.x, a.y);
  cellTap(g, d.x, d.y);
  assert.equal(d.hp, 12 - 4);
});

test('tactics: ranges - an archer shoots two squares away, a knight cannot', () => {
  const far = fight(1, 0, 2, false);
  cellTap(far.g, far.a.x, far.a.y);
  cellTap(far.g, far.d.x, far.d.y);
  assert.equal(far.d.hp, 12 - 4, 'archer hits at range 2');
  assert.equal(far.a.hp, 8, 'a knight cannot counter at distance 2');

  const k = fight(0, 0, 2, false);
  cellTap(k.g, k.a.x, k.a.y);
  cellTap(k.g, k.d.x, k.d.y);                                  // out of range: this is a move order onto an enemy square -> nothing
  assert.equal(k.d.hp, 12);
});

test('tactics: a killing blow removes the unit and draws no counter attack', () => {
  const { g, a, d, U } = fight(0, 0, 1, false);
  U.push({ t: 0, x: 15, y: 10, e: 1, hp: 12 }, { t: 0, x: 0, y: 10, e: 0, hp: 12 });   // keep the game going: a second enemy and a second unit of ours
  d.hp = 3;
  cellTap(g, a.x, a.y);
  cellTap(g, d.x, d.y);
  assert.ok(!g.dbg().U.includes(d));
  assert.equal(a.hp, 12);
  assert.equal(g.dbg().ph, 0);
});

test('tactics: destroying every enemy wins, losing every unit loses, a tap starts a new game', () => {
  const win = fight(0, 0, 1, false);
  win.d.hp = 1;
  cellTap(win.g, win.a.x, win.a.y); cellTap(win.g, win.d.x, win.d.y);
  assert.equal(win.g.dbg().ph, 3, 'the killing tap must not restart the game at once');
  win.g.tapAt(100, 100);
  assert.equal(win.g.dbg().ph, 3, 'and neither does an immediate second tap');
  win.g.frame(50);
  assert.equal(win.g.dbg().ph, 3);
  assert.equal(win.g.dbg().msg, 'VICTORY!');
  assert.ok(win.g.melodies.length >= 1);
  win.g.frame(1);
  assert.ok(win.g.texts.includes('VICTORY!'));
  win.g.tapAt(100, 100);
  assert.equal(win.g.dbg().ph, 0);
  assert.equal(win.g.dbg().U.length, 8);

  const lose = fight(0, 0, 1, false);
  lose.a.hp = 1;                                               // the counter attack kills our knight
  cellTap(lose.g, lose.a.x, lose.a.y); cellTap(lose.g, lose.d.x, lose.d.y);
  assert.equal(lose.g.dbg().msg, 'DEFEAT');
});

test('tactics: when every unit is done the enemy plays, then it is our turn again with fresh units', () => {
  const g = tactics(11);
  g.frame(1);
  const { U } = g.dbg();
  for (const u of U.filter(x => !x.e)) u.d = 1;
  g.frame(1);
  assert.equal(g.dbg().ph, 2, 'enemy phase');
  const before = U.filter(u => u.e).map(u => [u.x, u.y].join());
  g.frame(300);
  const d = g.dbg();
  assert.equal(d.ph, 0);
  assert.equal(d.turn, 2);
  assert.ok(d.U.every(u => !u.d), 'everyone can act again');
  const after = d.U.filter(u => u.e).map(u => [u.x, u.y].join());
  assert.notDeepEqual(after, before, 'the enemy moved');
});

test('tactics: the END TURN button starts the enemy phase', () => {
  const g = tactics(11);
  g.frame(1);
  g.tapAt(220, 218);
  assert.equal(g.dbg().ph, 2);
});

test('tactics: the AI attacks when it can, prefers kills, and never leaves the board', () => {
  const g = tactics(13);
  g.frame(1);
  const { U, map } = g.dbg();
  for (let k = 0; k < map.length; k++) map[k] = 0;
  const foe = U.find(u => !u.e && u.t === 0), me = U.find(u => u.e && u.t === 0);
  U.length = 0; U.push(foe, me);
  foe.x = 8; foe.y = 5; foe.hp = 4;                            // a weak target
  me.x = 10; me.y = 5;                                         // two squares away: the knight walks next to it and attacks
  foe.d = 1;
  g.frame(1);
  assert.equal(g.dbg().ph, 2);
  g.frame(60);
  assert.ok(!g.dbg().U.includes(foe), 'the weak unit was killed');
  assert.equal(g.dbg().msg, 'DEFEAT');
});

test('tactics: units can never share a square or stand on water or rock (long random play)', () => {
  const g = tactics(21);
  let rs = 5;
  const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
  for (let n = 0; n < 600; n++) {
    if (rnd(3) == 0) g.tapAt(rnd(256), rnd(240)); else g.frame(rnd(40) + 1);
    const { U, map } = g.dbg();
    assert.equal(new Set(U.map(u => u.x + ',' + u.y)).size, U.length, 'overlap at step ' + n);
    for (const u of U) assert.ok(map[u.y * 16 + u.x] < 2 || map[u.y * 16 + u.x] == 1, 'unit on blocked terrain');
    for (const u of U) assert.ok(u.hp > 0 && u.x >= 0 && u.x < 16 && u.y >= 0 && u.y < 11);
  }
});

test('tactics: the QR for the strategy game fits in version 31 or smaller', () => {
  const v = api.QR(api.urlSegs(api.toURL(game('Tactics')))).v;
  assert.ok(v <= 31, 'v' + v);
});
