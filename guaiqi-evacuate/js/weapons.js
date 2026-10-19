import { getSprite, getIconCell } from './sprites.js';
/**
 * Facility weapon combat helpers (DESIGN §4).
 * Mutates game pools / enemies / player; returns nothing unless noted.
 */

export function resetWeaponTimers(p) {
  p.sporeMelonT = 0;
  p.thornDurianT = 0;
  p.vineLashT = 0;
  p.crystalNovaT = 0;
  p.dewBeamT = 0;
  p.drones = [];
  p.puddles = [];
  for (let i = 0; i < (p.leafDrone || 0); i++) {
    p.drones.push({ ang: (Math.PI * 2 * i) / Math.max(1, p.leafDrone), fireT: 0.2 * i });
  }
}

/** Sync drone count when upgrade applied mid-run */
export function syncDrones(p) {
  const n = p.leafDrone || 0;
  while (p.drones.length < n) {
    p.drones.push({ ang: Math.random() * Math.PI * 2, fireT: 0 });
  }
  p.drones.length = n;
}

function acquireBolt(game, opts) {
  const b = game.bullets.acquire();
  Object.assign(b, {
    trail: [],
    frost: 0,
    bounce: 0,
    crit: false,
    kind: 'bolt',
    ax: 0, ay: 0,
    aimTx: 0, aimTy: 0,
    beamW: 10, beamLen: 140,
    hitSet: null,
    explodeR: 0,
    knock: 0,
    homing: 0,
    puddle: false,
    pierce: 0,
    life: 1.2,
    age: 0,
    r: 5,
    hue: 50,
    streak: 0,
    tint: '',
  }, opts);
  return b;
}

export function firePrimaryBolts(game, target) {
  const p = game.player;
  const baseAng = Math.atan2(target.y - p.y, target.x - p.x);
  p.beamAim = baseAng;
  const n = Math.max(1, p.projectiles | 0);
  // Neighbor gap stays readable. One shot stays dead-center; scatter upgrades open the fan.
  const gap = Math.max(0.22, p.spread || 0.12);
  const style = p.shotStyle || 'bullet';
  const spd = p.shotSpeed || (style === 'chem' ? 270 : style === 'nail' ? 520 : 350);
  const scale = p.shotScale || 1;
  const pellet = (p.shotDamageMul || 1) * (p.pelletMul || 1);
  const kind = style === 'chem' ? 'chem' : style === 'nail' ? 'nail' : 'bolt';
  let tint = '';
  if ((p.frost || 0) > 0.05) tint = 'frost';
  else if ((p.pierce || 0) > 0) tint = 'pierce';
  else if ((p.fireRateStacks || 0) > 0) tint = 'rapid';
  const streak = (p.shotStreak || (style === 'bullet' ? 14 : 8)) + (tint === 'rapid' ? 10 : 0);
  const baseR = style === 'chem' ? 8 : style === 'nail' ? 6.5 : 5;
  const life = style === 'chem' ? 0.95 : style === 'nail' ? 0.7 : 1.15;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i - (n - 1) / 2;
    const ang = baseAng + t * gap;
    const crit = Math.random() < (p.critChance || 0.08);
    acquireBolt(game, {
      kind,
      x: p.x, y: p.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: baseR * scale * (crit ? 1.12 : 1),
      damage: p.damage * pellet * (crit ? (p.critDamage || 1.85) : 1),
      pierce: p.pierce,
      life,
      hue: 42,
      frost: p.frost || 0,
      crit,
      bounce: p.bounce || 0,
      knock: p.shotKnock || 0,
      streak,
      tint: crit ? '' : tint,
    });
  }
}

