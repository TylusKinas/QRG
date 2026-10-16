const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./helpers/load.js');
const api = loadCore();

const rnd = (n) => Math.floor(Math.random() * n);

test('min strips comments and indentation but keeps code', () => {
  const s = '// header\n  let a = 1;  \n/* block\n comment */\n\n  return i => { a++ };\n';
  assert.equal(api.min(s), 'let a=1;return i=>{a++};');
});

test('base43 round-trips random byte arrays (even and odd lengths)', () => {
  for (let n = 0; n < 60; n++) {
    const o = Array.from({ length: n }, () => rnd(256));
    assert.deepEqual(Array.from(api.d43(api.b43(o))), o);
  }
});

test('base43 output only uses URL-safe QR alphanumeric characters', () => {
  const o = Array.from({ length: 500 }, () => rnd(256));
  assert.match(api.b43(o), /^[0-9A-Z$*+\-./:]*$/);
});

test('d43 rejects a symbol outside the alphabet', () => {
  assert.throws(() => api.d43('AB!'), /bad symbol/);
});

test('pack/unpack round-trips text including non-ASCII and empty input', () => {
  for (const s of ['', 'a', 'return i=>{};', 'let š=1; // ž', 'x'.repeat(2000)]) {
    assert.equal(api.unpack(api.pack(s)), s);
  }
});

test('pack/unpack round-trips random printable strings', () => {
  for (let n = 0; n < 25; n++) {
    const s = Array.from({ length: rnd(400) }, () => String.fromCharCode(32 + rnd(95))).join('');
    assert.equal(api.unpack(api.pack(s)), s);
  }
});

test('every demo game round-trips through toPayload/fromPayload', () => {
  for (const g of api.GAMES) assert.equal(api.fromPayload(api.toPayload(g.code)), api.min(g.code), g.name);
});

test('wire format is frozen: a fixed program always encodes to the same payload', () => {
  // If this fails you changed PRIME, the CM model or the alphabet: every existing QR code would break.
  // When that is intentional, update the vector below and bump the hosting URL.
  const code = 'let x=1;\nreturn i=>{cls(NAVY);r(x,10,8,8,RED);x++};';
  assert.equal(api.toPayload(code), FROZEN);
});

test('payload stays within a sane budget for every demo (URL length <= 2900)', () => {
  for (const g of api.GAMES) assert.ok(api.toURL(g.code).length <= 2900, g.name + ' is ' + api.toURL(g.code).length);
});

test('payload contains only characters allowed in a URL fragment', () => {
  for (const g of api.GAMES) assert.match(api.toURL(g.code), /^https:\/\/[^#]+#[0-9A-Z$*+\-./:]*$/, g.name);
});

const FROZEN = 'P-08/P2*Q8.037Y9R8J:AYKFGNF*2E$BBM0';
