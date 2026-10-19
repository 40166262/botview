import { Game } from './game.js';
import { Ads } from './ads.js';
import {
  loadSave, writeSave, resetSave, updateBest, addCoins, addDiamonds, formatTime,
  addPlayerXp, addCharXp, addMaterials, grantMaterials, tryUpgradeGear, gearUpgradeCost,
} from './save.js';
import { setSoundEnabled, resumeAudio, SFX } from './audio.js';
import {
  $, show, hide, setLoadingProgress, refreshHomeStats,
  updateHud, showUpgradeCards, hideUpgrade, showResult, hideResult,
  toast, pushAchievement, celebrateFinds, bindJoystick, renderStageCards, renderCharCards, renderGallery,
  renderBag, showChestPick, showGachaResult, showPause, hidePause, syncBattleTips,
} from './ui.js';
import { preloadSprites } from './sprites.js';
import { STAGES, getStage, isStageUnlocked, markStageCleared, runXpGain, ENDLESS } from './stages.js';
import { CHARACTERS, rollGacha, canFreeGacha, markFreeGacha, randomDeathLine, maybeEggToast,
  ensureDailyQuest, updateDailyQuest, claimDailyQuest, checkGalleryMilestone,
  unlockChar, isCharUnlocked, unlockGallery, galleryCount,
  ensureGearSave, equipGear, unequipGearSlot, getGear, takeNewAchievements } from './meta.js';

const canvas = $('game');
let save = loadSave();
ensureGearSave(save);
ensureDailyQuest(save);
takeNewAchievements(save);
writeSave(save);

function flushAchievements() {
  const fresh = takeNewAchievements(save);
  if (!fresh.length) return;
  writeSave(save);
  fresh.forEach((a) => pushAchievement(a));
}

function noteGalleryMilestone() {
  const mile = checkGalleryMilestone(save);
  if (!mile) return;
  save.achievements = save.achievements || {};
  save.achievements.gallery_10 = true;
  pushAchievement({ name: '图鉴启程', desc: '收藏 10 项 · 钻石 +20' });
}

let lastResult = null;
let doubled = false;
let selectedStage = 's1';
// pick first unlocked uncleared, else last unlocked
(function initStage() {
  for (const s of STAGES) {
    if (isStageUnlocked(save, s.id)) selectedStage = s.id;
  }
})();


function applyRunProgress(result, cleared) {
  const stage = getStage(result.stageId);
  const xp = runXpGain(stage, result.time, result.kills, cleared);
  const pr = addPlayerXp(save, xp);
  const charId = save.selectedChar || 'grin';
  const charPr = addCharXp(save, charId, Math.floor(xp * 0.7));
  const materials = addMaterials(save, stage.stageNum || 1, cleared) || {};
  if (!save.failStreak) save.failStreak = {};
  if (cleared) save.failStreak[result.stageId] = 0;
  else save.failStreak[result.stageId] = (save.failStreak[result.stageId] || 0) + 1;
  const msg = pr.leveled ? `撤离员升至 Lv.${pr.newLevel}！` : '';
  const matNames = { scrap: '废料', battery: '电池', tape: '胶带', chip: '芯片' };
  const matBits = Object.entries(materials).filter(([, n]) => n > 0).map(([k, n]) => `${matNames[k] || k}×${n}`);
  let levelLine = '';
  if (pr.leveled && pr.rewards && pr.rewards.length) {
    const bits = pr.rewards.map((r) => (r.type === 'diamonds' ? `钻石 +${r.n}` : `金币 +${r.n}`));
    levelLine = `升级奖励 · ${bits.join(' · ')}`;
  }
  const supplyLine = bonusSupplyLine(result && result.supply);
  const matLine = [matBits.length ? `材料 ${matBits.join(' · ')}` : '', supplyLine].filter(Boolean).join(' · ');
  return {
    msg,
    xp,
    matLine,
    levelLine,
    charLine: charPr.leveled ? `角色升至 Lv.${charPr.level}` : '',
  };
}

