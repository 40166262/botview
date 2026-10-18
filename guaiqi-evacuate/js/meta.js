/**
 * Meta layer: characters, gallery, gacha, inventory, daily quest, funny lines.
 */

export const CHARACTERS = [
  {
    id: 'grin',
    name: '狂笑射手',
    desc: '设施清剿队均衡枪手。冲锋枪手感起步。',
    icon: '', unlock: { type: 'default' },
    tint: '#c4b090',
    stats: { damage: 1, speed: 1, hp: 1, crit: 1 },
    flavor: '「笑着开枪比较准。」',
  },
  {
    id: 'medic',
    name: '急救狂魔',
    desc: '生存向。生命高，注射器投掷手感。',
    icon: '', unlock: { type: 'stage', stageId: 's1' },
    tint: '#e8d0c8',
    stats: { damage: 0.95, speed: 1.05, hp: 1.25, crit: 0.95 },
    flavor: '「先打一针再说！」',
  },
  {
    id: 'janitor',
    name: '清洁阿姨',
    desc: '近战清场。扇叶/拖把范围伤害。',
    icon: '', unlock: { type: 'gacha' },
    coinCost: 120,
    tint: '#7ab0c8',
    stats: { damage: 1.15, speed: 0.9, hp: 1.3, crit: 0.85 },
    flavor: '「地板要干净，怪也一样。」',
  },
  {
    id: 'intern',
    name: '倒霉实习生',
    desc: '暴击/幸运向。钉枪起步，暴击高。',
    icon: '', unlock: { type: 'gacha', rarity: 'legendary' },
    tint: '#e8c878',
    stats: { damage: 1.05, speed: 1.15, hp: 0.9, crit: 1.55 },
    flavor: '「合同没写要打怪啊……」',
  },
];

export const GALLERY = [
  { id: 'enemy_slime', kind: 'enemy', name: '绿皮丧尸', icon: '', flavor: '工牌还挂着，脑子不太行。' },
  { id: 'enemy_bat', kind: 'enemy', name: '爬行患者', icon: '', flavor: '病房跑出来的，贴地超快。' },
  { id: 'enemy_golem', kind: 'enemy', name: '保安机器人', icon: '', flavor: '护盾模块还半好使。' },
  { id: 'enemy_boss', kind: 'enemy', name: '设施霸主', icon: '', flavor: '开会从不迟到，溃烂除外。' },
  { id: 'enemy_elite', kind: 'enemy', name: '精英变异体', icon: '', flavor: '身上镀了层假金，气场却是真的。' },
  { id: 'enemy_slacker', kind: 'enemy', name: '摸鱼丧尸', icon: '', flavor: '抱着公文包到处跑，抓住它奖金翻倍。' },
  { id: 'enemy_secret', kind: 'enemy', name: '失控安保影', icon: '', flavor: '连击过高时才冒出来的故障投影。' },
  { id: 'char_grin', kind: 'char', name: '狂笑射手', icon: '', flavor: '初始搭子，永不背刺。' },
  { id: 'char_medic', kind: 'char', name: '急救狂魔', icon: '', flavor: '针筒比枪还吓人。' },
  { id: 'char_janitor', kind: 'char', name: '清洁阿姨', icon: '', flavor: '拖把即正义。' },
  { id: 'char_intern', kind: 'char', name: '倒霉实习生', icon: '', flavor: '传说中的欧皇本皇（运气向）。' },
  { id: 'item_chest', kind: 'item', name: '物资箱', icon: '', flavor: '打开之前都是薛定谔的奖金。' },
  { id: 'item_crit', kind: 'item', name: '暴击火花', icon: '', flavor: '数字变黄的那个瞬间最爽。' },
  { id: 'item_frost', kind: 'item', name: '冷冻弹', icon: '', flavor: '给敌人做个美甲——冰蓝款。' },
  { id: 'item_shield', kind: 'item', name: '护盾', icon: '', flavor: '一次性的安全感，用完记得再捡。' },
  { id: 'milestone_10', kind: 'milestone', name: '图鉴启程', icon: '', flavor: '图鉴解锁 10 项纪念。' },
];

