const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./helpers/load.js');
const { decode } = require('./helpers/qrimage.js');
const api = loadCore();

const A43 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
const PREFIX = Array.from(new TextEncoder().encode('https://animuok.lt/APPS/G/#'));
const text = n => Array.from({ length: n }, (_, i) => A43[(i * 7 + 3) % 43]).join('');
const segs = n => [['b', PREFIX], ['a', text(n)]];

const versionOf = n => { try { return api.QR(segs(n)).v; } catch (e) { return 41; } };

/* smallest alphanumeric length that needs at least version v (binary search; the version never shrinks as n grows) */
function minLen(v) {
  let lo = 0, hi = 4400;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (versionOf(mid) >= v) hi = mid; else lo = mid + 1; }
  return lo;
}

test('QR encodes and decodes (jsQR) at the edges of many versions', { timeout: 900000 }, () => {
  let tested = 0;
  for (const v of [3, 4, 5, 6, 7, 8, 10, 14, 15, 20, 25, 32, 35, 40]) {
    const lo = minLen(v), hi = minLen(v + 1) - 1;
    if (versionOf(lo) !== v) continue;                  // version skipped by the byte prefix
    for (const n of [lo, hi]) {
      const q = api.QR(segs(n));
      assert.equal(q.v, v);
      assert.equal(decode(q), 'https://animuok.lt/APPS/G/#' + text(n), 'v' + v + ' n=' + n);
    }
    tested++;
  }
  assert.ok(tested >= 12, 'tested ' + tested + ' versions');
});

test('small versions 1-2 work with a pure alphanumeric segment', () => {
  for (const n of [1, 10, 25, 26, 47]) {
    const q = api.QR([['a', text(n)]]);
    assert.ok(q.v <= 2, 'n=' + n + ' v' + q.v);
    assert.equal(decode(q), text(n));
  }
});

test('QR matrix has the right size and finder patterns', () => {
  const q = api.QR(segs(40));
  assert.equal(q.size, q.v * 4 + 17);
  for (const [x, y] of [[0, 0], [q.size - 7, 0], [0, q.size - 7]]) {
    assert.equal(q.M[y][x], 1);
    assert.equal(q.M[y + 3][x + 3], 1);
    assert.equal(q.M[y + 1][x + 1], 0);
  }
});

test('QR refuses a payload that does not fit in version 40', () => {
  assert.throws(() => api.QR(segs(4400)), /too large/);
});

test('odd and even alphanumeric lengths both work', () => {
  for (const n of [1, 2, 3, 50, 51]) assert.equal(decode(api.QR(segs(n))), 'https://animuok.lt/APPS/G/#' + text(n));
});

test('every demo game QR decodes back to the same URL', { timeout: 300000 }, () => {
  for (const g of api.GAMES) {
    const u = api.toURL(g.code);
    assert.equal(decode(api.QR(api.urlSegs(u))), u, g.name);
  }
});
