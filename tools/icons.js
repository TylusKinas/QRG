/* The app icon: a 21x21 QR-like pattern (the size of a version-1 QR code) with a yellow "play" arrow in the middle. */
const png = require('./png.js');

const NAVY = [0x1d, 0x2b, 0x53], WHITE = [0xff, 0xf1, 0xe8], YELLOW = [0xff, 0xec, 0x27];
const N = 21;

function modules() {
  const g = Array.from({ length: N }, () => Array(N).fill(0));
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const ring = x == 0 || y == 0 || x == 6 || y == 6, core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      g[oy + y][ox + x] = ring || core ? 1 : 0;
    }
  };
  let s = 7;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g[y][x] = rnd() < .5 ? 1 : 0;
  // keep the three corners clean for the finder patterns, then draw them
  for (const [ox, oy] of [[0, 0], [N - 8, 0], [0, N - 8]]) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) g[oy + y][ox + x] = 0;
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  // clear a square in the middle and draw the arrow (pointing right)
  for (let y = 7; y <= 13; y++) for (let x = 7; x <= 13; x++) g[y][x] = 0;
  const arrow = [[8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [9, 9], [9, 10], [9, 11], [10, 10]];
  return { g, arrow: arrow.map(([x, y]) => [x + 1, y]) };
}

function icon(size) {
  const { g, arrow } = modules();
  const margin = Math.round(size * 0.14), m = Math.floor((size - 2 * margin) / N), off = Math.floor((size - m * N) / 2);
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) { rgb[i * 3] = NAVY[0]; rgb[i * 3 + 1] = NAVY[1]; rgb[i * 3 + 2] = NAVY[2]; }
  const fill = (cx, cy, c) => {
    for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
      const o = ((off + cy * m + y) * size + off + cx * m + x) * 3;
      rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2];
    }
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x]) fill(x, y, WHITE);
  for (const [x, y] of arrow) fill(x, y, YELLOW);
  return png.encode(size, size, rgb);
}

module.exports = { icon };
