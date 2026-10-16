/* The player (index.php) and the PWA files. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const build = require('../tools/build.js');
const manifest = require('../tools/manifest.js');
const { renderPhp, loadCore } = require('./helpers/load.js');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const php = read('dist/index.php');

test('the PHP is only the extras check: three tiny constructs, nothing else', () => {
  const blocks = [...php.matchAll(/<\?[\s\S]*?\?>/g)].map(m => m[0].replace(/\s+/g, ' ').trim());
  assert.deepEqual(blocks, [
    "<?php // QRG player. The only PHP on this page: show a link to the extras (e.html) when that file sits next to this one. $extras = is_file(__DIR__ . '/e.html'); ?>",
    '<?php if ($extras): ?>',
    '<?php endif; ?>'
  ]);
  assert.ok(!/<\?(?!php)/.test(php), 'no short open tags');
  assert.ok(!/\$_(GET|POST|REQUEST|SERVER|COOKIE|FILES)|include|require|eval|system|exec|shell_exec|file_get_contents|fopen/.test(php.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<script>[\s\S]*?<\/script>/g, '')),
    'the PHP part has no input handling or file access');
  assert.ok(php.length < 60 * 1024);
});

test('with e.html present the player shows a link to it; without, it does not', () => {
  const with_ = renderPhp(php, { extras: true }), without = renderPhp(php, { extras: false });
  assert.ok(!/<\?/.test(with_) && !/<\?/.test(without), 'all PHP is gone after rendering');
  assert.match(with_, /<a id="more" class="b pri" href="e.html">/);
  assert.ok(!/id="more"/.test(without));
  assert.ok(with_.replace(/\s+/g, ' ').includes('<main id="play"'));
  for (const html of [with_, without]) assert.ok(html.trimStart().startsWith('<!doctype html>'), 'the page starts with the doctype (no stray output before it)');
});

test('the intro says what QRG is, briefly and clearly', () => {
  const html = renderPhp(php, { extras: false });
  const intro = html.slice(html.indexOf('<main id="intro"'), html.indexOf('</main>'));
  assert.match(intro, /QRG/);
  assert.match(intro, /QR CODE GAME ENGINE/);
  assert.match(intro, /scan a QRG code with your phone camera/i);
  const words = intro.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(words < 80, 'short: ' + words + ' words');
});

test('the player carries no editor, reader, QR encoder, library or docs code', () => {
  for (const marker of ['VisualEditor', 'CodeEditor', 'const Reader', 'function QR(', 'LIBDOC', 'GAMES', 'vcompile', 'jsQR', 'SOUNDS']) {
    assert.ok(!php.includes(marker), 'player must not contain ' + marker);
  }
});

test('the player decodes and runs a game from the URL fragment with the lite scripts alone', () => {
  const full = loadCore();
  const code = full.GAMES.find(g => g.name === 'Pong').code;
  const payload = full.toPayload(code);
  const ctx = vm.createContext({ console, TextEncoder, TextDecoder, Math, Date, JSON, Object, Array, Number, String, Promise, setTimeout, clearTimeout, Error, Map });
  vm.runInContext(build.liteCoreSource(), ctx);
  assert.equal(vm.runInContext('gameFromText(' + JSON.stringify('#' + payload) + ')', ctx), full.min(code));
  assert.equal(vm.runInContext('gameFromText("#NOTAGAME")', ctx), null);
  assert.equal(vm.runInContext('typeof buildGameDoc', ctx), 'function');
  assert.equal(vm.runInContext('typeof QR', ctx), 'undefined');
});

test('storage keys are the same in the player and the extras (progress is shared)', () => {
  const code = 'let a = 1;\n// comment\nreturn i => { cls(1) };';
  const ids = [];
  for (const files of [build.liteCoreSource() + build.liteUiSource(), build.coreSource() + build.uiSource()]) {
    const ctx = vm.createContext({ console, TextEncoder, TextDecoder, Math, Date, JSON, Object, Array, Number, String, Promise, setTimeout, clearTimeout, Error, Map, localStorage: {}, addEventListener() {}, window: {}, document: { getElementById: () => ({ classList: { toggle() {}, add() {}, remove() {} }, onclick: null, addEventListener() {}, style: {} }), querySelectorAll: () => [], createElement: () => ({ getContext: () => ({}), style: {}, append() {} }), addEventListener() {}, body: { classList: { toggle() {} } }, head: {} }, location: { hash: '', protocol: 'file:' }, navigator: {} });
    try { vm.runInContext(files.replace(/\/\* ===== boot[\s\S]*$/, ''), ctx); } catch (e) { /* UI wiring needs a real DOM; the Runner is defined before it runs */ }
    ids.push(vm.runInContext('Runner.gameId(' + JSON.stringify(code) + ')', ctx));
  }
  assert.equal(ids[0], ids[1]);
  assert.ok(ids[0].length > 3);
});

/* ------------------------------------------------------------------ PWA */

test('manifest: valid, installable fields, icons that exist', () => {
  const m = JSON.parse(read('dist/manifest.webmanifest'));
  assert.equal(m.short_name, 'QRG');
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, './');
  assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
  for (const need of [192, 512]) assert.ok(m.icons.some(i => i.sizes === need + 'x' + need && i.type === 'image/png'), 'icon ' + need);
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(root, 'dist', i.src)), i.src);
});

