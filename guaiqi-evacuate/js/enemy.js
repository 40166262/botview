import { getSprite, drawClippedSprite } from './sprites.js';

/** Enemy types + bosses — DESIGN §6 */
export const ENEMY_TYPES = {
  slime: {
    name: '绿皮丧尸',
    color: '#6db88a',
    color2: '#3a8a5c',
    r: 12,
    hp: 28,
    speed: 55,
    damage: 8,
    xp: 1,
    score: 1,
    glow: 'rgba(109,184,138,0.26)',
  },
  bat: {
    name: '爬行患者',
    color: '#a88bc8',
    color2: '#6a4a90',
    r: 10,
    hp: 18,
    speed: 95,
    damage: 10,
    xp: 1,
    score: 1,
    glow: 'rgba(168,139,200,0.26)',
  },
  beetle: {
    name: '铠甲尸',
    color: '#8a7a50',
    color2: '#5a4a28',
    r: 15,
    hp: 55,
    speed: 38,
    damage: 12,
    xp: 2,
    score: 2,
    glow: 'rgba(160,140,80,0.26)',
  },
  wisp: {
    name: '故障监视器',
    color: '#7ec8e0',
    color2: '#3a88a8',
    r: 11,
    hp: 22,
    speed: 70,
    damage: 9,
    xp: 2,
    score: 2,
    glow: 'rgba(126,200,224,0.3)',
    ranged: true,
  },
  golem: {
    name: '保安机器人',
    color: '#9aa8b8',
    color2: '#5a6a78',
    r: 18,
    hp: 90,
    speed: 35,
    damage: 16,
    xp: 3,
    score: 3,
    glow: 'rgba(154,168,184,0.26)',
  },
  shadow: {
    name: '阴影潜伏者',
    color: '#5a4068',
    color2: '#2a1838',
    r: 13,
    hp: 35,
    speed: 80,
    damage: 14,
    xp: 2,
    score: 2,
    glow: 'rgba(90,60,110,0.3)',
    phase: true,
  },
  boss: {
    name: '设施霸主',
    color: '#d08098',
    color2: '#8a4060',
    r: 36,
    hp: 500,
    speed: 42,
    damage: 20,
    xp: 25,
    score: 50,
    isBoss: true,
    glow: 'rgba(208,128,152,0.28)',
  },
};

const ELITE_SKILLS = ['charge', 'spore', 'lightning', 'reflect'];

export function createEnemy(typeKey, x, y, scale = 1, opts = {}) {
  const t = ENEMY_TYPES[typeKey] || ENEMY_TYPES.slime;
  const elite = !!opts.elite;
  const eliteMul = elite ? 2.2 : 1;
  let skill = opts.skill || null;
  if (elite && !skill) {
    skill = ELITE_SKILLS[Math.floor(Math.random() * ELITE_SKILLS.length)];
  }
  if (opts.bossVariant) skill = null; // boss picks in update
  return {
    alive: true,
    type: typeKey,
    x, y,
    r: t.r * (scale > 1 ? Math.sqrt(scale) : 1) * (elite ? 1.35 : 1),
    hp: t.hp * scale * eliteMul,
    maxHp: t.hp * scale * eliteMul,
    speed: t.speed * (0.9 + Math.random() * 0.2) * (elite ? 1.1 : 1),
    baseSpeed: t.speed * (0.9 + Math.random() * 0.2) * (elite ? 1.1 : 1),
    damage: t.damage * (elite ? 1.4 : 1),
    xp: Math.ceil(t.xp * scale * (elite ? 3 : 1)),
    score: t.score * (elite ? 4 : 1),
    color: elite ? '#d4a84a' : t.color,
    color2: elite ? '#b07020' : t.color2,
    isBoss: !!t.isBoss,
    isElite: elite,
    hitFlash: 0,
    slow: 0,
    wobble: Math.random() * Math.PI * 2,
    vx: 0,
    vy: 0,
    skill,
    skillCd: elite || t.isBoss ? 1.5 + Math.random() * 2 : 0,
    skillState: 'idle',
    skillT: 0,
    skillAng: 0,
    skillRange: 0,
    shieldHits: 0,
    reflectT: 0,
    bossPhase: 1,
    bossVariant: opts.bossVariant || 0, // 0 moss / 1 jelly / 2 lamp
    ranged: !!t.ranged,
    phase: !!t.phase,
    phaseHidden: false,
    shootCd: t.ranged ? 1.5 + Math.random() : 0,
    warnX: 0,
    warnY: 0,
    warnCircles: [],
  };
}

/**
 * Update elite/boss skills. Returns events for game to apply.
 */
