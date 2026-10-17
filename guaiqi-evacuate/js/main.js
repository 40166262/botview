import { Game } from './game.js';
import { Ads } from './ads.js';
import {
  loadSave, writeSave, updateBest, addCoins, addDiamonds, formatTime,
  addPlayerXp, addCharXp, addMaterials, tryUpgradeGear, gearUpgradeCost,
} from './save.js';
import { setSoundEnabled, resumeAudio, SFX } from './audio.js';
import {
  $, show, hide, setLoadingProgress, refreshHomeStats,
  updateHud, showUpgradeCards, hideUpgrade, showResult, hideResult,
  toast, bindJoystick, renderStageCards, renderCharCards, renderGallery,
  renderBag, showChestPick, showGachaResult, showPause, hidePause,
} from './ui.js';
import { preloadSprites } from './sprites.js';
import { STAGES, getStage, isStageUnlocked, markStageCleared, runXpGain, ENDLESS } from './stages.js';
import { CHARACTERS, rollGacha, canFreeGacha, markFreeGacha, randomDeathLine, maybeEggToast,
  ensureDailyQuest, updateDailyQuest, claimDailyQuest, checkGalleryMilestone,
  unlockChar, isCharUnlocked, unlockGallery, galleryCount,
  ensureGearSave, equipGear } from './meta.js';

const canvas = $('game');
let save = loadSave();
ensureGearSave(save);
ensureDailyQuest(save);
writeSave(save);

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
  addCharXp(save, charId, Math.floor(xp * 0.7));
  addMaterials(save, stage.stageNum || 1, cleared);
  if (!save.failStreak) save.failStreak = {};
  if (cleared) save.failStreak[result.stageId] = 0;
  else save.failStreak[result.stageId] = (save.failStreak[result.stageId] || 0) + 1;
  let msg = `经验 +${xp}`;
  if (pr.leveled) msg += ` · 撤离员升至 Lv.${pr.newLevel}！`;
  return msg;
}

const game = new Game(canvas, {
  onHud: updateHud,
  onLevelUp(choices) {
    showUpgradeCards(choices, (u) => {
      SFX.click();
      game.applyUpgrade(u);
      hideUpgrade();
      game.setPaused(false);
      toast(`获得：${u.name}`);
    });
  },
  onChest() {
    showChestPick((kind) => {
      game.applyChestReward(kind);
      game.setPaused(false);
      toast(kind === 'heal' ? '生命回复！' : kind === 'coin' ? '金币入手！' : '获得升级！');
    });
  },
  onDeath(result) {
    lastResult = { ...result, cleared: false };
    doubled = false;
    const endless = result.stageId === 'endless';
    updateBest(save, result.time, result.kills, result.maxCombo, endless);
    addCoins(save, result.coins);
    updateDailyQuest(save, result);
    const progMsg = applyRunProgress(result, false);
    writeSave(save);
    refreshHomeStats(save);
    const failN = (save.failStreak || {})[result.stageId] || 0;
    let suggest = null;
    if (failN >= 2 || (result.time || 0) < 45) {
      const needDmg = 8 + failN * 2;
      suggest = `再高约 ${needDmg}% 伤害或生命即可更稳过关 — 先强化装备或抽一件新装。`;
    }
    showResult({
      cleared: false,
      flavor: `${randomDeathLine()}（${progMsg}）`,
      stageName: result.stageName,
      time: result.time,
      kills: result.kills,
      maxCombo: result.maxCombo,
      coins: result.coins,
      canRevive: !result.revivedOnce && !endless,
      canDouble: true,
      hasNext: false,
      suggestPower: suggest,
    });
    const egg = maybeEggToast();
    if (egg) setTimeout(() => toast(egg), 900);
  },
  onClear(result) {
    lastResult = { ...result, cleared: true };
    doubled = false;
    markStageCleared(save, result.stageId);
    if (result.stageId === 's1') unlockChar(save, 'medic');
    updateBest(save, result.time, result.kills, result.maxCombo, false);
    addCoins(save, result.coins);
    addDiamonds(save, result.rewardDiamonds || 0);
    updateDailyQuest(save, result);
    const progMsg = applyRunProgress(result, true);
    const mile = checkGalleryMilestone(save);
    writeSave(save);
    refreshHomeStats(save);
    const idx = STAGES.findIndex((s) => s.id === result.stageId);
    const hasNext = idx >= 0 && idx < STAGES.length - 1;
    showResult({
      cleared: true,
      flavor: progMsg,
      stageName: result.stageName,
      time: result.time,
      kills: result.kills,
      maxCombo: result.maxCombo,
      coins: result.coins,
      diamonds: result.rewardDiamonds,
      rewardCoins: result.rewardCoins,
      canRevive: false,
      canDouble: true,
      hasNext,
    });
    if (mile) toast(mile.msg);
  },
  onToast: toast,
  onBanner() {},
});

