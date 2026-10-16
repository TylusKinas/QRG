<?php
// QRG player. The only PHP on this page: show a link to the extras (e.html) when that file sits next to this one.
$extras = is_file(__DIR__ . '/e.html');
?><!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#000000">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<title>QRG – QR Game Engine</title>
<!-- GENERATED FILE – edit src/ and run: npm run build -->
<style>
/* QRG look: a plain, readable 8-bit style. Hard edges, thick borders, the 16 palette colors, monospace type.
   Shared by the player (index.php) and the extras (e.html). */
:root{
  --k:#000000;--n:#1d2b53;--p:#7e2553;--g:#008751;--b:#ab5236;--d:#5f574f;--s:#c2c3c7;--w:#fff1e8;
  --r:#ff004d;--o:#ffa300;--y:#ffec27;--l:#00e436;--c:#29adff;--v:#83769c;--k2:#ff77a8;--pe:#ffccaa;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--k);color:var(--w);font:700 14px/1.4 "Courier New",Courier,monospace;overflow:hidden}
a{color:var(--c)}
[hidden]{display:none!important}

/* views: every screen is a full-page column */
.v{display:none;position:fixed;inset:0;flex-direction:column;background:var(--k)}
.v.on{display:flex}

/* buttons look like chunky pixel keys */
button,.b,select,input,textarea{font:inherit;border-radius:0}
button,.b{
  color:var(--w);background:var(--d);border:2px solid var(--w);padding:10px 8px;text-align:center;cursor:pointer;
  text-transform:uppercase;letter-spacing:.5px;box-shadow:3px 3px 0 var(--k);text-decoration:none;display:inline-block}
button:active,.b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--k)}
button.pri{background:var(--p)}
button.dng{background:var(--d)}
button.on{background:var(--y);color:var(--k);border-color:var(--k)}
button.sm{padding:6px 8px;font-size:12px}
button:disabled{opacity:.45;cursor:default}

input,select,textarea{color:var(--y);background:var(--k);border:2px solid var(--s)}
input[type=checkbox]{accent-color:var(--y)}
select{color:var(--w);background:var(--n);max-width:100%}

h1{margin:0;padding:12px 12px 6px;font-size:26px;letter-spacing:4px;color:var(--y);text-shadow:3px 3px 0 var(--p)}
h2{margin:0;font-size:15px;color:var(--y);letter-spacing:1px;text-transform:uppercase}

.bar{display:flex;gap:8px;padding:10px;padding-bottom:max(10px,env(safe-area-inset-bottom));background:var(--n);border-top:3px solid var(--s);flex:0 0 auto}
.bar>*{flex:1;padding:10px 4px}
.inf{font-size:12px;color:var(--s);text-align:center;padding:0 10px;white-space:pre-line}
.err{color:var(--r);font-size:12px}
.note{font-size:12px;color:var(--s);font-weight:400;margin:4px 0}

