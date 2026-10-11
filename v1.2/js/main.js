/* 界面流程与主循环：开始页 → 游戏页 → [复活弹窗] → 结算页；图鉴、设置、暂停、分享。 */
(function () {
  const CS = window.CS, A = CS.Assets;
  CS.FONT = '"CatNum", "ZCOOL KuaiLe", "PingFang SC", "Hiragino Maru Gothic ProN", "Yuanti SC", "Microsoft YaHei", sans-serif';
  const $ = (id) => document.getElementById(id);
  const app = $('app'), canvas = $('stage'), ctx = canvas.getContext('2d', { alpha: false });
  const save = CS.Save.load();
  const game = new CS.Game();
  CS.game = game;

  let screen = 'loading';
  let paused = false, modal = null;
  let challenge = CS.Share.launchChallenge();
  let lastResult = null;
  let viewH = 1334, S = 1;

  // ---------------------------------------------------------------- 尺寸适配
  function safeInsets() {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(p);
    const cs = getComputedStyle(p);
    const r = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
    p.remove();
    return r;
  }
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let cssW = vw, cssH = vh;
    viewH = 750 * vh / vw;
    if (viewH < 1200) { viewH = 1200; cssW = vh * 750 / 1200; }           // 平板/桌面：左右留边
    if (viewH > 1800) { viewH = 1800; cssH = vw * 1800 / 750; }           // 极长屏：上下留边
    cssW = Math.floor(cssW); cssH = Math.floor(cssH);
    app.style.width = cssW + 'px'; app.style.height = cssH + 'px';
    document.documentElement.style.fontSize = (cssW / 7.5) + 'px';       // 1rem = 100 设计像素
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    S = canvas.width / 750;
    viewH = canvas.height / S;
    A.setRenderScale(S);
    app.classList.toggle('short', viewH < 1450);
    const ins = safeInsets(), k = 750 / cssW;
    const fullScreenH = Math.abs(cssH - vh) < 2;
    game.setView(viewH, fullScreenH ? ins.top * k : 0, fullScreenH ? ins.bottom * k : 0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  // ---------------------------------------------------------------- 图标
  const SVG = {
    settings: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><path d="M32 17l4 5 6-1 1 6 5 4-4 5 1 6-6 1-4 5-4-5-6-1 1-6-4-5 5-4 1-6 6 1z" fill="#F7A65A" stroke="#6B4A3A" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="32" r="5" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="3"/></svg>',
    gallery: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="12" ry="10" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><circle cx="17" cy="26" r="6" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><circle cx="27" cy="17" r="6" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><circle cx="38" cy="17" r="6" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><circle cx="48" cy="26" r="6" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/></svg>',
    close: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><path d="M22 22l20 20M42 22L22 42" stroke="#6B4A3A" stroke-width="6" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 64 64"><path d="M22 14l28 18-28 18z" fill="#FFF6E9" stroke="#6B4A3A" stroke-width="4" stroke-linejoin="round"/></svg>',
    coin: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="#FFD25E" stroke="#B9822F" stroke-width="5"/><circle cx="32" cy="32" r="18" fill="none" stroke="#F5B23B" stroke-width="4"/><ellipse cx="32" cy="36" rx="7" ry="6" fill="#B9822F"/><circle cx="23" cy="27" r="3.5" fill="#B9822F"/><circle cx="29" cy="22" r="3.5" fill="#B9822F"/><circle cx="36" cy="22" r="3.5" fill="#B9822F"/><circle cx="42" cy="27" r="3.5" fill="#B9822F"/></svg>',
    pause: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><rect x="22" y="20" width="7" height="24" rx="3" fill="#F7A65A" stroke="#6B4A3A" stroke-width="3"/><rect x="35" y="20" width="7" height="24" rx="3" fill="#F7A65A" stroke="#6B4A3A" stroke-width="3"/></svg>',
    home: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><path d="M18 32l14-13 14 13v13H18z" fill="#F7A65A" stroke="#6B4A3A" stroke-width="3" stroke-linejoin="round"/></svg>',
    restart: '<svg viewBox="0 0 64 64"><path d="M46 32a14 14 0 1 1-5-10.7" fill="none" stroke="#FFF6E9" stroke-width="7" stroke-linecap="round"/><path d="M44 14v10H34" fill="none" stroke="#FFF6E9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><circle cx="24" cy="32" r="5" fill="#F7A65A"/><circle cx="40" cy="22" r="5" fill="#F7A65A"/><circle cx="40" cy="42" r="5" fill="#F7A65A"/><path d="M24 32l16-10M24 32l16 10" stroke="#F7A65A" stroke-width="4"/></svg>',
    sound: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FFF3D6" stroke="#6B4A3A" stroke-width="4"/><path d="M18 27h7l9-8v26l-9-8h-7z" fill="#F7A65A" stroke="#6B4A3A" stroke-width="3" stroke-linejoin="round"/><path d="M40 25a10 10 0 0 1 0 14" fill="none" stroke="#6B4A3A" stroke-width="3" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 64 64"><path d="M20 12h24v12a12 12 0 0 1-24 0z" fill="#FFD25E" stroke="#B9822F" stroke-width="4"/><path d="M26 44h12v6H26zM22 52h20" stroke="#B9822F" stroke-width="4" fill="#FFD25E"/></svg>',
    heart: '<svg viewBox="0 0 64 64"><path d="M32 54S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 30-24 30z" fill="#FF8FAB" stroke="#6B4A3A" stroke-width="4"/></svg>',
    windarrow: '<svg viewBox="0 0 64 52"><path d="M6 18h30V6l22 20-22 20V34H6z" fill="#FFE7B8" stroke="#6B4A3A" stroke-width="4" stroke-linejoin="round"/></svg>',
    gust: '<svg viewBox="0 0 64 52"><path d="M4 20h34a8 8 0 1 0-8-8M4 32h46a7 7 0 1 1-7 7M10 26h28" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>',
    ad: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#FFD25E" stroke="#B9822F" stroke-width="4"/><rect x="18" y="22" width="28" height="20" rx="5" fill="#9B7BFF"/><path d="M29 27l8 5-8 5z" fill="#fff"/></svg>'
  };
  // 美术图标对应文件（assets/ui/icon_<name>.png）
  const ICON_FILE = { windarrow: 'icon_wind_arrow', gust: 'fx_wind_gust', pause: 'icon_pause', home: 'icon_home', restart: 'icon_restart', share: 'icon_share', sound: 'icon_sound', trophy: 'icon_trophy', heart: 'icon_heart', ad: 'icon_ad', settings: 'icon_settings', gallery: 'icon_gallery', close: 'icon_close', coin: 'icon_coin', play: 'icon_play' };
  function iconHtml(name) {
    const f = ICON_FILE[name];
    if (f && A.has('ui_' + f) && name !== 'restart') return '<img src="' + A.images['ui_' + f].src + '" alt="" draggable="false">';
    if (name === 'restart' && A.has('ui_icon_restart')) return '<img class="restart-img" src="' + A.images.ui_icon_restart.src + '" alt="" draggable="false">';
    return SVG[name] || '';
  }
  // 按钮文字放不下时逐步缩小字号（图标不缩），保证整组内容留在按钮内边距里
  function fitButton(b, tries) {
    if (!b) return;
    if (!b.clientWidth) { if ((tries || 0) < 30) requestAnimationFrame(() => fitButton(b, (tries || 0) + 1)); return; }   // 还没显示出来：下一帧再量
    const t = [...b.children].find(k => !k.classList.contains('ico'));
    if (!t) return;
    t.style.fontSize = '';
    const cs = getComputedStyle(b), avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const gap = parseFloat(cs.columnGap) || 0;
    const used = () => [...b.children].filter(k => getComputedStyle(k).display !== 'none').reduce((w, k, i) => w + k.getBoundingClientRect().width + (i ? gap : 0), 0);
    let fs = parseFloat(getComputedStyle(t).fontSize), n = 0;
    while (used() > avail && n++ < 12) { fs *= 0.94; t.style.fontSize = fs + 'px'; }
  }
  function fillIcons(root) { (root || document).querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = iconHtml(el.getAttribute('data-ico')); }); }

  function applyUiArt() {
    const r = document.documentElement;
    if (A.has('ui_btn_orange')) { r.style.setProperty('--btn-orange', 'url("' + A.images.ui_btn_orange.src + '")'); r.classList.add('art-orange'); }
    if (A.has('ui_btn_purple')) { r.style.setProperty('--btn-purple', 'url("' + A.images.ui_btn_purple.src + '")'); r.classList.add('art-purple'); }
    if (A.has('ui_panel')) { r.style.setProperty('--panel', 'url("' + A.images.ui_panel.src + '")'); r.classList.add('art-panel'); }
    if (A.has('ui_logo')) { $('logo').innerHTML = '<img src="' + A.images.ui_logo.src + '" alt="叠猫猫">'; $('logo').classList.add('has-img'); }
    fillIcons();
  }

  // ---------------------------------------------------------------- 工具
  function show(id) {
    if (screen === id) return;
    const prev = $(screen);
    if (prev) prev.classList.remove('active');
    screen = id;
    $(id).classList.add('active');
  }
  function openModal(id) { closeModal(); modal = id; $(id).classList.add('show'); }
  function closeModal() { if (modal) $(modal).classList.remove('show'); modal = null; }
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function vibrate(ms) { if (save.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* */ } } }
  function roll(el, from, to, ms, onTick) {
    const t0 = performance.now(); let last = from;
    return new Promise((res) => {
      function f(now) {
        const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        const v = Math.round(from + (to - from) * e);
        el.textContent = v;
        if (v !== last && onTick) onTick(v); last = v;
        if (k < 1) requestAnimationFrame(f); else res();
      }
      requestAnimationFrame(f);
    });
  }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  function renderToggles() {
    document.querySelectorAll('[data-toggles]').forEach((box) => {
      box.innerHTML = '';
      [['music', '背景音乐'], ['sfx', '音效'], ['vibrate', '震动']].forEach(([k, label]) => {
        const row = document.createElement('label'); row.className = 'toggle';
        row.innerHTML = '<span>' + label + '</span><input type="checkbox"' + (save.settings[k] ? ' checked' : '') + '><i></i>';
        row.querySelector('input').addEventListener('change', (e) => {
          const on = e.target.checked;
          if (k === 'music') CS.audio.setMusic(on); else if (k === 'sfx') CS.audio.setSfx(on); else { save.settings.vibrate = on; CS.Save.commit(); if (on) vibrate(20); }
          CS.audio.play('button');
          updateSoundBtn();
        });
        box.appendChild(row);
      });
    });
  }
  function updateSoundBtn() { $('btnSound').classList.toggle('off', CS.audio.muted); }

  // ---------------------------------------------------------------- 开始页
  function refreshStart() {
    $('startCoins').textContent = save.coins;
    $('startBest').textContent = save.best;
    const daily = save.lastDaily !== CS.Save.today();
    $('dailyTip').classList.toggle('hidden', !daily);
    if (challenge) {
      $('challengeBanner').classList.remove('hidden');
      $('challengeText').textContent = (challenge.score != null ? 'TA 拿到了 ' + challenge.score + ' 分，' : '') + '用同一串猫咪超过 TA！挑战码 ' + challenge.code;
      $('btnPlayText').textContent = '接受挑战';
    } else {
      $('challengeBanner').classList.add('hidden');
      $('btnPlayText').textContent = '开始游戏';
    }
    updateSoundBtn();
  }
  function goHome() {
    closeModal(); paused = false;
    CS.audio.setWind(0);
    game.state = 'idle';
    game.camY = game.camMenu;
    refreshStart();
    show('start');
  }

  // ---------------------------------------------------------------- 游戏页
  let tipShown = false;
  function startRound() {
    closeModal(); paused = false;
    const seed = challenge ? challenge.seed : CS.newSeed();
    game.start({ seed });
    $('hudChallenge').classList.toggle('hidden', !challenge || challenge.score == null);
    if (challenge && challenge.score != null) $('hudChallenge').textContent = '目标 ' + challenge.score + ' 分';
    $('hudTip').classList.toggle('show', !tipShown);
    updateSwap();
    show('game');
  }
  let hudLast = { height: -1, score: -1 };
  game.on('hud', (h) => {
    if (h.height !== hudLast.height) { if (hudLast.height >= 0 && h.height > hudLast.height) { roll($('hudHeight'), hudLast.height, h.height, 300); bump($('hudHeight').parentNode); } else $('hudHeight').textContent = h.height; }
    if (h.score !== hudLast.score) { const el = $('hudScore'); roll(el, Math.max(0, hudLast.score), h.score, 350); }
    hudLast = { height: h.height, score: h.score };
    drawNext(h.next);
    if (game.state === 'play' && !paused) CS.audio.setWind(Math.abs(h.wind || 0), Math.sign(h.wind || 0));
    const w = $('hudWind');
    if (h.wind && Math.abs(h.wind) > 0.05) {
      w.classList.remove('hidden');
      const n = Math.abs(h.wind) > 0.6 ? 3 : Math.abs(h.wind) > 0.3 ? 2 : 1;
      const el = $('windArrow');
      el.innerHTML = iconHtml('windarrow').repeat(n);
      el.classList.toggle('left', h.wind < 0);
    } else w.classList.add('hidden');
    updateSwap();
  });
  function drawNext(type) {
    const c = $('nextCanvas'), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    if (!type) return;
    const T = A.CAT_TYPES[type], img = A.images['cat_' + type];
    const k = Math.min(140 / T.w, 96 / T.h);
    g.drawImage(img, (c.width - T.w * k) / 2, (c.height - T.h * k) / 2 + 4, T.w * k, T.h * k);
    const box = c.parentNode; bump(box);
  }
  // 换猫按钮：始终显示真实剩余次数；不可用时置灰并写明原因，点一下会提示原因
  const SWAP_REASON = { used: '本局换猫次数已用完', loaf: '已经是吐司猫啦', ad: '广告还没准备好，稍后再试', busy: '' };
  function swapReason() {
    const r = game.swapBlockReason ? game.swapBlockReason() : 'busy';
    if (r) return r;
    return CS.ads.isReady('swap_cat') ? null : 'ad';
  }
  function updateSwap() {
    const b = $('btnSwap');
    const left = Math.max(0, CS.CONFIG.limits.swapPerRound - (game.swapsUsed || 0));
    const r = screen === 'game' || screen === 'start' ? swapReason() : 'busy';
    b.classList.toggle('is-disabled', !!r);
    b.setAttribute('aria-disabled', r ? 'true' : 'false');
    $('swapLeft').textContent = r === 'used' ? '已用完' : r === 'loaf' ? '已是吐司猫' : r === 'ad' ? '广告未就绪' : '剩 ' + left + ' 次';
  }
  game.on('spawn', (type) => { updateSwap(); if (game.catIndex > 0) CS.audio.play('meow3', { volume: 0.35, rate: CS.audio.meowRate(type) * 1.1 }); });
  game.on('vibrate', vibrate);
  game.on('milestone', (m) => {
    const segs = A.BG_SEGMENTS, names = { garden: '花园', rooftop: '屋顶', clouds: '云层', stars: '星空', space: '太空' };
    let sub = '继续加油！';
    for (const s of segs) if (s.from === m) sub = '进入' + names[s.id] + '区';
    $('msNum').textContent = m + ' 米！'; $('msSub').textContent = sub;
    const el = $('milestone'); el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go');
    flash();
  });
  game.on('collapse', () => { updateSwap(); CS.audio.setWind(0); });   // 塔倒了：风声淡出（复活后由 HUD 重新淡入）
  game.on('windStart', (w) => {
    const el = $('windPop');
    $('windPopArrow').classList.toggle('left', w < 0);
    el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go');
    CS.audio.play('wind_gust');
  });
  game.on('failed', () => {
    if (game.reviveUsed < CS.CONFIG.limits.revivePerRound && game.snapshot.length) showRevive();
    else finishRound();
  });
  function flash() { const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

  function onTap(e) {
    if (screen === 'game' && !paused && !modal) {
      if (game.drop()) {
        if (!tipShown) { tipShown = true; $('hudTip').classList.remove('show'); }
        updateSwap();
      }
    } else if (screen === 'start' && !modal) {
      // 摸摸开始页的猫
      const r = canvas.getBoundingClientRect();
      const y = (e.clientY - r.top) / r.height * viewH + game.camMenu;
      const x = (e.clientX - r.left) / r.width * 750;
      if (y > -170 && y < 10 && Math.abs(x - 375) < 140) {
        CS.audio.play(game.fx() < 0.5 ? 'meow1' : 'meow2', { rate: 0.9 });
        game.burst(x, y - 40, 'heart', 6);
      }
    }
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(e); });
  document.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && screen === 'game') { e.preventDefault(); onTap(e); } if (e.code === 'Escape' && screen === 'game') togglePause(true); });

  function togglePause(on) {
    if (screen !== 'game') return;
    if (on) { if (modal) return; paused = true; openModal('pauseModal'); CS.audio.setWind(0); }
    else { paused = false; closeModal(); game.hud(); }      // hud() 会在有风时把风声淡入回来
  }

  // ---------------------------------------------------------------- 复活
  function showRevive() {
    paused = true;
    const ready = CS.ads.isReady('revive');
    $('btnRevive').disabled = !ready;
    $('btnReviveText').textContent = ready ? '看广告复活' : '广告暂不可用';
    const r = game.result();
    $('reviveScore').textContent = r.score; $('reviveHeight').textContent = r.height;
    openModal('reviveModal');
    CS.audio.play('game_over');
  }
  CS.ads.onChange(() => {
    if (modal === 'reviveModal') { const ready = CS.ads.isReady('revive'); $('btnRevive').disabled = !ready; $('btnReviveText').textContent = ready ? '看广告复活' : '广告暂不可用'; }
    if (screen === 'game') updateSwap();
    if (screen === 'result') updateDouble();
  });

  // ---------------------------------------------------------------- 结算
  function finishRound() {
    closeModal(); paused = false;
    game.state = 'over';
    CS.audio.setWind(0);
    const R = game.result();                 // 唯一口径：与 HUD、复活弹窗完全一致
    const height = R.height, score = R.score;
    const prevBest = save.best;
    const isRecord = score > prevBest && score > 0;
    let coins = R.coins, daily = 0;
    if (save.lastDaily !== CS.Save.today()) { daily = CS.CONFIG.economy.dailyBonus; save.lastDaily = CS.Save.today(); }
    save.coins += coins + daily;
    if (isRecord) save.best = score;
    save.bestHeight = Math.max(save.bestHeight, height);
    save.stats.rounds++; save.stats.cats += game.cats.length; save.stats.perfects += game.perfects;
    CS.Save.commit();
    lastResult = { height, score, coins, daily, doubled: false, code: CS.seedToCode(game.seed), seed: game.seed, snapshot: game.snapshot.slice(), isRecord, prevBest, best: save.best };

    $('resultTitle').textContent = isRecord ? '太厉害啦！' : (height >= 10 ? '叠得真高！' : '猫塔倒啦～');
    $('recordRibbon').classList.toggle('hidden', !isRecord);
    $('resBest').textContent = isRecord ? prevBest : save.best;
    $('resSeed').textContent = lastResult.code;
    $('resDaily').classList.toggle('hidden', !daily);
    $('resHeight').textContent = '0'; $('resScore').textContent = '0'; $('resCoins').textContent = '0';
    const cr = $('challengeResult');
    if (challenge && challenge.score != null) {
      cr.classList.remove('hidden');
      cr.className = 'challenge-result ' + (score > challenge.score ? 'win' : 'lose');
      cr.textContent = score > challenge.score ? '挑战成功！你比好友多 ' + (score - challenge.score) + ' 分' : '还差 ' + (challenge.score - score + 1) + ' 分就能超过好友';
    } else cr.classList.add('hidden');
    drawThumb();
    updateDouble();
    show('result');
    if (isRecord) { setTimeout(() => { CS.audio.play('new_record'); confettiDom(); }, 350); }
    setTimeout(() => {
      roll($('resHeight'), 0, height, 600);
      roll($('resScore'), 0, score, 700).then(() => {
        if (isRecord) { $('resBest').textContent = score; bump($('resBest')); }
        roll($('resCoins'), 0, coins + daily, 600, () => CS.audio.play('coin', { rate: 1 + game.fx() * 0.06 }));
      });
    }, 250);
  }
  function updateDouble() {
    const b = $('btnDouble');
    if (!lastResult) return;
    const ready = CS.ads.isReady('double_coins');
    b.disabled = lastResult.doubled || !ready || lastResult.coins <= 0;
    $('btnDoubleText').textContent = lastResult.doubled ? '已领取双倍 +' + lastResult.coins : (lastResult.coins <= 0 ? '本局没有金币可翻倍' : ready ? '看广告领取双倍 +' + lastResult.coins : '广告暂不可用');
    fitButton(b);
  }
  function drawThumb() {
    const c = $('towerThumb'), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    if (lastResult.snapshot.length) game.renderTower(g, lastResult.snapshot, 10, 10, c.width - 20, c.height - 16);
    else {
      game.renderTower(g, [], 10, 10, c.width - 20, c.height - 16);
      g.font = '30px ' + CS.FONT; g.fillStyle = '#8A6A5A'; g.textAlign = 'center'; g.fillText('一只猫都没站稳…', c.width / 2, c.height / 2);
    }
  }
  function confettiDom() {
    const box = document.createElement('div'); box.className = 'confetti';
    const colors = ['#FF9EB5', '#FFC48C', '#9EE6CF', '#9FD4FF', '#C7B8FF', '#FFE27A'];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('i');
      p.style.left = (game.fx() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (game.fx() * 0.6) + 's';
      p.style.animationDuration = (1.6 + game.fx() * 1.2) + 's';
      p.style.transform = 'rotate(' + Math.round(game.fx() * 360) + 'deg)';
      box.appendChild(p);
    }
    app.appendChild(box);
    setTimeout(() => box.remove(), 3500);
  }

  // ---------------------------------------------------------------- 图鉴
  let galleryTab = 'skins';
  function buildGallery() {
    $('galleryCoins').textContent = save.coins;
    const sg = $('skinGrid'); sg.innerHTML = '';
    A.SKINS.forEach((s) => {
      const owned = save.skinsOwned.indexOf(s.id) >= 0 || s.price === 0;
      const using = save.skin === s.id;
      const card = document.createElement('div');
      card.className = 'card' + (using ? ' using' : '') + (owned ? '' : ' locked');
      const cv = document.createElement('canvas'); cv.width = 260; cv.height = 200;
      drawSkinPreview(cv, s.id);
      card.appendChild(cv);
      const name = document.createElement('div'); name.className = 'card-name'; name.textContent = s.name; card.appendChild(name);
      const btn = document.createElement('button');
      btn.className = 'btn btn-card ' + (using ? 'btn-plain' : owned ? 'btn-orange' : 'btn-purple');
      if (using) { btn.innerHTML = '<span>' + (s.id === 'none' ? '当前选择' : '佩戴中') + '</span>'; btn.disabled = true; }
      else if (owned) btn.innerHTML = '<span>' + (s.id === 'none' ? '选这个' : '佩戴') + '</span>';
      else { btn.innerHTML = '<span class="ico ico-coin">' + iconHtml('coin') + '</span><span>' + s.price + '</span>'; if (save.coins < s.price) btn.classList.add('poor'); }
      btn.addEventListener('click', () => onSkin(s, owned));
      card.appendChild(btn);
      sg.appendChild(card);
    });
    const cg = $('catGrid'); cg.innerHTML = '';
    A.CAT_ORDER.forEach((id) => {
      const T = A.CAT_TYPES[id], seen = save.seenCats.indexOf(id) >= 0;
      const card = document.createElement('div'); card.className = 'card cat-card' + (seen ? '' : ' unseen');
      const cv = document.createElement('canvas'); cv.width = 260; cv.height = 200;
      const g = cv.getContext('2d'), img = A.images['cat_' + id];
      const k = Math.min(230 / T.w, 170 / T.h);
      g.drawImage(img, (260 - T.w * k) / 2, (200 - T.h * k) / 2, T.w * k, T.h * k);
      if (!seen) { g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(107,74,58,0.28)'; g.fillRect(0, 0, 260, 200); g.globalCompositeOperation = 'source-over'; }
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', '<div class="card-name">' + (seen ? T.name : '？？？') + ' <em>' + T.trait + '</em></div><div class="card-desc">' + (seen ? T.desc : T.unlock) + '</div>');
      cg.appendChild(card);
    });
  }
  function drawSkinPreview(cv, skinId) {
    const g = cv.getContext('2d');
    const id = 'white', T = A.CAT_TYPES[id];
    const k = Math.min(200 / T.w, 130 / T.h);
    g.save();
    g.translate((cv.width - T.w * k) / 2, cv.height - T.h * k - 14);
    g.scale(k, k);
    g.drawImage(A.images['cat_' + id], 0, 0, T.w, T.h);
    A.drawAccessory(g, id, skinId, T.w, T.h);
    g.restore();
  }
  function onSkin(s, owned) {
    if (owned) {
      save.skin = s.id; CS.Save.commit();
      CS.audio.play('meow2', { rate: 1.05 });
      toast(s.id === 'none' ? '之后的猫不戴配件' : '之后的猫都戴「' + s.name + '」');
      buildGallery();
      return;
    }
    if (save.coins < s.price) { toast('金币不够哦，还差 ' + (s.price - save.coins) + ' 枚'); return; }
    save.coins -= s.price; save.skinsOwned.push(s.id); save.skin = s.id; CS.Save.commit();
    CS.audio.play('unlock'); CS.audio.play('meow2', { delay: 0.6 });
    confettiDom();
    toast('解锁「' + s.name + '」！已佩戴');
    buildGallery();
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    galleryTab = t.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
    $('skinGrid').classList.toggle('hidden', galleryTab !== 'skins');
    $('catGrid').classList.toggle('hidden', galleryTab !== 'cats');
  }));

  // ---------------------------------------------------------------- 分享弹窗
  let shareCtx = null;
  const ui = {
    showShareSheet(o) {
      shareCtx = o;
      $('shareImg').src = o.dataUrl || '';
      $('btnSaveImg').href = o.dataUrl || '#';
      $('btnNativeShare').classList.toggle('hidden', !CS.Share.canNativeShare());
      openModal('shareModal');
    },
    setShareDownload(url) { $('btnSaveImg').href = url; }
  };

  // ---------------------------------------------------------------- 按钮
  function on(id, fn) { $(id).addEventListener('click', fn); }
  document.addEventListener('pointerdown', (e) => {
    CS.audio.unlock();
    const b = e.target.closest && e.target.closest('.btn');
    if (b && !b.disabled) CS.audio.play('button');
  }, true);
  on('btnPlay', startRound);
  on('btnGallery', () => { buildGallery(); show('gallery'); });
  on('btnGalleryBack', goHome);
  on('btnSettings', () => { renderToggles(); openModal('settingsModal'); });
  on('btnSound', () => { CS.audio.setMuted(!CS.audio.muted); updateSoundBtn(); renderToggles(); toast(CS.audio.muted ? '已静音' : '声音已打开'); });
  on('btnPause', () => togglePause(true));
  on('btnResume', () => togglePause(false));
  on('btnRestart', startRound);
  on('btnQuit', goHome);
  on('btnSwap', () => {
    const r = swapReason();
    if (r) { if (SWAP_REASON[r]) toast(SWAP_REASON[r]); return; }
    paused = true;
    CS.ads.showRewarded('swap_cat').then((ok) => {
      paused = false;
      if (ok && game.swapToLoaf()) CS.audio.play('meow2', { rate: 0.9 });
      else if (!ok) toast('广告没有看完，没有换猫');
      updateSwap();
    });
  });
  on('btnRevive', () => {
    if ($('btnRevive').disabled) return;
    $('btnRevive').disabled = true;
    CS.ads.showRewarded('revive').then((ok) => {
      if (ok) { closeModal(); paused = false; game.revive(); updateSwap(); }
      else { toast('广告没有看完，无法复活'); finishRound(); }
    });
  });
  on('btnGiveUp', finishRound);
  on('btnAgain', startRound);
  on('btnHome', goHome);
  on('btnDouble', () => {
    if ($('btnDouble').disabled || !lastResult || lastResult.doubled) return;
    $('btnDouble').disabled = true;
    CS.ads.showRewarded('double_coins').then((ok) => {
      if (ok && !lastResult.doubled) {
        // DESIGN.md §6 v1.3：只翻本局高度+完美落点的金币，每日首局 50 不参与
        lastResult.doubled = true;
        const extra = lastResult.coins;
        save.coins += extra; CS.Save.commit();
        const total = lastResult.coins + lastResult.daily;
        roll($('resCoins'), total, total + extra, 700, () => CS.audio.play('coin', { rate: 1 + game.fx() * 0.06 }));
        const fl = $('coinFloat'); fl.textContent = '+' + extra; fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      } else if (!ok) toast('广告没有看完，没有发放奖励');
      updateDouble();
    });
  });
  on('btnShare', () => { if (lastResult) CS.Share.share(game, lastResult, ui); });
  on('btnNativeShare', () => { if (shareCtx) CS.Share.nativeShare(shareCtx.text, shareCtx.link); });
  on('btnCopyLink', () => {
    if (!shareCtx) return;
    const txt = shareCtx.text + ' ' + shareCtx.link;
    const done = () => toast('挑战链接已复制，发给好友吧！');
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动复制：' + shareCtx.link); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', (e) => { if (e.target === m && (m.id === 'settingsModal' || m.id === 'shareModal')) closeModal(); }));

  // ---------------------------------------------------------------- 前后台
  function onHide() { CS.audio.setHidden(true); if (screen === 'game' && game.state === 'play' && !modal && !CS.ads.isShowing) togglePause(true); }
  function onShow() { CS.audio.setHidden(false); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else onShow(); });
  window.addEventListener('pagehide', onHide);
  try {
    if (window.tap && typeof window.tap.onHide === 'function') window.tap.onHide(onHide);
    if (window.tap && typeof window.tap.onShow === 'function') window.tap.onShow(onShow);
  } catch (e) { /* */ }
  CS.Share.onShowChallenge((c) => { challenge = c; if (screen === 'start') refreshStart(); });

  // ---------------------------------------------------------------- 主循环
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    if (!paused && !modal && !CS.ads.isShowing) game.update(dt);
    else if (modal === 'reviveModal') game.update(dt * 0.35);   // 复活弹窗后面猫塔继续慢慢塌
    if (screen !== 'loading') game.draw(ctx, S);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- 启动
  function boot() {
    resize();
    CS.ads.init();
    $('ver').textContent = CS.CONFIG.version;
    $('verTag').textContent = 'v' + CS.CONFIG.version.split('.').slice(0, 2).join('.');
    const fill = $('loadFill'), tip = $('loadTip');
    const tips = ['猫咪正在伸懒腰…', '正在给猫咪梳毛…', '正在摆放软垫…'];
    let ti = 0; const tiv = setInterval(() => { ti = (ti + 1) % tips.length; tip.textContent = tips[ti]; }, 900);
    const fontP = (document.fonts && document.fonts.load) ? Promise.race([Promise.all([document.fonts.load('40px "ZCOOL KuaiLe"', '叠猫猫'), document.fonts.load('40px "CatNum"', '0123')]), new Promise(r => setTimeout(r, 1500))]).catch(() => {}) : Promise.resolve();
    Promise.all([A.load((p) => { fill.style.width = Math.round(10 + p * 90) + '%'; }), fontP]).then(() => {
      clearInterval(tiv);
      applyUiArt();
      renderToggles();
      refreshStart();
      game.setView(viewH, game.safeTop, game.safeBottom);
      requestAnimationFrame(frame);
      setTimeout(() => { show('start'); }, 150);
    }).catch((e) => { tip.textContent = '加载失败，请刷新重试'; setTimeout(() => { throw e; }); });
  }
  boot();

  // 测试/调试钩子（不影响正式玩法）
  CS.debug = { fitButton, swapReason, startRound, finishRound, showRevive, goHome, get screen() { return screen; }, get lastResult() { return lastResult; }, buildGallery, openGallery: () => { buildGallery(); show('gallery'); } };
})();
