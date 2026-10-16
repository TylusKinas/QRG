/* Visual editor: project model, block schema and compiler
 * =========================================================
 * A visual project is plain JSON:
 *   { bg: 1,                                         background color (0-15)
 *     kinds: [{id, name, spr:[8 bytes], c, z}],      object types: sprite, color, scale
 *     objs:  [{k, x, y}],                            objects placed on the screen
 *     vars:  [{n, v, show}],                         number variables (show = draw on screen)
 *     rules: [{when:{t,...}, ifs:[{t,...}], dos:[{t,...}]}] }
 *
 * A rule reads like a sentence:  WHEN <trigger>  IF <conditions>  DO <actions>.
 * vcompile(P) turns the project into ordinary QRG script (the same language the code editor uses), so
 * the result can be played, turned into a QR code, or opened in the code editor and edited by hand.
 *
 * Every block type is described once in VB (label, fields, code generator); the editor UI is generated
 * from the same table, so UI and compiler cannot drift apart.
 *
 * Field types:  kind  who  var  num  text  js  btn  edge  op  vop  axis  bounce  col
 *   num   is a JavaScript expression typed by the user (a plain number, or something like R(200) or a.x + 4)
 *   who   an object type, or "this" (@a) / "other" (@b) inside rules that provide them
 */

