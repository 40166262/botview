/**
 * Stage 1–100 + endless. Theme cycles office / ward / basement.
 * Unlock: clear previous OR player-level gates on milestones.
 */

const THEME_META = {
  office: {
    theme: 'office',
    short: '办公',
    namePrefix: '废墟办公区',
    bgTint: [0.22, 0.20, 0.16],
  },
  ward: {
    theme: 'ward',
    short: '病房',
    namePrefix: '废弃病房廊',
    bgTint: [0.16, 0.18, 0.20],
  },
  basement: {
    theme: 'basement',
    short: '机房',
    namePrefix: '地下机房',
    bgTint: [0.10, 0.12, 0.14],
  },
};

function themeFor(n) {
  const m = n % 3;
  if (m === 1) return THEME_META.office;
  if (m === 2) return THEME_META.ward;
  return THEME_META.basement;
}

function difficultyTag(n) {
  if (n <= 10) return '简单';
  if (n <= 30) return '普通';
  if (n <= 60) return '困难';
  if (n <= 90) return '噩梦';
  return '炼狱';
}

/** Milestone player-level gates: stageIndex(1-based) -> min playerLevel */
export const STAGE_LEVEL_GATES = {
  11: 5,
  21: 10,
  41: 20,
  71: 30,
  100: 40,
};

function buildStage(n) {
  const th = themeFor(n);
  const tier = n;
  // Base curve (stage 8 ~2:00). Stages 1–2 are eased below so a first clear
  // lands inside one short sitting; 40+ tightens a little.
  let clearTime = Math.min(300, 105 + Math.floor(tier * 1.35));
  let clearKills = Math.min(360, 95 + Math.floor(tier * 2.4));
  let eliteEvery = Math.max(7, 28 - Math.floor(tier / 5));
  let spawnBase = 0.78 + tier * 0.014;
  let spawnRamp = 0.018 + tier * 0.0004;
  let hpScale = 1.12 + (tier - 1) * 0.085;
  let dmgScale = 0.9 + (tier - 1) * 0.058;
  if (n === 1) {
    // Was 1:46 / 97 kills, spawn 0.79, hp 1.12, dmg 0.90, elite every 28.
    clearTime = 78;
    clearKills = 48;
    spawnBase = 0.52;
    spawnRamp = 0.011;
    hpScale = 0.86;
    dmgScale = 0.62;
    eliteEvery = 42;
  } else if (n === 2) {
    // Was 1:47 / 99 kills, spawn 0.81, hp 1.21, dmg 0.96.
    clearTime = 92;
    clearKills = 62;
    spawnBase = 0.66;
    spawnRamp = 0.013;
    hpScale = 1.02;
    dmgScale = 0.76;
    eliteEvery = 34;
  } else if (n >= 70) {
    spawnBase *= 1.12;
    hpScale *= 1.05;
    dmgScale *= 1.06;
    eliteEvery = Math.max(6, eliteEvery - 1);
  } else if (n >= 40) {
    spawnBase *= 1.08;
    hpScale *= 1.05;
    eliteEvery = Math.max(6, eliteEvery - 1);
  }
  const hasBoss = n >= 5;
  const dualBoss = n >= 15;
  const bosses = [];
  if (hasBoss) {
    bosses.push({ at: Math.floor(clearTime * 0.55), type: 'boss', label: dualBoss ? '清剿主管 · 上' : '精英清剿' });
  }
  if (dualBoss) {
    bosses.push({ at: Math.floor(clearTime * 0.88), type: 'boss', label: '设施霸主 · 终焉' });
  }

  const enemies = [
    { type: 'slime', from: 0, weight: Math.max(0.3, 0.8 - tier * 0.004) },
    { type: 'bat', from: Math.max(5, 30 - tier), weight: 0.28 + Math.min(0.3, tier * 0.004) },
  ];
  if (n >= 3) {
    enemies.push({ type: 'beetle', from: Math.max(12, 40 - tier), weight: 0.14 + Math.min(0.2, tier * 0.002) });
  }
  if (n >= 6) {
    enemies.push({ type: 'golem', from: Math.max(20, 50 - tier), weight: 0.1 + Math.min(0.2, tier * 0.0025) });
  }
  if (n >= 8 || th.theme === 'ward') {
    enemies.push({ type: 'wisp', from: Math.max(25, 55 - tier), weight: 0.12 + Math.min(0.18, tier * 0.002) });
  }
  if (n >= 12 || th.theme === 'basement') {
    enemies.push({ type: 'shadow', from: Math.max(30, 60 - tier), weight: 0.1 + Math.min(0.2, tier * 0.002) });
  }

  const clearMode = hasBoss ? 'boss' : 'survive_or_kills';
  const midAnnounces = [
    { at: Math.floor(clearTime * 0.3), text: '一波强敌' },
    { at: Math.floor(clearTime * 0.55), text: hasBoss ? '强敌来袭' : '坚持住！' },
  ];
  if (dualBoss) midAnnounces.push({ at: Math.floor(clearTime * 0.85), text: '终焉之战！' });

  return {
    id: `s${n}`,
    index: n - 1,
    stageNum: n,
    name: `第${n}关 · ${th.short}`,
    subtitle: `${th.namePrefix} · ${difficultyTag(n)}`,
    theme: th.theme,
    clearTime,
    clearKills,
    clearMode,
    spawnBase,
    spawnRamp,
    maxEnemies: Math.min(130, 52 + Math.floor(tier * 0.75)),
    enemies,
    eliteEvery,
    golemFrom: n >= 3 ? Math.max(15, 45 - tier) : 9999,
    bosses,
    introBanner: {
      title: `第${n}关 · 波次 1`,
      sub: `目标 · ${clearMode === 'boss' ? '击败首领' : `生存 ${fmt(clearTime)} 或 ${clearKills} 杀`}`,
    },
    midAnnounces,
    rewardCoins: 15 + tier * 3,
    rewardDiamonds: n % 5 === 0 ? 5 + Math.floor(n / 10) : (n === 1 ? 5 : 0),
    bgTint: th.bgTint,
    hpScale,
    dmgScale,
    levelGate: STAGE_LEVEL_GATES[n] || 0,
    difficultyTag: difficultyTag(n),
  };
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export const STAGE_COUNT = 100;

export const STAGES = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i + 1));

