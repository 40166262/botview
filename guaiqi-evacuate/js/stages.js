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

function lerp(a, b, t) {
  return a + (b - a) * t;
}


/** Chapter beat every 10 stages (1–10 tutorial, … 91–100 finale). */
function chapterOf(n) {
  return Math.ceil(n / 10);
}

function chapterTitle(n) {
  const ch = chapterOf(n);
  const titles = {
    1: '入门撤离',
    2: '双层警报',
    3: '深层清扫',
    4: '高压班次',
    5: '夜班炼狱',
    6: '设施反扑',
    7: '权限风暴',
    8: '终局预热',
    9: '炼狱走廊',
    10: '终极撤离',
  };
  return titles[ch] || `第${ch}章`;
}

/** One-line sell point for stage select UI. */
function sellHintFor(hooks, n, hasBoss) {
  if (!hooks || !hooks.length) {
    return hasBoss ? '本关有首领战' : '坚持到通关线';
  }
  const prefer = ['pre_boss_show', 'golem_debut', 'shadow_debut', 'wisp_debut', 'beetle_fanfare',
    'triple_drop', 'overdrive', 'combo_fever', 'mystery_choice', 'elite_pair', 'golden_early',
    'slacker_early', 'escalate', 'supply_rain', 'coin_shower', 'swarm_hook'];
  const labels = {
    lucky_burst: '幸运开工费',
    golden_early: '金色箱提前',
    cheer_pack: '加油包',
    wisp_debut: '监视器首秀',
    slacker_early: '摸鱼追击',
    heal_rain: '急救空投',
    beetle_fanfare: '铠甲登场',
    triple_drop: '三重空投',
    overdrive: '过载窗口',
    mystery_choice: '神秘权限箱',
    elite_pair: '双精英夹击',
    combo_fever: '连击狂热',
    pre_boss_show: '首领先锋',
    secret_easy: '故障投影',
    golem_debut: '重装保安',
    shadow_debut: '阴影首秀',
    supply_rain: '补给雨',
    coin_shower: '金币雨',
    swarm_hook: '突发尸潮',
    escalate: '潮汐升级',
  };
  for (const k of prefer) {
    const h = hooks.find((x) => x.kind === k);
    if (h) return labels[k] || k;
  }
  return labels[hooks[0].kind] || '本关有彩蛋';
}

function themeAnnouncePack(th, n, clearTime, hasBoss, dualBoss) {
  const t = clearTime;
  const theme = th.theme;
  const packs = {
    office: [
      ['工位灯闪了三下', '打印机吐出红色纸带'],
      ['考勤机在尖叫', '主管室门缝透光'],
      ['碎椅堆在晃', '茶水间锁被撞开'],
    ],
    ward: [
      ['点滴架自己在滚', '护士站广播沙沙响'],
      ['心电图只剩直线噪声', '帘子后有脚步'],
      ['消毒灯忽明忽灭', '推床卡在转角'],
    ],
    basement: [
      ['备用电切换中', '机柜风扇过载啸叫'],
      ['冷却管在冒白雾', '权限门红灯连闪'],
      ['地沟盖被顶开', '柴油味越来越浓'],
    ],
  };
  const pair = packs[theme][(n + theme.length) % 3];
  const mid = [
    { at: Math.floor(t * 0.28), text: pair[0] },
    { at: Math.floor(t * 0.55), text: hasBoss ? pair[1] : '坚持住，出口还亮着' },
  ];
  if (dualBoss) mid.push({ at: Math.floor(t * 0.85), text: '终焉之战！第二首领入场' });
  // Milestone flavor overrides
  if (n % 10 === 0) {
    mid[0] = { at: Math.floor(t * 0.25), text: `第${n}关里程碑 · 设施全面戒备` };
    mid[1] = { at: Math.floor(t * 0.52), text: hasBoss ? '章节霸主苏醒！' : '里程碑尸潮！' };
  } else if (n % 5 === 0) {
    mid[0] = { at: Math.floor(t * 0.24), text: '半章节点 · 补给与压力同到' };
  }
  return mid;
}

