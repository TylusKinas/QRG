/* Starter projects for the visual editor. They are ordinary projects (see visual-compile.js), not special
 * engine features: open one, change it, break it. */
const VTEMPLATES = (() => {
  const cp = a => Array.from(a);

  const coins = {
    v: 1, bg: 1,
    kinds: [
      { id: 'k1', name: 'Player', spr: cp(SP.smile), c: 10, z: 3 },
      { id: 'k2', name: 'Coin', spr: cp(SP.coin), c: 9, z: 2 },
      { id: 'k3', name: 'Skull', spr: cp(SP.skull), c: 8, z: 2 }
    ],
    objs: [{ k: 'k1', x: 116, y: 200 }],
    vars: [{ n: 'score', v: 0, show: 1 }, { n: 'lives', v: 3, show: 1 }],
    rules: [
      { when: { t: 'touch' }, ifs: [], dos: [{ t: 'follow', w: 'k1', axis: 'x' }] },
      { when: { t: 'held', btn: 'l' }, ifs: [], dos: [{ t: 'move', w: 'k1', dx: '-3', dy: '0' }] },
      { when: { t: 'held', btn: 'r' }, ifs: [], dos: [{ t: 'move', w: 'k1', dx: '3', dy: '0' }] },
      { when: { t: 'always' }, ifs: [], dos: [{ t: 'keep', w: 'k1' }] },
      { when: { t: 'every', n: '0.7' }, ifs: [], dos: [{ t: 'create', k: 'k2', x: 'R(232)', y: '-16', vx: '0', vy: '2' }] },
      { when: { t: 'every', n: '2' }, ifs: [], dos: [{ t: 'create', k: 'k3', x: 'R(232)', y: '-16', vx: '0', vy: '3' }] },
      { when: { t: 'hit', a: 'k1', b: 'k2' }, ifs: [], dos: [{ t: 'destroy', w: '@b' }, { t: 'setvar', v: 'score', vop: '+=', n: '1' }, { t: 'sound', n: '900' }] },
      { when: { t: 'hit', a: 'k1', b: 'k3' }, ifs: [], dos: [{ t: 'destroy', w: '@b' }, { t: 'setvar', v: 'lives', vop: '-=', n: '1' }, { t: 'sound', n: '150' }] },
      { when: { t: 'edge', a: 'k2', edge: 'bottom' }, ifs: [], dos: [{ t: 'destroy', w: '@a' }] },
      { when: { t: 'edge', a: 'k3', edge: 'bottom' }, ifs: [], dos: [{ t: 'destroy', w: '@a' }] },
      { when: { t: 'always' }, ifs: [{ t: 'var', v: 'lives', op: '<=', n: '0' }], dos: [{ t: 'end', s: 'GAME OVER' }] }
    ]
  };

  const bounce = {
    v: 1, bg: 0,
    kinds: [
      { id: 'k1', name: 'Paddle', spr: [255, 255, 0, 0, 0, 0, 0, 0], c: 12, z: 4 },
      { id: 'k2', name: 'Ball', spr: cp(SP.ball), c: 7, z: 1 }
    ],
    objs: [{ k: 'k1', x: 112, y: 200 }],
    vars: [{ n: 'score', v: 0, show: 1 }, { n: 'lives', v: 3, show: 1 }],
    rules: [
      { when: { t: 'start' }, ifs: [], dos: [{ t: 'create', k: 'k2', x: '124', y: '60', vx: '2', vy: '3' }] },
      { when: { t: 'touch' }, ifs: [], dos: [{ t: 'follow', w: 'k1', axis: 'x' }] },
      { when: { t: 'held', btn: 'l' }, ifs: [], dos: [{ t: 'move', w: 'k1', dx: '-4', dy: '0' }] },
      { when: { t: 'held', btn: 'r' }, ifs: [], dos: [{ t: 'move', w: 'k1', dx: '4', dy: '0' }] },
      { when: { t: 'always' }, ifs: [], dos: [{ t: 'keep', w: 'k1' }] },
      { when: { t: 'edge', a: 'k2', edge: 'left' }, ifs: [], dos: [{ t: 'bounce', w: '@a', axis: 'x' }, { t: 'keep', w: '@a' }] },
      { when: { t: 'edge', a: 'k2', edge: 'right' }, ifs: [], dos: [{ t: 'bounce', w: '@a', axis: 'x' }, { t: 'keep', w: '@a' }] },
      { when: { t: 'edge', a: 'k2', edge: 'top' }, ifs: [], dos: [{ t: 'bounce', w: '@a', axis: 'y' }, { t: 'keep', w: '@a' }] },
      { when: { t: 'edge', a: 'k2', edge: 'bottom' }, ifs: [],
        dos: [{ t: 'setvar', v: 'lives', vop: '-=', n: '1' }, { t: 'moveto', w: '@a', x: '124', y: '60' }, { t: 'speed', w: '@a', dx: '2', dy: '3' }, { t: 'sound', n: '150' }] },
      { when: { t: 'hit', a: 'k1', b: 'k2' }, ifs: [],
        dos: [{ t: 'speed', w: '@b', dx: '(b.x - a.x - 12) / 8', dy: '-Math.abs(b.vy)' }, { t: 'setvar', v: 'score', vop: '+=', n: '1' }, { t: 'sound', n: '600' }] },
      { when: { t: 'always' }, ifs: [{ t: 'var', v: 'lives', op: '<=', n: '0' }], dos: [{ t: 'end', s: 'GAME OVER' }] }
    ]
  };

  const targets = {
    v: 1, bg: 3,
    kinds: [{ id: 'k1', name: 'Target', spr: cp(SP.ball), c: 14, z: 3 }],
    objs: [],
    vars: [{ n: 'score', v: 0, show: 1 }],
    rules: [
      { when: { t: 'every', n: '0.6' }, ifs: [], dos: [{ t: 'create', k: 'k1', x: 'R(230)', y: '20 + R(190)', vx: '0', vy: '0' }] },
      { when: { t: 'tapobj', a: 'k1' }, ifs: [], dos: [{ t: 'destroy', w: '@a' }, { t: 'setvar', v: 'score', vop: '+=', n: '1' }, { t: 'sound', n: '700' }] },
      { when: { t: 'always' }, ifs: [{ t: 'count', k: 'k1', op: '>', n: '8' }], dos: [{ t: 'end', s: 'TOO MANY!' }] }
    ]
  };

  return [
    { name: 'Coin catcher', about: 'Drag to catch coins and dodge skulls.', p: coins },
    { name: 'Bouncing ball', about: 'Keep the ball in play with the paddle.', p: bounce },
    { name: 'Tap the targets', about: 'Tap targets before the screen fills up.', p: targets }
  ];
})();
