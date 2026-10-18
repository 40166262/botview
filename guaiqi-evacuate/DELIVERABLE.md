# 怪奇撤离 — Deliverable notes

## Walls / collision (2026-10-17)
- **Before:** `_genTrees` drew beige wall silhouettes; props (desks/beds/crates) also painted. Player/enemy movement only clamps to world bounds (`WORLD_W`×`WORLD_H`). **No solid wall collision** — painted walls were a visual lie.
- **After (fix A):** Removed wall silhouettes. Ground is open facility floor: beige carpet / ward tile / basement tech grid + soft stains/scuffs. Furniture props kept as clutter (still non-colliding). Soft eye-friendly colors retained.

## Packages
| File | Size |
|------|------|
| `/workspace/glow-survivor.zip` | 1405162 bytes |
| `/workspace/glow-survivor-slim.zip` | 1403231 bytes |
| `/workspace/glow-survivor-parts/part1.zip` | 92849 bytes (code+UI) |
| `/workspace/glow-survivor-parts/part2.zip` | 483902 bytes (chars) |
| `/workspace/glow-survivor-parts/part3.zip` | 446804 bytes (enemies) |
| `/workspace/glow-survivor-parts/part4.zip` | 379742 bytes (logos/sheet) |

Orphan firefly leftovers removed; PNGs resized (~384px) + quantized; JPGs recompressed.

## Assets remaining
  README.txt: 325 bytes
  char_grin.png: 94006 bytes
  char_intern.png: 88627 bytes
  char_janitor.png: 109114 bytes
  char_medic.png: 97918 bytes
  chest_coin.png: 4140 bytes
  chest_heal.png: 3863 bytes
  chest_upgrade.png: 3534 bytes
  enemy_boss.png: 131245 bytes
  enemy_crawler.png: 78065 bytes
  enemy_securibot.png: 80589 bytes
  enemy_shadow.png: 78225 bytes
  enemy_zombie.png: 78065 bytes
  hub_bag.png: 2058 bytes
  hub_chars.png: 2043 bytes
  hub_gacha.png: 1755 bytes
  hub_gallery.png: 2467 bytes
  hub_settings.png: 2614 bytes
  hub_stages.png: 1553 bytes
  icon_coin.png: 1740 bytes
  icon_diamond.png: 1267 bytes
  item_chest.png: 44225 bytes
  logo_evacuate.jpg: 88330 bytes
  player_grin.png: 94006 bytes
  splash_loading.jpg: 74889 bytes
  upgrade_icons_sheet.png: 174627 bytes