test('icons are real PNG files of the right size, and not blank', () => {
  for (const [f, size] of Object.entries(manifest.pwa.icons)) {
    const b = fs.readFileSync(path.join(root, f));
    assert.deepEqual([...b.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(b.readUInt32BE(16), size);
    assert.equal(b.readUInt32BE(20), size);
    // inflate the image data: there must be at least three different colors (background, white, yellow)
    let pos = 8, idat = [];
    while (pos < b.length) { const len = b.readUInt32BE(pos), type = b.toString('latin1', pos + 4, pos + 8); if (type === 'IDAT') idat.push(b.subarray(pos + 8, pos + 8 + len)); pos += 12 + len; }
    const raw = zlib.inflateSync(Buffer.concat(idat)), colors = new Set();
    for (let y = 0; y < size; y += 7) for (let x = 0; x < size; x += 7) { const o = y * (size * 3 + 1) + 1 + x * 3; colors.add(raw[o] + ',' + raw[o + 1] + ',' + raw[o + 2]); }
    assert.ok(colors.size >= 3, f + ' has ' + colors.size + ' colors');
  }
});

test('both pages link the manifest and an icon, and register the service worker', () => {
  for (const f of ['dist/index.php', 'dist/e.html']) {
    const html = read(f);
    assert.ok(html.includes('<link rel="manifest" href="manifest.webmanifest">'), f);
    assert.ok(html.includes('rel="icon"') && html.includes('rel="apple-touch-icon"'), f);
    assert.ok(html.includes("serviceWorker.register('sw.js')"), f);
    assert.ok(html.includes('name="viewport"') && html.includes('name="theme-color"'), f);
  }
});

test('service worker: valid JavaScript, versioned cache, cache first (opens instantly), tolerates missing files', () => {
  const sw = read('dist/sw.js');
  assert.doesNotThrow(() => new vm.Script(sw));
  assert.match(sw, /const CACHE = 'qrg-[0-9a-f]{10}';/);
  assert.ok(!sw.includes('@HASH@') && !sw.includes('@FILES@'));
  const files = JSON.parse(sw.match(/const FILES = (\[.*\]);/)[1]);
  assert.deepEqual(files, manifest.pwa.cache);
  assert.ok(sw.includes('.catch(() => {})'), 'a missing optional file must not fail the install');
  assert.ok(sw.includes("req.method !== 'GET'") && sw.includes('url.origin !== location.origin'), 'only same-origin GETs are handled');
  // the cache name changes when a page changes
  assert.notEqual(build.swSource('aaaaaaaaaa'), build.swSource('bbbbbbbbbb'));
});

test('service worker: behaves (install caches, old caches removed, offline falls back to the cache)', async () => {
  const sw = read('dist/sw.js');
  const handlers = {}, store = new Map(), added = [], deleted = [];
  const cacheApi = {
    open: async () => ({ add: async r => { const f = r.url; if (f === 'e.html') throw new Error('404'); added.push(f); }, put: async (r, res) => { store.set(r.url, res); } }),
    keys: async () => ['qrg-old', 'qrg-' + sw.match(/qrg-([0-9a-f]{10})/)[1]],
    delete: async k => { deleted.push(k); },
    match: async req => store.get(typeof req === 'string' ? 'https://h/' : req.url)
  };
  const self = { addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting() {}, clients: { claim() {} }, location: { origin: 'https://h' } };
  const ctx = vm.createContext({ self, caches: cacheApi, URL, Request: class { constructor(u, o) { this.url = u; this.opt = o; } }, fetch: async () => { throw new Error('network must not be needed'); }, location: { origin: 'https://h' }, Promise });
  vm.runInContext(sw, ctx);
  let p;
  handlers.install({ waitUntil: x => { p = x; } }); await p;
  assert.ok(added.includes('index.php') && !added.includes('e.html'), 'install survived the missing e.html');
  handlers.activate({ waitUntil: x => { p = x; } }); await p;
  assert.deepEqual(deleted, ['qrg-old']);
  store.set('https://h/', 'CACHED-HOME');
  let answer;
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://h/index.php#x' }, respondWith: x => { answer = x; } });
  assert.equal(await answer, 'CACHED-HOME', 'served from the cache, the network is never touched');
  let other = 'untouched';
  handlers.fetch({ request: { method: 'GET', url: 'https://elsewhere/x' }, respondWith: () => { other = 'handled'; } });
  handlers.fetch({ request: { method: 'POST', url: 'https://h/x' }, respondWith: () => { other = 'handled'; } });
  assert.equal(other, 'untouched', 'cross-origin and non-GET requests are left alone');
});

test('vendor scanner: the shipped jsQR works and its license travels with it', () => {
  const code = read('dist/vendor/jsQR.js');
  assert.match(read('dist/vendor/jsQR.LICENSE.txt'), /Apache License/);
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(code, sandbox);
  const jsQR = sandbox.module.exports.default || sandbox.module.exports;
  const full = loadCore();
  const u = full.toURL('return i=>{cls(1)}'), q = full.QR(full.urlSegs(u));
  const { render } = require('./helpers/qrimage.js');
  const { data, n } = render(q, 3);
  const r = jsQR(new Uint8ClampedArray(data), n, n);
  assert.equal(r.data, u);
});