/* overlays */
.md{display:none;position:fixed;inset:0;background:#000c;align-items:center;justify-content:center;z-index:20}
.md.on{display:flex}
.md>div{background:var(--n);border:3px solid var(--w);box-shadow:6px 6px 0 var(--k);padding:12px;display:flex;flex-direction:column;gap:12px;
  max-width:96vw;max-height:92vh;overflow:auto;width:min(560px,96vw)}
.md .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.md .row>*{flex:1}

/* play view */
#fm{flex:1;border:0;width:100%;background:var(--k)}
.hud{position:absolute;top:max(6px,env(safe-area-inset-top));left:6px;right:6px;display:flex;justify-content:space-between;gap:6px;pointer-events:none;z-index:2}
.hud>*{pointer-events:auto;padding:6px 10px;opacity:.85;background:var(--k)}
#blocked{position:absolute;inset:0;display:none;flex-direction:column;gap:12px;align-items:center;justify-content:center;background:#000e;padding:24px;text-align:center;z-index:3}
#blocked.on{display:flex}

/* ---- extra 8-bit flavor ---- */
/* dithered checkerboard behind menus and the intro */
.dither{background-color:var(--k);background-image:
  linear-gradient(45deg,#0d1226 25%,transparent 25%,transparent 75%,#0d1226 75%),
  linear-gradient(45deg,#0d1226 25%,transparent 25%,transparent 75%,#0d1226 75%);
  background-size:8px 8px;background-position:0 0,4px 4px}
/* blinking text cursor after titles */
@keyframes blink{50%{opacity:0}}
h1:after{content:"_";animation:blink 1s steps(1) infinite;color:var(--c)}
@media (prefers-reduced-motion:reduce){h1:after{animation:none}}
/* chunky pixel scrollbars */
*{scrollbar-color:var(--s) var(--k);scrollbar-width:thin}
::-webkit-scrollbar{width:12px;height:12px;background:var(--k)}
::-webkit-scrollbar-thumb{background:var(--s);border:2px solid var(--k)}
::-webkit-scrollbar-corner{background:var(--k)}
/* menu pointer */
#gr .tile:active:before,.card:active:before{content:"► ";color:var(--y)}

/* The player page (index.php): an intro screen and the game view. Builds on retro.css. */
#intro{align-items:center;justify-content:center;gap:14px;padding:20px;text-align:center;overflow:auto}
#intro .logo{font-size:56px;letter-spacing:8px;color:var(--y);text-shadow:5px 5px 0 var(--p);margin:0;padding:0}
#intro .sub{color:var(--c);letter-spacing:2px;font-size:14px}
#intro p{max-width:30em;margin:0;font-weight:400;font-size:14px;line-height:1.5}
#intro .box{border:3px solid var(--s);background:var(--n);padding:12px 14px;box-shadow:5px 5px 0 var(--k)}
#intro .links{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
#intro small{color:var(--s);font-weight:400}
#bad{color:var(--r)}

</style></head><body>

<main id="intro" class="v on dither">
 <h1 class="logo">QRG</h1>
 <div class="sub">QR CODE GAME ENGINE</div>
 <div class="box"><p>A whole game fits inside one QR code. Scan a QRG code with your phone camera and the game starts right here: nothing to install, nothing to sign up for.</p></div>
 <p><small>Every game runs in a sandbox without network access. Your progress stays on this device.</small></p>
 <p id="bad" hidden>⚠ That link does not contain a playable game.</p>
 <div class="links">
<?php if ($extras): ?>
  <a id="more" class="b pri" href="e.html">Games · Editors · Reader</a>
<?php endif; ?>
  <button id="install" hidden>Install app</button>
 </div>
</main>

<main id="play" class="v">
 <iframe id="fm"></iframe>
 <div id="blocked"><div>This browser did not start the game inside a protected frame.</div><div class="inf">You can run it without protection. Only do this for games you trust: unprotected code can read this page's data.</div><button id="pu" class="dng">Run without protection</button></div>
</main>

<script>
/* Deployment config. Set BASE to the URL where you host index.html (must end with '#'). */
const BASE='https://animuok.lt/APPS/G/#';

/* Context-mixing (CM) bit predictor. Integer math only -> encoder and decoder are bit-identical everywhere. */
const SQT=[1,2,3,6,10,16,27,45,73,120,194,310,488,747,1101,1546,2047,2549,2994,3348,3607,3785,3901,3975,4022,4050,4068,4079,4085,4089,4092,4093,4094];
const sq=d=>{if(d>2047)return 4095;if(d<-2047)return 0;const w=d&127;d=(d>>7)+16;return(SQT[d]*(128-w)+SQT[d+1]*w+64)>>7};
const ST=new Int16Array(4096);
{let p=0;for(let x=-2047;x<=2047;x++){const v=sq(x);for(let i=p;i<=v;i++)ST[i]=x;p=v+1}for(let i=p;i<4096;i++)ST[i]=2047}
const ORD=[0,1,2,3,4,6,8],NI=7,TB=22,REC=[];
for(let n=0;n<64;n++)REC.push(Math.floor(32768/(n+1.6)));
function Model(){
 const pr=new Uint16Array(1<<TB).fill(32768),cn=new Uint8Array(1<<TB),w=new Int32Array(256*NI).fill(24000),
 ix=new Int32Array(NI),sv=new Int32Array(NI),h=new Int32Array(NI),hist=[];
 let c0=1,pm=2048,wb=0;
 const ctx=()=>{for(let k=0;k<NI;k++){let a=k+1;for(let j=1;j<=ORD[k];j++)a=Math.imul(a^((hist[hist.length-j]|0)+1),0x1000193);h[k]=a}};
 ctx();
 return{
  p(){let d=0;wb=c0*NI;
   for(let k=0;k<NI;k++){const i=Math.imul(h[k]^Math.imul(c0,0x9E3779B1),0x2545F491)>>>(32-TB);ix[k]=i;sv[k]=ST[pr[i]>>4];d+=sv[k]*w[wb+k]}
   d=Math.floor(d/65536);pm=sq(d>2047?2047:d<-2047?-2047:d);return pm<1?1:pm>4095?4095:pm},
  u(y){const e=(y<<12)-pm;
   for(let k=0;k<NI;k++){w[wb+k]+=(sv[k]*e)>>10;const i=ix[k],n=cn[i];pr[i]+=(((y?65535:0)-pr[i])*REC[n])>>15;if(n<12)cn[i]=n+1}
   c0=c0*2+y;if(c0>=256){hist.push(c0&255);c0=1;ctx()}}
 }
}

/* Shared dictionary the compressor is "primed" with before coding a game.
 * It holds typical patterns of the QRG language and library: NOT the text of the demo games, so the
 * QR sizes reported for them are what a brand-new game costs.
 * !! Changing this text (or the model in cm.js, or the alphabet in base43.js) changes the wire format:
 *    QR codes made before the change will no longer decode. Bump the hosting URL when you do. */
const PRIME = `let x=0,y=0,v=0,n=0,T=0,sc=0,lv=3,over=0,g,c,E=[],B=[];
const init=()=>{x=120;y=100;sc=T=over=0;lv=3};
init();
return i=>{
cls(NAVY);
r(0,0,W,H,0);
if(i.l)x-=2;if(i.r)x+=2;if(i.u)y-=2;if(i.d)y+=2;
if(i.L&&ok(c,px-1,py))px--;
if(i.A||i.S)init();
if(i.C&&tap(0,0,64,64))sc++;
if(over){if(i.A||i.S)init()}
else{T++;
E=E.filter(e=>{e[1]+=v;if(Math.abs(e[0]-x)<9&&Math.abs(e[1]-y)<8){s(100);return 0}return e[1]<H});
B=B.filter(b=>(b[1]-=4)>0);
B.map(b=>r(b[0],b[1],2,6,7));
g.map((v,j)=>v&&r(40+j%10*10,20+(j/10|0)*10,10,10,v));
x=Math.max(8,Math.min(W-24,x));
for(let y=0;y<H;y+=12)r(127,y,2,6,5);
d([60,126,255,255,126,102,102,0],x,y,7,2);
d(SP.heart,x,y,RED,2);
t('SCORE '+sc,4,4,7);t('LIVES '+lv,200,4,7);t(sc,160,34,10);
tc('GAME OVER',100,RED,2);
if(btn('PLAY',90,100,76,24))init();
}
const kPlayer=kind(SP.smile,YELLOW,2),kCoin=kind(SP.coin,ORANGE,2);
add(kCoin,R(W),0,{vy:2});
touch(kPlayer,kCoin,(a,b)=>{kill(b);score++;s(800)});
each(kCoin,a=>{if(a.y>H)kill(a)});
if(every(60))add(kCoin,R(W-16),-16,{vy:1.5});
step();draw();clear();
const map=grid(16,11,0);const D=flood(16,11,ux,uy,3,(x,y)=>map[y*16+x]==1?2:map[y*16+x]>1?null:1);
for(let y=0;y<11;y++)for(let x=0;x<16;x++){}
save('best',score);best=load('best',0);Date.now()/1000;mel([523,659,784,1047],120);
s(500);R(10);rr(1,6);pick(a);Math.min(Math.max(0,x),W);Math.floor(Math.random()*n);
b.some(a=>a[0]==X&&a[1]==Y);a.find(u=>u.x==x&&u.y==y);.forEach(.slice().length`;

/* Minifier: shrinks game source before compression without changing what it does.
 *
 * It is a one-pass scanner that understands strings, template literals, regular expressions and comments:
 *   - comments are dropped;
 *   - indentation and spaces around punctuation are removed (a space stays only where two words or two
 *     identical signs would otherwise fuse: `let a`, `a + +b`, `a - -b`);
 *   - line breaks are kept (automatic semicolon insertion depends on them), except where a break can
 *     never matter: after `;` `{` `,` `(` `[` and before `}` `]`.
 * Names are never renamed, so the result is always the same program. min(min(x)) === min(x).
 */
function min(src) {
  const n = src.length;
  let out = '', i = 0, pend = '';                       // pend: pending whitespace: '' | ' ' | '\n'
  const word = c => c !== undefined && /[\w$]/.test(c);
  const KW = /(?:^|[^\w$.])(?:return|typeof|case|in|of|void|delete|throw|else|do|new|yield|await)$/;

  const flush = next => {                               // decide what the pending whitespace becomes
    if (pend && out) {
      const a = out[out.length - 1];
      if (pend === '\n') {
        if (a !== '\n' && !';{,(['.includes(a) && !'}]'.includes(next)) out += '\n';
      } else if (a !== '\n') {
        if ((word(a) && word(next)) || (a === '+' && next === '+') || (a === '-' && next === '-') || (a === '/' && (next === '/' || next === '*'))) out += ' ';
      }
    }
    pend = '';
  };
  const regexOk = () => {                               // may a '/' here start a regular expression?
    const a = out[out.length - 1];
    if ((a === '+' || a === '-') && out[out.length - 2] === a && /[\w$)\]]/.test(out[out.length - 3] || '')) return false;   // `x++ / 2`
    if (a === undefined || '(,=:[!&|?{};+-*%<>~^\n'.includes(a)) return true;
    return word(a) && KW.test(out);
  };

  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; if (!pend) pend = ' '; continue; }
    if (c === '\n' || c === '\r') { if (c === '\n') pend = '\n'; i++; continue; }
    if (c === ' ' || c === '\t') { if (!pend) pend = ' '; i++; continue; }

    if (c === '"' || c === "'" || c === '`') {          // string or template literal: copied untouched
      flush(c);
      let j = i + 1, depth = 0;
      while (j < n) {
        const e = src[j];
        if (e === '\\') { j += 2; continue; }
        if (c === '`' && e === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
        if (c === '`' && depth && e === '}') { depth--; j++; continue; }
        if (e === c && !depth) break;
        j++;
      }
      out += src.slice(i, j + 1); i = j + 1;
      continue;
    }
    if (c === '/' && regexOk()) {                       // regular expression literal: copied untouched
      flush(c);
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') {
        const e = src[j];
        if (e === '\\') { j += 2; continue; }
        if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/.test(src[j])) j++;
      out += src.slice(i, j); i = j;
      continue;
    }
    flush(c);
    out += c; i++;
  }
  return out.replace(/\n+$/, '');
}

