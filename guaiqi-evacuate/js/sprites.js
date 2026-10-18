/**
 * Sprite preload + clipped draw helpers.
 * PNG with real alpha; optional art keyed offline.
 */

const MANIFEST = {
  player: 'assets/player_grin.png',
  // v4 enemy art (keyed offline, real alpha, bbox-trimmed)
  slime: 'assets/enemy_office_zombie.png',
  bat: 'assets/enemy_crawler.png',
  armored: 'assets/enemy_armored.png',
  monitor: 'assets/enemy_monitor_bot.png',
  slacker: 'assets/enemy_slacker_zombie.png',
  golem: 'assets/enemy_securibot.png',
  boss: 'assets/enemy_boss.png',
  shadow: 'assets/enemy_shadow.png',
  // Style E pixel chars ~195x384 (aspect ~0.51); drawStandingSprite uses true aspect.
  // feet baseline y=511, figure ~490px tall, centred x=195. *_full.png = 512x768 UI art.
  grin: 'assets/char_grin.png',
  medic: 'assets/char_medic.png',
  janitor: 'assets/char_janitor.png',
  intern: 'assets/char_intern.png',
  icons: 'assets/upgrade_icons_sheet.png',
  chest: 'assets/item_chest.png',
  chestNormal: 'assets/chest_normal.png',
  chestRare: 'assets/chest_rare.png',
  chestGold: 'assets/chest_gold.png',
  chestHeal: 'assets/chest_heal.png',
  chestCoin: 'assets/chest_coin.png',
  chestUpgrade: 'assets/chest_upgrade.png',
  iconCoin: 'assets/icon_coin.png',
  iconDiamond: 'assets/icon_diamond.png',
  projChem: 'assets/proj_chem.png',
  projBullet: 'assets/proj_bullet.png',
  projExtinguish: 'assets/proj_extinguish.png',
  projNail: 'assets/proj_nail.png',
  roboVac: 'assets/icon_robo_vac.png',
  uiPause: 'assets/ui_btn_pause.png',
  uiPanel: 'assets/ui_panel.png',
};

/** @type {Record<string, HTMLImageElement|null>} */
const images = Object.create(null);
const processed = Object.create(null);

export function getSprite(key) {
  if (processed[key]) return processed[key];
  const img = images[key];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

export function getProcessed(key) {
  return processed[key] || null;
}

function loadOne(key, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve({ key, ok: true }); };
    img.onerror = () => { images[key] = null; resolve({ key, ok: false }); };
    img.src = src;
  });
}

export function chromaKeyToCanvas(img, opts = {}) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const whiteMin = opts.whiteMin ?? 235;
  const lumBg = opts.lumBg ?? 200;
  const doFringe = opts.fringe === true;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = max - min;
    // Near-white / low-chroma bright pixels → transparent (kills baked white mats)
    if ((r > whiteMin && g > whiteMin && b > whiteMin) || (lum > lumBg && chroma < 28)) {
      const t = Math.min(1, Math.max(0, (lum - lumBg) / (255 - lumBg)));
      d[i + 3] = Math.floor(d[i + 3] * (1 - t));
    } else if (doFringe && lum > 210 && chroma < 40 && d[i + 3] > 0) {
      // Soft fringe only when explicitly enabled — avoids punching holes in chibi art
      d[i + 3] = Math.floor(d[i + 3] * 0.35);
    }
  }
  // Optional: erode semi-transparent pale halo (1px neighbor of fully transparent)
  if (opts.fringe) {
    const alpha = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) alpha[p] = d[p * 4 + 3];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (alpha[p] === 0) continue;
        const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const nearEmpty =
          alpha[p - 1] < 20 || alpha[p + 1] < 20 ||
          alpha[p - w] < 20 || alpha[p + w] < 20;
        if (nearEmpty && lum > 185) {
          d[p * 4 + 3] = 0;
        }
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function sliceIconSheet(img) {
  const src = img;
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;
  // Prefer exact 5×5 square sheet; only fall back for legacy non-square packs
  let cols = 5, rows = 5;
  const square = Math.abs(w / h - 1) < 0.08;
  if (!square && w < 500) { cols = w >= h * 0.9 ? 4 : 2; rows = cols === 4 ? 4 : 3; }
  else if (!square && w > h * 1.4) { cols = 5; rows = 5; } // old 640×360 — still 5×5 but cells short
  const cw = Math.floor(w / cols), ch = Math.floor(h / rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      // Center content into a square canvas so card icons are never cropped crooked
      const side = Math.max(cw, ch);
      const cell = document.createElement('canvas');
      cell.width = side; cell.height = side;
      const ctx = cell.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = true;
      if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = true;
      const ox = Math.floor((side - cw) / 2);
      const oy = Math.floor((side - ch) / 2);
      ctx.drawImage(src, col * cw, row * ch, cw, ch, ox, oy, cw, ch);
      processed[`icon${idx}`] = cell;
    }
  }
}

