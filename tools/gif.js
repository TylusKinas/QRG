/* A minimal animated GIF encoder (indexed colour, global palette, LZW), no dependencies.
   frames: array of Uint8Array (w*h palette indexes); palette: array of '#rrggbb'; delay in 1/100 s. */
function lzw(indexes, minBits) {
  const clear = 1 << minBits, eoi = clear + 1, out = [];
  let cur = 0, nbits = 0, size = minBits + 1, next = eoi + 1, dict = new Map();
  const put = code => { cur |= code << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; } };
  put(clear);
  let prefix = indexes[0];
  for (let i = 1; i < indexes.length; i++) {
    const k = indexes[i], key = prefix * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    put(prefix);
    if (next < 4096) { dict.set(key, next++); if (next - 1 === (1 << size) && size < 12) size++; }
    else { put(clear); dict = new Map(); size = minBits + 1; next = eoi + 1; }
    prefix = k;
  }
  put(prefix); put(eoi);
  if (nbits) out.push(cur & 255);
  return out;
}

function encodeGif(w, h, palette, frames, delay) {
  const b = [], w16 = v => b.push(v & 255, v >> 8 & 255);
  b.push(...Buffer.from('GIF89a')); w16(w); w16(h);
  b.push(0xf0 | 3, 0, 0);                                    // global table, 16 colours (2^(3+1))
  for (const c of palette) b.push(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16));
  b.push(0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0);   // loop forever
  for (const f of frames) {
    b.push(0x21, 0xf9, 4, 0, delay & 255, delay >> 8 & 255, 0, 0);
    b.push(0x2c); w16(0); w16(0); w16(w); w16(h); b.push(0, 4);
    const data = lzw(f, 4);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); b.push(n); for (let j = 0; j < n; j++) b.push(data[i + j]); }
    b.push(0);
  }
  b.push(0x3b);
  return Buffer.from(b);
}
module.exports = { encodeGif };
