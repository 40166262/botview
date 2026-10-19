/**
 * Meta layer: characters, gallery, gacha, inventory, daily quest, funny lines.
 */

export const CHARACTERS = [
  {
    id: 'grin',
    name: '星火射手',
    desc: '均衡枪手。冲锋枪手感起步。',
    icon: '', unlock: { type: 'default' },
    tint: '#4a6a9a',
    stats: { damage: 1, speed: 1, hp: 1, crit: 1 },
    flavor: '「笑着开枪比较准。」',
    sprite: 'cool',
  },
  {
    id: 'medic',
    name: '星铠机甲',
    desc: '厚甲生存向。生命高，火力稳。',
    icon: '', unlock: { type: 'stage', stageId: 's1' },
    tint: '#e09050',
    stats: { damage: 0.95, speed: 0.92, hp: 1.35, crit: 0.9 },
    flavor: '「装甲合上，开始清场。」',
    sprite: 'mecha',
  },
  {
    id: 'janitor',
    name: '影紫女忍',
    desc: '近战清场。扇形范围伤害。',
    icon: '', unlock: { type: 'gacha' },
    coinCost: 120,
    tint: '#7a4a9a',
    stats: { damage: 1.15, speed: 1.05, hp: 1.1, crit: 1.05 },
    flavor: '「无声无息，一刀两断。」',
    sprite: 'kunoichi',
  },
  {
    id: 'intern',
    name: '夜行男忍',
    desc: '暴击/爆发向。钉枪起步，暴击高。',
    icon: '', unlock: { type: 'gacha', rarity: 'legendary' },
    tint: '#3a2a5a',
    stats: { damage: 1.05, speed: 1.18, hp: 0.9, crit: 1.55 },
    flavor: '「合同没写要打怪啊……还是打吧。」',
    sprite: 'ninja',
  },
  {
    id: 'belle',
    name: '星光偶像',
    desc: '辅助输出向。移速快，暴击漂亮。',
    icon: '', unlock: { type: 'gacha' },
    coinCost: 180,
    tint: '#e878a8',
    stats: { damage: 1.08, speed: 1.12, hp: 0.95, crit: 1.25 },
    flavor: '「安可！再清一波！」',
    sprite: 'belle',
  },
  {
    id: 'mechgirl',
    name: '扳手机娘',
    desc: '工程火力向。伤害稳，开箱手气好。',
    icon: '', unlock: { type: 'gacha' },
    coinCost: 150,
    tint: '#e8a040',
    stats: { damage: 1.12, speed: 1.0, hp: 1.15, crit: 1.0 },
    flavor: '「坏了就修，怪也一样。」',
    sprite: 'mechgirl',
  },
];

export const GALLERY = [
  { id: 'enemy_slime', kind: 'enemy', name: '绿皮丧尸', icon: '', flavor: '工牌还挂着，脑子不太行。' },
  { id: 'enemy_bat', kind: 'enemy', name: '爬行患者', icon: '', flavor: '病房跑出来的，贴地超快。' },
  { id: 'enemy_beetle', kind: 'enemy', name: '铠甲尸', icon: '', flavor: '防暴服穿反了也照样扛揍。' },
  { id: 'enemy_wisp', kind: 'enemy', name: '故障监视器', icon: '', flavor: '屏幕雪花一闪，就开始远程放电。' },
  { id: 'enemy_golem', kind: 'enemy', name: '重装保安', icon: '', flavor: '全套护甲加身，下班了还在巡逻。' },
  { id: 'enemy_shadow', kind: 'enemy', name: '阴影潜伏者', icon: '', flavor: '贴墙滑行，你眨眼它就换了个工位。' },
  { id: 'enemy_boss', kind: 'enemy', name: '设施霸主', icon: '', flavor: '开会从不迟到，溃烂除外。' },
  { id: 'enemy_elite', kind: 'enemy', name: '精英变异体', icon: '', flavor: '身上镀了层假金，气场却是真的。' },
  { id: 'enemy_slacker', kind: 'enemy', name: '摸鱼丧尸', icon: '', flavor: '抱着公文包到处跑，抓住它奖金翻倍。' },
  { id: 'enemy_secret', kind: 'enemy', name: '失控安保影', icon: '', flavor: '连击过高时才冒出来的故障投影。' },
  { id: 'char_grin', kind: 'char', name: '星火射手', icon: '', flavor: '初始搭子，永不背刺。' },
  { id: 'char_medic', kind: 'char', name: '星铠机甲', icon: '', flavor: '星纹装甲合上！' },
  { id: 'char_janitor', kind: 'char', name: '影紫女忍', icon: '', flavor: '影里见。' },
  { id: 'char_belle', kind: 'char', name: '星光偶像', icon: '', flavor: '安可！' },
  { id: 'char_mechgirl', kind: 'char', name: '扳手机娘', icon: '', flavor: '修好再打。' },
  { id: 'char_intern', kind: 'char', name: '夜行男忍', icon: '', flavor: '传说中的欧皇本皇（运气向）。' },
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
  common: '#7d8a62',
  rare: '#c47a32',
  epic: '#e0b050',
  legendary: '#d4654a',
};