/** Dew beam: short continuous piercing ray that tracks aim briefly */
export function fireDewBeam(game, target) {
  const p = game.player;
  if (!p.dewBeam) return;
  const ang = Math.atan2(target.y - p.y, target.x - p.x);
  p.beamAim = ang;
  const len = p.dewBeamLen || 140;
  const w = p.dewBeamWidth || 10;
  acquireBolt(game, {
    kind: 'beam',
    x: p.x, y: p.y,
    vx: 0, vy: 0,
    aimTx: p.x + Math.cos(ang) * len,
    aimTy: p.y + Math.sin(ang) * len,
    beamW: w,
    beamLen: len,
    damage: p.damage * (0.55 + p.dewBeam * 0.12),
    pierce: 99,
    life: 0.22 + p.dewBeam * 0.04,
    r: w * 0.5,
    hue: 185,
    frost: (p.frost || 0) * 0.5,
    crit: false,
    hitSet: new Set(),
  });
}

export function fireMoonKnives(game, target) {
  const p = game.player;
  if (!p.moonKnives) return;
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  const count = 2 + p.moonKnives;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const ang = base + t * 0.85;
    acquireBolt(game, {
      kind: 'nail',
      x: p.x, y: p.y,
      vx: Math.cos(ang) * 420,
      vy: Math.sin(ang) * 420,
      r: 4.2,
      damage: p.damage * 0.7,
      pierce: 1 + Math.floor(p.moonKnives / 2),
      life: 0.34,
      hue: 42,
      frost: 0,
      crit: Math.random() < (p.critChance || 0) * 0.5,
      streak: 6,
      tint: '',
    });
  }
}

export function fireMothHex(game, target) {
  const p = game.player;
  if (!p.mothHex) return;
  const n = p.mothHex;
  for (let i = 0; i < n; i++) {
    const ang = Math.atan2(target.y - p.y, target.x - p.x) + (i - (n - 1) / 2) * 0.25;
    acquireBolt(game, {
      kind: 'seek',
      x: p.x, y: p.y,
      vx: Math.cos(ang) * 200,
      vy: Math.sin(ang) * 200,
      r: 7,
      damage: p.damage * 0.55,
      pierce: 0,
      life: 1.6,
      hue: 78,
      frost: 0.35 + p.mothHex * 0.08,
      homing: 4.5 + p.mothHex,
      crit: false,
      streak: 10,
      tint: 'frost',
    });
  }
}

export function tryFireSporeMelon(game, target, dt) {
  const p = game.player;
  if (!p.sporeMelon) return;
  p.sporeMelonT -= dt;
  if (p.sporeMelonT > 0) return;
  p.sporeMelonT = p.sporeMelonCd || 1.2;
  const ang = Math.atan2(target.y - p.y, target.x - p.x);
  const dist = Math.min(280, Math.hypot(target.x - p.x, target.y - p.y));
  const spd = 220;
  const flight = Math.max(0.35, dist / spd);
  acquireBolt(game, {
    kind: 'melon',
    x: p.x, y: p.y,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd - 160,
    ay: 420,
    r: 11,
    damage: p.damage * (1.1 + p.sporeMelon * 0.25),
    pierce: 0,
    life: flight + 0.15,
    hue: 95,
    puddle: true,
    explodeR: 55 + p.sporeMelon * 12,
    frost: 0.4,
  });
}

export function tryFireThornDurian(game, target, dt) {
  const p = game.player;
  if (!p.thornDurian) return;
  p.thornDurianT -= dt;
  if (p.thornDurianT > 0) return;
  p.thornDurianT = p.thornDurianCd || 1.6;
  const ang = Math.atan2(target.y - p.y, target.x - p.x);
  const dist = Math.min(300, Math.hypot(target.x - p.x, target.y - p.y));
  const spd = 240;
  const flight = Math.max(0.3, dist / spd);
  acquireBolt(game, {
    kind: 'durian',
    x: p.x, y: p.y,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd - 140,
    ay: 400,
    r: 12,
    damage: p.damage * (1.35 + p.thornDurian * 0.3),
    pierce: 0,
    life: flight + 0.1,
    hue: 45,
    explodeR: 70 + p.thornDurian * 14,
    knock: 140 + p.thornDurian * 40,
  });
}

