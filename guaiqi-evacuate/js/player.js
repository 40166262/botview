import { getSprite, getIconCell, drawClippedSprite } from './sprites.js';

export function createPlayer(cx, cy) {
  return {
    x: cx,
    y: cy,
    r: 16,
    hp: 100,
    maxHp: 100,
    speed: 145,
    damage: 12, // fodder dies in 1-2 hits → instant 爽感; grows via upgrades
    fireCooldown: 0.4,
    fireTimer: 0,
    projectiles: 1,
    pierce: 0,
    spread: 0.12,
    // Equipped-weapon silhouette. Gear and shot upgrades rewrite these.
    shotStyle: 'bullet', // bullet | nail | chem
    shotSpeed: 350,
    shotScale: 1,
    shotStreak: 12,
    shotDamageMul: 1,
    pelletMul: 1,
    shotKnock: 0,
    fireRateStacks: 0,
    weaponId: '',
    magnet: 85,
    lifesteal: 0,
    orbitBalls: 0,
    orbitAngle: 0,
    invuln: 0,
    xp: 0,
    level: 1,
    xpToNext: 3, // first level-up inside ~6s (three fodder gems)
    facing: 0,
    pulse: 0,
    // new stats
    critChance: 0.08,
    critDamage: 1.85,
    bulletScale: 1,
    shield: 0,
    xpBonus: 1,
    coinBonus: 1,
    thorns: 0,
    frost: 0,
    bounce: 0,
    splitOnKill: 0,
    dashGhost: 0,
    ghosts: [],
    // fantasy weapons (DESIGN §5)
    dewBeam: 0,
    dewBeamWidth: 10,
    dewBeamLen: 140,
    dewBeamT: 0,
    sporeMelon: 0,
    sporeMelonCd: 1.2,
    sporeMelonT: 0,
    thornDurian: 0,
    thornDurianCd: 1.6,
    thornDurianT: 0,
    leafDrone: 0,
    mothHex: 0,
    moonKnives: 0,
    vineLash: 0,
    vineLashCd: 1.0,
    vineLashT: 0,
    crystalNova: 0,
    crystalNovaCd: 5.0,
    crystalNovaT: 0,
    drones: [],
    puddles: [],
    beamAim: 0,
  };
}

export function xpNeeded(level) {
  // Lv1 threshold is the player's starting xpToNext (3). Later levels ramp gently.
  if (level <= 2) return 4 + level;
  return Math.floor(6 + (level - 1) * 5 + Math.pow(level, 1.5) * 1.2);
}

function drawPlayerVector(ctx, p, t, bob) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 36);
  g.addColorStop(0, 'rgba(255,224,102,0.45)');
  g.addColorStop(0.5, 'rgba(200,180,120,0.15)');
  g.addColorStop(1, 'rgba(255,224,102,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, p.r, 0, Math.PI * 2);
  const body = ctx.createRadialGradient(p.x - 3, p.y + bob - 3, 2, p.x, p.y + bob, p.r);
  body.addColorStop(0, '#fff8c8');
  body.addColorStop(0.45, '#ffe066');
  body.addColorStop(1, '#f0a020');
  ctx.fillStyle = body;
  ctx.fill();

  ctx.fillStyle = '#1a2030';
  ctx.beginPath();
  ctx.arc(p.x - 4, p.y + bob - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(p.x + 5, p.y + bob - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(p.x - 3.5, p.y + bob - 2.6, 0.8, 0, Math.PI * 2);
  ctx.arc(p.x + 5.5, p.y + bob - 2.6, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.45 + Math.sin(t * 12) * 0.15;
  ctx.fillStyle = 'rgba(180,230,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(p.x - 12, p.y + bob, 8, 4, -0.5, 0, Math.PI * 2);
  ctx.ellipse(p.x + 12, p.y + bob, 8, 4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawPlayer(ctx, p, t) {
  ctx.save();
  const bob = Math.sin(t * 4 + p.pulse) * 0.5;
  const sprite = getSprite('player');

  if (sprite) {
    drawClippedSprite(ctx, sprite, p.x, p.y + bob, p.r, {
      glow: 'none',
      scale: 1.95,
    });
  } else {
    drawPlayerVector(ctx, p, t, bob);
  }

  // shield ring
  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(200,180,120,${0.55 + Math.sin(t * 5) * 0.25})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,180,120,0.12)';
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.r + 8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (p.orbitBalls > 0) {
    const radius = 38 + p.orbitBalls * 4;
    const fan = (typeof getIconCell === 'function' ? getIconCell(22) : null) || getSprite('roboVac');
    for (let i = 0; i < p.orbitBalls; i++) {
      const a = p.orbitAngle + (Math.PI * 2 * i) / p.orbitBalls;
      const ox = p.x + Math.cos(a) * radius;
      const oy = p.y + Math.sin(a) * radius;
      if (fan) {
        const s = 22;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(a + p.orbitAngle);
        ctx.drawImage(fan, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(ox, oy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#c8a050';
        ctx.fill();
        ctx.strokeStyle = '#2a2418';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  if (p.invuln > 0) {
    ctx.globalAlpha = 0.2 + 0.16 * (0.5 + 0.5 * Math.sin(t * 5.5));
    ctx.strokeStyle = 'rgba(210,180,120,0.75)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