const VB = {
  buttons: [['left (or swipe left)', 'l'], ['right (or swipe right)', 'r'], ['up (or swipe up)', 'u'], ['down (or swipe down)', 'd'],
            ['A (or tap)', 'a'], ['B', 'b'], ['Start', 's']],
  edges: [['any edge', 'any'], ['left edge', 'left'], ['right edge', 'right'], ['top edge', 'top'], ['bottom edge', 'bottom']],
  ops: [['=', '=='], ['≠', '!='], ['<', '<'], ['>', '>'], ['≤', '<='], ['≥', '>=']],
  vops: [['set to', '='], ['increase by', '+='], ['decrease by', '-=']],
  axes: [['both directions', 'xy'], ['left-right only', 'x'], ['up-down only', 'y']],
  bounces: [['horizontally', 'x'], ['vertically', 'y'], ['both ways', 'xy']],
  posAxes: [['x', 'x'], ['y', 'y']],

  /* WHEN ... : l = sentence ({field} placeholders), f = fields [name, type, default], ctx = fields bound to
     "this" (@a) and "other" (@b), g(p, body, cond, h) = code. `cond` is a JS boolean or ''. */
  trig: {
    start:  { l: 'the game starts', f: [], g: (p, b, c) => c ? `if(${c}){${b}}` : b },
    always: { l: 'every frame', f: [], g: (p, b, c) => c ? `if(${c}){${b}}` : b },
    press:  { l: 'button {btn} is pressed', f: [['btn', 'btn', 'a']], g: (p, b, c) => `if(i.${p.btn.toUpperCase()}${c ? '&&' + c : ''}){${b}}` },
    held:   { l: 'button {btn} is held down', f: [['btn', 'btn', 'l']], g: (p, b, c) => `if(i.${p.btn}${c ? '&&' + c : ''}){${b}}` },
    touch:  { l: 'a finger is on the screen', f: [], g: (p, b, c) => `if(i.t${c ? '&&' + c : ''}){${b}}` },
    tap:    { l: 'the screen is tapped', f: [], g: (p, b, c) => `if(i.C${c ? '&&' + c : ''}){${b}}` },
    tapobj: { l: '{a} is tapped', f: [['a', 'kind']], ctx: ['a'],
              g: (p, b, c, h) => `if(i.C)each(${h.k(p.a)},a=>{if(inb(i.x,i.y,a.x,a.y,a.w,a.h)${c ? '&&' + c : ''}){${b}}});` },
    hit:    { l: '{a} touches {b}', f: [['a', 'kind'], ['b', 'kind']], ctx: ['a', 'b'],
              g: (p, b, c, h) => `touch(${h.k(p.a)},${h.k(p.b)},(a,b)=>{${c ? `if(${c}){${b}}` : b}});` },
    edge:   { l: '{a} reaches {edge}', f: [['a', 'kind'], ['edge', 'edge', 'any']], ctx: ['a'],
              g: (p, b, c, h) => `each(${h.k(p.a)},a=>{if(${h.edge(p.edge)}${c ? '&&' + c : ''}){${b}}});` },
    every:  { l: 'every {n} seconds', f: [['n', 'num', '1']],
              g: (p, b, c, h) => `if(every(${h.frames(p.n)})${c ? '&&' + c : ''}){${b}}` }
  },

  /* IF ... : g(p, h) returns a JS boolean expression */
  cond: {
    var:    { l: '{v} {op} {n}', f: [['v', 'var'], ['op', 'op', '<'], ['n', 'num', '0']], g: (p, h) => `${h.vr(p.v)}${p.op}${h.n(p.n)}` },
    count:  { l: 'number of {k} {op} {n}', f: [['k', 'kind'], ['op', 'op', '=='], ['n', 'num', '0']], g: (p, h) => `all(${h.k(p.k)}).length${p.op}${h.n(p.n)}` },
    chance: { l: '{n}% chance', f: [['n', 'num', '50']], g: (p, h) => `R(100)<${h.n(p.n)}` },
    key:    { l: 'button {btn} is held', f: [['btn', 'btn', 'l']], g: p => `i.${p.btn}` },
    pos:    { l: '{w} {axis} {op} {n}', f: [['w', 'who'], ['axis', 'posAxis', 'x'], ['op', 'op', '<'], ['n', 'num', '0']],
              g: (p, h) => h.who(p.w, v => `${v}.${p.axis}${p.op}${h.n(p.n)}`, true) },
    code:   { l: 'JavaScript is true: {js}', f: [['js', 'js', 'true']], g: (p, h) => `(${h.expr(p.js)})` }
  },

  /* DO ... : g(p, h) returns statements; actions with a `who` field are applied to every object of that type */
  act: {
    move:    { l: 'move {w} by x {dx} y {dy}', f: [['w', 'who'], ['dx', 'num', '2'], ['dy', 'num', '0']],
               g: (p, h) => h.who(p.w, v => `${v}.x+=${h.n(p.dx)};${v}.y+=${h.n(p.dy)};`) },
    moveto:  { l: 'put {w} at x {x} y {y}', f: [['w', 'who'], ['x', 'num', '120'], ['y', 'num', '120']],
               g: (p, h) => h.who(p.w, v => `${v}.x=${h.n(p.x)};${v}.y=${h.n(p.y)};`) },
    follow:  { l: 'move {w} to the finger ({axis})', f: [['w', 'who'], ['axis', 'axis', 'xy']],
               g: (p, h) => h.who(p.w, v => (p.axis.includes('x') ? `${v}.x=i.x-${v}.w/2;` : '') + (p.axis.includes('y') ? `${v}.y=i.y-${v}.h/2;` : '')) },
    speed:   { l: 'set the speed of {w} to x {dx} y {dy}', f: [['w', 'who'], ['dx', 'num', '0'], ['dy', 'num', '2']],
               g: (p, h) => h.who(p.w, v => `${v}.vx=${h.n(p.dx)};${v}.vy=${h.n(p.dy)};`) },
    accel:   { l: 'speed up {w} by x {dx} y {dy}', f: [['w', 'who'], ['dx', 'num', '0'], ['dy', 'num', '0.1']],
               g: (p, h) => h.who(p.w, v => `${v}.vx+=${h.n(p.dx)};${v}.vy+=${h.n(p.dy)};`) },
    bounce:  { l: 'bounce {w} {axis}', f: [['w', 'who'], ['axis', 'bounce', 'x']],
               g: (p, h) => h.who(p.w, v => (p.axis.includes('x') ? `${v}.vx=-${v}.vx;` : '') + (p.axis.includes('y') ? `${v}.vy=-${v}.vy;` : '')) },
    keep:    { l: 'keep {w} on the screen', f: [['w', 'who']],
               g: (p, h) => h.who(p.w, v => `${v}.x=clamp(${v}.x,0,W-${v}.w);${v}.y=clamp(${v}.y,0,H-${v}.h);`) },
    destroy: { l: 'destroy {w}', f: [['w', 'who']], g: (p, h) => h.who(p.w, v => `kill(${v});`) },
    color:   { l: 'change the color of {w} to {c}', f: [['w', 'who'], ['c', 'col', '8']], g: (p, h) => h.who(p.w, v => `${v}.c=${h.col(p.c)};`) },
    create:  { l: 'create {k} at x {x} y {y} with speed x {vx} y {vy}', f: [['k', 'kind'], ['x', 'num', '120'], ['y', 'num', '0'], ['vx', 'num', '0'], ['vy', 'num', '0']],
               g: (p, h) => { const vx = h.n(p.vx), vy = h.n(p.vy); return `add(${h.k(p.k)},${h.n(p.x)},${h.n(p.y)}${vx == '0' && vy == '0' ? '' : `,{vx:${vx},vy:${vy}}`});`; } },
    setvar:  { l: '{v} {vop} {n}', f: [['v', 'var'], ['vop', 'vop', '+='], ['n', 'num', '1']], g: (p, h) => `${h.vr(p.v)}${p.vop}${h.n(p.n)};` },
    sound:   { l: 'play a sound at {n} Hz', f: [['n', 'num', '600']], g: (p, h) => `s(${h.n(p.n)});` },
    text:    { l: 'show the text {s} at x {x} y {y} in {c}', f: [['s', 'text', 'HELLO'], ['x', 'num', '4'], ['y', 'num', '20'], ['c', 'col', '7']],
               g: (p, h) => `t(${h.str(p.s)},${h.n(p.x)},${h.n(p.y)},${h.col(p.c)});` },
    end:     { l: 'end the game and show {s}', f: [['s', 'text', 'GAME OVER']], g: p => `over=${JSON.stringify(String(p.s || 'GAME OVER'))};` },
    restart: { l: 'restart the game', f: [], g: () => 'init();' },
    code:    { l: 'run JavaScript: {js}', f: [['js', 'js', '']], g: (p, h) => h.stmt(p.js) }
  }
};

const VRESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export',
  'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw',
  'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'await', 'async', 'of', 'arguments', 'eval',
  'i', 'a', 'b', 'q', 'over', 'init', 'frame', 'Math', 'Date', 'Array', 'Object', 'Number', 'String', 'JSON', 'undefined', 'NaN', 'Infinity', 'L',
  ...LIBNAMES]);

/* ------------------------------------------------------------------ helpers shared with the UI */

const vid = (list, prefix) => { let n = 1; while (list.some(e => e.id === prefix + n)) n++; return prefix + n; };

/* A safe variable name: letters, digits, underscore; never reserved. */
function vsafeName(n) {
  let s = String(n == null ? '' : n).replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  if (!s) s = 'var';
  while (VRESERVED.has(s)) s += '_';
  return s;
}

/* Split a sentence template into text and field pieces: 'move {w} by {dx}' -> [{text}, {field:'w'}, ...]. */
function vsplit(label) {
  const out = []; let last = 0, m;
  const re = /\{(\w+)\}/g;
  while ((m = re.exec(label))) {
    if (m.index > last) out.push({ text: label.slice(last, m.index) });
    out.push({ field: m[1] });
    last = re.lastIndex;
  }
  if (last < label.length) out.push({ text: label.slice(last) });
  return out;
}

/* Which kinds "this" (@a) and "other" (@b) refer to inside a rule, derived from its trigger. */
function vctx(rule) {
  const T = VB.trig[rule.when && rule.when.t], out = { a: null, b: null };
  if (T && T.ctx) { if (T.ctx[0]) out.a = rule.when[T.ctx[0]] || null; if (T.ctx[1]) out.b = rule.when[T.ctx[1]] || null; }
  return out;
}

/* Choices for a select-type field as [label, value] pairs (null for free-text fields). */
function vopts(type, P, rule) {
  const kindName = id => (P.kinds.find(k => k.id === id) || { name: '?' }).name;
  switch (type) {
    case 'kind': return P.kinds.map(k => [k.name, k.id]);
    case 'who': {
      const c = rule ? vctx(rule) : { a: null, b: null }, o = [];
      if (c.a) o.push(['this ' + kindName(c.a), '@a']);
      if (c.b) o.push(['the other ' + kindName(c.b), '@b']);
      return o.concat(P.kinds.map(k => ['all ' + k.name, k.id]));
    }
    case 'var': return P.vars.map(v => [v.n, v.n]);
    case 'btn': return VB.buttons;
    case 'edge': return VB.edges;
    case 'op': return VB.ops;
    case 'vop': return VB.vops;
    case 'axis': return VB.axes;
    case 'bounce': return VB.bounces;
    case 'posAxis': return VB.posAxes;
    case 'col': return COLOR_NAMES.map((n, k) => [n.toLowerCase(), String(k)]);
    default: return null;
  }
}

