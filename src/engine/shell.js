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