export const PASSIVE_ITEMS = [
  { id: 'charm_xp', name: '培训工牌', desc: '开局经验 +15%', rarity: 'rare', icon: '', effect: { xpBonus: 0.15 } },
  { id: 'charm_coin', name: '清点账本', desc: '开局金币 +20%', rarity: 'common', icon: '', effect: { coinBonus: 0.2 } },
  { id: 'charm_crit', name: '精密螺丝', desc: '开局暴击 +5%', rarity: 'epic', icon: '', effect: { critChance: 0.05 } },
  { id: 'charm_shield', name: '防割背心片', desc: '开局携带 1 护盾', rarity: 'epic', icon: '', effect: { shield: 1 } },
  { id: 'charm_frost', name: '冰袋挂件', desc: '子弹自带微弱减速', rarity: 'rare', icon: '', effect: { frost: 0.08 } },
  { id: 'charm_thorn', name: '铁丝环', desc: '开局反伤 +4', rarity: 'rare', icon: '', effect: { thorns: 4 } },
  { id: 'charm_legend', name: '设施通行证', desc: '伤害与移速微增', rarity: 'legendary', icon: '', effect: { damageMul: 1.08, speedMul: 1.05 } },
];

export const RARITY_LABEL = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const RARITY_COLOR = {
  common: '#9aaa90',
  rare: '#5cb8c8',
  epic: '#e0b050',
  legendary: '#e8889a',
};

export const DEATH_LINES = [
  '撤离失败……但故事还没完。',
  '「再给我五秒！不，三秒也行！」',
  '设施记录了你的勇敢（以及你的走位）。',
  '设施霸主：就这？……好吧其实挺厉害。',
  '金币掉了一地，心情也掉了一地。',
  '下次带点护盾再来挨打吧。',
  '连击断了，撤离计划也晃了一下。',
];

export const TOAST_EGGS = [
  '提示：保安机器人其实怕水。',
  '有人在图鉴里偷偷摆了假工牌。',
  '今日运势：适合抽卡，不适合硬刚 Boss。',
  '丧尸申请加入清洁阿姨粉丝群。',
];


/** Gear slots: weapon / hat / clothes / shoes */
export const GEAR_SLOTS = [
  { id: 'weapon', name: '武器' },
  { id: 'hat', name: '帽子' },
  { id: 'clothes', name: '衣服' },
  { id: 'shoes', name: '鞋子' },
];