function bonusSupplyLine(supply) {
  if (!supply) return '';
  const names = { scrap: '废料', battery: '电池', tape: '胶带', chip: '芯片' };
  const bits = [];
  for (const [k, name] of Object.entries(names)) {
    if (supply[k]) bits.push(`${name}×${supply[k]}`);
  }
  if (supply.diamonds) bits.push(`钻石×${supply.diamonds}`);
  return bits.length ? `稀有补给 ${bits.join(' · ')}` : '';
}

function takeFinds() {
  const ids = (game.freshGallery || []).slice();
  game.freshGallery = [];
  return ids;
}

const game = new Game(canvas, {
  onHud(data) {
    updateHud(data);
    syncBattleTips(data.tips);
  },
  onLevelUp(choices) {
    showUpgradeCards(choices, (u) => {
      SFX.click();
      game.applyUpgrade(u);
      hideUpgrade();
      game.setPaused(false);
      toast(`获得：${u.name}`);
    }, game.owned, { title: `升级！Lv.${game.player.level} · 选择一项` });
  },
  onGoldenChest(choices) {
    showUpgradeCards(choices, (u) => {
      SFX.click();
      game.applyUpgrade(u);
      hideUpgrade();
      game.setPaused(false);
      toast(`金色物资：${u.name} · 金币 +30`);
    }, game.owned, { title: '金色物资箱！稀有以上任选', golden: true });
  },
  onChest() {
    showChestPick((kind) => {
      game.applyChestReward(kind);
      game.setPaused(false);
      toast(kind === 'heal' ? '生命回复！' : kind === 'coin' ? '金币入手！' : '获得升级！');
    });
  },
  onRareSupply(pack) {
    grantMaterials(save, pack && pack.materials);
    if (pack && pack.diamonds) addDiamonds(save, pack.diamonds);
    writeSave(save);
  },
  onDeath(result) {
    lastResult = { ...result, cleared: false };
    doubled = false;
    const endless = result.stageId === 'endless';
    updateBest(save, result.time, result.kills, result.maxCombo, endless);
    addCoins(save, result.coins);
    updateDailyQuest(save, result);
    const prog = applyRunProgress(result, false);
    const finds = takeFinds();
    writeSave(save);
    refreshHomeStats(save);
    flushAchievements();
    const failN = (save.failStreak || {})[result.stageId] || 0;
    let suggest = '差一点点，再来一局就稳了。';
    if (result.stageId === 's1') suggest = '先开箱补给，再绕开走位。';
    else if ((result.time || 0) < 25) suggest = '先拉开距离，捡经验再输出。';
    else if (failN >= 2) suggest = '去装备栏升一级，会好过很多。';
    else if ((result.kills || 0) < 8) suggest = '贴着物资箱走，箱子能翻盘。';
    showResult({
      cleared: false,
      flavor: [randomDeathLine(), prog.msg].filter(Boolean).join(' · '),
      xp: prog.xp,
      matLine: prog.matLine,
      levelLine: prog.levelLine,
      charLine: prog.charLine,
      stageName: result.stageName,
      time: result.time,
      kills: result.kills,
      maxCombo: result.maxCombo,
      coins: result.coins,
      canRevive: !result.revivedOnce && !endless,
      canDouble: (result.coins || 0) > 0,
      hasNext: false,
      suggestPower: suggest,
      showGearCta: failN >= 2,
    });
    celebrateFinds(finds);
    const egg = maybeEggToast();
    if (egg) setTimeout(() => toast(egg), 900);
  },
  onClear(result) {
    lastResult = { ...result, cleared: true };
    doubled = false;
    markStageCleared(save, result.stageId);
    const medicNew = result.stageId === 's1' && !isCharUnlocked(save, 'medic');
    if (result.stageId === 's1') unlockChar(save, 'medic');
    updateBest(save, result.time, result.kills, result.maxCombo, false);
    addCoins(save, result.coins);
    addDiamonds(save, result.rewardDiamonds || 0);
    updateDailyQuest(save, result);
    const prog = applyRunProgress(result, true);
    const finds = takeFinds();
    noteGalleryMilestone();
    writeSave(save);
    refreshHomeStats(save);
    flushAchievements();
    const idx = STAGES.findIndex((s) => s.id === result.stageId);
    const hasNext = idx >= 0 && idx < STAGES.length - 1;
    const bonusLine = result.rewardCoins ? `含通关奖金 +${result.rewardCoins}` : '';
    showResult({
      cleared: true,
      flavor: prog.msg || '设施又干净了一层，继续向下撤离！',
      xp: prog.xp,
      matLine: prog.matLine,
      levelLine: prog.levelLine,
      charLine: prog.charLine,
      bonusLine,
      stageName: result.stageName,
      time: result.time,
      kills: result.kills,
      maxCombo: result.maxCombo,
      coins: result.coins,
      diamonds: result.rewardDiamonds,
      rewardCoins: result.rewardCoins,
      canRevive: false,
      canDouble: (result.coins || 0) > 0,
      hasNext,
    });
    celebrateFinds(finds, medicNew ? '急救狂魔' : '');
  },
  onToast: toast,
  onBanner() {},
});

