/* Runs a game in Node against the real library: controllable clock, input helpers, captured sounds and texts,
   and an optional debug hook that exposes the game's internal state (the code is instrumented, never the library). */
const { makeEnv, compileGame } = require('./load.js');

/* Replace the final `return i => ...` by a named function and add `.dbg()` returning the listed variables. */
function instrument(code, names) {
  const k = code.lastIndexOf('return i =>');
  if (k < 0) throw new Error('game has no `return i =>` frame function');
  return code.slice(0, k) + 'const __f = i =>' + code.slice(k + 'return i =>'.length) +
    '\n;__f.dbg = () => ({' + names + '});\nreturn __f;';
}

function launchGame(api, code, opts) {
  opts = opts || {};
  const env = makeEnv(api, opts.env);
  if (opts.seed != null) env.L.seed(opts.seed);
  let clock = opts.clock != null ? opts.clock : 1.7e9;
  env.L.now = () => clock;
  const texts = [], sounds = [], melodies = [];
  const t0 = env.L.t, tc0 = env.L.tc, s0 = env.L.s, m0 = env.L.mel;
  env.L.t = (s, ...r) => { texts.push(String(s)); return t0(s, ...r); };
  env.L.tc = (s, ...r) => { texts.push(String(s)); return tc0(s, ...r); };
  env.L.s = (hz, ...r) => { sounds.push(hz); return s0(hz, ...r); };
  env.L.mel = (n, ...r) => { melodies.push(Array.from(n)); return m0(n, ...r); };
  if (opts.store) Object.assign(env.store, opts.store);
  const f = compileGame(env.L, opts.names ? instrument(code, opts.names) : code);
  const I = env.I;
  const frame = (n = 1) => {
    for (let j = 0; j < n; j++) {
      I.T++; f(I);
      I.C = 0; I.A = 0; I.B = 0; I.S = 0; I.L = 0; I.R = 0; I.U = 0; I.D = 0;
    }
  };
  const tapAt = (x, y) => { I.x = x; I.y = y; I.C = 1; I.t = 1; frame(1); I.t = 0; };
  return {
    f, I, L: env.L, env, frame, tapAt, texts, sounds, melodies,
    dbg: () => f.dbg(),
    get clock() { return clock; }, set clock(v) { clock = v; },
    advance(sec) { clock += sec; },
    px: (x, y) => env.x.get(x, y),
    clearTexts() { texts.length = 0; }
  };
}

module.exports = { launchGame, instrument };
