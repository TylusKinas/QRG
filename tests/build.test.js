/* The files that get uploaded (dist/): up to date, valid, self-contained. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const build = require('../tools/build.js');
const manifest = require('../tools/manifest.js');
const { renderPhp } = require('./helpers/load.js');

const root = path.join(__dirname, '..');
const disk = f => fs.readFileSync(path.join(root, f));
const e = disk('dist/e.html').toString('utf8');
const index = renderPhp(disk('dist/index.php').toString('utf8'), { extras: true });

test('every generated file in dist/ is up to date with the sources (run: npm run build)', () => {
  for (const [f, data] of Object.entries(build.outputs())) {
    assert.ok(disk(f).equals(Buffer.isBuffer(data) ? data : Buffer.from(data)), f + ' is stale');
  }
});

test('nothing else is hiding in dist/ (no leftovers from old builds)', () => {
  const expected = new Set(Object.keys(build.outputs()));
  const found = [];
  const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).forEach(x => x.isDirectory() ? walk(d + '/' + x.name) : found.push(d + '/' + x.name));
  walk('dist');
  assert.deepEqual(found.sort(), [...expected].sort());
});

test('every script in both pages parses', () => {
  for (const html of [e, index]) {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert.equal(scripts.length, 2);
    for (const s of scripts) assert.doesNotThrow(() => new vm.Script(s));
  }
});

test('every id a page script asks for exists in that page', () => {
  const pages = [[e, build.uiSource()], [index, build.liteUiSource()]];
  const created = new Set(['spp', 'sppg']);                                 // made by the UI itself
  for (const [html, ui] of pages) {
    const markup = html.slice(0, html.indexOf('<script>'));
    for (const id of new Set([...ui.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]))) {
      if (!created.has(id)) assert.ok(markup.includes('id="' + id + '"'), 'missing #' + id);
    }
  }
});

test('element ids are unique in each page', () => {
  for (const html of [e, index]) {
    const markup = html.slice(0, html.indexOf('<script>'));
    const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
  }
});

test('the pages are self-contained: only same-folder links, no external scripts, styles, fonts or images', () => {
  for (const html of [e, index]) {
    assert.ok(!/<script[^>]+src=/i.test(html));
    assert.ok(!/@import|url\(\s*['"]?https?:/i.test(html));
    assert.ok(!/<img[^>]+src=/i.test(html));
    for (const m of html.matchAll(/<link[^>]+href="([^"]+)"/g)) assert.ok(!/^(https?:)?\/\//.test(m[1]), m[1]);
  }
});

test('the source never uses network APIs or dynamic code loading outside the game compiler', () => {
  const files = [...manifest.full.core, ...manifest.full.ui, ...manifest.lite.core, ...manifest.lite.ui].filter(f => f !== 'src/app/reader.js');
  for (const f of new Set(files)) {
    const src = fs.readFileSync(path.join(root, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|importScripts|EventSource)\b/.test(src), f + ' uses a network API');
    assert.ok(!/\beval\s*\(/.test(src), f + ' uses eval');
    assert.ok(!/document\.write|\.innerHTML\s*=\s*[^'"\s]/.test(src.replace(/innerHTML\s*=\s*''/g, '')), f + ' writes HTML from data');
  }
});

test('the reader loads only its own vendored scanner, from this folder', () => {
  const src = fs.readFileSync(path.join(root, 'src/app/reader.js'), 'utf8');
  assert.deepEqual([...src.matchAll(/\.src\s*=\s*'([^']+)'/g)].map(m => m[1]), ['vendor/jsQR.js']);
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/.test(src));
});

test('size budgets: the player stays small, the extras stay under 250 KB', () => {
  assert.ok(disk('dist/index.php').length < 60 * 1024, 'player ' + disk('dist/index.php').length);
  assert.ok(disk('dist/e.html').length < 250 * 1024, 'extras ' + disk('dist/e.html').length);
});

test('all games and the games directory agree', () => {
  const files = fs.readdirSync(path.join(root, 'games')).filter(f => /^\d+-.+\.js$/.test(f));
  assert.equal(build.loadGames().length, files.length);
});
