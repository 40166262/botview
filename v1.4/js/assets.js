/* 资源系统：
 *  - 资源清单 js/asset-manifest.js（tools/build.py 扫描 assets/ 生成）：只加载真实存在的文件，缺失的用程序化默认图。
 *  - 猫咪类型、物理参数、配件挂点（每种猫的头顶 / 眼睛 / 脖子）。
 *  - 由图片透明通道自动计算凸包碰撞体（忽略耳朵）。
 *  - 预渲染的猫咪精灵缓存（含配件，随身体一起旋转）。 */
(function () {
  const CS = window.CS;
  CS.assetFiles = new Set(window.CS_ASSET_FILES || []);

  // ---------------- 猫咪 ----------------
  // anchors：相对整张图（0~1）。head = 头顶中心（帽子底边落点），eyes = 两眼中心，ear = 耳边（v1.4 起由脸部坐标系算出，见 applyFaceAnchors）；w = 该部位宽度（相对图宽），rot = 倾斜（弧度）
  const CAT_TYPES = {
    orange: {
      name: '橘猫', desc: '胖乎乎、又重又稳，新手好朋友', trait: '稳', unlock: '默认',
      w: 240, density: 0.0034, friction: 0.95, restitution: 0.03, color: '#FFB15E', meowRate: 0.9,
      anchors: { head: { x: 0.295, y: 0.16, w: 0.40, rot: 0.04 }, eyes: { x: 0.29, y: 0.47, w: 0.34, rot: 0.03 }, neck: { x: 0.285, y: 0.665, w: 0.36, rot: 0.03 } }
    },
    white: {
      name: '小白', desc: '标准身材，什么位置都能放', trait: '均衡', unlock: '默认',
      w: 236, density: 0.0026, friction: 0.9, restitution: 0.04, color: '#FFF8EE', meowRate: 1.0,
      anchors: { head: { x: 0.31, y: 0.16, w: 0.40, rot: 0.0 }, eyes: { x: 0.31, y: 0.47, w: 0.33, rot: 0.0 }, neck: { x: 0.305, y: 0.66, w: 0.36, rot: 0.0 } }
    },
    black: {
      name: '煤球', desc: '坐得笔直，又瘦又高，一碰就倒', trait: '易倒', unlock: '默认',
      w: 150, density: 0.0024, friction: 0.85, restitution: 0.05, color: '#3A3238', meowRate: 1.0,
      anchors: { head: { x: 0.48, y: 0.085, w: 0.72, rot: 0.0 }, eyes: { x: 0.475, y: 0.27, w: 0.62, rot: 0.0 }, neck: { x: 0.475, y: 0.405, w: 0.56, rot: 0.0 } }
    },
    loaf: {
      name: '吐司猫', desc: '扁扁一条，最适合当地基', trait: '平台', unlock: '默认',
      w: 300, density: 0.0026, friction: 1.0, restitution: 0.02, color: '#F6D59B', meowRate: 0.9,
      anchors: { head: { x: 0.215, y: 0.17, w: 0.30, rot: -0.03 }, eyes: { x: 0.19, y: 0.49, w: 0.23, rot: 0.04 }, neck: { x: 0.195, y: 0.675, w: 0.25, rot: 0.03 } }
    },
    ball: {
      name: '团子', desc: '缩成一个球，会滚来滚去，很难放', trait: '会滚', get unlock() { return '本局第 ' + (CS.CONFIG.spawn.ballFromIndex + 1) + ' 只起出现'; },
      w: 170, density: 0.0022, friction: 0.7, restitution: 0.06, color: '#B9B4BF', meowRate: 1.12, circle: true,
      anchors: { head: { x: 0.37, y: 0.20, w: 0.50, rot: -0.38 }, eyes: { x: 0.375, y: 0.43, w: 0.40, rot: -0.26 }, neck: { x: 0.405, y: 0.575, w: 0.36, rot: -0.26 } }
    },
    long: {
      name: '长条猫', desc: '超——长——，高风险高回报', trait: '超长', get unlock() { return '本局第 ' + (CS.CONFIG.spawn.longFromIndex + 1) + ' 只起出现'; },
      w: 350, density: 0.002, friction: 0.95, restitution: 0.03, color: '#FFE7C7', meowRate: 0.95,
      anchors: { head: { x: 0.21, y: 0.19, w: 0.19, rot: 0.0 }, eyes: { x: 0.205, y: 0.50, w: 0.15, rot: 0.0 }, neck: { x: 0.205, y: 0.72, w: 0.16, rot: 0.0 } }
    }
  };
  const CAT_ORDER = ['orange', 'white', 'black', 'loaf', 'ball', 'long'];
  const EXPR_STATES = ['scared', 'fall', 'happy', 'star'];

  // ---------------- 受惊表情贴片（v1.1，DESIGN.md §9） ----------------
  // 猫原图不动，在脸上贴「圆眼睛 / 张开的嘴 / 汗滴」。坐标都相对整张猫图（0~1）：
  //   eyes：两眼中心 x/y、贴片宽 w（相对图宽，要盖住原图闭眼线）、rot 倾斜
  //   mouth：嘴中心 x/y、宽 w；sweat：汗滴中心 x/y、宽 w、rot
  // 用 dev-skins.html?face=1 逐只核对。
  const FACES = {
    orange: { eyes: { x: 0.29, y: 0.47, w: 0.36, rot: 0.03 },  mouth: { x: 0.295, y: 0.635, w: 0.095 }, sweat: { x: 0.535, y: 0.36, w: 0.07, rot: 0.2 } },
    white:  { eyes: { x: 0.302, y: 0.47, w: 0.375, rot: 0.0 }, mouth: { x: 0.31, y: 0.635, w: 0.095 }, sweat: { x: 0.55, y: 0.36, w: 0.07, rot: 0.2 } },
    black:  { eyes: { x: 0.475, y: 0.27, w: 0.62, rot: 0.0 },  mouth: { x: 0.475, y: 0.372, w: 0.14 },  sweat: { x: 0.84, y: 0.20, w: 0.11, rot: 0.2 } },
    loaf:   { eyes: { x: 0.19, y: 0.49, w: 0.25, rot: 0.04 },  mouth: { x: 0.195, y: 0.665, w: 0.068 }, sweat: { x: 0.36, y: 0.40, w: 0.05, rot: 0.2 } },
    ball:   { eyes: { x: 0.375, y: 0.43, w: 0.42, rot: -0.26 }, mouth: { x: 0.41, y: 0.57, w: 0.11 }, sweat: { x: 0.63, y: 0.30, w: 0.085, rot: 0.0 } },
    long:   { eyes: { x: 0.205, y: 0.50, w: 0.165, rot: 0.0 }, mouth: { x: 0.205, y: 0.675, w: 0.045 }, sweat: { x: 0.30, y: 0.42, w: 0.035, rot: 0.2 } }
  };


  // ---------------- 皮肤配件（DESIGN.md §6） ----------------
  // slot：挂在哪个部位；s = 宽度 = 部位宽 × s；ax/ay = 配件图里对准挂点的位置（0~1）；dx/dy = 以部位宽为单位的偏移
  const SKINS = [
    { id: 'none', name: '不戴配件', price: 0 },
    // v1.4：围巾删掉了（没法自然地围住各种姿势的猫）。空出来的最便宜位置给「耳边小花」——只有构建时 assets/skins/skin_flower.png 存在才上架
    { id: 'flower', name: '耳边小花', price: 50, file: 'skin_flower', slot: 'ear', s: 1.0, ax: 0.5, ay: 0.5, dx: 0, dy: 0, r: -0.25, optional: true },
    { id: 'bow', name: '蝴蝶结', price: 60, file: 'skin_bow', slot: 'head', s: 0.42, ax: 0.5, ay: 0.55, dx: 0.33, dy: 0.08, r: 0.35 },
    { id: 'beanie', name: '毛线帽', price: 80, file: 'skin_beanie', slot: 'head', s: 0.78, ax: 0.5, ay: 0.86, dx: 0, dy: 0.05 },
    { id: 'strawhat', name: '草帽', price: 100, file: 'skin_strawhat', slot: 'head', s: 1.12, ax: 0.5, ay: 0.80, dx: 0, dy: 0.06 },
    { id: 'partyhat', name: '派对帽', price: 120, file: 'skin_partyhat', slot: 'head', s: 0.62, ax: 0.5, ay: 0.95, dx: 0, dy: 0.04 },
    // 墨镜：图已裁边且左右对称（两片镜片中点 = 图中心，误差 < 1 px），所以挂点 = 两眼中点；eyes 槽宽 = 2 × 眼距，s = 1
    { id: 'sunglasses', name: '墨镜', price: 150, file: 'skin_sunglasses', slot: 'eyes', s: 1.0, ax: 0.5, ay: 0.5, dx: 0, dy: 0 },
    { id: 'chefhat', name: '厨师帽', price: 200, file: 'skin_chefhat', slot: 'head', s: 0.66, ax: 0.5, ay: 0.92, dx: 0, dy: 0.04 },
    { id: 'crown', name: '皇冠', price: 300, file: 'skin_crown', slot: 'head', s: 0.52, ax: 0.5, ay: 0.92, dx: 0, dy: 0.03 }
  ];
  // optional 配件只有文件真的打进包（构建时生成的清单里有）才上架；没有就直接去掉，图鉴里不留空位
  for (let i = SKINS.length - 1; i >= 0; i--) {
    const k = SKINS[i];
    if (k.optional && !(window.CS_ASSET_FILES || []).some(f => f.indexOf('assets/skins/' + k.file + '.') === 0)) SKINS.splice(i, 1);
  }
  const SKIN_BY_ID = {}; SKINS.forEach(s => { SKIN_BY_ID[s.id] = s; });
  // 存档里未知 / 已下架的配件 id 一律当「不戴配件」
  const skinIdOrNone = (id) => (id && SKIN_BY_ID[id] ? id : 'none');

  // ---------------- v1.4 脸部坐标系（美术给的 sunglasses_anchors.json → 构建时嵌进 js/skin-anchors.js） ----------------
  // 原点 = 两眼中点，x 轴 = 两眼连线（倾斜角 angleDeg），单位 = 眼距。游戏和图鉴共用这一份：
  //   eyes = 两眼中点，宽 2 × 眼距，旋转 = 倾斜角；
  //   head = 原来的帽子高度投影到「过两眼中点、垂直于眼线」的脸中轴上（去掉以前帽子偏右的横向误差），宽度/角度沿用；
  //   ear  = 头顶往左耳方向（耳边小花用）。
  function applyFaceAnchors(id) {
    const F = (window.CS_SKIN_ANCHORS || {})[id], T = CAT_TYPES[id];
    if (!F || !T) return false;
    const img = images['cat_' + id];
    const W = (F.size && F.size[0]) || img.width, H = (F.size && F.size[1]) || img.height, t = F.angleDeg * Math.PI / 180;   // 按原图像素算（和显示尺寸同比例）
    const ex = F.cx * W, ey = F.cy * H, d = F.eyeDist * W;
    const ux = Math.sin(t), uy = -Math.cos(t);                 // 脸中轴「向上」
    const vx = Math.cos(t), vy = Math.sin(t);                  // 眼线方向（向右）
    const old = T.anchors.head;
    const along = (old.x * W - ex) * ux + (old.y * H - ey) * uy;
    T.anchors.eyes = { x: F.cx, y: F.cy, w: 2 * F.eyeDist, rot: t };
    T.anchors.head = { x: (ex + ux * along) / W, y: (ey + uy * along) / H, w: old.w, rot: old.rot };
    const er = T.earAnchor || { side: 0.9, up: 0.8, w: 0.55 };
    T.anchors.ear = { x: (ex - vx * d * er.side + ux * along * er.up) / W, y: (ey - vy * d * er.side + uy * along * er.up) / H, w: d * er.w / W, rot: t };
    delete T.anchors.neck;
    T.faceFrame = { cx: F.cx, cy: F.cy, eyeDist: F.eyeDist, angleDeg: F.angleDeg };
    return true;
  }

  // ---------------- 背景段（DESIGN.md §4 / §9） ----------------
  const BG_SEGMENTS = [
    { id: 'garden', from: 0, top: ['#BFE6FF', '#FFF1D6'] },
    { id: 'rooftop', from: 10, top: ['#FFC9B0', '#FFE9C9'] },
    { id: 'clouds', from: 20, top: ['#9FD4FF', '#E6F4FF'] },
    { id: 'stars', from: 35, top: ['#2E2A6B', '#6A4FA8'] },
    { id: 'space', from: 50, top: ['#120F33', '#3A2A6E'] }
  ];

  // v1.3：按钮和按钮图标改为矢量绘制，btn_orange / btn_purple / icon_ad / icon_home… 不再加载（构建时也不打包）
  const UI_FILES = ['icon_heart', 'icon_trophy', 'logo', 'icon_coin', 'panel', 'app_icon_512', 'fx_leaf_green', 'fx_leaf_orange', 'fx_petal_pink', 'fx_wind_gust', 'icon_wind_arrow', 'face_scared_eyes', 'face_scared_mouth', 'face_sweat'];

  const images = {};   // key -> HTMLImageElement | Canvas

  function findImage(base) {
    for (const ext of ['webp', 'png', 'jpg', 'jpeg']) { const p = base + '.' + ext; if (CS.assetFiles.has(p)) return p; }
    return null;
  }
  function loadImage(path) {
    return new Promise((resolve) => {
      if (!path) return resolve(null);
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = path;
    });
  }

  // ---------------- 凸包碰撞体（来自透明通道） ----------------
  function hullFromImage(img, isCircle) {
    const G = 96;
    const ar = img.width / img.height;
    const gw = ar >= 1 ? G : Math.max(8, Math.round(G * ar));
    const gh = ar >= 1 ? Math.max(8, Math.round(G / ar)) : G;
    const c = document.createElement('canvas'); c.width = gw; c.height = gh;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, gw, gh);
    let d;
    try { d = x.getImageData(0, 0, gw, gh).data; } catch (e) { return null; } // file:// 下会被污染，退回默认形状
    const op = (i, j) => d[(j * gw + i) * 4 + 3] > 110;
    let minX = gw, maxX = -1, minY = gh, maxY = -1;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (op(i, j)) { if (i < minX) minX = i; if (i > maxX) maxX = i; if (j < minY) minY = j; if (j > maxY) maxY = j; }
    if (maxX < 0) return null;
    if (isCircle) {
      return { circle: true, cx: (minX + maxX + 1) / 2 / gw, cy: (minY + maxY + 1) / 2 / gh, r: ((maxX - minX + 1) / gw + (maxY - minY + 1) / gh * (gh / gw)) / 4 * 0.98 };
    }
    // 跳过顶部「多段」的行（耳朵、翘起的尾巴尖），最多跳过 32% 高度
    const runs = (j) => { let n = 0, inR = false; for (let i = 0; i < gw; i++) { const o = op(i, j); if (o && !inR) n++; inR = o; } return n; };
    let top = minY; const cap = minY + Math.floor((maxY - minY) * 0.32);
    while (top < cap && runs(top) !== 1) top++;
    // 每行左右边界；再把「比最宽处窄 40% 以上」的顶部/底部圆弧削平，得到平顶平底，叠起来才稳
    const rows = [];
    let maxW = 0;
    for (let j = top; j <= maxY; j++) {
      let l = -1, r = -1;
      for (let i = 0; i < gw; i++) if (op(i, j)) { if (l < 0) l = i; r = i; }
      if (l >= 0) { rows.push([j, l, r + 1]); maxW = Math.max(maxW, r + 1 - l); }
    }
    let a = 0, b = rows.length - 1;
    while (a < b && rows[a][2] - rows[a][1] < maxW * 0.6) a++;
    while (b > a && rows[b][2] - rows[b][1] < maxW * 0.6) b--;
    const pts = [];
    for (let k = a; k <= b; k++) {
      const [j, l, r] = rows[k];
      pts.push([l / gw, j / gh]); pts.push([r / gw, j / gh]); pts.push([l / gw, (j + 1) / gh]); pts.push([r / gw, (j + 1) / gh]);
    }
    let hull = convexHull(pts);
    hull = simplify(hull, 12);
    return { circle: false, pts: hull };
  }
  function convexHull(p) {
    p = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  function simplify(h, max) {
    h = h.slice();
    const area = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
    while (h.length > max) {
      let best = 0, bi = 0;
      for (let i = 0; i < h.length; i++) {
        const a = area(h[(i - 1 + h.length) % h.length], h[i], h[(i + 1) % h.length]);
        if (i === 0 || a < best) { best = a; bi = i; }
      }
      h.splice(bi, 1);
    }
    return h;
  }
  function defaultShape(id, ar) {
    if (CAT_TYPES[id].circle) return { circle: true, cx: 0.5, cy: 0.5, r: 0.47 };
    // 圆角矩形（顶部略缩进，代表耳朵之下）
    const t = id === 'black' ? 0.1 : 0.2, k = 0.08, k2 = k / ar;
    return { circle: false, pts: [[k2, t], [1 - k2, t], [1, t + k], [1, 1 - k], [1 - k2, 1], [k2, 1], [0, 1 - k], [0, t + k]] };
  }

  // ---------------- 程序化默认图（缺图时） ----------------
  function procCat(id) {
    const T = CAT_TYPES[id];
    const dims = { orange: [753, 423], white: [759, 431], black: [443, 649], loaf: [1010, 384], ball: [515, 529], long: [1161, 317] }[id];
    const [W, H] = dims;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.lineWidth = Math.max(6, W * 0.012); g.strokeStyle = '#6B4A3A'; g.fillStyle = T.color; g.lineJoin = 'round';
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const A = T.anchors.head, E = T.anchors.eyes;
    const hx = A.x * W, hw = A.w * W;
    if (T.circle) { g.beginPath(); g.arc(W / 2, H / 2, W * 0.47, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else if (id === 'black') { rr(W * 0.1, H * 0.35, W * 0.8, H * 0.6, W * 0.3); g.fill(); g.stroke(); }
    else rr(W * 0.03, H * 0.25, W * 0.94, H * 0.7, H * 0.3);
    if (!T.circle && id !== 'black') { g.fill(); g.stroke(); }
    // 头
    const hy = E.y * H, hr = hw * 0.5;
    g.beginPath(); g.moveTo(hx - hr * 0.9, hy - hr * 0.3); g.lineTo(hx - hr * 0.75, hy - hr * 1.25); g.lineTo(hx - hr * 0.2, hy - hr * 0.8); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(hx + hr * 0.9, hy - hr * 0.3); g.lineTo(hx + hr * 0.75, hy - hr * 1.25); g.lineTo(hx + hr * 0.2, hy - hr * 0.8); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(hx, hy, hr, hr * 0.85, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    // 脸
    g.strokeStyle = id === 'black' ? '#FFE9F0' : '#3A2A22'; g.lineWidth = Math.max(4, hr * 0.06); g.lineCap = 'round';
    const ex = hr * 0.42;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + s * ex, hy, hr * 0.13, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    g.fillStyle = '#FF9EB5'; g.globalAlpha = 0.7;
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(hx + s * hr * 0.62, hy + hr * 0.22, hr * 0.15, hr * 0.09, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.beginPath(); g.arc(hx - hr * 0.1, hy + hr * 0.22, hr * 0.1, 0, Math.PI * 0.9); g.stroke();
    g.beginPath(); g.arc(hx + hr * 0.1, hy + hr * 0.22, hr * 0.1, Math.PI * 0.1, Math.PI); g.stroke();
    return c;
  }
  function procBg(seg) {
    const W = 720, H = 1280;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, seg.top[0]); gr.addColorStop(1, seg.top[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    let s = CS.hashString(seg.id); const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    if (seg.from >= 35) { g.fillStyle = '#FFFFFF'; for (let i = 0; i < 160; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.beginPath(); g.arc(r() * W, r() * H, 0.8 + r() * 2.2, 0, 7); g.fill(); } g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 8; i++) { const x = r() * W, y = r() * H * 0.8, k = 40 + r() * 50; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + j * k * 0.7, y + (j % 2) * -k * 0.3, k * (0.7 + (j % 2) * 0.3), 0, 7); g.fill(); } } }
    return c;
  }

  // ---------------- 加载 ----------------
  // ---- 代码画的表情（对应贴图缺失时）
  function drawCodeEyes(g, expr, ew) {
    const r = ew * 0.26, lw = Math.max(2, r * 0.14);
    for (const sx of [-1, 1]) {
      const cx = sx * ew * 0.245;
      if (expr === 'star') {
        g.fillStyle = '#FFD93B'; g.strokeStyle = '#6B4A3A'; g.lineWidth = lw;
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r * 1.05; g.lineTo(cx + Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
      } else if (expr === 'happy') {
        g.strokeStyle = '#4A2E25'; g.lineWidth = lw * 1.4; g.lineCap = 'round';
        g.beginPath(); g.arc(cx, r * 0.4, r * 0.6, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      } else {
        g.fillStyle = '#FFFFFF'; g.strokeStyle = '#4A2E25'; g.lineWidth = lw;
        g.beginPath(); g.arc(cx, 0, r, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#111'; g.beginPath(); g.arc(cx, r * 0.2, r * 0.45, 0, 7); g.fill();
      }
    }
  }
  function drawCodeMouth(g, expr, mw) {
    g.strokeStyle = '#4A2E25'; g.lineWidth = Math.max(2, mw * 0.07); g.lineCap = 'round';
    if (expr === 'happy' || expr === 'star') {
      g.fillStyle = '#C2384B';
      g.beginPath(); g.moveTo(-mw / 2, -mw * 0.08); g.quadraticCurveTo(0, mw * 0.55, mw / 2, -mw * 0.08); g.closePath(); g.fill(); g.stroke();
    } else {
      g.fillStyle = '#8E1B24';
      g.beginPath(); g.ellipse(0, 0, mw / 2, expr === 'fall' ? mw * 0.6 : mw * 0.28, 0, 0, 7); g.fill(); g.stroke();
    }
  }

  const Assets = {
    FACES,
    CAT_TYPES, CAT_ORDER, SKINS, SKIN_BY_ID, BG_SEGMENTS, images, skinIdOrNone,
    shapes: {},       // 猫 id -> 归一化形状
    has(key) { return !!images[key] && !images[key].__proc; },

    load(onProgress) {
      const jobs = [];
      const add = (key, base, fallback) => {
        jobs.push(loadImage(findImage(base)).then((im) => {
          if (im) images[key] = im;
          else if (fallback) { const c = fallback(); c.__proc = true; images[key] = c; }
        }));
      };
      CAT_ORDER.forEach(id => add('cat_' + id, 'assets/cats/cat_' + id, () => procCat(id)));
      BG_SEGMENTS.forEach(seg => add('bg_' + seg.id, 'assets/bg/bg_' + seg.id, () => procBg(seg)));
      SKINS.forEach(s => { if (s.file) add('skin_' + s.id, 'assets/skins/' + s.file); });
      const exprFiles = [];
      const EX = (CS.CONFIG.expressions || {}).assets || {};
      Object.keys(EX).forEach(k => ['eyes', 'mouth', 'sweat'].forEach(part => { const f = EX[k][part]; if (f && UI_FILES.indexOf(f) < 0 && exprFiles.indexOf(f) < 0) exprFiles.push(f); }));
      UI_FILES.concat(exprFiles).forEach(n => add('ui_' + n, 'assets/ui/' + n));
      ['platform', 'ground', 'cloud_1', 'cloud_2', 'cloud_3', 'heart', 'star'].forEach(n => add('game_' + n, 'assets/game/' + n));
      let done = 0;
      jobs.forEach(p => p.then(() => { done++; if (onProgress) onProgress(done / jobs.length); }));
      return Promise.all(jobs).then(() => {
        this.exprReady = this.loadExprSprites();     // 表情整图在后台加载，不拖慢首屏
        CAT_ORDER.forEach((id) => {
          const im = images['cat_' + id];
          if (im && !im.__proc) applyFaceAnchors(id);         // 只对真美术图用（坐标是按真图量的）
          const ar = im.width / im.height;
          this.shapes[id] = hullFromImage(im, CAT_TYPES[id].circle) || defaultShape(id, ar);
          CAT_TYPES[id].h = Math.round(CAT_TYPES[id].w / ar);
        });
      });
    },

    // 猫的物理几何（设计像素）：顶点（相对质心）、质心在图片中的位置等
    geom(id) {
      if (this._geom && this._geom[id]) return this._geom[id];
      this._geom = this._geom || {};
      const T = CAT_TYPES[id], sh = this.shapes[id], w = T.w, h = T.h;
      let g;
      if (sh.circle) {
        const r = sh.r * w;
        g = { circle: true, r, cx: sh.cx * w, cy: sh.cy * h, bottom: r, top: -r, halfW: r };
      } else {
        const pts = sh.pts.map(p => ({ x: p[0] * w, y: p[1] * h }));
        // 多边形质心
        let a = 0, cx = 0, cy = 0;
        for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const f = p.x * q.y - q.x * p.y; a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f; }
        a *= 0.5; cx /= (6 * a); cy /= (6 * a);
        const verts = pts.map(p => ({ x: p.x - cx, y: p.y - cy }));
        let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9;
        verts.forEach(v => { minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); });
        g = { circle: false, verts, cx, cy, bottom: maxY, top: minY, halfW: (maxX - minX) / 2, midX: (minX + maxX) / 2 };
      }
      g.w = w; g.h = h;
      this._geom[id] = g;
      return g;
    },

    // ---------------- 精灵缓存（按渲染比例 + 皮肤） ----------------
    _sprites: {}, _scale: 1,
    setRenderScale(s) { s = Math.round(s * 100) / 100; if (s !== this._scale) { this._scale = s; this._sprites = {}; } },
    // 表情整图（只加载通过轮廓检查的白名单），首屏后后台加载；每张到了就把对应的精灵缓存作废重画
    loadExprSprites() {
      const EXC = CS.CONFIG.expressions || {}, okSet = new Set(window.CS_EXPR_SPRITES || []);
      if (EXC.mode === 'overlay') return Promise.resolve(0);
      const jobs = [];
      CAT_ORDER.forEach(id => EXPR_STATES.forEach(st => {
        const n = (EXC.spritePattern || 'cat_{id}_{state}').replace('{id}', id).replace('{state}', st);
        if (!okSet.has(n)) return;
        jobs.push(loadImage(findImage('assets/cats/' + n)).then((e) => {
          const im = images['cat_' + id];
          if (!e) return;
          if (!im || e.width !== im.width || e.height !== im.height) { console.warn('[表情整图] 尺寸和原图不同，不用：' + n); return; }   // 运行时再核一次
          images['expr_' + id + '_' + st] = e;
          const suf = st === 'scared' ? '|s' : '|' + st;
          Object.keys(this._sprites).forEach(k => { if (k.startsWith(id + '|') && k.endsWith(suf)) delete this._sprites[k]; });
        }));
      }));
      return Promise.all(jobs).then(() => EXPR_STATES.length && Object.keys(images).filter(k => k.startsWith('expr_')).length);
    },
    // 这只猫这个表情有没有可用的整图
    exprSprite(id, expr) { return (expr && images['expr_' + id + '_' + expr]) || null; },
    sprite(id, skinId, expr) {
      skinId = skinIdOrNone(skinId);
      if (expr === true) expr = 'scared';
      const key = id + '|' + (skinId || 'none') + (expr ? (expr === 'scared' ? '|s' : '|' + expr) : '');
      if (this._sprites[key]) return this._sprites[key];
      const S = this._scale, T = CAT_TYPES[id], img = images['cat_' + id];
      const w = T.w, h = T.h;
      const pad = { l: w * 0.25, r: w * 0.25, t: h * 0.9 + 30, b: h * 0.5 };
      const c = document.createElement('canvas');
      c.width = Math.ceil((w + pad.l + pad.r) * S); c.height = Math.ceil((h + pad.t + pad.b) * S);
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.scale(S, S); g.translate(pad.l, pad.t);
      const full = this.exprSprite(id, expr);
      if (full) {                                    // v1.3：整张换图（轮廓和原图一致，碰撞体仍按原图）
        g.drawImage(full, 0, 0, w, h);
        this.exprSource[id + '|' + expr] = 'sprite';
      } else {
        g.drawImage(img, 0, 0, w, h);
        if (expr) { this.drawFace(g, id, w, h, expr); this.exprSource[id + '|' + expr] = 'overlay'; }   // 兜底：原图 + 贴片
      }
      this.drawAccessory(g, id, skinId, w, h);
      const out = { canvas: c, pad, w, h, S };
      this._sprites[key] = out;
      return out;
    },
    // 表情贴片：眼睛 + 嘴（汗滴单独画，因为要动）。文件名来自 config.expressions.assets。
    // 每种表情实际用的是「真图 / 顶替图 / 代码画 / 不贴」记在 exprSource 里（测试和报告用）。
    exprSource: {},
    exprPart(expr, part) {
      const EX = CS.CONFIG.expressions.assets, set = EX[expr] || {}, name = set[part];
      if (name === null || (name === undefined && expr !== 'scared')) return { kind: 'none' };
      if (name && images['ui_' + name]) return { kind: 'file', img: images['ui_' + name], name };
      if (expr === 'fall' || expr === 'scared') {          // 缺图：fall 用 scared 贴片顶替
        const sn = EX.scared && EX.scared[part];
        if (sn && images['ui_' + sn]) return { kind: 'fallback', img: images['ui_' + sn], name: sn };
      }
      return { kind: 'code' };
    },
    drawFace(g, id, w, h, expr) {
      const F = FACES[id]; if (!F) return;
      expr = expr || 'scared';
      const set = CS.CONFIG.expressions.assets[expr] || {};
      const eyes = this.exprPart(expr, 'eyes'), mouth = this.exprPart(expr, 'mouth');
      this.exprSource[expr] = { eyes: eyes.kind + (eyes.name ? ':' + eyes.name : ''), mouth: mouth.kind + (mouth.name ? ':' + mouth.name : '') };
      const e = F.eyes, m = F.mouth, rot = e.rot || 0;
      // 眼睛：宽度 ≈ 猫身宽 1/3（窄脸猫按脸宽，见 FACES）
      if (eyes.kind !== 'none') {
        const ew = e.w * w * (eyes.kind === 'file' ? (set.eyesScale || 1) : 1);
        g.save(); g.translate(e.x * w, e.y * h); g.rotate(rot);
        if (eyes.img) { const eh = ew * eyes.img.height / eyes.img.width; g.drawImage(eyes.img, -ew / 2, -eh / 2, ew, eh); }
        else drawCodeEyes(g, expr, ew);
        g.restore();
      }
      if (mouth.kind !== 'none') {
        const mw = m.w * w * (mouth.kind === 'file' ? (set.mouthScale || 1) : (expr === 'fall' ? 0.5 : 1));
        g.save(); g.translate(m.x * w, m.y * h); g.rotate(rot);
        if (mouth.img) { const mh = mw * mouth.img.height / mouth.img.width; g.drawImage(mouth.img, -mw / 2, -mh / 2, mw, mh); }
        else drawCodeMouth(g, expr, mw);
        g.restore();
      }
    },
    // 汗滴：在「猫图左上角为原点」的坐标系里画，t 毫秒用于轻微抖动/滑落
    drawSweat(g, id, w, h, t) {
      const F = FACES[id]; if (!F) return;
      const sw = F.sweat, im = images.ui_face_sweat;
      const k = 1 + Math.sin(t / 90) * 0.08, slide = ((t / 900) % 1) * sw.w * w * 0.35;
      const dw = sw.w * w * k;
      g.save(); g.translate(sw.x * w, sw.y * h + slide); g.rotate(sw.rot || 0);
      if (im) { const dh = dw * im.height / im.width; g.drawImage(im, -dw / 2, -dh / 2, dw, dh); }
      else {
        const s = dw / 28;
        g.scale(s, s); g.fillStyle = '#9FD4FF'; g.strokeStyle = '#4A78A8'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(15, 6, 0, 14); g.quadraticCurveTo(-15, 6, 0, -20); g.fill(); g.stroke();
      }
      g.restore();
    },
    // 在「猫图左上角为原点、宽 w 高 h」的坐标系里画配件
    drawAccessory(g, id, skinId, w, h) {
      const skin = SKIN_BY_ID[skinId];
      if (!skin || !skin.file) return;
      const im = images['skin_' + skin.id];
      if (!im) return;
      const T = CAT_TYPES[id], A = T.anchors[skin.slot];
      if (!A) return;
      const adj = (T.skinAdjust && T.skinAdjust[skin.id]) || {};
      const sw = A.w * w * skin.s * (adj.s || 1);
      const sh = sw * im.height / im.width;
      const rot = A.rot + (skin.r || 0) * (adj.flip ? -1 : 1) + (adj.r || 0);
      const slotW = A.w * w;
      const px = A.x * w, py = A.y * h;
      const ox = ((skin.dx || 0) + (adj.dx || 0)) * slotW, oy = ((skin.dy || 0) + (adj.dy || 0)) * slotW;
      g.save();
      g.translate(px, py); g.rotate(A.rot);
      g.translate(ox, oy); g.rotate(rot - A.rot);
      g.drawImage(im, -skin.ax * sw, -skin.ay * sh, sw, sh);
      g.restore();
    }
  };
  CS.Assets = Assets;
})();