bindJoystick(game, $('joystick'), $('joy-knob'));

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
  game.configure({
    stageId: sid,
    charId: save.selectedChar || 'grin',
    equipped: save.equipped || [],
    save,
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
$('btn-play').addEventListener('click', () => startRun(selectedStage));

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
    save.selectedChar = id;
    writeSave(save);
    toast(`出战：${(CHARACTERS.find(c=>c.id===id)||{}).name || id}`);
    openChars();
  }, (c) => {
    if ((save.coins || 0) >= c.coinCost) {
      save.coins -= c.coinCost;
      unlockChar(save, c.id);
      save.selectedChar = c.id;
      writeSave(save);
      refreshHomeStats(save);
      toast(`解锁 ${c.name}！`);
      openChars();
    } else toast('金币不足');
  });
  show('chars');
}
$('btn-chars-close').addEventListener('click', () => hide('chars'));

$('btn-gallery').addEventListener('click', () => {
  SFX.click();
  renderGallery(save, (g, unlocked) => {
    const detail = $('gallery-detail');
    if (!unlocked) {
      detail.textContent = '尚未发现……去撤离或抽奖吧！';
    } else {
      detail.innerHTML = `<strong>${g.name}</strong><br>${g.flavor}`;
    }
    show(detail);
  });
  show('gallery');
});
$('btn-gallery-close').addEventListener('click', () => hide('gallery'));

$('btn-bag').addEventListener('click', () => {
  SFX.click();
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
      toast('已卸下');
    } else {
      if (save.equipped.length >= 2) save.equipped.shift();
      save.equipped.push(id);
      toast('已装备');
    }
    writeSave(save);
    openBag();
  }, (gearId) => {
    if (equipGear(save, gearId)) {
      writeSave(save);
      toast('已装上装备');
      openBag();
    } else toast('无法装备');
  }, (gearId) => {
    const lv = (save.gearLevels || {})[gearId] || 1;
    const cost = gearUpgradeCost(lv);
    if (cost && !tryUpgradeGear) { /* noop */ }
    const r = tryUpgradeGear(save, gearId);
    writeSave(save);
    refreshHomeStats(save);
    if (r.ok) { toast(`强化成功 → +${r.level - 1}`); openBag(); }
    else {
      const matNames = { scrap: '废料', battery: '电池', tape: '胶带', chip: '芯片' };
      const need = cost ? `需${cost.coins}金+${matNames[cost.mat]||cost.mat}×${cost.n}` : '';
      toast((r.reason || '强化失败') + (need ? `（${need}）` : ''));
    }
  });
}
$('btn-bag-close').addEventListener('click', () => hide('bag'));

$('btn-goto-upgrade')?.addEventListener('click', () => {
  SFX.click();
  hideResult();
  hide('game-wrap');
  show('home');
  openBag();
  show('bag');
  toast('点装备槽消耗金币+材料强化');
});
$('btn-goto-gacha')?.addEventListener('click', () => {
  SFX.click();
  hideResult();
  hide('game-wrap');
  show('home');
  hide('gacha-result');
  refreshGachaUI();
  show('gacha');
});



// —— Gacha ——
function refreshGachaUI() {
  $('pity-num').textContent = String(save.pity || 0);
  $('btn-gacha-free').disabled = !canFreeGacha(save);
  $('btn-gacha-free').textContent = canFreeGacha(save) ? '每日免费 ×1' : '今日已免费抽取';
}
$('btn-gacha').addEventListener('click', () => {
  SFX.click();
  hide('gacha-result');
  refreshGachaUI();
  show('gacha');
});
$('btn-gacha-close').addEventListener('click', () => { hide('gacha'); refreshHomeStats(save); });

function doGacha(paid) {
  resumeAudio();
  const result = rollGacha(save);
  writeSave(save);
  showGachaResult(result);
  refreshGachaUI();
  refreshHomeStats(save);
  SFX.chest();
  toast(result.detail || result.label);
  const mile = checkGalleryMilestone(save);
  if (mile) { writeSave(save); toast(mile.msg); }
}

$('btn-gacha-free').addEventListener('click', () => {
  if (!canFreeGacha(save)) { toast('今日已领取'); return; }
  markFreeGacha(save);
  writeSave(save);
  doGacha(false);
});
$('btn-gacha-ad').addEventListener('click', () => {
  Ads.showRewarded((ok) => {
    if (!ok) { toast('广告未完成'); return; }
    doGacha(true);
  });
});
$('btn-gacha-coin').addEventListener('click', () => {
  if ((save.coins || 0) < 80) { toast('金币不足'); return; }
  save.coins -= 80;
  writeSave(save);
  doGacha(true);
});
$('btn-gacha-dia').addEventListener('click', () => {
  if ((save.diamonds || 0) < 15) { toast('钻石不足'); return; }
  save.diamonds -= 15;
  writeSave(save);
  doGacha(true);
});

// Daily quest chip claim
$('daily-quest-chip').addEventListener('click', () => {
  const reward = claimDailyQuest(save);
  if (reward) {
    writeSave(save);
    refreshHomeStats(save);
    toast(`日常奖励已领取！`);
  }
});
$('daily-gift').addEventListener('click', () => {
  hide('gacha-result');
  refreshGachaUI();
  show('gacha');
});

$('btn-settings').addEventListener('click', () => { SFX.click(); show('settings'); });
$('btn-settings-close').addEventListener('click', () => hide('settings'));
$('chk-sound').addEventListener('change', (e) => {
  save.sound = e.target.checked;
  setSoundEnabled(save.sound);
  writeSave(save);
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
    $('btn-double').disabled = true;
    refreshHomeStats(save);
    toast('金币已双倍！');
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
  showPause();
  SFX.click();
}
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
bootLoad();
