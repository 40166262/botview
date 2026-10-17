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
  if (canFreeGacha(save)) show(gift); else hide(gift);

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

export function showUpgradeCards(choices, onPick) {
  const wrap = $('upgrade-cards');
  wrap.innerHTML = '';
  choices.forEach((u) => {
    const r = upRarity(u.rarity);
    const btn = document.createElement('button');
    btn.className = `card rarity-${u.rarity || 'common'}`;
    btn.type = 'button';
    const iconCell = (u.sheet != null) ? getIconCell(u.sheet) : null;
    let iconHtml = `<div class="card-icon"><span style="font-size:11px;color:#a8a890">${(u.name||'?')[0]}</span></div>`;
    if (iconCell) {
      iconHtml = `<div class="card-icon"></div>`;
    }
    btn.innerHTML = `
      ${iconHtml}
      <div class="card-body">
        <h3>${u.name}<span class="card-rarity" style="color:${r.color}">${r.name}</span></h3>
        <p>${u.desc}</p>
      </div>`;
    if (iconCell) {
      const holder = btn.querySelector('.card-icon');
      const img = document.createElement('img');
      img.src = iconCell.toDataURL();
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
  $('res-title').textContent = opts.cleared ? '关卡通关！' : '撤离失败';
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
  if (opts.cleared && opts.hasNext) show('btn-next-stage');
  else hide('btn-next-stage');
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
    const thumbLabel = s.theme === 'ward' ? '病' : s.theme === 'basement' ? '机' : '办';
    btn.innerHTML = `
      <div class="stage-thumb">${unlocked ? thumbLabel : '锁'}</div>
      <div class="stage-info">
        <h3>${s.name} ${cleared ? '通关' : ''}</h3>
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
    <div class="stage-thumb">∞</div>
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
    if (spr && unlocked) {
      const img = document.createElement('img');
      img.src = spr.src;
      img.alt = c.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = unlocked ? (c.name[0] || '*') : '锁';
    }
    const info = document.createElement('div');
    info.className = 'char-info';
    let extra = '';
    if (!unlocked && c.coinCost) extra = `<p class="lock-tag">金币 ${c.coinCost} 解锁 · 或抽奖获得</p>`;
    else if (!unlocked) extra = `<p class="lock-tag">通关/抽奖解锁</p>`;
    info.innerHTML = `<h3>${c.name}</h3><p>${c.desc}</p><p style="color:${c.tint}">${c.flavor}</p>${extra}`;
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
    const kindMark = ({ enemy: '敌', char: '员', item: '物', milestone: '纪', charm: '饰' })[g.kind] || '记';
    const kindCol = ({ enemy: '#8a6a5a', char: '#6a7a5a', item: '#7a6a4a', milestone: '#5a6a7a', charm: '#7a5a6a' })[g.kind] || '#6a6558';
    btn.innerHTML = unlocked
      ? `<div class="ico" style="background:${kindCol};border:2px solid #2a2418;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-weight:800;color:#f0e6d0">${kindMark}</div>${g.name}`
      : `<div class="ico" style="background:#3a3830;border:2px solid #2a2418;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:#888">?</div>???`;
    btn.addEventListener('click', () => onTap(g, unlocked));
    wrap.appendChild(btn);
  });
}

const MAT_NAMES = { scrap: '废料', battery: '电池', tape: '胶带', chip: '芯片' };

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
      btn.innerHTML = `<div class="gs-ico">${g ? slot.name[0] : '+'}</div>
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
    el.textContent = item ? item.name.slice(0, 2) : '+';
    el.title = item ? item.name : '空槽';
    if (item) el.addEventListener('click', () => onToggleEquip(item.id));
    slots.appendChild(el);
  }
  const grid = $('bag-grid');
  grid.innerHTML = '';
  const ids = Object.keys(save.inventory || {}).filter((k) => save.inventory[k] > 0);
  if (!ids.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#a8a890;font-size:12px">背包空空，去抽奖吧</p>';
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
      btn.innerHTML = `<div class="ico">${gear.slot[0]}</div>${gear.name}<br><small style="color:${RARITY_COLOR[gear.rarity]}">${RARITY_LABEL[gear.rarity]} Lv.${lv}${eq ? ' ·装' : ''}</small>`;
      btn.addEventListener('click', () => onEquipGear && onEquipGear(id));
    } else if (item) {
      const eq = equipped.includes(id);
      btn.innerHTML = `<div class="ico">吊</div>${item.name}<br><small style="color:${RARITY_COLOR[item.rarity]}">${RARITY_LABEL[item.rarity]} ×${save.inventory[id]}${eq ? ' ·已装备' : ''}</small>`;
      btn.addEventListener('click', () => onToggleEquip(id));
    } else return;
    grid.appendChild(btn);
  });
}

export function showGachaResult(result) {
  const el = $('gacha-result');
  el.innerHTML = `<div class="big" style="color:${RARITY_COLOR[result.rarity] || '#ffe066'}">${result.label}</div>
    <div class="sub">${result.detail} · ${RARITY_LABEL[result.rarity] || ''}</div>`;
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
    tracking = true; wrap._sx = e.clientX; wrap._sy = e.clientY; setKnob(0, 0);
  });
  window.addEventListener('mousemove', (e) => {
    if (!tracking) return;
    setKnob((e.clientX - wrap._sx) * 0.55, (e.clientY - wrap._sy) * 0.55);
  });
  window.addEventListener('mouseup', () => { if (tracking) reset(); });

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; updateKeys(); });
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