function introFor(n, th, clearMode, clearTime, clearKills) {
  const ch = chapterTitle(n);
  let title = `第${n}关 · ${th.short}`;
  let sub = `目标 · ${clearMode === 'boss' ? '击败首领' : `生存 ${fmt(clearTime)} 或 ${clearKills} 杀`}`;
  if (n % 10 === 0) {
    title = `第${n}关 · ${ch}节点`;
    sub = '章节关 · 过载 + 双精英 + 首领先锋';
  } else if (n % 5 === 0) {
    title = `第${n}关 · 半章试炼`;
    sub = clearMode === 'boss' ? '首领前必有补给与过载窗口' : '半章节奏 · 别浪费空投';
  } else if (n >= 7) {
    const beat = n % 5;
    const subs = {
      1: `${th.namePrefix} · 补给节拍`,
      2: `${th.namePrefix} · 新威胁亮相`,
      3: `${th.namePrefix} · 过载与连击`,
      4: `${th.namePrefix} · 神秘箱与摸鱼`,
      0: `${th.namePrefix} · 首领节奏`,
    };
    sub = subs[beat] || sub;
    title = `第${n}关 · ${ch}`;
  }
  return { title, sub };
}

/**
 * Procedural hooks for stages 7–100.
 * Pattern: 1–3 events per stage, themed by n%5 + milestones; never copy-paste identical sets.
 */
