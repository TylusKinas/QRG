#!/usr/bin/env node
/* Builds everything that gets uploaded to the server:  node tools/build.js   (or: npm run build)
 *
 *   dist/index.php             the player (small)           <- src/lite/template.php + lite scripts
 *   dist/e.html                the extras (editors, reader) <- src/template.html + full scripts + games/*.js
 *   dist/manifest.webmanifest  PWA manifest
 *   dist/sw.js                 service worker (offline)
 *   dist/icon-192.png, icon-512.png
 *   dist/vendor/jsQR.js        QR scanner fallback for browsers without BarcodeDetector (Apache-2.0)
 *
 * Also exported for the tests: coreSource(), uiSource(), liteCoreSource(), liteUiSource(), html(), php(), outputs(), loadGames().
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const M = require('./manifest.js');
const { icon } = require('./icons.js');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const source = list => list.map(read).join('\n');

/* games/NN-name.js: leading "// @key value" lines are metadata, the rest is the game source (comments included) */
function loadGames() {
  const dir = path.join(root, M.gamesDir);
  return fs.readdirSync(dir).filter(f => /^\d+-.+\.js$/.test(f)).sort().map(f => {
    const meta = {}, body = [];
    for (const line of read(M.gamesDir + '/' + f).split('\n')) {
      const m = line.match(/^\/\/ @(\w+) (.*)$/);
      if (m && !body.length) meta[m[1]] = m[2].trim(); else body.push(line);
    }
    return { id: f.replace(/\.js$/, ''), name: meta.name, color: meta.color || '#888', about: meta.about || '', code: body.join('\n').trim() };
  });
}

const coreSource = () => source(M.full.core) + '\nconst GAMES = ' + JSON.stringify(loadGames()) + ';\n';
const uiSource = () => source(M.full.ui);
const liteCoreSource = () => source(M.lite.core);
const liteUiSource = () => source(M.lite.ui);

function page(cfg, core, ui) {
  for (const [n, s] of [['core', core], ['ui', ui]]) {
    if (/<\/script/i.test(s)) throw new Error(cfg.output + ': ' + n + ' contains "</script" – escape it');
    if (/<\?/.test(s)) throw new Error(cfg.output + ': ' + n + ' contains "<?" which PHP would try to run');
  }
  return read(cfg.template)
    .replace('/*@CSS@*/', () => source(cfg.css))
    .replace('/*@CORE@*/', () => core)
    .replace('/*@UI@*/', () => ui);
}
const html = () => page(M.full, coreSource(), uiSource());
const php = () => page(M.lite, liteCoreSource(), liteUiSource());

const manifestJson = () => JSON.stringify({
  name: 'QRG – QR Game Engine',
  short_name: 'QRG',
  description: 'A whole game inside one QR code. Scan it with your phone camera and play.',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#1d2b53',
  theme_color: '#000000',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}, null, 2) + '\n';

const swSource = hash => read(M.pwa.swTemplate).replace('@HASH@', hash).replace('@FILES@', () => JSON.stringify(M.pwa.cache));

/* every generated file: relative path -> string or Buffer */
function outputs() {
  const files = {};
  files[M.lite.output] = php();
  files[M.full.output] = html();
  files[M.pwa.manifest] = manifestJson();
  const hash = crypto.createHash('sha1').update(files[M.lite.output]).update(files[M.full.output]).digest('hex').slice(0, 10);
  files[M.pwa.sw] = swSource(hash);
  for (const [f, size] of Object.entries(M.pwa.icons)) files[f] = icon(size);
  for (const [to, from] of Object.entries(M.vendor)) files[to] = fs.readFileSync(path.join(root, from));
  return files;
}

function write() {
  const files = outputs();
  for (const [f, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), data);
  }
  return files;
}

if (require.main === module) {
  const files = write();
  const kb = f => (Buffer.byteLength(files[f]) / 1024).toFixed(1) + ' KB';
  console.log('built ' + M.lite.output + ' (' + kb(M.lite.output) + '), ' + M.full.output + ' (' + kb(M.full.output) + ', ' + loadGames().length + ' games), PWA files and vendor/');
}
module.exports = { coreSource, uiSource, liteCoreSource, liteUiSource, html, php, outputs, write, loadGames, manifestJson, swSource, root };
