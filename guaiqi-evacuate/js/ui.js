import { formatTime } from './save.js';
import { STAGES, ENDLESS, isStageUnlocked, stageLockReason, allStagesIncludingEndless, STAGE_COUNT } from './stages.js';
import {
  CHARACTERS, GALLERY, PASSIVE_ITEMS, RARITY_LABEL, RARITY_COLOR,
  isCharUnlocked, galleryCount, ensureDailyQuest, canFreeGacha,
  GEAR_SLOTS, GEAR_ITEMS, getGear, ensureGearSave, equipGear,
} from './meta.js';
import { getIconCell, getCharSprite, getChestImage, getUiIcon } from './sprites.js';
import { rarityMeta as upRarity } from './upgrades.js';

export function $(id) { return document.getElementById(id); }
export function show(el) {
  if (typeof el === 'string') el = $(el);
  el.classList.remove('hidden');
}
export function hide(el) {
  if (typeof el === 'string') el = $(el);
  el.classList.add('hidden');
}

export function setLoadingProgress(p) {
  const pct = Math.max(0, Math.min(100, Math.floor(p)));
  $('load-bar').style.width = pct + '%';
  $('load-text').textContent = `加载中… ${pct}%`;
}

export function refreshHomeStats(save) {
  ensureGearSave(save);
  $('best-time').textContent = formatTime(save.bestTime);
  $('best-kills').textContent = String(save.bestKills || 0);
  $('best-combo').textContent = String(save.maxComboBest || 0);
  $('meta-coins').textContent = String(save.coins || 0);
  $('meta-diamonds').textContent = String(save.diamonds || 0);
  $('chk-sound').checked = !!save.sound;
  const lvEl = $('meta-player-lv');
  if (lvEl) lvEl.textContent = `撤离员 Lv.${save.playerLevel || 1}`;

  const gift = $('daily-gift');
  const dot = $('hub-gacha-dot');
  if (canFreeGacha(save)) { show(gift); if (dot) show(dot); } else { hide(gift); if (dot) hide(dot); }
  const playLabel = $('btn-play-label');
  if (playLabel) {
    let n = 1;
    for (const st of STAGES) if (isStageUnlocked(save, st.id)) n = st.stageNum;
    playLabel.textContent = `开始撤离 · 第${n}关`;
  }

  const q = ensureDailyQuest(save);
  const chip = $('daily-quest-chip');
  if (q) {
    const done = (q.progress || 0) >= q.target;
    chip.textContent = done && !q.claimed
      ? `日常完成！点击领取奖励`
      : q.claimed
        ? `日常已领 · ${q.name}`
        : `${q.name}：${q.progress || 0}/${q.target} · ${q.desc}`;
    chip.classList.toggle('ready', done && !q.claimed);
  }

  // 首页英雄全身立绘 + 穿戴装备图
  const hero = $('home-hero-art');
  if (hero) {
    const cid = save.selectedChar || 'grin';
    const map = {
      grin: 'assets/char_grin_full.png',
      medic: 'assets/char_medic_full.png',
      janitor: 'assets/char_janitor_full.png',
      intern: 'assets/char_intern_full.png',
    };
    hero.src = map[cid] || map.grin;
  }
  const loadout = $('home-loadout');
  if (loadout) {
    loadout.innerHTML = '';
    const gear = save.gear || {};
    const order = ['weapon', 'hat', 'clothes', 'shoes'];
    const fallback = {
      weapon: 'assets/equip_weapon.png',
      hat: 'assets/equip_hat.png',
      clothes: 'assets/equip_coat.png',
      shoes: 'assets/equip_shoes.png',
    };
    for (const slot of order) {
      const id = gear[slot];
      const g = id ? getGear(id) : null;
      const img = document.createElement('img');
      img.src = (g && g.icon) || fallback[slot];
      img.alt = g ? g.name : slot;
      img.title = g ? g.name : '未装备';
      img.style.opacity = g ? '1' : '0.45';
      loadout.appendChild(img);
    }
  }
}

