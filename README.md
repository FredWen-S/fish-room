# 大肥鱼的小房间

给 DeepSeek（大肥鱼）在电脑上安一个 2.5D 小房间，实时看它在干什么：

| 状态 | 房间里的样子 |
|---|---|
| 闲逛 | 在窗边、书架、植物、地毯、懒人沙发之间游来游去，偶尔冒泡泡、自言自语 |
| 思考中 | 信从窗外飞进来，它游到书桌前，屏幕上显示收到的消息 |
| 回消息 | 在键盘前快速拍鳍，屏幕和头顶气泡里一个字一个字打出回复；回完喷水，信飞出窗外 |
| 工作中 | 屏幕变成编辑器（用工具、整理笔记） |
| 休息 | 闲了 5 分钟或者半夜，去床上睡觉，冒 Zzz，屏幕关掉、房间变暗、落地灯亮 |

窗外天色、墙上的钟跟着真实时间走。点一下大肥鱼可以摸摸头。

## 动作

立绘每个方向只有一张，所以动作都是用「换视图 + 弹跳、倾斜、挤压拉伸 + 头顶表情 + 小道具」拼出来的。思路参考了这些开源项目：Shimeji（拎起来、摔跤）、VPet-Simulator（摸头和摸身体反应不同、喂食、睡醒）、oneko（东张西望、打瞌睡），以及 Pixel Agents 和 Star-Office-UI（按 agent 在干什么，走到房间里不同的地方）。

| 什么时候 | 动作 |
|---|---|
| 闲逛 | 窗边看窗外、伸懒腰；书架前看书；给植物浇花；地毯上跳舞、转圈、发呆、东张西望；懒人沙发上打哈欠。闲久了会站着打瞌睡。走路偶尔摔一跤 |
| 收到消息 | 头顶冒「!」，跳一下，小跑去书桌（脚下扬起灰尘） |
| 思考 / 回消息 | 书桌前托着脑袋想（冒 ? 和 💡）/ 噼里啪啦打字；回完跳起来，闪光加喷水 |
| 工作 | 查资料类（detail 里有 查、搜、读、热榜、search、fetch 等字样）去书架捧书翻；其余的在书桌敲代码 |
| 出错 | 晕乎乎地晃，头上转 💫，屏幕变红。20 秒后自己缓过来 |
| 休息 / 醒来 | 躺床上冒 Zzz；被叫醒时先坐起来打哈欠 |
| 你来互动 | 点头＝摸头（冒爱心），点身体＝戳她，按住拖动＝拎起来晃（放到床上就站在床上），「喂小鱼干」她会走过去吃 |

外部 agent 想让她显示出错，就上报 `{"type":"state","state":"error","detail":"原因"}`。

## 人物

大肥鱼用的是 `assets/design.jpg` 这张三视图设定。`tools/cut_sprites.py` 把它抠成透明背景的 `front.png`、`side.png`、`back.png`，房间里做成立牌：往镜头走显示正面，往里走显示背面，左右走显示侧面（往右走时镜像），在书桌、书架、窗边显示背影，睡觉时背对着躺在床上。

想换形象，就把新的三视图（白底，从左到右依次是正面、侧面、背面，侧面朝左）替换成 `assets/design.jpg`，再运行：

```bash
python tools/cut_sprites.py assets/design.jpg
```

这个脚本需要 Pillow 和 numpy。

## 启动

1. 双击 `启动小房间.bat`，会自动打开 http://127.0.0.1:18765
2. 第一次运行会自动生成 `config.json`（字段说明见 `config.example.json`）。这个文件已经加进 `.gitignore`，不会被提交。把 DeepSeek Key 填进 `deepseek_api_key`（或者设环境变量 `DEEPSEEK_API_KEY`），重启后就能在房间里直接和它聊天。没有 Key 也能用左上角的「演示」按钮看效果。

它自己的东西放在 `room/` 文件夹：`chat.jsonl` 是在房间里的聊天记录，`memory.md` 是它的小本本（每聊 6 轮，它会去电脑前自己整理一次）。

## 接上 QQ 大肥鱼（AstrBot）

这样 QQ 上有人找它时，房间里也能看到：

1. 把 `config.json` 里的 `host` 改成 `"0.0.0.0"`，重启小房间。Docker 里的 AstrBot 访问的不是 127.0.0.1，必须这样改它才连得上。Windows 防火墙弹窗时只勾「专用网络」。从别的机器发来的请求只能上报状态，而且要带 token；聊天和查看页面仍然只允许本机。
2. 把 `astrbot_plugin_fish_room` 文件夹复制到 `C:\fish\DSdeploy\data\astrbot\plugins\`，在 AstrBot 面板里重载插件。
3. 在插件配置里把 `token` 填成小房间 `config.json` 里的 `event_token`。

插件会在这几个时候上报：收到要交给大模型的消息（思考中）、模型给出回复（回消息）、消息发出（回到闲逛）、调用工具（工作中，需要 AstrBot 支持 `on_using_llm_tool`）。如果漏掉了结束信号，2 分钟后它会自己回到闲逛。

## 别的 agent 也能接

任何程序 POST 到 `/api/event` 就能驱动它（本机不用 token）：

```bash
curl -X POST http://127.0.0.1:18765/api/event -H "Content-Type: application/json" -d "{\"type\":\"state\",\"state\":\"working\",\"detail\":\"在跑训练\"}"
```

`type` 可以是 `state`（state 取 idle / thinking / replying / working / resting）、`msg_in`（who、where、text）、`chunk`（text）、`msg_out`（who、text）或 `log`（text）。
