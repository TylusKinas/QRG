// @name Tiny Pet
// @color #ff77a8
// @about A pocket pet in real time: feed it twice a day. It lives on while the game is closed.
// ============================================================================
//  TINY PET - a pet that lives in real time
// ============================================================================
//  It starts as an egg that hatches after 2 hours. Then, like a real pet, it
//  must be fed about twice a day, played with, cleaned up after and put to bed.
//  Growing up takes a week: baby (1 day) > child (3 days) > teen (7 days) > adult.
//
//  HOW IT STAYS ALIVE WHEN THE GAME IS CLOSED
//   - save('p', p) stores the pet in this game's private memory (browser storage).
//     The memory belongs to THIS game only: it is keyed by a fingerprint of the
//     game's code, so no other game can read it, and editing the code starts a
//     fresh pet. The round button (reset) in the corner of the game wipes it.
//   - p.t remembers the last time we looked. On the next start sim() replays all
//     the time that has passed (up to 5 days) in 60-second steps.
//
//  CONTROLS: tap the five buttons at the bottom: FEED, PLAY, CLEAN, SLEEP, HEAL.
// ============================================================================

// --- Pictures: 8 numbers per sprite = 8 rows of 8 pixels (see the sprite editor) ----
const SPR = [
  [24, 60, 126, 126, 255, 255, 126, 60],        // 0 egg
  [0, 60, 126, 255, 255, 255, 126, 102],        // 1 baby
  [66, 102, 126, 255, 255, 255, 126, 102],      // 2 child (ears)
  [153, 219, 255, 255, 255, 126, 126, 102],     // 3 teen (spikes)
  [165, 255, 255, 255, 255, 126, 126, 195],     // 4 well cared for adult (crown)
  [129, 195, 255, 255, 255, 126, 102, 66]       // 5 neglected adult (horns)
];
const BC = [7, 14, 15, 9, 10, 13];              // body color of each sprite
// Faces are drawn on top of the body in black: happy, ok, sad, asleep.
const FACE = [[0, 0, 0, 36, 0, 36, 24, 0], [0, 0, 0, 36, 0, 0, 24, 0], [0, 0, 0, 36, 0, 24, 36, 0], [0, 0, 0, 0, 36, 0, 0, 0]];
const BT = [['FEED', 'apple', 8], ['PLAY', 'ball', 12], ['CLEAN', 'drop', 12], ['SLEEP', 'moon', 10], ['HEAL', 'plus', 8]];

// --- Time ---------------------------------------------------------------------------
const HR = 3600, DAY = 86400;                   // seconds in an hour and in a day
const AG = [0, 2 * HR, DAY, 3 * DAY, 7 * DAY];  // the age at which each stage begins: egg, baby, child, teen, adult

// --- State: everything that must survive a restart lives in the object p --------------
// h food, f fun, c clean, e energy (0-100), hp health, sk sick, zz asleep, po poop piles,
// pt seconds until the next poop, age and care (to judge how well it was looked after),
// m meals eaten today, miss days with too few meals, dk number of the current day.
const fresh = () => ({ t: now(), h: 80, f: 80, c: 100, e: 100, hp: 100, sk: 0, zz: 0, po: 0, pt: 0, age: 0, care: 0, m: 0, miss: 0, dk: null, dead: 0 });
let p = Object.assign(fresh(), load('p', {}));   // saved pet, or a new egg (missing fields get defaults)
let mg, msg = '', mt = 0, an, ev = 0;            // mini game, message + timer, animation, evolution flash

const stage = () => AG.filter(a => p.age >= a).length - 1;     // 0 egg ... 4 adult
// which sprite to show: adults depend on how well the pet was cared for
const body = () => { const k = stage(); return k < 4 ? k : p.care / Math.max(1, p.age) > 62 && p.miss < 3 ? 4 : 5; };
const say = m => { msg = m; mt = 100; };
const dur = s => s >= HR ? (s / HR | 0) + 'H ' + (s % HR / 60 | 0) + 'M' : (s / 60 | 0) + 'M';
// A new "day" starts at 5:00 local time. The meal counter is reset then.
const dayKey = () => Math.floor((now() - new Date(now() * 1000).getTimezoneOffset() * 60 - 18000) / DAY);
const roll = () => {
  const k = dayKey();
  if (p.dk === null) p.dk = k;
  if (k != p.dk) { if (stage()) p.miss += k - p.dk - 1 + (p.m < 2); p.dk = k; p.m = 0; }   // count days with fewer than 2 meals
};

