// @name Tactics
// @color #c2c3c7
// @about Turn-based strategy. Tap a unit, tap a lit square to move, tap a red enemy to attack.
// ============================================================================
//  TACTICS - turn-based strategy
// ============================================================================
//  Four of your units (blue) fight four enemy units (red) on a random map. Each turn every unit may
//  MOVE and then ATTACK (or just wait). When all your units have acted, the enemy plays.
//
//  HOW TO PLAY: tap one of your units. The squares it can reach light up blue. Tap one to move there.
//  Enemies in range show a red frame: tap one to attack. Tap your unit again (or press WAIT) to skip.
//  Forest gives -1 damage. Water and rock cannot be crossed. Win by destroying every enemy.
//
//  HOW IT IS BUILT
//   - Everything is a grid of 16 x 11 squares. The terrain is a flat list `map` (grid(), gget-style indexing
//     y * C + x). Units are plain objects {t: type, x, y, e: enemy?, hp, d: done this turn?}.
//   - flood() from the standard library computes the cost to walk to every square; units block the enemy.
//   - The game is a small state machine, variable `ph`: 0 = your turn, 2 = enemy turn, 3 = game over.
//   - The enemy "AI" scores every square it could move to: attacking a weak target scores high, otherwise it
//     simply walks toward the nearest of your units (and likes forest).
// ============================================================================
// Board size: C columns x Rw rows of 16-pixel squares. OY is the space (in pixels) above the map.
const C = 16, Rw = 11, OY = 8;
const TY = [[12, 5, 3, 1, 'knight'], [8, 4, 3, 2, 'archer'], [10, 4, 5, 1, 'rider']];      // hp, attack, move, range, sprite
const TS = [[3], [3, 'tree', 11], [1, 'wave', 12], [5, 'rock', 6]];                          // terrain: ground color, sprite, sprite color
// State: map = terrain of every square, U = all units, sel = the selected unit, D = walking cost to every square for it,
// mv = it already moved, ph = phase (0 your turn, 2 enemy turn, 3 game over), turn = turn number,
// wait = frames to wait, msg = end-of-game message, fl = a hit flash [x, y, frames left].
let map, U, sel, D, mv, ph, turn, wait, msg, fl;
// Helpers. at(x, y) = the unit standing on a square (or undefined).
const at = (x, y) => U.find(u => u.x == x && u.y == y),
// dst(a, b) = distance in squares (steps up/down/left/right, no diagonals).
  dst = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
// inR(a, b) = can unit a attack unit b? Their distance must be 1 or more and at most a's range.
  inR = (a, b) => dst(a, b) > 0 && dst(a, b) <= TY[a.t][3],
// fo(u) = is the unit standing in a forest?
  fo = u => map[u.y * C + u.x] == 1,                                                        // forest: -1 damage taken
// cost(x, y) = what it costs to walk onto a square: grass 1, forest 2, water and rock are blocked (null).
  cost = (x, y) => [1, 2][map[y * C + x]] || null,                                          // water and rock block
// reach(u) = flood() from the standard library: the cheapest way to every square within u's move points. Enemy units block the way.
  reach = u => flood(C, Rw, u.x, u.y, TY[u.t][2], (x, y) => { const o = at(x, y); return o && o.e != u.e ? null : cost(x, y); }),
// bx(x, y, color) = a thick (2 pixel) frame around a square, used for highlights.
  bx = (x, y, k) => { box(x, y, 16, 16, k); box(x + 1, y + 1, 14, 14, k); },
// check() = has someone won? If one side has no units left the game ends and a little melody plays.
  check = () => {
    const a = U.some(u => u.e), b = U.some(u => !u.e);
    if (!a || !b) ph = 3, wait = 45, msg = a ? 'DEFEAT' : 'VICTORY!', mel(a ? [392, 262] : [523, 784, 1047], 150);   // wait = pause before a tap can restart
  },
// hit(a, b) = unit a attacks unit b. Damage is the attack value (minus 1 if b stands in a forest, at least 1).
  hit = (a, b) => {                                                                         // a attacks b, b may strike back
    b.hp -= Math.max(1, TY[a.t][1] - fo(b)); fl = [b.x, b.y, 14]; s(300);
    if (b.hp < 1) U.splice(U.indexOf(b), 1);
    else if (dst(a, b) <= TY[b.t][3] && (a.hp -= Math.max(1, TY[b.t][1] - fo(a))) < 1) U.splice(U.indexOf(a), 1);
    check();
  },
// pick(u) = select a unit and work out where it can walk.
  pick = u => { sel = u; mv = 0; D = reach(u); },
// end() = finish your turn: the enemy phase starts after a short pause.
  end = () => { ph = 2; sel = D = null; wait = 20; },
// ai(e) = the brain of enemy unit e. It looks at every square it could walk to and gives it a score:
  ai = e => {
    const F = reach(e), P = U.filter(u => !u.e);
    let best, bs = -1e9;
// For every reachable, free square (k is the index; x and y are its column and row)...
    F.forEach((c, k) => {
      const x = k % C, y = k / C | 0, o = at(x, y), p = { x, y };
      if (c < 0 || o && o != e) return;
// ...first score it by how close it gets to your nearest unit (negative = far away)...
      let sc = -Math.min(...P.map(q => dst(p, q))) + fo(p), tg;                           // approach, prefer forest
// ...then, for each of your units in range from there, an attack scores much higher (more for kills and weak targets).
      P.forEach(q => {
        const d = dst(p, q), v = Math.max(1, TY[e.t][1] - fo(q));
        if (d && d <= TY[e.t][3] && 100 + v + (v >= q.hp) * 30 - q.hp > sc) sc = 100 + v + (v >= q.hp) * 30 - q.hp, tg = q;
      });
// Remember the best square (and the target to attack from it).
      if (sc > bs) bs = sc, best = [x, y, tg];
    });
// Walk to the best square and attack if there is a target.
    e.x = best[0]; e.y = best[1];
    if (best[2]) hit(e, best[2]);
  },