export const GEAR_ITEMS = [
  { id: 'wpn_staff', name: '应急冲锋枪', slot: 'weapon', rarity: 'common', desc: '伤害 +8%', icon: 'assets/equip_weapon.png', effect: { damageMul: 1.08 } },
  { id: 'wpn_moonblade', name: '改装钉枪', slot: 'weapon', rarity: 'rare', desc: '伤害 +5%，攻速微增', icon: 'assets/equip_weapon.png', effect: { damageMul: 1.05, fireMul: 0.92 } },
  { id: 'wpn_spore', name: '化学喷射器', slot: 'weapon', rarity: 'epic', desc: '附带减速，攻速微增', icon: 'assets/equip_weapon.png', effect: { frost: 0.06, fireMul: 0.95 } },
  { id: 'hat_moss', name: '安全帽', slot: 'hat', rarity: 'common', desc: '暴击 +4%', icon: 'assets/equip_hat.png', effect: { critChance: 0.04 } },
  { id: 'hat_crown', name: '战术耳罩', slot: 'hat', rarity: 'epic', desc: '暴击 +8%，暴伤 +0.2', icon: 'assets/equip_hat.png', effect: { critChance: 0.08, critDamage: 0.2 } },
  { id: 'cloth_cloak', name: '值班外套', slot: 'clothes', rarity: 'common', desc: '生命 +15', icon: 'assets/equip_coat.png', effect: { flatHp: 15 } },
  { id: 'cloth_stone', name: '防暴背心', slot: 'clothes', rarity: 'rare', desc: '生命 +25，减伤 5%', icon: 'assets/equip_coat.png', effect: { flatHp: 25, damageTakenMul: 0.95 } },
  { id: 'cloth_star', name: '实验防护服', slot: 'clothes', rarity: 'legendary', desc: '伤害与暴击微增', icon: 'assets/equip_coat.png', effect: { damageMul: 1.06, critMul: 1.1 } },
  { id: 'shoe_breeze', name: '胶底跑鞋', slot: 'shoes', rarity: 'common', desc: '移速 +6%', icon: 'assets/equip_shoes.png', effect: { speedMul: 1.06 } },
  { id: 'shoe_root', name: '防滑靴', slot: 'shoes', rarity: 'rare', desc: '移速 +10%，闪避感（残影）', icon: 'assets/equip_shoes.png', effect: { speedMul: 1.1, dashGhost: 1 } },
  { id: 'shoe_silk', name: '静音靴', slot: 'shoes', rarity: 'epic', desc: '移速 +8%，开局残影', icon: 'assets/equip_shoes.png', effect: { speedMul: 1.08, dashGhost: 1 } },
];

export function getGear(id) {
  return GEAR_ITEMS.find((g) => g.id === id) || null;
}

export function ensureGearSave(save) {
  if (!save.gear) save.gear = { weapon: null, hat: null, clothes: null, shoes: null };
  if (!save.inventory) save.inventory = {};
  // starter gear once
  if (!save._gearBootstrapped) {
    for (const id of ['wpn_staff', 'hat_moss', 'cloth_cloak', 'shoe_breeze']) {
      save.inventory[id] = (save.inventory[id] || 0) + 1;
    }
    save.gear.weapon = 'wpn_staff';
    save.gear.hat = 'hat_moss';
    save.gear.clothes = 'cloth_cloak';
    save.gear.shoes = 'shoe_breeze';
    if (!save.gearLevels) save.gearLevels = {};
    for (const id of ['wpn_staff', 'hat_moss', 'cloth_cloak', 'shoe_breeze']) {
      if (!save.gearLevels[id]) save.gearLevels[id] = 1;
    }
    if (!save.materials) save.materials = { scrap: 0, battery: 0, tape: 0, chip: 0 };
    save.materials.scrap = (save.materials.scrap || 0) + 6;
    save.coins = (save.coins || 0) + 80;
    save._gearBootstrapped = true;
  }
  return save;
}

export function equipGear(save, itemId) {
  ensureGearSave(save);
  const g = getGear(itemId);
  if (!g) return false;
  if (!(save.inventory[itemId] > 0)) return false;
  save.gear[g.slot] = itemId;
  return true;
}

export function unequipGearSlot(save, slot) {
  ensureGearSave(save);
  save.gear[slot] = null;
}

