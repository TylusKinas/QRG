/* The minifier must never change what a program does. */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadCore, makeEnv, compileGame } = require('./helpers/load.js');

const api = loadCore();
const run = code => vm.runInNewContext('(function(){' + code + '\n})()', { Math, JSON, Array, Object, String, Number });

test('removes comments, indentation and needless spaces', () => {
  assert.equal(api.min('let  a = 1 ;  // c\n  /* x */ if ( a  <  2 ) {\n   return  a + +b ;\n }\n'), 'let a=1;if(a<2){return a+ +b;}');
});

test('keeps the spaces that separate words and identical signs', () => {
  assert.equal(api.min('return typeof x;'), 'return typeof x;');
  assert.equal(api.min('a = b + +c - -d'), 'a=b+ +c- -d');
  assert.equal(api.min('x = a++ + ++b'), 'x=a++ + ++b');
  assert.equal(api.min('for (const k in o) {}'), 'for(const k in o){}');
  assert.equal(api.min('a instanceof B'), 'a instanceof B');
});

test('strings, template literals and regular expressions are copied untouched', () => {
  const s = "t('a  //  b', 1);\nconst q = `x  ${ a + b }  y`;\nconst r = /a  b\\/c[/ ]/g;";
  const m = api.min(s);
  assert.ok(m.includes("'a  //  b'"));
  assert.ok(m.includes('`x  ${ a + b }  y`'));
  assert.ok(m.includes('/a  b\\/c[/ ]/g'));
});

test('division is not mistaken for a regular expression', () => {
  assert.equal(api.min('x = a / b / c'), 'x=a/b/c');
  assert.equal(api.min('x = (a + b) / 2 + y[0] / 3'), 'x=(a+b)/2+y[0]/3');
  assert.equal(api.min('x = a++ / 2'), 'x=a++/2');
});

test('a regular expression after return or an operator is recognised', () => {
  assert.equal(api.min('return /a b/.test(s);'), 'return/a b/.test(s);');     // valid: a regex may follow the keyword directly
  assert.equal(api.min('x = s.replace( /a  b/g , "c" )'), 'x=s.replace(/a  b/g,"c")');
});

test('line breaks that matter are kept (automatic semicolon insertion)', () => {
  assert.equal(api.min('return\n42'), 'return\n42');
  assert.equal(api.min('a = 1\nb = 2\n'), 'a=1\nb=2');
  assert.equal(api.min('x = f\n(1)'), 'x=f\n(1)');
});

test('line breaks that cannot matter are dropped', () => {
  assert.equal(api.min('if (a) {\n  b();\n  c();\n}\n'), 'if(a){b();c();}');
  assert.equal(api.min('f(\n 1,\n 2\n)'), 'f(1,2\n)');
});

test('unterminated input does not hang or throw', () => {
  for (const s of ["'abc", '`abc ${', '/* never closed', '// only comment', 'x = /abc', '"a\\', '']) {
    assert.doesNotThrow(() => api.min(s), s);
  }
});

test('idempotent: min(min(x)) == min(x), also for every demo game', () => {
  for (const g of api.GAMES) assert.equal(api.min(api.min(g.code)), api.min(g.code), g.name);
  for (const s of ["a = b + +c", 'return\n1', 'x = `a ${b + c} d`', 'if (a) {\n b\n}\n']) assert.equal(api.min(api.min(s)), api.min(s), s);
});

const SNIPPETS = [
  'let a = 5, b = 3; return a + +b - -a;',
  'let a = 5; let b = a++ + ++a; return [a, b];',
  'let x = 10; x = x / 2 / 5; return x;',
  'let a = [1, 2, 3]; return a.map(v => v * 2 / 1).join("|");',
  'const s = "a  // b  /* c */ d"; return s;',
  'const n = 3; return `n is ${ n + 1 } and ${ `inner ${ n }` }`;',
  'return "a b c".replace(/\\s+/g, "-") + /x y/.test("x y");',
  'let r = 0; for (const k in {a: 1, b: 2}) r += k.length; for (const v of [1, 2, 3]) r += v; return r;',
  'let a = 1\nlet b = 2\nreturn a + b',
  'function f() {\n  return\n    42\n}\nreturn f()',
  'let t = 0; label: for (let i = 0; i < 5; i++) { for (let j = 0; j < 5; j++) { if (j == 2) continue label; t += j } } return t',
  'const o = { a: 1, b: { c: [1, 2, { d: 4 }] } }; return o.b.c[2].d + o.a;',
  'let v = typeof undefined_thing; let w = void 0; return [v, w === undefined, !!"x", !(1 > 2)];',
  'let i = 3; i -= -1; i = i - -i; i = i + +i; return i;',
  'let a = 1; /* c */ let b = /* d */ 2; return a + b; // end',
  'const f = (a, b = 2, ...r) => a + b + r.length; return f(1) + f(1, 2, 3, 4);',
  'let s = 0; for (let i = 0; i < 10; i++) s += i % 3 ? i : -i; return s;',
  'let a = 5, b = 2; let c = a /b/ 1; return c;',
  'return [1, 2, 3].reduce((p, c) => p + c, 0) / 3 > 1 ? "big" : "small";',
  'let x = 1; x\n++\nx; return x',
  'return JSON.stringify({ "a b": 1, c: "d  e" });'
];

test('minified snippets compute exactly the same results', () => {
  for (const s of SNIPPETS) {
    const m = api.min(s);
    assert.deepEqual(JSON.parse(JSON.stringify(run(m) === undefined ? null : run(m))), JSON.parse(JSON.stringify(run(s) === undefined ? null : run(s))), s + '  ->  ' + m);
  }
});

/* The strongest check: every demo game draws exactly the same pixels, frame by frame, before and after minification. */
function trace(code, frames, seed) {
  const env = makeEnv(api);
  env.L.seed(seed);
  let frameNo = 0;
  env.L.now = () => 1.7e9 + frameNo / 60;                       // a fake clock: games that use the time stay deterministic
  const f = compileGame(env.L, code), I = env.I;
  const hashes = [];
  let rs = seed;
  const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  for (let n = 1; n <= frames; n++) {
    I.T = frameNo = n;
    for (const k of 'lrudabs') { I[k] = rnd() < .3 ? 1 : 0; I[k.toUpperCase()] = I[k] && rnd() < .5 ? 1 : 0; }
    I.x = rnd() * 256; I.y = rnd() * 240; I.t = rnd() < .3 ? 1 : 0; I.C = I.t && rnd() < .5 ? 1 : 0;
    f(I);
    if (n % 25 == 0) { let h = 0; for (const p of env.x.px) h = (h * 31 + p) | 0; hashes.push(h); }
  }
  return hashes.join(',');
}

test('every demo game behaves identically after minification (pixel-exact over 600 frames)', () => {
  for (const g of api.GAMES) {
    const a = trace(g.code, 600, 11), b = trace(api.min(g.code), 600, 11);
    assert.equal(b, a, g.name);
  }
});
