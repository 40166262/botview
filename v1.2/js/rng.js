/* 可设种子的伪随机（mulberry32）+ 挑战码编解码 + 猫咪出场序列。gameplay 里禁止直接用 Math.random。 */
(function () {
  const CS = window.CS;

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  // 挑战码：种子的 36 进制大写（最多 7 位）
  function seedToCode(seed) { return (seed >>> 0).toString(36).toUpperCase(); }
  function codeToSeed(code) {
    if (code == null) return null;
    const s = String(code).trim();
    if (!s) return null;
    if (/^[0-9a-z]{1,7}$/i.test(s)) { const v = parseInt(s, 36); if (isFinite(v)) return v >>> 0; }
    return hashString(s);
  }

  // 新一局的种子：来源于设备熵（不影响可复现性——复现靠把种子传给好友）
  function newSeed() {
    try {
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      return (a[0] % 78364164096) >>> 0 || 1; // 保证挑战码不超过 7 位
    } catch (e) {
      return (hashString(String(Date.now()) + String(performance.now())) >>> 0) || 1;
    }
  }

  const WEIGHTS = { orange: 1.0, white: 1.0, black: 0.8, loaf: 0.9, ball: 0.7, long: 0.55 };

  // 完全由 seed 决定的猫咪序列（每只猫固定消耗 2 个随机数，保证可复现）
  class CatSequence {
    constructor(seed) {
      this.seed = seed >>> 0;
      this.rng = mulberry32(this.seed);
      this.windRng = mulberry32((this.seed ^ 0x9E3779B9) >>> 0);
      this.list = [];
      this.winds = [];
    }
    poolFor(i) {
      const sp = CS.CONFIG.spawn;
      if (i < sp.firstEasy) return ['orange', 'white', 'loaf'];
      const p = ['orange', 'white', 'black', 'loaf'];
      if (i >= sp.ballFromIndex) p.push('ball');
      if (i >= sp.longFromIndex) p.push('long');
      return p;
    }
    _gen() {
      const i = this.list.length;
      const r1 = this.rng(), r2 = this.rng();
      let pool = this.poolFor(i);
      const a = this.list[i - 1], b = this.list[i - 2];
      if (a && a === b) pool = pool.filter(t => t !== a); // 不能连续 3 只同一种
      let total = 0; for (const t of pool) total += WEIGHTS[t];
      let x = r1 * total, pick = pool[pool.length - 1];
      for (const t of pool) { x -= WEIGHTS[t]; if (x <= 0) { pick = t; break; } }
      this.list.push(pick);
      this.winds.push(r2 * 2 - 1);
    }
    get(i) { while (this.list.length <= i) this._gen(); return this.list[i]; }
    wind(i) { this.get(i); return this.winds[i]; }
  }

  Object.assign(CS, { mulberry32, hashString, seedToCode, codeToSeed, newSeed, CatSequence });
})();
