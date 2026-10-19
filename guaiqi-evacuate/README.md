# 怪奇撤离

俯视短局幸存者：废弃设施清怪撤离。章节 1–100 + 无尽，装备养成，局内三选一，抽奖与图鉴。

风格：角色扁平潮玩（Style D）全身立绘；敌人轻微像素 + 平滑粗黑边；暖纸板 UI；办公废墟主题（办公区 / 病房 / 地下机房）。**无霓虹白闪、无 emoji 图标、无半写实真人。**

## 本地运行

```bash
cd guaiqi-evacuate  # 或仓库内本目录
python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

## 角色（id 勿改，显示名已换装）

| ID | 名称 | 定位 | 立绘 |
|---|---|---|---|
| grin | 星火射手 | 均衡枪 | char_cool / char_grin |
| medic | 星铠机甲 | 厚甲生存 | char_mecha / char_medic |
| janitor | 影紫女忍 | 近战清场 | char_kunoichi / char_janitor |
| intern | 夜行男忍 | 暴击/爆发 | char_ninja / char_intern |
| belle | 星光偶像 | 移速/暴击 | char_belle |
| mechgirl | 扳手机娘 | 工程火力 | char_mechgirl |

## 局内武器（设施逻辑）

| ID | 名称 | 效果 |
|---|---|---|
| laser_pointer | 激光笔 | 持续短射线切割穿透 |
| chem_jug | 化学桶 | 抛物砸地 + 腐蚀液 DoT/减速 |
| nail_bomb | 钉枪炸弹 | 落地爆炸 + 反向钉子 |
| robo_vac | 遥控扫地机 | 环绕自动射击 |
| tear_gas | 催泪罐 | 追踪减速弹 |
| stapler_storm | 订书钉风暴 | 短距穿透散射 |
| fan_blade / extinguisher | 工业风扇刃 / 灭火器喷射 | 近战扇形 / 环爆 |

另有穿透弹匣、散射弹、弹射跳弹、工业风扇环等被动。

## 怪物

- 普通：绿皮丧尸、爬行患者、铠甲尸、故障监视器、保安机器人、阴影潜伏者
- 精英：冲撞 / 生化罐 / 故障灯 / 反弹护盾
- Boss：黏液主管 / 巡夜医师 / 灯笼发电机

## 养成

- 装备四槽（武器/帽/衣/鞋）强化 +0～+10，消耗金币 + 废料/电池/胶带/芯片
- 撤离员等级、角色等级、装备等级三维成长
- 抽奖保底、日常任务、广告桩

## 关卡

- 主线 1–100 + 无尽（通关 100 或撤离员 Lv.50）
- 主题循环：办公区 / 病房廊 / 地下机房

## 目录

```
  assets/  角色/敌军/图标表（5×5 upgrade_icons_sheet）
  css/     暖纸板 UI
  js/      游戏与元系统
  refs/    画风参考
  docs/    文档索引（docs/README.md）
  DESIGN.md
```

文档索引：[docs/README.md](docs/README.md)。
