#!/usr/bin/env node
/* Records short gameplay GIFs of the demo games for the documentation (docs/img/*.gif).
   The games run headless against the real library with a scripted "player"; same seed = same GIF.
   Run: node tools/gifs.js   (not part of `npm run build`, because it is slow and its output is committed). */
const fs = require('fs');
const path = require('path');
const { loadCore } = require('../tests/helpers/load.js');
const { launchGame } = require('../tests/helpers/play.js');
const { encodeGif } = require('./gif.js');

const api = loadCore();
const OUT = path.join(__dirname, '..', 'docs', 'img');
fs.mkdirSync(OUT, { recursive: true });

/* what the scripted player presses: keys held at random for a few frames; `start` = pressed at the beginning */
const PLAN = {
  'Tetris':   { keys: ['l', 'r', 'd', 'a'], hold: 6, start: 'S', frames: 900 },
  'Racing':   { keys: ['l', 'r'], hold: 14, start: 'A', frames: 700 },
  'Breakout': { keys: ['l', 'r'], hold: 20, start: 'A', frames: 700 },
  'Snake':    { keys: ['l', 'r', 'u', 'd'], hold: 12, start: 'A', frames: 800 },
  'Flappy':   { keys: ['a'], hold: 3, gap: 22, start: 'A', frames: 700 },
  'Invaders': { keys: ['l', 'r', 'a'], hold: 10, start: 'A', frames: 800 },
  'Tiny Pet': { keys: [], hold: 1, start: 'A', frames: 900, tick: 1200, taps: [[60, 26, 215], [330, 26, 215], [600, 26, 215], [760, 76, 215]] }
};

function lcg(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

function record(g, plan) {
  const rnd = lcg(7), game = launchGame(api, g.code, { seed: 3 });
  const frames = [], I = game.I;
  let held = null, left = 0;
  for (let n = 0; n < plan.frames; n++) {
    if (n === 20 || n === 21) I[plan.start] = 1;
    if (n > 40 && plan.keys.length) {
      if (--left <= 0) {
        if (held) I[held] = 0;
        held = rnd() < (plan.gap ? .5 : .85) ? plan.keys[Math.floor(rnd() * plan.keys.length)] : null;
        left = 1 + Math.floor(rnd() * plan.hold) + (plan.gap || 0) * (held ? 0 : 1);
        if (held) I[held] = 1;
      }
    }
    if (plan.tick) game.advance(plan.tick / 60);
    for (const [at, x, y] of plan.taps || []) if (n === at) { game.tapAt(x, y); continue; }
    if (!plan.tick && n > 60 && n % 100 === 0) I.A = 1;      // restart after a game over
    game.frame(1);
    if (n === 21) I[plan.start] = 0;
    if (n % 3 === 0) frames.push(Uint8Array.from(game.env.x.px, v => (v === 255 ? 0 : v)));
  }
  return frames;
}

for (const g of api.GAMES) {
  const plan = PLAN[g.name];
  if (!plan) continue;
  const frames = record(g, plan);
  const gif = encodeGif(256, 240, api.PAL, frames, 5);
  const file = path.join(OUT, g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.gif');
  fs.writeFileSync(file, gif);
  console.log(path.relative(process.cwd(), file), (gif.length / 1024).toFixed(0) + ' KB', frames.length + ' frames');
}
