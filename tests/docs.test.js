/* The documentation is generated from the source: it must be complete and up to date. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadCore, makeEnv } = require('./helpers/load.js');
const docs = require('../tools/docs.js');

const api = loadCore();
const root = path.join(__dirname, '..');

test('every library member is documented, and every documented name exists', () => {
  const members = Object.keys(makeEnv(api).L).sort();
  const documented = [...api.LIBNAMES].sort();
  assert.deepEqual(documented, members);
});

test('no name is documented twice and every entry is well formed', () => {
  const seen = new Set();
  for (const e of api.LIBDOC) {
    assert.ok(e.g && e.s && e.d && Array.isArray(e.n) && e.n.length, JSON.stringify(e));
    for (const n of e.n) { assert.ok(!seen.has(n), 'duplicate ' + n); seen.add(n); }
  }
});

test('documentation examples are valid JavaScript', () => {
  for (const e of api.LIBDOC.filter(x => x.e)) assert.doesNotThrow(() => new Function(e.e), e.e);
});

test('docs/LANGUAGE.md and docs/VISUAL.md are up to date (run: npm run build)', () => {
  for (const [file, text] of Object.entries(docs.generate())) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), text, file + ' is stale');
  }
});

test('the language reference lists every sprite, color and input field', () => {
  const md = docs.generate()['docs/LANGUAGE.md'];
  for (const n of Object.keys(api.SP)) assert.ok(md.includes(n), 'sprite ' + n);
  for (const n of api.COLOR_NAMES) assert.ok(md.includes(n), 'color ' + n);
  for (const [k] of api.INPUTDOC) assert.ok(md.includes(k), k);
});

test('the visual reference lists every block type', () => {
  const md = docs.generate()['docs/VISUAL.md'];
  for (const group of ['trig', 'cond', 'act']) for (const k of Object.keys(api.VB[group])) assert.ok(md.includes(api.VNAMES[group][k]), group + '.' + k);
});

test('README mentions the docs and every npm script exists', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(readme.includes('docs/LANGUAGE.md') && readme.includes('docs/VISUAL.md'));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const s of ['build', 'test', 'docs']) assert.ok(pkg.scripts[s], s);
});
