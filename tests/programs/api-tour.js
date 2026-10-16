// API tour (a test program): calls every library function at least once, so a test can check that the whole
// standard library works together. It is also a compact example of the language.
const kP = kind('smile', YELLOW, 2), kC = kind(SP.coin, ORANGE, 1);
const map = grid(8, 6, 0);
gset(map, 3, 2, 1);
let n = 0, best = load('best', 0), pts = [];
seed(7);
const player = add(kP, 120, 120);
add(kC, 130, 125);
const D = flood(8, 6, 0, 0, 6, (x, y) => gget(map, x, y) == 1 ? 2 : 1);
return i => {
  n++;
  cls(NAVY);
  r(4, 4, 20, 10, RED); box(4, 4, 20, 10, WHITE);
  line(0, 0, 255, 239, GRAY); circ(200, 60, 12, PINK); ring(200, 60, 18, WHITE);
  bar(40, 8, 60, 7, n % 100);
  t('API TOUR ' + n, 4, 20, WHITE); tc('CENTERED', 30, YELLOW, 2); t('W' + tw('AB'), 4, 50, GRAY);
  d(SP.heart, 10, 60, RED, 2); d('star', 40, 60, YELLOW, 2); d(flip('sword'), 70, 60, WHITE, 2); d([60, 126, 255, 255, 126, 102, 102, 0], 100, 60, LIME);
  if (i.l) player.x -= 2; if (i.r) player.x += 2;
  if (i.t) { player.x = i.x; player.y = i.y; }
  touch(kP, kC, (p, c) => { kill(c); s(800); mel([523, 659], 60); });
  if (every(60)) add(kC, R(W), 0, { vy: 1 });
  each(kC, a => { if (a.y > H) kill(a); });
  step(); draw();
  if (btn('BTN', 8, 200, 40, 20) || tap(0, 0, 10, 10) || over(0, 0, 10, 10) || inb(1, 1, 0, 0, 5, 5)) n += 0;
  pts = shuf([1, 2, 3, 4]); pick(pts); rr(1, 6); rand(); lerp(0, 10, .5); dist(0, 0, 3, 4); sign(-2); wrap(-1, 5); clamp(5, 0, 3);
  if (hit(player, { x: 0, y: 0, w: 4, h: 4 })) n++;
  t('FLOOD ' + D[47], 120, 200, WHITE);
  if (n % 120 == 0) { save('best', Math.max(best, n)); best = load('best', 0); }
  t('BEST ' + best + ' ' + now() % 10 + ' ' + PAL.length + ' ' + all().length, 4, 230, GRAY);
  if (n > 3 && n % 50 == 0) clear(), add(kP, 100, 100);
};
