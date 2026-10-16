/* Tiny Pet: a pocket pet in real time (feed it twice a day, it keeps living while the game is closed). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./helpers/load.js');
const { launchGame } = require('./helpers/play.js');

const api = loadCore();
const CODE = api.GAMES.find(g => g.name === 'Tiny Pet').code;
const HR = 3600, DAY = 86400, AG = [0, 2 * HR, DAY, 3 * DAY, 7 * DAY];
const local = (d, h, m = 0) => new Date(2026, 5, d, h, m, 0).getTime() / 1000;      // June <d>, <h>:<m> local time
const T0 = local(1, 6);
const stageOf = age => AG.filter(a => age >= a).length - 1;

const pet = o => launchGame(api, CODE, Object.assign({ names: 'p,mg,msg,mt,an,ev', clock: T0, seed: 4 }, o));
const P = g => g.dbg().p;
const btn = (g, k) => g.tapAt(4 + k * 50 + 23, 213);                                 // FEED PLAY CLEAN SLEEP HEAL = 0..4
/* let `sec` seconds pass (the game replays them on its next half-second check) */
const wait = (g, sec) => { g.advance(sec); g.frame(31); };
const waitUntil = (g, t) => { if (t > g.clock) wait(g, t - g.clock); else g.frame(31); };
const state = (age, o) => Object.assign({ t: T0, h: 90, f: 90, c: 90, e: 100, hp: 100, sk: 0, zz: 0, po: 0, pt: 0, age, care: age * 90, m: 0, miss: 0, dk: null, dead: 0 }, o);
const hatched = () => { const g = pet(); wait(g, 2 * HR + 5); return g; };

function playMiniGame(g) {
  btn(g, 1);
  assert.ok(g.dbg().mg, 'mini game started');
  for (let n = 0; n < 3000 && g.dbg().mg; n++) { const m = g.dbg().mg; if (m.t > 0) g.tapAt(m.x + 10, m.y + 10); else g.frame(1); }
  assert.ok(!g.dbg().mg, 'mini game finished');
}

test('pet: starts as an egg that needs nothing, shows when it hatches, and hatches after 2 hours', () => {
  const g = pet();
  g.frame(60);
  assert.equal(P(g).age, 0);
  assert.ok(g.texts.some(t => /^EGG HATCHES IN 2H 0M$/.test(t)), JSON.stringify(g.texts.slice(-8)));
  wait(g, HR);
  assert.equal(P(g).h, 80, 'an egg does not get hungry');
  assert.equal(stageOf(P(g).age), 0);
  g.clearTexts(); g.frame(2);
  assert.ok(g.texts.some(t => /^EGG HATCHES IN 1H /.test(t)), 'the countdown moves');
  btn(g, 0);
  assert.equal(P(g).m, 0, 'buttons are disabled for an egg');
  wait(g, HR + 10);
  assert.equal(stageOf(P(g).age), 1, 'baby');
  assert.ok(g.melodies.length >= 1, 'a jingle played');
  assert.ok(g.dbg().ev > 0 || g.melodies.length);
});

test('pet: it gets hungry in about half a day, so two meals a day are needed', () => {
  const g = hatched();
  const h0 = P(g).h;
  wait(g, 12 * HR);
  const drop = h0 - P(g).h;
  assert.ok(drop > 40 && drop < 70, 'about half the food is gone after 12 hours: ' + drop.toFixed(1));
  wait(g, 14 * HR);
  assert.equal(P(g).h, 0, 'completely hungry after a day without food');
});

test('pet: feeding gives half a meal, counts today\'s meals, stops at 3 and refuses when not hungry', () => {
  const g = pet({ store: { p: state(10000, { h: 30, t: T0 }) } });
  g.frame(2);
  btn(g, 0);
  assert.equal(P(g).h, 80);
  assert.equal(P(g).m, 1);
  assert.ok(g.dbg().an && g.dbg().an[0] === 'apple');
  assert.equal(P(g).f, 90, 'eating does not change fun');
});

