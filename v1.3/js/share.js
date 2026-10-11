/* 分享与挑战：
 *  - TapTap 内：tap.showShareboard({ templateId, sceneParam: 'seed=xxxx&score=yy' })；
 *    启动/回到前台时读 tap.getLaunchOptionsSync().sceneParam / tap.onShow(res.sceneParam) 进入挑战模式。
 *  - 普通浏览器：生成 750×1334 分享图 + 带 ?seed=&score= 的挑战链接；Web Share API（支持文件时带图），否则长按保存 / 下载 / 复制链接。
 *  所有 tap 调用都先判断存在。 */
(function () {
  const CS = window.CS;
  const tap = () => (typeof window.tap !== 'undefined' && window.tap) ? window.tap : null;

  function parseParams(p) {
    if (!p) return null;
    let seed = null, score = null;
    if (typeof p === 'string') {
      const q = new URLSearchParams(p.charAt(0) === '?' ? p.slice(1) : p);
      seed = q.get('seed'); score = q.get('score');
    } else if (typeof p === 'object') { seed = p.seed; score = p.score; }
    const s = CS.codeToSeed(seed);
    if (s == null) return null;
    const sc = parseInt(score, 10);
    return { seed: s, code: CS.seedToCode(s), score: isFinite(sc) && sc >= 0 ? Math.min(sc, 999999) : null };
  }

  function launchChallenge() {
    const t = tap();
    if (t && typeof t.getLaunchOptionsSync === 'function') {
      try { const o = t.getLaunchOptionsSync(); const c = o && parseParams(o.sceneParam || (o.query && o.query.sceneParam) || o.query); if (c) return c; } catch (e) { /* */ }
    }
    try { return parseParams(location.search); } catch (e) { return null; }
  }
  function onShowChallenge(fn) {
    const t = tap();
    if (t && typeof t.onShow === 'function') {
      try { t.onShow((res) => { const c = res && parseParams(res.sceneParam || (res.query && res.query.sceneParam) || res.query); if (c) fn(c); }); } catch (e) { /* */ }
    }
  }

  function challengeLink(code, score) {
    const base = (location.origin && location.origin !== 'null' ? location.origin : '') + location.pathname;
    return base + '?seed=' + encodeURIComponent(code) + '&score=' + score;
  }

  // ---------------- 分享图 ----------------
  function makeImage(game, r) {
    const Wd = 750, Ht = 1334;
    const c = document.createElement('canvas'); c.width = Wd; c.height = Ht;
    const g = c.getContext('2d');
    const segs = CS.Assets.BG_SEGMENTS;
    let seg = segs[0]; for (const s of segs) if (r.height >= s.from) seg = s;
    const bg = CS.Assets.images['bg_' + seg.id];
    const k = Ht / bg.height; g.drawImage(bg, (Wd - bg.width * k) / 2, 0, bg.width * k, Ht);
    const ov = g.createLinearGradient(0, 0, 0, Ht); ov.addColorStop(0, 'rgba(255,255,255,0.1)'); ov.addColorStop(0.75, 'rgba(255,246,233,0.35)'); ov.addColorStop(1, 'rgba(255,246,233,0.95)');
    g.fillStyle = ov; g.fillRect(0, 0, Wd, Ht);
    const F = CS.FONT;
    const outline = (txt, x, y, size, fill, stroke, lw) => {
      g.font = size + 'px ' + F; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = lw || size * 0.22; g.strokeStyle = stroke || '#6B4A3A'; g.strokeText(txt, x, y);
      g.fillStyle = fill; g.fillText(txt, x, y);
    };
    // 标题
    const logo = CS.Assets.images.ui_logo;
    if (logo) { const lw = 460, lh = lw * logo.height / logo.width; g.drawImage(logo, (Wd - lw) / 2, 50, lw, lh); }
    else outline('叠猫猫', Wd / 2, 130, 120, '#FFB15E', '#6B4A3A', 22);
    // 猫塔卡片：按猫塔实际大小裁切放大（矮塔不再缩在角落）
    const cx0 = 50, cy0 = 230, cw0 = 650, ch0 = 690;
    roundRect(g, cx0, cy0, cw0, ch0, 48); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    g.save(); roundRect(g, cx0, cy0, cw0, ch0, 48); g.clip();
    game.renderTower(g, r.snapshot || [], cx0 + 25, cy0 + 25, cw0 - 50, ch0 - 50, 2.4);
    g.restore();
    // 文案（加大字号）
    outline('我叠到了 ' + r.height + ' 米！', Wd / 2, 1000, 80, '#FFFFFF', '#6B4A3A', 16);
    outline('得分 ' + r.score, Wd / 2, 1090, 62, '#FFE27A', '#6B4A3A', 14);
    outline('你能叠过我吗？', Wd / 2, 1175, 66, '#FF8FAB', '#FFFFFF', 14);
    // 挑战码
    roundRect(g, 120, 1222, 510, 88, 44); g.fillStyle = '#6B4A3A'; g.fill();
    g.font = '46px ' + F; g.fillStyle = '#FFF6E9'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('挑战码 ' + r.code, Wd / 2, 1267);
    return c;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  let lastBlob = null, lastUrl = null;
  function canvasToBlob(c) {
    return new Promise((res) => {
      try { c.toBlob((b) => res(b), 'image/png'); } catch (e) { res(null); }
    });
  }

  const Share = {
    parseParams, launchChallenge, onShowChallenge, challengeLink, makeImage,
    get inTap() { const t = tap(); return !!(t && typeof t.showShareboard === 'function'); },

    // 返回 Promise<'tap'|'sheet'|'error'>
    share(game, r, ui) {
      const t = tap();
      if (t && typeof t.showShareboard === 'function') {
        try {
          const p = t.showShareboard({ templateId: CS.CONFIG.share.templateId, sceneParam: 'seed=' + r.code + '&score=' + r.score });
          if (p && typeof p.then === 'function') return p.then(() => 'tap', () => Share.sheet(game, r, ui));
          return Promise.resolve('tap');
        } catch (e) { /* 回退浏览器方案 */ }
      }
      return Share.sheet(game, r, ui);
    },

    sheet(game, r, ui) {
      const c = makeImage(game, r);
      const link = challengeLink(r.code, r.score);
      let dataUrl = '';
      try { dataUrl = c.toDataURL('image/png'); } catch (e) { dataUrl = ''; }
      ui.showShareSheet({ dataUrl, link, text: '我在《叠猫猫》叠了 ' + r.height + ' 米、' + r.score + ' 分！你能叠过我吗？挑战码 ' + r.code });
      return canvasToBlob(c).then((b) => {
        lastBlob = b;
        if (lastUrl) { try { URL.revokeObjectURL(lastUrl); } catch (e) { /* */ } }
        lastUrl = b ? URL.createObjectURL(b) : null;
        if (lastUrl) ui.setShareDownload(lastUrl);
        return 'sheet';
      });
    },

    // 在「分享」按钮点击（用户手势）里调用
    nativeShare(text, link) {
      if (!navigator.share) return Promise.resolve(false);
      const data = { title: '叠猫猫', text, url: link };
      try {
        if (lastBlob && typeof File === 'function') {
          const f = new File([lastBlob], 'catstack.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
        }
      } catch (e) { /* */ }
      return navigator.share(data).then(() => true, () => false);
    },
    canNativeShare() { return !!navigator.share; }
  };
  CS.Share = Share;
})();