bindJoystick(game, $('joystick'), $('joy-knob'));
// QA hook: expose the game only when ?debug is in the URL
if (new URLSearchParams(location.search).has('debug')) {
  window.__game = game;
  window.__shot = { showResult, showUpgradeCards, renderGallery, refreshHomeStats, save: () => save };
}

function goHome() {
  game.stop();
  hide('game-wrap');
  hideResult();
  hideUpgrade();
  hidePause();
  hide('chest-pick');
  hide('settings');
  hide('stages');
  hide('chars');
  hide('gacha');
  hide('gallery');
  hide('bag');
  show('home');
  refreshHomeStats(save);
}

function isFreshCoach(data) {
  // First battle only. Starter coins from gear bootstrap do not count as play.
  if (!data || data.coachSeen) return false;
  const cleared = data.stagesCleared || {};
  if (Object.keys(cleared).some((k) => cleared[k])) return false;
  if ((data.bestTime || 0) > 0 || (data.bestKills || 0) > 0) return false;
  if ((data.playerLevel || 1) > 1) return false;
  if ((data.gachaCount || 0) > 0) return false;
  const fails = data.failStreak || {};
  if (Object.keys(fails).some((k) => fails[k] > 0)) return false;
  return true;
}

function startRun(stageId) {
  resumeAudio();
  SFX.click();
  const sid = stageId || selectedStage;
  if (!isStageUnlocked(save, sid)) {
    toast('章节未解锁');
    return;
  }
  selectedStage = sid;
  hide('home');
  hide('stages');
  hide('chars');
  hideResult();
  hideUpgrade();
  hidePause();
  hide('chest-pick');
  show('game-wrap');
  const joy = $('joystick');
  if (joy) joy.classList.add('ghost');
  syncBattleTips(null);
  const coach = isFreshCoach(save);
  if (coach) {
    save.coachSeen = true;
    writeSave(save);
  }
  game.configure({
    stageId: sid,
    charId: save.selectedChar || 'grin',
    equipped: save.equipped || [],
    save,
    coach,
  });
  game.start();
  const egg = maybeEggToast();
  if (egg) setTimeout(() => toast(egg), 1200);
}

async function bootLoad() {
  show('loading');
  hide('home');
  setLoadingProgress(0);
  const minMs = 350;
  const started = performance.now();
  let loaded = [], failed = [];
  try {
    ({ loaded, failed } = await preloadSprites((p) => setLoadingProgress(p * 90)));
  } catch (err) {
    console.warn('[怪奇撤离] sprite preload error', err);
    failed = ['*'];
  }
  const elapsed = performance.now() - started;
  if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
  setLoadingProgress(100);
  if (loaded.length) console.info('[怪奇撤离] Sprites:', loaded.join(', '));
  if (failed.length) console.info('[怪奇撤离] Fallback for:', failed.join(', '));
  hide('loading');
  show('home');
  refreshHomeStats(save);
}

// —— Home ——
// Home "play" always goes to the frontier stage (chapter select handles replays)
function frontierStage() {
  let id = 's1';
  for (const s of STAGES) if (isStageUnlocked(save, s.id)) id = s.id;
  return id;
}
$('btn-play').addEventListener('click', () => startRun(frontierStage()));

