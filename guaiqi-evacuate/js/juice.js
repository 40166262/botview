/**
 * Combat juice: soft hitstop, mild shake, combo, warm crit glow — no white fullscreen flash.
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
    f.y -= 40 * dt;
  }
  j.floatCombos = j.floatCombos.filter((f) => f.age < f.life);
}

export function inHitstop(j) {
  return j.hitstop > 0;
}

export function triggerHitstop(j, ms) {
  const sec = ms / 1000;
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
  if (isBoss || isElite) triggerHitstop(j, isBoss ? 80 : 45);
  else if (j.stopCd <= 0) { triggerHitstop(j, 12); j.stopCd = 0.28; }
  addShake(j, isBoss ? 7 : isElite ? 4.5 : 2.2 + Math.min(2.5, j.combo * 0.12), isBoss ? 0.28 : 0.12);

  // Soft colored edge pulse only — never white / never full-screen opaque
  j.flash = isBoss ? 0.14 : 0.05;
  j.flashColor = isBoss ? '#d4a0a8' : '#c4a574';

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
  j.critFlash = 0.06;
}

export function drawJuiceOverlay(ctx, j, W, H) {
  // Soft radial vignette pulse (colored, low opacity) — not a white screen
  if (j.flash > 0) {
    const a = Math.min(0.12, j.flash * 1.1);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, hexAlpha(j.flashColor, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Crit: brief warm glow at very low opacity, edge-biased
  if (j.critFlash > 0) {
    const a = Math.min(0.08, j.critFlash * 1.2);
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.55);
    g.addColorStop(0, `rgba(212,168,80,${a * 0.35})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawFloatCombos(ctx, j, camX, camY) {
  for (const f of j.floatCombos) {
    const a = 1 - f.age / f.life;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(f.x - camX, f.y - camY);
    ctx.scale(f.scale, f.scale);
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

/** Soft colored kill spark — no white ring sparks */
export function spawnKillBurst(pool, x, y, color, big = false) {
  const n = big ? 10 : 6;
  const speed = big ? 140 : 85;
  for (let i = 0; i < n; i++) {
    const p = pool.acquire();
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.45;
    const s = speed * (0.3 + Math.random() * 0.7);
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.life = 0.2 + Math.random() * 0.28;
    p.age = 0;
    p.r = 1.2 + Math.random() * (big ? 2.4 : 1.6);
    p.color = warmKillColor(color);
  }
  // Soft matching-color outer sparks (never pure white)
  const soft = softenColor(color);
  for (let i = 0; i < 5; i++) {
    const p = pool.acquire();
    const a = (Math.PI * 2 * i) / 5 + Math.random() * 0.3;
    p.x = x + Math.cos(a) * 4;
    p.y = y + Math.sin(a) * 4;
    p.vx = Math.cos(a) * (big ? 160 : 100);
    p.vy = Math.sin(a) * (big ? 160 : 100);
    p.life = 0.14;
    p.age = 0;
    p.r = 1.5;
    p.color = soft;
  }
}

/** Pull cold cyan/violet kill sparks toward warm paper so bursts don't flash. */
function warmKillColor(c) {
  if (!c || typeof c !== 'string' || !c.startsWith('#') || c.length < 7) return '#e8c878';
  let r = parseInt(c.slice(1, 3), 16);
  let g = parseInt(c.slice(3, 5), 16);
  let b = parseInt(c.slice(5, 7), 16);
  if (Number.isNaN(r)) return '#e8c878';
  if (b > r + 15 && b > 80) {
    r = Math.min(230, r + 70);
    g = Math.min(210, Math.floor(g * 0.75 + 50));
    b = Math.floor(b * 0.35);
  }
  const max = Math.max(r, g, b, 1);
  if (max > 200) {
    const k = 200 / max;
    r = Math.floor(r * k); g = Math.floor(g * k); b = Math.floor(b * k);
  }
  return `rgb(${r},${g},${b})`;
}

function softenColor(c) {
  if (!c || typeof c !== 'string') return '#d4c4a0';
  if (c.startsWith('#') && c.length === 7) {
    const r = Math.min(255, parseInt(c.slice(1, 3), 16) + 40);
    const g = Math.min(255, parseInt(c.slice(3, 5), 16) + 30);
    const b = Math.min(255, parseInt(c.slice(5, 7), 16) + 20);
    return `rgb(${r},${g},${b})`;
  }
  return '#d4c4a0';
}
