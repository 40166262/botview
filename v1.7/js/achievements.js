/* v1.7 成就（DESIGN.md §16 定稿）：条件判断、奖励（只发一次）、本地存档、解锁横幅、TapTap 平台同步、徽章绘制。
   未解锁的灰色徽章由代码生成（去饱和 + 压暗），不依赖 *_locked.png。 */
(function () {
  const CS = window.CS;
  const defs = () => CS.CONFIG.achievements || [];
  const byId = (id) => defs().find(d => d.id === id);
  const save = () => CS.Save.data;
  const P = () => CS.Platform;
  const incTotal = (id) => ((CS.CONFIG.platform || {}).incremental || {})[id] || 0;

  // ---------------------------------------------------------------- 条件
  function ownedSkinCount() {
    const A = CS.Assets, sd = save();
    return sd.skinsOwned.filter(id => id !== 'none' && id !== 'default' && A.SKIN_BY_ID[id] && A.SKIN_BY_ID[id].price > 0).length;
  }
  function seenCatCount() { const sd = save(); return CS.Assets.CAT_ORDER.filter(id => sd.seenCats.indexOf(id) >= 0).length; }
  // ctx：roundHeight（本局高度/历史最高）、combo（当前连续完美）、livePerfects（本局已入账但还没写进 stats 的完美数）、
  //      windCats（起风后放稳的猫数）、roundFinished、challengeWin
  function met(d, ctx) {
    const sd = save();
    switch (d.id) {
      case 'first_stack': return !!ctx.roundFinished || sd.stats.rounds >= 1;
      case 'perfect3': return (ctx.combo || 0) >= d.combo;
      case 'perfect100': return sd.stats.perfects + (ctx.livePerfects || 0) >= d.total;
      case 'windy': return (ctx.windCats || 0) >= d.windCats;
      case 'meet_all': return seenCatCount() >= d.cats;
      case 'dress_up': return ownedSkinCount() >= d.skins;
      case 'challenger': return !!ctx.challengeWin;
      default: return d.height ? Math.max(ctx.roundHeight || 0, 0) >= d.height : false;
    }
  }
  // 图鉴里显示的进度
  function progress(id) {
    const d = byId(id), sd = save(); if (!d) return null;
    if (d.height) return { cur: Math.min(sd.bestHeight, d.height), max: d.height, unit: '米' };
    if (d.id === 'perfect100') return { cur: Math.min(sd.stats.perfects, d.total), max: d.total, unit: '次' };
    if (d.id === 'meet_all') return { cur: seenCatCount(), max: d.cats, unit: '种' };
    if (d.id === 'dress_up') return { cur: Math.min(ownedSkinCount(), d.skins), max: d.skins, unit: '件' };
    if (d.id === 'first_stack') return { cur: Math.min(sd.stats.rounds, 1), max: 1, unit: '局' };
    return null;
  }

  // ---------------------------------------------------------------- 解锁 / 奖励
  const listeners = [];
  const Ach = {
    get defs() { return defs(); },
    byId, progress, met,
    isUnlocked: (id) => !!save().achievements[id],
    get unlockedCount() { return defs().filter(d => save().achievements[d.id]).length; },
    paid: 0,                                      // 本次启动累计发出的成就金币（测试/排查用）
    onUnlock(fn) { listeners.push(fn); },
    // 解锁：只第一次生效（发金币、存档、横幅、平台同步）；返回是否新解锁
    unlock(id, opts) {
      const d = byId(id), sd = save();
      if (!d || sd.achievements[id]) return false;
      sd.achievements[id] = Date.now();
      sd.coins += d.reward; Ach.paid += d.reward;
      CS.Save.commit();
      if (!incTotal(id)) Ach.syncUnlock(id);
      listeners.forEach(fn => { try { fn(d, opts || {}); } catch (e) { /* UI 出错也不影响存档 */ } });
      return true;
    },
    // 按上下文检查所有条件；返回新解锁的 id
    check(ctx) {
      const out = [];
      for (const d of defs()) if (!save().achievements[d.id] && met(d, ctx || {})) { if (Ach.unlock(d.id, ctx && ctx.opts)) out.push(d.id); }
      return out;
    },
    // 老存档：按已有的最高高度 / 累计完美 / 见过的猫 / 已有配件 / 已玩局数补发（DESIGN.md §16）
    retro() { return Ach.check({ roundHeight: save().bestHeight, opts: { retro: true } }); },

    // ---- 平台同步（失败不标记，下次启动再试；任何情况都不拦游戏）
    syncUnlock(id) {
      const tag = 'unlock:' + id, sd = save();
      if (sd.achSent.indexOf(tag) >= 0) return Promise.resolve({ ok: true, cached: true });
      return P().unlockAchievement(id).then((r) => { if (r.ok && sd.achSent.indexOf(tag) < 0) { sd.achSent.push(tag); CS.Save.commit(); } return r; });
    },
    // 启动时：把本地已解锁、还没同步过的补发给平台；分步成就第一次先把历史累计送上去
    syncAll() {
      const sd = save(), jobs = [];
      for (const d of defs()) if (sd.achievements[d.id] && !incTotal(d.id)) jobs.push(Ach.syncUnlock(d.id));
      jobs.push(Ach.seedIncremental());
      return Promise.all(jobs);
    },
    seedIncremental() {
      const sd = save(), jobs = [];
      Object.keys((CS.CONFIG.platform || {}).incremental || {}).forEach((id) => {
        const tag = 'seed:' + id;
        if (sd.achSent.indexOf(tag) >= 0) return;
        const n = Math.min(id === 'perfect100' ? sd.stats.perfects : 0, incTotal(id));
        if (n <= 0) return;
        jobs.push(P().incrementAchievement(id, n).then((r) => { if (r.ok) { sd.achSent.push(tag); CS.Save.commit(); } return r; }));
      });
      return Promise.all(jobs);
    },
    // 一局结束：平台分步成就累加本局完美数（还没 seed 过的话，seed 已经包含这一局）
    roundToPlatform(roundPerfects) {
      const sd = save();
      if (sd.achSent.indexOf('seed:perfect100') < 0) return Ach.seedIncremental();
      return P().incrementAchievement('perfect100', roundPerfects);
    },

    // ---------------------------------------------------------------- 徽章
    _cache: {},
    // 返回徽章画布：有图用图，没有就画一个；locked = 代码生成的灰色版
    badge(id, size, locked) {
      const key = id + '|' + size + '|' + (locked ? 1 : 0);
      const A = CS.Assets, img = A.images['badge_' + id];
      if (this._cache[key] && (this._cache[key].__img === !!img)) return this._cache[key];
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d', locked ? { willReadFrequently: true } : undefined); g.imageSmoothingQuality = 'high';
      if (img) g.drawImage(img, 0, 0, size, size); else drawFallbackBadge(g, size, byId(id));
      if (locked) greyOut(g, size);
      c.__img = !!img;
      this._cache[key] = c;
      return c;
    },
    get badgeSource() { const A = CS.Assets, o = {}; defs().forEach(d => { o[d.id] = A.images['badge_' + d.id] ? (A.images['badge_' + d.id].__file || 'file') : 'drawn'; }); return o; }
  };
  function greyOut(g, size) {
    try {
      const im = g.getImageData(0, 0, size, size), p = im.data;
      for (let i = 0; i < p.length; i += 4) {
        const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        const v = l * 0.72 + 30;                  // 去饱和 + 压暗（抬一点底，免得一团黑）
        p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = p[i + 3] * 0.85;
      }
      g.putImageData(im, 0, 0);
    } catch (e) {                                // 画布被污染等极端情况：退化成半透明灰罩
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(150,150,150,0.75)'; g.fillRect(0, 0, size, size); g.globalCompositeOperation = 'source-over';
    }
  }
  function drawFallbackBadge(g, s, d) {
    const r = s / 2;
    const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#FFD98A'); gr.addColorStop(1, '#FF9E4A');
    g.beginPath(); g.arc(r, r, r * 0.92, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    g.lineWidth = s * 0.05; g.strokeStyle = '#6B4A3A'; g.stroke();
    g.beginPath(); g.arc(r, r, r * 0.72, 0, Math.PI * 2); g.lineWidth = s * 0.025; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
    g.fillStyle = '#6B4A3A'; g.font = Math.round(s * 0.34) + 'px "ZCOOL KuaiLe", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(d ? d.name.charAt(0) : '?', r, r * 1.04);
  }
  CS.Achievements = Ach;
})();
