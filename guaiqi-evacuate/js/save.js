/** localStorage persistence — meta + stages + inventory + gallery + progression */
const KEY = 'glow-survivor-v4';

const defaults = () => ({
  bestTime: 0,
  bestKills: 0,
  maxComboBest: 0,
  bestEndlessTime: 0,
  bestEndlessKills: 0,
  coins: 0,
  diamonds: 0,
  sound: true,
  dailyClaimDay: '',
  stagesCleared: {},
  unlockedChars: ['grin'],
  selectedChar: 'grin',
  equipped: [],
  inventory: {},
  shards: {},
  gallery: { char_grin: true, enemy_slime: true },
  pity: 0,
  gachaCount: 0,
  freeGachaDay: '',
  galleryMilestone10: false,
  dailyQuestDay: '',
  dailyQuest: null,
  // progression
  playerLevel: 1,
  playerXp: 0,
  charLevels: { grin: 1 },
  charXp: {},
  gear: { weapon: null, hat: null, clothes: null, shoes: null },
  gearLevels: {},
  materials: { scrap: 0, battery: 0, tape: 0, chip: 0 },
  _gearBootstrapped: false,
  failStreak: {},
  achievements: {},
  achievementsSeeded: false,
});

function migrateFacility(save) {
  const charMap = { firefly: 'grin', moth: 'medic', pebble: 'janitor', spark: 'intern' };
  if (save.selectedChar && charMap[save.selectedChar]) save.selectedChar = charMap[save.selectedChar];
  if (Array.isArray(save.unlockedChars)) {
    save.unlockedChars = [...new Set(save.unlockedChars.map((c) => charMap[c] || c))];
  }
  if (save.charLevels) {
    for (const [k, v] of Object.entries(charMap)) {
      if (save.charLevels[k] != null) {
        save.charLevels[v] = Math.max(save.charLevels[v] || 1, save.charLevels[k]);
        delete save.charLevels[k];
      }
    }
  }
  if (save.gallery) {
    for (const [k, v] of Object.entries({ char_firefly: 'char_grin', char_moth: 'char_medic', char_pebble: 'char_janitor', char_spark: 'char_intern' })) {
      if (save.gallery[k]) { save.gallery[v] = true; delete save.gallery[k]; }
    }
  }
  if (save.materials) {
    const m = save.materials;
    if (m.moss != null) { m.scrap = (m.scrap || 0) + (m.moss || 0); delete m.moss; }
    if (m.core != null) { m.battery = (m.battery || 0) + (m.core || 0); delete m.core; }
    if (m.moon != null) { m.tape = (m.tape || 0) + (m.moon || 0); delete m.moon; }
    if (m.dark != null) { m.chip = (m.chip || 0) + (m.dark || 0); delete m.dark; }
  }
  return save;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const old = localStorage.getItem('glow-survivor-v3') || localStorage.getItem('glow-survivor-v2') || localStorage.getItem('glow-survivor-v1');
      if (old) {
        const parsed = JSON.parse(old);
        return migrateFacility({ ...defaults(), ...parsed });
      }
      return defaults();
    }
    return migrateFacility({ ...defaults(), ...JSON.parse(raw) });
  } catch {
    return defaults();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[save] write failed', e);
  }
}

export function updateBest(save, timeSec, kills, maxCombo = 0, endless = false) {
  let changed = false;
  if (endless) {
    if (timeSec > (save.bestEndlessTime || 0)) { save.bestEndlessTime = timeSec; changed = true; }
    if (kills > (save.bestEndlessKills || 0)) { save.bestEndlessKills = kills; changed = true; }
  } else {
    if (timeSec > save.bestTime) { save.bestTime = timeSec; changed = true; }
    if (kills > save.bestKills) { save.bestKills = kills; changed = true; }
  }
  if (maxCombo > (save.maxComboBest || 0)) { save.maxComboBest = maxCombo; changed = true; }
  if (changed) writeSave(save);
  return changed;
}

export function addCoins(save, n) {
  save.coins = (save.coins || 0) + n;
  writeSave(save);
}

