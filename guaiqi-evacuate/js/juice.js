/**
 * Combat juice: soft hitstop, no shake, combo, warm edge glow — never white fullscreen flash.
 */

export function createJuice() {
  return {
    hitstop: 0,
    shake: 0,
    shakeMag: 0,
    combo: 0,
    comboTimer: 0,
    comboWindow: 1.65,
    maxCombo: 0,
    flash: 0,
    flashColor: '#c4a574',
    critFlash: 0,
    floatCombos: [],
    stopCd: 0,
  };
}

export function tickJuice(j, dt) {
  if (j.hitstop > 0) {
    j.hitstop -= dt;
    if (j.hitstop < 0) j.hitstop = 0;
  }
  if (j.shake > 0) {
    j.shake -= dt;
    if (j.shake < 0) j.shake = 0;
  }
  if (j.stopCd > 0) j.stopCd -= dt;
  if (j.flash > 0) j.flash -= dt;
  if (j.critFlash > 0) j.critFlash -= dt;

  if (j.combo > 0) {
    j.comboTimer -= dt;
    if (j.comboTimer <= 0) {
      j.combo = 0;
      j.comboTimer = 0;
    }
  }

  for (const f of j.floatCombos) {
    f.age += dt;
    const k = Math.min(1, f.age / f.life);
    // ease-out rise
    f.y -= (52 * (1 - k * 0.55)) * dt;
  }
  j.floatCombos = j.floatCombos.filter((f) => f.age < f.life);
}

export function inHitstop(j) {
  return j.hitstop > 0;
}

export function triggerHitstop(j, ms) {
  const sec = Math.min(0.09, ms / 1000);
  if (sec > j.hitstop) j.hitstop = sec;
}

export function addShake(j, amount, duration = 0.14) {
  // Screen shake disabled (user: battle shakes too much / 晃眼)
  void j; void amount; void duration;
}

export function shakeOffset(j) {
  void j;
  return { x: 0, y: 0 };
}

export function registerKill(j, worldX, worldY, isElite = false, isBoss = false) {
  j.combo += 1;
  j.comboTimer = j.comboWindow + (isBoss ? 0.8 : isElite ? 0.4 : 0);
  if (j.combo > j.maxCombo) j.maxCombo = j.combo;

  // tiny freeze-frame; normal kills rate-limited so swarms never stutter
  if (isBoss) triggerHitstop(j, 70);
  else if (isElite) {
    if (j.stopCd <= 0) { triggerHitstop(j, 36); j.stopCd = 0.18; }
  } else if (j.stopCd <= 0) {
    triggerHitstop(j, 10);
    j.stopCd = 0.32;
  }
  addShake(j, isBoss ? 7 : isElite ? 4.5 : 2.2 + Math.min(2.5, j.combo * 0.12), isBoss ? 0.28 : 0.12);

  // Soft colored edge pulse only — never white / never full-screen opaque
  j.flash = isBoss ? 0.12 : 0.04;
  j.flashColor = isBoss ? '#c89890' : '#c4a574';

  if (j.combo === 5 || j.combo === 10 || j.combo === 20 || (j.combo > 0 && j.combo % 25 === 0)) {
    j.floatCombos.push({
      x: worldX,
      y: worldY - 30,
      text: `x${j.combo}`,
      age: 0,
      life: 0.9,
      scale: j.combo >= 20 ? 2.0 : j.combo >= 10 ? 1.6 : 1.3,
    });
  }
}

export function triggerCritFlash(j) {
  j.critFlash = 0.05;
}