export function applyGearToPlayer(player, save) {
  ensureGearSave(save);
  const levels = save.gearLevels || {};
  // lazy import mul via inline table (avoid circular save import issues in some bundlers)
  const muls = [1, 1, 1.08, 1.16, 1.25, 1.35, 1.46, 1.58, 1.72, 1.88, 2.05];
  for (const slot of Object.keys(save.gear || {})) {
    const id = save.gear[slot];
    if (!id) continue;
    const g = getGear(id);
    if (!g) continue;
    const lv = levels[id] || 1;
    const mul = muls[Math.min(10, lv)] || 1;
    const e = g.effect || {};
    // scale percentage-like bonuses toward (bonus-1)*mul+1 for muls; flat bonuses * mul
    const scaleMul = (v) => 1 + (v - 1) * mul;
    if (e.damageMul) player.damage *= scaleMul(e.damageMul);
    if (e.speedMul) player.speed *= scaleMul(e.speedMul);
    if (e.hpMul) {
      player.maxHp = Math.round(player.maxHp * scaleMul(e.hpMul));
      player.hp = player.maxHp;
    }
    if (e.critChance) player.critChance = (player.critChance || 0.08) + e.critChance * mul;
    if (e.critMul) player.critChance = (player.critChance || 0.08) * scaleMul(e.critMul);
    if (e.critDamage) player.critDamage = (player.critDamage || 1.85) + e.critDamage * mul;
    if (e.frost) player.frost = (player.frost || 0) + e.frost * mul;
    if (e.thorns) player.thorns = (player.thorns || 0) + Math.round(e.thorns * mul);
    if (e.dashGhost) player.dashGhost = (player.dashGhost || 0) + e.dashGhost;
    if (e.fireMul) player.fireCooldown *= scaleMul(e.fireMul);
    if (e.shield) player.shield = (player.shield || 0) + e.shield;
    if (e.flatHp) {
      const add = Math.round(e.flatHp * mul);
      player.maxHp += add;
      player.hp = player.maxHp;
    }
    if (e.damageTakenMul) {
      player.damageTakenMul = (player.damageTakenMul || 1) * (1 + (e.damageTakenMul - 1) * mul);
    }
  }
}

/** Apply character stat bias onto a freshly created player */
export function applyCharacterToPlayer(player, charId) {
  const c = CHARACTERS.find((x) => x.id === charId) || CHARACTERS[0];
  const s = c.stats;
  player.damage *= s.damage;
  player.speed *= s.speed;
  player.maxHp = Math.round(player.maxHp * s.hp);
  player.hp = player.maxHp;
  player.critChance = (player.critChance || 0.08) * s.crit;
  player.charId = c.id;
  player.charTint = c.tint;
  return c;
}

/** Apply per-character level bonuses (1–30). Call after applyCharacterToPlayer. */
export function applyCharLevelToPlayer(player, save) {
  const lv = (save.charLevels && save.charLevels[player.charId]) || 1;
  const steps = Math.max(0, lv - 1);
  player.damage *= 1 + steps * 0.015;
  player.maxHp = Math.round(player.maxHp * (1 + steps * 0.02));
  player.hp = player.maxHp;
  player.critChance = Math.min(0.55, (player.critChance || 0.08) + steps * 0.003);
  player.charLevel = lv;
}


export const CHARM_MAX_STARS = 5;

export function applyPassivesToPlayer(player, equippedIds, inventory) {
  const owned = inventory || {};
  for (const id of equippedIds || []) {
    if (!owned[id]) continue;
    const item = PASSIVE_ITEMS.find((p) => p.id === id);
    if (!item) continue;
    // duplicates from gacha stack the charm up to ★5 (+25% effect per star)
    const k = 1 + 0.25 * (Math.min(CHARM_MAX_STARS, owned[id]) - 1);
    const e = {};
    for (const [key, v] of Object.entries(item.effect)) {
      e[key] = (key === 'damageMul' || key === 'speedMul') ? 1 + (v - 1) * k
        : key === 'shield' ? v : v * k;
    }
    if (e.xpBonus) player.xpBonus = (player.xpBonus || 1) + e.xpBonus;
    if (e.coinBonus) player.coinBonus = (player.coinBonus || 1) + e.coinBonus;
    if (e.critChance) player.critChance = (player.critChance || 0.08) + e.critChance;
    if (e.shield) player.shield = (player.shield || 0) + e.shield;
    if (e.frost) player.frost = (player.frost || 0) + e.frost;
    if (e.thorns) player.thorns = (player.thorns || 0) + e.thorns;
    if (e.damageMul) player.damage *= e.damageMul;
    if (e.speedMul) player.speed *= e.speedMul;
  }
}

