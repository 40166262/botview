> **现行角色风格：Style D 扁平潮玩（flat pop chibi）**。生成角色时优先本风格；敌人仍用轻微像素+平滑粗边。详见 ART_STYLE.md。

# 绘图提示词模板

用于角色 / 敌人 / 图标。生成后建议再跑「平滑粗边贴合」后处理（见 `scripts` 或本地 `_ship_smooth` 流程）。

## 通用约束（拼到每条提示词）

```
Full-body front-facing game character sprite, transparent background.
Mild modern-retro slight-pixel fill (soft chunky color areas, NOT hard lo-res 32–64px pixel stairs, NOT pure smooth anime illustration).
Thick smooth anti-aliased solid black outer outline, flush to the silhouette, no white gap / halo between outline and fill, do not paint interior colors black.
Bright readable palette: cream/beige, warm orange, teal. Cute, not realistic, not muddy horror.
Single character centered, standing, both feet visible.
```

中文要点：轻微像素填充；平滑粗黑边贴合；无白缝；不涂黑内部；正面全身；米色暖橙青绿；可爱明亮。

## 角色

### medic — 急救狂魔
```
Young male hospital medic, short messy brown hair, friendly smile,
cream lab coat with warm orange lapels over teal scrubs,
holding white first-aid kit with teal cross, black shoes.
[ + 通用约束 ]
```

### intern — 倒霉实习生
```
Young male clumsy intern, hard hat, orange overalls, holding papers/clipboard, ID badge.
[ + 通用约束 ]
```

### janitor — 清洁工
```
Young male janitor, headband, teal shirt, tan apron, orange gloves, holding large mop.
[ + 通用约束 ]
```

### grin — 狂笑射手
```
Shorter bearded tactical shooter, tan helmet, orange jacket, tan vest with pouches,
holding firearm, slightly manic grin (readable, not scary).
[ + 通用约束 ]
```

## 敌人（示例）

```
Front-facing full-body enemy sprite for top-down survivor game.
[具体怪：office zombie / slacker zombie / crawler / armored / monitor bot / boss]
Same mild-pixel + smooth thick black outline rules as characters.
Palette stays cream / warm orange / teal (+ zombie green only where needed).
```

## 道具图标

```
Single game item icon, centered, transparent background.
Mild pixel / clean chunky color fill, thick smooth black outline flush to shape.
No emoji, no neon glow, readable at 64–128px.
```

## 禁止写进提示词

- `hard chunky pixel`, `nearest-neighbor pixel grid`, `64×96 low-res master`
- `jagged 1px pixel outline only`
- `soft fringe / green screen matte`
- fantasy firefly / neon cyber / muddy grey horror