// --- Life: advance the pet by dt seconds ---------------------------------------------
const tick = dt => {
  if (p.dead) return;
  const b = stage(), z = p.zz;
  p.age += dt;
  if (b) {                                                       // an egg needs nothing but time
    p.h = clamp(p.h - dt * .0014 * (z ? .5 : 1), 0, 100);        // hungry after ~12 h awake: two meals a day
    p.f = clamp(p.f - dt * .0006 * (z ? .4 : 1), 0, 100);                 // bored after a day without play
    p.c = clamp(p.c - dt * (.0003 + p.po * .0003), 0, 100);        // slowly dirtier, and every poop pile makes it worse
    p.e = clamp(p.e + dt * (z ? .0035 : -.0015), 0, 100);        // sleeping restores energy in ~8 h
    if (p.pt > 0 && (p.pt -= dt) <= 0) { p.pt = 0; if (p.po < 3) p.po++; }   // a meal leads to a poop an hour or two later
    if (!p.sk && (p.c < 20 || p.h < 10) && rand() < dt / 10800) p.sk = 1;     // dirt and hunger make it sick
    p.hp = clamp(p.hp - dt * ((p.sk ? .00058 : 0) + (p.h < 1 ? .00077 : 0)) + (p.h > 40 && p.c > 40 && !p.sk ? dt * .00116 : 0), 0, 100);
    p.care += dt * (p.h + p.f + p.c) / 3;                        // care / age = the average of its needs, 0-100
    if (z && p.e >= 100) p.zz = 0;                               // wakes up fully rested
    if (!z && p.e < 1) p.zz = 1;                                 // collapses when exhausted
    if (p.hp <= 0) p.dead = 1;
  }
  if (stage() > b) ev = 100, mel([523, 659, 784, 1047], 130);    // grew up: flash and jingle
};
// Replay the time that passed since we last looked (also while the game was closed). Max 5 days.
const sim = () => {
  const dt = Math.min(now() - p.t, 5 * DAY);
  if (dt >= 1) { for (let k = 0; k < dt; k += 60) tick(Math.min(60, dt - k)); p.t = now(); }
};

// --- What the buttons do ----------------------------------------------------------------
const act = k => {
  if (p.dead || !stage()) return;                                // nothing works on an egg
  if (k == 3) p.zz = 1 - p.zz, s(p.zz ? 300 : 600);              // SLEEP / WAKE
  else if (p.zz) say('SHH... SLEEPING');
  else if (k == 0) p.h > 90 ? say('NOT HUNGRY') : p.m > 2 ? say('ENOUGH FOR TODAY') : (p.h = Math.min(100, p.h + 50), p.m++, p.pt = p.pt || HR + R(2 * HR), an = ['apple', 70], s(700));
  else if (k == 1) p.e < 20 ? say('TOO TIRED') : mg = { k: 0, ok: 0, w: 40 + R(60), t: 0 };
  else if (k == 2) p.po = 0, p.c = 100, an = ['drop', 50], s(900);
  else p.sk ? (p.sk = 0, p.hp = Math.min(100, p.hp + 20), say('BETTER!'), s(800)) : say('NOT SICK');
  save('p', p);                                                  // remember it right away
};

roll(); sim();                                                   // catch up before the first frame