export function isCharUnlocked(save, charId) {
  const c = CHARACTERS.find((x) => x.id === charId);
  if (!c) return false;
  if (c.unlock.type === 'default') return true;
  if ((save.unlockedChars || []).includes(charId)) return true;
  if (c.unlock.type === 'stage') {
    return !!(save.stagesCleared && save.stagesCleared[c.unlock.stageId]);
  }
  return false;
}

export function unlockChar(save, charId) {
  if (!save.unlockedChars) save.unlockedChars = ['grin'];
  if (!save.unlockedChars.includes(charId)) save.unlockedChars.push(charId);
  unlockGallery(save, `char_${charId}`);
}

export function unlockGallery(save, id) {
  if (!save.gallery) save.gallery = {};
  if (!save.gallery[id]) {
    save.gallery[id] = true;
    return true;
  }
  return false;
}

export function galleryCount(save) {
  return Object.keys(save.gallery || {}).filter((k) => save.gallery[k]).length;
}

/** Gacha pool entry */
const GACHA_POOL = [
  { type: 'coins', amount: 30, weight: 28, rarity: 'common', label: '金币 ×30' },
  { type: 'coins', amount: 80, weight: 16, rarity: 'rare', label: '金币 ×80' },
  { type: 'diamonds', amount: 5, weight: 18, rarity: 'common', label: '钻石 ×5' },
  { type: 'diamonds', amount: 15, weight: 8, rarity: 'rare', label: '钻石 ×15' },
  { type: 'item', itemId: 'charm_coin', weight: 10, rarity: 'common', label: '清点账本' },
  { type: 'item', itemId: 'charm_xp', weight: 8, rarity: 'rare', label: '培训工牌' },
  { type: 'item', itemId: 'charm_frost', weight: 6, rarity: 'rare', label: '冰袋挂件' },
  { type: 'item', itemId: 'charm_crit', weight: 4, rarity: 'epic', label: '精密螺丝' },
  { type: 'item', itemId: 'charm_shield', weight: 4, rarity: 'epic', label: '防割背心片' },
  { type: 'item', itemId: 'charm_thorn', weight: 5, rarity: 'rare', label: '铁丝环' },
  { type: 'item', itemId: 'charm_legend', weight: 1.2, rarity: 'legendary', label: '设施通行证' },
  { type: 'char', charId: 'janitor', weight: 3, rarity: 'epic', label: '清洁阿姨碎片' },
  { type: 'char', charId: 'intern', weight: 1, rarity: 'legendary', label: '实习生碎片' },
  { type: 'shards', charId: 'janitor', amount: 1, weight: 7, rarity: 'rare', label: '清洁阿姨碎片 ×1' },
  { type: 'shards', charId: 'intern', amount: 1, weight: 3, rarity: 'epic', label: '实习生碎片 ×1' },
  { type: 'gear', itemId: 'wpn_moonblade', weight: 4, rarity: 'rare', label: '改装钉枪' },
  { type: 'gear', itemId: 'hat_moss', weight: 5, rarity: 'common', label: '安全帽' },
  { type: 'gear', itemId: 'hat_crown', weight: 2, rarity: 'epic', label: '战术耳罩' },
  { type: 'gear', itemId: 'cloth_stone', weight: 3, rarity: 'rare', label: '防暴背心' },
  { type: 'gear', itemId: 'shoe_root', weight: 3, rarity: 'rare', label: '防滑靴' },
  { type: 'gear', itemId: 'shoe_breeze', weight: 5, rarity: 'common', label: '胶底跑鞋' },
];

