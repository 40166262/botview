/** Object pools: bullets, gems, particles, floating damage, chests */
export function createPool(factory, initial = 32) {
  const free = [];
  const active = [];
  for (let i = 0; i < initial; i++) free.push(factory());
  return {
    active,
    acquire() {
      const o = free.pop() || factory();
      o.alive = true;
      active.push(o);
      return o;
    },
    release(o) {
      o.alive = false;
    },
    sweep() {
      for (let i = active.length - 1; i >= 0; i--) {
        if (!active[i].alive) {
          free.push(active[i]);
          active.splice(i, 1);
        }
      }
    },
    clear() {
      while (active.length) free.push(active.pop());
    },
  };
}

export function makeBullet() {
  return {
    alive: false, x: 0, y: 0, vx: 0, vy: 0,
    r: 5, damage: 10, pierce: 0, life: 1.2, age: 0, hue: 50,
    frost: 0, bounce: 0, trail: [], crit: false,
    // projectile kinds: bolt | beam | melon | durian | seek | knife | drone | thorn | vine
    kind: 'bolt',
    ax: 0, ay: 0, // gravity / accel
    aimTx: 0, aimTy: 0, // beam end
    beamW: 10, beamLen: 140,
    hitSet: null, // for beam pierce tracking per tick
    explodeR: 0,
    knock: 0,
    homing: 0,
    puddle: false,
    streak: 0,
    tint: '',
  };
}

export function makeGem() {
  return {
    alive: false, x: 0, y: 0, value: 1, r: 6, age: 0, color: '#d4a84b',
    trail: [], magnetized: false,
  };
}

/** kind: 'dot' soft circle | 'chip' warm paper confetti | 'ring' expanding soft ring */
export function makeParticle() {
  return {
    alive: false, x: 0, y: 0, vx: 0, vy: 0,
    life: 0.4, age: 0, r: 3, color: '#ffe066',
    kind: 'dot',
    rot: 0,
    spin: 0,
    grow: 0,
    drag: 0.96,
    grav: 0,
    alpha0: 1,
  };
}

export function makeDmgText() {
  return {
    alive: false, x: 0, y: 0, text: '', age: 0, life: 0.7, color: '#f0e6d0',
    crit: false, scale: 1, big: false, vy: 28,
  };
}

export function makeChest() {
  return {
    alive: false, x: 0, y: 0, r: 28, bob: 0, opened: false,
  };
}

/**
 * Soft warm burst used for level-up / chest / misc feedback.
 * Mix of chips + dots, light gravity, size hierarchy — not raw neon dots.
 */
export function spawnBurst(pool, x, y, color, n = 8, speed = 80) {
  const count = Math.min(n, 18);
  for (let i = 0; i < count; i++) {
    const p = pool.acquire();
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const s = speed * (0.35 + Math.random() * 0.7);
    const chip = i % 3 !== 0;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 4;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s - 10 - Math.random() * 18;
    p.life = 0.32 + Math.random() * 0.38;
    p.age = 0;
    p.r = chip ? 2.2 + Math.random() * 2.4 : 1.4 + Math.random() * 1.6;
    p.color = color;
    p.kind = chip ? 'chip' : 'dot';
    p.rot = Math.random() * Math.PI;
    p.spin = (Math.random() - 0.5) * 6;
    p.grow = chip ? -0.6 : -1.2;
    p.drag = 0.94;
    p.grav = 28 + Math.random() * 36;
    p.alpha0 = 0.85 + Math.random() * 0.15;
  }
}