/* Codec: minify -> CM compress (primed with PRIME) -> bytes, and back.
   The compressed stream ends with a NUL terminator that is coded like any byte; trailing zero bytes are dropped. */
const U8=new TextEncoder(),D8=new TextDecoder();
const mkm=()=>{const m=Model();for(const b of U8.encode(PRIME))for(let i=7;i>=0;i--){m.p();m.u(b>>i&1)}return m};
const mid=(a,b,p)=>{const r=b-a;return a+Math.floor(r/4096)*p+Math.floor(r%4096*p/4096)};
function pack(s){
 const m=mkm();let x1=0,x2=4294967295;const o=[];
 for(const b of [...U8.encode(s),0])for(let i=7;i>=0;i--){
  const y=b>>i&1,xm=mid(x1,x2,m.p());y?x2=xm:x1=xm+1;m.u(y);
  while(((x1^x2)&0xff000000)==0){o.push(x2>>>24);x1=(x1<<8)>>>0;x2=((x2<<8)|255)>>>0}}
 for(let k=0;k<5;k++){const u=2**(32-8*k),v=Math.ceil(x1/u)*u;if(v<=x2){for(let j=0;j<k;j++)o.push(Math.floor(v/2**(24-8*j))&255);break}}
 while(o.length&&!o[o.length-1])o.pop();
 return o}
function unpack(o){
 const m=mkm();let i=0,x=0,x1=0,x2=4294967295;const nx=()=>o[i++]|0,B=[];
 for(let k=0;k<4;k++)x=x*256+nx();
 for(;;){let c=0;
  for(let b=0;b<8;b++){
   const xm=mid(x1,x2,m.p()),y=x<=xm?1:0;y?x2=xm:x1=xm+1;m.u(y);c=c*2+y;
   while(((x1^x2)&0xff000000)==0){x1=(x1<<8)>>>0;x2=((x2<<8)|255)>>>0;x=((x<<8)|nx())>>>0}}
  if(!c||B.length>9000)break;B.push(c)}
 return D8.decode(new Uint8Array(B))}

/* URL-safe variant: no space or % (43 symbols, still inside the QR alphanumeric set) */
const A43='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
const b43=o=>{let s='';for(let i=0;i<o.length;i+=2){if(i+1<o.length){const n=o[i]*256+o[i+1];s+=A43[n%43]+A43[(n/43|0)%43]+A43[n/1849|0]}else s+=A43[o[i]%43]+A43[o[i]/43|0]}return s};
const d43=s=>{const o=[];for(let i=0;i<s.length;i+=3){const a=[...s.slice(i,i+3)].map(c=>{const k=A43.indexOf(c);if(k<0)throw Error('bad symbol');return k});if(a.length==3){const n=a[0]+a[1]*43+a[2]*1849;o.push(n>>8,n&255)}else o.push(a[0]+a[1]*43)}return o};

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

/* Built-in sprite library.
   Every sprite is 8x8, one bit per pixel, drawn here as ASCII art ('#' = pixel) and
   converted to 8 bytes (one per row, most significant bit = leftmost pixel).
   In a game use them by name:  d(SP.heart, x, y, color, scale)  or  d('heart', x, y, color). */
