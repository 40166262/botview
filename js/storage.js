/* 本地存档（DESIGN.md §6：key = catstack_save_v1）。localStorage 不可用时退化为内存存档，不会报错。 */
(function () {
  const CS = window.CS;
  const KEY = 'catstack_save_v1';
  const DEFAULTS = () => ({
    v: 1,
    best: 0,            // 最高得分
    bestHeight: 0,      // 最高高度（米）
    coins: 0,
    skinsOwned: ['default'],
    skin: 'default',
    seenCats: [],
    settings: { music: true, sfx: true, vibrate: true },
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

  const Save = {
    load() { data = merge(DEFAULTS(), read()); if (data.skinsOwned.indexOf('default') < 0) data.skinsOwned.unshift('default'); return data; },
    get data() { return data || Save.load(); },
    commit() {
      const s = JSON.stringify(data);
      try { window.localStorage.setItem(KEY, s); } catch (e) { mem = s; }
    },
    today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  };
  CS.Save = Save;
})();
