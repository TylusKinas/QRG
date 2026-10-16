/* Visual editor view
 * ==================
 * Place and draw objects on the screen, describe behavior as WHEN / IF / DO rules, and the QRG script is
 * compiled automatically (see visual-compile.js). Tabs: Objects, Rules, Game, Code.
 * The project is saved in localStorage after every change.
 */
const VisualEditor = (() => {
  const KEY = 'qrg:vp';
  const vc = $('vc'), vp = $('vp'), vb = $('vb');
  const stage = makeLib({ x: vc.getContext('2d'), I: {}, PAL, SP, FONT, COLORS: COLOR_NAMES });   // draws the editing stage
  const clone = o => JSON.parse(JSON.stringify(o));

  let P = loadProject(), built = { code: '', errors: [] };
  let tab = 'o', selKind = P.kinds.length ? P.kinds[0].id : null, selObj = -1, tool = 'sel', testing = false, ruleIdx = 0;   // tool: 'sel' | 'put' | 'del'
  let tSave = 0, tBuild = 0, drag = null;
  const banner = el('div'); banner.id = 'vban';

  const kindOf = id => P.kinds.find(k => k.id === id);

  function loadProject() {
    try { const q = vsanitize(JSON.parse(localStorage.getItem(KEY))); if (q) return q; } catch (e) { /* none saved */ }
    return clone(VTEMPLATES[0].p);
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* storage blocked */ } }

  function setProject(q) {
    P = q; selKind = P.kinds.length ? P.kinds[0].id : null; selObj = -1; tool = 'sel';
    changed({ panel: true });
  }

  /* ------------------------------------------------------------ stage */
  function drawStage() {
    const L = stage;
    L.cls(P.bg);
    for (let y = 16; y < 240; y += 16) for (let x = 16; x < 256; x += 16) L.r(x, y, 1, 1, P.bg === 5 ? 6 : 5);
    P.objs.forEach(o => { const k = kindOf(o.k); if (k) L.d(k.spr, o.x, o.y, k.c, k.z); });
    P.vars.filter(v => v.show).forEach((v, j) => L.t(v.n.toUpperCase() + ' ' + v.v, 4, 4 + j * 8, 7));
    if (selObj >= 0 && P.objs[selObj]) {
      const o = P.objs[selObj], k = kindOf(o.k);
      if (k) L.box(o.x - 2, o.y - 2, 8 * k.z + 4, 8 * k.z + 4, 10);
    }
  }

  const pt = e => { const b = vc.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * 256, y: (e.clientY - b.top) / b.height * 240 }; };
  const snap = v => Math.round(v / 2) * 2;

  vc.onpointerdown = e => {
    if (testing) return;
    const p = pt(e);
    if (tool === 'put' && kindOf(selKind)) {                    // PLACE: add an object of the chosen type
      const k = kindOf(selKind), half = 4 * k.z;
      P.objs.push({ k: k.id, x: snap(p.x - half), y: snap(p.y - half) });
      selObj = P.objs.length - 1; drag = { dx: half, dy: half };
    } else if (tool === 'del') {                                // DELETE: remove the object that was tapped
      const i = objectAt(p);
      if (i >= 0) { P.objs.splice(i, 1); selObj = -1; changed({ panel: true }); }
      return;
    } else {                                                    // SELECT: pick an object, drag to move it
      selObj = objectAt(p);
      if (selObj >= 0) { const o = P.objs[selObj]; selKind = o.k; drag = { dx: p.x - o.x, dy: p.y - o.y }; }
    }
    vc.setPointerCapture(e.pointerId);
    drawStage();
    renderPanel();
  };
  const inbox = (p, o, k) => p.x >= o.x && p.x < o.x + 8 * k.z && p.y >= o.y && p.y < o.y + 8 * k.z;
  const objectAt = p => {                                       // index of the topmost object under the point, or -1
    for (let i = P.objs.length - 1; i >= 0; i--) { const o = P.objs[i], k = kindOf(o.k); if (k && inbox(p, o, k)) return i; }
    return -1;
  };
  function deleteSelected() {
    if (selObj < 0 || !P.objs[selObj]) return false;
    P.objs.splice(selObj, 1); selObj = -1; changed({ panel: true });
    return true;
  }
  document.addEventListener('keydown', e => {                   // the Delete key removes the selected object
    if (App.view !== 'V' || testing || (e.key !== 'Delete' && e.key !== 'Backspace')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (deleteSelected()) e.preventDefault();
  });
  vc.onpointermove = e => {
    if (!drag || selObj < 0) return;
    const p = pt(e), o = P.objs[selObj];
    o.x = snap(p.x - drag.dx); o.y = snap(p.y - drag.dy);
    drawStage();
  };
  vc.onpointerup = vc.onpointercancel = () => { if (drag) { drag = null; changed({ panel: true }); } };

  /* ------------------------------------------------------------ change handling */
  function changed(o) {
    o = o || {};
    drawStage();
    clearTimeout(tSave); tSave = setTimeout(persist, 400);
    clearTimeout(tBuild);
    tBuild = setTimeout(() => {
      built = vcompile(P);
      renderBanner();
      if (tab === 'c') renderCodeInfo();
      if (testing) runTest();
    }, 250);
    if (o.panel) renderPanel();
  }

  function renderBanner() {
    banner.classList.toggle('on', built.errors.length > 0);
    banner.textContent = built.errors.length ? '⚠ ' + built.errors.slice(0, 4).join('\n') : '';
    banner.style.whiteSpace = 'pre-line';
  }

  /* ------------------------------------------------------------ small UI helpers */
  const lbl = t => el('div', 'lbl', t);
  const row = () => el('div', 'rowx');
  const field = (label, input) => { const w = el('span', 'fld'); if (label) w.append(label + ' '); w.append(input); return w; };
  const swatches = (value, onPick) => {
    const w = el('div', 'sw');
    PAL.forEach((c, k) => {
      const i = el('i', k === value ? 'on' : ''); i.style.background = c; i.title = COLOR_NAMES[k].toLowerCase();
      i.onclick = () => { w.querySelectorAll('i').forEach((x, q) => x.classList.toggle('on', q === k)); onPick(k); };
      w.append(i);
    });
    return w;
  };
  const button = (text, cls, fn) => { const b = el('button', cls || '', text); b.onclick = fn; return b; };

  /* ------------------------------------------------------------ panels */
  function renderPanel() {
    vb.innerHTML = '';
    vb.append(banner);
    renderBanner();
    ({ o: panelObjects, r: panelRules, g: panelGame, c: panelCode })[tab]();
  }

  /* --- objects --- */
  let chipsEl = null;
  function fillChips() {
    chipsEl.innerHTML = '';
    P.kinds.forEach(k => {
      const b = el('button', 'chip' + (k.id === selKind ? ' on' : ''));
      b.append(thumb(k.spr, 34, k.c), el('span', 0, k.name));
      b.onclick = () => { selKind = k.id; selObj = -1; drawStage(); renderPanel(); };
      chipsEl.append(b);
    });
    chipsEl.append(button('＋ New', 'chip', newKind));
  }

  function newKind() {
    const names = Object.keys(SP), id = vid(P.kinds, 'k');
    P.kinds.push({ id, name: 'Object ' + (P.kinds.length + 1), spr: Array.from(SP[names[(P.kinds.length * 7 + 3) % names.length]]), c: [7, 8, 9, 10, 11, 12, 14][P.kinds.length % 7], z: 2 });
    selKind = id; selObj = -1; tool = 'put';
    changed({ panel: true });
  }

  /* the three tools, in front of the object types: Select, Place, Delete */
  function toolBar() {
    const bar = el('div', 'tools');
    const set = m => { tool = m; if (m !== 'sel') selObj = -1; drawStage(); renderPanel(); };
    bar.append(
      button('☝ Select', tool === 'sel' ? 'on' : '', () => set('sel')),
      button('✚ Place', tool === 'put' ? 'on' : '', () => { if (!P.kinds.length) return newKind(); set('put'); }),
      // with an object selected, Delete removes it at once; otherwise it becomes the "tap an object to delete it" tool
      button('🗑 Delete', tool === 'del' ? 'on' : '', () => { if (!deleteSelected()) set(tool === 'del' ? 'sel' : 'del'); })
    );
    vb.append(bar);
    vb.append(el('div', 'note', {
      sel: 'SELECT: tap an object on the screen to pick it, drag to move it. Then 🗑 deletes it.',
      put: 'PLACE: tap the screen to put the chosen object type there (choose the type below).',
      del: 'DELETE: tap an object on the screen to remove it.'
    }[tool]));
  }

  function panelObjects() {
    toolBar();
    selectionRow();
    chipsEl = el('div', 'chips'); vb.append(chipsEl); fillChips();
    const k = kindOf(selKind);
    if (!k) { vb.append(el('div', 'note', 'Create an object type to begin. It is a small picture you can place on the screen and give behavior to.')); return; }

    const name = el('input', 'wide'); name.value = k.name; name.maxLength = 20;
    name.oninput = () => { k.name = name.value || 'Object'; changed(); };
    name.onchange = () => { fillChips(); renderBanner(); };
    const r1 = row(); r1.append(field('Name', name)); vb.append(r1);

    vb.append(lbl('Sprite (tap or drag to draw)'));
    const r2 = row(), host = el('div');
    const painter = spritePainter(host, k.spr, 30, () => { changed(); });
    const tools = el('div'); tools.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    // the painter edits k.spr in place, so tools overwrite the same array
    const setSpr = bytes => { for (let i = 0; i < 8; i++) k.spr[i] = bytes[i] | 0; painter.refresh(); changed(); fillChips(); };
    tools.append(
      button('Mirror', 'sm', () => setSpr(k.spr.map(b => { const h = b >> 4; let m = 0; for (let i = 0; i < 4; i++) m |= (h >> i & 1) << (3 - i); return h << 4 | m; }))),
      button('Invert', 'sm', () => setSpr(k.spr.map(b => ~b & 255))),
      button('Clear', 'sm', () => setSpr(Array(8).fill(0))),
      button('Library…', 'sm', () => pickSprite(n => setSpr(SP[n])))
    );
    r2.append(host, tools); vb.append(r2);

    vb.append(lbl('Color'));
    vb.append(swatches(k.c, c => { k.c = c; changed(); fillChips(); }));

    vb.append(lbl('Size'));
    const r3 = row();
    [1, 2, 3, 4].forEach(z => { const b = button('×' + z, 'sm' + (k.z === z ? ' on' : ''), () => { k.z = z; changed({ panel: true }); }); r3.append(b); });
    vb.append(r3);

    const r4 = row();
    r4.append(button('Delete this type', 'dng sm', () => {
      if (!confirm('Delete "' + k.name + '" together with its objects and the rules that use it?')) return;
      vpurgeKind(P, k.id); selKind = P.kinds.length ? P.kinds[0].id : null; selObj = -1; tool = 'sel'; changed({ panel: true });
    }));
    vb.append(r4);
  }

  /* the object selected on the screen: position, duplicate, delete */
  function selectionRow() {
    if (selObj < 0 || !P.objs[selObj]) return;
    const o = P.objs[selObj], ok = kindOf(o.k);
    vb.append(lbl('Selected: ' + (ok ? ok.name : '?')));
    const r = row();
    const num = key => { const i = el('input'); i.type = 'number'; i.value = Math.round(o[key]); i.oninput = () => { o[key] = Number(i.value) || 0; changed(); }; return i; };
    r.append(field('x', num('x')), field('y', num('y')),
      button('Duplicate', 'sm', () => { P.objs.push({ k: o.k, x: o.x + 8, y: o.y + 8 }); selObj = P.objs.length - 1; changed({ panel: true }); }),
      button('Delete', 'dng sm', deleteSelected));
    vb.append(r);
  }

  /* --- rules --- */
  function panelRules() {
    vb.append(el('div', 'note', 'Rules say what happens: WHEN something occurs, IF conditions hold, DO actions. Tap a rule to edit it.'));
    P.rules.forEach((r, i) => {
      const c = el('div', 'card');
      const line = (kw, txt) => { const d = el('div'); d.append(el('b', 0, kw + ' '), txt); c.append(d); };
      line('WHEN', vdescribe(P, r, 'trig', r.when));
      (r.ifs || []).forEach(x => line('IF', vdescribe(P, r, 'cond', x)));
      (r.dos || []).forEach(x => line('DO', vdescribe(P, r, 'act', x)));
      if (!(r.dos || []).length) line('DO', 'nothing yet');
      c.onclick = () => openRule(i);
      vb.append(c);
    });
    vb.append(button('＋ Add a rule', 'pri', () => {
      P.rules.push({ when: { t: 'always' }, ifs: [], dos: [] });
      changed({ panel: true }); openRule(P.rules.length - 1);
    }));
  }

  /* --- one rule in a sheet --- */
  function openRule(i) { ruleIdx = i; renderRule(); modal('vm', true); }

  function afterRuleEdit() { vrepair(P); changed({ panel: true }); renderRule(); }

  function valueBox(group, type, block, name) {
    const inp = el(type === 'js' ? 'textarea' : 'input', type === 'text' || type === 'js' ? 'wide' : '');
    inp.value = block[name] == null ? '' : block[name];
    const check = () => inp.classList.toggle('bad', !vvalid(group, type, inp.value));
    inp.oninput = () => { block[name] = inp.value; check(); changed(); };
    check();
    return inp;
  }

  function fieldWidget(group, reg, block, name, rule) {
    const type = reg.f.find(f => f[0] === name)[1], opts = vopts(type, P, rule), w = el('span', 'fld');
    if (!opts) { w.append(valueBox(group, type, block, name)); return w; }
    const s = el('select');
    opts.forEach(([l, v]) => { const o = el('option', 0, l); o.value = v; s.append(o); });
    if (!opts.length) { const o = el('option', 0, '(create an object first)'); o.value = ''; s.append(o); }
    s.value = String(block[name]);
    s.onchange = () => { block[name] = s.value; if (group === 'trig') afterRuleEdit(); else changed({ panel: true }); };
    w.append(s);
    return w;
  }

  function blockRow(group, block, rule, onRemove) {
    const reg = VB[group][block.t], r = el('div', 'item');
    const sel = el('select');
    Object.keys(VB[group]).forEach(t => { const o = el('option', 0, VNAMES[group][t]); o.value = t; sel.append(o); });
    sel.value = block.t;
    sel.onchange = () => {
      const nb = vnew(P, group, sel.value, rule);
      Object.keys(block).forEach(k => delete block[k]);
      Object.assign(block, nb);
      afterRuleEdit();
    };
    r.append(sel);
    if (onRemove) { const x = button('✕', 'x sm dng', onRemove); r.append(x); }
    const sent = el('div'); sent.style.flexBasis = '100%';
    vsplit(reg.l).forEach(pc => sent.append(pc.text != null ? pc.text : fieldWidget(group, reg, block, pc.field, rule)));
    r.append(sent);
    return r;
  }

  function addPicker(group, placeholder, onPick) {
    const s = el('select');
    const first = el('option', 0, placeholder); first.value = ''; s.append(first);
    Object.keys(VB[group]).forEach(t => { const o = el('option', 0, VNAMES[group][t]); o.value = t; s.append(o); });
    s.onchange = () => { if (s.value) onPick(s.value); };
    const w = el('div', 'rowx'); w.append(s);
    return w;
  }

  function renderRule() {
    const r = P.rules[ruleIdx], box = $('vmc');
    if (!r) { modal('vm', false); return; }
    box.innerHTML = '';
    box.append(el('h2', 0, 'Rule ' + (ruleIdx + 1)));
    box.append(lbl('When'));
    box.append(blockRow('trig', r.when, r, null));
    box.append(lbl('Only if… (optional)'));
    r.ifs.forEach((c, j) => box.append(blockRow('cond', c, r, () => { r.ifs.splice(j, 1); afterRuleEdit(); })));
    box.append(addPicker('cond', '＋ Add a condition…', t => { r.ifs.push(vnew(P, 'cond', t, r)); afterRuleEdit(); }));
    box.append(lbl('Do'));
    r.dos.forEach((a, j) => box.append(blockRow('act', a, r, () => { r.dos.splice(j, 1); afterRuleEdit(); })));
    box.append(addPicker('act', '＋ Add an action…', t => { r.dos.push(vnew(P, 'act', t, r)); afterRuleEdit(); }));
    if (built.errors.length) { const e = el('div', 'err'); e.textContent = '⚠ ' + built.errors.filter(m => m.startsWith('Rule ' + (ruleIdx + 1) + ':')).join(' · '); box.append(e); }
    const f = el('div', 'row');
    f.append(
      button('Delete', 'dng', () => { P.rules.splice(ruleIdx, 1); modal('vm', false); changed({ panel: true }); }),
      button('↑', '', () => { if (ruleIdx > 0) { [P.rules[ruleIdx - 1], P.rules[ruleIdx]] = [P.rules[ruleIdx], P.rules[ruleIdx - 1]]; ruleIdx--; changed({ panel: true }); renderRule(); } }),
      button('↓', '', () => { if (ruleIdx < P.rules.length - 1) { [P.rules[ruleIdx + 1], P.rules[ruleIdx]] = [P.rules[ruleIdx], P.rules[ruleIdx + 1]]; ruleIdx++; changed({ panel: true }); renderRule(); } }),
      button('Done', 'pri', () => { modal('vm', false); changed({ panel: true }); })
    );
    box.append(f);
  }
  $('vm').onclick = e => { if (e.target === $('vm')) { modal('vm', false); changed({ panel: true }); } };

  /* --- game --- */
  function panelGame() {
    vb.append(lbl('Background color'));
    vb.append(swatches(P.bg, c => { P.bg = c; changed(); }));

    vb.append(lbl('Variables'));
    vb.append(el('div', 'note', 'Numbers the game remembers: score, lives, level… Use them in rules and show them on the screen.'));
    P.vars.forEach(v => {
      const r = row();
      const name = el('input'); name.value = v.n; name.maxLength = 24;
      name.onchange = () => {
        let n = vsafeName(name.value);
        while (P.vars.some(x => x !== v && x.n === n)) n += '_';
        vrenameVar(P, v.n, n); name.value = n; changed({ panel: true });
      };
      const init = el('input'); init.type = 'number'; init.value = v.v; init.oninput = () => { v.v = Number(init.value) || 0; changed(); };
      const show = el('input'); show.type = 'checkbox'; show.checked = !!v.show; show.onchange = () => { v.show = show.checked ? 1 : 0; changed(); };
      const del = button('✕', 'dng sm', () => { vpurgeVar(P, v.n); changed({ panel: true }); });
      r.append(field('', name), field('starts at', init), field('show', show), del);
      vb.append(r);
    });
    vb.append(button('＋ Add a variable', 'sm', () => {
      let n = 1; while (P.vars.some(v => v.n === 'var' + n)) n++;
      P.vars.push({ n: vsafeName('var' + n), v: 0, show: 0 }); changed({ panel: true });
    }));

    vb.append(lbl('Project'));
    const r = row(), pick = el('select');
    [['Blank', null]].concat(VTEMPLATES.map((t, i) => [t.name, i])).forEach(([n, v]) => { const o = el('option', 0, 'Start from: ' + n); o.value = v == null ? 'blank' : v; pick.append(o); });
    r.append(pick, button('Load', 'sm', () => {
      if (!confirm('Replace the current project?')) return;
      setProject(pick.value === 'blank' ? vblank() : clone(VTEMPLATES[+pick.value].p));
    }));
    vb.append(r);
    const r2 = row();
    r2.append(
      button('Copy project data', 'sm', () => copyText(JSON.stringify(P))),
      button('Paste project data', 'sm', () => {
        const s = prompt('Paste project data:');
        if (!s) return;
        try { const q = vsanitize(JSON.parse(s)); if (!q) throw 0; setProject(q); } catch (e) { alert('That is not a QRG project.'); }
      })
    );
    vb.append(r2);
    vb.append(el('div', 'note', 'Your project is saved automatically on this device.'));
  }

  /* --- code --- */
  let codeInfo = null, codeBox = null;
  function renderCodeInfo() {
    if (!codeBox) return;
    codeBox.value = built.code;
    try {
      const u = toURL(built.code), q = QR(urlSegs(u));
      codeInfo.textContent = U8.encode(min(built.code)).length + ' B of code · QR v' + q.v + ' (' + q.size + '×' + q.size + ') · ' + u.length + ' chars';
    } catch (e) { codeInfo.textContent = '⚠ ' + e.message; }
  }
  function panelCode() {
    vb.append(el('div', 'note', 'This is the program the editor writes for you. It is normal QRG code: open it in the code editor to change it by hand (the link back to the visual editor is one-way).'));
    codeBox = el('textarea'); codeBox.id = 'vcode'; codeBox.readOnly = true;
    codeInfo = el('div', 'note');
    vb.append(codeBox, codeInfo);
    built = vcompile(P); renderCodeInfo();
    const r = row();
    r.append(button('Open in code editor', 'pri sm', () => { built = vcompile(P); App.show('E', { name: 'Visual game', code: built.code }); }),
             button('Copy code', 'sm', () => copyText(built.code)));
    vb.append(r);
  }

  /* ------------------------------------------------------------ test mode & bottom bar */
  function runTest() {
    built = vcompile(P);
    Runner.run(vp, built.code, { mini: true, onerr: m => { banner.classList.add('on'); banner.textContent = '⚠ ' + m; } });
  }
  function setTesting(on) {
    testing = on;
    vc.hidden = on; vp.hidden = !on;
    $('vtst').textContent = on ? '■ Edit' : '▶ Test';
    if (on) runTest(); else Runner.stop(vp);
  }
  $('vtst').onclick = () => setTesting(!testing);
  $('vk').onclick = () => App.show('H');
  $('vq').onclick = () => { built = vcompile(P); App.showQR({ name: 'Visual game', code: built.code }, 'V'); };
  $('vf').onclick = () => { built = vcompile(P); App.play({ name: 'Visual game', code: built.code }, 'V'); };
  document.querySelectorAll('#vt button').forEach(b => {
    b.onclick = () => {
      tab = b.dataset.t;
      document.querySelectorAll('#vt button').forEach(x => x.classList.toggle('on', x === b));
      renderPanel();
    };
  });

  return {
    enter() {
      built = vcompile(P);
      drawStage(); renderPanel();
    },
    leave() { clearTimeout(tBuild); setTesting(false); modal('vm', false); persist(); },
    /* for tests and tooling */
    get project() { return P; }, set project(q) { setProject(q); }, get built() { return built; }
  };
})();
