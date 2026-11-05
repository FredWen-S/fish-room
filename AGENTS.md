# AGENTS.md — 大肥鱼的小房间

给接手这个仓库的编程代理（Codex 等）看的交接说明。先读这份，再读 `README.md` 和 `docs/room-v2.md`。

## 这是什么

一个 2.5D 等距小房间，实时显示 DeepSeek agent（“大肥鱼”）在干什么：闲逛、思考、回消息、工作、休息、出错。
房间里住着一个鲸鱼兜帽 Q 版少女（三视图立绘做成的立牌），会走到书桌、床、书架、窗边、植物旁做对应动作。
它既能直接和用户聊天（DeepSeek API），也能接收外部 agent 的状态上报（比如 QQ 机器人 AstrBot）。

## 运行（macOS）

```bash
python3 server.py          # 只用标准库，Python 3.10+
open http://127.0.0.1:18765
```

- `启动小房间.bat` 只能在 Windows 上用。macOS 上直接用上面的命令。
- 第一次运行会生成 `config.json`（字段见 `config.example.json`）。DeepSeek Key 填在 `deepseek_api_key`，也可以用环境变量 `DEEPSEEK_API_KEY`。**`config.json` 和 `room/` 已经写进 `.gitignore`，永远不要提交它们**：前者有 Key 和 event_token，后者有聊天记录。
- 没有 Key 也能跑：左上角的「演示」按钮可以切换所有状态。
- 调试参数：`?debug` 会把内部对象挂到 `window.__room` 上（`run(秒)` 手动快进动画，`look(x,y,z,zoom)` 移动镜头，`act('water')` 触发动作，`goTo('desk')` 让角色走过去）；`?hour=22` 把昼夜固定在某个小时。

## 结构

| 路径 | 内容 |
|---|---|
| `server.py` | 本地服务：静态文件（白名单正则，只允许本机访问）、SSE `/api/stream`、聊天 `/api/chat`（DeepSeek 流式）、外部上报 `/api/event`、自动打盹和超时回闲逛、每 6 轮整理一次 `room/memory.md` |
| `index.html` | 角色立牌、动作系统（`ACTIONS` 表）、粒子和表情、HUD、SSE 连接、拖拽和点击交互、主循环 |
| `src/materials.js` | 程序化 canvas 贴图和材质 |
| `src/room.js` | 地板、墙、窗、墙钟、天空贴图 |
| `src/furniture.js` | 家具和装饰 |
| `src/lighting.js` | 灯光、`daylight()`、昼夜过渡 |
| `src/geometry.js` | 静态几何合并、自适应绘制分辨率（下限 1.0） |
| `assets/` | `design.jpg` 是三视图原图，`front/side/back.png` 由 `tools/cut_sprites.py` 抠出 |
| `astrbot_plugin_fish_room/` | AstrBot 插件，把 QQ 机器人的状态上报到房间 |
| `docs/` | v2 的设计说明、测试记录、截图（WebP） |

## 约定和硬约束

- **不引入构建步骤。** Three.js 固定用 0.160.0，通过 importmap 从 jsdelivr 加载；需要 addons 就用同版本的 jsdelivr 地址。
- 贴图优先用 canvas 程序化生成；外部素材只能用 CC0，并在 `assets/LICENSES.md` 里写明出处。
- 界面文字和注释用中文。
- **角色坐标耦合**：`index.html` 里的 `SPOTS`（desk/bed/window/shelf/plant/rug/beanbag 的 `pos` 和 `near`）决定角色站在哪里做动作。挪家具时要同步改 `SPOTS`，并确认动作还对得上。角色的走路路线是 `HUB` (0.3, 0, 0.1) 到各个 `near` 点之间的直线，路上不能放东西。
- 立绘每个方向只有一张，动作都是靠换视图、弹跳、倾斜、挤压拉伸、表情、小道具拼出来的。不要把立牌改成会接收光照的材质，它的颜色是在 `updateChar` 里按房间亮度手动调的。
- `/api/event` 的字段格式和 AstrBot 插件的接口保持不变。
- 性能预算：draw call 低于 150（v2 实测约 100），材质贴图低于 16MB。

## 验证

改完至少检查这些：
1. 浏览器控制台没有报错，右上角显示「● 实时」。
2. `?hour=10`、`?hour=18`、`?hour=22` 三个时段截图。
3. 用「演示」按钮走一遍：工作（书桌前敲代码）、来条 QQ 消息（收信、小跑、回复、喷水）、休息（躺床上）、出错（晕乎乎）、闲逛（浇花、看书、跳舞、坐懒人沙发）。
4. 互动：点头、点身体、拖拽、喂小鱼干。
5. `renderer.info.render.calls` 低于 150。

## 待办（按优先级）

1. **办公椅穿模**（`src/furniture.js` 第 107–126 行）。椅子原本建在桌前，后来为了不挡角色，用一个循环把所有零件 `x -= 1.05, z -= 1.2` 塞到桌下，但靠背没变矮（顶端 y≈2.03），结果从桌面里穿了出来。椅面还和桌下的主机机箱（x 0.49–0.95）、左前桌腿 (0.15, −3.72) 重叠；五星脚辐条的位置也算错了（`(x + 1.4) / 2` 这种写法）。
   建议：把椅子改成一个 `THREE.Group`，整体定位和旋转，不要再事后挪子物体；把它放到桌子左前方、斜对着桌子（比如 (−0.4, 0, −3.2) 附近，转 30° 左右），靠背顶端不要高于 1.7。确认不碰书架、不挡去书架和窗边的路线，也不遮挡角色在书桌前打字的背影。
2. **端口被多个进程同时占用**：Windows 上 `ThreadingHTTPServer` 默认 `allow_reuse_address = True`，会有好几个 `server.py` 同时监听 18765，请求随机落到某一个上。改成 Windows 下设 `allow_reuse_address = False`（macOS 和 Linux 保持 True，方便快速重启），并在端口被占用时打印清楚的提示。
3. **macOS 启动脚本**：加一个 `start.command` 或 `start.sh`，启动服务并打开浏览器；README 里补上 macOS 的说明。
4. **间歇长帧**（1% low 偏低）：调查和候选修复在 `perf/frame-hitch` 分支（`docs/frame-hitch.md`）。结论：同一份 main 在 Windows 上测出过 116.9 FPS，也测出过 40.9 FPS，被后台负载影响得很厉害，根因没有确认。那个分支上的「静态阴影复用」（`e5857c7`）能把 GPU 耗时从 3.53ms 降到 2.52ms，但没合进 main。在 Mac 上重新测一遍，有稳定收益再合。分支里的 `?noblur/noclock/noscreen/noshadow` 诊断开关不要合进 main。
5. **AstrBot 插件从没在真实 AstrBot 上测过**：用到的钩子是 `on_llm_request`、`on_llm_response`、`after_message_sent`，以及可选的 `on_using_llm_tool`。
6. 可选：给立绘画逐帧动作（走路迈腿、眨眼、挥手），或者拆成 Live2D 那样的分层部件。

## 分支

- `main`：当前版本（v2）。
- `perf/frame-hitch`：卡顿调查和阴影缓存候选，未合并。
- `feat/furniture`、`feat/materials`、`integration/room-v2`、`refactor/modules`：已经合进 main 的历史分支，可以删。

提交信息用中文，写清楚改了什么。推送前用 `git status` 确认 `config.json` 和 `room/` 不在里面。
