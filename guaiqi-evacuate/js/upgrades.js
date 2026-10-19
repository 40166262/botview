/** Upgrade catalog — facility weapons + passives; sheet cells into 5×5 icon sheet */
export const RARITY = {
  common: { id: 'common', name: '普通', color: '#9aaa90', border: 'rgba(154,170,144,0.75)' },
  rare: { id: 'rare', name: '稀有', color: '#c47a32', border: 'rgba(196,122,50,0.85)' },
  epic: { id: 'epic', name: '史诗', color: '#e0b050', border: 'rgba(224,176,80,0.95)' },
};

/**
 * sheet cell index into upgrade_icons_sheet (5×5):
 *  0 mag       1 damage    2 movespeed  3 maxhp     4 magnet
 *  5 orbit     6 pierce    7 multishot  8 crit      9 bounce
 * 10 split    11 shield   12 thorns    13 frost    14 coinBoost
 * 15 firerate 16 laser_pointer 17 chem_jug 18 nail_bomb 19 robo_vac
 * 20 tear_gas 21 stapler_storm 22 fan_blade 23 extinguisher 24 dashGhost
 */
export const UPGRADES = [
  {
    id: 'projectile',
    name: '多重弹匣',
    desc: '同时多射出 1 道弹道',
    feel: '手感：多一发，扇面拉开',
    icon: '',
    sheet: 0,
    rarity: 'rare',
    max: 5,
    apply(p) {
      p.projectiles += 1;
      p.shotScale = Math.max(0.72, (p.shotScale || 1) * 0.93);
    },
  },
  {
    id: 'damage',
    name: '穿甲弹头',
    desc: '弹道伤害提升 28%',
    feel: '手感：弹头更沉',
    icon: '',
    sheet: 1,
    rarity: 'common',
    max: 8,
    apply(p) {
      p.damage *= 1.28;
      p.shotScale = Math.min(1.85, (p.shotScale || 1) * 1.07);
    },
  },
  {
    id: 'firerate',
    name: '狂暴连射',
    desc: '攻速大幅提升（间隔 −15%）',
    feel: '手感：间隔收短，连成一条',
    icon: '',
    sheet: 15,
    rarity: 'common',
    max: 7,
    apply(p) {
      p.fireCooldown *= 0.85;
      p.fireRateStacks = (p.fireRateStacks || 0) + 1;
      p.shotStreak = Math.min(52, (p.shotStreak || 12) + 12);
    },
  },
  {
    id: 'movespeed',
    name: '冲刺跑鞋',
    desc: '移动速度提升 14%',
    icon: '',
    sheet: 2,
    rarity: 'common',
    max: 6,
    apply(p) { p.speed *= 1.14; },
  },
  {
    id: 'maxhp',
    name: '急救包',
    desc: '最大生命 +25 并回满',
    icon: '',
    sheet: 3,
    rarity: 'common',
    max: 6,
    apply(p) { p.maxHp += 25; p.hp = p.maxHp; },
  },
  {
    id: 'lifesteal',
    name: '肾上腺素',
    desc: '击杀回复 3 点生命',
    icon: '',
    sheet: 3,
    rarity: 'rare',
    max: 5,
    apply(p) { p.lifesteal += 3; },
  },
  {
    id: 'magnet',
    name: '磁吸腕带',
    desc: '拾取范围暴增，物资飞来更快',
    icon: '',
    sheet: 4,
    rarity: 'common',
    max: 4,
    apply(p) { p.magnet *= 1.85; },
  },
  {
    id: 'orbit',
    name: '工业风扇环',
    desc: '环身扇叶碰撞伤害',
    feel: '手感：身边扇叶磕人',
    icon: '',
    sheet: 5,
    rarity: 'epic',
    max: 4,
    apply(p) { p.orbitBalls += 1; },
  },
  {
    id: 'pierce',
    name: '穿透弹匣',
    desc: '子弹可再穿透 1 个敌人',
    feel: '手感：一颗穿一串',
    icon: '',
    sheet: 6,
    rarity: 'rare',
    max: 4,
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'multishot',
    name: '散射弹',
    desc: '弹道扇形散开角度增大',
    feel: '手感：散开扫一片',
    icon: '',
    sheet: 7,
    rarity: 'rare',
    max: 3,
    apply(p) { p.spread += 0.26; },
  },
  {
    id: 'crit',
    name: '精密瞄具',
    desc: '暴击几率 +10%，暴击更狠',
    feel: '手感：偶尔一发特别狠',
    icon: '',
    sheet: 8,
    rarity: 'rare',
    max: 5,
    apply(p) {
      p.critChance = Math.min(0.6, (p.critChance || 0.08) + 0.1);
      p.critDamage = (p.critDamage || 1.85) + 0.15;
    },
  },
  {
    id: 'bounce',
    name: '弹射跳弹',
    desc: '子弹命中后弹射至附近敌人',
    feel: '手感：打中还会跳',
    icon: '',
    sheet: 9,
    rarity: 'epic',
    max: 3,
    apply(p) { p.bounce = (p.bounce || 0) + 1; },
  },
  {
    id: 'split',
    name: '破片手雷',
    desc: '击杀时向四周迸出破片',
    feel: '手感：击杀掉一圈破片',
    icon: '',
    sheet: 10,
    rarity: 'epic',
    max: 3,
    apply(p) { p.splitOnKill = (p.splitOnKill || 0) + 2; },
  },
  {
    id: 'shield',
    name: '防暴盾牌',
    desc: '获得 1 层护盾（挡一次伤害）',
    icon: '',
    sheet: 11,
    rarity: 'epic',
    max: 3,
    apply(p) { p.shield = (p.shield || 0) + 1; },
  },
  {
    id: 'thorns',
    name: '地刺夹子',
    desc: '受击反弹 12 点伤害',
    icon: '',
    sheet: 12,
    rarity: 'rare',
    max: 4,
    apply(p) { p.thorns = (p.thorns || 0) + 12; },
  },
  {
    id: 'frost',
    name: '冷冻喷雾',
    desc: '子弹附带强力减速',
    feel: '手感：命中拖慢脚步',
    icon: '',
    sheet: 13,
    rarity: 'epic',
    max: 3,
    apply(p) { p.frost = (p.frost || 0) + 0.22; },
  },
  {
    id: 'coinBoost',
    name: '清点奖金',
    desc: '击杀金币 +40%，更易暴富',
    icon: '',
    sheet: 14,
    rarity: 'common',
    max: 4,
    apply(p) { p.coinBonus = (p.coinBonus || 1) + 0.4; },
  },
  {
    id: 'dashGhost',
    name: '残影冲刺',
    desc: '移动时留下伤害残影',
    icon: '',
    sheet: 24,
    rarity: 'rare',
    max: 3,
    apply(p) { p.dashGhost = (p.dashGhost || 0) + 1; },
  },
  // —— Facility weapons (hooks keep dewBeam/sporeMelon/… props) ——
  {
    id: 'laser_pointer',
    name: '激光笔',
    desc: '持续短射线，随瞄准切割穿透（科工残件）',
    feel: '手感：短射线贴着切',
    icon: '',
    sheet: 16,
    rarity: 'epic',
    max: 4,
    apply(p) {
      p.dewBeam = (p.dewBeam || 0) + 1;
      p.dewBeamWidth = 10 + p.dewBeam * 4;
      p.dewBeamLen = 140 + p.dewBeam * 28;
    },
  },
  {
    id: 'chem_jug',
    name: '化学桶',
    desc: '抛物砸地，留下腐蚀液持续伤害并减速',
    feel: '手感：砸地留一滩',
    icon: '',
    sheet: 17,
    rarity: 'epic',
    max: 3,
    apply(p) {
      p.sporeMelon = (p.sporeMelon || 0) + 1;
      p.sporeMelonCd = Math.max(0.55, 1.4 - p.sporeMelon * 0.2);
    },
  },
  {
    id: 'nail_bomb',
    name: '钉枪炸弹',
    desc: '落地爆炸 + 反向钉子击退',
    feel: '手感：炸开一圈钉子',
    icon: '',
    sheet: 18,
    rarity: 'epic',
    max: 3,
    apply(p) {
      p.thornDurian = (p.thornDurian || 0) + 1;
      p.thornDurianCd = Math.max(0.7, 1.8 - p.thornDurian * 0.25);
    },
  },
  {
    id: 'robo_vac',
    name: '遥控扫地机',
    desc: '环绕自动射击的扫地机',
    feel: '手感：旁边自己补枪',
    icon: '',
    sheet: 19,
    rarity: 'epic',
    max: 3,
    apply(p) {
      p.leafDrone = (p.leafDrone || 0) + 1;
    },
  },
  {
    id: 'tear_gas',
    name: '催泪罐',
    desc: '追踪减速弹，缠住敌人',
    feel: '手感：罐子追着缠',
    icon: '',
    sheet: 20,
    rarity: 'rare',
    max: 4,
    apply(p) {
      p.mothHex = (p.mothHex || 0) + 1;
    },
  },
  {
    id: 'stapler_storm',
    name: '订书钉风暴',
    desc: '短距穿透订书钉，侧向散射清近身',
    feel: '手感：近身一阵钉雨',
    icon: '',
    sheet: 21,
    rarity: 'rare',
    max: 4,
    apply(p) {
      p.moonKnives = (p.moonKnives || 0) + 1;
    },
  },
  {
    id: 'fan_blade',
    name: '工业风扇刃',
    desc: '近距扇形抽打，补近战',
    feel: '手感：贴脸扇一下',
    icon: '',
    sheet: 22,
    rarity: 'rare',
    max: 3,
    apply(p) {
      p.vineLash = (p.vineLash || 0) + 1;
      p.vineLashCd = Math.max(0.45, 1.1 - p.vineLash * 0.15);
    },
  },
  {
    id: 'extinguisher',
    name: '灭火器喷射',
    desc: '蓄力环爆，适合 Boss 窗口',
    feel: '手感：蓄满喷开一圈',
    icon: '',
    sheet: 23,
    rarity: 'epic',
    max: 3,
    apply(p) {
      p.crystalNova = (p.crystalNova || 0) + 1;
      p.crystalNovaCd = Math.max(2.5, 5.5 - p.crystalNova * 0.8);
    },
  },
];