export function updateHud(data) {
  const hpPct = Math.max(0, (data.hp / data.maxHp) * 100);
  $('hp-bar').style.width = hpPct + '%';
  const xpPct = Math.max(0, (data.xp / data.xpToNext) * 100);
  $('xp-bar').style.width = xpPct + '%';
  $('hud-time').textContent = formatTime(data.time);
  $('hud-kills').textContent = `击杀 ${data.kills}`;
  $('hud-lv').textContent = `Lv.${data.level}`;
  if (data.stageName) $('hud-stage').textContent = data.stageName;
  if (data.wave) $('hud-wave').textContent = data.wave;
  if (data.progress != null) $('clear-bar').style.width = (data.progress * 100) + '%';

  const combo = $('hud-combo');
  if (data.combo >= 2) {
    combo.textContent = `×${data.combo}`;
    show(combo);
  } else hide(combo);

  const sh = $('hud-shield');
  if (data.shield > 0) { sh.textContent = `盾×${data.shield}`; show(sh); }
  else hide(sh);
}

export function showUpgradeCards(choices, onPick, owned = {}, opts = {}) {
  const wrap = $('upgrade-cards');
  wrap.innerHTML = '';
  const panel = $('upgrade').querySelector('.panel');
  panel.classList.toggle('golden', !!opts.golden);
  panel.querySelector('h2').textContent = opts.title || '升级！选择一项';
  // restart pop animation each time
  panel.classList.remove('pulse-panel'); void panel.offsetWidth; panel.classList.add('pulse-panel');
  // force reflow so CSS cardReveal / iconBounce restarts each level-up
  void wrap.offsetWidth;
  choices.forEach((u, i) => {
    const r = upRarity(u.rarity);
    const btn = document.createElement('button');
    btn.className = `card rarity-${u.rarity || 'common'}`;
    btn.type = 'button';
    btn.style.animationDelay = `${0.04 + i * 0.08}s`;
    const PROP_ICON = {
      robo_vac: 'assets/icon_robo_vac.png',
      chem_jug: 'assets/icon_chem_jug.png',
      extinguisher: 'assets/icon_extinguisher.png',
      nail_bomb: 'assets/icon_nail_bomb.png',
      fan_blade: 'assets/icon_fan_blade.png',
      stapler_storm: 'assets/icon_stapler.png',
      orbit: 'assets/icon_fan_blade.png',
    };
    const propSrc = PROP_ICON[u.id];
    const iconCell = (!propSrc && u.sheet != null) ? getIconCell(u.sheet) : null;
    let iconHtml = `<div class="card-icon"><span style="font-size:18px;color:#c8b8a0">${(u.name||'?')[0]}</span></div>`;
    if (propSrc || iconCell) iconHtml = `<div class="card-icon"></div>`;
    const lv = owned[u.id] || 0;
    const maxPips = Math.min(u.max || 1, 8);
    let pips = '';
    for (let k = 0; k < maxPips; k++) {
      const cls = k < lv ? 'on' : k === lv ? 'next' : '';
      pips += `<i class="${cls}"></i>`;
    }
    const tag = lv === 0
      ? '<span class="card-tag new">新</span>'
      : `<span class="card-tag lv">Lv.${lv}→${lv + 1}${lv + 1 >= u.max ? ' 满' : ''}</span>`;
    btn.innerHTML = `
      ${iconHtml}
      <div class="card-body">
        <h3>${u.name}<span class="card-rarity r-${u.rarity || 'common'}">${r.name}</span>${tag}</h3>
        <p>${u.desc}</p>
        <div class="card-pips">${pips}</div>
      </div>`;
    if (propSrc || iconCell) {
      const holder = btn.querySelector('.card-icon');
      const img = document.createElement('img');
      img.src = propSrc || iconCell.toDataURL();
      img.alt = u.name;
      img.style.objectFit = 'contain';
      img.style.width = '100%';
      img.style.height = '100%';
      holder.appendChild(img);
    }
    btn.addEventListener('click', () => onPick(u));
    wrap.appendChild(btn);
  });
  show('upgrade');
}

export function hideUpgrade() { hide('upgrade'); }

export function showChestPick(onPick) {
  show('chest-pick');
  const panel = $('chest-pick');
  panel.querySelectorAll('.chest-btn').forEach((btn) => {
    btn.onclick = () => {
      hide('chest-pick');
      onPick(btn.dataset.kind);
    };
  });
}