test('pet: not hungry above 90, and no fourth meal in one day', () => {
  const g = pet({ store: { p: state(10000, { h: 95 }) } });
  g.frame(2); g.clearTexts();
  btn(g, 0); g.frame(1);
  assert.ok(g.texts.includes('NOT HUNGRY'));
  assert.equal(P(g).m, 0);
  for (let k = 0; k < 3; k++) { P(g).h = 20; btn(g, 0); }
  assert.equal(P(g).m, 3);
  P(g).h = 20; g.clearTexts();
  btn(g, 0); g.frame(1);
  assert.ok(g.texts.includes('ENOUGH FOR TODAY'));
  assert.equal(P(g).m, 3);
});

test('pet: the meal counter resets at 5:00 and a day with fewer than two meals is remembered', () => {
  const g = pet({ clock: local(1, 9), store: { p: state(10000, { t: local(1, 9), h: 30 }) } });
  g.frame(2);
  btn(g, 0);
  assert.equal(P(g).m, 1);
  waitUntil(g, local(2, 4, 59));
  assert.equal(P(g).m, 1, 'still the same day at 4:59');
  waitUntil(g, local(2, 5, 1));
  assert.equal(P(g).m, 0, 'a new day');
  assert.equal(P(g).miss, 1, 'the day before had only one meal');
  assert.ok(g.texts.includes('MEALS'));
});

test('pet: the apples show how many meals it had today', () => {
  const g = pet({ store: { p: state(10000, { m: 1 }) } });
  g.frame(2);
  assert.equal(g.px(36 + 3, 33 + 3), 8, 'first apple is red (eaten)');
  assert.equal(g.px(46 + 3, 33 + 3), 5, 'second apple is gray (still to come)');
});

test('pet: a meal leads to a poop an hour or two later; cleaning removes it', () => {
  const g = pet({ store: { p: state(10000, { h: 30 }) } });
  g.frame(2);
  btn(g, 0);
  assert.ok(P(g).pt >= HR && P(g).pt <= 3 * HR, 'timer ' + P(g).pt);
  assert.equal(P(g).po, 0);
  wait(g, 3 * HR + 60);
  assert.equal(P(g).po, 1);
  assert.equal(P(g).pt, 0);
  const c = P(g).c;
  btn(g, 2);
  assert.equal(P(g).po, 0);
  assert.equal(P(g).c, 100);
  assert.ok(c < 100);
});

test('pet: at most three poop piles', () => {
  const g = pet({ store: { p: state(10000, { po: 3, pt: 10 }) } });
  g.frame(2);
  wait(g, 3600);
  assert.equal(P(g).po, 3);
});

test('pet: sleeping restores energy in about 8 hours, blocks the other buttons, wakes up by itself', () => {
  const g = hatched();
  P(g).e = 10;
  btn(g, 3);
  assert.equal(P(g).zz, 1);
  const food = P(g).h; g.clearTexts();
  btn(g, 0); g.frame(1);
  assert.equal(P(g).m, 0, 'cannot feed a sleeping pet');
  assert.ok(g.texts.includes('SHH... SLEEPING'));
  assert.ok(g.texts.includes('WAKE'));
  wait(g, 7 * HR);
  assert.equal(P(g).zz, 1);
  wait(g, 2 * HR);
  assert.equal(P(g).zz, 0, 'woke up fully rested');
  assert.ok(P(g).e > 85, 'energy ' + P(g).e);
  assert.ok(P(g).h < food, 'sleeping still uses a little food');
  btn(g, 3); btn(g, 3);
  assert.equal(P(g).zz, 0, 'sleep and wake by hand');
});

test('pet: a tired pet refuses to play; otherwise the star mini game raises fun', () => {
  const g = hatched();
  P(g).e = 5; g.clearTexts();
  btn(g, 1); g.frame(1);
  assert.ok(g.texts.includes('TOO TIRED'));
  assert.ok(!g.dbg().mg);
  P(g).e = 100; P(g).f = 20;
  playMiniGame(g);
  assert.ok(P(g).f >= 20 + 12 + 3 * 14 - 2, 'fun went up: ' + P(g).f);
  assert.ok(P(g).e <= 100 - 8 + 1);
});

