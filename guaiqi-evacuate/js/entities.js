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
  };
}

export function makeGem() {
  return {
    alive: false, x: 0, y: 0, value: 1, r: 6, age: 0, color: '#d4a84b',
    trail: [], magnetized: false,
  };
}

export function makeParticle() {
  return {
    alive: false, x: 0, y: 0, vx: 0, vy: 0,
    life: 0.4, age: 0, r: 3, color: '#ffe066',
  };
}

export function makeDmgText() {
  return {
    alive: false, x: 0, y: 0, text: '', age: 0, life: 0.7, color: '#f0e6d0',
    crit: false, scale: 1,
  };
}

export function makeChest() {
  return {
    alive: false, x: 0, y: 0, r: 16, bob: 0, opened: false,
  };
}

export function spawnBurst(pool, x, y, color, n = 8, speed = 80) {
  for (let i = 0; i < n; i++) {
    const p = pool.acquire();
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const s = speed * (0.4 + Math.random() * 0.8);
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.life = 0.25 + Math.random() * 0.35;
    p.age = 0;
    p.r = 2 + Math.random() * 3;
    p.color = color;
  }
}