const SPRITE_ART = {
  heart:    ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
  star:     ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '##....##', '........'],
  coin:     ['..####..', '.#....#.', '#..##..#', '#.####.#', '#.####.#', '#..##..#', '.#....#.', '..####..'],
  skull:    ['.######.', '########', '#..##..#', '#..##..#', '########', '.######.', '.#.##.#.', '..####..'],
  sword:    ['......##', '.....###', '....###.', '#..###..', '.####...', '..##....', '.#.#....', '#...#...'],
  shield:   ['########', '###..###', '#......#', '#......#', '###..###', '.##..##.', '..####..', '...##...'],
  tree:     ['..####..', '.######.', '########', '########', '.######.', '...##...', '...##...', '..####..'],
  house:    ['...##...', '..####..', '.######.', '########', '########', '###..###', '###..###', '###..###'],
  apple:    ['....#...', '...#....', '.######.', '########', '########', '########', '.######.', '..#..#..'],
  fish:     ['........', '..###..#', '.#######', '########', '.#######', '..###..#', '........', '........'],
  bone:     ['........', '##....##', '########', '########', '##....##', '........', '........', '........'],
  ball:     ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'],
  ring:     ['..####..', '.#....#.', '#......#', '#......#', '#......#', '#......#', '.#....#.', '..####..'],
  gem:      ['..####..', '.#.##.#.', '########', '.######.', '..####..', '...##...', '........', '........'],
  key:      ['.####...', '##..##..', '##..##..', '.####...', '..##....', '..###...', '..##....', '..###...'],
  flag:     ['#####...', '######..', '#######.', '######..', '#####...', '#.......', '#.......', '#.......'],
  up:       ['...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...', '...##...'],
  plus:     ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...'],
  cross:    ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'],
  check:    ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
  smile:    ['..####..', '.######.', '##.##.##', '########', '#.####.#', '##....##', '.######.', '..####..'],
  sad:      ['..####..', '.######.', '##.##.##', '########', '##....##', '#.####.#', '.######.', '..####..'],
  sun:      ['...##...', '#..##..#', '.######.', '.######.', '.######.', '.######.', '#..##..#', '...##...'],
  moon:     ['..###...', '.###....', '###.....', '###.....', '###.....', '###.....', '.###....', '..####..'],
  cloud:    ['........', '...##...', '.######.', '########', '########', '.######.', '........', '........'],
  drop:     ['...#....', '...#....', '..###...', '.#####..', '#######.', '#######.', '.#####..', '..###...'],
  flame:    ['...#....', '..##....', '..###...', '.####.#.', '.#######', '########', '.######.', '..####..'],
  mushroom: ['..####..', '.######.', '##.##.##', '########', '..####..', '..####..', '..####..', '........'],
  poop:     ['........', '....#...', '...###..', '..#####.', '.#######', '########', '########', '........'],
  zzz:      ['######..', '...##...', '..##....', '.##.....', '######..', '........', '........', '........'],
  meat:     ['...###..', '..#####.', '.#######', '.#######', '..#####.', '..##....', '.##.....', '##......'],
  knight:   ['...##...', '..####..', '.######.', '.#.##.#.', '.######.', '.######.', '..####..', '.######.'],
  archer:   ['.##.....', '#..#.##.', '#..#.##.', '#..####.', '#..#.##.', '#..#.##.', '.##..##.', '.....##.'],
  rider:    ['..#.....', '.###....', '.####...', '##.###..', '######..', '.#####..', '..####..', '..#..#..'],
  rock:     ['...##...', '..####..', '..####..', '.######.', '.######.', '########', '########', '........'],
  wave:     ['........', '.##..##.', '#..##..#', '........', '.##..##.', '#..##..#', '........', '........'],
  block:    ['########', '########', '########', '########', '########', '########', '########', '########'],
};