$('btn-stages').addEventListener('click', () => {
  SFX.click();
  const sn = (getStage(selectedStage).stageNum || 1) - 1;
  const page = Math.floor(Math.min(99, sn) / 10);
  renderStageCards(save, selectedStage, (id) => {
    selectedStage = id;
    hide('stages');
    startRun(id);
  }, page);
  show('stages');
});
$('btn-stages-close').addEventListener('click', () => hide('stages'));

$('btn-chars').addEventListener('click', () => {
  SFX.click();
  openChars();
});
function openChars() {
  renderCharCards(save, save.selectedChar, (id) => {
    if (save.selectedChar !== id) {
      save.selectedChar = id;
      writeSave(save);
      const name = (CHARACTERS.find((c) => c.id === id) || {}).name || id;
      toast(`选用：${name}`);
    }
    openChars();
  }, (c) => {
    if ((save.coins || 0) < c.coinCost) { toast('金币不足'); return; }
    const fresh = !isCharUnlocked(save, c.id);
    save.coins -= c.coinCost;
    unlockChar(save, c.id);
    save.selectedChar = c.id;
    writeSave(save);
    refreshHomeStats(save);
    if (fresh) pushAchievement({ kicker: '新伙伴', name: c.name, desc: '已选用，出战吧' });
    openChars();
  });
  show('chars');
}
$('btn-chars-close').addEventListener('click', () => hide('chars'));

$('btn-gallery').addEventListener('click', () => {
  SFX.click();
  renderGallery(save, (g, unlocked) => {
    const detail = $('gallery-detail');
    if (!unlocked) {
      detail.textContent = '还没见过。多撤离几次就会收录。';
    } else {
      detail.innerHTML = `<strong>${g.name}</strong><br>${g.flavor}`;
    }
    show(detail);
  });
  show('gallery');
});
$('btn-gallery-close').addEventListener('click', () => hide('gallery'));

let bagSelectedId = null;

$('btn-bag').addEventListener('click', () => {
  SFX.click();
  bagSelectedId = null;
  openBag();
  show('bag');
});
function openBag() {
  ensureGearSave(save);
  renderBag(save, (id) => {
    if (!save.equipped) save.equipped = [];
    const idx = save.equipped.indexOf(id);
    if (idx >= 0) {
      save.equipped.splice(idx, 1);
      toast('挂件卸下啦');
    } else {
      if (save.equipped.length >= 2) save.equipped.shift();
      save.equipped.push(id);
      toast('挂件戴上啦');
    }
    writeSave(save);
    bagSelectedId = id;
    openBag();
  }, (gearId) => {
    const g = getGear(gearId);
    const prev = g ? (save.gear || {})[g.slot] : null;
    if (equipGear(save, gearId)) {
      writeSave(save);
      refreshHomeStats(save);
      bagSelectedId = gearId;
      toast(prev && prev !== gearId ? '装备替换好了' : '装上啦');
      openBag();
    } else toast('没法装这件');
  }, (gearId) => {
    const lv = (save.gearLevels || {})[gearId] || 1;
    const cost = gearUpgradeCost(lv);
    const r = tryUpgradeGear(save, gearId);
    writeSave(save);
    refreshHomeStats(save);
    bagSelectedId = gearId;
    if (r.ok) { toast(`强化到 Lv.${r.level}`); openBag(); }
    else if (r.reason === '已满级') { toast('已经满级啦'); openBag(); }
    else {
      const matNames = { scrap: '废料', battery: '电池', tape: '胶带', chip: '芯片' };
      const need = cost ? `需${cost.coins}金+${matNames[cost.mat]||cost.mat}×${cost.n}` : '';
      toast((r.reason || '强化失败') + (need ? `（${need}）` : ''));
      openBag();
    }
  }, {
    selectedId: bagSelectedId,
    onSelect: (id) => {
      const gear = getGear(id);
      if (gear) {
        const occ = (save.gear || {})[gear.slot];
        // Empty slot → equip in one tap
        if (!occ) {
          if (equipGear(save, id)) {
            writeSave(save);
            refreshHomeStats(save);
            bagSelectedId = id;
            toast('装上啦');
            openBag();
            return;
          }
        }
        // Occupied by same or other → select (replace via detail panel)
        bagSelectedId = id;
        openBag();
        return;
      }
      bagSelectedId = id;
      openBag();
    },
    onUnequipGear: (slot) => {
      unequipGearSlot(save, slot);
      writeSave(save);
      refreshHomeStats(save);
      toast('卸下啦');
      openBag();
    },
  });
}
$('btn-bag-close').addEventListener('click', () => {
  bagSelectedId = null;
  hide('bag');
});

