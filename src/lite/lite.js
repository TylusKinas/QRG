/* QRG player page (index.php): plays the game found in the URL, or shows a short intro.
   Small on purpose: everything heavy (library, editors, reader) lives in e.html. */
(() => {
  const $ = id => document.getElementById(id);
  const more = $('more');                          // present only when e.html sits next to this file
  let current = '';                                // source of the game being played
  let installEvent = null;

  const view = id => { $('intro').classList.toggle('on', id === 'intro'); $('play').classList.toggle('on', id === 'play'); };

  function route() {
    const hash = location.hash;
    Runner.stop($('fm'));
    $('blocked').classList.remove('on');
    if (hash.length < 2) { $('bad').hidden = true; return view('intro'); }
    const code = gameFromText(hash);
    if (!code) { $('bad').hidden = false; return view('intro'); }
    $('bad').hidden = true;
    current = code;
    view('play');
    Runner.run($('fm'), code, { onblocked: () => $('blocked').classList.add('on') });
  }

  $('pu').onclick = () => { $('blocked').classList.remove('on'); Runner.run($('fm'), current, { unsafe: true }); };
  $('fm').onload = () => { try { $('fm').contentWindow.focus(); } catch (e) { /* ignore */ } };
  addEventListener('hashchange', route);

  /* app install button + offline support */
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; $('install').hidden = false; });
  $('install').onclick = () => { if (installEvent) installEvent.prompt(); $('install').hidden = true; };
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

  route();
})();