function buildProceduralHooks(n, clearTime, th, hasBoss, dualBoss) {
  const t = clearTime;
  const a = (frac, kind, extra = {}) => ({ at: Math.max(8, Math.floor(t * frac)), kind, ...extra });
  const hooks = [];
  const beat = n % 5; // 0 = milestone-ish within chapter
  const theme = th.theme;

  // Debut unlocks by stage number (skip theme-debut in beat 2 when set)
  let forcedDebut = null;
  if (n === 8 || n === 12) forcedDebut = 'shadow_debut';
  else if (n === 7) forcedDebut = 'wisp_debut';
  else if (n === 9) forcedDebut = 'golem_debut';
  if (forcedDebut) hooks.push(a(0.18, forcedDebut));

  if (n % 10 === 0) {
    // Decade bosses: curated package (keep all — skip generic dedupe below)
    const decade = [
      a(0.12, 'golden_early'),
      a(0.28, 'elite_pair'),
      a(0.4, 'overdrive', { dur: 11 + Math.floor(n / 25), mul: 1.4 + Math.min(0.25, n * 0.002) }),
      a(0.47, 'pre_boss_show'),
    ];
    if (n >= 20) decade.splice(1, 0, a(0.22, 'combo_fever', { need: 10 }));
    if (n >= 50) decade.splice(2, 0, a(0.34, 'triple_drop'));
    if (n === 100) {
      decade.push(a(0.18, 'mystery_choice'), a(0.55, 'supply_rain'));
    }
    return decade.sort((x, y) => x.at - y.at);
  } else if (n % 5 === 0) {
    hooks.push(
      a(0.16, n % 10 === 5 ? 'triple_drop' : 'supply_rain'),
      a(0.38, 'overdrive', { dur: 9 + (n >= 40 ? 2 : 0), mul: 1.38 }),
      a(0.46, 'pre_boss_show'),
    );
    if (hasBoss) hooks.push(a(0.28, 'slacker_early'));
  } else if (beat === 1) {
    hooks.push(
      a(0.15, 'lucky_burst', { label: n >= 40 ? '高危开工费' : '班次奖金' }),
      a(0.4, 'cheer_pack', { label: '班次加油包' }),
      a(0.62, theme === 'ward' ? 'heal_rain' : 'supply_rain'),
    );
  } else if (beat === 2) {
    if (!forcedDebut) {
      const debut = theme === 'ward' ? 'wisp_debut' : theme === 'basement' ? (n >= 12 ? 'shadow_debut' : 'golem_debut') : 'beetle_fanfare';
      hooks.push(a(0.2, debut));
    } else {
      hooks.push(a(0.32, 'swarm_hook'));
    }
    hooks.push(
      a(0.48, 'elite_pair'),
      a(0.7, 'coin_shower'),
    );
  } else if (beat === 3) {
    hooks.push(
      a(0.18, 'combo_fever', { need: n >= 30 ? 12 : 9 }),
      a(0.48, 'overdrive', { dur: 10 + Math.floor(n / 30), mul: 1.42 + Math.min(0.2, n * 0.0015) }),
      a(0.7, n >= 25 ? 'swarm_hook' : 'heal_rain'),
    );
  } else { // beat === 4
    hooks.push(
      a(0.16, 'mystery_choice'),
      a(0.35, 'slacker_early'),
      a(0.58, n % 3 === 1 ? 'golden_early' : 'triple_drop'),
    );
  }

  // Late game spice: occasional secret / dual stress without duplicating decade packs
  if (n >= 25 && n % 10 !== 0 && n % 7 === 0) {
    hooks.push(a(0.33, 'secret_easy'));
  }
  if (n >= 40 && n % 10 !== 0 && n % 8 === 0) {
    hooks.push(a(0.5, 'swarm_hook'));
  }
  if (dualBoss && n % 10 !== 0 && n % 5 !== 0) {
    // Ensure at least one boss-prep beat before first boss window (~0.55)
    const hasPrep = hooks.some((h) => h.kind === 'pre_boss_show' || h.kind === 'overdrive' || h.kind === 'triple_drop' || h.kind === 'supply_rain');
    if (!hasPrep) hooks.push(a(0.44, 'overdrive', { dur: 8, mul: 1.35 }));
  }

  // Dedupe by kind, keep 2–4; always preserve boss-prep if scheduled
  const priority = new Set(['pre_boss_show', 'overdrive', 'triple_drop', 'supply_rain', 'golden_early']);
  const sorted = hooks.sort((x, y) => x.at - y.at);
  const seen = new Set();
  const out = [];
  const deferred = [];
  for (const h of sorted) {
    if (seen.has(h.kind) && h.kind !== 'overdrive') continue;
    seen.add(h.kind);
    if (priority.has(h.kind) || out.length < 3) out.push(h);
    else deferred.push(h);
  }
  for (const h of deferred) {
    if (out.length >= 4) break;
    out.push(h);
  }
  out.sort((x, y) => x.at - y.at);
  if (out.length > 4) out.length = 4;
  // Boss stages must keep at least one prep beat
  if (hasBoss) {
    const hasPrep = out.some((h) => h.kind === 'pre_boss_show' || h.kind === 'overdrive' || h.kind === 'triple_drop' || h.kind === 'supply_rain' || h.kind === 'golden_early');
    if (!hasPrep) {
      if (out.length >= 4) out.pop();
      out.push(a(0.44, 'overdrive', { dur: 8, mul: 1.35 }));
    }
  }
  if (out.length < 2) {
    out.push(a(0.35, 'cheer_pack'), a(0.55, 'coin_shower'));
  }
  // Stagger identical timestamps
  const final = out.sort((x, y) => x.at - y.at);
  for (let i = 1; i < final.length; i++) {
    if (final[i].at <= final[i - 1].at) final[i] = { ...final[i], at: final[i - 1].at + 6 };
  }
  return final;
}

