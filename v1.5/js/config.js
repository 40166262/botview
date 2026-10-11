/* 《叠猫猫》全局配置。上架前请把 TODO 项替换成 TapTap 后台的真实值。 */
window.CS = window.CS || {};
CS.CONFIG = {
  version: '1.5.0',
  title: '叠猫猫',

  ads: {
    // TODO(j x)：在 TapTap 开发者后台 → 游戏 → 商店 → 小游戏广告 创建 3 个「激励视频」广告位，把 adUnitId 填到这里。
    // 只有在 TapTap 宿主里（存在全局 tap 对象）才会用到；普通浏览器里走 2 秒模拟广告。
    adUnitIds: {
      revive: 'TODO_REVIVE_AD_UNIT_ID',
      double_coins: 'TODO_DOUBLE_COINS_AD_UNIT_ID',
      swap_cat: 'TODO_SWAP_CAT_AD_UNIT_ID'
    },
    mockDurationMs: 2000,   // 模拟广告时长（DESIGN.md §5：2 秒假广告）
    showTimeoutMs: 90000    // 真实广告无回调时的兜底超时，超时按「未发奖励」处理，保证不卡流程
  },

  share: {
    // TODO(j x)：在 TapTap 后台创建分享模板后填入 templateId。
    templateId: 'TODO_SHARE_TEMPLATE_ID'
  },

  // 每局次数限制（DESIGN.md §5）
  limits: { revivePerRound: 1, swapPerRound: 2 },

  economy: { dailyBonus: 50, coinsPerMeter: 1, coinsPerPerfect: 1 },

  // 生成规则：为了保证「同一个 seed 两次进入，猫的出现顺序完全一样」（DESIGN.md §10），
  // 团子 / 长条猫的出现按「第几只猫」决定，数值按平均每只猫约 1.2 米折算 DESIGN.md §3 的 15 米 / 30 米。
  spawn: { ballFromIndex: 12, longFromIndex: 24, firstEasy: 5 },

  // 手感参数（DESIGN.md §4 v1.3）。设计坐标：屏宽 750，1 米 = 100 像素。
  feel: {
    baseSpeed: 300,          // 待放的猫初始移动速度（像素/秒）；一边到另一边约 1.75 秒
    maxSpeedMult: 2,         // 速度最多到初始的 2 倍
    speedTiers: [            // 按高度（米）分段：0-10 慢，10-30 中，30+ 快
      { from: 0, mult: 1 }, { from: 10, mult: 1.35 }, { from: 30, mult: 1.6 }
    ],
    speedRampAfter30: 0.4 / 30,  // 30 米以后每米再加多少倍速，直到 maxSpeedMult
    swingAmplitude: 0.35,    // 摆动范围：以屏幕中线为中心，左右各 35% 屏宽，所有猫一致
    gravity: 1.9,
    maxFall: 12,             // 下落终端速度（像素/物理基准帧）
    frictionStatic: 1.6,     // 普通猫的静摩擦
    perfectTolerance: 0.1,   // 落点与下方中心偏差 < 猫宽 × 10% 算完美
    // 新手保护：前 5 只猫摩擦力加大、弹性减小，晃动衰减更快
    newbie: { count: 5, friction: 1.2, frictionStatic: 2.4, restitution: 0, rockDamping: 0.95 },
    // 风：30 米起；方向和强度来自种子（rng.js CatSequence.wind），这里只控制整体强度曲线
    wind: { fromHeight: 30, baseStrength: 0.35, rampMeters: 40, force: 0.00008 },
    // 受惊表情（v1.1，DESIGN.md §9）：塔在晃超过 triggerSec 秒 → 受惊；塔稳定 recoverSec 秒 → 恢复；同屏最多 maxCats 只
    scared: {
      angVel: 0.022,       // 角速度阈值（弧度/物理步）
      speedX: 1.2,         // 水平速度阈值（像素/物理步）
      calmRatio: 0.45,     // 低于阈值 × 0.45 才算「稳定」（滞回，避免来回切换）
      triggerSec: 0.2,
      recoverSec: 0.5,
      maxCats: 3,
      settleMs: 450,       // 刚落地的猫先给它 0.45 秒「缓冲」，不算晃
      reselectSec: 0.3,    // 每 0.3 秒重新挑一次「晃得最厉害 / 最靠上」的猫，避免表情乱跳
      topWeight: 0.6       // 挑选权重：越靠塔顶越容易被选中
    }
  },

  // 表情系统（v1.2）：都是贴在猫脸上的贴片（位置用 assets.js 的 FACES 挂点：eyes / mouth）。
  // 文件名 = assets/ui/<名字>.png；填 null = 这一部分不贴（保留猫原图）。
  // 缺文件时：fall 用 scared 贴片顶替；happy / star 用代码画的简易版顶替。
  // 优先级：scared > star > happy > fall（fall 只出现在正在下落的猫身上）。scale = 相对 FACES 里 eyes.w / mouth.w 的宽度倍数。
  expressions: {
    // v1.3：优先整张换图 assets/cats/<pattern>（画师出的完整表情图，和原图同尺寸、同轮廓）；
    // 只用 tools/expr_check.py 检查通过的（白名单 js/expr-sprites.js）。缺图或没通过 → 回退到下面的贴片。
    mode: 'sprite',                 // 'sprite' = 整图优先、贴片兜底；'overlay' = 只用贴片
    spritePattern: 'cat_{id}_{state}',
    assets: {
      scared: { eyes: 'face_scared_eyes', mouth: 'face_scared_mouth', sweat: 'face_sweat' },
      fall:   { eyes: 'face_fall_eyes', mouth: 'face_fall_mouth', eyesScale: 0.92, mouthScale: 0.5 },
      happy:  { eyes: null, mouth: 'face_happy_mouth', mouthScale: 0.85 },   // 原图闭眼本来就像 ^^，再贴眼睛会变成两层线
      star:   { eyes: 'face_star_eyes', mouth: null, eyesScale: 1.0 }        // 星星眼，保留原来的嘴
    },
    happySec: 0.4,         // 落稳后眯眼笑 0.4 秒
    starSec: 0.6           // 完美落点星星眼 0.6 秒
  }
};