return i => {
  // Twice a second: new day? replay time? And every 5 seconds write the pet to memory.
  if (i.T % 30 == 0) { roll(); sim(); i.T % 300 || save('p', p); }
  const st = stage(), slp = p.zz, hr = new Date(now() * 1000).getHours(), nt = hr > 20 || hr < 6;
  if (ev > 0 && --ev % 10 == 0) s(900);

  // ---- the pet is gone ----
  if (p.dead) {
    cls(); d('skull', 104, 80, 5, 6); tc('YOUR PET HAS LEFT', 150, 7); tc('TAP FOR A NEW EGG', 170, 10);
    if (i.C) p = fresh(), save('p', p);
    return;
  }

  // ---- mini game: tap the star when it appears (3 rounds) ----
  if (mg) {
    cls(3); tc('TAP THE STAR! ' + mg.k + '/3', 10, 7);
    if (--mg.w == 0) mg.x = 20 + R(200), mg.y = 50 + R(130), mg.t = 50;       // the star shows up
    if (mg.t > 0) {
      d('star', mg.x, mg.y, 10, 4);
      if (i.C && inb(i.x, i.y, mg.x, mg.y, 32, 32)) mg.ok++, s(900), mg.t = 1;  // caught it
      if (--mg.t < 1) mg.k++, mg.w = 30 + R(60);                               // next round
    }
    if (mg.k > 2) p.f = Math.min(100, p.f + 12 + mg.ok * 14), p.e = Math.max(0, p.e - 8), say(mg.ok ? 'WHEEE!' : 'MAYBE LATER'), mg = 0, save('p', p);
    return;
  }

  // ---- the room: night sky, day sky, or lights off ----
  cls(slp ? 0 : nt ? 1 : 12);
  if (!slp) d(nt ? 'moon' : 'sun', 200, 36, 10, 3), r(0, 150, W, 30, 3);

  // ---- the pet ----
  const z = 6, px = 104, py = 98 + (slp ? 0 : Math.round(Math.sin(i.T / 18) * 2)), b = body(), mood = (p.h + p.f + p.c) / 3;
  d(SPR[b], px, py, p.sk ? 11 : slp ? 5 : BC[b], z);                // body (green when sick, gray when asleep)
  if (st) d(FACE[slp || i.T % 200 < 8 ? 3 : mood > 60 ? 0 : mood > 30 ? 1 : 2], px, py, 0, z);   // face follows its mood; blinks now and then
  if (slp) d('zzz', 164, 70, 6, 3);
  if (p.sk) d('skull', 168, 96, 11, 2);
  for (let k = 0; k < p.po; k++) d('poop', 14 + k * 26, 142, 4, 3);
  if (an && an[1]-- > 0) d(an[0], px + 20 + an[1], py + 10, an[0] == 'apple' ? 8 : 12, 3);   // food or water sliding in
  if (ev > 0 && ev % 12 < 6) r(0, 0, W, H, 7), tc('GREW UP!', 110, 8, 3);

  // ---- status ----
  [['FOOD', 'h'], ['FUN', 'f'], ['CLEAN', 'c'], ['ENERGY', 'e']].forEach(([n, k], j) => { t(n, 4 + j * 62, 4, 7); bar(4 + j * 62, 11, 56, 7, p[k]); });
  t(st ? ['', 'BABY', 'CHILD', 'TEEN', 'ADULT'][st] + ' DAY ' + (p.age / DAY + 1 | 0) : 'EGG HATCHES IN ' + dur(AG[1] - p.age), 4, 24, 6);
  t('MEALS', 4, 34, 6);
  for (let k = 0; k < 2; k++) d('apple', 36 + k * 10, 33, p.m > k ? 8 : 5, 1);        // two apples = two meals a day
  for (let k = 0; k < Math.ceil(p.hp / 20); k++) d('heart', 190 + k * 12, 22, 8, 1);   // health
  const due = hr >= 7 && p.m < 1 || hr >= 18 && p.m < 2;                              // a meal is due
  if (mt > 0) mt--, tc(msg, 164, 7);
  else if (!slp && st && i.T % 900 == 0 && (p.h < 30 || due || p.f < 25 || p.c < 30 || p.po > 1)) s(330), say(p.h < 30 || due ? 'TIME TO EAT' : p.f < 25 ? 'PLAY WITH ME' : 'IT IS DIRTY');

  // ---- the five buttons ----
  BT.forEach(([n, ic, c], k) => {
    const x = 4 + k * 50, off = !st || slp && k != 3, lb = k == 3 && slp ? 'WAKE' : n;   // gray = not available now
    r(x, 190, 46, 46, off ? 5 : 0); box(x, 190, 46, 46, off ? 5 : c);
    d(k == 3 && slp ? 'sun' : ic, x + 11, 196, off ? 6 : c, 3); t(lb, x + (46 - tw(lb)) / 2, 224, off ? 6 : 7);
    if (tap(x, 190, 46, 46)) act(k);
  });
};