/** Sheet cell for passive charms — same 5×5 upgrade icon language as battle cards. */
export const CHARM_ICON_CELL = {
  charm_xp: 4,
  charm_coin: 14,
  charm_crit: 8,
  charm_shield: 11,
  charm_frost: 13,
  charm_thorn: 12,
  charm_legend: 1,
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
  '提示：故障监视器其实怕水。',
  '有人在图鉴里偷偷摆了假工牌。',
  '今日运势：适合抽卡，不适合硬刚 Boss。',
  '丧尸申请加入影紫女忍粉丝群。',
  '金色箱不是幻觉，第1关就会砸下来。',
  '摸鱼丧尸抱着公文包跑——抓住有奖金。',
  '连击冲上去，有时会触发「狂热」。',
  '第5关首领苏醒前，先锋队会先敲门。',
  '过载协议启动时，跑位也在发光。',
];



/** Gear slots: weapon / hat / clothes / shoes */
export const GEAR_SLOTS = [
  { id: 'weapon', name: '武器' },
  { id: 'hat', name: '帽子' },
  { id: 'clothes', name: '衣服' },
  { id: 'shoes', name: '鞋子' },
];

export const GEAR_ITEMS = [
  { id: 'wpn_staff', name: '应急冲锋枪', slot: 'weapon', rarity: 'common', desc: '伤害 +8%，连珠短点射', icon: 'assets/equip_weapon.png', effect: { damageMul: 1.08 } },
  { id: 'wpn_moonblade', name: '改装钉枪', slot: 'weapon', rarity: 'rare', desc: '伤害 +5%，慢钉更沉', icon: 'assets/equip_weapon.png', effect: { damageMul: 1.05 } },
  { id: 'wpn_spore', name: '化学喷射器', slot: 'weapon', rarity: 'epic', desc: '三发扇面，附带减速', icon: 'assets/equip_weapon.png', effect: { frost: 0.06 } },
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

/**
 * Equipped-weapon silhouette. The damage multiplier matches the cooldown
 * change, so the listed gear bonus stays the DPS change.
 */
function applyWeaponFeel(player, id) {
  player.weaponId = id;
  if (id === 'wpn_staff') {
    player.fireCooldown *= 0.72;
    player.shotDamageMul *= 0.72;
    player.shotStyle = 'bullet';
    player.shotSpeed = 430;
    player.shotStreak = 16;
    player.spread = Math.min(player.spread, 0.07);
  } else if (id === 'wpn_moonblade') {
    player.fireCooldown *= 1.42;
    player.shotDamageMul *= 1.42;
    player.shotStyle = 'nail';
    player.shotSpeed = 520;
    player.shotScale *= 1.38;
    player.shotStreak = 8;
    player.shotKnock = 72;
    player.spread = Math.min(player.spread, 0.05);
  } else if (id === 'wpn_spore') {
    player.fireCooldown *= 1.28;
    player.projectiles += 2;
    player.spread = 0.42;
    player.shotStyle = 'chem';
    player.shotSpeed = 270;
    player.shotScale *= 1.22;
    player.shotStreak = 16;
    player.pelletMul *= 0.48;
  }
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
    if (g.slot === 'weapon') applyWeaponFeel(player, id);
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

export function shardNeed(charId) {
  return charId === 'intern' ? 10 : 5;
}

/** One warm line for a locked character card. Empty when they can already deploy. */
export function charLockLine(save, charId) {
  const c = CHARACTERS.find((x) => x.id === charId);
  if (!c || isCharUnlocked(save, c.id)) return '';
  if (c.unlock.type === 'stage') return '通关第 1 关解锁';
  const have = (save.shards && save.shards[c.id]) || 0;
  const need = shardNeed(c.id);
  if (c.id === 'janitor') return `${c.coinCost || 120} 金币或碎片 ${have}/${need}`;
  if (c.id === 'intern') return `传说抽奖 · 碎片 ${have}/${need}`;
  if (c.coinCost) return `${c.coinCost} 金币解锁`;
  return '抽奖解锁';
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
  { type: 'char', charId: 'janitor', weight: 3, rarity: 'epic', label: '影紫女忍碎片' },
  { type: 'char', charId: 'belle', weight: 2, rarity: 'epic', label: '星光偶像碎片' },
  { type: 'char', charId: 'mechgirl', weight: 2, rarity: 'epic', label: '扳手机娘碎片' },
  { type: 'char', charId: 'intern', weight: 1, rarity: 'legendary', label: '夜行男忍碎片' },
  { type: 'shards', charId: 'janitor', amount: 1, weight: 7, rarity: 'rare', label: '影紫女忍碎片 ×1' },
  { type: 'shards', charId: 'belle', amount: 1, weight: 5, rarity: 'rare', label: '星光偶像碎片 ×1' },
  { type: 'shards', charId: 'mechgirl', amount: 1, weight: 5, rarity: 'rare', label: '扳手机娘碎片 ×1' },
  { type: 'shards', charId: 'intern', amount: 1, weight: 3, rarity: 'epic', label: '夜行男忍碎片 ×1' },
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
    name: entry.label,
    line: '',
    detail: '',
  };
  const who = (id) => CHARACTERS.find((c) => c.id === id);

  if (entry.type === 'coins') {
    result.icon = 'assets/icon_coin.png';
    result.name = `金币 ×${entry.amount}`;
    save.coins = (save.coins || 0) + entry.amount;
    result.line = '放进钱包啦';
  } else if (entry.type === 'diamonds') {
    result.icon = 'assets/icon_diamond.png';
    result.name = `钻石 ×${entry.amount}`;
    save.diamonds = (save.diamonds || 0) + entry.amount;
    result.line = '亮晶晶的补给';
  } else if (entry.type === 'item') {
    const had = save.inventory[entry.itemId] || 0;
    save.inventory[entry.itemId] = had + 1;
    const item = PASSIVE_ITEMS.find((i) => i.id === entry.itemId);
    const stars = Math.min(CHARM_MAX_STARS, had + 1);
    result.name = item ? item.name : entry.label;
    result.sheet = CHARM_ICON_CELL[entry.itemId];
    if (had > 0) {
      result.dup = true;
      result.line = had >= CHARM_MAX_STARS ? '已满星，折合金币 +40' : `升至 ★${stars}`;
      if (had >= CHARM_MAX_STARS) save.coins = (save.coins || 0) + 40;
    } else {
      result.line = item ? item.desc : entry.label;
    }
    unlockGallery(save, entry.itemId === 'charm_crit' ? 'item_crit' : entry.itemId === 'charm_frost' ? 'item_frost' : entry.itemId === 'charm_shield' ? 'item_shield' : 'item_chest');
  } else if (entry.type === 'gear') {
    const had = save.inventory[entry.itemId] || 0;
    save.inventory[entry.itemId] = had + 1;
    const g = GEAR_ITEMS.find((i) => i.id === entry.itemId);
    result.icon = g && g.icon;
    result.name = g ? g.name : entry.label;
    if (!save.gearLevels) save.gearLevels = {};
    if (had > 0) {
      // duplicate gear = free enhance (+1 level, max 10)
      const lv = save.gearLevels[entry.itemId] || 1;
      result.dup = true;
      if (lv < 10) {
        save.gearLevels[entry.itemId] = lv + 1;
        result.line = `免费强化到 Lv.${lv + 1}`;
      } else {
        save.coins = (save.coins || 0) + 60;
        result.line = '已满级，折合金币 +60';
      }
    } else {
      save.gearLevels[entry.itemId] = save.gearLevels[entry.itemId] || 1;
      result.line = g ? g.desc : entry.label;
    }
  } else if (entry.type === 'char') {
    const c = who(entry.charId);
    result.name = c ? c.name : entry.label;
    result.portrait = `assets/char_${entry.charId}_full.png`;
    if (!isCharUnlocked(save, entry.charId)) {
      unlockChar(save, entry.charId);
      result.line = c ? c.flavor : '新伙伴到手';
    } else {
      save.shards[entry.charId] = (save.shards[entry.charId] || 0) + 3;
      result.owned = true;
      result.line = '已拥有，折成碎片 ×3';
    }
  } else if (entry.type === 'shards') {
    const c = who(entry.charId);
    result.name = c ? `${c.name}碎片` : entry.label;
    result.portrait = `assets/char_${entry.charId}_full.png`;
    save.shards[entry.charId] = (save.shards[entry.charId] || 0) + (entry.amount || 1);
    const need = shardNeed(entry.charId);
    const have = save.shards[entry.charId];
    result.line = `碎片 ${have}/${need}`;
    if (have >= need && !isCharUnlocked(save, entry.charId)) {
      unlockChar(save, entry.charId);
      result.line = '碎片够啦，可以出战';
    }
  }

  result.detail = result.line;
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

/**
 * Three short dailies, refreshed each calendar day.
 * `short` is the home-chip label. Rewards stay small.
 */
export const DAILY_POOL = [
  { id: 'clear1', name: '通关一关', short: '通关', desc: '通关 1 个章节', target: 1, stat: 'clears', reward: { coins: 30, diamonds: 2 } },
  { id: 'crates3', name: '开箱补给', short: '开箱', desc: '打开 3 个物资箱', target: 3, stat: 'crates', reward: { coins: 28 } },
  { id: 'kill18', name: '清剿日常', short: '击杀', desc: '击杀 18 只敌人', target: 18, stat: 'kills', reward: { coins: 24, diamonds: 1 } },
];

/** @deprecated alias — callers should use the board from ensureDailyQuests */
export const DAILY_QUESTS = DAILY_POOL;

function freshBoard() {
  return DAILY_POOL.map((src) => ({ ...src, progress: 0, claimed: false }));
}

function focusQuest(board) {
  return board.find((q) => !q.claimed) || board[0];
}

/**
 * Today's three dailies. Migrates an in-progress single `dailyQuest`
 * from older saves so a half-done task is not thrown away.
 */
export function ensureDailyQuests(save) {
  const day = todayKey();
  if (save.dailyQuestDay === day && Array.isArray(save.dailyQuests) && save.dailyQuests.length === 3) {
    save.dailyQuest = focusQuest(save.dailyQuests);
    return save.dailyQuests;
  }
  const carried = (save.dailyQuestDay === day && save.dailyQuest && save.dailyQuest.id)
    ? save.dailyQuest
    : null;
  const board = freshBoard();
  if (carried) {
    const hit = board.find((q) => q.id === carried.id);
    const progress = Math.min(carried.target || 0, carried.progress || 0);
    if (hit) {
      hit.progress = Math.min(hit.target, progress);
      hit.claimed = !!carried.claimed;
    } else {
      const src = DAILY_POOL.find((q) => q.id === carried.id);
      board[2] = {
        ...(src || carried),
        id: carried.id,
        name: (src && src.name) || carried.name,
        short: (src && src.short) || carried.short || carried.name,
        desc: (src && src.desc) || carried.desc,
        target: (src && src.target) || carried.target,
        stat: (src && src.stat) || carried.stat,
        reward: (src && src.reward) || carried.reward || {},
        progress: Math.min((src && src.target) || carried.target || 0, progress),
        claimed: !!carried.claimed,
      };
    }
  }
  save.dailyQuestDay = day;
  save.dailyQuests = board;
  save.dailyQuest = focusQuest(board);
  save._dailyRun = null;
  return board;
}

export function ensureDailyQuest(save) {
  return focusQuest(ensureDailyQuests(save));
}

export function updateDailyQuest(save, runStats) {
  const board = ensureDailyQuests(save);
  const stats = runStats || {};
  const runId = stats.runId != null ? String(stats.runId) : '';
  if (!save._dailyRun || save._dailyRun.id !== runId) {
    save._dailyRun = { id: runId, kills: 0, crates: 0, clears: 0 };
  }
  const prev = save._dailyRun;
  const kills = stats.kills || 0;
  const crates = stats.crates || 0;
  const clears = stats.cleared ? 1 : 0;
  const dKills = Math.max(0, kills - (prev.kills || 0));
  const dCrates = Math.max(0, crates - (prev.crates || 0));
  const dClears = Math.max(0, clears - (prev.clears || 0));
  prev.kills = Math.max(prev.kills || 0, kills);
  prev.crates = Math.max(prev.crates || 0, crates);
  prev.clears = Math.max(prev.clears || 0, clears);
  const time = Math.floor(stats.time || 0);
  const combo = stats.maxCombo || 0;

  for (const q of board) {
    if (q.claimed) continue;
    if (q.stat === 'kills') q.progress = Math.min(q.target, (q.progress || 0) + dKills);
    else if (q.stat === 'crates') q.progress = Math.min(q.target, (q.progress || 0) + dCrates);
    else if (q.stat === 'clears') q.progress = Math.min(q.target, (q.progress || 0) + dClears);
    else if (q.stat === 'time') q.progress = Math.max(q.progress || 0, Math.min(q.target, time));
    else if (q.stat === 'combo') q.progress = Math.max(q.progress || 0, Math.min(q.target, combo));
  }
  save.dailyQuest = focusQuest(board);
}

/** Claims the first finished daily. Returns the reward plus the quest name, or null. */
export function claimDailyQuest(save) {
  const board = ensureDailyQuests(save);
  const q = board.find((item) => !item.claimed && (item.progress || 0) >= item.target);
  if (!q) return null;
  q.claimed = true;
  const reward = q.reward || {};
  if (reward.coins) save.coins = (save.coins || 0) + reward.coins;
  if (reward.diamonds) save.diamonds = (save.diamonds || 0) + reward.diamonds;
  save.dailyQuest = focusQuest(board);
  return { ...reward, name: q.name };
}

function earnedAchievements(save) {
  const cleared = Object.keys(save.stagesCleared || {}).filter((id) => save.stagesCleared[id] && id !== 'endless').length;
  const out = [];
  const add = (id, name, desc, ok) => { if (ok) out.push({ id, name, desc }); };
  add('first_clear', '初次撤离', '成功撤离一个章节', cleared >= 1);
  add('clear_5', '深入设施', '累计通关 5 章', cleared >= 5);
  add('clear_10', '设施熟客', '累计通关 10 章', cleared >= 10);
  add('clear_25', '层层下探', '累计通关 25 章', cleared >= 25);
  add('lv_5', '见习撤离员', '撤离员达到 5 级', (save.playerLevel || 1) >= 5);
  add('lv_10', '正式撤离员', '撤离员达到 10 级', (save.playerLevel || 1) >= 10);
  add('lv_20', '资深撤离员', '撤离员达到 20 级', (save.playerLevel || 1) >= 20);
  add('combo_10', '连击手感', '最高连击达到 10', (save.maxComboBest || 0) >= 10);
  add('combo_25', '手没停过', '最高连击达到 25', (save.maxComboBest || 0) >= 25);
  add('kills_30', '清场起步', '单局击杀达到 30', (save.bestKills || 0) >= 30);
  add('kills_100', '清场百人', '单局击杀达到 100', (save.bestKills || 0) >= 100);
  add('gallery_10', '图鉴启程', '图鉴解锁 10 项', galleryCount(save) >= 10);
  return out;
}

/**
 * First call after this build records already-earned achievements silently
 * so old saves do not get a toast burst. Later calls return newly earned ones.
 */
export function takeNewAchievements(save) {
  save.achievements = save.achievements || {};
  const earned = earnedAchievements(save);
  if (!save.achievementsSeeded) {
    for (const a of earned) save.achievements[a.id] = true;
    save.achievementsSeeded = true;
    return [];
  }
  const fresh = [];
  for (const a of earned) {
    if (!save.achievements[a.id]) {
      save.achievements[a.id] = true;
      fresh.push(a);
    }
  }
  if (!fresh.length) return [];
  if (fresh.length === 1) return fresh;
  const names = fresh.map((a) => a.name);
  const desc = names.length <= 3 ? names.join(' · ') : `${names.slice(0, 3).join(' · ')} 等`;
  return [{ id: 'batch', name: `新成就 ×${fresh.length}`, desc }];
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