test('pet: missing every star still ends the game with a small reward', () => {
  const g = hatched();
  P(g).e = 100; P(g).f = 20;
  btn(g, 1);
  g.frame(1500);
  assert.ok(!g.dbg().mg);
  assert.ok(P(g).f >= 20 + 12 - 3);
});

test('pet: sickness comes from neglect and the medicine cures it', () => {
  const g = pet({ store: { p: state(10000, { c: 5, h: 90 }) } });
  g.frame(2);
  wait(g, 6 * HR);
  assert.equal(P(g).sk, 1, 'a dirty pet gets sick');
  const hp = P(g).hp;
  btn(g, 4);
  assert.equal(P(g).sk, 0);
  assert.ok(P(g).hp >= Math.min(100, hp + 20) - 1);
  g.clearTexts(); btn(g, 4); g.frame(1);
  assert.ok(g.texts.includes('NOT SICK'));
});

test('pet: a pet that is never fed leaves after about three days', () => {
  const g = hatched();
  wait(g, 24 * HR);
  assert.equal(P(g).dead, 0, 'hungry but still there after a day');
  assert.ok(P(g).hp < 100 && P(g).h === 0);
  wait(g, 48 * HR);
  assert.equal(P(g).dead, 1, 'gone after three days without food');
  g.clearTexts(); g.frame(2);
  assert.ok(g.texts.includes('YOUR PET HAS LEFT'));
  g.tapAt(100, 100);
  assert.equal(P(g).dead, 0);
  assert.equal(P(g).age, 0, 'a new egg');
  assert.ok(g.env.saves.some(([k, v]) => k === 'p' && v.age === 0), 'the new egg was saved');
});

/* A whole week of looking after the pet properly: the adult must be the well cared for one. */
function goodDay(g, day) {
  waitUntil(g, local(day, 7, 30));
  if (P(g).zz) btn(g, 3);
  if (P(g).sk) btn(g, 4);                                          // medicine when needed
  btn(g, 0);                                                       // breakfast
  waitUntil(g, local(day, 12));
  btn(g, 2);                                                       // clean up
  waitUntil(g, local(day, 13));
  P(g).e = Math.max(P(g).e, 40); playMiniGame(g);                  // play
  waitUntil(g, local(day, 18, 30));
  btn(g, 0);                                                       // dinner
  waitUntil(g, local(day, 21, 30));
  btn(g, 2); btn(g, 3);                                            // clean up, then bed time
}

test('pet: seven days of good care make a well cared for adult', () => {
  const g = pet({ clock: local(1, 6) });
  waitUntil(g, local(1, 8, 30));                                   // hatched at 8:00
  for (let day = 1; day <= 8; day++) {
    if (day > 1) goodDay(g, day); else { btn(g, 0); waitUntil(g, local(1, 18, 30)); btn(g, 0); waitUntil(g, local(1, 21, 30)); btn(g, 3); }
    assert.equal(P(g).dead, 0, 'alive on day ' + day);
    assert.ok(P(g).hp > 90, 'healthy on day ' + day + ': ' + P(g).hp.toFixed(0));
  }
  assert.ok(P(g).age > 7 * DAY, 'age ' + P(g).age);
  assert.equal(stageOf(P(g).age), 4, 'adult');
  assert.equal(P(g).miss, 0, 'no missed days');
  assert.ok(P(g).care / P(g).age > 62, 'care ' + (P(g).care / P(g).age).toFixed(1));
  if (P(g).zz) btn(g, 3);                                          // wake it up: a sleeping pet is drawn gray
  g.frame(3);
  assert.equal(g.px(104 + 6 * 3 + 2, 98 + 6 * 2 + 2), 10, 'the good adult is yellow');
});

test('pet: a pet that is mostly left alone grows into the neglected adult', () => {
  const g = pet({ store: { p: state(7 * DAY + 100, { care: (7 * DAY + 100) * 40, miss: 5 }) } });
  g.frame(3);
  assert.equal(g.px(104 + 6 * 3 + 2, 98 + 6 * 2 + 2), 13, 'lavender');
});