export function tryVineLash(game, dt) {
  const p = game.player;
  if (!p.vineLash) return;
  p.vineLashT -= dt;
  if (p.vineLashT > 0) return;
  // find nearest in melee range
  let best = null, bestD = 110 + p.vineLash * 15;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (!best) return;
  p.vineLashT = p.vineLashCd || 1.0;
  const base = Math.atan2(best.y - p.y, best.x - p.x);
  const fan = 0.9;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > bestD + 20) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    let da = Math.abs(a - base);
    while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
    if (da < fan * 0.5) {
      game._hurtEnemy(e, p.damage * (0.9 + p.vineLash * 0.2), false);
      e.x += Math.cos(a) * 18;
      e.y += Math.sin(a) * 18;
    }
  }
  // visual slash bullets (short life)
  for (let i = -2; i <= 2; i++) {
    const ang = base + i * 0.18;
    acquireBolt(game, {
      kind: 'vine',
      x: p.x, y: p.y,
      vx: Math.cos(ang) * 380,
      vy: Math.sin(ang) * 380,
      r: 5,
      damage: 0,
      pierce: 99,
      life: 0.12,
      hue: 110,
    });
  }
}

export function tryCrystalNova(game, dt) {
  const p = game.player;
  if (!p.crystalNova) return;
  p.crystalNovaT -= dt;
  if (p.crystalNovaT > 0) return;
  // fire when enemies nearby
  let near = 0;
  for (const e of game.enemies) {
    if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 160) near++;
  }
  if (near < 2 && !game.enemies.some((e) => e.alive && e.isBoss)) return;
  p.crystalNovaT = p.crystalNovaCd || 5;
  const R = 90 + p.crystalNova * 25;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < R + e.r) {
      game._hurtEnemy(e, p.damage * (1.8 + p.crystalNova * 0.4), true);
    }
  }
  game.hazardZones.push({
    kind: 'nova', x: p.x, y: p.y, r: R, age: 0, life: 0.45, hit: true,
  });
}

export function updateDrones(game, dt) {
  const p = game.player;
  syncDrones(p);
  if (!p.drones.length) return;
  const radius = 48;
  for (let i = 0; i < p.drones.length; i++) {
    const d = p.drones[i];
    d.ang += dt * 1.8;
    d.x = p.x + Math.cos(d.ang) * radius;
    d.y = p.y + Math.sin(d.ang) * radius;
    d.fireT -= dt;
    if (d.fireT > 0) continue;
    let best = null, bestD = 260;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const dd = Math.hypot(e.x - d.x, e.y - d.y);
      if (dd < bestD) { bestD = dd; best = e; }
    }
    if (!best) continue;
    d.fireT = 0.55;
    const ang = Math.atan2(best.y - d.y, best.x - d.x);
    acquireBolt(game, {
      kind: 'drone',
      x: d.x, y: d.y,
      vx: Math.cos(ang) * 300,
      vy: Math.sin(ang) * 300,
      r: 4,
      damage: p.damage * 0.4,
      pierce: 0,
      life: 0.9,
      hue: 42,
      streak: 9,
      tint: '',
    });
  }
}

export function updatePuddles(game, dt) {
  const p = game.player;
  if (!p.puddles) p.puddles = [];
  for (const z of p.puddles) {
    z.age += dt;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) {
        e.slow = Math.max(e.slow, 0.7);
        z._acc = (z._acc || 0) + dt;
        if (z._acc >= 0.25) {
          z._acc = 0;
          game._hurtEnemy(e, z.dps * 0.25, false);
        }
      }
    }
  }
  p.puddles = p.puddles.filter((z) => z.age < z.life);
}

