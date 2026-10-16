/* Security properties of the game sandbox: a game is untrusted code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadCore } = require('./helpers/load.js');
const build = require('../tools/build.js');

const api = loadCore();
const root = path.join(__dirname, '..');

test('the game document carries a Content-Security-Policy that blocks every network request', () => {
  const doc = api.buildGameDoc('return i=>{}');
  assert.match(doc, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'/);
  assert.ok(!/connect-src|img-src|frame-src|form-action|http:|https:/.test(api.CSP), 'no relaxations in the policy');
  assert.ok(!/https?:\/\//.test(doc), 'the document itself references no URL');
});

test('the sandbox never gets same-origin, popups, forms or top navigation', () => {
  for (const f of [...build.coreSource().split('\n'), ...build.uiSource().split('\n')]) {
    assert.ok(!/allow-same-origin|allow-popups|allow-forms|allow-top-navigation|allow-modals/.test(f), f.slice(0, 80));
  }
  const runner = fs.readFileSync(path.join(root, 'src/app/runner.js'), 'utf8');
  assert.ok(runner.includes("'allow-scripts'"));
  assert.equal((runner.match(/setAttribute\('sandbox'/g) || []).length, 1);
});

test('the unprotected mode is only reachable through an explicit user action', () => {
  const app = fs.readFileSync(path.join(root, 'src/app/app.js'), 'utf8');
  const uses = [...app.matchAll(/unsafe:\s*true/g)];
  assert.equal(uses.length, 1);
  assert.ok(/\$\('pu'\)\.onclick/.test(app.slice(app.indexOf('unsafe: true') - 200, app.indexOf('unsafe: true') + 20)), 'only inside the button handler');
  const html = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
  assert.ok(/id="pu"[^>]*>Run without protection/.test(html));
});

test('game code and saved values cannot close the script element or inject HTML', () => {
  const evil = "</script><script>alert(1)</script><!--";
  const doc = api.buildGameDoc(evil, { sv: { k: evil } });
  assert.equal((doc.match(/<\/script/gi) || []).length, 1, 'only the real closing tag');
  assert.equal((doc.match(/<script/gi) || []).length, 1);
  // and the embedded data still means exactly what it said
  const m = doc.match(/\)\((".*?[^\\]"),(\{.*\})\)<\/script>/s);
  assert.ok(m);
  assert.equal(JSON.parse(m[1]), evil);
});

test('a hostile payload cannot hang or crash the decoder', () => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
  let rs = 1;
  const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
  const t0 = Date.now();
  for (let n = 0; n < 60; n++) {
    const s = Array.from({ length: rnd(400) }, () => alphabet[rnd(43)]).join('');
    let out;
    try { out = api.fromPayload(s); } catch (e) { out = ''; }
    assert.ok(out.length <= 9001, 'bounded output');
  }
  assert.ok(Date.now() - t0 < 20000, 'finished in reasonable time');
  assert.throws(() => api.fromPayload('abc'), /bad symbol/);
});

test('hash payloads of the right shape but wrong content simply decode to something harmless', () => {
  // The decoded text is only ever compiled inside the sandbox; here we just check it is a string.
  assert.equal(typeof api.fromPayload('A'.repeat(300)), 'string');
});

/* ------------------------------------------------------------------ the parent-side runner */

function loadRunner(localStorage) {
  const ctx = vm.createContext({ console, TextEncoder, TextDecoder, Math, Date, JSON, Object, Array, Number, String, Promise, setTimeout, clearTimeout, Map, Error, localStorage });
  const messages = [];
  ctx.addEventListener = (t, f) => { if (t === 'message') messages.push(f); };
  ctx.window = ctx;
  vm.runInContext(build.coreSource() + '\n' + fs.readFileSync(path.join(root, 'src/app/runner.js'), 'utf8') + ';this.__R = Runner', ctx);
  return { Runner: ctx.__R, ctx, messages };
}
function fakeStorage(limit) {
  const m = new Map();
  return {
    get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => { if (limit && m.size >= limit && !m.has(k)) throw new Error('quota'); m.set(k, String(v)); }, removeItem: k => m.delete(k), _m: m
  };
}

