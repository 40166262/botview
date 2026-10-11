/* 游戏核心：Matter.js 物理 + Canvas 渲染。世界坐标 = 设计像素（宽 750），底座顶面 y = 0，向上为负；1 米 = 100 像素。 */
(function () {
  const CS = window.CS, M = window.Matter, A = CS.Assets;
  const W = 750;
  const PLAT = { x: 375, w: 480, h: 120 };
  const GROUND_TOP = 120;
  const STEP = 1000 / 120;
  const FEEL = CS.CONFIG.feel;      // 手感参数全部在 config.js
  const FAIL_Y = 60;
  const SWING_LO = W / 2 - W * FEEL.swingAmplitude, SWING_HI = W / 2 + W * FEEL.swingAmplitude;

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function speedMult(h) {        // DESIGN.md §4：0-10 慢，10-30 中，30+ 快，最多 2 倍
    let m = 1, from = 0;
    for (const t of FEEL.speedTiers) if (h >= t.from) { m = t.mult; from = t.from; }
    if (from >= 30) m += (h - from) * FEEL.speedRampAfter30;
    return Math.min(FEEL.maxSpeedMult, m);
  }
  function windStrength(h) { const w = FEEL.wind; return h < w.fromHeight ? 0 : Math.min(1, w.baseStrength + (h - w.fromHeight) / w.rampMeters); }

  class Game {
    constructor() {
      this.viewH = 1334; this.safeTop = 0; this.safeBottom = 0;
      this.state = 'idle';
      this.time = 0;
      this.particles = []; this.texts = [];
      this.cb = {};
      this.camY = this.camY0 = -(this.viewH - 330);
      this.shake = 0;
      this.bgHeight = 0;
      this.menuT = 0;
      this.decor = makeDecor();
      this.fx = CS.mulberry32(7);
      this.vfx = CS.mulberry32(11);      // 纯表现用（叶子等），绝不消耗玩法种子流
      this._S = 1;
    }
    on(name, fn) { this.cb[name] = fn; }
    emit(name, a) { const f = this.cb[name]; if (f) f(a); }

    setView(viewH, safeTop, safeBottom) {
      this.viewH = viewH; this.safeTop = safeTop; this.safeBottom = safeBottom;
      this.camY0 = -(viewH - 330 - safeBottom * 0.5);
      this.camMenu = -(viewH - 235 - safeBottom * 0.5);      // 开始页镜头更低，给按钮留出空间
      if (this.state === 'idle') this.camY = this.camMenu;
      else if (!this.cats || !this.cats.length) this.camY = this.camY0;
    }
    get hangOffset() { return this.safeTop + 330; }

    // ---------------------------------------------------------------- round
    start(opts) {
      opts = opts || {};
      this.seed = (opts.seed >>> 0) || CS.newSeed();
      this.seq = new CS.CatSequence(this.seed);
      this.fx = CS.mulberry32((this.seed ^ 0x5bd1e995) >>> 0);   // 表现用随机（也不用 Math.random）
      this.vfx = CS.mulberry32((this.seed ^ 0x27d4eb2f) >>> 0);  // 风中飘叶：独立的表现随机流
      this.windShown = false; this.leafT = 0;
      if (this.engine) { M.Events.off(this.engine); M.Composite.clear(this.engine.world, false); M.Engine.clear(this.engine); }
      const engine = this.engine = M.Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
      engine.gravity.y = FEEL.gravity;
      this.platform = M.Bodies.rectangle(PLAT.x, PLAT.h / 2, PLAT.w, PLAT.h, { isStatic: true, friction: 1, restitution: 0, chamfer: { radius: 16 }, label: 'platform' });
      this.ground = M.Bodies.rectangle(PLAT.x, GROUND_TOP + 300, 4000, 600, { isStatic: true, friction: 1, label: 'ground' });
      M.Composite.add(engine.world, [this.platform, this.ground]);
      M.Events.on(engine, 'collisionStart', (e) => this.onCollide(e));
      this.cats = []; this.byId = {};
      this.catIndex = 0;
      this.hanging = null;
      this.hangX = W / 2; this.hangDir = 1;
      this.active = null;
      this.nextSpawnAt = 0;
      this.maxHeight = 0; this.bonus = 0; this.combo = 0; this.perfects = 0; this.bestCombo = 0;
      this.milestone = 0;
      this.snapshot = []; this.stableFrames = 0;
      this.reviveUsed = 0; this.swapsUsed = 0;
      this.lastWobble = -9;
      this.resetScared();
      this.particles.length = 0; this.texts.length = 0;
      this.camY = this.camMenu != null ? this.camMenu : this.camY0;  // 从开始页镜头平滑移到游戏镜头
      this.time = 0; this.timeScale = 1;
      this.acc = 0;
      A.CAT_ORDER.forEach(id => A.sprite(id, CS.Save.data.skin, true));   // 预先画好受惊精灵，晃起来时不卡
      this.state = 'play';
      this.spawnHanging(250);
      this.hud();
    }

    // ---- 唯一的计分口径（QA#1）：
    // 高度 = 猫塔「稳定下来」时到过的最高点（米，取整）；奖励分/完美次数也只在猫塔稳定后才入账。
    // HUD、复活弹窗、结算页、最高分、新纪录全部读这里，复活不会让分数变化。
    get heightM() { return Math.floor(this.maxHeight + 1e-6); }
    get score() { return this.heightM + this.bonus; }
    get coinsEarned() { const E = CS.CONFIG.economy; return this.heightM * E.coinsPerMeter + this.perfects * E.coinsPerPerfect; }
    result() {
      return { height: this.heightM, bonus: this.bonus, score: this.score, perfects: this.perfects, cats: this.snapshot.length, coins: this.coinsEarned, bestCombo: this.bestCombo };
    }
    // 换猫按钮为什么不能用（null = 可以用）
    swapBlockReason() {
      if (this.state !== 'play') return 'busy';
      if (this.swapsUsed >= CS.CONFIG.limits.swapPerRound) return 'used';
      if (!this.hanging) return 'busy';
      if (this.hanging.type === 'loaf') return 'loaf';
      return null;
    }

    hud() {
      this.emit('hud', {
        height: this.heightM, score: this.score, combo: this.combo,
        next: this.seq ? this.seq.get(this.catIndex + (this.hanging ? 1 : 0)) : null,
        wind: this.currentWind(), swapsLeft: CS.CONFIG.limits.swapPerRound - this.swapsUsed
      });
    }
    currentWind() {
      const k = windStrength(this.maxHeight);
      if (!k || !this.seq) return 0;
      const idx = this.hanging ? this.hanging.idx : (this.active ? this.active.idx : this.catIndex);
      return this.seq.wind(idx) * k;
    }

    spawnHanging(delay) {
      const idx = this.catIndex;
      const type = this.seq.get(idx);
      this.hanging = { type, idx, skin: CS.Save.data.skin, born: this.time + (delay || 0), swapped: false };
      const g = A.geom(type);
      this.hangX = clamp(this.hangX, SWING_LO, SWING_HI);
      if (!this.windShown && windStrength(this.maxHeight) > 0) {   // 第一次起风
        this.windShown = true;
        this.emit('windStart', this.currentWind());
      }
      this.emit('spawn', type);
      this.hud();
      return g;
    }

    swapToLoaf() {           // 广告奖励：把待放的猫换成吐司猫
      if (this.swapBlockReason()) return false;
      this.hanging.type = 'loaf'; this.hanging.swapped = true; this.hanging.born = this.time;
      this.swapsUsed++;
      this.burst(this.hangX, this.camY + this.hangOffset, 'star', 14);
      this.hud();
      return true;
    }

    canDrop() {
      if (this.state !== 'play' || !this.hanging) return false;
      if (this.time < this.hanging.born + 160) return false;
      return this.gapOk();
    }
    gapOk() {
      const top = this.towerTop();
      const hy = this.camY + this.hangOffset;
      const T = A.CAT_TYPES[this.hanging.type];
      return top - (hy + T.h / 2) > 110;
    }

    drop() {
      if (!this.canDrop()) return false;
      const h = this.hanging; this.hanging = null;
      const g = A.geom(h.type), T = A.CAT_TYPES[h.type];
      const y = this.camY + this.hangOffset;
      const x = this.hangX;
      // 把「图片视觉中心」放在 hangX：质心相对图片中心的偏移
      const cx = x + (g.cx - T.w / 2), cy = y + (g.cy - T.h / 2);
      const body = this.makeBody(h.type, cx, cy, 0, h.idx);
      const cat = { body, type: h.type, skin: h.skin, idx: h.idx, landed: false, landT: -9, impact: 0, dropT: this.time };
      this.cats.push(cat); this.byId[body.id] = cat;
      M.Composite.add(this.engine.world, body);
      this.active = cat;
      this.catIndex++;
      this.nextSpawnAt = 0;
      const sd = CS.Save.data; if (sd.seenCats.indexOf(h.type) < 0) { sd.seenCats.push(h.type); CS.Save.commit(); }
      CS.audio.play('drop');
      this.hud();
      return true;
    }

    makeBody(type, x, y, angle, idx) {
      const T = A.CAT_TYPES[type], g = A.geom(type), NB = FEEL.newbie;
      const newbie = idx != null && idx < NB.count;     // 新手保护：前 5 只猫更「粘」、不弹
      const opts = { density: T.density, friction: newbie ? Math.max(T.friction, NB.friction) : T.friction, frictionStatic: newbie ? NB.frictionStatic : FEEL.frictionStatic,
        restitution: newbie ? NB.restitution : T.restitution, frictionAir: 0.012, slop: 0.04, label: 'cat', sleepThreshold: 45 };
      let b;
      if (g.circle) b = M.Bodies.circle(x, y, g.r, Object.assign({ frictionAir: 0.01 }, opts), 24);
      else b = M.Body.create(Object.assign({ position: { x, y }, vertices: M.Vertices.clockwiseSort(g.verts.map(v => ({ x: v.x, y: v.y }))) }, opts));
      if (angle) M.Body.setAngle(b, angle);
      b.restitution = opts.restitution;   // Body.create 会给默认值，这里显式写回
      M.Body.setInertia(b, b.inertia * 1.35);   // 稍大的转动惯量：落上去会晃，但不会像果冻一样一直摇
      return b;
    }

    onCollide(e) {
      for (const pair of e.pairs) {
        const a = pair.bodyA.parent || pair.bodyA, b = pair.bodyB.parent || pair.bodyB;
        const ca = this.byId[a.id], cb = this.byId[b.id];
        if ((ca && b === this.ground) || (cb && a === this.ground)) { this.fail(ca || cb, 'ground'); continue; }
        if (ca && !ca.landed && this.state === 'play') this.land(ca, b, pair);
        if (cb && !cb.landed && this.state === 'play') this.land(cb, a, pair);
      }
    }

    land(cat, other, pair) {
      cat.landed = true; cat.landT = this.time;
      const v = cat.body.velocity;
      const impact = clamp(Math.hypot(v.x, v.y) / 14, 0, 1);
      cat.impact = impact;
      const T = A.CAT_TYPES[cat.type];
      const bb = cat.body.bounds;
      const cx = (bb.min.x + bb.max.x) / 2;
      const isCatOrPlat = other === this.platform || this.byId[other.id];
      const ob = other.bounds;
      const tx = (ob.min.x + ob.max.x) / 2;
      const sup = pair.collision && pair.collision.supports && pair.collision.supports[0];
      const px = sup ? sup.x : cx, py = sup ? sup.y : bb.max.y;
      this.burst(px, py, 'dust', 6 + Math.round(impact * 6));
      CS.audio.play('land', { volume: 0.4 + 0.6 * impact, rate: 0.92 + this.fx() * 0.16 });
      this.shake = Math.max(this.shake, 3 + impact * 5);
      if (cat === this.active) {
        // 软着陆：猫咪落地会「缓冲」，去掉大部分冲击，避免整座塔被砸得一直摇
        M.Body.setVelocity(cat.body, { x: v.x * 0.35, y: v.y * 0.3 });
        M.Body.setAngularVelocity(cat.body, cat.body.angularVelocity * 0.3);
        this.active = null;
        this.nextSpawnAt = this.time + 420;
        const perfect = isCatOrPlat && Math.abs(cx - tx) < T.w * FEEL.perfectTolerance;
        if (perfect) {
          this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
          const add = Math.min(5 * this.combo, 20);
          cat.pendingBonus = add;          // 猫塔稳定后才入账（倒了就不算），保证分数口径一致
          this.text(cx, bb.min.y - 30, '完美！', '#FF6F91', 64);
          this.text(cx, bb.min.y + 30, '+' + add, '#FFB13D', 46, 0.15);
          if (this.combo >= 2) this.text(cx, bb.min.y - 100, '连击 ×' + this.combo, '#9B7BFF', 44, 0.25);
          this.burst(cx, bb.min.y, 'heart', 8 + this.combo * 2);
          this.burst(cx, bb.min.y, 'star', 6);
          cat.perfectT = this.time;
          this.shake = Math.max(this.shake, 9);
          CS.audio.play('perfect');
          if (this.combo >= 2) CS.audio.play('combo', { rate: CS.audio.comboRate(this.combo) });
          CS.audio.play('meow2', { rate: CS.audio.meowRate(cat.type), delay: 0.12 });
          this.emit('vibrate', 25);
          this.emit('perfect', { combo: this.combo, add });
        } else {
          this.combo = 0;
          if (this.fx() < 0.3) CS.audio.play(['meow1', 'meow2', 'meow3'][Math.floor(this.fx() * 3)], { rate: CS.audio.meowRate(cat.type), delay: 0.1 });
        }
        this.hud();
      }
    }

    fail(cat, reason) {
      if (this.state !== 'play') return;
      this.failReason = reason || 'unknown';
      this.failInfo = cat ? { type: cat.type, idx: cat.idx, x: Math.round(cat.body.position.x), y: Math.round(cat.body.position.y), landed: cat.landed } : null;
      this.state = 'failing';
      this.failT = this.time;
      this.failCat = cat;
      this.timeScale = 0.45;
      this.hanging = null;
      this.combo = 0;
      CS.audio.play('collapse');
      this.emit('vibrate', 80);
      this.shake = 16;
      this.emit('collapse');
    }

    revive() {      // 恢复到最近一次稳定的猫塔（相当于移除倒下的猫），继续游戏
      this.reviveUsed++;
      for (const c of this.cats) M.Composite.remove(this.engine.world, c.body);
      this.cats = []; this.byId = {};
      for (const s of this.snapshot) {
        const b = this.makeBody(s.type, s.x, s.y, s.angle, s.idx);
        M.Body.setVelocity(b, { x: 0, y: 0 }); M.Body.setAngularVelocity(b, 0);
        M.Sleeping.set(b, true);
        const c = { body: b, type: s.type, skin: s.skin, idx: s.idx, landed: true, landT: -9, impact: 0 };
        this.cats.push(c); this.byId[b.id] = c;
        M.Composite.add(this.engine.world, b);
      }
      this.active = null;
      this.state = 'play';
      this.timeScale = 1;
      this.resetScared(); this.stableFrames = 0; this.combo = 0;
      const top = this.towerTop();
      this.burst(W / 2, top, 'star', 24);
      this.burst(W / 2, top, 'heart', 10);
      CS.audio.play('revive');
      this.text(W / 2, top - 150, '复活！', '#FF6F91', 72);     // 画在塔顶，不挡悬挂的猫
      this.spawnHanging(700);
    }

    towerTop() {
      let top = 0;
      for (const c of this.cats) if (c.landed && c !== this.active) top = Math.min(top, c.body.bounds.min.y);
      return top;
    }

    // ---------------------------------------------------------------- update
    update(dtMs) {
      dtMs = Math.min(dtMs, 50);
      this.menuT += dtMs / 1000;
      if (this.state === 'idle' || !this.engine) {
        if (this.camMenu != null) this.camY += (this.camMenu - this.camY) * Math.min(1, dtMs / 1000 * 4);
        this.updateFx(dtMs / 1000); return;
      }
      const sdt = dtMs * this.timeScale;
      this.time += sdt;
      if (this.state === 'failing' && this.time - this.failT > 500) this.timeScale = Math.min(1, this.timeScale + dtMs / 600);

      // 风：只作用于正在下落的猫
      const wind = this.currentWind();
      this.acc += sdt;
      let steps = 0;
      while (this.acc >= STEP && steps < 6) {
        if (this.active && wind) {
          const b = this.active.body;
          M.Body.applyForce(b, b.position, { x: b.mass * wind * FEEL.wind.force, y: 0 });
        }
        M.Engine.update(this.engine, STEP);
        this.postStep();
        this.acc -= STEP; steps++;
      }
      if (steps >= 6) this.acc = 0;

      const dt = sdt / 1000;
      // 待放的猫：左右匀速移动
      if (this.hanging && this.state === 'play') {
        const lo = SWING_LO, hi = SWING_HI;      // 固定摆动范围，与猫的宽度无关
        const sp = FEEL.baseSpeed * speedMult(this.maxHeight);
        this.hangX += this.hangDir * sp * dt;
        if (this.hangX > hi) { this.hangX = hi - (this.hangX - hi); this.hangDir = -1; }
        if (this.hangX < lo) { this.hangX = lo + (lo - this.hangX); this.hangDir = 1; }
        this.hangX = clamp(this.hangX, lo, hi);
      }
      if (!this.hanging && !this.active && this.state === 'play' && this.nextSpawnAt && this.time >= this.nextSpawnAt) {
        this.nextSpawnAt = 0;
        this.spawnHanging(0);
      }
      // 正在下落的猫 2.5 秒还没碰到东西（飞出去了）
      if (this.active && this.time - this.active.dropT > 2500 && this.state === 'play') this.fail(this.active, 'timeout');

      // 失败判定
      for (const c of this.cats) {
        const p = c.body.position;
        if (this.state === 'play' && (p.y > FAIL_Y || p.x < -260 || p.x > W + 260)) { this.fail(c, 'out'); }
      }
      if (this.state === 'play' || this.state === 'failing') this.updateScared(dt);
      if (this.state === 'play') {

        // 稳定检测 → 快照 + 高度
        const allLanded = !this.active;
        let calm = allLanded;
        if (calm) for (const c of this.cats) { if (!c.body.isSleeping && (c.body.speed > 0.15 || Math.abs(c.body.angularVelocity) > 0.005)) { calm = false; break; } }
        this.stableFrames = calm ? this.stableFrames + 1 : 0;
        if (this.stableFrames === 12 && this.cats.length) this.onStable();
      }

      // 镜头
      const top = this.towerTop();
      const lead = Math.max(this.viewH * 0.4, this.hangOffset + 360);
      const target = Math.min(this.camY0, top - lead);
      this.camY += (target - this.camY) * Math.min(1, dtMs / 1000 * 3.2);
      this.bgHeight += (Math.max(0, -top / 100) - this.bgHeight) * Math.min(1, dtMs / 1000 * 2);

      if (this.state === 'failing' && this.time - this.failT > 1100 && !this.failNotified) {
        this.failNotified = true;
        this.emit('failed');
      }
      if (this.state === 'play') this.failNotified = false;
      if (wind && this.state !== 'idle') this.spawnLeaves(dt, wind);
      this.updateFx(dt);
    }

    // ---------------------------------------------------------------- 受惊表情（v1.1）
    resetScared() {
      this.scared = new Set();      // 当前受惊的猫（cat 对象）
      this.scaredOn = false;        // 塔是否处于「受惊」状态
      this.wobbleT = 0; this.calmT = 0; this.reselectT = 0;
      this.testMotionBoost = 0;     // 仅测试用：给所有猫的晃动值加上这个数（不碰物理）
    }
    get scaredCount() { return this.scared ? this.scared.size : 0; }
    updateScared(dt) {
      const SC = FEEL.scared;
      const cand = [];
      let wob = false, calm = true, topY = 0;
      for (const c of this.cats) {
        if (!c.landed || c === this.active) continue;
        if (this.state === 'play' && this.time - c.landT < SC.settleMs) continue;
        const b = c.body;
        let m = b.isSleeping ? 0 : Math.max(Math.abs(b.angularVelocity) / SC.angVel, Math.abs(b.velocity.x) / SC.speedX);
        m += this.testMotionBoost;
        c.motion = m;
        if (m > 1) wob = true;
        if (m > SC.calmRatio) calm = false;
        topY = Math.min(topY, b.position.y);
        cand.push(c);
      }
      if (this.state === 'failing') { wob = true; calm = false; }   // 塔在倒：一定是受惊的
      this.wobbleT = wob ? this.wobbleT + dt : 0;
      this.calmT = calm ? this.calmT + dt : 0;
      if (!this.scaredOn && this.wobbleT > SC.triggerSec) {
        this.scaredOn = true; this.reselectT = 0;
        if (this.state === 'play') CS.audio.play('meow3', { rate: 1.05 });
      }
      if (this.scaredOn && this.calmT >= SC.recoverSec) { this.scaredOn = false; this.scared.clear(); }
      if (!this.scaredOn) return;
      if (wob && this.state === 'play' && this.time - this.lastWobble > 1500) { this.lastWobble = this.time; CS.audio.play('wobble'); }
      // 挑「晃得最厉害 + 最靠上」的 maxCats 只；已经受惊的稍微加分，减少表情跳来跳去
      this.reselectT -= dt;
      if (this.reselectT > 0 && [...this.scared].every(c => this.byId[c.body.id] === c)) return;
      this.reselectT = SC.reselectSec;
      const span = Math.max(1, -topY);
      const rank = (c) => Math.min(c.motion, 3) + SC.topWeight * (-c.body.position.y / span) + (this.scared.has(c) ? 0.25 : 0);
      cand.sort((a, b) => rank(b) - rank(a));
      this.scared = new Set(cand.slice(0, SC.maxCats));
    }

    postStep() {
      for (const c of this.cats) {
        const b = c.body;
        if (b.isSleeping) continue;
        if (!c.landed) {
          if (b.velocity.y > FEEL.maxFall) M.Body.setVelocity(b, { x: b.velocity.x, y: FEEL.maxFall });   // 下落终端速度
        } else if (this.state === 'play') {
          // 只抑制小幅摇晃（真正倾倒时角速度大，不受影响）
          const av = b.angularVelocity;
          if (Math.abs(av) < 0.03) M.Body.setAngularVelocity(b, av * (c.idx < FEEL.newbie.count ? FEEL.newbie.rockDamping : 0.985));
          if (b.speed < 1.2) M.Body.setVelocity(b, { x: b.velocity.x * 0.99, y: b.velocity.y });
        }
      }
    }

    onStable() {
      this.snapshot = this.cats.map(c => ({ type: c.type, skin: c.skin, idx: c.idx, x: c.body.position.x, y: c.body.position.y, angle: c.body.angle }));
      let changed = false;
      for (const c of this.cats) if (c.pendingBonus) { this.bonus += c.pendingBonus; this.perfects++; c.pendingBonus = 0; changed = true; }
      const h = -this.towerTop() / 100;
      if (changed && !(h > this.maxHeight)) this.hud();
      if (h > this.maxHeight) {
        this.maxHeight = h;
        const m = Math.floor(h / 10);
        if (m > this.milestone) {
          this.milestone = m;
          CS.audio.play('milestone');
          const top = this.towerTop();
          this.burst(W / 2, top - 60, 'confetti', 40);
          this.emit('milestone', m * 10);
        }
        this.hud();
      }
    }

    // ---------------------------------------------------------------- fx
    burst(x, y, kind, n) {
      const r = this.fx;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, s = r();
        const p = { kind, x, y, life: 0, max: 0.6 + r() * 0.5, rot: r() * 6, vr: (r() - 0.5) * 8 };
        if (kind === 'dust') { p.vx = Math.cos(a) * (80 + s * 160); p.vy = -Math.abs(Math.sin(a)) * (40 + s * 80); p.size = 10 + s * 16; p.g = 0; }
        else if (kind === 'heart') { p.vx = (r() - 0.5) * 320; p.vy = -200 - s * 300; p.size = 26 + s * 22; p.g = 500; p.max = 1 + r() * 0.4; }
        else if (kind === 'star') { p.vx = Math.cos(a) * (160 + s * 260); p.vy = Math.sin(a) * (160 + s * 260) - 120; p.size = 14 + s * 16; p.g = 300; }
        else { p.vx = (r() - 0.5) * 700; p.vy = -300 - s * 500; p.size = 10 + s * 10; p.g = 700; p.max = 1.6 + r(); p.color = ['#FF9EB5', '#FFC48C', '#9EE6CF', '#9FD4FF', '#C7B8FF', '#FFE27A'][i % 6]; }
        this.particles.push(p);
      }
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    }
    // 风中飘叶：只用 vfx 随机流
    spawnLeaves(dt, wind) {
      const r = this.vfx;
      this.leafT -= dt;
      if (this.leafT > 0) return;
      this.leafT = 0.28 / (0.5 + Math.abs(wind));
      const dir = wind > 0 ? 1 : -1;
      const kinds = ['fx_leaf_green', 'fx_leaf_orange', 'fx_petal_pink'];
      this.particles.push({ kind: 'leaf', img: kinds[Math.floor(r() * 3)], x: dir > 0 ? -40 : W + 40, y: this.camY + 120 + r() * (this.viewH - 300),
        vx: dir * (180 + 260 * Math.abs(wind)) * (0.8 + r() * 0.4), vy: 20 + r() * 40, g: 0, life: 0, max: 4 + r() * 2,
        size: 34 + r() * 22, rot: r() * 6, vr: (r() - 0.5) * 5, ph: r() * 6 });
    }
    text(x, y, s, color, size, delay) { this.texts.push({ x, y, s, color, size, life: -(delay || 0), max: 1.1 }); }
    updateFx(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt; if (p.life > p.max) { this.particles.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.kind === 'dust') { p.vx *= 0.92; p.vy *= 0.92; }
        else if (p.kind === 'leaf') { p.ph += dt * 3; p.y += Math.sin(p.ph) * 40 * dt; if (p.x < -80 || p.x > W + 80) { if (p.life > 0.5) p.life = p.max; } }
      }
      for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life += dt; if (t.life > t.max) this.texts.splice(i, 1); }
      this.shake *= Math.pow(0.0015, dt);
      if (this.shake < 0.2) this.shake = 0;
    }

    // ---------------------------------------------------------------- render
    draw(ctx, S) {
      const H = this.viewH;
      this._S = S;
      ctx.setTransform(S, 0, 0, S, 0, 0);
      const playing = this.state !== 'idle' && this.engine;
      drawBackground(ctx, H, playing ? this.bgHeight : 0, this);
      const r = this.fx;
      const sx = this.shake ? (r() - 0.5) * this.shake : 0, sy = this.shake ? (r() - 0.5) * this.shake : 0;
      ctx.save();
      ctx.translate(sx, -this.camY + sy);
      drawDecor(ctx, this, H);
      drawGround(ctx, this);
      if (playing) {
        // 落点辅助线
        if (this.hanging && this.state === 'play') {
          const hy = this.camY + this.hangOffset, top = this.towerTop();
          const T = A.CAT_TYPES[this.hanging.type];
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.setLineDash([2, 16]); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(this.hangX, hy + T.h / 2 + 10); ctx.lineTo(this.hangX, top - 6); ctx.stroke();
          ctx.restore();
          ctx.fillStyle = 'rgba(80,50,40,0.12)';
          ctx.beginPath(); ctx.ellipse(this.hangX, top - 4, T.w * 0.32, 9, 0, 0, Math.PI * 2); ctx.fill();
        }
        for (const c of this.cats) this.drawCat(ctx, c);
        if (this.hanging) this.drawHanging(ctx);
      } else {
        this.drawMenuCat(ctx);
      }
      drawParticles(ctx, this.particles);
      drawTexts(ctx, this.texts);
      ctx.restore();
    }

    drawCat(ctx, c) {
      const scared = this.scared.has(c);
      const b = c.body, g = A.geom(c.type), sp = A.sprite(c.type, c.skin, scared);
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      const t = (this.time - c.landT) / 1000;
      let sxk = 1, syk = 1;
      if (t >= 0 && t < 0.8) {
        const k = 0.16 * (0.4 + c.impact) * Math.exp(-6 * t) * Math.cos(15 * t);
        syk = 1 - k; sxk = 1 + k * 0.8;
      } else if (!c.landed) { syk = 1.05; sxk = 0.96; }
      if (scared) {
        const ph = this.time / 1000 * 50 + c.idx * 1.7;
        ctx.translate(Math.sin(ph) * 2.4, Math.cos(ph * 1.3) * 1.2);
        ctx.rotate(Math.sin(ph * 0.9) * 0.025);
      }
      if (sxk !== 1 || syk !== 1) { ctx.translate(0, g.bottom); ctx.scale(sxk, syk); ctx.translate(0, -g.bottom); }
      ctx.drawImage(sp.canvas, -g.cx - sp.pad.l, -g.cy - sp.pad.t, sp.canvas.width / sp.S, sp.canvas.height / sp.S);
      if (scared) { ctx.save(); ctx.translate(-g.cx, -g.cy); A.drawSweat(ctx, c.type, g.w, g.h, this.time + c.idx * 300); ctx.restore(); }
      if (c.perfectT && this.time - c.perfectT < 600) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 * (1 - (this.time - c.perfectT) / 600);
        ctx.drawImage(sp.canvas, -g.cx - sp.pad.l, -g.cy - sp.pad.t, sp.canvas.width / sp.S, sp.canvas.height / sp.S);
      }
      ctx.restore();
    }

    drawHanging(ctx) {
      const h = this.hanging, T = A.CAT_TYPES[h.type], sp = A.sprite(h.type, h.skin);
      const y = this.camY + this.hangOffset;
      const age = Math.max(0, (this.time - h.born) / 1000);
      const pop = this.time < h.born ? 0 : Math.min(1, easeOutBack(Math.min(1, age / 0.28)));
      if (pop <= 0) return;
      const bob = Math.sin(this.time / 1000 * 5) * 6;
      // 吊绳 + 小夹子
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(this.hangX, this.camY - 20); ctx.lineTo(this.hangX, y - T.h / 2 + bob - 4); ctx.stroke();
      ctx.fillStyle = '#FF9EB5'; ctx.strokeStyle = '#6B4A3A'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(this.hangX, y - T.h / 2 + bob - 6, 14, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(this.hangX, y + bob);
      ctx.rotate(-this.hangDir * 0.04 + Math.sin(this.time / 1000 * 3) * 0.02);
      ctx.scale(pop, pop);
      if (this.scaredOn) ctx.translate(Math.sin(this.time / 20) * 2, 0);   // 待放的猫只跟着抖，不算进「最多 3 只」
      ctx.drawImage(sp.canvas, -T.w / 2 - sp.pad.l, -T.h / 2 - sp.pad.t, sp.canvas.width / sp.S, sp.canvas.height / sp.S);
      ctx.restore();
    }

    drawMenuCat(ctx) {
      const type = 'orange', T = A.CAT_TYPES[type], sp = A.sprite(type, CS.Save.data.skin);
      const t = this.menuT;
      const breathe = 1 + Math.sin(t * 2.2) * 0.025;
      ctx.save();
      ctx.translate(W / 2, 0);
      ctx.scale(1 / breathe * 1.0 + 0.0, breathe);
      ctx.drawImage(sp.canvas, -T.w / 2 - sp.pad.l, -T.h - sp.pad.t, sp.canvas.width / sp.S, sp.canvas.height / sp.S);
      ctx.restore();
      // Zzz
      ctx.save();
      ctx.font = '40px ' + CS.FONT; ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.5 + i / 3) % 1);
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#8A6A5A'; ctx.lineWidth = 6;
        const x = W / 2 - 40 + k * 70 + Math.sin(k * 6) * 10, y = -T.h - 10 - k * 120;
        ctx.font = (26 + k * 22) + 'px ' + CS.FONT;
        ctx.strokeText('z', x, y); ctx.fillText('z', x, y);
      }
      ctx.restore();
    }

    // 结算/分享用：把快照里的猫塔画进指定矩形
    // 按猫塔实际包围盒裁切：矮塔会被放大、居中，不再缩在空白面板底部（QA#7）
    renderTower(ctx, snap, x, y, w, h, maxScale) {
      let minX = 1e9, maxX = -1e9, minY = 0;
      for (const s of snap) {
        const T = A.CAT_TYPES[s.type], r = Math.hypot(T.w, T.h) / 2 + 30;   // +30 给配件留空间
        minX = Math.min(minX, s.x - r); maxX = Math.max(maxX, s.x + r); minY = Math.min(minY, s.y - r);
      }
      if (!snap.length) { minX = PLAT.x - PLAT.w / 2; maxX = PLAT.x + PLAT.w / 2; minY = -200; }
      const maxY = 50;                       // 只露出底座上沿的软垫，不画整个木箱
      minX = Math.min(minX, PLAT.x - 160); maxX = Math.max(maxX, PLAT.x + 160);
      const k = Math.min(w / (maxX - minX), h / (maxY - minY), maxScale || 1.1);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.translate(x + w / 2 - (minX + maxX) / 2 * k, y + h / 2 - (minY + maxY) / 2 * k);
      ctx.scale(k, k);
      drawPlatform(ctx);
      for (const s of snap) {
        const g = A.geom(s.type), sp = A.sprite(s.type, s.skin);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
        ctx.drawImage(sp.canvas, -g.cx - sp.pad.l, -g.cy - sp.pad.t, sp.canvas.width / sp.S, sp.canvas.height / sp.S);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- 绘制辅助
  function makeDecor() {
    const r = CS.mulberry32(20261011);
    const clouds = [];
    for (let i = 0; i < 40; i++) clouds.push({ x: r() * 900 - 75, y: -300 - i * 420 - r() * 200, s: 0.6 + r() * 0.7, v: 6 + r() * 14, k: Math.floor(r() * 3) });
    const flowers = [];
    for (let i = 0; i < 18; i++) flowers.push({ x: r() * 750, y: GROUND_TOP + 40 + r() * 220, c: ['#FF9EB5', '#FFE27A', '#FFFFFF', '#C7B8FF'][i % 4], s: 0.7 + r() * 0.6 });
    return { clouds, flowers, cloudSprites: [0, 1, 2].map(cloudSprite) };
  }
  function cloudSprite(k) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.92)';
    const blobs = [[[90, 100, 55], [150, 75, 65], [215, 95, 55], [160, 115, 50]], [[80, 105, 45], [135, 85, 55], [190, 80, 50], [240, 105, 42], [160, 118, 45]], [[110, 100, 50], [170, 80, 58], [220, 108, 40]]][k];
    for (const b of blobs) { g.beginPath(); g.arc(b[0], b[1], b[2], 0, Math.PI * 2); g.fill(); }
    g.fillRect(80, 100, 170, 40);
    return c;
  }

  let maskCanvas = null;
  function drawCover(ctx, img, H) {
    // 按高度铺满，左右居中裁切
    const k = H / img.height, w = img.width * k;
    ctx.drawImage(img, (W - w) / 2, 0, w, H);
  }
  function drawBackground(ctx, H, hM, game) {
    const segs = A.BG_SEGMENTS;
    let i = 0;
    for (let j = 0; j < segs.length; j++) if (hM >= segs[j].from) i = j;
    const cur = segs[i], next = segs[i + 1];
    const img = A.images['bg_' + cur.id];
    drawCover(ctx, img, H);
    if (next) {
      const span = 3;
      const t = clamp((hM - (next.from - span)) / span, 0, 1);
      if (t > 0) {
        // 纵向渐变过渡：新的一段从屏幕上方往下「漫」下来
        const S = game._S;
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        if (!maskCanvas) maskCanvas = document.createElement('canvas');
        if (maskCanvas.width !== cw || maskCanvas.height !== ch) { maskCanvas.width = cw; maskCanvas.height = ch; }
        const m = maskCanvas.getContext('2d');
        m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, cw, ch);
        m.setTransform(S, 0, 0, S, 0, 0);
        drawCover(m, A.images['bg_' + next.id], H);
        m.globalCompositeOperation = 'destination-in';
        const f = 0.45, edge = t * (1 + f);
        const gr = m.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(0,0,0,' + clamp(edge / f, 0, 1) + ')');
        gr.addColorStop(clamp(edge - f, 0, 1), 'rgba(0,0,0,1)');
        gr.addColorStop(clamp(edge, 0.0001, 1), 'rgba(0,0,0,0)');
        if (edge >= 1) gr.addColorStop(1, 'rgba(0,0,0,' + clamp((edge - 1) / f, 0, 1) + ')');
        m.fillStyle = gr; m.fillRect(0, 0, W, H);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(maskCanvas, 0, 0); ctx.restore();
      }
    }
  }

  function drawDecor(ctx, game, H) {
    // 视差小云朵：在星空/太空段淡出
    const fade = clamp(1 - (game.bgHeight - 30) / 10, 0, 1);
    if (fade <= 0) return;
    const par = 0.55;
    ctx.save();
    ctx.globalAlpha = 0.55 * fade;
    const camY = game.camY;
    for (const c of game.decor.clouds) {
      const sy = c.y - camY * (1 - par);         // 世界坐标里的 y（相对镜头的视差）
      const top = camY - 200, bot = camY + H + 100;
      if (sy < top || sy > bot) continue;
      const img = A.images['game_cloud_' + (c.k + 1)] || game.decor.cloudSprites[c.k];
      const x = ((c.x + game.menuT * c.v) % 950) - 100;
      ctx.drawImage(img, x, sy, 320 * c.s, 160 * c.s);
    }
    ctx.restore();
  }

  function drawPlatform(ctx) {
    const img = A.images.game_platform;
    if (img) { ctx.drawImage(img, PLAT.x - PLAT.w / 2, 0, PLAT.w, PLAT.w * img.height / img.width); return; }
    const x = PLAT.x - PLAT.w / 2, w = PLAT.w;
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    ctx.save();
    ctx.lineWidth = 5; ctx.strokeStyle = '#6B4A3A';
    // 木箱
    const wood = ctx.createLinearGradient(0, 20, 0, PLAT.h + 20); wood.addColorStop(0, '#E9B47D'); wood.addColorStop(1, '#C98A55');
    ctx.fillStyle = wood; rr(x + 20, 26, w - 40, PLAT.h - 6, 18); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(107,74,58,0.35)'; ctx.lineWidth = 4;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 40, 26 + i * 28); ctx.lineTo(x + w - 40, 26 + i * 28); ctx.stroke(); }
    // 软垫
    const cush = ctx.createLinearGradient(0, -2, 0, 40); cush.addColorStop(0, '#FFC2D1'); cush.addColorStop(1, '#FF9EB5');
    ctx.fillStyle = cush; ctx.strokeStyle = '#6B4A3A'; ctx.lineWidth = 5;
    rr(x, -2, w, 40, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(x + 24, 4, w - 48, 9, 5); ctx.fill();
    // 爪印
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const paw = (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, 13, 10, 0, 0, 7); ctx.fill(); for (const [dx, dy] of [[-14, -14], [-5, -20], [5, -20], [14, -14]]) { ctx.beginPath(); ctx.arc(px + dx, py + dy, 5, 0, 7); ctx.fill(); } };
    paw(PLAT.x - 100, 96); paw(PLAT.x + 100, 96);
    ctx.restore();
  }

  function drawGround(ctx, game) {
    const img = A.images.game_ground;
    if (img) ctx.drawImage(img, 0, GROUND_TOP - 40, W, W * img.height / img.width);
    else {
      ctx.save();
      const g = ctx.createLinearGradient(0, GROUND_TOP - 20, 0, GROUND_TOP + 500);
      g.addColorStop(0, '#9BE08F'); g.addColorStop(0.25, '#7ACB78'); g.addColorStop(1, '#5DAA66');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-50, GROUND_TOP + 900);
      ctx.lineTo(-50, GROUND_TOP);
      for (let x = -50; x <= W + 50; x += 50) ctx.quadraticCurveTo(x + 25, GROUND_TOP - 22, x + 50, GROUND_TOP);
      ctx.lineTo(W + 50, GROUND_TOP + 900); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4E9A57'; ctx.lineWidth = 4; ctx.stroke();
      for (const f of game.decor.flowers) {
        ctx.fillStyle = f.c;
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 8 * f.s, f.y + Math.sin(a) * 8 * f.s, 6 * f.s, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#FFB13D'; ctx.beginPath(); ctx.arc(f.x, f.y, 5 * f.s, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    // 底座投影
    ctx.fillStyle = 'rgba(40,80,40,0.22)';
    ctx.beginPath(); ctx.ellipse(PLAT.x, PLAT.h + 4, PLAT.w * 0.52, 18, 0, 0, 7); ctx.fill();
    drawPlatform(ctx);
  }

  function star(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
  }
  function drawParticles(ctx, ps) {
    const heart = A.images.game_heart || A.images.ui_icon_heart;
    const starImg = A.images.game_star;
    for (const p of ps) {
      const k = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.translate(p.x, p.y);
      if (p.kind === 'leaf') {
        ctx.globalAlpha = Math.min(1, p.life / 0.3) * 0.9;
        ctx.rotate(p.rot); ctx.scale(1, 0.75 + Math.sin(p.ph) * 0.25);
        const im = A.images['ui_' + p.img];
        if (im) ctx.drawImage(im, -p.size / 2, -p.size / 2, p.size, p.size * im.height / im.width);
        else { ctx.fillStyle = p.img === 'fx_petal_pink' ? '#FFB3C8' : p.img === 'fx_leaf_orange' ? '#FFB060' : '#8FD48A'; ctx.beginPath(); ctx.ellipse(0, 0, p.size / 2, p.size / 4, 0, 0, 7); ctx.fill(); }
      } else if (p.kind === 'dust') { ctx.globalAlpha *= 0.8; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, p.size * (0.6 + k), 0, 7); ctx.fill(); }
      else if (p.kind === 'heart') {
        const s = p.size * (k < 0.15 ? k / 0.15 : 1);
        ctx.rotate(Math.sin(p.rot) * 0.3);
        if (heart) ctx.drawImage(heart, -s / 2, -s / 2, s, s * heart.height / heart.width);
        else { ctx.fillStyle = '#FF6F91'; ctx.font = s + 'px sans-serif'; ctx.fillText('♥', -s / 2, s / 2); }
      } else if (p.kind === 'star') {
        ctx.rotate(p.rot);
        if (starImg) ctx.drawImage(starImg, -p.size / 2, -p.size / 2, p.size, p.size);
        else { ctx.fillStyle = '#FFE27A'; ctx.strokeStyle = '#E8A93A'; ctx.lineWidth = 2; star(ctx, p.size / 2); ctx.fill(); ctx.stroke(); }
      } else { ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
      ctx.restore();
    }
  }
  function drawTexts(ctx, ts) {
    for (const t of ts) {
      if (t.life < 0) continue;
      const k = t.life / t.max;
      const sc = k < 0.18 ? easeOutBack(k / 0.18) : 1;
      ctx.save();
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.translate(t.x, t.y - k * 70);
      ctx.scale(sc, sc);
      ctx.font = t.size + 'px ' + CS.FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = t.size * 0.2; ctx.strokeStyle = '#FFFFFF';
      ctx.strokeText(t.s, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.s, 0, 0);
      ctx.restore();
    }
  }

  CS.Game = Game;
  CS.drawPlatform = drawPlatform;
  CS.GAME_W = W;
})();
