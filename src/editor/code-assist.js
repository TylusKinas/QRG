/* Code assistant: the pure (DOM-free) logic behind the code editor's helpers.
 *   - completions     suggestions for the word being typed
 *   - signatureAt     "circ(x, y, radius, k)" help for the call the caret is inside
 *   - contextAt       a sprite, a color or a sound under the caret, so the editor can offer to edit it graphically
 *   - SOUNDS          ready-made sound effects
 * Everything works on plain strings and caret positions, so it is fully unit tested. */

const KEYWORDS = ['return', 'const', 'let', 'if', 'else', 'for', 'while', 'function', 'true', 'false', 'null', 'undefined', 'break', 'continue', 'of', 'in',
  'Math', 'Date', 'Array', 'Object', 'Number', 'String', 'JSON', 'length', 'push', 'pop', 'map', 'filter', 'forEach', 'some', 'every', 'find', 'indexOf',
  'includes', 'splice', 'slice', 'join', 'floor', 'round', 'ceil', 'abs', 'min', 'max', 'sqrt', 'sin', 'cos', 'random', 'PI'];

/* names that are functions (a "(" is added when one is chosen) */
const LIBFN = new Set(LIBDOC.filter(e => !e.hide).flatMap(e => e.n.filter(n => e.s.startsWith(n + '('))));

/* The identifier the caret is in or right after. */
function wordAt(text, pos) {
  let a = pos, b = pos;
  while (a > 0 && /[\w$]/.test(text[a - 1])) a--;
  while (b < text.length && /[\w$]/.test(text[b])) b++;
  return { word: text.slice(a, pos), full: text.slice(a, b), start: a, end: b };
}

/* Up to `max` suggestions for a prefix: library names first, then words already in the program, then JS words. */
function completions(prefix, text, max) {
  max = max || 8;
  if (!prefix || prefix.length < 2 || /^\d/.test(prefix)) return [];
  const p = prefix.toLowerCase(), out = [], seen = new Set();
  const add = (n, rank) => { if (!seen.has(n) && n !== prefix && n.toLowerCase().startsWith(p)) { seen.add(n); out.push([rank, n]); } };
  for (const n of LIBNAMES) add(n, 0);
  const own = new Set((text || '').match(/[A-Za-z_$][\w$]{2,}/g) || []);
  for (const n of own) add(n, 1);
  for (const n of KEYWORDS) add(n, 2);
  return out.sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || (a[1] < b[1] ? -1 : 1)).slice(0, max).map(x => x[1]);
}
const completionText = name => LIBFN.has(name) ? name + '(' : name;

/* The innermost unfinished call around the caret: {name, arg} (arg = index of the argument being typed), or null. */
function callAt(text, pos) {
  let depth = 0, commas = 0;
  for (let i = pos - 1; i >= 0 && i > pos - 600; i--) {
    const c = text[i];
    if (c === ')' || c === ']' || c === '}') depth++;
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) {
        if (c !== '(') return null;
        let a = i;
        while (a > 0 && /[\w$]/.test(text[a - 1])) a--;
        const name = text.slice(a, i);
        return name ? { name, arg: commas } : null;
      }
      depth--;
    } else if (c === ',' && depth === 0) commas++;
    else if (c === ';' && depth === 0) return null;
  }
  return null;
}

