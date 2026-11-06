# 接入 QQ：设计与实现要求

2026-11-05 定稿，交给 Codex 实现。实现完把结果写进 `docs/qq-integration-test.md`。

## 1. 架构（不变）

```
QQ 用户 ──► NapCat ──► AstrBot（DeepSeek、人设、各种插件）──► 回复发回 QQ
                           │ astrbot_plugin_fish_room 的钩子：发出去就不管
                           ▼
                POST /api/event（局域网或 Docker 访问时要带 X-Room-Token）
                           ▼
             server.py ──SSE──► index.html
```

- **AstrBot 是唯一的大脑。** 回 QQ、调用工具、记忆都由它负责。小房间只把“她现在在干什么”画出来，不替 QQ 回复，也不直接连 NapCat 或 OneBot。
- **上报只往一个方向走，发出去就不管。** 小房间没开、挂了或者很慢，都不能影响 QQ 回复。保留现在 3 秒超时和只警告一次的做法。
- 小房间自己的聊天（`/api/chat`）是另一条通道，和 QQ 驱动同一个角色。

## 2. 要解决的问题

现在的 `server.py` 只有一个全局状态，最后到达的事件说了算：

1. **并发**：群里 A 和 B 同时 @ 她，A 先回完，`msg_out` 就把状态设回 idle，可 B 的消息还在想，房间里却显示在闲逛。
2. **分段回复**：AstrBot 打开“分段回复”时，`after_message_sent` 可能对同一条消息触发好几次，每次都会上报一个 `msg_out`。
3. **对不上的结束信号**：指令回复、插件主动发的消息也会触发 `after_message_sent`，但它们之前没有 `msg_in`，现在会被当成“回完了”，把状态清回 idle。
4. **后台任务看不到**：定时任务（每日热点、QQ 空间日记）不一定经过 `on_llm_request`，房间里看不到她在忙。

## 3. 协议扩展：可选的 `session` 字段（向后兼容）

`/api/event` 的所有 `type` 都可以多带一个 `session`（字符串，长度不超过 80）。**不带 `session` 的老请求行为必须和现在一样**，README 里的 curl 例子要照样能用。

服务端的 `Room` 增加一张会话表：

```python
self.sessions = {}  # sid -> {'state', 'detail', 'who', 'where', 'source', 'opened', 'last'}
```

| 事件 | 带 session 时的处理 |
|---|---|
| `msg_in` | 打开或更新这个会话，状态设为 `thinking`，记下 who 和 where |
| `state`：thinking、replying、working | 更新这个会话的状态和 detail；会话不存在就新建（后台任务用这种方式） |
| `state`：idle | 关闭这个会话 |
| `chunk` | 记到这个会话上（见第 5 节的屏幕显示） |
| `msg_out` | 关闭这个会话。会话不存在或已经关闭时（比如分段回复的第二段），只往动态里记一条，不改状态，也不重复加 `replies` 计数 |
| `state`：error、resting | 仍然是全局状态，和 session 无关 |
| `log` | 和现在一样 |

不带 session 的事件，归到同一个来源的匿名会话里，sid 为 `f'{source}:default'`。这样老客户端的效果仍然是“最后一条说了算”，和现在一致。

房间自己的 `/api/chat` 用固定的 sid `room`。

### 显示哪个状态

- 有任何会话开着，就显示忙碌状态。优先级是 `replying` > `working` > `thinking`，优先级相同时显示最近更新的那个会话。
- 所有会话都关了，才回到 `idle`，detail 用“回完消息，在房间里闲逛”。
- 状态广播里加两个字段：`pending`（开着的会话数）和 `active`（当前显示的会话的 who 和 where）。snapshot（`hello`）里也带上 `pending`。
- `error` 照旧 20 秒后自动恢复，恢复时如果还有开着的会话，就回到忙碌状态，不回 idle。
- 处于 `resting` 时来了新会话，照旧“被叫醒”。

### 超时

- 每个会话单独计时：超过 `BUSY_TIMEOUT`（120 秒）没有更新就丢掉，在动态里记一条“和 {who} 的那件事没收到结束信号，先放下了”，然后重新计算要显示的状态。
- 原来针对全局状态的 120 秒超时，改成由会话超时推导出来，不要两套逻辑同时存在。
- 会话表最多保留 50 个，超出时丢掉最旧的，防止外部程序一直开会话不关，把内存占满。

## 4. AstrBot 插件改动（`astrbot_plugin_fish_room`，版本升到 1.1.0）

**先在真实的 AstrBot 源码里确认钩子的签名和触发顺序，不要凭记忆写。** 需要确认的有：`on_llm_request`、`on_llm_response`、`after_message_sent`、`on_using_llm_tool`（有没有、参数是什么），以及 `event.set_extra` 和 `event.get_extra` 是否存在。