export function addDiamonds(save, n) {
  save.diamonds = (save.diamonds || 0) + n;
  writeSave(save);
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** XP needed to go from level L to L+1 */
export function xpToNextPlayerLevel(level) {
  return Math.floor(35 + level * 18 + Math.pow(level, 1.35) * 4);
}

/**
 * Add run XP; returns { leveled: bool, newLevel, rewards[] }
 */
export function addPlayerXp(save, amount) {
  if (!save.playerLevel) save.playerLevel = 1;
  if (!save.playerXp) save.playerXp = 0;
  save.playerXp += amount;
  const rewards = [];
  let leveled = false;
  while (save.playerLevel < 60) {
    const need = xpToNextPlayerLevel(save.playerLevel);
    if (save.playerXp < need) break;
    save.playerXp -= need;
    save.playerLevel += 1;
    leveled = true;
    const coins = 10 + save.playerLevel * 2;
    save.coins = (save.coins || 0) + coins;
    rewards.push({ type: 'coins', n: coins });
    if (save.playerLevel % 5 === 0) {
      save.diamonds = (save.diamonds || 0) + 3;
      rewards.push({ type: 'diamonds', n: 3 });
    }
  }
  return { leveled, newLevel: save.playerLevel, rewards };
}

export function addCharXp(save, charId, amount) {
  if (!save.charLevels) save.charLevels = {};
  if (!save.charXp) save.charXp = {};
  const lv = save.charLevels[charId] || 1;
  if (lv >= 30) return { leveled: false, level: lv };
  save.charXp[charId] = (save.charXp[charId] || 0) + amount;
  let leveled = false;
  let cur = lv;
  while (cur < 30) {
    const need = 20 + cur * 12;
    if ((save.charXp[charId] || 0) < need) break;
    save.charXp[charId] -= need;
    cur += 1;
    leveled = true;
  }
  save.charLevels[charId] = cur;
  return { leveled, level: cur };
}

export function addMaterials(save, stageNum, cleared) {
  if (!save.materials) save.materials = { scrap: 0, battery: 0, tape: 0, chip: 0 };
  const m = save.materials;
  // migrate old fantasy mats
  if (m.moss != null) { m.scrap = (m.scrap || 0) + (m.moss || 0); delete m.moss; }
  if (m.core != null) { m.battery = (m.battery || 0) + (m.core || 0); delete m.core; }
  if (m.moon != null) { m.tape = (m.tape || 0) + (m.moon || 0); delete m.moon; }
  if (m.dark != null) { m.chip = (m.chip || 0) + (m.dark || 0); delete m.dark; }
  const n = stageNum || 1;
  m.scrap = (m.scrap || 0) + (cleared ? 1 + Math.floor(Math.random() * 3) : (Math.random() < 0.35 ? 1 : 0));
  if (n > 20 && cleared) m.battery = (m.battery || 0) + (Math.random() < 0.55 ? 1 : 0);
  if (n > 40 && cleared) m.tape = (m.tape || 0) + (Math.random() < 0.35 ? 1 : 0);
  if (n > 70 && cleared) m.chip = (m.chip || 0) + (Math.random() < 0.3 ? 1 : 0);
}

/** Gear upgrade cost table */
export function gearUpgradeCost(level) {
  const table = [
    null,
    { coins: 40, mat: 'scrap', n: 2 },
    { coins: 80, mat: 'scrap', n: 4 },
    { coins: 140, mat: 'battery', n: 2 },
    { coins: 220, mat: 'battery', n: 4 },
    { coins: 320, mat: 'tape', n: 2 },
    { coins: 450, mat: 'tape', n: 3 },
    { coins: 600, mat: 'chip', n: 2 },
    { coins: 800, mat: 'chip', n: 3 },
    { coins: 1100, mat: 'chip', n: 5 },
  ];
  return table[level] || null;
}

export function gearEffectMul(level) {
  const muls = [1, 1, 1.08, 1.16, 1.25, 1.35, 1.46, 1.58, 1.72, 1.88, 2.05];
  return muls[Math.min(10, level || 1)] || 1;
}

export function tryUpgradeGear(save, itemId) {
  if (!save.gearLevels) save.gearLevels = {};
  if (!save.materials) save.materials = { scrap: 0, battery: 0, tape: 0, chip: 0 };
  const lv = save.gearLevels[itemId] || 1;
  if (lv >= 10) return { ok: false, reason: '已满级' };
  const cost = gearUpgradeCost(lv);
  if (!cost) return { ok: false, reason: '无法强化' };
  if ((save.coins || 0) < cost.coins) return { ok: false, reason: '金币不足' };
  if ((save.materials[cost.mat] || 0) < cost.n) return { ok: false, reason: '材料不足' };
  save.coins -= cost.coins;
  save.materials[cost.mat] -= cost.n;
  save.gearLevels[itemId] = lv + 1;
  return { ok: true, level: lv + 1 };
}