function buildStage(n) {
  const th = themeFor(n);
  const tier = n;
  // Base curve (stage 8 ~2:00). Stages 1–2 are eased so a first clear
  // lands inside one short sitting. Stages 3–5 walk back up to this curve
  // so the old stage-3 cliff is a ramp. 40+ tightens a little.
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
  } else if (n >= 3 && n <= 5) {
    // t=0 sits on the eased stage 2; t=1 is the mid curve captured above.
    // Stage 5 keeps its boss clock (clear time / kill soft goals).
    const t = n === 3 ? 0.42 : n === 4 ? 0.70 : 0.88;
    const eased = {
      clearTime: 92, clearKills: 62, eliteEvery: 34,
      spawnBase: 0.66, spawnRamp: 0.013, hpScale: 1.02, dmgScale: 0.76,
    };
    if (n < 5) {
      clearTime = Math.round(lerp(eased.clearTime, clearTime, t));
      clearKills = Math.round(lerp(eased.clearKills, clearKills, t));
    }
    eliteEvery = Math.round(lerp(eased.eliteEvery, eliteEvery, t));
    spawnBase = Math.round(lerp(eased.spawnBase, spawnBase, t) * 1000) / 1000;
    spawnRamp = Math.round(lerp(eased.spawnRamp, spawnRamp, t) * 1000) / 1000;
    hpScale = Math.round(lerp(eased.hpScale, hpScale, t) * 1000) / 1000;
    dmgScale = Math.round(lerp(eased.dmgScale, dmgScale, t) * 1000) / 1000;
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
    // Stage 3–4 armor waits a little so the opening is still slime and crawlers.
    let from = Math.max(12, 40 - tier);
    if (n === 3) from = 50; // was 37
    else if (n === 4) from = 44; // was 36
    enemies.push({ type: 'beetle', from, weight: 0.14 + Math.min(0.2, tier * 0.002) });
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
  let midAnnounces = themeAnnouncePack(th, n, clearTime, hasBoss, dualBoss);

  // Early-stage retention hooks (unique beats so 1–5 never feel copy-paste)
  let hooks = [];
  let introTitle = `第${n}关 · 波次 1`;
  let introSub = `目标 · ${clearMode === 'boss' ? '击败首领' : `生存 ${fmt(clearTime)} 或 ${clearKills} 杀`}`;
  let rewardCoins = 15 + tier * 3;
  let rewardDiamonds = n % 5 === 0 ? 5 + Math.floor(n / 10) : (n === 1 ? 5 : 0);
  if (n === 1) {
    introTitle = '第1关 · 初次撤离';
    introSub = '开箱补给 · 活着出去就行';
    midAnnounces[0] = { at: Math.floor(clearTime * 0.28), text: '设施广播：有人发福利箱' };
    midAnnounces[1] = { at: Math.floor(clearTime * 0.62), text: '最后冲刺！门在亮' };
    hooks = [
      { at: 12, kind: 'lucky_burst', label: '新手幸运币' },
      { at: 22, kind: 'golden_early' },
      { at: 38, kind: 'cheer_pack', label: '撤离员加油包' },
    ];
    rewardDiamonds = 5;
  } else if (n === 2) {
    introTitle = '第2关 · 病房廊';
    introSub = '灯光发青……故障监视器要醒了';
    midAnnounces[0] = { at: Math.floor(clearTime * 0.25), text: '病房警报！监视器上线' };
    midAnnounces[1] = { at: Math.floor(clearTime * 0.58), text: '走廊尽头有动静' };
    hooks = [
      { at: 16, kind: 'wisp_debut' },
      { at: 28, kind: 'slacker_early' },
      { at: 48, kind: 'heal_rain', label: '急救空投' },
    ];
    rewardCoins += 8;
  } else if (n === 3) {
    introTitle = '第3关 · 铠甲登场';
    introSub = '厚皮怪来了 · 空投会砸三箱';
    midAnnounces[0] = { at: Math.floor(clearTime * 0.22), text: '地面在震……' };
    midAnnounces[1] = { at: Math.floor(clearTime * 0.5), text: '三重空投坐标锁定' };
    hooks = [
      { at: 20, kind: 'beetle_fanfare' },
      { at: Math.floor(clearTime * 0.48), kind: 'triple_drop' },
      { at: Math.floor(clearTime * 0.72), kind: 'overdrive', dur: 10, mul: 1.45 },
    ];
    rewardCoins += 12;
    rewardDiamonds = Math.max(rewardDiamonds, 2);
  } else if (n === 4) {
    introTitle = '第4关 · 过载协议';
    introSub = '中段会突然加速 · 别浪费那十秒';
    midAnnounces[0] = { at: Math.floor(clearTime * 0.2), text: '权限芯片发热' };
    midAnnounces[1] = { at: Math.floor(clearTime * 0.52), text: '过载协议启动！' };
    hooks = [
      { at: 18, kind: 'mystery_choice' },
      { at: Math.floor(clearTime * 0.5), kind: 'overdrive', dur: 12, mul: 1.55 },
      { at: Math.floor(clearTime * 0.7), kind: 'elite_pair' },
      { at: 35, kind: 'combo_fever', need: 8 },
    ];
    rewardCoins += 16;
    rewardDiamonds = Math.max(rewardDiamonds, 3);
  } else if (n === 5) {
    introTitle = '第5关 · 首领试炼';
    introSub = '第一次正式首领 · 金色箱 + 摸鱼 + 终战';
    midAnnounces[0] = { at: Math.floor(clearTime * 0.22), text: '灯在闪……有东西在集合' };
    midAnnounces[1] = { at: Math.floor(clearTime * 0.52), text: '设施霸主苏醒！' };
    hooks = [
      { at: 14, kind: 'golden_early' },
      { at: 26, kind: 'slacker_early' },
      { at: Math.floor(clearTime * 0.4), kind: 'overdrive', dur: 9, mul: 1.35 },
      { at: Math.floor(clearTime * 0.48), kind: 'pre_boss_show' },
      { at: 32, kind: 'secret_easy' },
    ];
    rewardCoins += 25;
    rewardDiamonds = Math.max(rewardDiamonds, 5);
  } else if (n === 6) {
    introTitle = '第6关 · 机甲保安';
    introSub = '重装单位入场 · 打爆它有额外掉落';
    midAnnounces[0] = { at: Math.floor(clearTime * 0.24), text: '履带声从地库传来' };
    midAnnounces[1] = { at: Math.floor(clearTime * 0.55), text: '重装保安锁定你了' };
    hooks = [
      { at: 22, kind: 'golem_debut' },
      { at: 40, kind: 'triple_drop' },
      { at: 55, kind: 'overdrive', dur: 8, mul: 1.4 },
    ];
    rewardCoins += 10;
  } else {
    const intro = introFor(n, th, clearMode, clearTime, clearKills);
    introTitle = intro.title;
    introSub = intro.sub;
    hooks = buildProceduralHooks(n, clearTime, th, hasBoss, dualBoss);
    if (n % 10 === 0) rewardCoins += 40;
    else if (n % 5 === 0) rewardCoins += 22;
  }

  const sellHint = sellHintFor(hooks, n, hasBoss);

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
      title: introTitle,
      sub: introSub,
    },
    midAnnounces,
    hooks,
    sellHint,
    rewardCoins,
    rewardDiamonds,
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
  introBanner: { title: '无尽设施 · 潮汐循环', sub: '每 60 秒升级 · 抓摸鱼 · 撑得越久越好' },
  midAnnounces: [
    { at: 45, text: '第一波潮汐升温' },
    { at: 90, text: '权限门全开……' },
    { at: 150, text: '无尽首领窗口临近' },
    { at: 240, text: '设施在改写规则' },
  ],
  hooks: [
    { at: 25, kind: 'slacker_early' },
    { at: 55, kind: 'escalate', label: '潮汐 I' },
    { at: 70, kind: 'triple_drop' },
    { at: 110, kind: 'overdrive', dur: 12, mul: 1.5 },
    { at: 130, kind: 'elite_pair' },
    { at: 175, kind: 'escalate', label: '潮汐 II' },
    { at: 200, kind: 'mystery_choice' },
    { at: 230, kind: 'combo_fever', need: 12 },
    { at: 280, kind: 'supply_rain' },
    { at: 320, kind: 'escalate', label: '潮汐 III' },
  ],
  sellHint: '循环潮汐 · 过载与空投',
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