/* One block as a readable sentence. */
function vdescribe(P, rule, kindOfBlock, block) {
  const reg = VB[kindOfBlock][block.t];
  if (!reg) return '?';
  return vsplit(reg.l).map(pc => {
    if (pc.text != null) return pc.text;
    const f = reg.f.find(x => x[0] === pc.field), val = block[pc.field];
    const o = vopts(f[1], P, rule);
    if (o) { const hit = o.find(e => e[1] === String(val)); return hit ? hit[0] : '?'; }
    return val == null || val === '' ? '…' : String(val);
  }).join('');
}

/* Fix references that stopped making sense after an edit (e.g. "this object" in a rule that has none). */
function vrepair(P) {
  const first = P.kinds.length ? P.kinds[0].id : null;
  const kindOk = id => P.kinds.some(k => k.id === id);
  const varOk = n => P.vars.some(v => v.n === n);
  const fixBlock = (b, reg, ctx) => {
    for (const [name, type] of reg.f) {
      if (type === 'kind' && !kindOk(b[name])) b[name] = first;
      if (type === 'who' && !(kindOk(b[name]) || (b[name] === '@a' && ctx.a) || (b[name] === '@b' && ctx.b))) b[name] = ctx.a ? '@a' : first;
      if (type === 'var' && !varOk(b[name])) b[name] = P.vars.length ? P.vars[0].n : '';
    }
  };
  for (const rule of P.rules) {
    const T = VB.trig[rule.when.t];
    if (T) fixBlock(rule.when, T, { a: null, b: null });
    const ctx = vctx(rule);
    for (const c of rule.ifs || []) { const r = VB.cond[c.t]; if (r) fixBlock(c, r, ctx); }
    for (const a of rule.dos || []) { const r = VB.act[a.t]; if (r) fixBlock(a, r, ctx); }
  }
  P.objs = P.objs.filter(o => kindOk(o.k));
  return P;
}

/* Remove an object type with everything that depends on it. */
function vpurgeKind(P, id) {
  const uses = (b, reg) => reg && reg.f.some(([n, t]) => (t === 'kind' || t === 'who') && b[n] === id);
  P.kinds = P.kinds.filter(k => k.id !== id);
  P.objs = P.objs.filter(o => o.k !== id);
  P.rules = P.rules.filter(r => !uses(r.when, VB.trig[r.when.t]));
  for (const r of P.rules) {
    r.ifs = (r.ifs || []).filter(c => !uses(c, VB.cond[c.t]));
    r.dos = (r.dos || []).filter(a => !uses(a, VB.act[a.t]));
  }
  return vrepair(P);
}

/* A new block of the given type with sensible default field values. */
function vnew(P, group, t, rule) {
  const reg = VB[group][t], b = { t }, ctx = rule ? vctx(rule) : { a: null, b: null };
  for (const [name, type, def] of reg.f) {
    if (type === 'kind') b[name] = P.kinds.length ? P.kinds[0].id : null;
    else if (type === 'who') b[name] = ctx.a ? '@a' : (P.kinds.length ? P.kinds[0].id : null);
    else if (type === 'var') b[name] = P.vars.length ? P.vars[0].n : '';
    else b[name] = def == null ? '' : def;
  }
  return b;
}

/* A new blank project: one smiley that follows the finger, A adds to the score. */
function vblank() {
  return {
    v: 1, bg: 1,
    kinds: [{ id: 'k1', name: 'Player', spr: Array.from(SP.smile), c: 10, z: 3 }],
    objs: [{ k: 'k1', x: 116, y: 108 }],
    vars: [{ n: 'score', v: 0, show: 1 }],
    rules: [
      { when: { t: 'touch' }, ifs: [], dos: [{ t: 'follow', w: 'k1', axis: 'xy' }] },
      { when: { t: 'press', btn: 'a' }, ifs: [], dos: [{ t: 'setvar', v: 'score', vop: '+=', n: '1' }, { t: 'sound', n: '600' }] }
    ]
  };
}

