/* Reader: the forever player.
 * Scans any QR code with the camera (or reads a photo, or a pasted link) and plays it when it is a QRG game, whatever the
 * text around the game looks like: a link of any host, or just the payload. Recently played games are kept for replay.
 * Uses the browser's BarcodeDetector when there is one, otherwise the bundled vendor/jsQR.js (loaded only then). */
const Reader = (() => {
  const KEY = 'qrg:recent', MAX = 8;
  let stream = null, timer = 0, detector = null, jq = null, busy = false;

  const status = s => { $('rst').textContent = s; };

  /* ------------------------------------------------------------ recent games */
  const recent = () => { try { const r = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(r) ? r : []; } catch (e) { return []; } };
  function remember(payload) {
    try {
      const list = recent().filter(r => r.p !== payload);
      list.unshift({ p: payload, t: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    } catch (e) { /* storage blocked */ }
  }
  function drawRecent() {
    const box = $('rrec');
    box.innerHTML = '';
    recent().forEach(r => {
      if (typeof r.p !== 'string' || !/^[0-9A-Z$*+\-./:]+$/.test(r.p)) return;
      const b = el('button', 'sm', '▶ ' + new Date(r.t).toLocaleString() + ' · ' + Math.round(r.p.length * 2 / 3) + ' B');
      b.onclick = () => open(r.p);
      box.append(b);
    });
  }

  /* ------------------------------------------------------------ decoding */
  const loadJsQR = () => jq || (jq = new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'vendor/jsQR.js'; s.onload = ok; s.onerror = () => { jq = null; no(new Error('scanner library missing')); };
    document.head.append(s);
  }));

  /* the text of the first QR code found in an image source (video frame, bitmap), or null */
  async function scan(src, w, h) {
    if ('BarcodeDetector' in window) {
      detector = detector || new BarcodeDetector({ formats: ['qr_code'] });
      const r = await detector.detect(src);
      return r[0] ? r[0].rawValue : null;
    }
    await loadJsQR();
    const k = Math.min(1, 1000 / w), cw = Math.round(w * k), ch = Math.round(h * k), c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0, cw, ch);
    const r = jsQR(x.getImageData(0, 0, cw, ch).data, cw, ch);
    return r ? r.data : null;
  }

  /* play whatever the text contains; returns true when it was a QRG game */
  function open(text) {
    const code = gameFromText(text);
    if (!code) { status('Not a QRG game: ' + String(text).slice(0, 40)); return false; }
    remember(extractPayload(text));
    App.play({ name: 'Scanned game', code }, 'R');
    return true;
  }

  /* ------------------------------------------------------------ camera */
  async function start() {
    stop();
    status('Starting the camera…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } });
      $('vd').srcObject = stream;
      await $('vd').play();
      status('Point the camera at a QRG code');
      loop();
    } catch (e) { status('No camera here (it needs HTTPS and permission). Use Photo or Paste link.'); }
  }
  function stop() {
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  async function loop() {
    if (!stream) return;
    const v = $('vd');
    if (v.videoWidth && !busy) {
      busy = true;
      try {
        const text = await scan(v, v.videoWidth, v.videoHeight);
        if (text && open(text)) { busy = false; return; }
      } catch (e) { /* try again on the next frame */ }
      busy = false;
    }
    timer = setTimeout(loop, 150);
  }

  /* ------------------------------------------------------------ other ways in */
  $('fi').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f), text = await scan(bmp, bmp.width, bmp.height);
      if (!text) status('No QR code found in that picture'); else open(text);
    } catch (err) { status('Could not read that picture'); }
  };
  $('rpaste').onclick = () => { const s = prompt('Paste a QRG link or code:'); if (s) open(s); };
  $('rcam').onclick = start;

  return {
    enter() { drawRecent(); start(); },
    leave() { stop(); },
    open
  };
})();
