/* Build manifest: which source files make up each page, in load order.
 * Files are plain browser scripts (no modules); they share one global scope per page.
 *   core  – logic with no DOM access at load time (the Node tests load these too)
 *   ui    – DOM code, only runs in the browser
 *
 * Two pages are built into dist/:
 *   index.php  the player: opens a game from the URL, or shows a short intro (+ a link to e.html if that file exists)
 *   e.html     the extras: library of demo games, code editor, visual editor, reader (QR scanner)
 */
module.exports = {
  lite: {
    core: [
      'src/app/config.js',
      'src/codec/cm.js',
      'src/codec/prime.js',
      'src/codec/minify.js',
      'src/codec/codec.js',
      'src/codec/base43.js',
      'src/codec/payload.js',
      'src/engine/sprites.js',
      'src/engine/lib.js',
      'src/engine/runtime.js',
      'src/engine/shell.js'
    ],
    ui: ['src/app/runner.js', 'src/lite/lite.js'],
    css: ['src/retro.css', 'src/lite.css'],
    template: 'src/lite/template.php',
    output: 'dist/index.php'
  },
  full: {
    core: [
      'src/app/config.js',
      'src/codec/cm.js',
      'src/codec/prime.js',
      'src/codec/minify.js',
      'src/codec/codec.js',
      'src/codec/base43.js',
      'src/codec/payload.js',
      'src/qr/qr.js',
      'src/engine/sprites.js',
      'src/engine/lib.js',
      'src/engine/libdoc.js',
      'src/engine/runtime.js',
      'src/engine/shell.js',
      'src/editor/starter.js',
      'src/editor/code-assist.js',
      'src/editor/visual-compile.js',
      'src/editor/visual-templates.js'
    ],
    ui: [
      'src/app/ui.js',
      'src/app/runner.js',
      'src/editor/code-editor.js',
      'src/editor/visual-editor.js',
      'src/app/reader.js',
      'src/app/app.js'
    ],
    css: ['src/retro.css', 'src/full.css'],
    template: 'src/template.html',
    output: 'dist/e.html'
  },
  gamesDir: 'games',
  dist: 'dist',
  pwa: {
    manifest: 'dist/manifest.webmanifest',
    sw: 'dist/sw.js',
    swTemplate: 'src/pwa/sw.js',
    icons: { 'dist/icon-192.png': 192, 'dist/icon-512.png': 512 },
    // kept for offline use. e.html is optional on the server, so a missing file never breaks the install;
    // vendor/jsQR.js (large) is cached the first time it is used instead of up front
    cache: ['./', 'index.php', 'e.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']
  },
  vendor: { 'dist/vendor/jsQR.js': 'src/vendor/jsQR.js', 'dist/vendor/jsQR.LICENSE.txt': 'src/vendor/jsQR.LICENSE.txt' }
};
