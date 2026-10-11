/* 《叠猫猫》全局配置。上架前请把 TODO 项替换成 TapTap 后台的真实值。 */
window.CS = window.CS || {};
CS.CONFIG = {
  version: '1.0.0',
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
    wind: { fromHeight: 30, baseStrength: 0.35, rampMeters: 40, force: 0.00008 }
  }
};