export function showResult(opts) {
  $('res-title').textContent = opts.cleared ? '撤离成功！' : '撤离失败';
  $('result').querySelector('.panel').classList.toggle('win', !!opts.cleared);
  const chips = $('res-chips');
  if (chips) {
    const c = [];
    c.push(`<div class="rchip"><img src="assets/icon_coin.png" alt=""/><b id="res-chip-coins">${opts.coins || 0}</b><span>金币</span></div>`);
    if (opts.diamonds) c.push(`<div class="rchip"><img src="assets/icon_diamond.png" alt=""/><b>${opts.diamonds}</b><span>钻石</span></div>`);
    if (opts.xp) c.push(`<div class="rchip xp"><i>EXP</i><b>${opts.xp}</b><span>经验</span></div>`);
    chips.innerHTML = c.join('');
  }
  $('res-flavor').textContent = opts.flavor || '';
  $('res-stage').textContent = opts.stageName || '—';
  $('res-time').textContent = formatTime(opts.time);
  $('res-kills').textContent = String(opts.kills);
  $('res-combo').textContent = String(opts.maxCombo || 0);
  $('res-coins').textContent = String(opts.coins);
  if (opts.diamonds) {
    show('res-dia-row');
    $('res-diamonds').textContent = String(opts.diamonds);
  } else hide('res-dia-row');
  const rw = $('res-reward-line');
  if (rw && opts.cleared && (opts.rewardCoins || opts.diamonds)) {
    show(rw);
    const rc = $('res-reward-coins');
    const rd = $('res-reward-dias');
    if (rc) rc.textContent = String(opts.rewardCoins || 0);
    if (rd) rd.textContent = String(opts.diamonds || 0);
  } else if (rw) hide(rw);
  $('btn-revive').style.display = opts.canRevive ? '' : 'none';
  $('btn-double').style.display = opts.canDouble ? '' : 'none';
  $('btn-double').disabled = false;
  $('btn-double').innerHTML = '<span class="ad-tag">AD</span>看广告 · 金币翻倍';
  const nextShown = opts.cleared && opts.hasNext;
  if (nextShown) show('btn-next-stage');
  else hide('btn-next-stage');
  // one hero CTA only: when "next stage" leads, retry drops to secondary
  $('btn-retry').classList.toggle('primary', !nextShown);
  $('btn-retry').classList.toggle('glow', !nextShown);
  $('btn-retry').classList.toggle('secondary', nextShown);
  // underpowered fail → CTA
  const hint = $('res-power-hint');
  const cta = $('res-cta-row');
  if (!opts.cleared && opts.suggestPower) {
    if (hint) {
      hint.textContent = opts.suggestPower;
      show(hint);
    }
    if (cta) show(cta);
  } else {
    if (hint) hide(hint);
    if (cta) hide(cta);
  }
  show('result');
}

export function hideResult() { hide('result'); }

export function showPause() { show('pause-menu'); }
export function hidePause() { hide('pause-menu'); }

let toastTimer = null;
export function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  show(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(el), 1800);
}