export function updateEnemySkill(e, player, dt) {
  const events = [];
  if (!e.alive) return events;
  if (e.reflectT > 0) e.reflectT -= dt;

  // wisp ranged — simple bolt event
  if (e.ranged && e.skillState === 'idle' && !e.isElite && !e.isBoss) {
    e.shootCd -= dt;
    if (e.shootCd <= 0) {
      e.shootCd = 2.2;
      events.push({
        type: 'enemy_bolt',
        x: e.x, y: e.y,
        ang: Math.atan2(player.y - e.y, player.x - e.x),
        damage: e.damage * 0.7,
      });
    }
  }

  // shadow phase
  if (e.phase && !e.isElite && !e.isBoss) {
    e._phaseT = (e._phaseT || 0) + dt;
    if (e._phaseT > 2.5) {
      e._phaseT = 0;
      e.phaseHidden = !e.phaseHidden;
    }
  }

  if (!e.isElite && !e.isBoss) return events;

  if (e.skillState === 'idle') {
    e.skillCd -= dt;
    if (e.skillCd > 0) return events;

    if (e.isBoss) {
      pickBossSkill(e, player);
      return events;
    }

    if (e.skill === 'charge') {
      e.skillState = 'windup';
      e.skillT = 0.65;
      e.skillAng = Math.atan2(player.y - e.y, player.x - e.x);
    } else if (e.skill === 'spore') {
      e.skillState = 'windup';
      e.skillT = 0.5;
      e.skillRange = 70;
    } else if (e.skill === 'lightning') {
      e.skillState = 'windup';
      e.skillT = 0.9;
      e.warnCircles = [];
      for (let i = 0; i < 3; i++) {
        const a = Math.atan2(player.y - e.y, player.x - e.x) + (i - 1) * 0.55;
        const d = 80 + i * 35;
        e.warnCircles.push({
          x: e.x + Math.cos(a) * d,
          y: e.y + Math.sin(a) * d,
          r: 38,
        });
      }
    } else if (e.skill === 'reflect') {
      e.skillState = 'windup';
      e.skillT = 0.4;
    } else {
      e.skillCd = 3;
    }
    return events;
  }

  if (e.skillState === 'windup') {
    e.skillT -= dt;
    if (e.skill === 'charge') {
      e.skillAng = Math.atan2(player.y - e.y, player.x - e.x);
    }
    if (e.skillT <= 0) {
      e.skillState = 'active';
      if (e.skill === 'charge') {
        e.skillT = 0.35;
        e.vx = Math.cos(e.skillAng) * (e.isBoss ? 380 : 320);
        e.vy = Math.sin(e.skillAng) * (e.isBoss ? 380 : 320);
      } else if (e.skill === 'shockwave' || e.skill === 'slime_fan') {
        events.push({ type: 'shockwave', x: e.x, y: e.y, r: e.skillRange || 100, damage: e.damage * 0.85, fan: e.skill === 'slime_fan', ang: e.skillAng });
        e.skillState = 'idle';
        e.skillCd = 4.5 + Math.random() * 1.5;
      } else if (e.skill === 'spore') {
        events.push({ type: 'spore', x: e.x, y: e.y, r: e.skillRange || 70 });
        e.skillState = 'idle';
        e.skillCd = 6;
      } else if (e.skill === 'spawn' || e.skill === 'summon') {
        events.push({ type: 'spawn', kind: Math.random() < 0.5 ? 'slime' : 'bat', n: e.isBoss ? 3 : 2 });
        e.skillState = 'idle';
        e.skillCd = 6 + Math.random() * 2;
      } else if (e.skill === 'lightning') {
        for (const c of e.warnCircles || []) {
          events.push({ type: 'lightning', x: c.x, y: c.y, r: c.r, damage: e.damage * 0.9 });
        }
        e.warnCircles = [];
        e.skillState = 'idle';
        e.skillCd = 5.5;
      } else if (e.skill === 'reflect') {
        e.reflectT = 1.5;
        e.skillState = 'idle';
        e.skillCd = 9;
        events.push({ type: 'reflect_on', enemy: e });
      } else if (e.skill === 'water_ring') {
        events.push({ type: 'shockwave', x: e.x, y: e.y, r: e.skillRange || 120, damage: e.damage * 0.75 });
        e.skillState = 'idle';
        e.skillCd = 5;
      } else if (e.skill === 'trident') {
        for (let i = -1; i <= 1; i++) {
          events.push({
            type: 'enemy_bolt',
            x: e.x, y: e.y,
            ang: e.skillAng + i * 0.35,
            damage: e.damage * 0.8,
            speed: 260,
          });
        }
        e.skillState = 'idle';
        e.skillCd = 4.5;
      } else if (e.skill === 'dive') {
        e.skillT = 0.4;
        e.vx = Math.cos(e.skillAng) * 420;
        e.vy = Math.sin(e.skillAng) * 420;
        e.skill = 'charge'; // reuse charge active
      } else if (e.skill === 'rot_beam') {
        events.push({ type: 'rot_beam', x: e.x, y: e.y, ang: e.skillAng, len: 220, damage: e.damage * 0.7 });
        e.skillState = 'idle';
        e.skillCd = 5;
      } else if (e.skill === 'mines') {
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI * 2 * i) / 4 + Math.random() * 0.3;
          events.push({
            type: 'mine',
            x: e.x + Math.cos(a) * 90,
            y: e.y + Math.sin(a) * 90,
            r: 32,
            damage: e.damage * 0.85,
          });
        }
        e.skillState = 'idle';
        e.skillCd = 7;
      } else if (e.skill === 'clone') {
        events.push({ type: 'spawn', kind: 'shadow', n: 2 });
        e.skillState = 'idle';
        e.skillCd = 10;
      } else {
        e.skillState = 'idle';
        e.skillCd = 4;
      }
    }
    return events;
  }

  if (e.skillState === 'active' && e.skill === 'charge') {
    e.skillT -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx *= 0.98;
    e.vy *= 0.98;
    if (e.skillT <= 0) {
      e.skillState = 'idle';
      e.skillCd = e.isBoss ? 4.5 : 3.5;
      e.vx = 0; e.vy = 0;
    }
  }
  return events;
}