function pickWeighted(pool) {
  let t = 0;
  for (const p of pool) t += p.weight;
  let r = Math.random() * t;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

/**
 * Roll gacha. Mutates save. Returns result object for UI.
 * pity: every 10 pulls without epic+ guarantees epic item.
 */
export function rollGacha(save) {
  if (!save.pity) save.pity = 0;
  if (!save.inventory) save.inventory = {};
  if (!save.shards) save.shards = {};
  if (!save.unlockedChars) save.unlockedChars = ['grin'];

  // Affinity: things you already own (and can still level) roll more often → max out fast
  const gl = save.gearLevels || {};
  let pool = GACHA_POOL.map((p) => {
    let w = p.weight;
    if (p.type === 'gear' && save.inventory[p.itemId] > 0 && (gl[p.itemId] || 1) < 10) w *= 2.2;
    if (p.type === 'item' && save.inventory[p.itemId] > 0 && save.inventory[p.itemId] < CHARM_MAX_STARS) w *= 2;
    if (p.type === 'shards' && (save.shards[p.charId] || 0) > 0 && !isCharUnlocked(save, p.charId)) w *= 1.6;
    return w === p.weight ? p : { ...p, weight: w };
  });
  let forced = null;
  if (save.pity >= 9) {
    forced = pool.filter((p) => p.rarity === 'epic' || p.rarity === 'legendary');
  }
  const entry = pickWeighted(forced && forced.length ? forced : pool);
  const isHigh = entry.rarity === 'epic' || entry.rarity === 'legendary';
  save.pity = isHigh ? 0 : (save.pity + 1);

  const result = {
    type: entry.type,
    rarity: entry.rarity,
    label: entry.label,
    detail: '',
  };

  if (entry.type === 'coins') result.icon = 'assets/icon_coin.png';
  if (entry.type === 'diamonds') result.icon = 'assets/icon_diamond.png';
  if (entry.type === 'char' || entry.type === 'shards') result.icon = `assets/char_${entry.charId}.png`;

  if (entry.type === 'coins') {
    save.coins = (save.coins || 0) + entry.amount;
    result.detail = `+${entry.amount} 金币`;
  } else if (entry.type === 'diamonds') {
    save.diamonds = (save.diamonds || 0) + entry.amount;
    result.detail = `+${entry.amount} 钻石`;
  } else if (entry.type === 'item') {
    const had = save.inventory[entry.itemId] || 0;
    save.inventory[entry.itemId] = had + 1;
    const item = PASSIVE_ITEMS.find((i) => i.id === entry.itemId);
    const stars = Math.min(CHARM_MAX_STARS, had + 1);
    result.icon = 'assets/chest_upgrade.png';
    if (had > 0) {
      result.dup = true;
      result.detail = stars >= CHARM_MAX_STARS && had >= CHARM_MAX_STARS
        ? `${item ? item.name : entry.label} 已满星，折合金币 +40`
        : `重复！${item ? item.name : entry.label} 升至 ★${stars}`;
      if (had >= CHARM_MAX_STARS) save.coins = (save.coins || 0) + 40;
    } else {
      result.detail = item ? `获得挂件：${item.name}（装备栏佩戴）` : entry.label;
    }
    unlockGallery(save, entry.itemId === 'charm_crit' ? 'item_crit' : entry.itemId === 'charm_frost' ? 'item_frost' : entry.itemId === 'charm_shield' ? 'item_shield' : 'item_chest');
  } else if (entry.type === 'gear') {
    const had = save.inventory[entry.itemId] || 0;
    save.inventory[entry.itemId] = had + 1;
    const g = GEAR_ITEMS.find((i) => i.id === entry.itemId);
    result.icon = g && g.icon;
    if (!save.gearLevels) save.gearLevels = {};
    if (had > 0) {
      // duplicate gear = free enhance (+1 level, max 10)
      const lv = save.gearLevels[entry.itemId] || 1;
      result.dup = true;
      if (lv < 10) {
        save.gearLevels[entry.itemId] = lv + 1;
        result.detail = `重复！${g ? g.name : entry.label} 免费强化 → Lv.${lv + 1}`;
      } else {
        save.coins = (save.coins || 0) + 60;
        result.detail = `${g ? g.name : entry.label} 已满级，折合金币 +60`;
      }
    } else {
      save.gearLevels[entry.itemId] = save.gearLevels[entry.itemId] || 1;
      result.detail = g ? `获得装备：${g.name}` : entry.label;
    }
  } else if (entry.type === 'char') {
    if (!isCharUnlocked(save, entry.charId)) {
      unlockChar(save, entry.charId);
      result.detail = `解锁角色：${CHARACTERS.find((c) => c.id === entry.charId)?.name || entry.charId}`;
    } else {
      save.shards[entry.charId] = (save.shards[entry.charId] || 0) + 3;
      result.detail = `已拥有，折合碎片 ×3`;
    }
  } else if (entry.type === 'shards') {
    save.shards[entry.charId] = (save.shards[entry.charId] || 0) + (entry.amount || 1);
    const need = entry.charId === 'intern' ? 10 : 5;
    result.detail = `碎片 ${save.shards[entry.charId]}/${need}`;
    if (save.shards[entry.charId] >= need && !isCharUnlocked(save, entry.charId)) {
      unlockChar(save, entry.charId);
      result.detail += ` → 解锁角色！`;
    }
  }

  save.gachaCount = (save.gachaCount || 0) + 1;
  return result;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function canFreeGacha(save) {
  return save.freeGachaDay !== todayKey();
}

export function markFreeGacha(save) {
  save.freeGachaDay = todayKey();
}

export function randomDeathLine() {
  return DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
}

export function maybeEggToast() {
  if (Math.random() < 0.12) return TOAST_EGGS[Math.floor(Math.random() * TOAST_EGGS.length)];
  return null;
}

/** Daily quest definitions */
export const DAILY_QUESTS = [
  { id: 'kill30', name: '清剿日常', desc: '击杀 30 只敌人', target: 30, stat: 'kills', reward: { coins: 40 } },
  { id: 'survive60', name: '坚持一分钟', desc: '单局存活 60 秒', target: 60, stat: 'time', reward: { diamonds: 8 } },
  { id: 'combo8', name: '连击达人', desc: '单局连击达到 8', target: 8, stat: 'combo', reward: { coins: 25, diamonds: 3 } },
];

export function ensureDailyQuest(save) {
  const day = todayKey();
  if (save.dailyQuestDay === day && save.dailyQuest) return save.dailyQuest;
  const q = DAILY_QUESTS[Math.floor(Math.random() * DAILY_QUESTS.length)];
  save.dailyQuestDay = day;
  save.dailyQuest = { ...q, progress: 0, claimed: false };
  return save.dailyQuest;
}

export function updateDailyQuest(save, runStats) {
  const q = ensureDailyQuest(save);
  if (q.claimed) return;
  let v = 0;
  if (q.stat === 'kills') v = runStats.kills || 0;
  if (q.stat === 'time') v = Math.floor(runStats.time || 0);
  if (q.stat === 'combo') v = runStats.maxCombo || 0;
  q.progress = Math.max(q.progress || 0, Math.min(q.target, v));
}

export function claimDailyQuest(save) {
  const q = ensureDailyQuest(save);
  if (q.claimed || (q.progress || 0) < q.target) return null;
  q.claimed = true;
  if (q.reward.coins) save.coins = (save.coins || 0) + q.reward.coins;
  if (q.reward.diamonds) save.diamonds = (save.diamonds || 0) + q.reward.diamonds;
  return q.reward;
}

/** Gallery milestone: unlock 10 → diamonds */
export function checkGalleryMilestone(save) {
  const n = galleryCount(save);
  if (n >= 10 && !save.galleryMilestone10) {
    save.galleryMilestone10 = true;
    save.diamonds = (save.diamonds || 0) + 20;
    unlockGallery(save, 'milestone_10');
    return { diamonds: 20, msg: '展厅里程碑！收藏 10 项，钻石 +20' };
  }
  return null;
}