export function renderStageCards(save, selectedId, onSelect, page = 0) {
  const wrap = $('stage-cards');
  wrap.innerHTML = '';
  const PAGE = 10;
  const list = allStagesIncludingEndless();
  // pager
  const totalPages = Math.ceil(STAGE_COUNT / PAGE);
  const pg = Math.max(0, Math.min(totalPages - 1, page));
  const start = pg * PAGE;
  const slice = STAGES.slice(start, start + PAGE);

  const pager = document.createElement('div');
  pager.className = 'stage-pager';
  pager.innerHTML = `<button type="button" data-pg="-1" ${pg<=0?'disabled':''}>上一页</button>
    <span>第 ${start+1}–${Math.min(STAGE_COUNT, start+PAGE)} / ${STAGE_COUNT} 关 · 撤离员 Lv.${save.playerLevel||1}</span>
    <button type="button" data-pg="1" ${pg>=totalPages-1?'disabled':''}>下一页</button>`;
  pager.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      const d = parseInt(b.dataset.pg, 10);
      renderStageCards(save, selectedId, onSelect, pg + d);
    });
  });
  wrap.appendChild(pager);

  slice.forEach((s) => {
    const unlocked = isStageUnlocked(save, s.id);
    const cleared = !!(save.stagesCleared && save.stagesCleared[s.id]);
    const reason = stageLockReason(save, s.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `stage-card${unlocked ? '' : ' locked'}${selectedId === s.id ? ' selected' : ''}`;
    const thumbArt = s.theme === 'ward' ? 'enemy_crawler' : s.theme === 'basement' ? 'enemy_armored' : 'enemy_office_zombie';
    const bossTag = s.clearMode === 'boss' ? '<span class="st-boss">首领</span>' : '';
    btn.innerHTML = `
      <div class="stage-thumb theme-${s.theme}"><img src="assets/${thumbArt}.png" alt=""/>${unlocked ? '' : '<span class="char-lock-badge">锁</span>'}${bossTag}</div>
      <div class="stage-info">
        <h3>${s.name} ${cleared ? '<span class="st-clear">已通关</span>' : ''}</h3>
        <p>${s.subtitle}</p>
        <p>${unlocked ? (s.clearMode === 'boss' ? `击杀首领 · 目标 ${Math.floor(s.clearTime/60)}:${String(s.clearTime%60).padStart(2,'0')} / ${s.clearKills}杀` : `目标 ${Math.floor(s.clearTime/60)}:${String(s.clearTime%60).padStart(2,'0')} / ${s.clearKills}杀`) : `<span class="lock-tag">${reason || '未解锁'}</span>`}</p>
      </div>`;
    btn.addEventListener('click', () => {
      if (!unlocked) { toast(reason || '尚未解锁'); return; }
      onSelect(s.id);
    });
    wrap.appendChild(btn);
  });

  // endless row
  const en = ENDLESS;
  const eu = isStageUnlocked(save, en.id);
  const ebtn = document.createElement('button');
  ebtn.type = 'button';
  ebtn.className = `stage-card${eu ? '' : ' locked'}${selectedId === en.id ? ' selected' : ''}`;
  ebtn.innerHTML = `
    <div class="stage-thumb theme-basement"><img src="assets/enemy_boss.png" alt=""/>${eu ? '' : '<span class="char-lock-badge">锁</span>'}</div>
    <div class="stage-info">
      <h3>${en.name}</h3>
      <p>${en.subtitle}</p>
      <p>${eu ? `最高 ${formatTime(save.bestEndlessTime||0)} · 击杀 ${save.bestEndlessKills||0}` : `<span class="lock-tag">${stageLockReason(save, en.id)}</span>`}</p>
    </div>`;
  ebtn.addEventListener('click', () => {
    if (!eu) { toast(stageLockReason(save, en.id)); return; }
    onSelect(en.id);
  });
  wrap.appendChild(ebtn);
}