$('btn-goto-upgrade')?.addEventListener('click', () => {
  SFX.click();
  hideResult();
  hide('game-wrap');
  show('home');
  bagSelectedId = null;
  openBag();
  show('bag');
  toast('点防具看详情，再点强化');
});
$('btn-goto-gacha')?.addEventListener('click', () => {
  SFX.click();
  hideResult();
  hide('game-wrap');
  show('home');
  openGacha();
});



// —— Gacha ——
let lastPay = 'free';

function againMode() {
  if (canFreeGacha(save)) return 'free';
  if (lastPay === 'coin' && (save.coins || 0) >= 80) return 'coin';
  if (lastPay === 'dia' && (save.diamonds || 0) >= 15) return 'dia';
  if (lastPay === 'ad') return 'ad';
  if ((save.coins || 0) >= 80) return 'coin';
  if ((save.diamonds || 0) >= 15) return 'dia';
  return 'ad';
}
function againLabel(mode) {
  if (mode === 'free') return '再抽 · 免费';
  if (mode === 'coin') return '再抽 · 80金';
  if (mode === 'dia') return '再抽 · 15钻';
  return '再抽 · 看广告';
}

function refreshGachaUI() {
  const n = Math.max(0, Math.min(10, save.pity || 0));
  const num = $('pity-num');
  if (num) num.textContent = String(n);
  const bar = $('pity-bar');
  if (bar) bar.style.width = `${(n / 10) * 100}%`;
  const track = $('pity-track');
  if (track) track.setAttribute('aria-valuenow', String(n));
  const free = canFreeGacha(save);
  const btn = $('btn-gacha-free');
  btn.disabled = !free;
  btn.textContent = free ? '领取今日免费 ×1' : '今日免费已领';
  btn.classList.toggle('claim-ready', free);
  const st = $('gacha-free-status');
  if (st) {
    st.textContent = free ? '今日免费还没领，点下面的金色按钮' : '今日免费已领取，明天 0 点再来';
    st.classList.toggle('claimed', !free);
  }
  const again = $('btn-gacha-again');
  if (again) {
    const mode = againMode();
    again.textContent = againLabel(mode);
    again.dataset.mode = mode;
  }
}
function openGacha() {
  hide('gacha-result');
  hide('gacha-next');
  refreshGachaUI();
  show('gacha');
}
$('btn-gacha').addEventListener('click', () => {
  SFX.click();
  openGacha();
});
$('btn-gacha-close').addEventListener('click', () => { hide('gacha'); refreshHomeStats(save); });

function showGachaNext() {
  const next = $('gacha-next');
  if (!next) return;
  next.classList.remove('reveal');
  show(next);
  void next.offsetWidth;
  next.classList.add('reveal');
  const panel = next.closest('.panel');
  if (panel) {
    const top = next.offsetTop + next.offsetHeight - panel.clientHeight + 12;
    if (top > panel.scrollTop) panel.scrollTop = top;
  }
}

function doGacha() {
  resumeAudio();
  const result = rollGacha(save);
  writeSave(save);
  showGachaResult(result);
  refreshGachaUI();
  refreshHomeStats(save);
  showGachaNext();
  SFX.gacha(result.rarity);
  noteGalleryMilestone();
  writeSave(save);
  flushAchievements();
}

