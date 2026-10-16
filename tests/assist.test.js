/* The code editor's brains: suggestions, signature help, things under the cursor, sound effects. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, makeEnv } = require('./helpers/load.js');

const api = loadCore();
const arr = a => Array.from(a);
const at = (text, marker) => { const i = text.indexOf(marker); return i < 0 ? text.length : i; };

test('wordAt finds the word the caret is in or after', () => {
  const t = 'let score = circ(10)';
  assert.deepEqual({ ...api.wordAt(t, 7) }, { word: 'sco', full: 'score', start: 4, end: 9 });
  assert.equal(api.wordAt(t, 0).word, '');
  assert.equal(api.wordAt(t, t.length).word, '');
  assert.equal(api.wordAt(t, 19).full, '10');
});

test('completions: library first, then your own words, then JavaScript words', () => {
  const c = arr(api.completions('ci', 'let cixx = 1; const cita = 2'));
  assert.equal(c[0], 'circ');
  assert.ok(c.includes('cixx') && c.includes('cita'));
  assert.ok(c.indexOf('circ') < c.indexOf('cixx'));
  assert.ok(arr(api.completions('ret', '')).includes('return'));
  assert.ok(arr(api.completions('fl', '')).includes('flip') && arr(api.completions('fl', '')).includes('flood'));
});

test('completions: needs two letters, ignores numbers, never suggests what is already typed, is capped', () => {
  assert.deepEqual(arr(api.completions('c', '')), []);
  assert.deepEqual(arr(api.completions('', '')), []);
  assert.deepEqual(arr(api.completions('12', 'x')), []);
  assert.ok(!arr(api.completions('circ', '')).includes('circ'));
  assert.ok(api.completions('s', '', 3).length === 0 && api.completions('sh', '', 3).length <= 3);
  assert.ok(arr(api.completions('RE', '')).includes('RED'), 'case-insensitive');
  assert.ok(api.completions('ra', '', 2).length <= 2);
});

test('completionText adds a bracket to functions only', () => {
  assert.equal(api.completionText('circ'), 'circ(');
  assert.equal(api.completionText('R'), 'R(');
  assert.equal(api.completionText('RED'), 'RED');
  assert.equal(api.completionText('W'), 'W');
  assert.equal(api.completionText('SP'), 'SP');
  assert.equal(api.completionText('myVariable'), 'myVariable');
});

test('callAt finds the innermost open call and the argument being typed', () => {
  assert.deepEqual({ ...api.callAt('r(1, 2, ', 8) }, { name: 'r', arg: 2 });
  assert.deepEqual({ ...api.callAt('r(1, f(2, 3), ', 14) }, { name: 'r', arg: 2 });
  assert.deepEqual({ ...api.callAt('r(1, f(2, 3', 11) }, { name: 'f', arg: 1 });
  assert.deepEqual({ ...api.callAt('d([1, 2, 3], ', 13) }, { name: 'd', arg: 1 });
  assert.equal(api.callAt('r(1, 2); ', 9), null);
  assert.equal(api.callAt('let a = 1', 9), null);
  assert.equal(api.callAt('if (x) { ', 9), null, 'a block is not a call');
  assert.equal(api.callAt('(1 + 2', 6), null, 'a bracket without a name');
});

test('signatureAt shows the library signature with the current argument in brackets', () => {
  const s = api.signatureAt('circ(10, 20, ', 13);
  assert.equal(s.text, 'circ(x, y, [radius], k)');
  assert.match(s.desc, /Filled circle/);
  assert.equal(api.signatureAt('circ(', 5).text, 'circ([x], y, radius, k)');
  assert.equal(api.signatureAt('t(', 2).name, 't');
  assert.equal(api.signatureAt('myFunction(1, ', 14), null);
  assert.equal(api.signatureAt('nothing here', 5), null);
});

test('signatureAt knows every documented function', () => {
  for (const e of api.LIBDOC.filter(x => !x.hide && /^\w+\(/.test(x.s))) {
    const name = e.s.slice(0, e.s.indexOf('('));
    const sig = api.signatureAt(name + '(', name.length + 1);
    assert.ok(sig && sig.text.startsWith(name + '('), name);
  }
});

test('spriteAt: an 8-number array, an icon name in quotes, SP.name', () => {
  const t = "d([60, 126, 255, 255, 126, 102, 102, 0], x, y, WHITE);\nd('heart', 4, 4, RED);\nd(SP.star, 1, 1, YELLOW);";
  const a = api.spriteAt(t, 10);
  assert.equal(a.form, 'bytes');
  assert.deepEqual(arr(a.bytes), [60, 126, 255, 255, 126, 102, 102, 0]);
  assert.equal(t.slice(a.start, a.end), '[60, 126, 255, 255, 126, 102, 102, 0]');
  const n = api.spriteAt(t, at(t, 'heart') + 2);
  assert.equal(n.form, 'name'); assert.equal(n.name, 'heart');
  assert.equal(t.slice(n.start, n.end), "'heart'");
  assert.deepEqual(arr(n.bytes), arr(api.SP.heart));
  const s = api.spriteAt(t, at(t, 'SP.star') + 4);
  assert.equal(s.form, 'sp'); assert.equal(t.slice(s.start, s.end), 'SP.star');
  assert.equal(api.spriteAt(t, 0), null);
  assert.equal(api.spriteAt(t, at(t, 'x, y') + 2), null);
});

test('spriteAt ignores arrays that are not sprites and unknown icon names', () => {
  assert.equal(api.spriteAt('f([1, 2, 3])', 4), null);
  assert.equal(api.spriteAt('f([1, 2, 3, 4, 5, 6, 7, 300])', 4), null, 'a byte cannot be 300');
  assert.equal(api.spriteAt("t('hello', 1, 1)", 5), null);
  assert.equal(api.spriteAt('f([1,2,3,4,5,6,7,8,9])', 4), null, 'nine numbers');
});

test('colorAt: a color constant under the caret', () => {
  const t = 'r(1, 2, 3, 4, RED); cls(NAVY);';
  const c = api.colorAt(t, at(t, 'RED') + 1);
  assert.equal(c.index, 8); assert.equal(t.slice(c.start, c.end), 'RED');
  assert.equal(api.colorAt(t, at(t, 'NAVY') + 4).index, 1);
  assert.equal(api.colorAt('REDDISH', 2), null);
  assert.equal(api.colorAt('r(1)', 1), null);
});

test('soundAt: s(...) and mel([...]) with optional length and wave', () => {
  const t = "s(600);\ns(440, 100, 'sine');\nmel([523, 659, 784], 120);\nmel([100], 50, \"triangle\");";
  const a = api.soundAt(t, 3);
  assert.deepEqual({ fn: a.fn, notes: arr(a.notes), ms: a.ms, wave: a.wave }, { fn: 's', notes: [600], ms: 70, wave: 'square' });
  assert.equal(t.slice(a.start, a.end), 's(600)');
  const b = api.soundAt(t, at(t, 's(440') + 3);
  assert.deepEqual({ notes: arr(b.notes), ms: b.ms, wave: b.wave }, { notes: [440], ms: 100, wave: 'sine' });
  const m = api.soundAt(t, at(t, 'mel([523') + 6);
  assert.deepEqual({ fn: m.fn, notes: arr(m.notes), ms: m.ms }, { fn: 'mel', notes: [523, 659, 784], ms: 120 });
  assert.equal(api.soundAt(t, at(t, 'mel([100')).wave, 'triangle');
  assert.equal(api.soundAt(t, t.length), null);
  assert.equal(api.soundAt('has(1)', 4), null, 'a longer name ending in s is not s()');
});

test('sound code round-trips: what soundCode prints, soundAt reads back', () => {
  for (const [notes, ms, wave] of [[[600], 70, 'square'], [[600], 120, 'square'], [[440], 70, 'sine'], [[523, 659, 784], 120, 'square'], [[200, 0, 300], 90, 'sawtooth']]) {
    const code = api.soundCode(notes, ms, wave), r = api.soundAt(code, 2);
    assert.deepEqual({ notes: arr(r.notes), ms: r.ms, wave: r.wave }, { notes, ms, wave }, code);
    assert.equal(r.start, 0); assert.equal(r.end, code.length);
  }
  assert.equal(api.soundCode([600], 70, 'square'), 's(600)');
  assert.equal(api.soundCode([523, 659], 100, 'square'), 'mel([523, 659], 100)');
});

test('every ready-made sound has a name, parses back, and plays without errors', () => {
  const names = new Set();
  for (const s of api.SOUNDS) {
    assert.ok(s.name && !names.has(s.name)); names.add(s.name);
    const r = api.soundAt(s.code, 1);
    assert.deepEqual(arr(r.notes), arr(s.notes), s.name);
    assert.equal(r.ms, s.ms); assert.equal(r.wave, s.wave);
    assert.ok(s.notes.every(n => n >= 0 && n <= 4000) && s.ms >= 20 && s.ms <= 500);
    const { L } = makeEnv(api);
    assert.doesNotThrow(() => new Function('L', 'with(L){' + s.code + '}')(L), s.name);
  }
  assert.ok(api.SOUNDS.length >= 8);
});

test('contextAt prefers a sprite, then a sound, then a color', () => {
  const t = "d('heart', 1, 1, RED);\ns(500);";
  assert.equal(api.contextAt(t, 5).kind, 'sprite');
  assert.equal(api.contextAt(t, at(t, 'RED') + 1).kind, 'color');
  assert.equal(api.contextAt(t, at(t, 's(500') + 2).kind, 'sound');
  assert.equal(api.contextAt(t, at(t, '1, 1')), null);
});

test('the starter program teaches: it is commented, short, and runs', () => {
  const lines = api.STARTER.split('\n'), comments = lines.filter(l => /\/\//.test(l)).length;
  assert.ok(comments >= 15, 'comment lines: ' + comments);
  assert.ok(api.min(api.STARTER).length < 600, 'tiny once minified: ' + api.min(api.STARTER).length);
  assert.ok(lines.length < 60);
  const { L, I, x } = makeEnv(api);
  const f = new Function('L', 'with(L){' + api.STARTER + '\n}')(L);
  I.l = 1; I.A = 1; I.T = 1; f(I); f(I);
  assert.ok(x.drawn() > 1000);
  for (const word of ['i.l', 'i.A', 'cls', 'r(', 't(', 's(', 'return']) assert.ok(api.STARTER.includes(word), word);
});
