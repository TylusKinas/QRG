/* Payload: game source <-> URL.  The URL fragment never reaches the server. */
const toPayload = code => b43(pack(min(code)));
const fromPayload = s => unpack(d43(s));
const toURL = code => BASE + toPayload(code);
// QR segments for a URL: everything up to and including '#' as bytes, the payload as alphanumeric
const urlSegs = u => { const i = u.indexOf('#') + 1; return [['b', [...U8.encode(u.slice(0, i))]], ['a', u.slice(i)]]; };

/* Finds the payload in whatever a scanner returned: a URL of any host or path (everything after the last '#'),
   or the bare payload itself. Returns null when the text cannot be a QRG payload. */
function extractPayload(text) {
  let s = String(text == null ? '' : text).trim();
  const h = s.lastIndexOf('#');
  if (h >= 0) s = s.slice(h + 1);
  try { s = decodeURIComponent(s); } catch (e) { /* keep as is */ }
  s = s.replace(/\s+/g, '');
  return /^[0-9A-Z$*+\-./:]+$/.test(s) ? s : null;
}

/* The game source hidden in a scanned text or link, or null when it is not a QRG game.
   Random garbage also decompresses to something, so the result must at least be valid JavaScript. */
function gameFromText(text) {
  const payload = extractPayload(text);
  if (!payload) return null;
  let code;
  try { code = fromPayload(payload); } catch (e) { return null; }
  try { new Function('L', 'with(L){' + code + '\n}'); } catch (e) { return null; }
  return code;
}