function pickBossSkill(e, player) {
  const hpRatio = e.hp / e.maxHp;
  if (hpRatio < 0.4) e.bossPhase = 3;
  else if (hpRatio < 0.7) e.bossPhase = 2;
  else e.bossPhase = 1;

  const v = e.bossVariant || 0;
  // 0 黏液主管 / 1 巡夜医师 / 2 灯笼发电机
  let skills;
  if (v === 1) skills = ['water_ring', 'trident', 'dive'];
  else if (v === 2) skills = ['rot_beam', 'mines', 'clone'];
  else skills = ['slime_fan', 'summon', 'spore'];

  // phase accelerates
  const idx = Math.min(skills.length - 1, e.bossPhase - 1 + (Math.random() < 0.5 ? 0 : 1));
  e.skill = skills[Math.floor(Math.random() * Math.min(skills.length, e.bossPhase + 1))];
  e.skillState = 'windup';
  e.skillAng = Math.atan2(player.y - e.y, player.x - e.x);
  if (e.skill === 'slime_fan' || e.skill === 'water_ring') {
    e.skillT = 0.85;
    e.skillRange = 95 + e.r;
  } else if (e.skill === 'dive' || e.skill === 'charge') {
    e.skillT = 0.7;
  } else if (e.skill === 'rot_beam') {
    e.skillT = 0.75;
  } else {
    e.skillT = 0.55;
  }
}

function flashColor(e) {
  return e.isBoss ? '#e8c0c8' : e.isElite ? '#e8d4a0' : '#d8c8b0';
}