const RARITY_WEIGHT = { common: 1, rare: 0.55, epic: 0.28 };

/** 特殊武器 id：已拥有且未满级时大幅加权，优先凑满同一件；避免开局后总刷新枪稀释构筑 */
const SPECIAL_WEAPONS = new Set([
  'laser_pointer', 'chem_jug', 'nail_bomb', 'robo_vac', 'tear_gas',
  'stapler_storm', 'orbit', 'bounce', 'split', 'fan_blade', 'extinguisher',
]);

function weightedPickOne(bag) {
  let total = bag.reduce((s, b) => s + b.w, 0);
  let r = Math.random() * total;
  let idx = 0;
  for (let j = 0; j < bag.length; j++) {
    r -= bag[j].w;
    if (r <= 0) { idx = j; break; }
  }
  return idx;
}

const RARITY_RANK = { common: 0, rare: 1, epic: 2 };

export function pickUpgradeChoices(ownedCounts, n = 3, opts = {}) {
  let pool = UPGRADES.filter((u) => (ownedCounts[u.id] || 0) < u.max);
  // golden chest: only rare+ picks (fallback to full pool if exhausted)
  if (opts.minRarity) {
    const min = RARITY_RANK[opts.minRarity] || 0;
    const hi = pool.filter((u) => (RARITY_RANK[u.rarity] || 0) >= min);
    if (hi.length >= n) pool = hi;
  }
  const list = pool.length ? pool : UPGRADES;

  // 统计已拥有的特殊武器种类（≥1 级）
  let ownedSpecialKinds = 0;
  for (const id of SPECIAL_WEAPONS) {
    if ((ownedCounts[id] || 0) >= 1) ownedSpecialKinds += 1;
  }
  const hasUnfinished = list.some((u) => {
    const c = ownedCounts[u.id] || 0;
    return c > 0 && c < u.max;
  });
  const hasUnfinishedSpecial = list.some((u) => {
    const c = ownedCounts[u.id] || 0;
    return SPECIAL_WEAPONS.has(u.id) && c > 0 && c < u.max;
  });

  const bag = list.map((u) => {
    let w = RARITY_WEIGHT[u.rarity] || 1;
    const owned = ownedCounts[u.id] || 0;
    const isSpecial = SPECIAL_WEAPONS.has(u.id);

    // 亲和：已拥有未满级 → 强力加权，鼓励凑满同一件
    if (owned > 0 && owned < u.max) {
      w *= (2.8 + owned * 0.9);
    } else if (owned === 0 && isSpecial) {
      // 早期发现：未拥有的特殊武器轻微加成
      w *= 1.15;
      // 已有 2+ 把特殊武器时，抑制新特殊，聚焦构筑
      if (ownedSpecialKinds >= 2) w *= 0.45;
    }

    // 有未满级特殊武器时，压低全新普通填充物，让未完成件更常出现
    if (hasUnfinishedSpecial && u.rarity === 'common' && owned === 0) {
      w *= 0.55;
    }

    return { u, w };
  });

  const picked = [];
  const used = new Set();

  // 保底：若有未满级已拥有升级，强制塞入权重最高的一件，再按权重填满其余槽
  if (hasUnfinished && bag.length) {
    let best = null;
    for (const b of bag) {
      const c = ownedCounts[b.u.id] || 0;
      if (c > 0 && c < b.u.max) {
        if (!best || b.w > best.w) best = b;
      }
    }
    if (best) {
      picked.push(best.u);
      used.add(best.u.id);
    }
  }

  const rest = bag.filter((b) => !used.has(b.u.id));
  while (picked.length < n && rest.length) {
    const idx = weightedPickOne(rest);
    picked.push(rest[idx].u);
    rest.splice(idx, 1);
  }

  return picked;
}

export function rarityMeta(id) {
  return RARITY[id] || RARITY.common;
}