test('runner storage: namespaced per game, size and count limits, bad keys rejected', () => {
  const ls = fakeStorage();
  const { Runner } = loadRunner(ls);
  const gid = Runner.gameId('return i=>{}'), other = Runner.gameId('return i=>{cls(1)}');
  assert.notEqual(gid, other);
  Runner.store.set(gid, 'best', 42);
  Runner.store.set(gid, 'obj', { a: [1, 2, 3] });
  assert.deepEqual(JSON.parse(JSON.stringify(Runner.store.all(gid))), { best: 42, obj: { a: [1, 2, 3] } });
  assert.deepEqual(Object.keys(Runner.store.all(other)), [], 'another game sees nothing');
  Runner.store.set(gid, 'big', 'x'.repeat(1600));
  assert.equal(Runner.store.all(gid).big, undefined, 'values over 1500 bytes are refused');
  Runner.store.set(gid, '', 1); Runner.store.set(gid, 'k'.repeat(41), 1); Runner.store.set(gid, 5, 1);
  assert.deepEqual(Object.keys(Runner.store.all(gid)).sort(), ['best', 'obj']);
  for (let n = 0; n < 40; n++) Runner.store.set(gid, 'key' + n, n);
  assert.ok(Object.keys(Runner.store.all(gid)).length <= 32, 'at most 32 keys');
  Runner.store.set(gid, 'best', undefined);
  assert.equal(Runner.store.all(gid).best, undefined, 'undefined removes a key');
  for (const k of ls._m.keys()) assert.ok(k.startsWith('qrg:g:'), 'every key is namespaced: ' + k);
});

test('runner storage survives a broken or full localStorage', () => {
  const { Runner } = loadRunner({ get length() { throw new Error('blocked'); }, key() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } });
  assert.doesNotThrow(() => Runner.store.set('g', 'k', 1));
  assert.deepEqual(Object.keys(Runner.store.all('g')), []);
  const full = loadRunner(fakeStorage(2)).Runner;
  assert.doesNotThrow(() => { for (let n = 0; n < 10; n++) full.store.set('g', 'k' + n, n); });
});

test('runner: messages are accepted only from the frame that was started, and unknown messages are ignored', () => {
  const ls = fakeStorage();
  const { Runner, ctx, messages } = loadRunner(ls);
  const win = {}, frame = { contentWindow: win, setAttribute() {}, removeAttribute() {}, srcdoc: '' };
  let ready = 0, err = '';
  Runner.run(frame, 'return i=>{}', { onready: () => ready++, onerr: m => { err = m; } });
  const gid = Runner.gameId('return i=>{}'), deliver = (source, data) => messages.forEach(f => f({ source, data }));
  deliver({}, { q: 'save', k: 'x', v: 1 });                                  // some other window
  assert.deepEqual(Object.keys(Runner.store.all(gid)), []);
  deliver(win, { q: 'save', k: 'x', v: 1 });
  assert.equal(Runner.store.all(gid).x, 1);
  deliver(win, { q: 'ready' });
  assert.equal(ready, 1);
  deliver(win, { q: 'err', m: 'e'.repeat(1000) });
  assert.equal(err.length, 400);
  deliver(win, 'a string'); deliver(win, null); deliver(win, { q: 'unknown' });
  deliver(win, { q: 'probe', k: 'COOKIES', v: 'BLOCKED', extra: 'x'.repeat(1e5) });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.__probes)), [{ k: 'COOKIES', v: 'BLOCKED' }]);
});

test('runner: a game gets the sandbox attribute unless the user chose unsafe mode', () => {
  const { Runner } = loadRunner(fakeStorage());
  const attrs = {};
  const frame = { contentWindow: {}, setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: k => { delete attrs[k]; }, srcdoc: '' };
  Runner.run(frame, 'return i=>{}');
  assert.equal(attrs.sandbox, 'allow-scripts');
  assert.match(frame.srcdoc, /Content-Security-Policy/);
  Runner.run(frame, 'return i=>{}', { unsafe: true });
  assert.equal(attrs.sandbox, undefined);
  Runner.run(frame, 'return i=>{}');
  assert.equal(attrs.sandbox, 'allow-scripts');
  Runner.stop(frame);
  assert.equal(frame.srcdoc, '');
});

test('runner: saved values are injected into the game document', () => {
  const ls = fakeStorage();
  const { Runner } = loadRunner(ls);
  const gid = Runner.gameId('return i=>{}');
  Runner.store.set(gid, 'best', 77);
  const frame = { contentWindow: {}, setAttribute() {}, removeAttribute() {}, srcdoc: '' };
  Runner.run(frame, 'return i=>{}');
  assert.ok(frame.srcdoc.includes('"sv":{"best":77}'));
});