function explodeAt(game, b) {
  const R = b.explodeR || 60;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - b.x, e.y - b.y);
    if (d < R + e.r) {
      const falloff = 1 - (d / (R + e.r)) * 0.4;
      game._hurtEnemy(e, b.damage * falloff, b.crit);
      if (b.frost) e.slow = Math.max(e.slow, 0.55 + b.frost);
      if (b.knock) {
        const a = Math.atan2(e.y - b.y, e.x - b.x);
        e.x += Math.cos(a) * (b.knock * 0.08);
        e.y += Math.sin(a) * (b.knock * 0.08);
      }
    }
  }
  if (b.kind === 'durian') {
    // reverse thorns
    const n = 6 + (game.player.thornDurian || 1) * 2;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n;
      acquireBolt(game, {
        kind: 'thorn',
        x: b.x, y: b.y,
        vx: Math.cos(ang) * 280,
        vy: Math.sin(ang) * 280,
        r: 4,
        damage: game.player.damage * 0.35,
        pierce: 0,
        life: 0.4,
        hue: 40,
      });
    }
  }
  if (b.puddle) {
    if (!game.player.puddles) game.player.puddles = [];
    game.player.puddles.push({
      x: b.x, y: b.y,
      r: R * 0.85,
      age: 0,
      life: 2.8 + (game.player.sporeMelon || 1) * 0.4,
      dps: b.damage * 0.35,
      _acc: 0,
    });
  }
}

/**
 * Advance one bullet; returns true if still handling (skip default pierce logic partly).
 * Caller still does generic move for bolt kinds; this handles special kinds.
 */
export function tickSpecialBullet(game, b, dt) {
  if (b.kind === 'beam') {
    // track aim briefly
    const p = game.player;
    const ang = p.beamAim || 0;
    b.x = p.x; b.y = p.y;
    b.aimTx = p.x + Math.cos(ang) * b.beamLen;
    b.aimTy = p.y + Math.sin(ang) * b.beamLen;
    b.age += dt;
    if (b.age >= b.life) { b.alive = false; return true; }
    // damage along segment
    const dx = b.aimTx - b.x, dy = b.aimTy - b.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    if (!b.hitSet) b.hitSet = new Set();
    // refresh hit set each ~0.08s so continuous beam keeps cutting
    b._hitAcc = (b._hitAcc || 0) + dt;
    if (b._hitAcc > 0.1) { b.hitSet.clear(); b._hitAcc = 0; }
    for (const e of game.enemies) {
      if (!e.alive || b.hitSet.has(e)) continue;
      // point-line distance
      const wx = e.x - b.x, wy = e.y - b.y;
      const t = Math.max(0, Math.min(1, (wx * ux + wy * uy) / len));
      const px = b.x + ux * len * t, py = b.y + uy * len * t;
      if (Math.hypot(e.x - px, e.y - py) < e.r + b.beamW * 0.55) {
        b.hitSet.add(e);
        game._hurtEnemy(e, b.damage, false);
        if (b.frost) e.slow = Math.max(e.slow, 0.4 + b.frost);
      }
    }
    return true;
  }

  if (b.kind === 'melon' || b.kind === 'durian') {
    b.vy += (b.ay || 0) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.age += dt;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 8) b.trail.shift();
    // land when life ends or near target height (vy becomes +)
    if (b.age >= b.life) {
      explodeAt(game, b);
      b.alive = false;
    }
    return true;
  }

  if (b.kind === 'seek') {
    let best = null, bestD = 320;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      const desired = Math.atan2(best.y - b.y, best.x - b.x);
      const cur = Math.atan2(b.vy, b.vx);
      let da = desired - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const turn = Math.max(-b.homing * dt, Math.min(b.homing * dt, da));
      const spd = Math.hypot(b.vx, b.vy) || 200;
      const na = cur + turn;
      b.vx = Math.cos(na) * spd;
      b.vy = Math.sin(na) * spd;
    }
  }

  // vine visual-only / thorn / drone / knife / bolt use default mover
  return false;
}