function pullGacha(mode) {
  if (mode === 'free') {
    if (!canFreeGacha(save)) { toast('今日免费已经领过了'); refreshGachaUI(); return; }
    markFreeGacha(save);
    writeSave(save);
    lastPay = 'free';
    doGacha();
    return;
  }
  if (mode === 'coin') {
    if ((save.coins || 0) < 80) { toast('金币不足'); refreshGachaUI(); return; }
    save.coins -= 80;
    writeSave(save);
    lastPay = 'coin';
    doGacha();
    return;
  }
  if (mode === 'dia') {
    if ((save.diamonds || 0) < 15) { toast('钻石不足'); refreshGachaUI(); return; }
    save.diamonds -= 15;
    writeSave(save);
    lastPay = 'dia';
    doGacha();
    return;
  }
  Ads.showRewarded((ok) => {
    if (!ok) { toast('广告未完成'); return; }
    lastPay = 'ad';
    doGacha();
  });
}

$('btn-gacha-free').addEventListener('click', () => pullGacha('free'));
$('btn-gacha-ad').addEventListener('click', () => pullGacha('ad'));
$('btn-gacha-coin').addEventListener('click', () => pullGacha('coin'));
$('btn-gacha-dia').addEventListener('click', () => pullGacha('dia'));
$('btn-gacha-again')?.addEventListener('click', () => {
  SFX.click();
  pullGacha(againMode());
});
$('btn-gacha-home')?.addEventListener('click', () => {
  SFX.click();
  hide('gacha');
  hide('gacha-result');
  hide('gacha-next');
  refreshHomeStats(save);
});

// Daily quest chip claim
$('daily-quest-chip').addEventListener('click', () => {
  const reward = claimDailyQuest(save);
  if (reward) {
    writeSave(save);
    refreshHomeStats(save);
    const bits = [];
    if (reward.coins) bits.push(`金币 +${reward.coins}`);
    if (reward.diamonds) bits.push(`钻石 +${reward.diamonds}`);
    pushAchievement({ kicker: '日常', name: reward.name || '日常奖励已领', desc: bits.join(' · ') || '奖励已放入账户' });
  } else {
    const board = save.dailyQuests || [];
    const next = board.find((q) => !q.claimed);
    if (!next) toast('今天的日常都领完啦');
    else toast(`${next.name}还差 ${Math.max(0, next.target - (next.progress || 0))}`);
  }
});
$('daily-gift').addEventListener('click', () => openGacha());

let titleTaps = 0;
let titleTapTimer = 0;
let titleLine = 0;
const TITLE_LINES = [
  { name: '工牌背面', desc: '笑一笑，再撤离。' },
  { name: '值班便签', desc: '今天适合抽一张。' },
];
$('home-title')?.addEventListener('click', () => {
  titleTaps += 1;
  clearTimeout(titleTapTimer);
  titleTapTimer = setTimeout(() => { titleTaps = 0; }, 700);
  if (titleTaps < 3) return;
  titleTaps = 0;
  const line = TITLE_LINES[titleLine % TITLE_LINES.length];
  titleLine += 1;
  pushAchievement({ kicker: '悄悄话', name: line.name, desc: line.desc });
  SFX.click();
});

const versionEl = $('settings-version');
let versionHold = 0;
function armCredits() {
  clearTimeout(versionHold);
  versionHold = setTimeout(() => {
    versionHold = 0;
    pushAchievement({ kicker: '制作', name: '怪奇撤离', desc: '纸板暖光，一起撤离。' });
    SFX.click();
  }, 650);
}
function cancelCredits() {
  clearTimeout(versionHold);
  versionHold = 0;
}
if (versionEl) {
  versionEl.addEventListener('pointerdown', (e) => { e.preventDefault(); armCredits(); });
  versionEl.addEventListener('pointerup', cancelCredits);
  versionEl.addEventListener('pointerleave', cancelCredits);
  versionEl.addEventListener('pointercancel', cancelCredits);
  versionEl.addEventListener('contextmenu', (e) => e.preventDefault());
}