test('pet: memory belongs to this game: it is restored after closing and reopening, with time replayed', () => {
  const g = hatched();
  btn(g, 0);
  assert.ok(g.env.saves.length >= 1);
  const saved = JSON.parse(JSON.stringify(g.env.store.p));
  assert.equal(saved.m, 1);
  const closedAt = g.clock;
  const g2 = pet({ clock: closedAt + 10 * HR, store: { p: saved } });       // reopened ten hours later
  const q = P(g2);
  assert.equal(q.m, 1, 'it remembers today\'s meal');
  assert.ok(Math.abs(q.age - (saved.age + 10 * HR)) < 120, 'ten hours older: ' + (q.age - saved.age));
  assert.ok(q.h < saved.h - 25, 'and hungrier: ' + saved.h.toFixed(0) + ' -> ' + q.h.toFixed(0));
});

test('pet: another game (different code) has its own, empty memory', () => {
  const a = api.min(CODE), b = api.min(CODE + '\n// tweak\nlet extra = 1;');
  assert.notEqual(a, b);
  // the page keys storage by a fingerprint of the minified code: see security.test.js for the storage rules themselves
  const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  assert.notEqual(fnv(a), fnv(api.min(CODE.replace('const HR = 3600', 'const HR = 3601'))), 'changing the code changes the memory slot');
  assert.equal(fnv(a), fnv(api.min(CODE + '\n// only a comment')), 'comments do not change the memory');
});

test('pet: time away is capped at 5 days and long neglect ends the pet', () => {
  const g = pet({ store: { p: state(10000, { t: T0 - 30 * DAY }) } });
  assert.ok(P(g).age <= 10000 + 5 * DAY + 1, 'never replays more than 5 days');
  assert.equal(P(g).dead, 1);
});

test('pet: a day away with the pet well fed leaves it alive and hungry', () => {
  const g = pet({ store: { p: state(10000, { t: T0 - 20 * HR, h: 100, f: 100, c: 100, e: 100 }) } });
  assert.equal(P(g).dead, 0);
  assert.ok(P(g).h < 50 && P(g).h > 0);
});

test('pet: day and night change the sky, sleeping turns the lights off', () => {
  const mk = (clock, o) => pet({ clock, store: { p: state(10000, Object.assign({ t: clock }, o)) } });
  const day = mk(local(1, 12)); day.frame(1);
  assert.equal(day.px(5, 100), 12);
  const night = mk(local(1, 23)); night.frame(1);
  assert.equal(night.px(5, 100), 1);
  const dark = mk(local(1, 23), { zz: 1, e: 50 }); dark.frame(1);
  assert.equal(dark.px(5, 100), 0);
});

test('pet: reminds you when a meal is due', () => {
  const g = pet({ clock: local(1, 19), store: { p: state(10000, { t: local(1, 19), h: 60, m: 1 }) } });
  g.frame(905);
  assert.ok(g.texts.includes('TIME TO EAT'));
  const quiet = pet({ clock: local(1, 19), store: { p: state(10000, { t: local(1, 19), h: 60, m: 2 }) } });
  quiet.frame(905);
  assert.ok(!quiet.texts.includes('TIME TO EAT'));
});

test('pet: random play never produces NaN stats or out-of-range values', () => {
  const g = hatched();
  let rs = 3;
  const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
  for (let n = 0; n < 500; n++) {
    if (rnd(4) == 0) btn(g, rnd(5)); else if (rnd(8) == 0) g.tapAt(rnd(256), rnd(240)); else wait(g, rnd(6 * HR) + 1);
    const p = P(g);
    for (const k of ['h', 'f', 'c', 'e']) assert.ok(p[k] >= 0 && p[k] <= 100, k + '=' + p[k]);
    assert.ok(Number.isFinite(p.hp) && p.hp <= 100 && Number.isFinite(p.age) && Number.isFinite(p.care));
    assert.ok(p.po >= 0 && p.po <= 3 && p.m >= 0 && p.m <= 3 && p.miss >= 0);
  }
});

test('pet: the QR for the pet game fits in version 34 or smaller', () => {
  const v = api.QR(api.urlSegs(api.toURL(CODE))).v;
  assert.ok(v <= 34, 'v' + v);
});