const spriteBytes = art => art.map(row => parseInt(row.replace(/#/g, '1').replace(/\./g, '0'), 2));
const spriteRotate = b => { // 90 degrees clockwise
  const o = Array(8).fill(0);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (b[y] >> (7 - x) & 1) o[x] |= 1 << y;
  return o;
};

const SP = {};
for (const k in SPRITE_ART) SP[k] = spriteBytes(SPRITE_ART[k]);
SP.right = spriteRotate(SP.up);
SP.down = spriteRotate(SP.right);
SP.left = spriteRotate(SP.down);

/* QRG standard library
 * ====================
 * Everything a game can call. `makeLib(env)` returns an object whose members are placed in scope of the
 * game code with `with(lib){ ... }`, so a game may freely declare its own variables with the same names.
 *
 * makeLib is stringified into the sandboxed iframe, so it must stay completely self-contained:
 * it may only use what arrives through `env` (see below) and standard JavaScript globals.
 *
 *   env.x      2D canvas context (256x240 pixels)
 *   env.I      the live input object (also passed to the frame function)
 *   env.PAL    palette (array of 16 CSS colors)
 *   env.SP     sprite library (name -> 8 bytes)
 *   env.FONT   {g: glyph characters, f: glyph bitmaps}
 *   env.COLORS names of the 16 palette colors (become constants BLACK ... PEACH)
 *   env.save   (key, value) => void   persistent storage hook (optional)
 *   env.load   key => value           persistent storage hook (optional)
 *
 * Every public member must have an entry in src/engine/libdoc.js (a test enforces it).
 */

const PAL = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
             '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];

const COLOR_NAMES = ['BLACK', 'NAVY', 'PURPLE', 'GREEN', 'BROWN', 'GRAY', 'SILVER', 'WHITE',
                     'RED', 'ORANGE', 'YELLOW', 'LIME', 'BLUE', 'LAVENDER', 'PINK', 'PEACH'];

/* 3x5 pixel font. Each glyph is five octal digits: one per row, 3 bits per row (bit 2 = left pixel). */
const FONT = {
  g: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:.-! /+%?,=><()*\'#_',
  f: ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71122', '75757', '75717',
      '25755', '65656', '34443', '65556', '74647', '74644', '34553', '55755', '72227', '11152', '55655', '44447', '57755',
      '65555', '25552', '65644', '25563', '65655', '34216', '72222', '55557', '55552', '55775', '55255', '55222', '71247',
      '02020', '00002', '00700', '22202', '00000',
      '11244', '02720', '51245', '71302', '00024', '07070', '42124', '12421', '24442', '21112', '05250', '22000', '57575', '00007']
};

function makeLib(env) {
  const { x, I, PAL, SP, FONT } = env, W = 256, H = 240;
  const L = Object.create(null);

  /* ---------------------------------------------------------------- drawing */
  const col = k => PAL[k] || PAL[7];

  const r = (u, v, w, h, k) => {                        // filled rectangle (rounded so neighbours never leave gaps)
    const X = Math.round(u), Y = Math.round(v);
    x.fillStyle = col(k);
    x.fillRect(X, Y, Math.round(u + w) - X, Math.round(v + h) - Y);
  };
  const cls = k => r(0, 0, W, H, k || 0);
  const box = (u, v, w, h, k) => { r(u, v, w, 1, k); r(u, v + h - 1, w, 1, k); r(u, v, 1, h, k); r(u + w - 1, v, 1, h, k); };

  const line = (a, b, c, e, k) => {                     // Bresenham
    a = Math.round(a); b = Math.round(b); c = Math.round(c); e = Math.round(e);
    const dx = Math.abs(c - a), dy = -Math.abs(e - b), sx = a < c ? 1 : -1, sy = b < e ? 1 : -1;
    let er = dx + dy;
    for (let n = 0; n < 1000; n++) {
      r(a, b, 1, 1, k);
      if (a == c && b == e) break;
      const e2 = 2 * er;
      if (e2 >= dy) { er += dy; a += sx; }
      if (e2 <= dx) { er += dx; b += sy; }
    }
  };
  const circ = (cx, cy, q, k) => {                      // filled circle
    q = Math.round(q);
    for (let y = -q; y <= q; y++) { const w = Math.floor(Math.sqrt(q * q - y * y)); r(cx - w, cy + y, 2 * w + 1, 1, k); }
  };
  const ring = (cx, cy, q, k) => {                      // circle outline (midpoint algorithm)
    q = Math.round(q);
    let a = q, b = 0, er = 1 - q;
    while (a >= b) {
      [[a, b], [b, a], [-b, a], [-a, b], [-a, -b], [-b, -a], [b, -a], [a, -b]].map(([p, o]) => r(cx + p, cy + o, 1, 1, k));
      b++;
      if (er < 0) er += 2 * b + 1; else { a--; er += 2 * (b - a) + 1; }
    }
  };

  const tw = (s, z) => Math.max(0, String(s).length * 4 - 1) * (z || 1);   // width of a text in pixels
  const t = (s, u, v, k, z) => {
    z = z || 1; u = Math.round(u); v = Math.round(v);
    x.fillStyle = col(k);
    const str = String(s).toUpperCase();
    for (let n = 0; n < str.length; n++) {
      const g = FONT.f[FONT.g.indexOf(str[n])];
      if (!g) continue;
      for (let j = 0; j < 5; j++) {
        const b = +g[j];
        for (let q = 0; q < 3; q++) if (b >> (2 - q) & 1) x.fillRect(u + n * 4 * z + q * z, v + j * z, z, z);
      }
    }
  };
  const tc = (s, v, k, z) => t(s, (W - tw(s, z)) / 2, v, k, z);

  const d = (b, u, v, k, z) => {                        // 8x8 sprite: 8 bytes or a name from SP
    if (typeof b == 'string') b = SP[b];
    if (!b) return;
    z = z || 1;
    for (let y = 0; y < 8; y++) {
      const row = b[y] | 0;
      for (let q = 0; q < 8; q++) {
        if (row >> (7 - q) & 1) {                       // draw each horizontal run as one rectangle
          let e = q + 1;
          while (e < 8 && row >> (7 - e) & 1) e++;
          r(u + q * z, v + y * z, (e - q) * z, z, k);
          q = e;
        }
      }
    }
  };
  const flip = b => (typeof b == 'string' ? SP[b] : b).map(row => {
    let o = 0;
    for (let q = 0; q < 8; q++) if (row >> q & 1) o |= 1 << (7 - q);
    return o;
  });

  const bar = (u, v, w, h, val, max, k) => {            // progress bar; color turns yellow/red when low unless k is given
    const f = clamp(val / (max || 100), 0, 1);
    r(u, v, w, h, 0); box(u, v, w, h, 5);
    r(u + 1, v + 1, Math.round((w - 2) * f), h - 2, k == null ? (f > .5 ? 11 : f > .25 ? 10 : 8) : k);
  };

  /* ---------------------------------------------------------------- input helpers */
  const inb = (px, py, u, v, w, h) => px >= u && px < u + w && py >= v && py < v + h;
  const tap = (u, v, w, h) => !!I.C && inb(I.x, I.y, u, v, w, h);      // finger went down inside the rectangle this frame
  const over = (u, v, w, h) => !!I.t && inb(I.x, I.y, u, v, w, h);     // finger is down inside the rectangle
  const btn = (label, u, v, w, h, k) => {                               // draws a button, returns true when tapped
    const dn = over(u, v, w, h);
    r(u, v, w, h, dn ? 6 : k == null ? 5 : k);
    box(u, v, w, h, 7);
    t(label, u + (w - tw(label)) / 2, v + (h - 5) / 2, dn ? 0 : 7);
    return tap(u, v, w, h);
  };

  /* ---------------------------------------------------------------- random & math */
  let rs = null;                                        // null = Math.random, number = seeded generator state
  const rand = () => {
    if (rs === null) return Math.random();
    rs = (rs + 0x6D2B79F5) | 0;
    let q = Math.imul(rs ^ rs >>> 15, 1 | rs);
    q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
    return ((q ^ q >>> 14) >>> 0) / 4294967296;
  };
  const seed = n => { rs = n | 0; };
  const R = n => rand() * n | 0;
  const rr = (a, b) => a + R(b - a + 1);
  const pick = a => a[R(a.length)];
  const shuf = a => {
    const b = a.slice();
    for (let j = b.length - 1; j > 0; j--) { const k = R(j + 1); [b[j], b[k]] = [b[k], b[j]]; }
    return b;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const dist = (a, b, c, e) => Math.hypot(c - a, e - b);
  const sign = Math.sign;
  const wrap = (v, n) => (v % n + n) % n;
  const every = n => I.T % Math.max(1, Math.round(n)) == 0;          // true once every n frames (60 frames = 1 second)
  const now = () => Date.now() / 1000;                                // wall clock in seconds

  /* ---------------------------------------------------------------- actors (moving objects) */
  let AC = [];
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const kind = (spr, c, z) => { z = z || 1; return { spr, c: c == null ? 7 : c, z }; };
  const add = (k, u, v, p) => {
    const a = Object.assign({ k, x: u, y: v, vx: 0, vy: 0, w: 8 * k.z, h: 8 * k.z, c: k.c, on: 1 }, p);
    AC.push(a);
    return a;
  };
  const all = k => AC.filter(a => a.on && (!k || a.k === k));
  const each = (k, f) => all(k).map(f);
  const kill = a => { a.on = 0; };
  const touch = (k1, k2, f) => all(k1).map(a => all(k2).map(b => { if (a !== b && a.on && b.on && hit(a, b)) f(a, b); }));
  const step = () => { for (const a of AC) if (a.on) { a.x += a.vx; a.y += a.vy; } AC = AC.filter(a => a.on); };
  const draw = () => AC.map(a => a.on && d(a.k.spr, a.x, a.y, a.c, a.k.z));
  const clear = () => { AC = []; };

  /* ---------------------------------------------------------------- grids & path finding */
  const grid = (c, rw, v) => { const g = Array(c * rw).fill(v == null ? 0 : v); g.c = c; g.r = rw; return g; };
  const gget = (g, u, v) => u < 0 || v < 0 || u >= g.c || v >= g.r ? -1 : g[v * g.c + u];
  const gset = (g, u, v, val) => { if (u >= 0 && v >= 0 && u < g.c && v < g.r) g[v * g.c + u] = val; };
  const flood = (c, rw, sx, sy, max, cost) => {         // cheapest cost from (sx,sy) to every cell, -1 = unreachable
    const D = Array(c * rw).fill(-1), q = [[sx, sy]];
    D[sy * c + sx] = 0;
    while (q.length) {
      let bi = 0;
      for (let j = 1; j < q.length; j++) if (D[q[j][1] * c + q[j][0]] < D[q[bi][1] * c + q[bi][0]]) bi = j;
      const [cx, cy] = q.splice(bi, 1)[0], dc = D[cy * c + cx];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= c || ny >= rw) continue;
        const k = cost ? cost(nx, ny) : 1;
        if (typeof k != 'number' || !(k >= 0) || k === Infinity) continue;   // blocked
        const nd = dc + k;
        if (max != null && nd > max) continue;
        if (D[ny * c + nx] < 0 || nd < D[ny * c + nx]) { D[ny * c + nx] = nd; q.push([nx, ny]); }
      }
    }
    return D;
  };

  /* ---------------------------------------------------------------- sound */
  let ctxA = null;
  const ac = () => ctxA || (ctxA = new (window.AudioContext || window.webkitAudioContext)());
  const tone = (hz, ms, type, at) => {
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (at || 0);
      o.type = type || 'square'; o.frequency.value = hz;
      g.gain.setValueAtTime(.05, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + ms / 1000);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + ms / 1000);
    } catch (e) { /* no audio available */ }
  };
  const s = (hz, ms, type) => tone(hz, ms || 70, type);
  const mel = (notes, ms, type) => notes.map((hz, j) => hz && tone(hz, ms || 100, type, j * (ms || 100) / 1000));
  const resume = () => { try { const a = ac(); if (a.state == 'suspended') a.resume(); } catch (e) { /* ignore */ } };

  /* ---------------------------------------------------------------- persistent storage */
  const save = (k, v) => { if (env.save) env.save(String(k), v); };
  const load = (k, def) => { const v = env.load ? env.load(String(k)) : undefined; return v === undefined ? def : v; };

  const colors = {};                                    // BLACK=0 ... PEACH=15
  (env.COLORS || []).forEach((n, k) => { colors[n] = k; });

  Object.assign(L, colors, {
    W, H, SP, PAL,
    r, cls, box, line, circ, ring, bar, t, tc, tw, d, flip,
    inb, tap, over, btn,
    rand, seed, R, rr, pick, shuf, clamp, lerp, dist, sign, wrap, every, now,
    hit, kind, add, all, each, kill, touch, step, draw, clear,
    grid, gget, gset, flood,
    s, mel, resume, save, load
  });
  return L;
}

