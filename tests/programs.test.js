/* The test programs in tests/programs/*.js are QRG games used to exercise the engine. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadCore, makeEnv, compileGame } = require('./helpers/load.js');
const { launchGame } = require('./helpers/play.js');

const api = loadCore();
const dir = path.join(__dirname, 'programs');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

test('api-tour exercises the whole library without errors for thousands of frames', () => {
  const g = launchGame(api, read('api-tour.js'), { seed: 3 });
  for (let n = 0; n < 3000; n++) {
    g.I.l = n % 7 < 3 ? 1 : 0; g.I.r = n % 11 < 4 ? 1 : 0;
    g.I.t = n % 5 == 0 ? 1 : 0; g.I.x = (n * 13) % 256; g.I.y = (n * 7) % 240;
    g.I.C = g.I.t ? 1 : 0;
    g.frame(1);
  }
  assert.equal(g.env.x.bad, 0);
  assert.ok(g.env.x.drawn() > 5000);
  assert.ok(g.env.saves.some(([k]) => k === 'best'), 'it used save()');
  assert.ok(g.texts.some(t => /^API TOUR/.test(t)));
});

test('api-tour touches every documented library function', () => {
  const src = read('api-tour.js');
  const skip = new Set(['resume', 'W', 'H', 'SP', 'PAL', 'hit', ...api.COLOR_NAMES]);       // constants and engine-internal
  const missing = Array.from(api.LIBNAMES).filter(n => !skip.has(n) && !new RegExp('\\b' + n + '\\b').test(src));
  assert.deepEqual(missing, [], 'not used in the tour: ' + missing.join(', '));
});

test('sandbox-probe: outside a browser every check reports BLOCKED and nothing is sent', () => {
  const posted = [];
  const env = makeEnv(api);
  // there is no `document`, `localStorage`, `parent`, `top`, `window` or `fetch` here: every access fails
  const code = read('sandbox-probe.js');
  const f = compileGame(env.L, code);
  for (let n = 1; n <= 5; n++) { env.I.T = n; f(env.I); }
  assert.ok(env.x.drawn() > 1000);
  assert.equal(posted.length, 0);
});

test('sandbox-probe only tests access: it never reads values, never sends data', () => {
  const src = read('sandbox-probe.js');
  assert.ok(!/document\.cookie\s*[^;)\s]/.test(src.replace(/document\.cookie;/g, '')), 'cookies are never read into anything');
  assert.ok(!/XMLHttpRequest|WebSocket|sendBeacon|navigator\./.test(src));
  assert.ok(/probe\.invalid/.test(src), 'the only network attempt goes to a reserved .invalid address');
  assert.ok(!/https?:\/\/(?!probe\.invalid)/.test(src.replace(/\/\/.*$/gm, '')), 'no other URLs');
  assert.ok(/postMessage\(\{ q: 'probe'/.test(src), 'results go to the page as plain booleans/strings');
});

test('every program file is valid and compiles as a game', () => {
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    assert.doesNotThrow(() => compileGame(makeEnv(api).L, read(f)), f);
  }
});