/* ------------------------------------------------------------------ compiler */

const pascal = s => String(s).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('') || 'Obj';

function vcompile(P, opts) {
  opts = opts || {};
  const errors = [];
  let ri = null;                                           // rule currently being compiled (for messages)
  const err = m => errors.push((ri != null ? 'Rule ' + (ri + 1) + ': ' : '') + m);

  /* names */
  const used = new Set(VRESERVED), vnames = new Set(), vars = [];
  (P.vars || []).forEach(v => {
    if (!v || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.n || '') || VRESERVED.has(v.n) || vnames.has(v.n)) { err('variable name "' + (v && v.n) + '" is not usable'); return; }
    vnames.add(v.n); used.add(v.n); vars.push(v);
  });
  const kn = {};
  (P.kinds || []).forEach(k => {
    const base = 'k' + pascal(k.name); let n = base, c = 2;
    while (used.has(n)) n = base + c++;
    used.add(n); kn[k.id] = n;
  });

  const okExpr = s => { try { new Function('return (' + s + '\n)'); return true; } catch (e) { return false; } };
  const okStmt = s => { try { new Function(s); return true; } catch (e) { return false; } };
  const plain = /^-?\d+(\.\d+)?$|^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

  const h = {
    k: id => { if (!kn[id]) { err('an object type is missing'); return 'null'; } return kn[id]; },
    vr: n => { if (!vnames.has(n)) { err('unknown variable "' + n + '"'); return '_missing'; } return n; },
    n: s => {
      s = String(s == null || String(s).trim() === '' ? '0' : s).trim();
      if (!okExpr(s)) { err('"' + s + '" is not a valid number or expression'); return '0'; }
      return plain.test(s) ? s : '(' + s + ')';
    },
    expr: s => { s = String(s || 'true').trim(); if (!okExpr(s)) { err('"' + s + '" is not a valid expression'); return 'false'; } return s; },
    stmt: s => { s = String(s || '').trim(); if (!s) return ''; if (!okStmt(s)) { err('this JavaScript has a syntax error: ' + s.slice(0, 40)); return ''; } return s.replace(/\s*;?\s*$/, ';'); },
    col: c => { const n = parseInt(c, 10); return n >= 0 && n < 16 ? n : 7; },
    frames: n => { const v = parseFloat(n); return isFinite(v) && String(n).trim() === String(v) ? Math.max(1, Math.round(v * 60)) : '60*' + h.n(n); },
    edge: e => ({ left: 'a.x<0', right: 'a.x+a.w>W', top: 'a.y<0', bottom: 'a.y+a.h>H' }[e] || '(a.x<0||a.x+a.w>W||a.y<0||a.y+a.h>H)'),
    str: s => {                                            // "SCORE {score}"  ->  "SCORE "+score
      s = String(s == null ? '' : s);
      const parts = []; let lit = '', last = 0, m; const re = /\{([A-Za-z_]\w*)\}/g;
      const flush = () => { if (lit) { parts.push(JSON.stringify(lit)); lit = ''; } };
      while ((m = re.exec(s))) {
        lit += s.slice(last, m.index);
        if (vnames.has(m[1])) { flush(); parts.push(m[1]); } else lit += m[0];      // unknown {names} stay as text
        last = re.lastIndex;
      }
      lit += s.slice(last); flush();
      if (!parts.length) return '""';
      if (!/^"/.test(parts[0])) parts.unshift('""');
      return parts.join('+');
    },
    ctx: { a: false, b: false },
    /* apply fn(v) to "this", "the other" or every object of a type */
    who: (w, fn, asExpr) => {
      if (w === '@a' || w === '@b') {
        if (!h.ctx[w[1]]) { err('"this/other object" does not exist in this rule'); return asExpr ? 'false' : ''; }
        return fn(w[1]);
      }
      if (!kn[w]) { err('an object type is missing'); return asExpr ? 'false' : ''; }
      return asExpr ? `all(${kn[w]}).some(q=>${fn('q')})` : `each(${kn[w]},q=>{${fn('q')}});`;
    }
  };

  /* rules */
  let init = '', frame = '';
  (P.rules || []).forEach((rule, idx) => {
    ri = idx;
    const T = VB.trig[rule.when && rule.when.t];
    if (!T) { err('unknown trigger'); return; }
    const c = vctx(rule);
    h.ctx = { a: !!(c.a && T.ctx && T.ctx[0]), b: !!(c.b && T.ctx && T.ctx[1]) };
    try {
      const conds = (rule.ifs || []).map(x => { const r = VB.cond[x.t]; if (!r) { err('unknown condition'); return ''; } return r.g(x, h); }).filter(Boolean);
      const body = (rule.dos || []).map(x => { const r = VB.act[x.t]; if (!r) { err('unknown action'); return ''; } return r.g(x, h); }).join('');
      const code = T.g(rule.when, body, conds.join('&&'), h);
      if (rule.when.t === 'start') init += code + '\n'; else frame += code + '\n';
    } catch (e) { err('internal error: ' + e.message); }
  });
  ri = null;

  /* assemble */
  const lines = [];
  lines.push('// generated by the QRG visual editor');
  (P.kinds || []).forEach(k => lines.push(`const ${kn[k.id]}=kind([${(k.spr || Array(8).fill(0)).join(',')}],${k.c | 0},${k.z | 0 || 1});`));
  lines.push('let ' + vars.map(v => `${v.n}=${Number(v.v) || 0}`).concat(["over=''"]).join(',') + ';');
  lines.push('const init=()=>{');
  lines.push('clear();');
  lines.push(vars.map(v => `${v.n}=${Number(v.v) || 0};`).join('') + "over='';");
  (P.objs || []).forEach(o => { if (kn[o.k]) lines.push(`add(${kn[o.k]},${Math.round(o.x)},${Math.round(o.y)});`); });
  if (init) lines.push(init.trimEnd());
  lines.push('};');
  lines.push('init();');
  const hud = vars.filter(v => v.show).map((v, j) => `t(${JSON.stringify(v.n.toUpperCase() + ' ')}+${v.n},4,${4 + j * 8},7);`).join('');
  const frameBody = [
    `cls(${(P.bg | 0) & 15});`,
    "if(over){draw();tc(over,100,8,2);tc('TAP TO RESTART',116,7);if(i.C)init();return}",
    frame.trimEnd(),
    'step();',
    'draw();',
    hud
  ].filter(Boolean).join('\n');
  if (opts.debug) {
    lines.push('const frame=i=>{\n' + frameBody + '\n};');
    lines.push(`frame.dbg=()=>({${vars.map(v => v.n).concat(['over']).join(',')},k:{${(P.kinds || []).map(k => `${JSON.stringify(k.id)}:${kn[k.id]}`).join(',')}}});`);
    lines.push(`frame.set=(n,v)=>{${vars.map(v => `if(n=='${v.n}')${v.n}=v;`).join('')}};`);
    lines.push('return frame;');
  } else {
    lines.push('return i=>{\n' + frameBody + '\n};');
  }
  return { code: lines.join('\n') + '\n', errors };
}

