/* AdService —— 统一入口：CS.ads.showRewarded(placement): Promise<boolean>
 *  placement: 'revive' | 'double_coins' | 'swap_cat'（DESIGN.md §5）
 *  - TapTap 宿主内（存在全局 tap 且有 tap.createRewardedVideoAd）：TapProvider
 *      只用调研文档确认过的接口：createRewardedVideoAd({adUnitId}) / load() / show() / onLoad / onError / onClose，
 *      只有 onClose 回调里 res.isEnded === true 才发奖励。
 *  - 普通浏览器：MockProvider，2 秒假广告，始终返回 true（DESIGN.md §5）。
 *      调试：URL 加 ?adfail=1 模拟「看了但失败/没奖励」，?adfail=unready 模拟「广告未加载」（按钮置灰）。
 *  任何失败都 resolve(false)，从不 reject，从不卡住流程。首版只有激励视频，没有插屏。
 */
(function () {
  const CS = window.CS;
  const PLACEMENTS = ['revive', 'double_coins', 'swap_cat'];
  const listeners = new Set();
  function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); }

  // ---------------- TapTap ----------------
  function TapProvider(tap) {
    const slots = {};
    function slot(placement) {
      if (slots[placement]) return slots[placement];
      const s = { ad: null, ready: false, pending: null, retryTimer: 0 };
      slots[placement] = s;
      const adUnitId = (CS.CONFIG.ads.adUnitIds || {})[placement];
      try {
        s.ad = tap.createRewardedVideoAd({ adUnitId: adUnitId });
      } catch (e) { s.ad = null; }
      if (!s.ad) return s;
      const ad = s.ad;
      if (typeof ad.onLoad === 'function') ad.onLoad(() => { s.ready = true; emit(); });
      if (typeof ad.onError === 'function') ad.onError(() => {
        s.ready = false; emit();
        finish(s, false);
        clearTimeout(s.retryTimer);
        s.retryTimer = setTimeout(() => load(s), 30000);
      });
      if (typeof ad.onClose === 'function') ad.onClose((res) => {
        finish(s, !!(res && res.isEnded === true));
        s.ready = false; emit();
        load(s); // 预加载下一次
      });
      load(s);
      return s;
    }
    function load(s) {
      if (!s.ad || typeof s.ad.load !== 'function') return;
      try {
        const p = s.ad.load();
        if (p && typeof p.then === 'function') p.then(() => { s.ready = true; emit(); }, () => { s.ready = false; emit(); });
      } catch (e) { s.ready = false; emit(); }
    }
    function finish(s, ok) {
      if (!s.pending) return;
      const r = s.pending; s.pending = null;
      clearTimeout(r.timer);
      r.resolve(ok);
    }
    return {
      name: 'taptap',
      init() { PLACEMENTS.forEach(slot); },
      isReady(p) { const s = slot(p); return !!(s.ad && s.ready); },
      showRewarded(p) {
        const s = slot(p);
        if (!s.ad || s.pending) return Promise.resolve(false);
        return new Promise((resolve) => {
          s.pending = { resolve, timer: setTimeout(() => finish(s, false), CS.CONFIG.ads.showTimeoutMs) };
          const onFail = () => {
            // 展示失败：再尝试加载一次再展示，仍失败则不发奖励
            try {
              const lp = s.ad.load && s.ad.load();
              if (lp && typeof lp.then === 'function') {
                lp.then(() => {
                  const sp = s.ad.show();
                  if (sp && typeof sp.then === 'function') sp.then(null, () => finish(s, false));
                }, () => finish(s, false));
              } else finish(s, false);
            } catch (e) { finish(s, false); }
          };
          try {
            const sp = s.ad.show();
            if (sp && typeof sp.then === 'function') sp.then(null, onFail);
          } catch (e) { onFail(); }
        });
      }
    };
  }

  // ---------------- 模拟广告 ----------------
  function MockProvider() {
    const q = new URLSearchParams(location.search);
    const mode = q.get('adfail'); // '1' => 失败, 'unready' => 未加载
    let busy = false;
    return {
      name: 'mock',
      init() {},
      isReady() { return mode !== 'unready'; },
      showRewarded(placement) {
        if (busy || mode === 'unready') return Promise.resolve(false);
        busy = true;
        return new Promise((resolve) => {
          const el = document.createElement('div');
          el.className = 'mock-ad';
          const label = { revive: '复活', double_coins: '双倍金币', swap_cat: '换一只猫' }[placement] || placement;
          el.innerHTML = '<div class="mock-ad-box"><div class="mock-ad-tag">广告 · 模拟</div>' +
            '<div class="mock-ad-cat">' + (CS.assetFiles && CS.assetFiles.has('assets/ui/app_icon_512.png') ? '<img src="assets/ui/app_icon_512.png" alt="" style="width:96px;height:96px;border-radius:20px">' : '🐱') + '</div><div class="mock-ad-title">这里将播放激励视频</div>' +
            '<div class="mock-ad-sub">奖励：' + label + '</div>' +
            '<div class="mock-ad-count"><span>2</span> 秒后获得奖励</div></div>';
          document.body.appendChild(el);
          requestAnimationFrame(() => el.classList.add('show'));
          const total = CS.CONFIG.ads.mockDurationMs;
          const t0 = performance.now();
          const span = el.querySelector('.mock-ad-count span');
          const iv = setInterval(() => {
            const left = Math.max(0, Math.ceil((total - (performance.now() - t0)) / 1000));
            span.textContent = left;
          }, 100);
          setTimeout(() => {
            clearInterval(iv);
            el.classList.remove('show');
            setTimeout(() => el.remove(), 250);
            busy = false;
            resolve(mode !== '1');
          }, total);
        });
      }
    };
  }

  let provider = null;
  function getProvider() {
    if (provider) return provider;
    const tap = window.tap;
    if (tap && typeof tap.createRewardedVideoAd === 'function') provider = TapProvider(tap);
    else provider = MockProvider();
    try { provider.init(); } catch (e) { provider = MockProvider(); }
    return provider;
  }

  let showing = false;
  CS.ads = {
    get providerName() { return getProvider().name; },
    get isShowing() { return showing; },
    init() { getProvider(); },
    isReady(placement) { try { return getProvider().isReady(placement); } catch (e) { return false; } },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    showRewarded(placement) {
      if (PLACEMENTS.indexOf(placement) < 0) return Promise.resolve(false);
      if (showing) return Promise.resolve(false);
      showing = true;
      if (CS.audio) CS.audio.duck(true);
      let p;
      try { p = Promise.resolve(getProvider().showRewarded(placement)); } catch (e) { p = Promise.resolve(false); }
      return p.then(ok => !!ok, () => false).then((ok) => {
        showing = false;
        if (CS.audio) CS.audio.duck(false);
        emit();
        return ok;
      });
    }
  };
})();