- **session id**：在 `on_llm_request` 里生成，比如 `f'{event.unified_msg_origin}#{message_id 或递增序号}'`，存到 event 上（用 `set_extra`，没有的话就用插件自己的字典，以 `id(event)` 为键，要能清理）。后面的钩子都带上这个 sid。
- **回复文本**：在 `on_llm_response` 里把 `completion_text` 存下来，`msg_out` 用这份完整文本，不用分段后的片段。
- **`after_message_sent`**：
  - 有 sid 并且还没关闭：发一次 `msg_out`，标记为已关闭。分段回复后面的几段直接忽略。
  - 没有 sid（指令回复、插件主动发的消息）：**不发 `msg_out`**，最多发一条 `log`，内容是“发了一条消息”。
- **工具调用**：`working` 带上 sid。工具调用结束如果有对应的钩子（比如 `on_llm_tool_respond`），可以把状态改回 `thinking`。
- **AstrBot 出错**（如果有能拿到 LLM 报错的钩子）：上报 `state: error`，并关闭这个 sid。
- `show_text` 关掉时，`msg_in`、`chunk`、`msg_out` 都不能带原文。
- 发事件仍然用 `create_task`，但同一个 sid 的事件要按顺序到达，避免 `msg_out` 抢在 `msg_in` 前面。可以用每个 sid 一个 `asyncio.Lock`，或者用一个全局队列串行发送。

### 给后台任务用的约定（写进 README）

定时任务或其他插件想让房间显示忙碌，只需要直接 POST：

```json
{"type": "state", "state": "working", "session": "qzone-diary-2026-11-05", "detail": "在写空间日记", "source": "dafeiyu_plus"}
{"type": "state", "state": "idle", "session": "qzone-diary-2026-11-05", "source": "dafeiyu_plus"}
```

`dafeiyu_plus` 在 `C:\fish\DSdeploy` 里，不在这个仓库。它的改动由 Windows 这边来做，Codex 只要把约定写清楚。

## 5. 前端（`index.html`）

- **桌上的一摞信**：`pending` 大于 1 时，书桌一角堆 `min(pending - 1, 5)` 个小信封（复用已有的信封贴图和材质，合进一个 InstancedMesh 或一个 Group，draw call 最多多 1 到 2 个）。会话关闭时，最上面那封飞出窗外。
- **HUD**：状态卡片上显示“还有 N 条在排队”。
- **屏幕和气泡**：`chunk` 只在属于当前显示的会话时才更新屏幕和气泡。切换到另一个会话时，屏幕换成那个会话已经积累的文本。前端按 sid 保存最近的文本，最多保存 10 个会话。
- **`msg_out`**：只要还有别的会话开着，就只播放喷水和信飞出窗外，不播放 `celebrate`，直接回到书桌继续。
- **演示按钮**：增加一个“群聊并发”演示，三个人前后脚发消息，分段回复，中间夹一次工具调用。

## 6. 测试

1. **`tools/fake_astrbot.py`**（只用标准库）：按 AstrBot 的时序模拟各种场景，包括并发三人、分段回复、指令回复（没有 sid）、工具调用、漏掉结束信号、不带 session 的老格式请求。支持 `--url` 和 `--token`，方便测试局域网和 token 的情况。
2. **`tests/test_sessions.py`**（unittest）：直接测试 `Room` 的会话逻辑，包括优先级、关闭、重复 `msg_out`、超时、上限 50、匿名会话兼容、error 和 resting 的交互。注意：导入 `server.py` 时会读写 `config.json`，测试不能改动或生成真实的 `config.json`。可以加一个环境变量 `FISH_ROOM_CONFIG` 指定配置路径，或者把 `load_config()` 改成在 `main()` 里调用。
3. **真实的 AstrBot（在 Mac 上，不需要 QQ）**：用 Docker 或 `uv` 装最新版 AstrBot，用它自带的 WebChat 当消息来源；模型提供商用 DeepSeek，Key 由用户提供，**不要写进仓库**。把插件拷进 `data/plugins/` 并加载。
   - Docker 访问 Mac 主机用 `http://host.docker.internal:18765`。如果连不上，就把小房间的 `host` 设成 `0.0.0.0`，这时请求会被当成外部请求，必须带 token。
   - 记录每个钩子是否触发、触发顺序、分段回复时 `after_message_sent` 触发几次、工具钩子是否存在，写进 `docs/qq-integration-test.md`。
   - 截图：并发时桌上的信封堆、排队提示、回完以后回到闲逛。
4. 回归检查：照 `AGENTS.md` 的“验证”清单走一遍。draw call 仍然低于 150。

**接真实 QQ 的最终联调**（Windows 上的 `C:\fish\DSdeploy`、NapCat、扫码）不在这次的范围里，由 Windows 这边来做。

## 7. 完成标准

- 老格式的上报不用改就能用。
- 三个人并发时，状态不会提前回到 idle；三个会话都关闭后，2 秒内回到 idle。
- 分段回复只算一次回复，指令回复不会打断正在进行的会话。
- `python3 -m unittest` 全部通过，`fake_astrbot.py` 的每个场景都有记录。
- 在真实的 AstrBot（WebChat）上跑通一次，并有记录。
- README 的“接上 QQ 大肥鱼”一节更新为新的协议和后台任务约定，插件 `metadata.yaml` 升到 1.1.0。
