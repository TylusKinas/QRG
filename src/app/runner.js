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
