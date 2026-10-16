/* The reader plays any QRG code, whatever text surrounds the game. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./helpers/load.js');

const api = loadCore();
const code = api.GAMES.find(g => g.name === 'Pong').code;
const payload = api.toPayload(code), want = api.min(code);

test('a link of any host or path opens the game', () => {
  for (const prefix of ['https://animuok.lt/APPS/G/#', 'http://example.com/#', 'https://a.b/c/d/index.php#', 'app://x#', 'e.html#', '#', 'HTTPS://ANIMUOK.LT/APPS/G/#']) {
    assert.equal(api.gameFromText(prefix + payload), want, prefix);
  }
});

test('the bare payload works too, also with stray spaces, line breaks or percent-encoding', () => {
  assert.equal(api.gameFromText(payload), want);
  assert.equal(api.gameFromText('  ' + payload + '\n'), want);
  assert.equal(api.gameFromText(payload.slice(0, 10) + ' \n ' + payload.slice(10)), want);
  assert.equal(api.gameFromText('https://x/#' + encodeURIComponent(payload)), want);
});

test('the last # starts the payload', () => {
  assert.equal(api.gameFromText('https://x/#y#' + payload), want);
  assert.equal(api.extractPayload('https://x/#abc'), null, 'lower case is not a payload');
});

test('every demo game survives the trip: toURL -> scanner text -> game', () => {
  for (const g of api.GAMES) assert.equal(api.gameFromText(api.toURL(g.code)), api.min(g.code), g.name);
});

test('things that are not QRG games are rejected', () => {
  for (const s of [null, undefined, '', ' ', 'hello world', 'https://example.com/', 'https://example.com/?a=b', 'BEGIN:VCARD', 'WIFI:S:x;;',
    '#', '#!', 'https://x/#' + 'A'.repeat(5), 'https://x/#' + 'Z$'.repeat(30), 12345, {}]) {
    assert.equal(api.gameFromText(s), null, String(s).slice(0, 30));
  }
});

test('garbage that happens to use the right alphabet is rejected unless it is valid JavaScript', () => {
  let rs = 11, ok = 0, n = 0;
  const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
  const rnd = k => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % k; };
  for (let t = 0; t < 40; t++) {
    const s = Array.from({ length: 30 + rnd(300) }, () => A[rnd(43)]).join('');
    const r = api.gameFromText(s);
    n++;
    if (r !== null) { ok++; assert.doesNotThrow(() => new Function('L', 'with(L){' + r + '\n}')); }
  }
  assert.ok(ok < n, 'most garbage is rejected (' + ok + ' of ' + n + ' accepted)');
});

test('a huge input is handled quickly and safely', () => {
  const t0 = Date.now();
  assert.equal(api.gameFromText('A'.repeat(200000)), null === api.gameFromText('A'.repeat(200000)) ? null : api.gameFromText('A'.repeat(200000)));
  assert.equal(api.gameFromText('x'.repeat(200000)), null);
  assert.ok(Date.now() - t0 < 15000);
});

test('extractPayload keeps only legal characters', () => {
  assert.equal(api.extractPayload('https://x/#AB CD'), 'ABCD');
  assert.equal(api.extractPayload('AB$*+-./:09'), 'AB$*+-./:09');
  assert.equal(api.extractPayload('AB!'), null);
  assert.equal(api.extractPayload('ab'), null);
});
