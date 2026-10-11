/* 本地存档（DESIGN.md §6：key = catstack_save_v1）。localStorage 不可用时退化为内存存档，不会报错。 */
(function () {
  const CS = window.CS;
  const KEY = 'catstack_save_v1';
  const DEFAULTS = () => ({
    v: 1,
    best: 0,            // 最高得分
    bestHeight: 0,      // 最高高度（米）
    coins: 0,
    skinsOwned: ['none'],
    skin: 'none',       // 'none' = 不戴配件
    migrated: [],       // 做过的一次性存档迁移（例如 v1.4 围巾退款），防止重复执行
    seenCats: [],
    settings: { music: true, sfx: true, vibrate: true },
    refunded: 0,        // 刚退款、还没提示玩家的金币
    lastDaily: '',      // 上次领取每日首局奖励的日期 YYYY-MM-DD
    stats: { rounds: 0, cats: 0, perfects: 0 }
  });

  let mem = null, data = null;

  function read() {
    try { const s = window.localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
    catch (e) { return mem ? JSON.parse(mem) : null; }
  }
  function merge(def, src) {
    if (!src || typeof src !== 'object') return def;
    for (const k of Object.keys(def)) {
      if (!(k in src)) continue;
      const dv = def[k], sv = src[k];
      if (Array.isArray(dv)) { if (Array.isArray(sv)) def[k] = sv.slice(); }
      else if (dv && typeof dv === 'object') def[k] = merge(dv, sv);
      else if (typeof sv === typeof dv) def[k] = sv;
    }
    return def;
  }

  // ---- 存档迁移 / 清洗（v1.4）
  const REMOVED_SKINS = { scarf: 50 };          // 已下架的配件 → 退款金币（只退一次）
  function migrate(d) {
    let changed = false;
    if (!Number.isFinite(d.coins) || d.coins < 0) { d.coins = Math.max(0, Math.floor(+d.coins) || 0); changed = true; }
    const n0 = d.skinsOwned.length;
    d.skinsOwned = d.skinsOwned.filter((x, i, a) => typeof x === 'string' && x !== 'default' && a.indexOf(x) === i);   // 'default' 是旧版的「不戴」
    if (d.skinsOwned.length !== n0) changed = true;
    Object.keys(REMOVED_SKINS).forEach((id) => {
      const tag = 'removed_' + id + '_v14';
      if (d.migrated.indexOf(tag) >= 0) return;
      const i = d.skinsOwned.indexOf(id);
      if (i >= 0) { d.skinsOwned.splice(i, 1); d.coins += REMOVED_SKINS[id]; d.refunded = (d.refunded || 0) + REMOVED_SKINS[id]; }
      if (d.skin === id) d.skin = 'none';
      d.migrated.push(tag); changed = true;
    });
    // 已下架的配件就算以后又被写回存档，也不能再戴（但不会再退款）
    Object.keys(REMOVED_SKINS).forEach((id) => { const i = d.skinsOwned.indexOf(id); if (i >= 0) { d.skinsOwned.splice(i, 1); changed = true; } if (d.skin === id) { d.skin = 'none'; changed = true; } });
    // 旧版本默认值 'default' / 任何不认识的 id → 'none'（不戴配件），绝不报错
    const valid = CS.Assets && CS.Assets.SKIN_BY_ID;
    if (d.skin === 'default' || typeof d.skin !== 'string' || (valid && !valid[d.skin])) { d.skin = 'none'; changed = true; }
    if (d.skinsOwned.indexOf('none') < 0) { d.skinsOwned.unshift('none'); changed = true; }
    return changed;
  }

  const Save = {
    load() {
      data = merge(DEFAULTS(), read());
      if (!Array.isArray(data.migrated)) data.migrated = [];
      let changed = false;
      try { changed = migrate(data); } catch (e) { data.skin = 'none'; }
      if (changed) Save.commit();
      return data;
    },
    // 这次启动迁移时退了多少金币（main.js 用来提示一次）
    takeRefund() { const n = (data && data.refunded) || 0; if (n) { data.refunded = 0; Save.commit(); } return n; },
    get data() { return data || Save.load(); },
    commit() {
      const s = JSON.stringify(data);
      try { window.localStorage.setItem(KEY, s); } catch (e) { mem = s; }
    },
    today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  };
  CS.Save = Save;
})();