export const ENDLESS = {
  id: 'endless',
  index: STAGE_COUNT,
  stageNum: 101,
  name: '无尽设施',
  subtitle: '通关第100关或撤离员 Lv.50 解锁 · 挑战极限',
  theme: 'basement',
  clearTime: 99999,
  clearKills: 99999,
  clearMode: 'endless',
  spawnBase: 1.2,
  spawnRamp: 0.05,
  maxEnemies: 130,
  enemies: [
    { type: 'slime', from: 0, weight: 0.35 },
    { type: 'bat', from: 0, weight: 0.28 },
    { type: 'beetle', from: 10, weight: 0.18 },
    { type: 'wisp', from: 15, weight: 0.16 },
    { type: 'golem', from: 20, weight: 0.2 },
    { type: 'shadow', from: 25, weight: 0.18 },
  ],
  eliteEvery: 10,
  golemFrom: 20,
  bosses: [],
  introBanner: { title: '无尽设施 · 波次 1', sub: '目标 · 撑得越久越好' },
  midAnnounces: [
    { at: 60, text: '潮汐加剧' },
    { at: 120, text: '警报升级…' },
  ],
  rewardCoins: 50,
  rewardDiamonds: 0,
  bgTint: [0.08, 0.09, 0.11],
  hpScale: 1.5,
  dmgScale: 1.2,
  levelGate: 50,
  difficultyTag: '无尽',
  endless: true,
};

export function getStage(idOrIndex) {
  if (idOrIndex === 'endless' || idOrIndex === ENDLESS.index) return ENDLESS;
  if (typeof idOrIndex === 'number') {
    if (idOrIndex >= STAGE_COUNT) return ENDLESS;
    return STAGES[idOrIndex] || STAGES[0];
  }
  if (typeof idOrIndex === 'string' && idOrIndex.startsWith('s')) {
    const n = parseInt(idOrIndex.slice(1), 10);
    if (n >= 1 && n <= STAGE_COUNT) return STAGES[n - 1];
  }
  return STAGES.find((s) => s.id === idOrIndex) || STAGES[0];
}

export function allStagesIncludingEndless() {
  return [...STAGES, ENDLESS];
}

export function isEndlessUnlocked(save) {
  const cleared = save.stagesCleared || {};
  return !!cleared.s100 || (save.playerLevel || 1) >= 50;
}

export function isStageUnlocked(save, stageId) {
  const s = getStage(stageId);
  if (s.endless) return isEndlessUnlocked(save);
  if (s.stageNum === 1) return true;
  const cleared = save.stagesCleared || {};
  const prevId = `s${s.stageNum - 1}`;
  if (!cleared[prevId]) return false;
  const gate = s.levelGate || STAGE_LEVEL_GATES[s.stageNum] || 0;
  if (gate > 0 && (save.playerLevel || 1) < gate) return false;
  return true;
}

export function stageLockReason(save, stageId) {
  const s = getStage(stageId);
  if (s.endless) {
    if (isEndlessUnlocked(save)) return null;
    return '通关第100关或达到撤离员 Lv.50';
  }
  if (s.stageNum === 1) return null;
  const cleared = save.stagesCleared || {};
  if (!cleared[`s${s.stageNum - 1}`]) return `先通关第${s.stageNum - 1}关`;
  const gate = s.levelGate || STAGE_LEVEL_GATES[s.stageNum] || 0;
  if (gate > 0 && (save.playerLevel || 1) < gate) return `需要撤离员 Lv.${gate}`;
  return null;
}