export function drawJuiceOverlay(ctx, j, W, H) {
  // Soft radial vignette pulse (colored, low opacity) — not a white screen
  if (j.flash > 0) {
    const a = Math.min(0.09, j.flash * 0.95);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    g.addColorStop(1, hexAlpha(j.flashColor, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Crit: brief warm glow at very low opacity, edge-biased
  if (j.critFlash > 0) {
    const a = Math.min(0.06, j.critFlash * 1.0);
    const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.5);
    g.addColorStop(0, `rgba(200,150,70,${a * 0.3})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawFloatCombos(ctx, j, camX, camY) {
  for (const f of j.floatCombos) {
    const t = f.age / f.life;
    const a = t < 0.15 ? t / 0.15 : 1 - ((t - 0.15) / 0.85) ** 1.4;
    const pop = t < 0.12 ? 0.85 + (t / 0.12) * 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(f.x - camX, f.y - camY);
    ctx.scale(f.scale * pop, f.scale * pop);
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = '#e8c878';
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
}

function hexAlpha(hex, a) {
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return `rgba(196,165,116,${a})`;
}

const KILL_WARM = ['#e7c48a', '#f0d7a4', '#d7a15a', '#c4845a', '#f6e2c0', '#e8b878'];
const HIT_WARM = ['#f0d7a4', '#e7c48a', '#d7a15a'];
const HIT_CRIT = ['#f2d090', '#e8b868', '#d4a050'];

function spawnRing(pool, x, y, color, r0, grow, life, alpha0 = 0.55) {
  const p = pool.acquire();
  p.x = x; p.y = y;
  p.vx = 0; p.vy = 0;
  p.life = life;
  p.age = 0;
  p.r = r0;
  p.color = color;
  p.kind = 'ring';
  p.rot = 0;
  p.spin = 0;
  p.grow = grow;
  p.drag = 1;
  p.grav = 0;
  p.alpha0 = alpha0;
}

/** Tiny warm sparks on a hit. Few, short, never white. Crit = slightly larger, still soft. */
export function spawnHitSpark(pool, x, y, crit = false) {
  const palette = crit ? HIT_CRIT : HIT_WARM;
  const n = crit ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const p = pool.acquire();
    const a = Math.random() * Math.PI * 2;
    const s = (crit ? 32 : 22) + Math.random() * (crit ? 28 : 26);
    p.x = x + (Math.random() - 0.5) * 5;
    p.y = y + (Math.random() - 0.5) * 5;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s - 10;
    p.life = crit ? 0.12 + Math.random() * 0.08 : 0.09 + Math.random() * 0.07;
    p.age = 0;
    p.r = crit ? 1.6 + Math.random() * 1.1 : 1.1 + Math.random() * 0.7;
    p.color = palette[i % palette.length];
    p.kind = i === 0 && crit ? 'chip' : 'dot';
    p.rot = Math.random() * Math.PI;
    p.spin = (Math.random() - 0.5) * 8;
    p.grow = -2;
    p.drag = 0.9;
    p.grav = 20;
    p.alpha0 = 0.9;
  }
}

/**
 * Soft warm kill burst: one expanding ring + layered paper chips + a few dots.
 * Boss/elite get a second softer outer ring. No white, no strobe.
 */
export function spawnKillBurst(pool, x, y, color, big = false) {
  void color;
  spawnRing(pool, x, y, '#e8c878', big ? 10 : 6, big ? 70 : 48, big ? 0.38 : 0.28, big ? 0.5 : 0.42);
  if (big) {
    spawnRing(pool, x, y, '#d4a060', 4, 95, 0.48, 0.28);
  }

  const n = big ? 8 : 5;
  const speed = big ? 78 : 52;
  for (let i = 0; i < n; i++) {
    const p = pool.acquire();
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.35;
    const s = speed * (0.4 + Math.random() * 0.6);
    const chip = i % 2 === 0;
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s - 16 - Math.random() * 20;
    p.life = (big ? 0.34 : 0.26) + Math.random() * 0.22;
    p.age = 0;
    p.r = chip
      ? (big ? 2.8 + Math.random() * 2.2 : 2.2 + Math.random() * 1.6)
      : (big ? 1.6 + Math.random() * 1.2 : 1.3 + Math.random() * 0.9);
    p.color = KILL_WARM[i % KILL_WARM.length];
    p.kind = chip ? 'chip' : 'dot';
    p.rot = a;
    p.spin = (Math.random() - 0.5) * 5;
    p.grow = chip ? -0.8 : -1.4;
    p.drag = 0.93;
    p.grav = 36 + Math.random() * 40;
    p.alpha0 = 0.9;
  }
}
