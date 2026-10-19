# 《怪奇撤离》体验设计（全关卡）

> 更新：2026-10-19 · 回应「只改了5关吗 / 整体与细节体验」  
> 存档 key 仍为 `glow-survivor-v4`；角色 id 不变。

## 1. 体验支柱

1. **每关可感知差异**：文案（intro / midAnnounce）+ 局内 hooks 事件，至少各有一句「这关在卖什么」。
2. **中后期不是纯数值**：新怪首秀、双精英、空投、过载、连击狂热、摸鱼、神秘箱、首领先锋等可读事件循环出现。
3. **首通不断崖**：s1–s20 差异化首通礼；s21+ 按 5/10 里程碑公式 + 再通小补给。
4. **失败仍有动机**：一句「下次试试」+ 小额安慰金（不破坏经济）。
5. **爽感可见、不靠抖动**：过载有 HUD 芯片 + toast；连击狂热有横幅；禁镜头抖 / 走路扭摆。

## 2. 章节节拍（每 10 关）

| 章 | 关卡 | 主题侧重 | 大节拍 |
|----|------|----------|--------|
| 1 | 1–10 | 入门撤离 | s1–6 手写钩子；s10 节点全套（金箱/双精英/过载/先锋） |
| 2 | 11–20 | 双层警报 | s15 双首领；s20 章节礼 + 挂件 |
| 3 | 21–30 | 深层清扫 | 半章 / 十关里程碑礼 |
| 4–9 | 31–90 | 高压→炼狱 | 同模板加码；s50 铁丝环 |
| 10 | 91–100 | 终极撤离 | s100 全套钩子 + 传说挂件 |

主题皮肤仍按 `n % 3` 循环 office / ward / basement，与 hooks 文案对齐。

## 3. Hook 种类

| kind | 玩家感知 |
|------|----------|
| lucky_burst / coin_shower | 金币惊喜 |
| golden_early / mystery_choice | 金色 / 权限箱 |
| cheer_pack / heal_rain / supply_rain / triple_drop | 回血与空投 |
| wisp_debut / beetle_fanfare / golem_debut / shadow_debut | 新怪 / 精英首秀 |
| elite_pair / swarm_hook / pre_boss_show | 压力可读事件 |
| overdrive / combo_fever | 火力窗口 / 连击狂热 |
| slacker_early / secret_easy | 摸鱼 / 故障投影 |
| escalate | 无尽潮汐加压（循环） |

生成：`buildProceduralHooks`（s7–100）按 `n%5` 节拍 + 5/10 里程碑手写强化；s1–6 保持独有手写。

## 4. 首通礼规则（`grantClearSurprise`）

- **s1–s6**：保留并加强（材料 / pity / 挂件）。
- **s7–s20**：每关独立首通表（钻石/金币/材料；s10/15/20 含挂件或 pity）。
- **s21+**：`n%10===0` 大礼；`n%5===0` 半章礼；其余小首通；**再通一律小补给**。
- **s50** → `charm_thorn`；**s100** → `charm_legend`。
- 结算 `flavor` / `bonusLine` / `toast` 继续讲「本局抓到了啥」。
- 写入 `save.clearSurprises[id]`，与现有存档兼容。

## 5. 细节矫正（本轮）

- midAnnounce / introBanner：n≥7 按主题与里程碑改写，不再「一波强敌/坚持住」复读。
- 章节页副标题显示 `sellHint`（本关卖点一句）。
- 过载：HUD「过载 Ns」芯片 + 启动 toast。
- 连击狂热：待机横幅 + 触发横幅。
- 失败：情境化建议 + 小额安慰金（生存≥20s）。
- 无尽：10 个循环 hooks（摸鱼 / 潮汐 escalate / 空投 / 过载 / 双精英 / 神秘箱 / 连击）。

## 6. 验收建议

强刷 Pages 后依次：**s6 → s7 → s8 → s10**（差异与阴影/节点），有进度再摸 **s15 / s20**；无尽看潮汐 toast。章节页应能看到卖点标签。
