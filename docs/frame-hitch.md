# 帧卡顿调查：阶段结论

v2 已在 `58816d0` 合并并推送 main；`ab861b6` 仅补正文档中的合并状态。低帧率保留为原版也存在的已知问题。本次诊断位于 `perf/frame-hitch`，不将诊断开关并入 main。

**当前没有可证实的房间代码根因，尚未实施默认性能修复。** 证据指向卡顿时的 GPU 进程等待／调度，而不是超过 50ms 的页面脚本或布局。四个开关均已实际验证，但测试环境随时间明显波动，不能根据不同时间的单次 FPS 直接作因果判断。60Hz 绘制限速候选没有改善，已撤回。

## 方法与后台负载

独立、有窗口、前台 Chrome 157，Intel Arc 130T / ANGLE D3D11；页面视口通过 CDP 固定为 1280×800，屏幕 DPR 与实际 renderer 像素比均为 1。夜间 `hour=22`，通过各自本地服务固定为 `working`（桌前敲代码），等待 20 秒后采样约 10 秒。原版不支持 hour 参数，在其页面加载前仅覆盖 `Date.prototype.getHours()` 为 22，未修改原版文件。原版端口 18776、main 静态工作树端口 18777、诊断分支端口 18775。

1% low 按用户给定口径 `1000 / p99帧间隔` 计算。原始结果逐文件记录 viewport、像素比、状态、焦点丢失帧数和 longFrames。标记 valid 仅表示采样时长、页面焦点、像素比检查通过，不表示系统负载一致或应用性能达标。末次 main 和限速实验额外包裹 renderer.render，记录实际绘制 FPS，避免用 rAF 回调数冒充绘制帧数。

视觉测试成员已于 07:53 UTC 报告停止采样并保持空闲，之后查得其他代理均 ready；未并行运行新的代理测试。已停止明确属于旧集成测试的 18888 服务。保留原有 18765 服务（归属不完全明确），以及本轮三个必要对照服务。当前三个本轮服务将于采样结束停止；原有服务不做清理。

安静的代理不等于空载的机器。采样间隙系统 CPU 计数曾为约 77%，保存快照时为 53%。[后台负载快照](frame-hitch/background-load.json) 记录 OpenBot、vmmemWSL、Discord、dwm、Chrome、WeChatAppEx、ToDesk 等进程仍在运行。每进程 PercentProcessorTime 是按逻辑处理器累加的计数，可超过 100，不能直接当整机百分比（机器为 14 逻辑处理器）。没有终止这些归属不明或可能承载用户工作的应用。重复 main 测试前最小化 OpenBot 主窗口、关闭本次 CUA 光标叠层；该组的背景条件已改变，单独列出。

## 四开关对照

每次仅关闭一项，未组合开关。下表为同一名义视口、时段和工作状态下的 rAF 指标；这些不是同时进行的样本。

| 样本 | 平均 FPS | 1% low FPS | 原始结果 |
| --- | ---: | ---: | --- |
| main 首轮（58816d0） | 116.90 | 59.88 | [main-first](frame-hitch/main-first.json) |
| 诊断分支默认对照 | 119.00 | 116.28 | [control](frame-hitch/control.json) |
| noblur 首轮 | 119.20 | 114.94 | [noblur-first](frame-hitch/noblur-first.json) |
| noclock | 118.70 | 60.24 | [noclock](frame-hitch/noclock.json) |
| noscreen 重测 | 51.40 | 10.92 | [noscreen](frame-hitch/noscreen.json) |
| noshadow 重测 | 34.73 | 5.22 | [noshadow](frame-hitch/noshadow.json) |
| 原版（033b9ec）重测 | 32.07 | 4.80 | [original](frame-hitch/original.json) |
| main 重复对照 | 40.87 | 6.00 | [main-repeat](frame-hitch/main-repeat.json) |
| noblur 在卡顿状态复测 | 31.10 | 5.71 | [noblur](frame-hitch/noblur.json) |
| main，OpenBot 主窗口最小化后 | 113.70 | 40.16 | [main](frame-hitch/main.json) |

同一个 main 从 116.90/59.88 降至 40.87/6.00，没有改动房间代码；`noblur` 既出现 119.20/114.94，也出现 31.10/5.71。关闭模糊没有显示稳定收益，不能据此把 HUD 换成不透明背景。其他开关的差异同样受时变负载干扰，不将较慢结果解释为关闭功能造成了退化。

`noscreen`、`noshadow`、原版的首次自动采样曾超时；`*-failure.json` 保留失败信息，表中只采用后续独立重测完成的样本。

开关功能已独立验证：[switch-verification.json](frame-hitch/switch-verification.json)。约 2.2 秒窗口中，默认墙钟纹理更新 2–3 次、屏幕纹理更新 21 次；noclock 的墙钟更新为 0，noscreen 的屏幕更新为 0，其余纹理继续更新；noblur 的计算样式为 none，noshadow 的 shadowMap.enabled=false。各组 SSE 均为实时连接、像素比为 1。

## Performance 轨迹与全部长帧

### DevTools 面板录制

实际在 Performance 面板开始和停止录制并保存压缩 trace。因 GUI 操作间隔，完整录制覆盖约 25.58 秒；分析另外明确截取两个 10 秒窗口，而不是将整段称为恰好 10 秒。面板停靠在右侧，缩小了场景视口，所以这段只作诊断，不与 1280×800 的 FPS 表直接比较。

