/* Small DOM helpers shared by all views. */
const $ = id => document.getElementById(id);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/* A small canvas showing an 8x8 sprite in a palette color. */
function thumb(bytes, size, color) {
  const c = el('canvas');
  c.width = c.height = 8;
  const x = c.getContext('2d');
  x.fillStyle = PAL[color == null ? 7 : color];
  for (let y = 0; y < 8; y++) for (let q = 0; q < 8; q++) if ((bytes[y] | 0) >> (7 - q) & 1) x.fillRect(q, y, 1, 1);
  if (size) c.style.width = c.style.height = size + 'px';
  return c;
}

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; }
  catch (e) { prompt('Copy this:', txt); return false; }
}

const modal = (id, on) => $(id).classList.toggle('on', on);

/* Modal with every built-in sprite; calls cb(name) when one is picked. */
function pickSprite(cb) {
  let m = $('spp');
  if (!m) {
    m = el('div', 'md'); m.id = 'spp';
    const box = el('div'); box.append(el('h2', 0, 'Built-in sprites'));
    const g = el('div', 'rowx'); g.id = 'sppg'; box.append(g);
    const close = el('button', 0, 'Close'); close.onclick = () => modal('spp', false); box.append(close);
    m.append(box); document.body.append(m);
    for (const n of Object.keys(SP)) {
      const b = el('button', 'chip'); b.dataset.n = n;
      b.append(thumb(SP[n], 34, 7), el('span', 0, n));
      g.append(b);
    }
  }
  $('sppg').querySelectorAll('button').forEach(b => { b.onclick = () => { modal('spp', false); cb(b.dataset.n); }; });
  modal('spp', true);
}

/* Language reference overlay, generated from LIBDOC. */
function renderHelp() {
  const b = $('helpb');
  if (b.dataset.done) return;
  b.dataset.done = 1;
  const add = (tag, text, cls) => { const e = el(tag, cls, text); b.append(e); return e; };
  add('p', 'A game is the body of a JavaScript function that ends with: return i => { ... }  The returned function runs 60 times per second.');
  add('h3', 'Input  (the argument i)');
  INPUTDOC.forEach(([k, d]) => { const p = el('div'); const c = el('code', 0, k); p.append(c, ' – ' + d); b.append(p); });
  let g = '';
  LIBDOC.filter(e => !e.hide).forEach(e => {
    if (e.g !== g) { g = e.g; add('h3', g); }
    const p = el('div'); p.append(el('code', 0, e.s), ' – ' + e.d.replace(/`/g, ''));
    b.append(p);
    if (e.e) add('code', e.e, 'ex');
  });
  add('h3', 'Built-in sprites');
  add('div', Object.keys(SP).join(', '));
  add('h3', 'Palette');
  add('div', COLOR_NAMES.map((n, k) => k + ' ' + n).join(', '));
}

/* An 8x8 pixel painter. `bytes` (array of 8) is edited in place; drag to paint, the first cell decides draw or erase.
   Returns {refresh()} to redraw after `bytes` was changed from outside. */
function spritePainter(host, bytes, cell, onChange) {
  host.innerHTML = '';
  host.classList.add('sg8');
  host.style.gridTemplateColumns = 'repeat(8,' + cell + 'px)';
  const cells = [];
  let paint = null;
  const put = (x, y) => {
    if (paint) bytes[y] |= 1 << (7 - x); else bytes[y] &= ~(1 << (7 - x));
    cells[y * 8 + x].classList.toggle('on', !!paint);
  };
  const refresh = () => cells.forEach((c, k) => c.classList.toggle('on', !!(bytes[k >> 3] >> (7 - (k & 7)) & 1)));
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const i = el('i');
    i.style.width = i.style.height = cell + 'px';
    i.onpointerdown = e => { e.preventDefault(); paint = !(bytes[y] >> (7 - x) & 1); put(x, y); if (onChange) onChange(); };
    host.append(i); cells.push(i);
  }
  host.onpointermove = e => {
    if (paint === null) return;
    const k = cells.indexOf(document.elementFromPoint(e.clientX, e.clientY));
    if (k >= 0) { put(k % 8, k >> 3); if (onChange) onChange(); }
  };
  PAINTERS.push({ host, release: () => { paint = null; } });
  refresh();
  return { refresh };
}

/* One global pointer-up listener releases every painter (and forgets painters whose element left the page). */
const PAINTERS = [];
addEventListener('pointerup', () => {
  for (let i = PAINTERS.length - 1; i >= 0; i--) {
    if (!PAINTERS[i].host.isConnected) PAINTERS.splice(i, 1); else PAINTERS[i].release();
  }
});
