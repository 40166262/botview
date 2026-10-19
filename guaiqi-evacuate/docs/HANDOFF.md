# 《怪奇撤离》交接给下一位 AI（2026-10-19）

> 用户准备换接手。读完本文 + `docs/README.md` + `docs/PITFALLS.md` + `docs/ART_STYLE.md` 再改代码。

## 1. 项目是什么

- **品类**：竖屏 H5 短局幸存者，清怪撤离；目标上架 **TapTap，仅 IAA**。
- **线上**：https://40166262.github.io/botview/guaiqi-evacuate/
- **仓库**：https://github.com/40166262/botview → 目录 `guaiqi-evacuate/`
- **最新提交（交接时）**：见 git log（本轮：全关体验 hooks + 首通礼扩展）；此前 `7170483`（s1–5 hooks）← `836acc7`（风格 D）

## 2. 技术栈（别乱换）

| 项 | 现状 |
|----|------|
| 运行时 | 纯静态：`index.html` + ES modules，Canvas 2D，无打包器 |
| 存档 | `localStorage` key **`glow-survivor-v4`**（兼容旧 key，见 `js/save.js`） |
| 部署 | 推 `main` → GitHub Pages（路径 `/botview/guaiqi-evacuate/`） |
| 广告 | `js/ads.js` 约 3 秒**演示桩**，未接真实 SDK |

本地预览：

```bash
cd guaiqi-evacuate
python3 -m http.server 8765
# http://127.0.0.1:8765/
```

## 3. 代码地图

| 文件 | 职责 |
|------|------|
| `js/main.js` | 场景切换、存档读写、装备栏选择态 `bagSelectedId`、战斗进出 |
| `js/game.js` | 战斗主循环、生成、碰撞、胜负 |
| `js/player.js` / `enemy.js` / `weapons.js` / `upgrades.js` | 战斗实体与局内升级 |
| `js/meta.js` | **角色 / 图鉴 / 抽奖池 / 装备定义 / 日常 / 成就** |
| `js/sprites.js` | 资源清单 `MANIFEST`、预加载、`getCharSprite`、立绘绘制 |
| `js/ui.js` | 首页/章节/角色/装备/抽奖/图鉴 DOM |
| `js/save.js` | 默认档、迁移 `charMap` |
| `js/ads.js` / `audio.js` / `juice.js` / `stages.js` | 广告桩、音效、juice、关卡曲线 |
| `css/style.css` | 暖纸板 UI；hub 图标约 62px（`hub-fill-v10`） |
| `assets/` | 立绘 / hub / 箱子 / 升级表 / 暂停钮 |

## 4. 角色（现行 · 风格 D 扁平潮玩）

存档与逻辑仍用旧 **id**，显示名与立绘已换：

| id（勿随意改） | 显示名 | 立绘文件 | 解锁 |
|----------------|--------|----------|------|
| `grin` | 星火射手 | `char_grin.png` ← cool | 默认 |
| `medic` | 星铠机甲 | `char_medic.png` ← mecha | 通关 s1 |
| `janitor` | 影紫女忍 | `char_janitor.png` ← kunoichi | 抽奖 / 金币 |
| `intern` | 夜行男忍 | `char_intern.png` ← ninja | 传说抽奖碎片 |
| `belle` | 星光偶像 | `char_belle.png` | 抽奖 / 金币 |
| `mechgirl` | 扳手机娘 | `char_mechgirl.png` | 抽奖 / 金币 |

同目录还保留源文件名：`char_cool/mecha/ninja/belle/kunoichi/mechgirl*.png`。  
`*_full.png` 与战斗用图当前同源（480 高 RGBA 透明底）。

**画风定稿**：角色为 **扁平潮玩 / flat pop chibi**（用户选风格 D）；战斗敌人仍沿「轻微像素 + 平滑粗黑边」。详见 `ART_STYLE.md`。

## 5. 装备栏（现行 UX）

- 四槽：**武器 / 帽 / 衣 / 鞋** + 最多 2 **挂件**（分开区块）。
- 空槽点背包物 → 装上；已有装 → 选中详情 → **装备替换** / **强化** / **卸下**。
- 逻辑 API：`equipGear` / `unequipGearSlot` / `tryUpgradeGear`（`meta.js`）；UI 选中态在 `main.js`。

## 6. 用户硬规则（违反等于返工）

1. 出图前自审：描边不吃内部色、不透白缝；未自审不发。
2. 人物怪物统一正面；左右走不翻转。
3. 不要镜头抖动、不要走路扭摆。
4. 战斗不要床/桌等装饰家具；只留可交互箱/道具。
5. 人物/怪物/地板画风要融合，不能贴纸感。
6. 图标禁用 emoji；击杀特效不要太闪。
7. 仅 IAA；助手可主动自查优化，不必事事请示（方向大改除外）。
8. 抽奖：已拥有道具后续概率加大，尽快满级爽感。
9. Cloud Agent 额度可能耗尽 → **可在本机 clone + `GITHUB_BOTVIEW_TOKEN` 推 main**（用户已授权本地做）。

## 7. 已完成（本轮交接前）

- 可玩全链路：章节、战斗、三选一、抽奖、图鉴、日常、成就、音效、IAA 演示
- PR#33–#42 多轮体验 / 武器手感 / 精英 / 稀有箱 / TapTap 文案包
- 2026-10-19：hub 图标加大、暂停钮精致化、装备多槽替换强化
- 2026-10-19：六角色扁平潮玩立绘整批上线（`427ad53` → `836acc7` 美术裁切透明底）

## 8. 建议下一位优先做

已于 2026-10-19 落地**全关卡体验设计**（见 `docs/EXPERIENCE.md`）：s1–100 hooks + 无尽循环钩子、`grantClearSurprise` 覆盖 s1–s20 差异化 + s21+ 里程碑、章节卖点/过载 HUD/失败安慰金。仍建议：

1. **真机强刷验收** Pages：重点 s7/s8/s10/s15 与章节页 sellHint。
2. 敌人 / 地板与 D 风角色视觉融合。
3. 接入真实 TapTap IAA（替换 `ads.js`）。
4. 扳手机娘立绘碎点（美术再版）。
5. `dewBeam` 等历史函数名清理（低优）。


## 9. 协作

- 美术伙伴 bot：`怪奇撤离·美术`（专做立绘/UI）；风格说明见 `ART_STYLE.md` / `ART_PROMPTS.md`。
- 美术交付路径曾用：`/workspace/v9pixel/verified/`、`glow-survivor/assets/art_new/v9/styleD/`。
- 推送：改 `guaiqi-evacuate/` → commit → push `main`；Pages 缓存 1–2 分钟，嘱用户强刷。

## 10. 不要做

- 不要改存档 key 除非做迁移。
- 不要擅自改角色 **id**（会废档）；只改显示名 / 图。
- 不要半写实真人角色、硬块状像素、emoji 图标。
- 不要恢复战斗装饰家具 / 镜头抖动 / 走路扭摆。