export function renderCharCards(save, selectedId, onSelect, onBuy) {
  const wrap = $('char-cards');
  wrap.innerHTML = '';
  CHARACTERS.forEach((c) => {
    const unlocked = isCharUnlocked(save, c.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `char-card${unlocked ? '' : ' locked'}${selectedId === c.id ? ' selected' : ''}`;
    const spr = getCharSprite(c.id);
    const thumb = document.createElement('div');
    thumb.className = 'char-thumb';
    // v6: high-res full-body art for cards (in-game sprite stays char_<id>.png)
    const CHAR_FULL = {
      grin: 'assets/char_grin_full.png', medic: 'assets/char_medic_full.png',
      janitor: 'assets/char_janitor_full.png', intern: 'assets/char_intern_full.png',
    };
    const artSrc = CHAR_FULL[c.id] || (spr && spr.src);
    if (artSrc) {
      const img = document.createElement('img');
      img.src = artSrc;
      img.alt = c.name;
      if (!unlocked) img.style.filter = 'grayscale(0.85) brightness(0.55)';
      thumb.appendChild(img);
      if (!unlocked) {
        const lock = document.createElement('span');
        lock.className = 'char-lock-badge';
        lock.textContent = '锁';
        thumb.appendChild(lock);
      }
    } else {
      thumb.textContent = unlocked ? (c.name[0] || '*') : '锁';
    }
    const info = document.createElement('div');
    info.className = 'char-info';
    let extra = '';
    if (!unlocked && c.coinCost) extra = `<p class="lock-tag">金币 ${c.coinCost} 解锁 · 或抽奖获得</p>`;
    else if (!unlocked) extra = `<p class="lock-tag">通关/抽奖解锁</p>`;
    info.innerHTML = `<h3>${c.name}</h3><p>${c.desc}</p><p class="char-flavor" style="border-color:${c.tint}">${c.flavor}</p>${extra}`;
    btn.appendChild(thumb);
    btn.appendChild(info);
    btn.addEventListener('click', () => {
      if (unlocked) onSelect(c.id);
      else if (c.coinCost && onBuy) onBuy(c);
      else toast('尚未解锁');
    });
    wrap.appendChild(btn);
  });
}

export function renderGallery(save, onTap) {
  const wrap = $('gallery-grid');
  wrap.innerHTML = '';
  $('gallery-count').textContent = `${galleryCount(save)}/${GALLERY.length}`;
  GALLERY.forEach((g) => {
    const unlocked = !!(save.gallery && save.gallery[g.id]);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `gal-item${unlocked ? '' : ' locked'}`;
    const src = galleryArt(g.id);
    btn.innerHTML = `<div class="gal-art kind-${g.kind}${GALLERY_GOLD.has(g.id) ? ' gold' : ''}">${src ? `<img src="${src}" alt=""/>` : ''}${unlocked ? '' : '<span class="gal-q">?</span>'}</div><span class="gal-name">${unlocked ? g.name : '???'}</span>`;
    btn.addEventListener('click', () => onTap(g, unlocked));
    wrap.appendChild(btn);
  });
}

const GALLERY_ART = {
  enemy_slime: 'assets/enemy_office_zombie.png',
  enemy_bat: 'assets/enemy_crawler.png',
  enemy_beetle: 'assets/enemy_armored.png',
  enemy_wisp: 'assets/enemy_monitor_bot.png',
  enemy_golem: 'assets/enemy_armored.png',
  enemy_boss: 'assets/enemy_boss.png',
  enemy_elite: 'assets/enemy_office_zombie.png',
  enemy_slacker: 'assets/enemy_slacker_zombie.png',
  enemy_secret: 'assets/enemy_shadow.png',
  char_grin: 'assets/char_grin_full.png',
  char_medic: 'assets/char_medic_full.png',
  char_janitor: 'assets/char_janitor_full.png',
  char_intern: 'assets/char_intern_full.png',
  item_chest: 'assets/chest_normal.png',
  milestone_10: 'assets/icon_diamond.png',
};
const GALLERY_SHEET = { item_crit: 8, item_frost: 13, item_shield: 11 };
const GALLERY_GOLD = new Set(['enemy_elite']);
function galleryArt(id) {
  if (GALLERY_ART[id]) return GALLERY_ART[id];
  const cell = GALLERY_SHEET[id] != null ? getIconCell(GALLERY_SHEET[id]) : null;
  return cell ? cell.toDataURL() : '';
}

const MAT_NAMES = { scrap: '废料', battery: '电池', tape: '胶带', chip: '芯片' };
const SLOT_ICON = {
  weapon: 'assets/equip_weapon.png',
  hat: 'assets/equip_hat.png',
  clothes: 'assets/equip_coat.png',
  shoes: 'assets/equip_shoes.png',
};

export function renderBag(save, onToggleEquip, onEquipGear, onUpgradeGear) {
  ensureGearSave(save);
  const matEl = $('mat-line');
  if (matEl) {
    const m = save.materials || {};
    matEl.textContent = `材料  废料${m.scrap||0} · 电池${m.battery||0} · 胶带${m.tape||0} · 芯片${m.chip||0}  |  点装备槽可强化`;
  }
  const gearWrap = $('gear-slots');
  if (gearWrap) {
    gearWrap.innerHTML = '';
    GEAR_SLOTS.forEach((slot) => {
      const id = (save.gear || {})[slot.id];
      const g = id ? getGear(id) : null;
      const lv = g ? ((save.gearLevels || {})[g.id] || 1) : 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `gear-slot${g ? '' : ' empty'}`;
      const ico = `<img class="gs-img" src="${(g && g.icon) || SLOT_ICON[slot.id]}" alt=""/>`;
      btn.innerHTML = `${ico}
        <div><span class="gs-label">${slot.name}</span>
        <div class="gs-name">${g ? `${g.name} Lv.${lv}` : '空'}</div></div>`;
      if (g && onUpgradeGear) {
        btn.addEventListener('click', () => onUpgradeGear(g.id));
      }
      gearWrap.appendChild(btn);
    });
  }

  const slots = $('equip-slots');
  const equipped = save.equipped || [];
  slots.innerHTML = '';
  for (let i = 0; i < 2; i++) {
    const id = equipped[i];
    const item = PASSIVE_ITEMS.find((p) => p.id === id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'equip-slot';
    if (item) {
      const n = Math.min(5, (save.inventory || {})[item.id] || 1);
      el.innerHTML = `<img src="assets/chest_rare.png" alt=""/><span class="eq-name">${item.name}</span><span class="eq-stars">${'★'.repeat(n)}</span>`;
    } else el.textContent = '+';
    el.title = item ? item.name : '空槽';
    if (item) el.addEventListener('click', () => onToggleEquip(item.id));
    slots.appendChild(el);
  }
  const grid = $('bag-grid');
  grid.innerHTML = '';
  const ids = Object.keys(save.inventory || {}).filter((k) => save.inventory[k] > 0);
  if (!ids.length) {
    grid.innerHTML = '<p class="bag-empty">背包空空，去抽奖吧</p>';
    return;
  }
  ids.forEach((id) => {
    const gear = getGear(id);
    const item = PASSIVE_ITEMS.find((p) => p.id === id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bag-item';
    if (gear) {
      const lv = (save.gearLevels || {})[id] || 1;
      const eq = (save.gear || {})[gear.slot] === id;
      const gico = `<img class="bag-ico" src="${gear.icon || SLOT_ICON[gear.slot]}" alt=""/>`;
      btn.innerHTML = `${gico}${gear.name}<br><small class="r-${gear.rarity}">${RARITY_LABEL[gear.rarity]} Lv.${lv}${eq ? ' ·已装' : ''}</small>`;
      if (eq) btn.classList.add('equipped');
      btn.addEventListener('click', () => onEquipGear && onEquipGear(id));
    } else if (item) {
      const eq = equipped.includes(id);
      const stars = Math.min(5, save.inventory[id]);
      btn.innerHTML = `<img class="bag-ico" src="assets/chest_rare.png" alt=""/>${item.name}<br><small class="r-${item.rarity}">${RARITY_LABEL[item.rarity]} ${'★'.repeat(stars)}${eq ? ' ·已戴' : ''}</small>`;
      btn.addEventListener('click', () => onToggleEquip(id));
    } else return;
    grid.appendChild(btn);
  });
}

export function showGachaResult(result) {
  const el = $('gacha-result');
  const rar = result.rarity || 'common';
  el.className = `gacha-result r-${rar}`;
  el.innerHTML = `
    <div class="gr-art">${result.icon ? `<img src="${result.icon}" alt=""/>` : ''}</div>
    <div class="gr-text">
      <div class="gr-rar">${RARITY_LABEL[rar] || ''}${result.dup ? '<span class="gr-dup">重复加成</span>' : ''}</div>
      <div class="big">${result.label}</div>
      <div class="sub">${result.detail || ''}</div>
    </div>`;
  void el.offsetWidth;
  el.classList.add('reveal');
  show(el);
}

/** Virtual joystick */
export function bindJoystick(game, joyRoot, knob) {
  const maxR = 40;
  let tracking = false;
  let pid = null;
  const wrap = $('game-wrap');

  function setKnob(dx, dy) {
    const len = Math.hypot(dx, dy);
    const c = len > maxR ? maxR / len : 1;
    const kx = dx * c, ky = dy * c;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
    game.setJoystick(kx, ky, len > 4);
  }
  function dismissMoveHint() {
    const hint = $('move-hint');
    if (hint) hint.classList.add('hidden');
  }
  function reset() {
    tracking = false; pid = null;
    knob.style.transform = 'translate(0,0)';
    game.setJoystick(0, 0, false);
  }

  wrap.addEventListener('touchstart', (e) => {
    if (e.target.closest && e.target.closest('#btn-pause, #pause-menu, .overlay, button, a')) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    tracking = true; pid = t.identifier;
    wrap._sx = t.clientX; wrap._sy = t.clientY;
    dismissMoveHint();
    setKnob(0, 0);
  }, { passive: false });
  wrap.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!tracking) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== pid) continue;
      setKnob((t.clientX - wrap._sx) * 0.55, (t.clientY - wrap._sy) * 0.55);
    }
  }, { passive: false });
  wrap.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === pid) reset();
  }, { passive: false });
  wrap.addEventListener('touchcancel', () => reset(), { passive: false });

  wrap.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('#btn-pause, #pause-menu, .overlay, button, a')) return;
    tracking = true; wrap._sx = e.clientX; wrap._sy = e.clientY; dismissMoveHint(); setKnob(0, 0);
  });
  window.addEventListener('mousemove', (e) => {
    if (!tracking) return;
    setKnob((e.clientX - wrap._sx) * 0.55, (e.clientY - wrap._sy) * 0.55);
  });
  window.addEventListener('mouseup', () => { if (tracking) reset(); });

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; dismissMoveHint(); updateKeys(); });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; updateKeys(); });
  function updateKeys() {
    if (tracking) return;
    let dx = 0, dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (dx || dy) setKnob(dx * maxR, dy * maxR);
    else { knob.style.transform = 'translate(0,0)'; game.setJoystick(0, 0, false); }
  }
}