export function markStageCleared(save, stageId) {
  if (!save.stagesCleared) save.stagesCleared = {};
  if (stageId === 'endless') return;
  save.stagesCleared[stageId] = true;
}

export function pickEnemyType(stage, timeSec) {
  const pool = stage.enemies.filter((e) => timeSec >= e.from);
  if (!pool.length) return 'slime';
  let total = 0;
  for (const e of pool) total += e.weight;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return pool[pool.length - 1].type;
}

export function spawnRateAt(stage, timeSec) {
  let rate = stage.spawnBase + timeSec * stage.spawnRamp + Math.floor(timeSec / 45) * 0.2;
  if (stage.endless) rate += Math.floor(timeSec / 30) * 0.25;
  return rate;
}

export function difficultyScale(stage, timeSec) {
  let base = (stage.hpScale || 1) + timeSec / 100 + (stage.index || 0) * 0.02;
  if (stage.endless) base = (stage.hpScale || 1.5) + Math.floor(timeSec / 30) * 0.15;
  return base;
}

export function clearProgress(stage, timeSec, kills, extras = {}) {
  if (stage.endless) return Math.min(0.99, timeSec / 300);
  const tProg = Math.min(1, timeSec / stage.clearTime);
  const kProg = Math.min(1, kills / stage.clearKills);
  if (stage.clearMode === 'boss' || (stage.bosses && stage.bosses.length)) {
    const scheduled = (stage.bosses || []).length;
    const spawned = extras.bossesSpawned != null ? extras.bossesSpawned : Object.keys(extras.bossFired || {}).length;
    const killed = extras.bossesKilled || 0;
    const alive = !!extras.bossAlive;
    // Soft goals fill bar; killing final boss completes it
    const soft = Math.max(tProg, kProg) * 0.85;
    const bossProg = scheduled > 0 ? Math.min(1, killed / scheduled) : 0;
    if (killed >= scheduled && scheduled > 0 && !alive) return 1;
    return Math.min(0.95, Math.max(soft, bossProg * 0.9));
  }
  return Math.max(tProg, kProg);
}

/**
 * Clear rules:
 * - Boss stages (clearMode 'boss'): all scheduled bosses spawned, none alive, and final boss killed.
 *   time/kills are soft goals only (progress bar / spawn pressure), not auto-win.
 * - Non-boss: survive clearTime OR reach clearKills.
 */
export function isStageCleared(stage, timeSec, kills, extras = {}) {
  if (stage.endless) return false;
  const hasBosses = stage.clearMode === 'boss' || (stage.bosses && stage.bosses.length > 0);
  if (hasBosses) {
    const scheduled = (stage.bosses || []).length;
    const bossesKilled = extras.bossesKilled || 0;
    const bossAlive = !!extras.bossAlive;
    const bossesSpawned = extras.bossesSpawned != null
      ? extras.bossesSpawned
      : Object.keys(extras.bossFired || {}).filter((k) => !String(k).startsWith('e')).length;
    const allSpawned = bossesSpawned >= scheduled;
    const finalBossDead = !!extras.finalBossDead || (bossesKilled >= scheduled && scheduled > 0);
    return allSpawned && !bossAlive && finalBossDead;
  }
  return timeSec >= stage.clearTime || kills >= stage.clearKills;
}

/** One short goal phrase for banners and the HUD chip. */
export function stageGoalLine(stage) {
  if (!stage || stage.endless) return '撑住';
  if (stage.clearMode === 'boss' || (stage.bosses && stage.bosses.length)) return '击败首领';
  return '生存或清场';
}

/** One sentence that matches the real clear rule (boss kill, or survive OR kills). */
export function stageWinLine(stage) {
  if (!stage || stage.endless) return '撑得越久越好';
  if (stage.clearMode === 'boss' || (stage.bosses && stage.bosses.length)) return '击败首领';
  return `生存 ${fmt(stage.clearTime)} 或 ${stage.clearKills} 杀`;
}

export function waveLabel(stage, timeSec) {
  const wave = Math.floor(timeSec / 20) + 1;
  return `波次 ${wave} · 目标 ${stageGoalLine(stage)}`;
}

/** XP from a run toward playerLevel */
export function runXpGain(stage, timeSec, kills, cleared) {
  let xp = Math.floor(timeSec * 0.35 + kills * 0.6);
  if (cleared) xp += (stage.stageNum || 1) * 4;
  if (stage.endless) xp += Math.floor(timeSec / 10);
  return Math.max(1, xp);
}