/* Console runtime
 * ===============
 * Runs inside the game iframe: input (on-screen pad, keyboard, touch gestures), the fixed 60 Hz game loop,
 * the bridge to the parent page (errors, persistent storage, test hooks) and compilation of the game code.
 * It is stringified into the iframe document together with makeLib, so it may only use makeLib,
 * the DOM and standard globals.
 *
 * Messages to the parent (untrusted by the parent):
 *   {q:'ready'}            game code was compiled and started
 *   {q:'err', m}           compile or runtime error
 *   {q:'save', k, v}       persistent storage request
 *   {q:'snap', px, fr, ok} reply to a 'snap' request: number of non-black pixels, frame counter, running flag
 * Messages from the parent (only accepted from window.parent):
 *   {q:'in', k, v}         press/release a pad button (l r u d a b s)
 *   {q:'ptr', x, y, t}     move the finger (screen coordinates) and set whether it is down
 *   {q:'snap'}             request a frame snapshot summary
 */
function eng(code, cfg) {
  const W = 256, H = 240, c = document.getElementById('c'), x = c.getContext('2d');
  const I = { x: 0, y: 0, t: 0, C: 0, T: 0 };
  const K = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };      // held state of the pad / keyboard
  const pl = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };     // touch-gesture pulses: frames left (counts as held)
  const pe = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };     // touch-gesture press events (one per swipe segment / tap)
  const hc = {}, SV = cfg.sv || {};
  let f = 0, last = 0, acc = 0, tc = 0;

  const post = m => { try { parent.postMessage(m, '*'); } catch (e) { /* no parent */ } };
  /* the RESET key appears only for games that use memory */
  const used = () => { const b = document.getElementById('rs'); if (b) b.classList.add('use'); };
  const L = makeLib({
    x, I, PAL: cfg.pal, SP: cfg.sp, FONT: cfg.font, COLORS: cfg.colors,
    save: (k, v) => { used(); SV[k] = v; post({ q: 'save', k, v }); },
    load: k => { used(); return SV[k]; }
  });

  const fail = e => {
    const m = String(e && e.message || e);
    f = 0; L.cls(0); L.t('ERROR', 8, 8, 8, 2);
    (m.toUpperCase().match(/.{1,30}/g) || []).map((s, i) => L.t(s, 8, 30 + i * 8, 7));
    post({ q: 'err', m });
  };

  /* keyboard */
  const key = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', KeyZ: 'a', Space: 'a', KeyX: 'b', Enter: 's' };
  addEventListener('keydown', e => { if (key[e.code]) { K[key[e.code]] = 1; e.preventDefault(); L.resume(); } });
  addEventListener('keyup', e => { if (key[e.code]) K[key[e.code]] = 0; });

  /* on-screen pad: A / B / Start buttons */
  document.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k, up = () => { K[k] = 0; b.classList.remove('on'); };
    b.onpointerdown = e => { e.preventDefault(); K[k] = 1; b.classList.add('on'); if (b.setPointerCapture) b.setPointerCapture(e.pointerId); L.resume(); };
    b.onpointerup = b.onpointercancel = up;
  });
  /* RESET key: press twice within 3 seconds to make the page forget what this game saved */
  const rs = document.getElementById('rs');
  if (rs) {
    let armed = 0;
    rs.onpointerdown = e => {
      e.preventDefault();
      if (armed) { armed = 0; rs.textContent = 'RESET'; post({ q: 'reset' }); return; }
      armed = 1; rs.textContent = 'SURE?';
      setTimeout(() => { armed = 0; rs.textContent = 'RESET'; }, 3000);
    };
  }
  /* on-screen pad: the cross works like a joystick (slide the thumb between directions) */
  const dp = document.getElementById('dp');
  const dpd = e => {
    const b = dp.getBoundingClientRect(), dx = (e.clientX - b.left) / b.width - .5, dy = (e.clientY - b.top) / b.height - .5;
    K.l = dx < -.14 ? 1 : 0; K.r = dx > .14 ? 1 : 0; K.u = dy < -.14 ? 1 : 0; K.d = dy > .14 ? 1 : 0;
  };
  dp.onpointerdown = e => { e.preventDefault(); dp.setPointerCapture(e.pointerId); dpd(e); L.resume(); };
  dp.onpointermove = e => { if (e.buttons || e.pressure) dpd(e); };
  dp.onpointerup = dp.onpointercancel = () => { K.l = K.r = K.u = K.d = 0; };

  /* touch on the screen: position, swipe -> directions (repeats while dragging), tap -> A */
  const q = e => { const b = c.getBoundingClientRect(); I.x = (e.clientX - b.left) / b.width * W; I.y = (e.clientY - b.top) / b.height * H; };
  let gx = 0, gy = 0, gt = 0, gs = 0;
  c.onpointerdown = e => {
    q(e); I.t = 1; tc = 1; gx = e.clientX; gy = e.clientY; gt = Date.now(); gs = 0;
    if (c.setPointerCapture) c.setPointerCapture(e.pointerId);
    L.resume();
  };
  c.onpointermove = e => {
    q(e);
    if (!I.t) return;
    const dx = e.clientX - gx, dy = e.clientY - gy;
    if (Math.hypot(dx, dy) > 22) { const k = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); pl[k] = 4; pe[k] = 1; gs = 1; gx = e.clientX; gy = e.clientY; }
  };
  c.onpointerup = c.onpointercancel = () => { I.t = 0; if (!gs && Date.now() - gt < 350) { pl.a = 4; pe.a = 1; } };

  /* messages from the parent page (tests and tooling) */
  addEventListener('message', e => {
    if (e.source !== parent) return;
    const m = e.data || {};
    if (m.q === 'in' && K[m.k] !== undefined) K[m.k] = m.v ? 1 : 0;
    else if (m.q === 'ptr') { I.x = +m.x || 0; I.y = +m.y || 0; I.t = m.t ? 1 : 0; if (m.t) tc = 1; }
    else if (m.q === 'snap') {
      const px = x.getImageData(0, 0, W, H).data;
      let n = 0;
      for (let j = 0; j < px.length; j += 4) if (px[j] | px[j + 1] | px[j + 2]) n++;
      post({ q: 'snap', px: n, fr: I.T, ok: f ? 1 : 0 });
    }
  });

  /* compile the game: user variables shadow library names because the library sits in a `with` scope */
  try {
    f = new Function('L', 'with(L){' + code + '\n}')(L);
    if (typeof f != 'function') throw Error('the game must end with: return i => { ... }');
  } catch (e) { fail(e); }
  post({ q: 'ready' });

  /* fixed 60 Hz loop (also correct on 120 Hz screens) */
  const loop = n => {
    requestAnimationFrame(loop);
    if (!f) return;
    acc += Math.min(n - last, 100); last = n;
    for (; acc >= 16.7; acc -= 16.7) {
      for (const k in K) {
        const h = K[k] || pl[k] > 0;
        if (pl[k] > 0) pl[k]--;
        hc[k] = h ? (hc[k] | 0) + 1 : 0;
        I[k] = h ? 1 : 0;
        const rep = K[k] && 'lrud'.includes(k) && hc[k] > 12 && (hc[k] - 12) % 4 == 0;   // auto-repeat only for real held keys
        I[k.toUpperCase()] = hc[k] == 1 || pe[k] || rep ? 1 : 0;
        pe[k] = 0;
      }
      I.C = tc; tc = 0; I.T++;
      try { f(I); } catch (e) { fail(e); return; }
    }
  };
  requestAnimationFrame(loop);
}