// start() = a new game.
  start = () => {
// Make a random map. Try again until the two armies can reach each other (flood() says whether a path exists).
    for (;;) {
      map = grid(C, Rw);
// Each square: 14% forest, 7% water, 6% rock, the rest grass.
      for (let k = 0; k < C * Rw; k++) { const q = R(100); map[k] = q < 14 ? 1 : q < 21 ? 2 : q < 27 ? 3 : 0; }
// Keep the starting columns of both armies free of obstacles.
      for (let y = 0; y < Rw; y++) for (const x of [0, 1, 2, 13, 14, 15]) map[y * C + x] = 0;
      if (flood(C, Rw, 1, 5, null, cost)[5 * C + 14] >= 0) break;
    }
// Create 4 units for each side: the enemy is a mirror image (x -> 15 - x) of yours.
    U = [];
    for (const [t, x, y] of [[0, 1, 3], [1, 0, 5], [2, 1, 7], [0, 2, 5]]) U.push({ t, x, y, e: 0, hp: TY[t][0] }, { t, x: 15 - x, y, e: 1, hp: TY[t][0] });
// Reset the turn state.
    sel = D = fl = null; mv = ph = wait = 0; turn = 1; msg = '';
  };
// Start the first game.
start();
// The frame function. First the input and the rules, then the drawing.
return i => {
// A tap on the map during your turn (i.C = the finger just touched down):
  if (ph == 0 && i.C && i.y >= OY && i.y < OY + Rw * 16) {
// Which square? Shifting right by 4 bits divides by 16; subtract OY for the vertical part.
    const x = i.x >> 4, y = (i.y - OY) >> 4, o = at(x, y);
// If a unit is selected, the tap can mean:
    if (sel) {
//   attack an enemy in range,
      if (o && o.e && inR(sel, o)) hit(sel, o), sel.d = 1, sel = D = null;
//   tap the selected unit: cancel, or wait if it already moved,
      else if (o == sel) { if (mv) sel.d = 1; sel = D = null; }
//   move to a lit square (only once per turn),
      else if (!mv && !o && D[y * C + x] >= 0) sel.x = x, sel.y = y, mv = 1, D = null, s(500);
//   select another of your units (before moving),
      else if (o && !o.e && !o.d && !mv) pick(o);
//   tap anywhere else: deselect.
      else if (!mv) sel = D = null;
// No unit selected: tapping one of your units that has not acted yet selects it.
    } else if (o && !o.e && !o.d) pick(o);
  }
// When every one of your units has acted, the turn ends by itself.
  if (ph == 0 && U.every(u => u.e || u.d)) end();
// Enemy phase: every 28 frames the next enemy that has not acted yet plays. When all have, it is your turn again.
  if (ph == 2 && --wait < 1) {
    const e = U.find(u => u.e && !u.d);
    if (e) ai(e), e.d = 1, wait = 28; else { U.forEach(u => u.d = 0); turn++; ph = 0; }
  }
// Game over: after a short pause a tap starts a new game.
  if (ph == 3 && wait-- < 1 && i.C) start();

// Drawing: clear the screen, then the map squares: ground color, terrain sprite, and a blue frame on squares the selected unit can reach.
  cls(1);
  for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) {
    const X = x * 16, Y = OY + y * 16, [b, n, c] = TS[map[y * C + x]];
    r(X, Y, 16, 16, b); if (n) d(n, X, Y, c, 2);
    if (D && D[y * C + x] >= 0 && !at(x, y)) bx(X, Y, 12);
  }
// Draw the units: a colored square (blue yours, red enemy, gray = already acted), the sprite, and a small health bar.
  for (const u of U) {
    const X = u.x * 16, Y = OY + u.y * 16, m = TY[u.t];
    r(X + 1, Y + 1, 14, 14, u.d ? 5 : u.e ? 8 : 12); d(m[4], X, Y, 7, 2);
    r(X + 1, Y + 14, 14, 1, 0); r(X + 1, Y + 14, Math.ceil(14 * u.hp / m[0]), 1, 11);
    if (u == sel) box(X, Y, 16, 16, 10);
    if (sel && u.e && inR(sel, u)) bx(X, Y, 8);
  }
// A white flash on the unit that was just hit.
  if (fl && fl[2]-- > 0 && fl[2] % 4 < 2) box(fl[0] * 16, OY + fl[1] * 16, 16, 16, 7);

// The information panel at the bottom.
  r(0, 184, W, 56, 0); box(0, 184, W, 56, 5);
// Game over: show the message.
  if (ph > 2) tc(msg, 192, 10, 2), tc('TAP TO PLAY AGAIN', 214, 7);
  else {
// A unit is selected: show its numbers and a WAIT button (btn() from the standard library draws it and tells us when it is tapped).
    if (sel) {
      const m = TY[sel.t];
      t(m[4] + ' HP ' + sel.hp + '/' + m[0] + ' ATK ' + m[1] + ' MOVE ' + m[2] + ' RNG ' + m[3], 4, 190, 7);
      if (btn('WAIT', 120, 208, 60, 22)) sel.d = 1, sel = D = null;
// Nothing selected: whose turn is it?
    } else t(ph == 2 ? 'ENEMY TURN' : 'YOUR TURN ' + turn, 4, 190, ph == 2 ? 8 : 12), ph || t('TAP A BLUE UNIT', 4, 200, 5);
// The END TURN button.
    if (ph < 1 && btn('END TURN', 190, 208, 60, 22, 3)) end();
  }
};