/* ------------------------------------------------------------------ names, validation, edits used by the editor UI */

/* Short names for the block pickers. */
const VNAMES = {
  trig: { start: 'Game starts', always: 'Every frame', press: 'Button pressed', held: 'Button held', touch: 'Finger on screen', tap: 'Screen tapped',
          tapobj: 'Object tapped', hit: 'Objects touch', edge: 'Reaches an edge', every: 'Every N seconds' },
  cond: { var: 'Variable compare', count: 'Number of objects', chance: 'Random chance', key: 'Button held', pos: 'Position', code: 'JavaScript test' },
  act: { move: 'Move', moveto: 'Put at', follow: 'Follow the finger', speed: 'Set speed', accel: 'Speed up', bounce: 'Bounce', keep: 'Keep on screen',
         destroy: 'Destroy', color: 'Change color', create: 'Create object', setvar: 'Change a variable', sound: 'Play sound', text: 'Show text',
         end: 'End the game', restart: 'Restart', code: 'Run JavaScript' }
};

/* Is the user's text acceptable for this field? (used to mark inputs red while typing) */
function vvalid(group, type, val) {
  val = String(val == null ? '' : val);
  try {
    if (type === 'num') { new Function('return (' + (val.trim() || '0') + '\n)'); return true; }
    if (type === 'js') { if (group === 'cond') new Function('return (' + (val.trim() || 'true') + '\n)'); else new Function(val); return true; }
  } catch (e) { return false; }
  return true;
}

