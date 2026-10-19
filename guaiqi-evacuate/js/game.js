import { createPlayer, drawPlayer, xpNeeded } from './player.js';
import { createEnemy, drawEnemy, spawnPointAround, updateEnemySkill } from './enemy.js';
import {
  createPool, makeBullet, makeGem, makeParticle, makeDmgText, makeChest, spawnBurst,
} from './entities.js';
import { pickUpgradeChoices, UPGRADES } from './upgrades.js';
import {
  resetWeaponTimers, syncDrones, firePrimaryBolts, fireDewBeam, fireMoonKnives, fireMothHex,
  tryFireSporeMelon, tryFireThornDurian, tryVineLash, tryCrystalNova,
  updateDrones, updatePuddles, tickSpecialBullet, drawWeaponFx, drawBullet,
} from './weapons.js';
import { SFX, softVibrate } from './audio.js';
import {
  getStage, pickEnemyType, spawnRateAt, difficultyScale,
  isStageCleared, clearProgress, waveLabel, stageGoalLine,
} from './stages.js';
import {
  createJuice, tickJuice, inHitstop, registerKill, triggerCritFlash,
  drawJuiceOverlay, spawnKillBurst, spawnHitSpark, addShake, shakeOffset,
} from './juice.js';
import { applyCharacterToPlayer, applyPassivesToPlayer, applyGearToPlayer, applyCharLevelToPlayer, unlockGallery } from './meta.js';
import { getIconCell, getChestImage, getCharSprite, getSprite, drawStandingSprite, walkPose } from './sprites.js';

const W = 390;
const H = 844;
const WORLD_W = 1200;
const WORLD_H = 1600;
const VIEW_ZOOM = 1.22; // pull-in so chars/loot read larger on phone

/**
 * Opening density and timed events. Stages 1–2 stay sparse so a new player
 * can move, open the first crate, and clear. Stages 3–5 blend that opening
 * back into the mid pace (same t as stages.js). 40+ keeps the old seed and
 * adds a little more swarm pressure.
 */
function mixPace(t) {
  const a = { seed: 5, minD: 210, maxD: 310, scale: 0.78, spawnAcc: 0.3, earlyBoost: 1.0, swarmAt: 26, swarmBase: 8, swarmStep: 1, eliteAt: 50, announceExtra: 3, swarmCap: 18, swarmGap: 24 };
  const b = { seed: 7, minD: 150, maxD: 220, scale: 0.85, spawnAcc: 0.85, earlyBoost: 1.6, swarmAt: 14, swarmBase: 10, swarmStep: 2, eliteAt: 38, announceExtra: 5, swarmCap: 22, swarmGap: 20 };
  const ints = new Set(['seed', 'minD', 'maxD', 'swarmAt', 'swarmBase', 'swarmStep', 'eliteAt', 'announceExtra', 'swarmCap', 'swarmGap']);
  const out = {};
  for (const k of Object.keys(a)) {
    const v = a[k] + (b[k] - a[k]) * t;
    out[k] = ints.has(k) ? Math.round(v) : Math.round(v * 1000) / 1000;
  }
  return out;
}

function paceProfile(stage) {
  const n = stage.stageNum || 1;
  if (n <= 1) {
    return { seed: 4, minD: 240, maxD: 340, scale: 0.7, spawnAcc: 0.08, earlyBoost: 0.85, swarmAt: 34, swarmBase: 6, swarmStep: 1, eliteAt: 64, announceExtra: 2, swarmCap: 16, swarmGap: 24 };
  }
  if (n === 2) {
    return { seed: 5, minD: 210, maxD: 310, scale: 0.78, spawnAcc: 0.3, earlyBoost: 1.0, swarmAt: 26, swarmBase: 8, swarmStep: 1, eliteAt: 50, announceExtra: 3, swarmCap: 18, swarmGap: 24 };
  }
  if (n === 3) return mixPace(0.42);
  if (n === 4) return mixPace(0.70);
  if (n === 5) return mixPace(0.88);
  if (n >= 70) {
    return { seed: 7, minD: 140, maxD: 210, scale: 0.9, spawnAcc: 0.9, earlyBoost: 1.8, swarmAt: 12, swarmBase: 12, swarmStep: 2, eliteAt: 28, announceExtra: 6, swarmCap: 26, swarmGap: 20 };
  }
  if (n >= 40) {
    return { seed: 7, minD: 150, maxD: 220, scale: 0.88, spawnAcc: 0.85, earlyBoost: 1.75, swarmAt: 13, swarmBase: 11, swarmStep: 2, eliteAt: 32, announceExtra: 5, swarmCap: 24, swarmGap: 20 };
  }
  return { seed: 7, minD: 150, maxD: 220, scale: 0.85, spawnAcc: 0.85, earlyBoost: 1.6, swarmAt: 14, swarmBase: 10, swarmStep: 2, eliteAt: 38, announceExtra: 5, swarmCap: 22, swarmGap: 20 };
}

/** r6 floor palettes — warm pixel-grid tiles (stronger grout, less soft bevel). */
const FLOOR_THEMES = {
  office: { // warm beige carpet tiles
    tile: 64, base: '#ecd6a6', tones: ['#ecd6a6', '#e8d19f', '#efdaae', '#ead4a3'],
    seam: 'rgba(140,96,48,0.38)', hi: 'rgba(255,248,226,0.28)', lo: 'rgba(150,104,52,0.14)',
    edge: '#d9b77e', accent: null,
  },
  ward: { // warm sand tiles (mint teal read as a style break on the cardboard floor)
    tile: 48, base: '#e6d3a8', tones: ['#e6d3a8', '#e2cfa2', '#ead8b0', '#e4d1a6'],
    seam: 'rgba(140,96,48,0.36)', hi: 'rgba(255,248,226,0.30)', lo: 'rgba(150,104,52,0.14)',
    edge: '#d7b888', accent: '#f3e2c0',
  },
  basement: { // peach-sand plates, warm grout
    tile: 56, accentP: 0.06, base: '#f2d4a8', tones: ['#f2d4a8', '#efcfa1', '#f5d9b0', '#f0d2a5'],
    seam: 'rgba(140,90,40,0.42)', hi: 'rgba(255,246,226,0.32)', lo: 'rgba(196,120,60,0.20)',
    edge: '#e0b888', accent: '#f6e2c4',
  },
};

