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
import { SFX } from './audio.js';
import {
  getStage, pickEnemyType, spawnRateAt, difficultyScale,
  isStageCleared, clearProgress, waveLabel,
} from './stages.js';
import {
  createJuice, tickJuice, inHitstop, registerKill, triggerCritFlash,
  drawJuiceOverlay, drawFloatCombos, spawnKillBurst, addShake, shakeOffset,
} from './juice.js';
import { applyCharacterToPlayer, applyPassivesToPlayer, applyGearToPlayer, applyCharLevelToPlayer, unlockGallery } from './meta.js';
import { getIconCell, getChestImage, getCharSprite, getSprite, drawClippedSprite } from './sprites.js';

const W = 390;
const H = 844;
const WORLD_W = 1200;
const WORLD_H = 1600;

export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
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

  configure({ stageId, charId, equipped, save }) {
    this.stageId = stageId || 's1';
    this.charId = charId || 'grin';
    this.equipped = equipped || [];
    this.saveRef = save || null;
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
    this.spawnAcc = 0.85; // first enemies almost immediately
    this.killsSinceElite = 0;
    this.bossFired = {};
    this.bossesKilled = 0;
    this.bossesSpawned = 0;
    this.finalBossDead = false;
    this.announceFired = {};
    this.chestWave = 0;
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
    this.bannerTimer = 2.4;
    this.bannerTitle = this.stage.introBanner.title;
    this.bannerSub = this.stage.introBanner.sub;
    this.midBanner = null;
    this.midBannerT = 0;
    this.bgStars = []; // indoor facility — no night-sky starfield
    this.trees = this._genTrees(10);
    this.props = this._genProps(48);
    this._dustMotes = this._genDust(36);
    this.fogBands = this._genFog(5);
    this.parallaxSpark = []; // indoor — no outdoor sparkles
    this.groundPatches = this._genGround(80);
    this.hazardZones = []; // temporary spore / shock rings for draw+tick
    resetWeaponTimers(this.player);
  }

  _genStars(n) {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({
        x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
        r: 0.4 + Math.random() * 1.6, a: 0.15 + Math.random() * 0.55,
        s: Math.random() * Math.PI * 2, layer: Math.random() < 0.4 ? 0.3 : 0.7,
      });
    }
    return a;
  }

  // Floor scuffs / stains only — no wall silhouettes (walls were decorative-only = visual lie)
  _genTrees(n) {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({
        x: 40 + Math.random() * (WORLD_W - 80),
        y: 40 + Math.random() * (WORLD_H - 80),
        r: 8 + Math.random() * 22,
        rot: Math.random() * Math.PI,
        shade: 0.02 + Math.random() * 0.04, // keep ≤ ~0.06 so stains stay faint
        style: Math.floor(Math.random() * 3), // 0 ellipse stain, 1 scuff line, 2 tile chip
      });
    }
    return a;
  }

  _genDust(n) {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({
        x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 1.1,
        r: 1.2 + Math.random() * 2,
      });
    }
    return a;
  }

  _genFog(n) {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({
        y: (WORLD_H / n) * i + Math.random() * 80,
        h: 40 + Math.random() * 60,
        a: 0.04 + Math.random() * 0.06,
        drift: (Math.random() - 0.5) * 12,
      });
    }
    return a;
  }

  _genProps(n) {
    // Facility props only — never reed/lantern/pillar/stone/stump
    const theme = (this.stage && this.stage.theme) || 'office';
    const kinds = theme === 'ward'
      ? ['bed', 'cart', 'rock']
      : theme === 'basement'
        ? ['crate', 'pipe', 'rock']
        : ['desk', 'chair', 'rock'];
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({
        x: 50 + Math.random() * (WORLD_W - 100),
        y: 50 + Math.random() * (WORLD_H - 100),
        kind: kinds[Math.floor(Math.random() * kinds.length)],
        s: 0.7 + Math.random() * 0.6,
      });
    }
    return a;
  }

  _genGround(n) {
    const theme = (this.stage && this.stage.theme) || 'office';
    const a = [];
    for (let i = 0; i < n; i++) {
      let color = 'rgba(150,140,120,0.12)';
      if (theme === 'ward') color = 'rgba(140,150,160,0.12)';
      if (theme === 'basement') color = 'rgba(60,70,80,0.14)';
      a.push({
        x: Math.random() * WORLD_W,
        y: Math.random() * WORLD_H,
        r: 20 + Math.random() * 50,
        color,
        shade: Math.random(),
      });
    }
    return a;
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
    this.alive = true;
    this.cleared = false;
    this._last = performance.now();
    // Retention: seed nearby enemies so first 2s has targets
    for (let i = 0; i < 4; i++) {
      const pos = spawnPointAround(this.player.x, this.player.y, 140, 220, WORLD_W, WORLD_H);
      this.enemies.push(createEnemy('slime', pos.x, pos.y, 0.85));
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
    SFX.level();
    spawnBurst(this.particles, this.player.x, this.player.y, '#ffe066', 18, 140);
    if (upgrade.id === 'crit' || upgrade.id === 'critdmg') {
      if (this.saveRef) unlockGallery(this.saveRef, 'item_crit');
    }
    if (upgrade.id === 'frost' && this.saveRef) unlockGallery(this.saveRef, 'item_frost');
    if (upgrade.id === 'shield' && this.saveRef) unlockGallery(this.saveRef, 'item_shield');
    if ((upgrade.id === 'bounce' || upgrade.id === 'split' || upgrade.id === 'dashGhost') && this.saveRef) {
      unlockGallery(this.saveRef, 'item_crit');
    }
  }

  getUpgradeChoices() {
    return pickUpgradeChoices(this.owned, 3);
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
    SFX.chest();
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
    let raw = Math.min(0.05, (now - this._last) / 1000);
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
    if (this.midBannerT > 0) {
      this.midBannerT -= dt;
      if (this.midBannerT <= 0) this.midBanner = null;
    }

    // move
    const moveMul = (p._sporeSlow > 0) ? 0.55 : 1;
    if (p._sporeSlow > 0) p._sporeSlow -= dt;
    p.x += this.joy.dx * p.speed * moveMul * dt;
    p.y += this.joy.dy * p.speed * moveMul * dt;
    p.x = Math.max(p.r, Math.min(WORLD_W - p.r, p.x));
    p.y = Math.max(p.r, Math.min(WORLD_H - p.r, p.y));
    if (this.joy.active) p.facing = Math.atan2(this.joy.dy, this.joy.dx);
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

    this.camX = Math.max(0, Math.min(WORLD_W - W, p.x - W / 2));
    this.camY = Math.max(0, Math.min(WORLD_H - H, p.y - H / 2));

    this._spawnWave(dt);
    this._checkBosses();
    this._checkAnnounces();
    this._checkChests();
    this._checkSecret();

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
            r: 7, damage: ev.damage, age: 0, life: 2.2, hit: false,
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
      e.x += ((dx / d) * spd + wx) * dt;
      e.y += ((dy / d) * spd + wy) * dt;
      }

      if (e.phaseHidden) continue;
      if (p.invuln <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r - 2) {
        if (p.shield > 0) {
          p.shield -= 1;
          p.invuln = 1.0;
          spawnBurst(this.particles, p.x, p.y, '#e8c878', 14, 110);
          SFX.hit();
        } else {
          p.hp -= e.damage * (p.damageTakenMul || 1);
          p.invuln = 0.7;
          addShake(this.juice, 10, 0.25);
          SFX.hit();
          spawnBurst(this.particles, p.x, p.y, '#ff6b8a', 10, 100);
          tookDamage = true;
          this.noDamageTimer = 0;
          if (p.thorns > 0) this._hurtEnemy(e, p.thorns, false);
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
      if (d < p.magnet) {
        g.magnetized = true;
        g.trail.push({ x: g.x, y: g.y });
        if (g.trail.length > 5) g.trail.shift();
        const pull = Math.min(480, 200 + (p.magnet - d) * 5);
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
      if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.r + 8) {
        c.opened = true;
        c.alive = false;
        this.paused = true;
        if (this.saveRef) unlockGallery(this.saveRef, 'item_chest');
        SFX.chest();
        if (this.hooks.onChest) this.hooks.onChest();
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
      });
    }
  }

  _spawnWave(dt) {
    // Retention: denser early spawns for first 10s
    const earlyBoost = this.time < 10 ? 1.55 : 1;
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
    for (const b of this.stage.bosses || []) {
      if (this.time >= b.at && !this.bossFired[b.at]) {
        this.bossFired[b.at] = true;
        this._spawnBoss(b.label);
      }
    }
    // endless: boss every 150s, elite surge every 90s
    if (this.stage.endless) {
      const bossSlot = Math.floor(this.time / 150);
      if (bossSlot > 0 && !this.bossFired['e'+bossSlot]) {
        this.bossFired['e'+bossSlot] = true;
        this._spawnBoss('无尽设施霸主', { bonus: true });
      }
      const surge = Math.floor(this.time / 90);
      if (surge > 0 && !this.announceFired['surge'+surge]) {
        this.announceFired['surge'+surge] = true;
        this.midBanner = '安保增援！';
        this.midBannerT = 1.8;
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
        this.midBanner = a.text;
        this.midBannerT = 1.8;
        SFX.announce();
        const scale = difficultyScale(this.stage, this.time);
        for (let i = 0; i < 5; i++) {
          const pos = spawnPointAround(this.player.x, this.player.y, 200, 320, WORLD_W, WORLD_H);
          const type = pickEnemyType(this.stage, this.time);
          this.enemies.push(createEnemy(type, pos.x, pos.y, scale));
        }
      }
    }
  }

  _checkChests() {
    // chest between waves every ~45s (retention mid peak)
    const slot = Math.floor(this.time / 45);
    if (slot > 0 && slot > this.chestWave && this.time < this.stage.clearTime - 15) {
      this.chestWave = slot;
      // 70% guaranteed + 30% surprise extra
      this._spawnChest();
      if (Math.random() < 0.3) {
        setTimeout(() => {
          if (this.alive && !this.cleared) this._spawnChest();
        }, 800);
      }
    }
  }

  _spawnChest() {
    const pos = spawnPointAround(this.player.x, this.player.y, 80, 140, WORLD_W, WORLD_H);
    const c = this.chests.acquire();
    c.x = pos.x; c.y = pos.y; c.r = 18; c.bob = 0; c.opened = false;
    spawnBurst(this.particles, pos.x, pos.y, '#ffe066', 12, 80);
    const now = this.time || 0;
    if (!this._lastChestToast || now - this._lastChestToast > 1.2) {
      this._lastChestToast = now;
      if (this.hooks.onToast) this.hooks.onToast('物资箱出现！');
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
      if (this.saveRef) unlockGallery(this.saveRef, 'enemy_secret');
      if (this.hooks.onToast) this.hooks.onToast('无伤达成！故障投影出现');
      SFX.announce();
    }
    // high combo secret boss
    if (!this.juice._comboBoss && this.juice.combo >= 25 && this.stage.index >= 1) {
      this.juice._comboBoss = true;
      this._spawnBoss('失控主机', { bonus: true });
    }
  }

  _spawnBoss(label, opts = {}) {
    const bonus = !!opts.bonus; // combo/secret extras must NOT count toward stage clear
    const pos = spawnPointAround(this.player.x, this.player.y, 300, 360, WORLD_W, WORLD_H);
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
    this.enemies.push(boss);
    if (!bonus) this.bossesSpawned = (this.bossesSpawned || 0) + 1;
    addShake(this.juice, 16, 0.4);
    SFX.boss();
    // midBanner only — no duplicate onToast
    this.midBanner = label || `${names[variant]}来袭！`;
    this.midBannerT = 2.2;
    if (this.saveRef) unlockGallery(this.saveRef, 'enemy_boss');
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
    e.hitFlash = 0.12;
    const crit = !!wasCrit;
    if (crit) {
      triggerCritFlash(this.juice);
      SFX.crit();
    }
    const dt = this.dmgTexts.acquire();
    dt.x = e.x + (Math.random() - 0.5) * 16;
    dt.y = e.y - e.r;
    dt.text = String(Math.round(dmg));
    dt.age = 0;
    dt.life = crit ? 0.75 : 0.55;
    dt.color = crit ? '#e8c878' : (e.isBoss ? '#e0a0a8' : '#f0e6d0');
    dt.crit = crit;
    dt.scale = crit ? 1.6 : 1;

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

      registerKill(this.juice, e.x, e.y, e.isElite, e.isBoss);
      spawnKillBurst(this.particles, e.x, e.y, e.color, e.isBoss || e.isElite);
      if (this.juice.combo === 5 || this.juice.combo === 10) SFX.combo();

      if (this.saveRef) {
        unlockGallery(this.saveRef, `enemy_${e.type === 'boss' ? 'boss' : e.type}`);
        if (e.isElite) unlockGallery(this.saveRef, 'enemy_elite');
      }

      const gemCount = e.isBoss ? 8 : Math.max(1, e.xp);
      for (let i = 0; i < gemCount; i++) {
        const g = this.gems.acquire();
        g.x = e.x + (Math.random() - 0.5) * 22;
        g.y = e.y + (Math.random() - 0.5) * 22;
        g.value = e.isBoss ? 3 : 1;
        g.r = e.isBoss ? 8 : 6;
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
      if (!crit) SFX.hit();

      // elite every N kills
      if (this.killsSinceElite >= this.stage.eliteEvery) {
        this.killsSinceElite = 0;
        const pos = spawnPointAround(this.player.x, this.player.y, 240, 320, WORLD_W, WORLD_H);
        const type = pickEnemyType(this.stage, this.time);
        this.enemies.push(createEnemy(type, pos.x, pos.y, difficultyScale(this.stage, this.time), { elite: true }));
        if (this.midBannerT <= 0) { this.midBanner = '精英来袭！'; this.midBannerT = 1.6; }
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
    spawnBurst(this.particles, this.player.x, this.player.y, '#ffe066', 36, 200);
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
        rewardCoins: bonus,
        rewardDiamonds: 5 + this.stage.index * 5,
      });
    }
  }

  _die() {
    this.alive = false;
    this.running = false;
    SFX.death();
    spawnBurst(this.particles, this.player.x, this.player.y, '#ffe066', 30, 180);
    if (this.hooks.onDeath) {
      this.hooks.onDeath({
        stageId: this.stage.id,
        stageName: this.stage.name,
        time: this.time,
        kills: this.kills,
        coins: this.coinsEarned,
        maxCombo: this.juice.maxCombo,
        revivedOnce: this.revivedOnce,
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const off = shakeOffset(this.juice);
    const tint = this.stage.bgTint || [0.1, 0.18, 0.25];
    const theme = this.stage.theme || 'office';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // muted grounded backgrounds per chapter
    let c0, c1, c2;
    if (theme === 'ward') {
      c0 = [48, 52, 56]; c1 = [40, 44, 48]; c2 = [32, 36, 40];
    } else if (theme === 'basement') {
      c0 = [28, 30, 34]; c1 = [20, 22, 26]; c2 = [14, 16, 18];
    } else {
      c0 = [52, 48, 40]; c1 = [42, 38, 32]; c2 = [32, 28, 24];
    }
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `rgb(${c0[0]},${c0[1]},${c0[2]})`);
    bg.addColorStop(0.55, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
    bg.addColorStop(1, `rgb(${c2[0]},${c2[1]},${c2[2]})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-this.camX + off.x, -this.camY + off.y);

    // ground base — office carpet / ward tile / basement tech floor
    if (theme === 'ward') ctx.fillStyle = 'rgba(170, 175, 178, 0.55)';
    else if (theme === 'basement') ctx.fillStyle = 'rgba(45, 48, 52, 0.7)';
    else ctx.fillStyle = 'rgba(168, 155, 130, 0.55)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // ground patches
    for (const g of (this.groundPatches || [])) {
      if (theme === 'ward') ctx.fillStyle = `rgba(190, 195, 200, ${0.1 + g.shade * 0.12})`;
      else if (theme === 'basement') ctx.fillStyle = `rgba(35, 40, 48, ${0.15 + g.shade * 0.15})`;
      else ctx.fillStyle = `rgba(150, 138, 115, ${0.1 + g.shade * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.r, g.r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // starfield / outdoor sparkles disabled for indoor facility floors
    // (parallaxSpark + bgStars kept empty in reset)
    ctx.globalAlpha = 1;

    // fog bands
    for (const f of this.fogBands) {
      ctx.fillStyle = `rgba(160,155,140,${f.a * 0.7})`;
      ctx.fillRect(0, f.y + Math.sin(this.time * 0.3) * f.drift, WORLD_W, f.h);
    }

    // Open floor tile / carpet grid (no room-wall strokes — player has no wall collision)
    {
      const tile = theme === 'basement' ? 56 : theme === 'ward' ? 48 : 64;
      let gridA, gridB;
      if (theme === 'ward') {
        gridA = 'rgba(120, 128, 136, 0.10)';
        gridB = 'rgba(200, 205, 210, 0.06)';
      } else if (theme === 'basement') {
        gridA = 'rgba(70, 80, 90, 0.14)';
        gridB = 'rgba(40, 48, 56, 0.08)';
      } else {
        // beige office carpet seams — soft, not wall-like
        gridA = 'rgba(120, 108, 88, 0.11)';
        gridB = 'rgba(180, 168, 140, 0.05)';
      }
      ctx.strokeStyle = gridA;
      ctx.lineWidth = 1;
      const x0 = Math.floor(this.camX / tile) * tile;
      const y0 = Math.floor(this.camY / tile) * tile;
      const x1 = this.camX + W + tile;
      const y1 = this.camY + H + tile;
      for (let x = x0; x < x1; x += tile) {
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      }
      for (let y = y0; y < y1; y += tile) {
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      }
      // subtle alternate tile tint (carpet / linoleum / tech plate)
      ctx.fillStyle = gridB;
      for (let y = y0; y < y1; y += tile) {
        for (let x = x0; x < x1; x += tile) {
          if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        }
      }
    }

    // Flat floor stains / scuffs (was wall silhouettes — decorative only, removed)
    for (const tr of this.trees) {
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.rot || 0);
      if (tr.style === 1) {
        ctx.strokeStyle = theme === 'basement'
          ? `rgba(50,58,68,${Math.min(0.06, tr.shade + 0.02)})`
          : theme === 'ward'
            ? `rgba(130,138,145,${Math.min(0.06, tr.shade + 0.02)})`
            : `rgba(110,98,78,${Math.min(0.06, tr.shade + 0.02)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-tr.r, 0);
        ctx.lineTo(tr.r, 0);
        ctx.stroke();
      } else if (tr.style === 2) {
        ctx.fillStyle = theme === 'basement'
          ? `rgba(55,62,72,${tr.shade})`
          : theme === 'ward'
            ? `rgba(155,160,168,${tr.shade})`
            : `rgba(145,132,108,${tr.shade})`;
        ctx.fillRect(-tr.r * 0.4, -tr.r * 0.25, tr.r * 0.8, tr.r * 0.5);
      } else {
        ctx.fillStyle = theme === 'basement'
          ? `rgba(35,40,48,${tr.shade})`
          : theme === 'ward'
            ? `rgba(140,148,155,${tr.shade})`
            : `rgba(130,118,95,${tr.shade})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, tr.r, tr.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // chapter props — real sprites (no fillRect/ellipse geometry)
    const PROP_SPRITE = {
      desk: 'propDesk', chair: 'propChair', bed: 'propBed',
      cart: 'propCart', crate: 'propCrate', pipe: 'propPipe', rock: 'propRock',
    };
    const PROP_SIZE = {
      desk: 38, chair: 28, bed: 42, cart: 34, crate: 32, pipe: 36, rock: 22,
    };
    for (const pr of (this.props || [])) {
      const s = pr.s || 1;
      const key = PROP_SPRITE[pr.kind];
      let spr = key ? getSprite(key) : null;
      // rock fallback: tiny crate rubble if prop_rock missing
      if (!spr && pr.kind === 'rock') spr = getSprite('propCrate');
      if (!spr && pr.kind === 'cart') spr = getSprite('propBed') || getSprite('propCrate');
      if (spr) {
        const base = PROP_SIZE[pr.kind] || 32;
        const sz = base * s;
        const iw = spr.naturalWidth || spr.width;
        const ih = spr.naturalHeight || spr.height;
        const aspect = iw / Math.max(1, ih);
        let dw = sz, dh = sz;
        if (aspect >= 1) { dh = sz / aspect; } else { dw = sz * aspect; }
        // soft ground shadow only
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y + dh * 0.38, dw * 0.42, dh * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.drawImage(spr, pr.x - dw / 2, pr.y - dh / 2, dw, dh);
      }
    }

    // hazard zones visual
    for (const z of (this.hazardZones || [])) {
      const a = 1 - z.age / z.life;
      ctx.globalAlpha = Math.max(0, a * 0.55);
      if (z.kind === 'spore') {
        ctx.fillStyle = '#c8c050';
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (0.7 + 0.3 * a), 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === 'shockwave' || z.kind === 'nova') {
        if (z.kind === 'nova') {
          const ex = getSprite('projExtinguish');
          if (ex) {
            const es = 28 + 18 * a;
            ctx.drawImage(ex, z.x - es / 2, z.y - es / 2, es, es);
          }
        }
        ctx.strokeStyle = z.kind === 'nova' ? 'rgba(180,200,210,0.7)' : '#d08098';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * Math.min(1, z.age * 4 + 0.2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === 'lightning') {
        ctx.strokeStyle = '#e8d060';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(232,208,96,0.25)';
        ctx.fill();
      } else if (z.kind === 'ebolt') {
        ctx.fillStyle = '#c87850';
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
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

    for (const f of (this._dustMotes || [])) {
      const fx = f.x + Math.cos(this.time * f.speed + f.phase) * 18;
      const fy = f.y + Math.sin(this.time * f.speed * 0.8 + f.phase) * 12;
      ctx.globalAlpha = 0.12 + 0.18 * Math.sin(this.time * 2 + f.phase);
      ctx.fillStyle = '#b8b0a0';
      ctx.beginPath();
      ctx.arc(fx, fy, f.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // gems with trails
    for (const g of this.gems.active) {
      if (!g.alive) continue;
      if (g.magnetized && g.trail.length > 1) {
        ctx.strokeStyle = g.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g.trail[0].x, g.trail[0].y);
        for (const t of g.trail) ctx.lineTo(t.x, t.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // chests
    const chestImg = getChestImage();
    for (const c of this.chests.active) {
      if (!c.alive) continue;
      const by = c.y + Math.sin(c.bob * 3) * 4;
      if (chestImg) {
        drawClippedSprite(ctx, chestImg, c.x, by, c.r, {
          glow: 'none', scale: 1.45,
        });
      } else {
        ctx.fillStyle = '#c48a3a';
        ctx.fillRect(c.x - 14, by - 10, 28, 22);
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(c.x - 14, by - 2, 28, 4);
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(c.x, by + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const e of this.enemies) {
      if (e.alive) drawEnemy(ctx, e, this.time);
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

    // player — use char sprite if available
    this._drawPlayerChar(ctx);

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
      ctx.globalAlpha = 1 - d.age / d.life;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(d.scale || 1, d.scale || 1);
      ctx.font = d.crit ? 'bold 18px sans-serif' : 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      if (d.crit) {
        ctx.strokeStyle = '#5a3000';
        ctx.lineWidth = 3;
        ctx.strokeText(d.text, 0, 0);
      }
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const cp of this.coinPops) {
      ctx.globalAlpha = 1 - cp.age / cp.life;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066';
      ctx.fillText(cp.text, cp.x, cp.y - cp.age * 30);
    }
    ctx.globalAlpha = 1;

    drawFloatCombos(ctx, this.juice, 0, 0);

    ctx.restore();

    // vignette — warmer / chapter tinted
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    if (theme === 'basement') vig.addColorStop(1, 'rgba(8,10,14,0.62)');
    else if (theme === 'ward') vig.addColorStop(1, 'rgba(16,18,22,0.5)');
    else vig.addColorStop(1, 'rgba(12,16,10,0.48)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    drawJuiceOverlay(ctx, this.juice, W, H);

    // entrance / mid banners on canvas
    if (this.bannerTimer > 0) {
      const a = Math.min(1, this.bannerTimer * 2, (2.4 - this.bannerTimer) * 2);
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.fillStyle = 'rgba(5,10,20,0.45)';
      ctx.fillRect(0, H * 0.32, W, 90);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(this.bannerTitle, W / 2, H * 0.32 + 40);
      ctx.fillStyle = '#d8c8a8';
      ctx.font = '13px sans-serif';
      ctx.fillText(this.bannerSub, W / 2, H * 0.32 + 68);
      ctx.globalAlpha = 1;
    }
    if (this.midBanner) {
      ctx.globalAlpha = Math.min(1, this.midBannerT);
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px sans-serif';
      ctx.strokeStyle = '#1a1020';
      ctx.lineWidth = 4;
      ctx.strokeText(this.midBanner, W / 2, H * 0.28);
      ctx.fillStyle = '#e8c878';
      ctx.fillText(this.midBanner, W / 2, H * 0.28);
      ctx.globalAlpha = 1;
    }
  }

  _drawPlayerChar(ctx) {
    const p = this.player;
    const bob = Math.sin(this.time * 4 + p.pulse) * 2;
    const spr = getCharSprite(this.charId);
    if (spr) {
      const tint = this.charId === 'intern' ? 'rgba(200,180,120,0.35)' : null;
      drawClippedSprite(ctx, spr, p.x, p.y + bob, p.r, {
        glow: 'none',
        scale: 1.3,
        tint,
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
