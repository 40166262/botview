/**
 * Sprite preload + clipped draw helpers.
 * PNG with real alpha; optional art keyed offline.
 */

const MANIFEST = {
  player: 'assets/player_grin.png',
  slime: 'assets/enemy_zombie.png',
  bat: 'assets/enemy_crawler.png',
  golem: 'assets/enemy_securibot.png',
  boss: 'assets/enemy_boss.png',
  shadow: 'assets/enemy_shadow.png',
  grin: 'assets/char_grin.png',
  medic: 'assets/char_medic.png',
  janitor: 'assets/char_janitor.png',
  intern: 'assets/char_intern.png',
  icons: 'assets/upgrade_icons_sheet.png',
  chest: 'assets/item_chest.png',
  chestHeal: 'assets/chest_heal.png',
  chestCoin: 'assets/chest_coin.png',
  chestUpgrade: 'assets/chest_upgrade.png',
  iconCoin: 'assets/icon_coin.png',
  iconDiamond: 'assets/icon_diamond.png',
  hubStages: 'assets/hub_stages.png',
  hubChars: 'assets/hub_chars.png',
  hubGacha: 'assets/hub_gacha.png',
  hubGallery: 'assets/hub_gallery.png',
  hubBag: 'assets/hub_bag.png',
  hubSettings: 'assets/hub_settings.png',
  propDesk: 'assets/prop_desk.png',
  propChair: 'assets/prop_chair.png',
  propCrate: 'assets/prop_crate.png',
  propBed: 'assets/prop_bed.png',
  propCart: 'assets/prop_cart.png',
  propPipe: 'assets/prop_pipe.png',
  propRock: 'assets/prop_rock.png',
  projChem: 'assets/proj_chem.png',
  projBullet: 'assets/proj_bullet.png',
  projExtinguish: 'assets/proj_extinguish.png',
  projNail: 'assets/proj_nail.png',
  roboVac: 'assets/icon_robo_vac.png',
  uiPause: 'assets/ui_btn_pause.png',
  uiPlay: 'assets/ui_btn_play.png',
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
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = max - min;
    // Near-white / low-chroma bright pixels → transparent (kills baked white mats)
    if ((r > whiteMin && g > whiteMin && b > whiteMin) || (lum > lumBg && chroma < 28)) {
      const t = Math.min(1, Math.max(0, (lum - lumBg) / (255 - lumBg)));
      d[i + 3] = Math.floor(d[i + 3] * (1 - t));
    } else if (lum > 210 && chroma < 40 && d[i + 3] > 0) {
      // Soft fringe: pale edge pixels partial fade
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
      const ox = Math.floor((side - cw) / 2);
      const oy = Math.floor((side - ch) / 2);
      ctx.drawImage(src, col * cw, row * ch, cw, ch, ox, oy, cw, ch);
      processed[`icon${idx}`] = cell;
    }
  }
}

function prepareOptionalArt() {
  const icons = getSprite('icons');
  if (icons) {
    try { sliceIconSheet(icons); } catch (e) { console.warn(e); }
  }
  const chest = getSprite('chest');
  if (chest) processed.chest = chest;
  // Safety net: strip residual near-white fringe on character/enemy art
  const chromaKeys = [
    'player', 'grin', 'medic', 'janitor', 'intern',
    'slime', 'bat', 'golem', 'boss', 'shadow',
  ];
  for (const key of chromaKeys) {
    const img = getSprite(key);
    if (!img) continue;
    try {
      processed[key] = chromaKeyToCanvas(img, { whiteMin: 232, lumBg: 238, fringe: true });
    } catch (e) { /* keep raw sprite */ }
  }
}

export function getIconCell(index) {
  return processed[`icon${index}`] || null;
}

export function getChestImage() {
  return processed.chest || getSprite('chest');
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
 * Draw full chibi sprite (NO circular clip / white plate).
 * Soft elliptical ground shadow only; optional soft tint/flash.
 */
export function drawClippedSprite(ctx, img, x, y, radius, opts = {}) {
  const scale = opts.scale != null ? opts.scale : 1.15;
  const flash = !!opts.flash;
  const r = radius * scale;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  // Prefer full sprite aspect; fit height to 2r
  const aspect = iw / Math.max(1, ih);
  const dh = r * 2;
  const dw = dh * Math.min(1.35, Math.max(0.75, aspect));
  const dx = x - dw / 2;
  const dy = y - dh / 2;

  // Soft elliptical ground shadow (not a white ring)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
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
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  if (opts.tint) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = opts.tint;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  }
  if (flash) {
    // Soft warm hit tint — avoid bright white plate on sprite edges
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = 'rgba(200,160,90,0.55)';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
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
