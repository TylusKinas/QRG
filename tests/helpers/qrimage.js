/* Renders a QR matrix to RGBA pixels (with quiet zone) and decodes it with jsQR. */
const jsQR = require('jsqr');

function render(q, sc) {
  sc = sc || 3;
  const n = (q.size + 8) * sc, d = new Uint8ClampedArray(n * n * 4).fill(255);
  q.M.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) {
      const o = (((y + 4) * sc + a) * n + (x + 4) * sc + b) * 4;
      d[o] = d[o + 1] = d[o + 2] = 0;
    }
  }));
  return { data: d, n };
}

function decode(q, sc) {
  const { data, n } = render(q, sc);
  const r = jsQR(data, n, n);
  return r ? r.data : null;
}

module.exports = { render, decode };