function drawEnemyVector(ctx, e, bob, flash) {
  if (e.isBoss || e.isElite) {
    const aura = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 1.5);
    aura.addColorStop(0, e.isBoss ? 'rgba(160,80,100,0.14)' : 'rgba(160,130,50,0.14)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.r * 0.15, e.r * 1.15, e.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = e.phaseHidden ? 0.35 : 1;
  ctx.beginPath();
  if (e.type === 'bat' || e.type === 'shadow') {
    ctx.ellipse(e.x, e.y + bob, e.r * 1.4, e.r * 0.75, 0, 0, Math.PI * 2);
  } else if (e.type === 'golem' || e.type === 'beetle') {
    ctx.rect(e.x - e.r, e.y - e.r + bob, e.r * 2, e.r * 2);
  } else if (e.type === 'wisp') {
    ctx.arc(e.x, e.y + bob, e.r, 0, Math.PI * 2);
  } else {
    ctx.arc(e.x, e.y + bob, e.r, 0, Math.PI * 2);
  }
  const grad = ctx.createRadialGradient(
    e.x - e.r * 0.3, e.y + bob - e.r * 0.3, 2,
    e.x, e.y + bob, e.r,
  );
  grad.addColorStop(0, flash ? flashColor(e) : e.color);
  grad.addColorStop(1, flash ? '#c8a090' : e.color2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.globalAlpha = 1;

  const eyeY = e.y + bob - e.r * 0.15;
  const eyeS = Math.max(2, e.r * 0.18);
  ctx.fillStyle = '#1a1020';
  ctx.beginPath();
  ctx.arc(e.x - e.r * 0.28, eyeY, eyeS, 0, Math.PI * 2);
  ctx.arc(e.x + e.r * 0.28, eyeY, eyeS, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemy(ctx, e, t) {
  ctx.save();
  const flash = e.hitFlash > 0;
  const bob = Math.sin(t * 3 + e.wobble) * (e.isBoss ? 3 : 2);
  const typeMeta = ENEMY_TYPES[e.type] || ENEMY_TYPES.slime;
  const spriteKey = e.type === 'boss' ? 'boss'
    : e.type === 'beetle' ? 'golem'
    : e.type === 'wisp' ? 'golem'
    : e.type === 'shadow' ? 'shadow'
    : e.type;
  const sprite = getSprite(spriteKey);

  // skill telegraph
  if (e.skillState === 'windup') {
    if (e.skill === 'charge' || e.skill === 'dive') {
      ctx.strokeStyle = 'rgba(200,80,70,0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.skillAng) * 160, e.y + Math.sin(e.skillAng) * 160);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (e.skill === 'shockwave' || e.skill === 'spore' || e.skill === 'slime_fan' || e.skill === 'water_ring') {
      const r = e.skillRange || 80;
      const pulse = 0.35 + 0.25 * Math.sin(t * 10);
      ctx.strokeStyle = e.skill === 'spore' ? `rgba(180,200,80,${pulse})` : `rgba(200,100,130,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = e.skill === 'spore' ? `rgba(180,200,80,0.08)` : `rgba(200,100,130,0.08)`;
      ctx.fill();
    } else if (e.skill === 'lightning') {
      for (const c of e.warnCircles || []) {
        const pulse = 0.4 + 0.3 * Math.sin(t * 12);
        ctx.strokeStyle = `rgba(220,200,80,${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(220,200,80,0.12)`;
        ctx.fill();
      }
    } else if (e.skill === 'rot_beam') {
      ctx.strokeStyle = 'rgba(180,220,255,0.5)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.skillAng) * 200, e.y + Math.sin(e.skillAng) * 200);
      ctx.stroke();
    } else if (e.skill === 'reflect') {
      ctx.strokeStyle = `rgba(180,220,255,${0.5 + Math.sin(t * 10) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, e.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (e.reflectT > 0) {
    ctx.strokeStyle = `rgba(150,210,255,${0.55 + Math.sin(t * 8) * 0.25})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, e.r + 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (sprite) {
    if (e.isBoss || e.isElite) {
      // Soft elliptical aura — not a white circular plate
      const aura = ctx.createRadialGradient(e.x, e.y + bob, 0, e.x, e.y + bob, e.r * 1.6);
      aura.addColorStop(0, e.isBoss ? 'rgba(160,80,100,0.14)' : 'rgba(160,130,50,0.14)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + bob + e.r * 0.2, e.r * 1.2, e.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = e.phaseHidden ? 0.35 : 1;
    drawClippedSprite(ctx, sprite, e.x, e.y + bob, e.r, {
      glow: 'none',
      scale: e.type === 'bat' || e.type === 'shadow' ? 1.4 : e.type === 'golem' || e.type === 'beetle' ? 1.2 : e.isBoss ? 1.18 : 1.25,
      flash,
    });
    ctx.globalAlpha = 1;
  } else {
    drawEnemyVector(ctx, e, bob, flash);
  }

  if (e.slow > 0) {
    ctx.strokeStyle = 'rgba(150,190,160,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, e.r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (e.isBoss || e.isElite || e.hp < e.maxHp * 0.99) {
    const bw = e.r * 2;
    const bx = e.x - bw / 2;
    const by = e.y - e.r - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = e.isBoss ? '#d08098' : e.isElite ? '#d4a84a' : '#6db88a';
    ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 4);
  }
  ctx.restore();
}

export function spawnPointAround(px, py, minD, maxD, worldW, worldH) {
  const a = Math.random() * Math.PI * 2;
  const d = minD + Math.random() * (maxD - minD);
  let x = px + Math.cos(a) * d;
  let y = py + Math.sin(a) * d;
  x = Math.max(40, Math.min(worldW - 40, x));
  y = Math.max(40, Math.min(worldH - 40, y));
  return { x, y };
}

/** Boss HP from DESIGN §13: 500 * stageMul * tone */
export function bossHpScale(stageMul, tone = 1.4) {
  return 500 * stageMul * tone;
}