/** True if image already has transparent corner pixels (real alpha PNG). */
function imageHasCornerAlpha(img) {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < 2 || h < 2) return false;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    for (const [x, y] of corners) {
      if (ctx.getImageData(x, y, 1, 1).data[3] < 250) return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

function prepareOptionalArt() {
  const icons = getSprite('icons');
  if (icons) {
    try { sliceIconSheet(icons); } catch (e) { console.warn(e); }
  }
  const chest = getSprite('chest');
  if (chest) processed.chest = chest;
  // 角色若已有透明角则跳过抠图，避免 chroma 把肤色/亮边打成洞；敌人仅做温和白底去除
  const charKeys = ['player', 'grin', 'medic', 'janitor', 'intern'];
  const enemyKeys = ['slime', 'bat', 'armored', 'monitor', 'slacker', 'golem', 'boss', 'shadow'];
  for (const key of charKeys) {
    const img = getSprite(key);
    if (!img) continue;
    if (imageHasCornerAlpha(img)) {
      processed[key] = img; // keep original alpha
      continue;
    }
    try {
      processed[key] = chromaKeyToCanvas(img, { whiteMin: 248, lumBg: 250, fringe: false });
    } catch (e) { /* keep raw */ }
  }
  for (const key of enemyKeys) {
    const img = getSprite(key);
    if (!img) continue;
    if (imageHasCornerAlpha(img)) {
      processed[key] = img;
      continue;
    }
    try {
      processed[key] = chromaKeyToCanvas(img, { whiteMin: 248, lumBg: 250, fringe: false });
    } catch (e) { /* keep raw */ }
  }
}

const _trimmed = {};
function trimCanvas(src) {
  const w = src.width, h = src.height;
  const c = src.getContext ? src : null;
  let ctx;
  let cv = src;
  if (!c) {
    cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(src, 0, 0);
  }
  ctx = cv.getContext('2d');
  let data;
  try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { return src; }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return src;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const side = Math.max(bw, bh) + 4;
  const out = document.createElement('canvas');
  out.width = side; out.height = side;
  out.getContext('2d').drawImage(cv, x0, y0, bw, bh, (side - bw) / 2, (side - bh) / 2, bw, bh);
  return out;
}

export function getIconCell(index) {
  const key = `icon${index}`;
  if (_trimmed[key]) return _trimmed[key];
  const raw = processed[key];
  if (!raw) return null;
  _trimmed[key] = trimCanvas(raw);
  return _trimmed[key];
}

/** Loot chest art by tier: 'normal' | 'rare' | 'gold'. */
export function getChestImage(tier = 'normal') {
  const key = tier === 'gold' ? 'chestGold' : tier === 'rare' ? 'chestRare' : 'chestNormal';
  return getSprite(key) || getSprite('chestUpgrade') || processed.chest || getSprite('chest');
}

export function getUiIcon(key) {
  return getSprite(key);
}

export function getCharSprite(charId) {
  if (charId === 'medic') return getSprite('medic');
  if (charId === 'janitor') return getSprite('janitor');
  if (charId === 'intern') return getSprite('intern');
  if (charId === 'grin') return getSprite('grin') || getSprite('player');
  return getSprite('player');
}

export async function preloadSprites(onProgress) {
  const entries = Object.entries(MANIFEST);
  let done = 0;
  const report = () => { if (typeof onProgress === 'function') onProgress(done / entries.length); };
  report();
  const results = await Promise.all(entries.map(async ([key, src]) => {
    const r = await loadOne(key, src);
    done += 1; report();
    return r;
  }));
  prepareOptionalArt();
  return {
    loaded: results.filter((r) => r.ok).map((r) => r.key),
    failed: results.filter((r) => !r.ok).map((r) => r.key),
  };
}

/**
 * Walk pose disabled — sprites stay stable while moving (no sway/rotate/squash).
 * Signature kept so call sites need no edits; applyWalk no-ops on null.
 */
export function walkPose(/* phase, amt */) {
  return null;
}

/** Apply a walkPose about pivot (px, py). */
function applyWalk(ctx, w, px, py) {
  if (!w) return;
  ctx.translate(px, py - w.lift);
  ctx.rotate(w.rot);
  ctx.scale(w.sx, w.sy);
  ctx.translate(-px, -py);
}

/**
 * Draw full chibi sprite (NO circular clip / white plate).
 * Soft elliptical ground shadow only; optional soft tint/flash.
 */
export function drawClippedSprite(ctx, img, x, y, radius, opts = {}) {
  const scale = opts.scale != null ? opts.scale : 1.15;
  const flash = !!opts.flash;
  const r = radius * scale;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  // True aspect (Style E tall pixels ~0.5); only cap absurdly wide
  const aspect = iw / Math.max(1, ih);
  const dh = Math.round(r * 2);
  const dw = Math.round(dh * Math.min(1.35, aspect));
  const dx = Math.round(x - dw / 2);
  const dy = Math.round(y - dh / 2);

  // Soft elliptical ground shadow (not a white ring)
  ctx.save();
  ctx.fillStyle = 'rgba(70,45,20,0.26)'; // warm contact shadow (was neutral gray)
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.72, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Very soft ambient (desaturated, never ringy white plate)
  if (opts.glow && opts.glow !== 'none') {
    const glowR = opts.glowRadius != null ? opts.glowRadius : r * 1.2;
    const g = ctx.createRadialGradient(x, y + r * 0.2, r * 0.15, x, y + r * 0.2, glowR);
    const base = opts.glow || 'rgba(60,60,50,0.10)';
    g.addColorStop(0, base);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.15, glowR * 0.75, glowR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  applyWalk(ctx, opts.walk, x, dy + dh * 0.94); // pivot near the feet
  ctx.imageSmoothingEnabled = true;
  if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = true;
  if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  // Tint / hit flash are drawn as a silhouette of the sprite itself (no rectangular box)
  if (opts.tint) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(silhouette(img, opts.tint), 0, 0, iw, ih, dx, dy, dw, dh);
    ctx.restore();
  }
  if (flash) {
    // soft warm hit tint — never pure white, never full-screen
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(silhouette(img, '#ffe2b0'), 0, 0, iw, ih, dx, dy, dw, dh);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draw an upright 3/4 top-down sprite standing on (x, footY): true aspect (no stretch),
 * contact shadow under the feet. `h` = target height; wide sprites are capped at `maxW`.
 */
export function drawStandingSprite(ctx, img, x, footY, h, opts = {}) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const aspect = iw / Math.max(1, ih);
  let dh = h, dw = h * aspect;
  if (opts.maxW && dw > opts.maxW) { dw = opts.maxW; dh = dw / aspect; }
  // Snap to integer pixels so Style E art stays crisp under VIEW_ZOOM
  dh = Math.round(dh);
  dw = Math.round(dw);
  const dx = Math.round(x - dw / 2);
  const dy = Math.round(footY - dh);
  ctx.save();
  ctx.fillStyle = opts.shadow || 'rgba(70,45,20,0.30)';
  ctx.beginPath();
  ctx.ellipse(x, footY - dh * 0.03, Math.max(dw * 0.42, 8), Math.max(dh * 0.09, 3.5), 0, 0, Math.PI * 2);
  ctx.fill();
  // r6: front-facing art — never mirrored; movement reads through the walk pose instead
  applyWalk(ctx, opts.walk, x, footY);
  ctx.imageSmoothingEnabled = true;
  if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = true;
  if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  if (opts.tint) {
    ctx.globalAlpha = opts.tintAlpha ?? 0.22;
    ctx.drawImage(silhouette(img, opts.tint), 0, 0, iw, ih, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  }
  if (opts.flash) {
    ctx.globalAlpha = 0.35; // soft warm hit tint — never pure white
    ctx.drawImage(silhouette(img, '#ffe2b0'), 0, 0, iw, ih, dx, dy, dw, dh);
  }
  ctx.restore();
  return { dw, dh };
}

const _silCache = new Map();
/** Cached single-colour silhouette of a sprite (alpha preserved). */
function silhouette(img, color) {
  let byImg = _silCache.get(img);
  if (!byImg) { byImg = new Map(); _silCache.set(img, byImg); }
  let c = byImg.get(color);
  if (c) return c;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  c = document.createElement('canvas');
  c.width = iw; c.height = ih;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, iw, ih);
  byImg.set(color, c);
  return c;
}

/** Draw sprite fitted in a rounded rect (hub cards) — no white circle. */
export function drawHubPortrait(ctx, img, x, y, w, h, radius = 12) {
  if (!img) return;
  drawRoundedImage(ctx, img, x, y, w, h, radius);
}

export function drawRoundedImage(ctx, img, x, y, w, h, radius = 12) {
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  const rr = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}