/* Visit every block of every rule: fn(block, registryEntry, group). */
function vforBlocks(P, fn) {
  for (const r of P.rules) {
    fn(r.when, VB.trig[r.when.t], 'trig');
    for (const c of r.ifs || []) fn(c, VB.cond[c.t], 'cond');
    for (const a of r.dos || []) fn(a, VB.act[a.t], 'act');
  }
}

/* Rename a variable in every block that refers to it (typed expressions are left alone). */
function vrenameVar(P, from, to) {
  const v = P.vars.find(x => x.n === from);
  if (!v) return;
  v.n = to;
  vforBlocks(P, (b, reg) => {
    if (!reg) return;
    for (const [name, type] of reg.f) {
      if (type === 'var' && b[name] === from) b[name] = to;
      if (type === 'text' && typeof b[name] === 'string') b[name] = b[name].split('{' + from + '}').join('{' + to + '}');
    }
  });
}

/* Remove a variable and every condition/action that used it. */
function vpurgeVar(P, n) {
  P.vars = P.vars.filter(v => v.n !== n);
  const uses = (b, reg) => reg && reg.f.some(([f, t]) => t === 'var' && b[f] === n);
  for (const r of P.rules) {
    r.ifs = (r.ifs || []).filter(c => !uses(c, VB.cond[c.t]));
    r.dos = (r.dos || []).filter(a => !uses(a, VB.act[a.t]));
  }
}

/* Turns untrusted JSON (a pasted project, old localStorage data) into a well-formed, size-limited project,
   or null when it is not a project at all. */
function vsanitize(q) {
  if (!q || typeof q != 'object' || !Array.isArray(q.kinds) || !Array.isArray(q.objs) || !Array.isArray(q.vars) || !Array.isArray(q.rules)) return null;
  const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  const P = { v: 1, bg: int(q.bg, 0, 15, 1), kinds: [], objs: [], vars: [], rules: [] };
  for (const k of q.kinds.slice(0, 32)) {
    if (!k || typeof k != 'object') continue;
    const id = str(k.id, 12).replace(/\W/g, '');
    if (!id || P.kinds.some(x => x.id === id)) return null;
    P.kinds.push({ id, name: str(k.name, 20) || 'Object', spr: Array.from({ length: 8 }, (_, j) => int(k.spr && k.spr[j], 0, 255, 0)), c: int(k.c, 0, 15, 7), z: int(k.z, 1, 8, 2) });
  }
  for (const o of q.objs.slice(0, 300)) if (o && P.kinds.some(k => k.id === o.k)) P.objs.push({ k: o.k, x: int(o.x, -64, 320, 0), y: int(o.y, -64, 304, 0) });
  for (const v of q.vars.slice(0, 16)) if (v && typeof v.n == 'string') P.vars.push({ n: str(v.n, 24), v: Number(v.v) || 0, show: v.show ? 1 : 0 });
  const clean = b => { const o = {}; for (const [k, val] of Object.entries(b)) o[str(k, 12)] = typeof val == 'number' ? val : str(val, 400); return o; };
  for (const r of q.rules.slice(0, 100)) {
    if (!r || !r.when || typeof r.when != 'object' || !VB.trig[r.when.t]) continue;
    P.rules.push({
      when: clean(r.when),
      ifs: (Array.isArray(r.ifs) ? r.ifs : []).slice(0, 12).filter(c => c && VB.cond[c.t]).map(clean),
      dos: (Array.isArray(r.dos) ? r.dos : []).slice(0, 24).filter(a => a && VB.act[a.t]).map(clean)
    });
  }
  return vrepair(P);
}
