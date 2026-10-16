/* App shell of the extras page (e.html): the four modes (Games, Code, Visual, Reader), the QR view and the play view. */
const App = {
  cur: { name: 'My game', code: STARTER },     // the program being worked on
  prev: 'H',                                   // where the play view returns to
  view: 'H'
};
const VIEWS = {};                              // id -> {enter(arg), leave()}; filled below
const MODES = ['H', 'E', 'V', 'R'];            // views that show the mode tabs

App.show = (id, arg) => {
  const old = VIEWS[App.view];
  if (old && old.leave) old.leave();
  App.view = id;
  document.querySelectorAll('.v').forEach(v => v.classList.toggle('on', v.id == id));
  document.body.classList.toggle('m', MODES.includes(id));
  document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m == id));
  const nv = VIEWS[id];
  if (nv && nv.enter) nv.enter(arg);
};

/* A scanned or shared game that is one of the demos opens with the demo's commented source in the editor. */
const KNOWN = new Map(GAMES.map(g => [min(g.code), g.code]));
App.known = code => KNOWN.get(min(code)) || code;

App.play = (o, from) => {
  App.cur = { name: o.name, code: App.known(o.code) };
  App.prev = from || 'H';
  App.show('P', o);
};

App.showQR = (o, from) => {
  App.cur = { name: o.name, code: App.known(o.code) };
  App.qprev = from || 'H';
  App.show('Q', o);
};

/* ---- modes ---- */
document.querySelectorAll('#modes button').forEach(b => {
  b.onclick = () => App.show(b.dataset.m, b.dataset.m == 'E' ? App.cur : undefined);
});

/* ---- games ---- */
const sizes = [];
GAMES.forEach(g => {
  const b = el('div', 'tile'), sz = el('small', 'sz', U8.encode(min(g.code)).length + ' B without comments');
  b.setAttribute('role', 'button'); b.tabIndex = 0;
  b.onkeydown = e => { if (e.key == 'Enter' || e.key == ' ') b.click(); };
  b.append(el('b', 0, g.name), el('small', 0, g.about), sz);
  b.onclick = () => App.showQR({ name: g.name, code: g.code }, 'H');
  $('gr').append(b);
  sizes.push([g, sz]);
});
// the QR version needs the compressor, so it is filled in one game at a time after the page is up
(function fillSizes(k) {
  if (k >= sizes.length) return;
  const [g, sz] = sizes[k];
  try { sz.textContent = U8.encode(min(g.code)).length + ' B · QR v' + QR(urlSegs(toURL(g.code))).v; } catch (e) { /* keep the byte count */ }
  setTimeout(() => fillSizes(k + 1), 40);
})(0);
$('hh').onclick = () => { renderHelp(); modal('help', true); };
$('helpx').onclick = () => modal('help', false);
VIEWS.H = {};

/* ---- QR view ---- */
VIEWS.Q = {
  enter(o) {
    $('qt').textContent = o.name;
    $('qi').textContent = 'Calculating…';
    setTimeout(() => {
      try {
        const u = toURL(o.code), q = QR(urlSegs(u));
        drawQR($('qc'), q);
        $('qi').textContent = U8.encode(min(o.code)).length + ' B of code → QR v' + q.v + ' (' + q.size + '×' + q.size + ') · ' + u.length + ' chars\nScan it with any phone camera – the game opens in the browser';
      } catch (e) { $('qi').textContent = '⚠ ' + e.message; }
    }, 30);
  }
};
$('qb').onclick = () => App.show(App.qprev || 'H', App.cur);
$('qp').onclick = () => App.play(App.cur, 'Q');
$('qe').onclick = () => App.show('E', App.cur);
$('ql').onclick = () => { try { copyText(toURL(App.cur.code)); } catch (e) { $('qi').textContent = '⚠ ' + e.message; } };

/* ---- play view ---- */
VIEWS.P = {
  enter(o) {
    $('blocked').classList.remove('on');
    Runner.run($('fm'), o.code, { onblocked: () => $('blocked').classList.add('on') });
  },
  leave() { Runner.stop($('fm')); $('blocked').classList.remove('on'); }
};
$('fm').onload = () => { try { $('fm').contentWindow.focus(); } catch (e) { /* ignore */ } };
$('px').onclick = () => App.show(App.prev, App.cur);
$('pe').onclick = () => App.show(App.prev == 'V' ? 'V' : 'E', App.cur);
$('pr').onclick = () => {
  if (!confirm('Forget what this game saved on this device?')) return;
  Runner.store.clear(Runner.gameId(App.cur.code));
  Runner.run($('fm'), App.cur.code, { onblocked: () => $('blocked').classList.add('on') });
};
$('pu').onclick = () => { $('blocked').classList.remove('on'); Runner.run($('fm'), App.cur.code, { unsafe: true }); };

/* ---- editors and reader ---- */
VIEWS.E = CodeEditor;
VIEWS.V = VisualEditor;
VIEWS.R = Reader;

/* ---- boot: a game in the URL fragment plays straight away ---- */
(() => {
  if (location.hash.length > 2) {
    const code = gameFromText(location.hash);
    if (code) { App.play({ name: 'Shared game', code }, 'H'); return; }
  }
  App.show('H');
})();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