$('btn-settings').addEventListener('click', () => {
  SFX.click();
  syncPauseSound();
  show('settings');
});
$('btn-settings-close').addEventListener('click', () => hide('settings'));
$('btn-reset-save').addEventListener('click', () => { SFX.click(); show('confirm-reset'); });
$('btn-reset-no').addEventListener('click', () => { SFX.click(); hide('confirm-reset'); });
$('btn-reset-yes').addEventListener('click', () => {
  SFX.click();
  resetSave();
  location.reload();
});
function syncPauseSound() {
  const on = !!save.sound;
  const label = on ? '音效 · 开' : '音效 · 关';
  const btn = $('btn-pause-sound');
  if (btn) {
    btn.textContent = label;
    btn.classList.toggle('is-on', on);
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  const chk = $('chk-sound');
  if (chk) chk.checked = on;
  const lab = $('sound-label');
  if (lab) lab.textContent = label;
}
function setSound(on) {
  save.sound = !!on;
  setSoundEnabled(save.sound);
  writeSave(save);
  syncPauseSound();
}
$('chk-sound').addEventListener('change', (e) => {
  resumeAudio();
  setSound(e.target.checked);
  if (e.target.checked) SFX.click();
});

$('btn-retry').addEventListener('click', () => {
  hideResult();
  startRun(selectedStage);
});
$('btn-next-stage').addEventListener('click', () => {
  const idx = STAGES.findIndex((s) => s.id === selectedStage);
  if (idx >= 0 && idx < STAGES.length - 1) {
    selectedStage = STAGES[idx + 1].id;
    hideResult();
    startRun(selectedStage);
  } else if (idx === STAGES.length - 1 && isStageUnlocked(save, 'endless')) {
    selectedStage = 'endless';
    hideResult();
    startRun(selectedStage);
  }
});
$('btn-home').addEventListener('click', () => { SFX.click(); goHome(); });

$('btn-revive').addEventListener('click', () => {
  Ads.showRewarded((ok) => {
    if (!ok) { toast('广告未完成'); return; }
    hideResult();
    game.revive();
    toast('复活成功！短暂无敌');
  });
});
$('btn-double').addEventListener('click', () => {
  if (doubled || !lastResult) return;
  Ads.showRewarded((ok) => {
    if (!ok) { toast('广告未完成'); return; }
    doubled = true;
    addCoins(save, lastResult.coins);
    lastResult.coins *= 2;
    $('res-coins').textContent = String(lastResult.coins);
    const chip = $('res-chip-coins');
    if (chip) chip.textContent = String(lastResult.coins);
    $('btn-double').disabled = true;
    $('btn-double').innerHTML = '<span class="ad-tag">演示</span>奖励已翻倍';
    refreshHomeStats(save);
    toast(`奖励翻倍！金币 +${lastResult.coins / 2}`);
  });
});

document.body.addEventListener('touchmove', (e) => {
  if (e.target.closest('#game-wrap')) e.preventDefault();
}, { passive: false });


// —— Pause ——
function openPause() {
  if (!game.running || !game.alive || game.cleared) return;
  // don't stack over upgrade/chest/result
  if (!$('upgrade').classList.contains('hidden')) return;
  if (!$('chest-pick').classList.contains('hidden')) return;
  if (!$('result').classList.contains('hidden')) return;
  game.setPaused(true);
  syncPauseSound();
  showPause();
  SFX.click();
}
$('btn-pause-sound')?.addEventListener('click', () => {
  const next = !save.sound;
  setSound(next);
  if (next) SFX.click();
});
$('btn-pause')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openPause();
});
$('btn-pause-resume')?.addEventListener('click', () => {
  SFX.click();
  hidePause();
  game.setPaused(false);
});
$('btn-pause-retry')?.addEventListener('click', () => {
  SFX.click();
  hidePause();
  startRun(selectedStage);
});
$('btn-pause-home')?.addEventListener('click', () => {
  SFX.click();
  hidePause();
  goHome();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.key === 'Escape') {
    if (!$('pause-menu').classList.contains('hidden')) {
      hidePause();
      game.setPaused(false);
    } else if (!$('game-wrap').classList.contains('hidden')) {
      openPause();
    }
  }
});

setSoundEnabled(save.sound);
syncPauseSound();
window.addEventListener('pointerdown', () => resumeAudio(), { passive: true });
window.addEventListener('keydown', () => resumeAudio());
bootLoad();