export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // HiDPI backing store: CSS still displays at 100%, game draws in 390×844 logical coords
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    if ('webkitImageSmoothingEnabled' in this.ctx) this.ctx.webkitImageSmoothingEnabled = true;
    if ('mozImageSmoothingEnabled' in this.ctx) this.ctx.mozImageSmoothingEnabled = true;
    this.hooks = hooks;
    this.running = false;
    this.paused = false;
    this.joy = { active: false, dx: 0, dy: 0 };
    this.stageId = 's1';
    this.charId = 'grin';
    this.equipped = [];
    this.saveRef = null;
    this.reset();
  }

  configure({ stageId, charId, equipped, save, coach }) {
    this.stageId = stageId || 's1';
    this.charId = charId || 'grin';
    this.equipped = equipped || [];
    this.saveRef = save || null;
    this.coachFresh = !!coach;
  }

  /** Hide a first-run plaque. Movement itself is tracked in update(). */
  dismissCoach(which) {
    if (!this.tips) return;
    if (which === 'move') this.tips.move = false;
    if (which === 'act') this.tips.act = false;
    if (which === 'idle') this.tips.idle = false;
  }

  reset() {
    this.stage = getStage(this.stageId);
    this.player = createPlayer(WORLD_W / 2, WORLD_H / 2);
    applyCharacterToPlayer(this.player, this.charId);
    if (this.saveRef) {
      applyCharLevelToPlayer(this.player, this.saveRef);
      applyGearToPlayer(this.player, this.saveRef);
      applyPassivesToPlayer(this.player, this.equipped, this.saveRef.inventory || {});
      // soft pity: fail same stage 3+ times → temporary +10% damage
      const streak = (this.saveRef.failStreak || {})[this.stageId] || 0;
      if (streak >= 3) this.player.damage *= 1.1;
    }
    this.enemies = [];
    this.bullets = createPool(makeBullet, 80);
    this.gems = createPool(makeGem, 64);
    this.particles = createPool(makeParticle, 140);
    this.dmgTexts = createPool(makeDmgText, 48);
    this.chests = createPool(makeChest, 4);
    this.coinPops = [];
    this.time = 0;
    this.kills = 0;
    this.coinsEarned = 0;
    this.pace = paceProfile(this.stage);
    this.spawnAcc = this.pace.spawnAcc;
    this.killsSinceElite = 0;
    this.bossFired = {};
    this.bossesKilled = 0;
    this.bossesSpawned = 0;
    this.finalBossDead = false;
    this.announceFired = {};
    this.shake = 0;
    this.camX = 0;
    this.camY = 0;
    this.owned = {};
    this.alive = true;
    this.cleared = false;
    this.revivedOnce = false;
    this.juice = createJuice();
    this.noDamageTimer = 0;
    this.secretSpawned = false;
    this.runId = (this._runSerial = (this._runSerial || 0) + 1);
    this.cratesOpened = 0;
    this._chestEver = false;
    this._waveShown = 1;
    this.bannerTimer = 1.6;
    this.bannerTitle = this.stage.introBanner.title;
    this.bannerSub = this.stage.introBanner.sub;
    this.midBanner = null;
    this.midBannerT = 0;
    this.midBannerKind = 'info';
    this.bannerQueue = [];
    this.lvRing = 0; // soft level-up ring timer
    this.events = {
      swarmNext: this.pace.swarmAt,
      eliteNext: this.pace.eliteAt, // then every ~45s
      goldenAt: 24 + Math.random() * 12, // one golden chest per run (mid-run surprise)
      chestNext: 5, // first chest stays inside the opening 10s
      goldenDone: false,
      slackerAt: 30 + Math.random() * 8, // funny 摸鱼丧尸 easter egg
      slackerDone: false,
      bossWarned: {},
      bossMarks: {},
    };
    this.tips = {
      move: !!this.coachFresh,
      act: !!this.coachFresh,
      idle: false,
      age: 0,
      moved: false,
      idleShown: false,
      idleUntil: 0,
    };
    this.bgStars = []; // indoor facility — no night-sky starfield
    // r6: no decorative scenery at all (props/stains/fog/dust read as fake or as pickups).
    // Floor is flat painted tiles only — see _drawFloor().
    this.parallaxSpark = [];
    this._floorSeed = (Math.random() * 1e9) | 0;
    this.freshGallery = [];
    this.hazardZones = []; // temporary spore / shock rings for draw+tick
    resetWeaponTimers(this.player);
  }

  start() {
    this.reset();
    this._ensureFloorCache();
    this.running = true;
    this.paused = false;
    this.alive = true;
    this.cleared = false;
    this._last = performance.now();
    // Opening ring. Stages 1–2 stand farther back so the move tip and first crate read first.
    const pace = this.pace || paceProfile(this.stage);
    const seedN = pace.seed;
    for (let i = 0; i < seedN; i++) {
      const a = (Math.PI * 2 * i) / seedN + 0.4;
      const d = pace.minD + Math.random() * (pace.maxD - pace.minD);
      this.enemies.push(createEnemy('slime', this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d, pace.scale));
    }
    if (this.hooks.onBanner) this.hooks.onBanner(this.bannerTitle, this.bannerSub);
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  setPaused(p) {
    this.paused = p;
    if (!p) this._last = performance.now();
  }

  setJoystick(dx, dy, active) {
    const len = Math.hypot(dx, dy) || 1;
    this.joy.dx = active ? dx / len : 0;
    this.joy.dy = active ? dy / len : 0;
    this.joy.active = active;
  }

  applyUpgrade(upgrade) {
    upgrade.apply(this.player);
    this.owned[upgrade.id] = (this.owned[upgrade.id] || 0) + 1;
    if (upgrade.id === 'leaf_drone') syncDrones(this.player);
    spawnBurst(this.particles, this.player.x, this.player.y, '#ffe066', 10, 110);
    if (upgrade.id === 'crit' || upgrade.id === 'critdmg') this._noteGallery('item_crit');
    if (upgrade.id === 'frost') this._noteGallery('item_frost');
    if (upgrade.id === 'shield') this._noteGallery('item_shield');
    if (upgrade.id === 'bounce' || upgrade.id === 'split' || upgrade.id === 'dashGhost') {
      this._noteGallery('item_crit');
    }
  }

  _noteGallery(id) {
    if (!this.saveRef || !id) return;
    if (!unlockGallery(this.saveRef, id)) return;
    if (!this.freshGallery) this.freshGallery = [];
    if (!this.freshGallery.includes(id)) this.freshGallery.push(id);
  }

  getUpgradeChoices(opts = {}) {
    return pickUpgradeChoices(this.owned, 3, opts);
  }

  applyChestReward(kind) {
    const p = this.player;
    if (kind === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
      spawnBurst(this.particles, p.x, p.y, '#c8a050', 16, 100);
    } else if (kind === 'coin') {
      const n = 12 + Math.floor(Math.random() * 10);
      this.coinsEarned += n;
      this._coinPop(p.x, p.y, `+${n}金`);
    } else if (kind === 'upgrade') {
      const choices = this.getUpgradeChoices();
      if (choices.length) this.applyUpgrade(choices[0]);
    }
    SFX.click();
  }

  revive() {
    if (!this.alive) {
      this.alive = true;
      this.revivedOnce = true;
      this.player.hp = this.player.maxHp * 0.5;
      this.player.invuln = 2.5;
      this.player.shield = Math.max(this.player.shield, 1);
      this.paused = false;
      this.running = true;
      this._last = performance.now();
      this._raf = requestAnimationFrame((t) => this._loop(t));
      spawnBurst(this.particles, this.player.x, this.player.y, '#e8c878', 22, 150);
    }
  }

  _loop(now) {
    if (!this.running) return;
    let raw = Math.min(0.05, Math.max(0, (now - this._last) / 1000));
    this._last = now;
    // hitstop freezes gameplay briefly
    if (inHitstop(this.juice)) {
      tickJuice(this.juice, raw);
      this.draw();
      this._raf = requestAnimationFrame((t) => this._loop(t));
      return;
    }
    if (!this.paused && this.alive && !this.cleared) {
      this.update(raw);
    } else {
      tickJuice(this.juice, raw);
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  update(dt) {
    const p = this.player;
    this.time += dt;
    tickJuice(this.juice, dt);

    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.lvRing > 0) this.lvRing -= dt;
    if (this.midBannerT > 0) {
      this.midBannerT -= dt;
      if (this.midBannerT <= 0) {
        this.midBanner = null;
        const nx = this.bannerQueue.shift();
        if (nx) this._banner(nx[0], nx[1], nx[2]);
      }
    }
    this._noteWave();

    // move
    const moveMul = (p._sporeSlow > 0) ? 0.55 : 1;
    if (p._sporeSlow > 0) p._sporeSlow -= dt;
    p.x += this.joy.dx * p.speed * moveMul * dt;
    p.y += this.joy.dy * p.speed * moveMul * dt;
    p.x = Math.max(p.r + 6, Math.min(WORLD_W - p.r - 6, p.x)); // stay off the baseboard
    p.y = Math.max(p.r + 6, Math.min(WORLD_H - p.r - 6, p.y));
    if (this.joy.active) p.facing = Math.atan2(this.joy.dy, this.joy.dx);
    this._tickTips(dt);
    p.pulse += dt;
    if (p.invuln > 0) p.invuln -= dt;
    p.orbitAngle += dt * 2.2;

    // 冲刺残影
    if (!p.ghosts) p.ghosts = [];
    if ((p.dashGhost || 0) > 0 && this.joy.active) {
      if (!p._ghostAcc) p._ghostAcc = 0;
      p._ghostAcc += dt;
      if (p._ghostAcc > 0.09) {
        p._ghostAcc = 0;
        p.ghosts.push({ x: p.x, y: p.y, life: 0.45, age: 0, dmg: p.damage * 0.22 * p.dashGhost });
        if (p.ghosts.length > 14) p.ghosts.shift();
      }
    }
    for (const g of p.ghosts) {
      g.age += dt;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - g.x, e.y - g.y) < e.r + 10) {
          this._hurtEnemy(e, g.dmg * dt * 6, false);
        }
      }
    }
    p.ghosts = p.ghosts.filter((g) => g.age < g.life);

    // camera: draw() zooms about screen centre, so world point (camX + W/2) is the screen centre.
    // Clamp so the zoomed view never shows past the floor edge (was leaking a dark strip).
    const mx = (W / 2) * (1 - 1 / VIEW_ZOOM), my = (H / 2) * (1 - 1 / VIEW_ZOOM);
    this.camX = Math.max(-mx, Math.min(WORLD_W - W + mx, p.x - W / 2));
    this.camY = Math.max(-my, Math.min(WORLD_H - H + my, p.y - H / 2));

    this._spawnWave(dt);
    this._checkBosses();
    this._checkAnnounces();
    this._checkChests();
    this._checkSecret();
    this._checkEvents();

    // auto fire — fast first feel
    p.fireTimer -= dt;
    if (p.fireTimer <= 0) {
      const target = this._nearestEnemy();
      if (target) {
        this._fireAt(target);
        p.fireTimer = p.fireCooldown;
      } else {
        p.fireTimer = 0.08; // keep checking quickly
      }
    }

    if (p.orbitBalls > 0) {
      const radius = 38 + p.orbitBalls * 4;
      for (let i = 0; i < p.orbitBalls; i++) {
        const a = p.orbitAngle + (Math.PI * 2 * i) / p.orbitBalls;
        const ox = p.x + Math.cos(a) * radius;
        const oy = p.y + Math.sin(a) * radius;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - ox, e.y - oy) < e.r + 8) {
            this._hurtEnemy(e, p.damage * 0.35 * dt * 8, false);
          }
        }
      }
    }

    // special weapon cooldowns (arc projectiles / melee / nova)
    {
      const tgt = this._nearestEnemy();
      if (tgt) {
        tryFireSporeMelon(this, tgt, dt);
        tryFireThornDurian(this, tgt, dt);
      }
      tryVineLash(this, dt);
      tryCrystalNova(this, dt);
      updateDrones(this, dt);
      updatePuddles(this, dt);
    }

    // bullets
    for (const b of this.bullets.active) {
      if (!b.alive) continue;
      if (tickSpecialBullet(this, b, dt)) continue;
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.age += dt;
      if (b.age >= b.life) { b.alive = false; continue; }
      if (b.damage <= 0) continue; // vine VFX
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          if (e.reflectT > 0 && b.kind !== 'beam') {
            b.vx *= -1; b.vy *= -1;
            b.age *= 0.5;
            b.damage *= 0.5;
            b.hue = 200;
            break;
          }
          this._hurtEnemy(e, b.damage, b.crit);
          if (b.frost > 0) e.slow = Math.max(e.slow, 0.55 + b.frost);
          if ((b.bounce || 0) > 0) {
            b.bounce -= 1;
            let best = null, bestD = 220;
            for (const o of this.enemies) {
              if (!o.alive || o === e) continue;
              const dd = Math.hypot(o.x - b.x, o.y - b.y);
              if (dd < bestD) { bestD = dd; best = o; }
            }
            if (best) {
              const ang = Math.atan2(best.y - b.y, best.x - b.x);
              const spd = Math.hypot(b.vx, b.vy) || 340;
              b.vx = Math.cos(ang) * spd;
              b.vy = Math.sin(ang) * spd;
              b.age *= 0.7;
            } else {
              b.pierce -= 1;
              if (b.pierce < 0) { b.alive = false; break; }
            }
          } else {
            b.pierce -= 1;
            if (b.pierce < 0) { b.alive = false; break; }
          }
        }
      }
    }
    this.bullets.sweep();

    // hazard zones (spore / lightning / mines / beams)
    const hurtPlayer = (dmg) => {
      if (p.invuln > 0) return;
      if (p.shield > 0) { p.shield -= 1; p.invuln = 0.8; return; }
      p.hp -= dmg * (p.damageTakenMul || 1);
      p.invuln = 0.7;
      addShake(this.juice, 6, 0.2);
      if (p.hp <= 0) { p.hp = 0; this._die(); }
    };
    for (const z of this.hazardZones) {
      z.age += dt;
      if (z.kind === 'spore' && Math.hypot(p.x - z.x, p.y - z.y) < z.r) {
        p._sporeSlow = Math.max(p._sporeSlow || 0, 0.6);
      }
      if (z.kind === 'shockwave' && !z.hit && z.age < 0.14) {
        if (Math.hypot(p.x - z.x, p.y - z.y) < z.r) {
          z.hit = true;
          hurtPlayer(z.damage);
          if (!this.alive) return;
        }
      }
      if (z.kind === 'lightning' && !z.hit && z.age < 0.2) {
        if (Math.hypot(p.x - z.x, p.y - z.y) < z.r) {
          z.hit = true;
          hurtPlayer(z.damage);
          if (!this.alive) return;
        }
      }
      if (z.kind === 'ebolt') {
        z.x += z.vx * dt; z.y += z.vy * dt;
        if (!z.hit && Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r) {
          z.hit = true; z.alive = false;
          hurtPlayer(z.damage);
          if (!this.alive) return;
        }
      }
      if (z.kind === 'rot_beam' && !z.hit && z.age < 0.35) {
        const ux = Math.cos(z.ang), uy = Math.sin(z.ang);
        const wx = p.x - z.x, wy = p.y - z.y;
        const t = Math.max(0, Math.min(1, (wx * ux + wy * uy) / z.len));
        const px = z.x + ux * z.len * t, py = z.y + uy * z.len * t;
        if (Math.hypot(p.x - px, p.y - py) < (z.w || 16)) {
          z.hit = true;
          hurtPlayer(z.damage);
          if (!this.alive) return;
        }
      }
      if (z.kind === 'mine' && z.age > (z.arm || 0.5) && !z.hit) {
        if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r) {
          z.hit = true;
          hurtPlayer(z.damage);
          spawnBurst(this.particles, z.x, z.y, '#e8c060', 14, 100);
          if (!this.alive) return;
        }
      }
    }
    this.hazardZones = this.hazardZones.filter((z) => z.age < z.life);

    // enemies
    let tookDamage = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.slow > 0) e.slow -= dt;
      if (e.tagT > 0) e.tagT -= dt;

      // elite / boss skills
      const skEvents = updateEnemySkill(e, p, dt);
      for (const ev of skEvents) {
        if (ev.type === 'shockwave') {
          this.hazardZones.push({ kind: 'shockwave', x: ev.x, y: ev.y, r: ev.r, damage: ev.damage, age: 0, life: 0.45, hit: false });
          spawnBurst(this.particles, ev.x, ev.y, '#d08098', 18, 160);
          addShake(this.juice, 5, 0.2);
        } else if (ev.type === 'spore') {
          this.hazardZones.push({ kind: 'spore', x: ev.x, y: ev.y, r: ev.r, age: 0, life: 2.2, hit: false });
          if (Math.hypot(p.x - ev.x, p.y - ev.y) < ev.r) {
            p._sporeSlow = 1.4;
          }
          spawnBurst(this.particles, ev.x, ev.y, '#c8c050', 14, 90);
        } else if (ev.type === 'spawn') {
          for (let i = 0; i < ev.n; i++) {
            const pos = spawnPointAround(e.x, e.y, 40, 90, WORLD_W, WORLD_H);
            this.enemies.push(createEnemy(ev.kind, pos.x, pos.y, difficultyScale(this.stage, this.time) * 0.7));
          }
        } else if (ev.type === 'lightning') {
          this.hazardZones.push({ kind: 'lightning', x: ev.x, y: ev.y, r: ev.r, damage: ev.damage, age: 0, life: 0.35, hit: false });
          spawnBurst(this.particles, ev.x, ev.y, '#e8d060', 12, 120);
        } else if (ev.type === 'enemy_bolt') {
          this.hazardZones.push({
            kind: 'ebolt', x: ev.x, y: ev.y,
            vx: Math.cos(ev.ang) * (ev.speed || 220),
            vy: Math.sin(ev.ang) * (ev.speed || 220),
            r: 9, damage: ev.damage, age: 0, life: 2.2, hit: false,
          });
        } else if (ev.type === 'rot_beam') {
          this.hazardZones.push({
            kind: 'rot_beam', x: ev.x, y: ev.y, ang: ev.ang, len: ev.len || 200,
            damage: ev.damage, age: 0, life: 0.55, hit: false, w: 16,
          });
        } else if (ev.type === 'mine') {
          this.hazardZones.push({
            kind: 'mine', x: ev.x, y: ev.y, r: ev.r, damage: ev.damage,
            age: 0, life: 4.5, hit: false, arm: 0.6,
          });
        }
      }

      // skip normal chase while charging
      if (e.skillState === 'active' && e.skill === 'charge') {
        // position already advanced in updateEnemySkill
      } else if (e.skillState === 'windup') {
        // windup: stand still
      } else {
      const spdMul = e.slow > 0 ? 0.45 : 1;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let wx = 0, wy = 0;
      if (e.type === 'bat') {
        wx = Math.cos(this.time * 5 + e.wobble) * 30;
        wy = Math.sin(this.time * 4 + e.wobble) * 20;
      }
      const spd = (e.baseSpeed || e.speed) * spdMul;
      const dir = e.isSlacker ? -1 : 1; // 摸鱼丧尸 runs away
      e.x += ((dx / d) * spd * dir + wx) * dt;
      e.y += ((dy / d) * spd * dir + wy) * dt;
      if (e.kbx || e.kby) { // soft knockback decays fast
        e.x += e.kbx * dt; e.y += e.kby * dt;
        e.kbx *= 0.82; e.kby *= 0.82;
        if (Math.abs(e.kbx) + Math.abs(e.kby) < 4) { e.kbx = 0; e.kby = 0; }
      }
      e.x = Math.max(20, Math.min(WORLD_W - 20, e.x));
      e.y = Math.max(20, Math.min(WORLD_H - 20, e.y));
      }
      if (e.isSlacker) {
        e.fleeT -= dt;
        if (e.fleeT <= 0) {
          e.alive = false;
          if (this.hooks.onToast) this.hooks.onToast('摸鱼丧尸溜回工位了……');
          continue;
        }
        continue; // harmless: never touches the player
      }

      if (e.phaseHidden) continue;
      if (p.invuln <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r - 2) {
        if (p.shield > 0) {
          p.shield -= 1;
          p.invuln = 1.0;
          spawnBurst(this.particles, p.x, p.y, '#e8c878', 14, 110);
          SFX.hurt();
        } else {
          p.hp -= e.damage * (p.damageTakenMul || 1);
          p.invuln = 0.9;
          addShake(this.juice, 10, 0.25);
          SFX.hurt();
          spawnBurst(this.particles, p.x, p.y, '#c87860', 10, 100);
          tookDamage = true;
          this.noDamageTimer = 0;
          if (p.thorns > 0) this._hurtEnemy(e, p.thorns, false);
          // shove the attacker back so a hit gives breathing room
          { const ad = Math.hypot(e.x - p.x, e.y - p.y) || 1;
            e.kbx = ((e.x - p.x) / ad) * 260; e.kby = ((e.y - p.y) / ad) * 260; }
          if (p.hp <= 0) {
            p.hp = 0;
            this._die();
            return;
          }
        }
      }
    }
    if (!tookDamage) this.noDamageTimer += dt;
    this.enemies = this.enemies.filter((e) => e.alive);

    // gems
    for (const g of this.gems.active) {
      if (!g.alive) continue;
      g.age += dt;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      // stale gems (>5s) drift home on their own → no dead stretch between level-ups
      if (d < p.magnet || g.age > 5) {
        g.magnetized = true;
        g.trail.push({ x: g.x, y: g.y });
        if (g.trail.length > 5) g.trail.shift();
        const pull = d < p.magnet ? Math.min(480, 200 + (p.magnet - d) * 5) : 260 + g.age * 20;
        g.x += ((p.x - g.x) / (d || 1)) * pull * dt;
        g.y += ((p.y - g.y) / (d || 1)) * pull * dt;
      }
      if (d < p.r + g.r + 4) {
        g.alive = false;
        this._gainXp(g.value);
        SFX.gem();
      }
    }
    this.gems.sweep();

    // chests pickup
    for (const c of this.chests.active) {
      if (!c.alive || c.opened) continue;
      c.bob += dt;
      if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.r + 22) {
        c.opened = true;
        c.alive = false;
        this.cratesOpened = (this.cratesOpened || 0) + 1;
        this.dismissCoach('act');
        this.paused = true;
        this._noteGallery('item_chest');
        SFX.chest();
        softVibrate(15);
        spawnBurst(this.particles, c.x, c.y, '#f0b850', c.golden ? 26 : 14, 140);
        if (c.golden) {
          this.coinsEarned += 30;
          this._coinPop(c.x, c.y, '+30金');
          if (this.hooks.onGoldenChest) this.hooks.onGoldenChest(this.getUpgradeChoices({ minRarity: 'rare' }));
          else if (this.hooks.onChest) this.hooks.onChest();
        } else {
          if (c.tier === 'rare') {
            this.coinsEarned += 10;
            this._coinPop(c.x, c.y, '+10金');
          }
          if (this.hooks.onChest) this.hooks.onChest();
        }
      }
    }
    this.chests.sweep();

    for (const pt of this.particles.active) {
      if (!pt.alive) continue;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.96; pt.vy *= 0.96;
      pt.age += dt;
      if (pt.age >= pt.life) pt.alive = false;
    }
    this.particles.sweep();

    for (const d of this.dmgTexts.active) {
      if (!d.alive) continue;
      d.y -= (d.crit ? 40 : 28) * dt;
      d.age += dt;
      if (d.age >= d.life) d.alive = false;
    }
    this.dmgTexts.sweep();

    for (const cp of this.coinPops) cp.age += dt;
    this.coinPops = this.coinPops.filter((c) => c.age < c.life);

    // clear check (boss stages require final boss kill)
    const clearExtras = this._clearExtras();
    if (isStageCleared(this.stage, this.time, this.kills, clearExtras)) {
      this._clearStage();
      return;
    }

    if (this.hooks.onHud) {
      this.hooks.onHud({
        hp: p.hp, maxHp: p.maxHp, xp: p.xp, xpToNext: p.xpToNext,
        level: p.level, time: this.time, kills: this.kills,
        stageName: this.stage.name,
        wave: waveLabel(this.stage, this.time),
        progress: clearProgress(this.stage, this.time, this.kills, clearExtras),
        combo: this.juice.combo,
        shield: p.shield,
        coins: this.coinsEarned,
        bannerTimer: this.bannerTimer,
        bannerTitle: this.bannerTitle,
        bannerSub: this.bannerSub,
        midBanner: this.midBanner,
        tips: this._tipPayload(),
      });
    }
  }

  _tipPayload() {
    const tips = this.tips;
    if (!tips) return null;
    return {
      move: !!tips.move,
      act: !!tips.act,
      idle: !!tips.idle && !tips.move,
      settled: this.bannerTimer <= 0,
    };
  }

  /** First-run plaques (8s) and one idle nudge per run if they never move. */
  _tickTips(dt) {
    const tips = this.tips;
    if (!tips) return;
    const moving = this.joy.active && Math.hypot(this.joy.dx, this.joy.dy) > 0.15;
    if (moving) {
      tips.moved = true;
      tips.move = false;
      tips.idle = false;
    }
    if (tips.move || tips.act) {
      tips.age += dt;
      if (tips.age >= 8) {
        tips.move = false;
        tips.act = false;
      }
    }
    const early = (this.stage.stageNum || 1) <= 3 && this.time < 40;
    if (!tips.moved && !tips.idleShown && early && this.time >= 12 && !tips.move) {
      tips.idleShown = true;
      tips.idle = true;
      tips.idleUntil = this.time + 4.2;
    }
    if (tips.idle && this.time >= tips.idleUntil) tips.idle = false;
  }

  _spawnWave(dt) {
    const pace = this.pace || paceProfile(this.stage);
    const earlyBoost = this.time < 20 ? pace.earlyBoost : 1;
    const rate = spawnRateAt(this.stage, this.time) * earlyBoost;
    this.spawnAcc += dt * rate;
    const scale = difficultyScale(this.stage, this.time);
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length > this.stage.maxEnemies) break;
      const type = pickEnemyType(this.stage, this.time);
      const pos = spawnPointAround(this.player.x, this.player.y, 260, 400, WORLD_W, WORLD_H);
      const en = createEnemy(type, pos.x, pos.y, scale);
      en.damage *= (this.stage.dmgScale || 1);
      this.enemies.push(en);
    }
  }

  _checkBosses() {
    const marks = (this.events && this.events.bossMarks) || {};
    for (const b of this.stage.bosses || []) {
      if (this.time >= b.at && !this.bossFired[b.at]) {
        this.bossFired[b.at] = true;
        this._spawnBoss(b.label, { pos: marks[b.at] });
      }
    }
    // endless: boss every 150s, elite surge every 90s
    if (this.stage.endless) {
      const bossSlot = Math.floor(this.time / 150);
      if (bossSlot > 0 && !this.bossFired['e'+bossSlot]) {
        this.bossFired['e'+bossSlot] = true;
        const slotTime = bossSlot * 150;
        this._spawnBoss('无尽设施霸主', { bonus: true, pos: marks['e'+slotTime] });
      }
      const surge = Math.floor(this.time / 90);
      if (surge > 0 && !this.announceFired['surge'+surge]) {
        this.announceFired['surge'+surge] = true;
        this._banner('安保增援！', 'warn', 1.8);
        const scale = difficultyScale(this.stage, this.time);
        for (let i = 0; i < 4; i++) {
          const pos = spawnPointAround(this.player.x, this.player.y, 200, 320, WORLD_W, WORLD_H);
          this.enemies.push(createEnemy(pickEnemyType(this.stage, this.time), pos.x, pos.y, scale, { elite: true }));
        }
      }
    }
  }

  _checkAnnounces() {
    for (const a of this.stage.midAnnounces || []) {
      if (this.time >= a.at && !this.announceFired[a.at]) {
        this.announceFired[a.at] = true;
        // Canvas midBanner only — avoid duplicate toast
        this._banner(a.text, 'info', 1.8);
        SFX.announce();
        const scale = difficultyScale(this.stage, this.time);
        const extra = (this.pace && this.pace.announceExtra) || 5;
        for (let i = 0; i < extra; i++) {
          const pos = spawnPointAround(this.player.x, this.player.y, 200, 320, WORLD_W, WORLD_H);
          const type = pickEnemyType(this.stage, this.time);
          this.enemies.push(createEnemy(type, pos.x, pos.y, scale));
        }
      }
    }
  }

  _checkChests() {
    // chest between waves every ~45s (retention mid peak)
    if (this.time >= this.events.chestNext && this.time < this.stage.clearTime - 15) {
      this.events.chestNext = this.time + 40;
      // 70% guaranteed + 30% surprise extra
      // later supply drops can roll rare; plus a 30% surprise extra that is always rare
      this._spawnChest(this.time > 80 && Math.random() < 0.35 ? 'rare' : 'normal');
      if (Math.random() < 0.3) {
        setTimeout(() => {
          if (this.alive && !this.cleared) this._spawnChest('rare');
        }, 800);
      }
    }
  }

  /** Wave changes get one short line, and only when nothing else is on screen. */
  _noteWave() {
    const wave = Math.max(1, Math.floor(Math.max(0, this.time) / 20) + 1);
    if (wave === this._waveShown) return;
    this._waveShown = wave;
    // Intro already says the opening wave. Coach plaques own the first seconds.
    if (this.bannerTimer > 0) return;
    const tips = this.tips;
    if (tips && (tips.move || tips.act || tips.idle)) return;
    if (this.midBanner || (this.bannerQueue && this.bannerQueue.length)) return;
    const goal = stageGoalLine(this.stage);
    this._banner(`波次 ${wave} · 目标 ${goal}`, 'info', 1.2);
  }

  _banner(text, kind = 'info', dur = 1.8) {
    // queue instead of overwriting so swarm/elite/boss callouts never swallow each other
    if (this.midBanner && this.midBannerT > 0.35) {
      if (this.midBanner !== text && !this.bannerQueue.some((b) => b[0] === text)) {
        if (kind === 'boss') this.bannerQueue.unshift([text, kind, dur]);
        else if (this.bannerQueue.length < 2) this.bannerQueue.push([text, kind, dur]);
      }
      return;
    }
    this.midBanner = text;
    this.midBannerKind = kind;
    this.midBannerT = dur;
    this.midBannerDur = dur;
  }

  /** Timed run events: swarm rings, timed elites, boss warning, golden chest, 摸鱼丧尸 */
  _checkEvents() {
    const ev = this.events;
    const t = this.time;
    const p = this.player;
    const scale = difficultyScale(this.stage, t);
    const endT = this.stage.clearTime || 9999;

    // 1) zombie swarm ring every ~22s: weak fodder closing in from all sides = AoE payoff
    if (t >= ev.swarmNext && t < endT - 6) {
      const pace = this.pace || paceProfile(this.stage);
      const gap = pace.swarmGap != null ? pace.swarmGap : (pace.swarmBase <= 8 ? 24 : 20);
      ev.swarmNext = t + gap + Math.random() * 5;
      const n = Math.min(pace.swarmCap || 22, pace.swarmBase + Math.floor(t / 25) * pace.swarmStep);
      const R = 250;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        const x = Math.max(30, Math.min(WORLD_W - 30, p.x + Math.cos(a) * R));
        const y = Math.max(30, Math.min(WORLD_H - 30, p.y + Math.sin(a) * R));
        const en = createEnemy(i % 4 === 0 && t > 40 ? 'bat' : 'slime', x, y, scale * 0.55);
        en.damage *= (this.stage.dmgScale || 1) * 0.8;
        this.enemies.push(en);
      }
      this._banner('尸潮包围！', 'warn', 1.5);
      SFX.announce();
    }

    // 2) timed elite every ~45s (on top of kill-count elites)
    if (t >= ev.eliteNext && t < endT - 4) {
      ev.eliteNext = t + 45;
      const pos = spawnPointAround(p.x, p.y, 240, 300, WORLD_W, WORLD_H);
      const en = createEnemy(pickEnemyType(this.stage, t), pos.x, pos.y, scale, { elite: true });
      en.damage *= (this.stage.dmgScale || 1);
      this.enemies.push(en);
      this._banner('精英来袭！', 'elite', 1.6);
    }

    // 3) boss warning 3s ahead: under-HUD plaque + a soft rust ring on the landing spot
    for (const b of this.stage.bosses || []) {
      if (!ev.bossWarned[b.at] && t >= b.at - 3 && t < b.at) {
        ev.bossWarned[b.at] = true;
        this._markBossLanding(b.at, t, b.at + 0.55);
        this._banner('警告 · 首领接近', 'boss', 3);
        SFX.announce();
      }
    }
    if (this.stage.endless) {
      const nextBossT = (Math.floor(t / 150) + 1) * 150;
      const key = 'e' + nextBossT;
      if (!ev.bossWarned[key] && t >= nextBossT - 3 && t < nextBossT) {
        ev.bossWarned[key] = true;
        this._markBossLanding(key, t, nextBossT + 0.55);
        this._banner('警告 · 首领接近', 'boss', 3);
        SFX.announce();
      }
    }

    // 4) golden chest — once per run, rare loot (epic picks + coins)
    if (!ev.goldenDone && t >= ev.goldenAt && t < endT - 8) {
      ev.goldenDone = true;
      this._spawnChest('gold');
    }

    // 5) 摸鱼丧尸: runs AWAY carrying a bonus briefcase; catch it in 9s for a payout
    if (!ev.slackerDone && t >= ev.slackerAt) {
      ev.slackerDone = true;
      const pos = spawnPointAround(p.x, p.y, 150, 190, WORLD_W, WORLD_H);
      const e = createEnemy('slime', pos.x, pos.y, scale * 1.6);
      e.isSlacker = true;
      e.fleeT = 9;
      e.damage = 0;
      e.baseSpeed = p.speed * 0.62;
      e.xp = 6;
      this.enemies.push(e);
      this._banner('摸鱼丧尸出没！快抓', 'gold', 2);
      this._noteGallery('enemy_slacker');
    }
  }

  /** tier: 'normal' | 'rare' | 'gold' (gold = once-per-run golden chest) */
  _spawnChest(tier = 'normal') {
    if (tier === true) tier = 'gold';
    const golden = tier === 'gold';
    const pos = spawnPointAround(this.player.x, this.player.y, 100, 160, WORLD_W, WORLD_H);
    const c = this.chests.acquire();
    c.x = pos.x; c.y = pos.y; c.r = golden ? 32 : tier === 'rare' ? 30 : 28; c.bob = 0; c.opened = false;
    c.golden = golden;
    c.tier = tier;
    c.loud = !golden && !this._chestEver;
    this._chestEver = true;
    const sparkN = golden ? 8 : c.loud ? 6 : 4;
    spawnBurst(this.particles, pos.x, pos.y, '#f0d7a4', sparkN, golden ? 90 : 60);
    if (golden) {
      this._banner('金色物资箱！', 'gold', 2);
      SFX.announce();
      return;
    }
    const now = this.time || 0;
    if (!this._lastChestToast || now - this._lastChestToast > 1.2) {
      this._lastChestToast = now;
      if (this.hooks.onToast) this.hooks.onToast(tier === 'rare' ? '稀有物资箱出现！' : '物资箱出现！');
    }
  }

  _checkSecret() {
    // no-damage 30s → secret elite + gallery
    if (!this.secretSpawned && this.noDamageTimer >= 30) {
      this.secretSpawned = true;
      const pos = spawnPointAround(this.player.x, this.player.y, 220, 280, WORLD_W, WORLD_H);
      const e = createEnemy('bat', pos.x, pos.y, 1.8, { elite: true });
      e.isSecret = true;
      e.color = '#c8b090';
      e.xp = 8;
      this.enemies.push(e);
      this._noteGallery('enemy_secret');
      if (this.hooks.onToast) this.hooks.onToast('无伤达成！故障投影出现');
      SFX.announce();
    }
    // high combo secret boss
    if (!this.juice._comboBoss && this.juice.combo >= 25 && this.stage.index >= 1) {
      this.juice._comboBoss = true;
      this._spawnBoss('失控主机', { bonus: true });
    }
  }

  _markBossLanding(key, from, until) {
    const pos = spawnPointAround(this.player.x, this.player.y, 280, 340, WORLD_W, WORLD_H);
    if (!this.events.bossMarks) this.events.bossMarks = {};
    this.events.bossMarks[key] = { x: pos.x, y: pos.y, from, until };
  }

  _spawnBoss(label, opts = {}) {
    const bonus = !!opts.bonus; // combo/secret extras must NOT count toward stage clear
    const pos = (opts.pos && opts.pos.x != null)
      ? opts.pos
      : spawnPointAround(this.player.x, this.player.y, 300, 360, WORLD_W, WORLD_H);
    const scale = difficultyScale(this.stage, this.time);
    const theme = this.stage.theme || 'office';
    const variant = theme === 'ward' ? 1 : theme === 'basement' ? 2 : 0;
    const names = ['设施主管', '巡夜医师', '机房主机'];
    const boss = createEnemy('boss', pos.x, pos.y, scale, { bossVariant: variant });
    boss.bossVariant = variant;
    boss.isBoss = true;
    boss.isBonusBoss = bonus;
    // DESIGN §13 bossHP ≈ 500 * stageMul * 1.4
    const stageMul = this.stage.hpScale || 1;
    boss.hp = boss.maxHp = Math.round(500 * stageMul * 1.4 * (1 + (this.stage.stageNum || 1) * 0.01));
    boss.damage = Math.round(18 + stageMul * 4);
    boss.tag = '首领';
    boss.tagT = 2.2;
    this.enemies.push(boss);
    if (!bonus) this.bossesSpawned = (this.bossesSpawned || 0) + 1;
    addShake(this.juice, 16, 0.4);
    SFX.boss();
    // midBanner only — no duplicate onToast
    this._banner(label || `${names[variant]}来袭！`, 'boss', 2.4);
    this._noteGallery('enemy_boss');
  }

  _clearExtras() {
    const bossAlive = this.enemies.some((e) => e.alive && e.isBoss && !e.isBonusBoss);
    const scheduled = (this.stage.bosses || []).length;
    if (!bossAlive && (this.bossesKilled || 0) >= scheduled && scheduled > 0) {
      this.finalBossDead = true;
    }
    return {
      bossesKilled: this.bossesKilled || 0,
      bossesSpawned: this.bossesSpawned || 0,
      bossAlive,
      finalBossDead: !!this.finalBossDead,
      bossFired: this.bossFired,
    };
  }

  _nearestEnemy() {
    let best = null, bestD = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bestD && d < 440) { bestD = d; best = e; }
    }
    return best;
  }

  _fireAt(target) {
    const p = this.player;
    firePrimaryBolts(this, target);
    // fantasy weapons layered on primary fire
    if (p.dewBeam) fireDewBeam(this, target);
    if (p.moonKnives) fireMoonKnives(this, target);
    if (p.mothHex && Math.random() < 0.45 + p.mothHex * 0.1) fireMothHex(this, target);
    SFX.shoot();
  }

  _hurtEnemy(e, dmg, wasCrit) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.hitFlash = 0.08;
    if (e.hp > 0 && !(e._sparkCd > this.time)) {
      e._sparkCd = this.time + 0.09;
      spawnHitSpark(this.particles, e.x, e.y - e.r * 0.25);
    }
    if (!e.isBoss && dmg >= 3) { // small push away from player (weight by size)
      const kd = Math.hypot(e.x - this.player.x, e.y - this.player.y) || 1;
      const kb = (e.isElite ? 40 : 90) * (wasCrit ? 1.6 : 1);
      e.kbx = (e.kbx || 0) * 0.5 + ((e.x - this.player.x) / kd) * kb;
      e.kby = (e.kby || 0) * 0.5 + ((e.y - this.player.y) / kd) * kb;
    }
    const crit = !!wasCrit;
    const dying = e.hp <= 0;
    if (crit) triggerCritFlash(this.juice);
    if (!dying) {
      if (crit) SFX.crit();
      else SFX.hit();
    }
    const showNum = dmg >= 1 && (crit || !(e._numCd > this.time));
    if (showNum) {
      e._numCd = this.time + 0.12;
      const dt = this.dmgTexts.acquire();
      const big = dmg >= 20;
      dt.x = e.x + (Math.random() - 0.5) * 16;
      dt.y = e.y - e.r;
      dt.text = String(Math.round(dmg));
      dt.age = 0;
      dt.life = crit ? 0.7 : 0.55;
      dt.color = crit ? '#ffe7a0' : '#fff6dc';
      dt.crit = crit;
      dt.big = big && !crit;
      dt.scale = crit ? 1.16 : dt.big ? 1.08 : 1;
    }

    if (e.hp <= 0) {
      e.alive = false;
      this.kills += 1;
      this.killsSinceElite += 1;
      if (e.isBoss && !e.isBonusBoss) {
        this.bossesKilled = (this.bossesKilled || 0) + 1;
        const scheduled = (this.stage.bosses || []).length;
        if (this.bossesKilled >= scheduled && scheduled > 0) this.finalBossDead = true;
      }
      const coin = Math.round((e.isBoss ? 15 : e.isElite ? 5 : (e.type === 'golem' ? 3 : 1)) * (this.player.coinBonus || 1));
      this.coinsEarned += coin;
      if (coin >= 3) this._coinPop(e.x, e.y, `+${coin}`);

      if (e.isSlacker) {
        const bonus = 25;
        this.coinsEarned += bonus;
        this._coinPop(e.x, e.y - 10, `+${bonus}金`);
        this._banner('抓到摸鱼的了！奖金 +25', 'gold', 1.8);
        SFX.chest();
      }
      registerKill(this.juice, e.x, e.y, e.isElite, e.isBoss);
      spawnKillBurst(this.particles, e.x, e.y, e.color, e.isBoss || e.isElite);
      if (this.juice.combo === 5 || this.juice.combo === 10) SFX.combo();

      this._noteGallery(`enemy_${e.type === 'boss' ? 'boss' : e.type}`);
      if (e.isElite) this._noteGallery('enemy_elite');

      const gemCount = e.isBoss ? 8 : Math.max(1, e.xp);
      for (let i = 0; i < gemCount; i++) {
        const g = this.gems.acquire();
        g.x = e.x + (Math.random() - 0.5) * 22;
        g.y = e.y + (Math.random() - 0.5) * 22;
        g.value = e.isBoss ? 3 : 1;
        g.r = e.isBoss ? 11 : 9;
        g.age = 0;
        g.color = e.isBoss ? '#ffe066' : '#c8963a';
        g.trail = [];
        g.magnetized = false;
      }
      if (this.player.lifesteal > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.lifesteal);
      }
      // 裂片晶芒
      const splits = this.player.splitOnKill || 0;
      if (splits > 0) {
        for (let i = 0; i < splits; i++) {
          const ang = (Math.PI * 2 * i) / splits + Math.random() * 0.2;
          const b = this.bullets.acquire();
          b.x = e.x; b.y = e.y;
          b.vx = Math.cos(ang) * 280;
          b.vy = Math.sin(ang) * 280;
          b.r = 4;
          b.damage = this.player.damage * 0.45;
          b.pierce = 0;
          b.life = 0.55;
          b.age = 0;
          b.hue = 160;
          b.frost = 0;
          b.crit = false;
          b.bounce = 0;
          b.trail = [];
        }
      }
      // elite spore death burst
      if (e.isElite && e.skill === 'spore') {
        this.hazardZones.push({ kind: 'spore', x: e.x, y: e.y, r: 75, age: 0, life: 2.0, hit: false });
        if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 75) this.player._sporeSlow = 1.2;
        spawnBurst(this.particles, e.x, e.y, '#c8c050', 12, 80);
      }
      if (!e.isSlacker) SFX.kill();

      // elite every N kills
      if (this.killsSinceElite >= this.stage.eliteEvery) {
        this.killsSinceElite = 0;
        const pos = spawnPointAround(this.player.x, this.player.y, 240, 320, WORLD_W, WORLD_H);
        const type = pickEnemyType(this.stage, this.time);
        this.enemies.push(createEnemy(type, pos.x, pos.y, difficultyScale(this.stage, this.time), { elite: true }));
        if (this.midBannerT <= 0) this._banner('精英来袭！', 'elite', 1.6);
      }
    }
  }

  _coinPop(x, y, text) {
    this.coinPops.push({ x, y, text, age: 0, life: 0.8 });
  }

  _gainXp(v) {
    const p = this.player;
    p.xp += v * (p.xpBonus || 1);
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level += 1;
      p.xpToNext = xpNeeded(p.level);
      // soft power ramp so weapon feels stronger within run
      p.damage *= 1.04;
      this.paused = true;
      this.lvRing = 0.7;
      spawnBurst(this.particles, p.x, p.y, '#e8c878', 22, 160);
      SFX.level();
      if (this.hooks.onLevelUp) this.hooks.onLevelUp(this.getUpgradeChoices());
    }
  }

  _clearStage() {
    this.cleared = true;
    this.alive = true;
    this.running = false;
    SFX.stageClear();
    softVibrate(20);
    spawnBurst(this.particles, this.player.x, this.player.y, '#ffe066', 14, 140);
    const bonus = this.stage.rewardCoins || 20;
    this.coinsEarned += bonus;
    if (this.hooks.onClear) {
      this.hooks.onClear({
        stageId: this.stage.id,
        stageName: this.stage.name,
        time: this.time,
        kills: this.kills,
        coins: this.coinsEarned,
        maxCombo: this.juice.maxCombo,
        crates: this.cratesOpened || 0,
        runId: this.runId,
        cleared: true,
        rewardCoins: bonus,
        rewardDiamonds: 5 + this.stage.index * 5,
      });
    }
  }

  _die() {
    this.alive = false;
    this.running = false;
    SFX.death();
    spawnBurst(this.particles, this.player.x, this.player.y, '#ffe066', 12, 120);
    if (this.hooks.onDeath) {
      this.hooks.onDeath({
        stageId: this.stage.id,
        stageName: this.stage.name,
        time: this.time,
        kills: this.kills,
        coins: this.coinsEarned,
        maxCombo: this.juice.maxCombo,
        crates: this.cratesOpened || 0,
        runId: this.runId,
        cleared: false,
        revivedOnce: this.revivedOnce,
      });
    }
  }

  /** Paint the floor once per theme. Redrawing every tile each frame is the main mobile hitch. */
  _ensureFloorCache() {
    const theme = (this.stage && this.stage.theme) || 'office';
    if (this._floorCache && this._floorCacheTheme === theme) return;
    const F = FLOOR_THEMES[theme] || FLOOR_THEMES.office;
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    this._paintFloor(c.getContext('2d'), F, true);
    this._floorCache = c;
    this._floorCacheTheme = theme;
  }

  /** Pixel-grid floor: tone variation + thin bevel + 1px darker grout + boundary baseboard. */
  /** Soft rust ring where a boss will land. Slow breathe, no white flash. */
  _drawBossMarks(ctx) {
    const marks = this.events && this.events.bossMarks;
    if (!marks) return;
    const t = this.time;
    for (const key of Object.keys(marks)) {
      const m = marks[key];
      if (!m || t < m.from || t > m.until) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
      const r = 48 + 8 * pulse;
      ctx.save();
      ctx.fillStyle = `rgba(176, 98, 48, ${0.1 + 0.05 * pulse})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(150, 78, 36, ${0.38 + 0.1 * pulse})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  _drawFloor(ctx, F) {
    if (!this._floorCache) this._ensureFloorCache();
    if (this._floorCache) {
      ctx.drawImage(this._floorCache, 0, 0);
      return;
    }
    this._paintFloor(ctx, F, false);
  }

  _paintFloor(ctx, F, full) {
    const t = F.tile;
    let i0 = 0, j0 = 0, i1 = Math.ceil(WORLD_W / t), j1 = Math.ceil(WORLD_H / t);
    if (!full) {
      const mx = (W / 2) * (1 - 1 / VIEW_ZOOM), my = (H / 2) * (1 - 1 / VIEW_ZOOM);
      const vx0 = this.camX + mx - t, vy0 = this.camY + my - t;
      const vx1 = vx0 + W / VIEW_ZOOM + t * 2, vy1 = vy0 + H / VIEW_ZOOM + t * 2;
      i0 = Math.max(0, Math.floor(vx0 / t));
      j0 = Math.max(0, Math.floor(vy0 / t));
      i1 = Math.min(Math.ceil(WORLD_W / t), Math.ceil(vx1 / t));
      j1 = Math.min(Math.ceil(WORLD_H / t), Math.ceil(vy1 / t));
    }
    const seed = this._floorSeed || 0;
    ctx.fillStyle = F.base;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let j = j0; j < j1; j++) {
      for (let i = i0; i < i1; i++) {
        let h = (Math.imul(i + 11, 73856093) ^ Math.imul(j + 7, 19349663) ^ seed) >>> 0;
        h = (Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967296;
        const x = i * t, y = j * t;
        const w = Math.min(t, WORLD_W - x), hh = Math.min(t, WORLD_H - y);
        ctx.fillStyle = (F.accent && h < (F.accentP || 0.05)) ? F.accent : F.tones[Math.floor(h * F.tones.length) % F.tones.length];
        ctx.fillRect(x, y, w, hh);
        // thin bevel (1px) — less soft painted look, closer to chunky tiles
        ctx.fillStyle = F.hi;
        ctx.fillRect(x + 1, y + 1, w - 2, 1);
        ctx.fillRect(x + 1, y + 1, 1, hh - 2);
        ctx.fillStyle = F.lo;
        ctx.fillRect(x + 1, y + hh - 2, w - 2, 1);
        ctx.fillRect(x + w - 2, y + 1, 1, hh - 2);
      }
    }
    // 1px darker grout seams for a subtle pixel-grid read
    ctx.strokeStyle = F.seam;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) { const x = Math.min(WORLD_W, i * t) + 0.5; ctx.moveTo(x, j0 * t); ctx.lineTo(x, Math.min(WORLD_H, j1 * t)); }
    for (let j = j0; j <= j1; j++) { const y = Math.min(WORLD_H, j * t) + 0.5; ctx.moveTo(i0 * t, y); ctx.lineTo(Math.min(WORLD_W, i1 * t), y); }
    ctx.stroke();
    // boundary baseboard so the arena edge reads as a wall line, not a void
    const bb = 14;
    ctx.fillStyle = F.edge;
    ctx.fillRect(0, 0, WORLD_W, bb); ctx.fillRect(0, WORLD_H - bb, WORLD_W, bb);
    ctx.fillRect(0, 0, bb, WORLD_H); ctx.fillRect(WORLD_W - bb, 0, bb, WORLD_H);
    ctx.strokeStyle = 'rgba(59,42,26,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(bb, bb, WORLD_W - bb * 2, WORLD_H - bb * 2);
  }

  draw() {
    const ctx = this.ctx;
    const off = shakeOffset(this.juice);
    const theme = this.stage.theme || 'office';

    // Reset to dpr identity so logical coords stay 390×844 (not CSS-stretched blur)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // outside-world fill = floor tone (camera clamp keeps it off-screen anyway)
    const FLOOR = FLOOR_THEMES[theme] || FLOOR_THEMES.office;
    ctx.fillStyle = FLOOR.base;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    // Zoom toward screen center so sprites read larger
    ctx.translate(W / 2, H / 2);
    ctx.scale(VIEW_ZOOM, VIEW_ZOOM);
    ctx.translate(-W / 2, -H / 2);
    ctx.translate(-this.camX + off.x, -this.camY + off.y);
    // Smooth bilinear for thick anti-aliased outlines; HUD stays true after restore
    ctx.imageSmoothingEnabled = true;
    if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = true;
    if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = true;

    this._drawFloor(ctx, FLOOR);
    this._drawBossMarks(ctx);

    // hazard zones visual
    for (const z of (this.hazardZones || [])) {
      const a = 1 - z.age / z.life;
      ctx.globalAlpha = Math.max(0, a * 0.55);
      if (z.kind === 'spore') {
        ctx.strokeStyle = `rgba(180,150,70,${0.55 * a})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (0.75 + 0.25 * a), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (z.kind === 'shockwave' || z.kind === 'nova') {
        if (z.kind === 'nova') {
          const ex = getSprite('projExtinguish');
          if (ex) {
            const es = 28 + 18 * a;
            ctx.drawImage(ex, z.x - es / 2, z.y - es / 2, es, es);
          }
        }
        ctx.strokeStyle = z.kind === 'nova' ? 'rgba(180,190,180,0.55)' : 'rgba(180,140,100,0.65)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * Math.min(1, z.age * 4 + 0.2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === 'lightning') {
        ctx.strokeStyle = 'rgba(232,190,80,0.75)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, -0.3, Math.PI * 1.55);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(200,160,60,0.10)';
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.65, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === 'ebolt') {
        // compact, fully opaque orange slug with ink outline (was a 58px translucent plate)
        ctx.globalAlpha = 1;
        const er = 8;
        const ang = Math.atan2(z.vy, z.vx);
        ctx.strokeStyle = 'rgba(240,120,40,0.45)';
        ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(z.x - Math.cos(ang) * 20, z.y - Math.sin(ang) * 20); ctx.lineTo(z.x, z.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(z.x, z.y, er, 0, Math.PI * 2);
        ctx.fillStyle = '#ff8a2a';
        ctx.fill();
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(z.x - er * 0.28, z.y - er * 0.28, er * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,236,190,0.9)';
        ctx.fill();
      } else if (z.kind === 'rot_beam') {
        ctx.strokeStyle = 'rgba(200,160,80,0.7)';
        ctx.lineWidth = z.w || 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(z.x, z.y);
        ctx.lineTo(z.x + Math.cos(z.ang) * z.len, z.y + Math.sin(z.ang) * z.len);
        ctx.stroke();
      } else if (z.kind === 'mine') {
        const armed = z.age > (z.arm || 0.5);
        ctx.fillStyle = armed ? '#e8a040' : '#a08050';
        ctx.beginPath();
        ctx.arc(z.x, z.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,160,64,0.4)';
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // chests — loud interactive loot (vs dull scenery props)
    for (const c of this.chests.active) {
      if (!c.alive) continue;
      const tier = c.tier || (c.golden ? 'gold' : 'normal');
      const chestImg = getChestImage(tier);
      const rare = tier === 'rare';
      const loud = !!c.loud;
      const by = c.y + Math.sin(c.bob * (loud ? 4.2 : 2.2)) * (loud ? 6 : 2.5);
      const pulse = 0.45 + 0.55 * Math.sin(c.bob * (loud ? 6.5 : 2.4));
      // First crate keeps the double warm pulse. Later crates are a slow rim, not a flash.
      ctx.save();
      if (c.golden) {
        const g = ctx.createRadialGradient(c.x, by, 8, c.x, by, 48);
        g.addColorStop(0, 'rgba(224, 160, 80, 0.22)');
        g.addColorStop(1, 'rgba(224, 160, 80, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c.x, by, 48, 0, Math.PI * 2); ctx.fill();
      }
      if (loud) {
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#e8a040';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(c.x, by + 4, 44 + 8 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.32 + 0.22 * pulse;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.x, by + 4, 56 + 8 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.32 + 0.1 * Math.sin(c.bob * 2.1);
        ctx.strokeStyle = c.golden ? '#e0a050' : rare ? '#d4924a' : '#e2b06a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(c.x, by + 6, c.golden ? 40 : 34, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (chestImg) {
        // chest art already carries its tier colour (gold has its own glow outline) — no tint
        const cw = c.r * (c.golden ? 2.45 : rare ? 2.25 : 2.15);
        const ch = cw * (chestImg.naturalHeight || chestImg.height) / Math.max(1, chestImg.naturalWidth || chestImg.width);
        drawStandingSprite(ctx, chestImg, c.x, by + ch * 0.5, cw, { maxW: cw, shadow: 'rgba(70,45,20,0.28)' });
      } else {
        ctx.fillStyle = '#c48a3a';
        ctx.strokeStyle = '#2a2418';
        ctx.lineWidth = 2;
        ctx.fillRect(c.x - 18, by - 14, 36, 28);
        ctx.strokeRect(c.x - 18, by - 14, 36, 28);
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(c.x - 18, by - 2, 36, 5);
      }
      // floating label
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#3b2a1a';
      ctx.lineWidth = 4;
      const lab = c.golden ? '金色物资' : rare ? '稀有物资' : '物资';
      const tw = ctx.measureText(lab).width + 16;
      ctx.fillStyle = 'rgba(255,243,220,0.94)';
      ctx.beginPath();
      ctx.roundRect(c.x - tw / 2, by - 52, tw, 18, 8);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b2a1a';
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeText(lab, c.x, by - 39);
      ctx.fillStyle = c.golden ? '#c45c12' : '#6b4c2c';
      ctx.fillText(lab, c.x, by - 39);
      ctx.restore();
    }

    for (const e of this.enemies) {
      if (e.alive) drawEnemy(ctx, e, this.time);
    }
    for (const e of this.enemies) {
      if (!e.alive || !e.isSlacker) continue;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,190,60,0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 16, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3b2a1a';
      const lab = `摸鱼中 ${Math.ceil(e.fleeT)}s`;
      const ly = e.y - e.r * 2.15 - 14;
      ctx.strokeText(lab, e.x, ly);
      ctx.fillStyle = '#ffd050';
      ctx.fillText(lab, e.x, ly);
      ctx.restore();
    }

    drawWeaponFx(ctx, this);

    // bullets
    for (const b of this.bullets.active) {
      if (!b.alive) continue;
      drawBullet(ctx, b);
    }

    // dash ghosts
    if (this.player.ghosts) {
      for (const g of this.player.ghosts) {
        const a = 1 - g.age / g.life;
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = '#e8c878';
        ctx.beginPath();
        ctx.arc(g.x, g.y, this.player.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // XP cells sit above enemies so bodies don't hide them, under the player.
    for (const g of this.gems.active) {
      if (!g.alive) continue;
      const gy = g.y + Math.sin(g.age * 4) * 1.2;
      const gr = g.r;
      ctx.fillStyle = 'rgba(59,42,26,0.22)';
      ctx.beginPath();
      ctx.ellipse(g.x, gy + gr * 1.15, gr * 0.9, gr * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(g.x, gy - gr * 1.35); ctx.lineTo(g.x + gr * 0.95, gy);
      ctx.lineTo(g.x, gy + gr * 1.35); ctx.lineTo(g.x - gr * 0.95, gy); ctx.closePath();
      ctx.fillStyle = g.value > 1 ? '#ffd23d' : '#ffb03a';
      ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#3b2a1a'; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(g.x, gy - gr * 0.55); ctx.lineTo(g.x + gr * 0.38, gy);
      ctx.lineTo(g.x, gy + gr * 0.45); ctx.lineTo(g.x - gr * 0.38, gy); ctx.closePath();
      ctx.fillStyle = '#fff6d2';
      ctx.fill();
    }

    // player — use char sprite if available
    this._drawPlayerChar(ctx);
    if (this.lvRing > 0) {
      const k = 1 - this.lvRing / 0.7;
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - k);
      ctx.strokeStyle = '#ffc850';
      ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 20 + k * 90, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    for (const pt of this.particles.active) {
      if (!pt.alive) continue;
      ctx.globalAlpha = 1 - pt.age / pt.life;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const d of this.dmgTexts.active) {
      if (!d.alive) continue;
      const dk = d.age / d.life;
      ctx.globalAlpha = 1 - dk * dk; // stay solid, then drop out (no long gray ghost)
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(d.scale || 1, d.scale || 1);
      // every number gets an ink outline so it reads on bright floors (was cream-on-beige)
      const px = d.crit ? 19 : d.big ? 17 : 16;
      ctx.font = `900 ${px}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(90, 42, 12, 0.45)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.strokeStyle = '#6b3a14';
      ctx.lineWidth = d.crit ? 3.5 : 3;
      ctx.strokeText(d.text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const cp of this.coinPops) {
      const py = cp.y - cp.age * 28;
      ctx.globalAlpha = 1 - cp.age / cp.life;
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6b3a14';
      ctx.strokeText(cp.text, cp.x, py);
      ctx.fillStyle = '#fff6e4';
      ctx.fillText(cp.text, cp.x, py);
    }
    ctx.globalAlpha = 1;

    // world-space combo popups removed (duplicated the HUD ×N counter and cluttered the fight)

    ctx.restore();
    // Screen-space HUD / banners: allow smoothing for readable text
    ctx.imageSmoothingEnabled = true;
    if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = true;
    if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = true;

    // vignette — cached warm edge so we don't rebuild a gradient every frame
    if (!this._vig || this._vigTheme !== theme) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const vctx = c.getContext('2d');
      const vig = vctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.8);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      const edge = theme === 'basement' ? 'rgba(90,50,15,0.20)' : theme === 'ward' ? 'rgba(90,55,20,0.20)' : 'rgba(70,40,10,0.22)';
      vig.addColorStop(1, edge);
      vctx.fillStyle = vig;
      vctx.fillRect(0, 0, W, H);
      this._vig = c;
      this._vigTheme = theme;
    }
    ctx.drawImage(this._vig, 0, 0);
    this._drawLowHp(ctx);

    drawJuiceOverlay(ctx, this.juice, W, H);

    this._drawBanners(ctx);
  }

  /** Soft warm edge when health is low. Slow breathe, no red flash. */
  _drawLowHp(ctx) {
    const p = this.player;
    if (!p || !this.alive || !(p.maxHp > 0)) return;
    const ratio = p.hp / p.maxHp;
    if (ratio >= 0.34) return;
    const k = (0.34 - ratio) / 0.34;
    const breathe = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(this.time * 2.2));
    const a = (0.16 + 0.14 * k) * breathe;
    const cx = W / 2;
    const cy = H * 0.42;
    const outer = Math.hypot(cx, H - cy);
    const g = ctx.createRadialGradient(cx, cy, outer * 0.45, cx, cy, outer);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.28, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(112, 62, 24, ${a.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /** Cartoon plaque banners (cream + thick outline). Soft fades only, no strobe. */
  _drawBanners(ctx) {
    const plaque = (cx, cy, w, h, fill, stroke) => {
      const x = cx - w / 2, y = cy - h / 2, r = 16;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      ctx.fillStyle = 'rgba(59,42,26,0.35)';
      ctx.save(); ctx.translate(0, 4); ctx.fill(); ctx.restore();
      ctx.fillStyle = fill; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
    };
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.bannerTimer > 0) {
      // Intro plaque sits under the HUD (pause ends ~82px, combo ~128px) and clears in 1.6s.
      const a = Math.max(0, Math.min(1, this.bannerTimer * 2.5, (1.6 - this.bannerTimer) * 4));
      const cy = 178;
      const pw = 280;
      const ph = 58;
      ctx.globalAlpha = a;
      plaque(W / 2, cy, pw, ph, '#fff3dc', '#3b2a1a');
      ctx.fillStyle = '#e8772a';
      ctx.fillRect(W / 2 - pw / 2 + 10, cy - ph / 2 + 6, pw - 20, 4);
      ctx.font = '900 18px sans-serif';
      ctx.fillStyle = '#3b2a1a';
      ctx.fillText(this.bannerTitle, W / 2, cy - 4);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#7a5530';
      ctx.fillText(this.bannerSub, W / 2, cy + 16);
      ctx.globalAlpha = 1;
    }
    if (this.midBanner) {
      const dur = this.midBannerDur || 1.8;
      const life = dur - this.midBannerT;
      const a = Math.max(0, Math.min(1, this.midBannerT * 4, life * 6)); // quick 0.25s fade, no long ghost
      const pop = 1 + Math.max(0, 0.18 - life) * 1.2; // tiny pop-in
      const kind = this.midBannerKind || 'info';
      const sty = {
        info: ['#fff3dc', '#3b2a1a', '#3b2a1a'],
        warn: ['#ffd9a8', '#3b2a1a', '#8a3a10'],
        elite: ['#ffe7a0', '#3b2a1a', '#7a4a00'],
        gold: ['#ffd76a', '#3b2a1a', '#5a3400'],
        boss: ['#f7b089', '#3b2a1a', '#6a1a08'],
      }[kind] || ['#fff3dc', '#3b2a1a', '#3b2a1a'];
      // Boss / wave / elite plaques stack under the HUD, and under the intro and coach tips.
      // Pause button occupies the top-right (~y 30–82); never place a plaque there.
      const hudClear = 168;
      const tips = this.tips;
      const tipCount = tips ? ((tips.move ? 1 : 0) + (tips.act ? 1 : 0) + (tips.idle && !tips.move ? 1 : 0)) : 0;
      const coachBottom = tipCount ? (this.bannerTimer > 0 ? 214 : 122) + tipCount * 40 : 0;
      let cy = this.bannerTimer > 0 ? 268 : 204;
      if (coachBottom) cy = Math.max(cy, coachBottom + 28);
      if (cy - 25 < hudClear) cy = hudClear + 25;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, cy); ctx.scale(pop, pop); ctx.translate(-W / 2, -cy);
      ctx.font = '900 22px sans-serif';
      const tw = Math.min(W - 30, ctx.measureText(this.midBanner).width + 56);
      plaque(W / 2, cy, tw, 50, sty[0], sty[1]);
      if (kind === 'boss' || kind === 'warn') {
        // hazard stripes on the plaque ends (static, slow breathing alpha)
        ctx.save();
        ctx.globalAlpha = a * (0.55 + 0.15 * Math.sin(this.time * 4));
        ctx.fillStyle = '#3b2a1a';
        for (const side of [-1, 1]) {
          const sx = W / 2 + side * (tw / 2 - 20);
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.moveTo(sx + k * 8 - 3, cy - 14); ctx.lineTo(sx + k * 8 + 3, cy - 14);
            ctx.lineTo(sx + k * 8 - 1, cy + 14); ctx.lineTo(sx + k * 8 - 7, cy + 14);
            ctx.closePath(); ctx.fill();
          }
        }
        ctx.restore();
      }
      ctx.fillStyle = sty[2];
      ctx.fillText(this.midBanner, W / 2, cy + 1);
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  }

  _drawPlayerChar(ctx) {
    const p = this.player;
    // r6: front-facing art (never mirrored). Moving → walk pose; idle → gentle breathing bob.
    const moving = this.joy && this.joy.active && Math.hypot(this.joy.dx, this.joy.dy) > 0.12 && this.alive && !this.paused;
    this._pWalk = (this._pWalk || 0) + ((moving ? 1 : 0) - (this._pWalk || 0)) * 0.2;
    const walk = walkPose(this.time * 10, this._pWalk);
    const bob = Math.sin(this.time * 4 + p.pulse) * 0.5 * (1 - this._pWalk);
    const spr = getCharSprite(this.charId);
    if (spr) {
      // No teal sticker ring — warm contact shadow only (matches enemies via drawStandingSprite)
      const footY = p.y + bob;
      const hh = p.r * 4.4;
      drawStandingSprite(ctx, spr, p.x, footY, hh, {
        maxW: p.r * 2.6,
        walk,
        shadow: 'rgba(70,45,20,0.28)',
      });
      // shield / orbit still via drawPlayer partial — call drawPlayer for overlays
      // but avoid double body: manually draw orbit+shield
      if (p.shield > 0) {
        ctx.strokeStyle = `rgba(200,180,120,${0.55 + Math.sin(this.time * 5) * 0.25})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, p.r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (p.orbitBalls > 0) {
        const radius = 38 + p.orbitBalls * 4;
        const fan = getIconCell(22) || getSprite('roboVac');
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
      if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) {
        ctx.strokeStyle = 'rgba(220,200,140,0.7)';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, p.r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      drawPlayer(ctx, p, this.time);
    }
  }
}

export { W, H, UPGRADES };