/* Game document builder
 * =====================
 * buildGameDoc(code, opts) returns the HTML of the iframe that runs one game: the console (screen + pad),
 * the library, the runtime and the game code. The iframe is meant to be sandboxed with `allow-scripts` only
 * (opaque origin) and carries a Content-Security-Policy that blocks every network request.
 *   opts.mini  hide the pad (editor previews)
 *   opts.sv    saved values for this game ({key: value})
 */
const CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'";

const CONSOLE_CSS = `
html,body{margin:0;height:100%;background:#1a1a22;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;font:700 11px system-ui,sans-serif;color:#889}
body{display:flex;flex-direction:column;align-items:center;padding-top:46px}
#sc{width:min(calc(100vw - 16px),calc((100vh - 270px)*1.0667));border:6px solid #000;border-radius:10px;box-shadow:0 0 0 2px #333;position:relative;background:#000}
#sc:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(#0000 0 2px,#0002 2px 3px)}
canvas{display:block;width:100%;aspect-ratio:256/240;image-rendering:pixelated}
#pad{flex:1;width:100%;max-width:520px;display:flex;align-items:center;justify-content:space-around;padding:0 12px}
#dp{width:136px;height:136px;position:relative}
#dp:before,#dp:after{content:"";position:absolute;background:#333;border-radius:8px}
#dp:before{left:0;right:0;top:38px;bottom:38px}#dp:after{top:0;bottom:0;left:38px;right:38px}
#mid{display:flex;gap:10px}
#mid{flex-direction:column;align-items:center}
#mid b{background:#333;border-radius:20px;padding:8px 12px;color:#aaa;font-size:10px}
#ab{display:flex;gap:14px;transform:rotate(-18deg)}
#ab b{width:58px;height:58px;border-radius:50%;background:#a22;color:#fcc;display:flex;align-items:center;justify-content:center;font-size:18px}
#rs{display:none;font-size:9px!important;background:#222!important;color:#778!important}
#rs.use{display:block}
b.on{filter:brightness(1.7)}`;