export function drawWeaponFx(ctx, game) {
  const p = game.player;
  // puddles
  for (const z of (p.puddles || [])) {
    const a = 1 - z.age / z.life;
    ctx.fillStyle = `rgba(140,180,60,${0.18 * a})`;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(100,140,40,${0.45 * a})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // drones — industrial sweeper sprite (not grey oval)
  const vac = getSprite('roboVac') || getIconCell(19);
  for (const d of (p.drones || [])) {
    if (d.x == null) continue;
    if (vac) {
      const s = 28;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.ang || 0);
      if (vac.toDataURL) {
        // canvas cell
        ctx.drawImage(vac, -s / 2, -s / 2, s, s);
      } else {
        ctx.drawImage(vac, -s / 2, -s / 2, s, s);
      }
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 11, 8, d.ang || 0, 0, Math.PI * 2);
      ctx.fillStyle = '#9aa0a8';
      ctx.fill();
      ctx.strokeStyle = '#1a1e22';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawShotStreak(ctx, b) {
  const len = b.streak || 0;
  if (len < 6) return;
  const ang = Math.atan2(b.vy || 0, b.vx || 1);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  const w = Math.max(2, (b.r || 5) * 0.36);
  const grd = ctx.createLinearGradient(-len, 0, 0, 0);
  grd.addColorStop(0, 'rgba(240, 198, 140, 0)');
  grd.addColorStop(0.55, 'rgba(236, 186, 120, 0.18)');
  grd.addColorStop(1, 'rgba(232, 176, 110, 0.42)');
  ctx.strokeStyle = grd;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(1, 0);
  ctx.stroke();
  ctx.restore();
}

/** Soft local wash so pierce / frost / rapid read apart. Not a hit flash. */
function drawShotWash(ctx, b, rx, ry) {
  if (b.crit) return;
  const tint = b.tint || '';
  if (tint !== 'frost' && tint !== 'pierce' && tint !== 'rapid') return;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy || 0, b.vx || 1));
  ctx.globalAlpha = tint === 'rapid' ? 0.26 : 0.34;
  ctx.fillStyle = tint === 'frost' ? '#b7d4c6' : tint === 'pierce' ? '#e6c46e' : '#ffe0a8';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBullet(ctx, b) {
  if (b.kind === 'beam') {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // soft outer wash (anti-aliased warm halo, not a hard neon slab)
    const outer = ctx.createLinearGradient(b.x, b.y, b.aimTx, b.aimTy);
    outer.addColorStop(0, 'rgba(220,120,80,0.28)');
    outer.addColorStop(0.55, 'rgba(200,100,70,0.14)');
    outer.addColorStop(1, 'rgba(180,90,60,0)');
    ctx.strokeStyle = outer;
    ctx.lineWidth = b.beamW * 1.55;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.aimTx, b.aimTy);
    ctx.stroke();
    const grd = ctx.createLinearGradient(b.x, b.y, b.aimTx, b.aimTy);
    grd.addColorStop(0, 'rgba(232,140,96,0.88)');
    grd.addColorStop(0.45, 'rgba(210,110,78,0.55)');
    grd.addColorStop(1, 'rgba(180,90,60,0.08)');
    ctx.strokeStyle = grd;
    ctx.lineWidth = b.beamW;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.aimTx, b.aimTy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,180,0.55)';
    ctx.lineWidth = Math.max(1.5, b.beamW * 0.28);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.aimTx, b.aimTy);
    ctx.stroke();
    ctx.restore();
    return;
  }
  drawShotStreak(ctx, b);
  if (b.trail && b.trail.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `hsla(${b.hue || 42},58%,58%,0.32)`;
    ctx.lineWidth = Math.max(1.2, b.r * 0.75);
    ctx.beginPath();
    ctx.moveTo(b.trail[0].x, b.trail[0].y);
    for (const t of b.trail) ctx.lineTo(t.x, t.y);
    ctx.stroke();
    ctx.restore();
  }
  if (b.kind === 'melon' || b.kind === 'chem' || b.kind === 'jug') {
    const spr = getSprite('projChem');
    if (spr) {
      const s = Math.max(22, b.r * 3.4);
      ctx.drawImage(spr, b.x - s / 2, b.y - s / 2, s, s);
      drawShotWash(ctx, b, s * 0.34, s * 0.28);
      return;
    }
    // fallback thick-outline barrel
    ctx.fillStyle = '#5a6a48';
    ctx.strokeStyle = '#2a2e22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r * 1.15, b.r * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c8b040';
    ctx.fillRect(b.x - b.r * 0.9, b.y - 2, b.r * 1.8, 4);
    return;
  }
  if (b.kind === 'durian' || b.kind === 'nail' || b.kind === 'thorn') {
    const nailSpr = getSprite('projNail');
    if (nailSpr) {
      const ang = Math.atan2(b.vy || 0, b.vx || 1);
      const s = b.kind === 'durian' ? Math.max(24, b.r * 3.4) : Math.max(16, b.r * 3.0);
      ctx.save();
      ctx.translate(b.x, b.y);
      // Sheet art points down; tip should lead along velocity.
      ctx.rotate(ang - Math.PI / 2);
      ctx.drawImage(nailSpr, -s * 0.5, -s * 0.5, s, s);
      ctx.restore();
      drawShotWash(ctx, b, s * 0.22, s * 0.16);
      return;
    }
    // fallback: dull spike, not neon green
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = '#6a6050';
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + b.age * 4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(a) * (b.r + 6), b.y + Math.sin(a) * (b.r + 6));
      ctx.strokeStyle = '#6a5020';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    return;
  }
  if (b.kind === 'knife') {
    const nailSpr = getSprite('projNail');
    const ang = Math.atan2(b.vy, b.vx);
    if (nailSpr) {
      const s = Math.max(16, b.r * 3);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang - Math.PI / 2);
      ctx.drawImage(nailSpr, -s * 0.5, -s * 0.5, s, s);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.fillStyle = '#e6c878';
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-6, -4); ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (b.kind === 'seek') {
    const chem = getSprite('projChem');
    if (chem) {
      const s = Math.max(20, b.r * 3.2);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(chem, b.x - s / 2, b.y - s / 2, s, s);
      ctx.globalAlpha = 1;
      drawShotWash(ctx, b, s * 0.32, s * 0.26);
      return;
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,130,100,0.85)';
    ctx.strokeStyle = '#3a3830';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    return;
  }
  // default bolt — brass slug, not neon dot
  const bulletSpr = getSprite('projBullet');
  const ang = Math.atan2(b.vy || 0, b.vx || 1);
  if (bulletSpr) {
    const bw = Math.max(22, b.r * 4.4);
    const bh = Math.max(8, bw * 0.48);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.drawImage(bulletSpr, -bw * 0.55, -bh / 2, bw, bh);
    if (b.crit) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(212, 176, 96, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, bw * 0.35, bh * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawShotWash(ctx, b, bw * 0.34, bh * 0.7);
    return;
  }
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  const L = Math.max(8, b.r * 2.2);
  const Ww = Math.max(3, b.r * 0.85);
  ctx.fillStyle = b.crit ? '#ffd060' : (b.tint === 'frost' ? '#d5e4cf' : b.tint === 'pierce' ? '#e6c46e' : '#ffc040');
  ctx.strokeStyle = '#3a3020';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(L * 0.55, 0);
  ctx.lineTo(L * 0.15, -Ww);
  ctx.lineTo(-L * 0.45, -Ww * 0.85);
  ctx.lineTo(-L * 0.55, 0);
  ctx.lineTo(-L * 0.45, Ww * 0.85);
  ctx.lineTo(L * 0.15, Ww);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
