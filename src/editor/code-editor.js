/* Code editor view
 * ================
 * A plain text editor with a live preview and only the helpers that earn their place:
 *   - suggestions while typing (library names, your own names) and signature help for the call at the cursor
 *   - tap a sprite, a color name or a sound call in the code and an editor for exactly that thing opens
 *   - pickers to add a color, a sprite (draw it or pick an icon) or a sound effect
 * The logic that finds things under the cursor lives in code-assist.js (unit tested). */
const CodeEditor = (() => {
  const ta = $('ta');
  let pt = 0, it = 0;
  let target = null;                               // {start, end} of the text a picker will replace, or null = insert at the cursor

  /* ------------------------------------------------------------ editing with undo */
  function edit(start, end, text) {
    ta.focus();
    ta.setSelectionRange(start, end);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { /* not supported */ }
    if (!ok) ta.setRangeText(text, start, end, 'end');
    ta.setSelectionRange(start + text.length, start + text.length);
    changed();
  }
  const put = text => target ? edit(target.start, target.end, text) : edit(ta.selectionStart, ta.selectionEnd, text);

  /* ------------------------------------------------------------ preview and size */
  function preview() {
    clearTimeout(pt);
    pt = setTimeout(() => {
      $('eerr').textContent = '';
      Runner.run($('ev'), ta.value, { mini: true, onerr: m => { $('eerr').textContent = '⚠ ' + m; } });
    }, 500);
  }

  function info() {
    clearTimeout(it);
    it = setTimeout(() => {
      try {
        const code = ta.value, u = toURL(code), q = QR(urlSegs(u));
        $('inf2').textContent = U8.encode(min(code)).length + ' B of code · QR v' + q.v + ' (' + q.size + '×' + q.size + ') · ' + u.length + ' chars (limit ~4300)';
      } catch (e) { $('inf2').textContent = '⚠ ' + e.message; }
    }, 250);
  }

  function changed() { App.cur = { name: App.cur.name, code: ta.value }; preview(); info(); assist(); }

  /* ------------------------------------------------------------ suggestions, signature help, context bar */
  function assist() {
    const pos = ta.selectionStart, text = ta.value, single = ta.selectionStart === ta.selectionEnd;
    const w = wordAt(text, pos), list = single ? completions(w.word, text) : [];
    $('sugg').innerHTML = '';
    list.forEach(n => {
      const b = el('button', 'sm', n);
      b.onpointerdown = e => { e.preventDefault(); edit(w.start, pos, completionText(n)); };
      $('sugg').append(b);
    });
    const sig = single ? signatureAt(text, pos) : null;
    $('hint').textContent = sig ? sig.text + ' — ' + sig.desc : 'Tip: put the cursor on a sprite, a color name or s(...) to edit it graphically.';

    const c = single ? contextAt(text, pos) : null, bar = $('ctx');
    bar.innerHTML = ''; bar.classList.toggle('on', !!c);
    if (!c) return;
    const act = (label, fn) => { const b = el('button', 'sm', label); b.onpointerdown = e => { e.preventDefault(); fn(); }; bar.append(b); };
    if (c.kind === 'sprite') {
      bar.append(c.form === 'bytes' ? 'Sprite:' : 'Icon "' + c.name + '":');
      act('✎ Edit pixels', () => openSprite(c.bytes, c));
      if (c.form !== 'bytes') act('🖼 Change icon', () => pickSprite(n => edit(c.start, c.end, c.form === 'sp' ? 'SP.' + n : "'" + n + "'")));
    } else if (c.kind === 'color') {
      bar.append('Color ' + c.name + ':');
      act('🎨 Change', () => openColor(c));
    } else {
      bar.append('Sound:');
      act('🔊 Edit', () => openSound(c));
    }
  }

  /* ------------------------------------------------------------ color picker */
  PAL.forEach((c, k) => {
    const i = el('i', 0, k); i.style.background = c; i.title = COLOR_NAMES[k];
    i.onclick = () => { modal('cm', false); put(COLOR_NAMES[k]); };
    $('pg').append(i);
  });
  $('cx').onclick = () => modal('cm', false);
  const openColor = t => { target = t || null; modal('cm', true); };

  /* ------------------------------------------------------------ sprite painter */
  const sp = Array(8).fill(0);
  const painter = spritePainter($('sg'), sp, 34);
  const openSprite = (bytes, t) => {
    target = t || null;
    for (let k = 0; k < 8; k++) sp[k] = bytes ? bytes[k] | 0 : 0;
    painter.refresh();
    $('smt').textContent = t ? 'Edit this sprite' : 'Draw a sprite';
    $('si').textContent = t ? 'Replace' : 'Insert';
    modal('sm', true);
  };
  $('sc').onclick = () => { sp.fill(0); painter.refresh(); };
  $('sx').onclick = () => modal('sm', false);
  $('si').onclick = () => {
    modal('sm', false);
    put(target ? '[' + sp.join(', ') + ']' : 'd([' + sp.join(', ') + '], x, y, WHITE, 2);\n');
  };

  /* ------------------------------------------------------------ sound picker */
  let snd = { notes: [600], ms: 120, wave: 'square' }, pa = null;
  function hear() {                                             // preview with a small oscillator of our own
    try {
      pa = pa || new (window.AudioContext || window.webkitAudioContext)();
      snd.notes.forEach((hz, j) => {
        if (!hz) return;
        const o = pa.createOscillator(), g = pa.createGain(), t0 = pa.currentTime + j * snd.ms / 1000;
        o.type = snd.wave; o.frequency.value = hz;
        g.gain.setValueAtTime(.08, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + snd.ms / 1000);
        o.connect(g); g.connect(pa.destination); o.start(t0); o.stop(t0 + snd.ms / 1000);
      });
    } catch (e) { /* no audio */ }
  }
  function syncSound() {
    $('snh').value = snd.notes[0] || 600; $('snm').value = snd.ms; $('snw').value = snd.wave;
    $('snh').disabled = snd.notes.length > 1;                   // pitch only applies to a single beep
    $('snhv').textContent = snd.notes.length > 1 ? snd.notes.length + ' notes' : $('snh').value + ' Hz';
    $('snmv').textContent = snd.ms + ' ms';
  }
  SOUNDS.forEach(s => {
    const b = el('button', 'sm', s.name);
    b.onclick = () => { snd = { notes: s.notes.slice(), ms: s.ms, wave: s.wave }; syncSound(); hear(); };
    $('snl').append(b);
  });
  $('snh').oninput = () => { snd.notes = [+$('snh').value]; syncSound(); };
  $('snm').oninput = () => { snd.ms = +$('snm').value; syncSound(); };
  $('snw').onchange = () => { snd.wave = $('snw').value; };
  $('snp').onclick = hear;
  $('snx').onclick = () => modal('sn', false);
  $('sni').onclick = () => { modal('sn', false); put(soundCode(snd.notes, snd.ms, snd.wave) + (target ? '' : ';\n')); };
  const openSound = c => {
    target = c || null;
    snd = c ? { notes: c.notes.slice(), ms: c.ms, wave: c.wave } : { notes: [600], ms: 120, wave: 'square' };
    syncSound();
    $('snt').textContent = c ? 'Edit this sound' : 'Sound effects';
    $('sni').textContent = c ? 'Replace' : 'Insert';
    modal('sn', true);
  };

  /* ------------------------------------------------------------ toolbar and buttons */
  [['🎨 Color', () => openColor(null)], ['👾 Sprite', () => openSprite(null, null)],
   ['🖼 Icons', () => { target = null; pickSprite(n => put("d('" + n + "', x, y, WHITE, 2);\n")); }], ['🔊 Sound', () => openSound(null)]]
    .forEach(([n, f]) => { const b = el('button', 'sm', n); b.onclick = f; $('tb').append(b); });

  ta.oninput = changed;
  ta.onkeyup = e => { if (!/^(Arrow|Home|End|Page)/.test(e.key)) return; assist(); };
  ta.onclick = assist;
  ta.onkeydown = e => {
    if (e.key === 'Tab') {                                      // Tab accepts the first suggestion, or indents
      e.preventDefault();
      const first = $('sugg').firstChild;
      if (first && !e.shiftKey) first.onpointerdown({ preventDefault() {} }); else edit(ta.selectionStart, ta.selectionEnd, '  ');
    }
  };
  document.addEventListener('selectionchange', () => { if (document.activeElement === ta) assist(); });

  $('eb').onclick = () => App.show('H');
  $('er').onclick = () => App.play({ name: App.cur.name, code: ta.value }, 'E');
  $('eq').onclick = () => App.showQR({ name: App.cur.name, code: ta.value }, 'E');
  $('el').onclick = () => { try { copyText(toURL(ta.value)).then(ok => { if (ok) $('inf2').textContent = 'Link copied'; }); } catch (e) { $('inf2').textContent = '⚠ ' + e.message; } };
  $('eh').onclick = () => { renderHelp(); modal('help', true); };
  $('en').onclick = () => { if (confirm('Replace the code with the starter program?')) { ta.value = STARTER; changed(); } };

  return {
    enter(o) { App.cur = { name: o.name, code: o.code }; ta.value = o.code; ta.setSelectionRange(0, 0); changed(); },
    leave() { clearTimeout(pt); clearTimeout(it); Runner.stop($('ev')); }
  };
})();