/* Signature help for the call at the caret, with the current argument in [brackets]. */
function signatureAt(text, pos) {
  const call = callAt(text, pos);
  if (!call) return null;
  const e = LIBDOC.find(x => !x.hide && x.n.includes(call.name) && x.s.startsWith(call.name + '('));
  if (!e) return null;
  const open = e.s.indexOf('('), close = e.s.lastIndexOf(')');
  const params = e.s.slice(open + 1, close).split(',').map(s => s.trim()).filter(Boolean);
  const shown = params.map((p, i) => i === call.arg ? '[' + p + ']' : p).join(', ');
  return { name: call.name, text: call.name + '(' + shown + ')', desc: e.d.replace(/`/g, '') };
}

/* ------------------------------------------------------------------ things under the caret */

const ARRAY8 = /\[\s*\d{1,3}(?:\s*,\s*\d{1,3}){7}\s*\]/g;

/* A sprite at the caret: an 8-number array, 'name' / "name" of a built-in sprite, or SP.name. */
function spriteAt(text, pos) {
  let m;
  ARRAY8.lastIndex = 0;
  while ((m = ARRAY8.exec(text))) {
    const start = m.index, end = start + m[0].length;
    if (pos >= start && pos <= end) {
      const bytes = m[0].match(/\d+/g).map(Number);
      if (bytes.every(b => b <= 255)) return { kind: 'sprite', form: 'bytes', start, end, bytes };
    }
  }
  const re = /(['"])([a-z]+)\1|\bSP\.([a-z]+)\b/g;
  while ((m = re.exec(text))) {
    const name = m[2] || m[3], start = m.index, end = start + m[0].length;
    if (SP[name] && pos >= start && pos <= end) return { kind: 'sprite', form: m[3] ? 'sp' : 'name', start, end, name, bytes: Array.from(SP[name]) };
  }
  return null;
}

/* A color constant (RED, NAVY, ...) at the caret. */
function colorAt(text, pos) {
  const w = wordAt(text, pos);
  const index = COLOR_NAMES.indexOf(w.full);
  return index >= 0 && w.full ? { kind: 'color', start: w.start, end: w.end, index, name: w.full } : null;
}

/* A sound call at the caret: s(hz, ms, 'type') or mel([hz, ...], ms, 'type'). */
function soundAt(text, pos) {
  const re = /\b(s|mel)\(\s*(\[[^\]]*\]|[\d.]+)\s*(?:,\s*([\d.]+)\s*)?(?:,\s*(['"])(\w+)\4\s*)?\)/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index, end = start + m[0].length;
    if (pos < start || pos > end) continue;
    const notes = m[1] === 's' ? [parseFloat(m[2])] : (m[2].match(/[\d.]+/g) || []).map(Number);
    if (m[1] === 's' ? !isFinite(notes[0]) : false) continue;
    return { kind: 'sound', fn: m[1], start, end, notes, ms: m[3] ? parseFloat(m[3]) : (m[1] === 's' ? 70 : 100), wave: m[5] || 'square' };
  }
  return null;
}

/* The first editable thing at the caret (sprite, then sound, then color), or null. */
function contextAt(text, pos) { return spriteAt(text, pos) || soundAt(text, pos) || colorAt(text, pos); }

/* The code for a sound: one beep as s(...), several notes as mel([...]). */
function soundCode(notes, ms, wave) {
  const w = wave && wave !== 'square' ? ", '" + wave + "'" : '';
  if (notes.length === 1) return 's(' + notes[0] + (ms !== 70 || w ? ', ' + ms + w : '') + ')';
  return 'mel([' + notes.join(', ') + '], ' + ms + w + ')';
}

/* Ready-made effects: [name, notes, ms per note, wave]. */
const SOUNDS = [
  ['Coin', [988, 1319], 80, 'square'], ['Jump', [262, 330, 392], 60, 'square'], ['Hit', [160], 120, 'sawtooth'],
  ['Laser', [1200, 900, 600, 300], 40, 'sawtooth'], ['Power-up', [523, 659, 784, 1047], 70, 'square'],
  ['Win', [523, 659, 784, 1047, 0, 784, 1047], 110, 'square'], ['Lose', [392, 330, 262, 196], 160, 'triangle'],
  ['Click', [1000], 25, 'square'], ['Blip', [440], 70, 'square'], ['Alarm', [880, 660, 880, 660], 100, 'square']
].map(([name, notes, ms, wave]) => ({ name, notes, ms, wave, code: soundCode(notes, ms, wave) }));