完整录制仅发现三个超过 50ms 的相邻页面 rAF 间隔，均位于录制开始后的约 1.1 秒内：

| 相对起点 | 帧间隔 | 主要观察 |
| ---: | ---: | --- |
| 0ms | 77.70ms | frame 调用 66.13ms，其中 CpuProfiler::StartProfiling 61.05ms，是录制启动开销 |
| 909.44ms | 84.31ms | GPU 进程任务墙钟 77.16ms，线程 CPU 3.72ms |
| 1016.45ms | 60.09ms | GPU 进程任务墙钟 62.29ms，线程 CPU 3.40ms |

起点后 2–12 秒的稳定 10 秒窗口没有 >50ms 间隔，未见固定的一秒周期。[完整面板分析](frame-hitch-panel-analysis.json) 保留全段和选取窗口。线程 CPU 时间远低于任务墙钟时间，提示等待或抢占；这不能直接换算为 GPU 硬件执行时间。

### 卡顿状态下的受控轨迹

随后在已经加载的 main 页面、1280×800 下，通过同一 DevTools tracing 后端再记录。启动后等待 2 秒，使用 hitch-measure-start/end 标记约 10.1 秒的分析范围，排除启动录制开销。该有 tracing 开销的样本为 52.11/7.99 FPS，不能代替未录制的对照结果。

该窗口有 **43 个 >50ms 帧间隔**，最长约 233.4ms。全部逐帧拆分已保存为 [long-frames.csv](frame-hitch/long-frames.csv) 和 [分析 JSON](frame-hitch/controlled-trace-analysis.json)：37 个主要与 GPU 进程长任务重叠，6 个主要为未归属的调度空档。分类是观察到的时间重叠，不是已证明的硬件因果。

此窗口 Main 的 FunctionCall 最长约 4.9ms，Layout 最长约 0.44ms、UpdateLayoutTree 约 0.56ms、Paint 约 0.53ms；没有 >50ms Main 脚本调用。GPU 进程任务最长墙钟 223.54ms，但线程 CPU 只有约 6.30ms。长帧分散在窗口内，不呈简单的一秒一次；起点间隔列表保存在分析 JSON。不同线程的重叠时间不能直接相加；部分重叠跨度的 CPU 时间为按比例估计。

结论是进一步追踪 GPU 进程的等待、驱动、GPU 调度或共享负载，尚不能指认 blur、clock、screen 或 shadow 中的一项。不能把 GPUTask 的墙钟跨度当作 GPU shader 的实际耗时。

## GPU 计时与拒绝的候选

在卡顿状态的 noblur 页面使用 EXT_disjoint_timer_query_webgl2，每八次绘制发起一次查询，共 80 个有效结果，无 disjoint。GPU elapsed 平均约 9.14ms、p99 29.16ms；CPU renderer.render 墙钟平均 1.69ms、p99 3.10ms。该样本 rAF 为 64.14/13.32 FPS。计时可包含 GPU 调度／抢占，不能当作 GPU 利用率；抽样也不能排除未采到的长 GPU 帧。[原始探针](frame-hitch/gpu-timer-probe.json)。

据此试验过 60Hz 绘制限速以减少 120Hz 屏幕上的 GPU 提交压力，但结果为 rAF 29.04/4.14 FPS、实际绘制 19.46/2.35 FPS，没有改善。[候选数据](frame-hitch/paced.json)。候选代码已全部撤回，fps60 不作为交付开关。

## 原版 / main / 修复后三组状态

| 版本 | 本轮可用数据 | 状态 |
| --- | --- | --- |
| 原版 033b9ec | 32.07 / 4.80 FPS | 卡顿可复现 |
| 当前 main 58816d0（ab861b6 仅文档） | 首轮 116.90 / 59.88，重复 40.87 / 6.00 FPS | 环境下明显波动 |
| 默认性能修复后 | 待根因定位和有效候选后补测 | 未实施默认修复，不将诊断分支称为修复版 |

本轮交付是已合并的 v2，以及独立诊断分支中的四开关、轨迹与原始采样。尚未完成的是卡顿默认修复和修复后三版本稳定复测；需要系统级 GPU 调度证据或可稳定复现的隔离环境，才能进一步缩小等待来源。

两个原始 trace 单独作为附件提供，避免给仓库增加约 25MB 的诊断二进制。文件名、大小、SHA-256 见 [trace-manifest.json](frame-hitch/trace-manifest.json)，可在 Chrome Performance 面板导入。


## 系统级跟踪的权限阻断

本机存在 Windows Performance Recorder，GPU profile 可用，检查时没有其他 WPR 录制。尝试 `wpr -start GPU -filemode` 返回 `0xc5585011`：`Failed to enable the policy to profile system performance.` 当前 Windows 令牌不是管理员。未更改系统策略，也未绕过该限制；再次检查确认 WPR 未在录制。

因此，进一步区分 GPU 驱动等待、硬件执行、系统抢占及其他进程 GPU 竞争的系统级证据尚未取得，需要用户／管理员确认并处理 Windows 性能跟踪权限或策略。默认修复与修复后三版本复测仍未完成。