const MINI_CSS = 'body{padding-top:4px}#pad{display:none}#sc{width:min(calc(100vw - 12px),calc((100vh - 16px)*1.0667))}';

// JSON that is safe inside an inline <script>
const J = v => JSON.stringify(v).replace(/</g, '\\u003c');

function buildGameDoc(code, opts) {
  opts = opts || {};
  const cfg = { pal: PAL, sp: SP, font: FONT, colors: COLOR_NAMES, sv: opts.sv || {} };
  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">' +
    '<style>' + CONSOLE_CSS + (opts.mini ? MINI_CSS : '') + '</style></head><body>' +
    '<div id="sc"><canvas id="c" width="256" height="240"></canvas></div>' +
    '<div id="pad"><div id="dp"></div><div id="mid"><b data-k="s">START</b><b id="rs">RESET</b></div>' +
    '<div id="ab"><b data-k="b">B</b><b data-k="a">A</b></div></div>' +
    '<script>const makeLib=' + makeLib + ';(' + eng + ')(' + J(code) + ',' + J(cfg) + ')<\/script></body></html>';
}

</script>
<script>
/* Game runner (parent-page side)
 * ==============================
 * Runs a game in an iframe and talks to it through postMessage:
 *  - the iframe is sandboxed with `allow-scripts` only (opaque origin: no cookies, no storage, no access to this
 *    page) and has a Content-Security-Policy that blocks all network access (see shell.js);
 *  - persistent storage for save()/load() lives HERE (localStorage), reached only through validated messages;
 *  - `unsafe: true` removes the sandbox (offered to the user only when a browser refuses to start sandboxed frames).
 * Messages from games are untrusted data: they are length-checked and never interpreted as HTML.
 */
const Runner = (() => {
  const frames = new Map();                    // iframe element -> run state
  const PREFIX = 'qrg:g:';                     // localStorage key prefix; then <game id>:<key>
  const MAX_KEYS = 32, MAX_VALUE = 1500;       // storage limits per game

  const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const gameId = code => fnv(min(code));

  const store = {
    keys(gid) {
      const out = [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PREFIX + gid + ':')) out.push(k); } } catch (e) { /* storage blocked */ }
      return out;
    },
    all(gid) {
      const o = {};
      for (const k of store.keys(gid)) { try { o[k.slice(PREFIX.length + gid.length + 1)] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* skip */ } }
      return o;
    },
    clear(gid) { for (const k of store.keys(gid)) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } },
    set(gid, k, v) {
      if (typeof k != 'string' || !k || k.length > 40) return;
      try {
        const key = PREFIX + gid + ':' + k;
        if (v === undefined) { localStorage.removeItem(key); return; }
        const json = JSON.stringify(v);
        if (json.length > MAX_VALUE) return;
        if (localStorage.getItem(key) === null && store.keys(gid).length >= MAX_KEYS) return;
        localStorage.setItem(key, json);
      } catch (e) { /* storage blocked or full */ }
    }
  };

  function stop(frame) {
    const st = frames.get(frame);
    if (st) { clearTimeout(st.timer); frames.delete(frame); }
    frame.srcdoc = '';
  }

  /* opts: mini (hide pad), unsafe (no sandbox), onready(), onerr(message), onblocked() */
  function run(frame, code, opts) {
    opts = opts || {};
    stop(frame);
    const gid = gameId(code), st = { gid, code, ready: false, opts, waits: [], timer: 0 };
    frames.set(frame, st);
    if (opts.unsafe) frame.removeAttribute('sandbox'); else frame.setAttribute('sandbox', 'allow-scripts');
    frame.srcdoc = buildGameDoc(code, { mini: opts.mini, sv: store.all(gid) });
    if (opts.onblocked) st.timer = setTimeout(() => { if (!st.ready) opts.onblocked(); }, 2500);
    return st;
  }

  const send = (frame, msg) => { try { frame.contentWindow.postMessage(msg, '*'); } catch (e) { /* frame gone */ } };

  /* Test hook: resolves with {px, fr, ok} – non-black pixel count, frame counter, running flag. */
  function snap(frame) {
    return new Promise(res => {
      const st = frames.get(frame);
      if (!st) return res(null);
      const t = setTimeout(() => res(null), 2500);
      st.waits.push(m => { clearTimeout(t); res(m); });
      send(frame, { q: 'snap' });
    });
  }

  addEventListener('message', e => {
    for (const [fr, st] of frames) {
      if (fr.contentWindow !== e.source) continue;
      const m = e.data;
      if (!m || typeof m != 'object') return;
      if (m.q === 'ready') { st.ready = true; clearTimeout(st.timer); if (st.opts.onready) st.opts.onready(); }
      else if (m.q === 'err') { if (st.opts.onerr) st.opts.onerr(String(m.m).slice(0, 400)); }
      else if (m.q === 'reset') { store.clear(st.gid); run(fr, st.code, st.opts); }
      else if (m.q === 'save') store.set(st.gid, m.k, m.v);
      else if (m.q === 'snap') { const w = st.waits.shift(); if (w) w(m); }
      else if (m.q === 'probe') {                          // sandbox self-test results (tests/programs/sandbox-probe.js)
        const list = window.__probes = window.__probes || [];
        list.push({ k: String(m.k).slice(0, 40), v: String(m.v).slice(0, 40) });
        if (list.length > 50) list.shift();
      }
      return;
    }
  });

  return { run, stop, send, snap, gameId, store };
})();

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

</script>
</body></html>
