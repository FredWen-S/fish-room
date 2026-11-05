"""把 QQ 大肥鱼（AstrBot）正在干什么，实时上报给电脑上的“大肥鱼的小房间”。"""
import asyncio

import aiohttp

from astrbot.api import logger
from astrbot.api.event import AstrMessageEvent, filter
from astrbot.api.star import Context, Star, register

PLUGIN_NAME = 'astrbot_plugin_fish_room'


@register(PLUGIN_NAME, 'fish-room', '把大肥鱼的状态实时显示在电脑上的 2.5D 小房间里', '1.0.0')
class FishRoom(Star):
    def __init__(self, context: Context, config: dict | None = None):
        super().__init__(context, config)
        self.config = config or {}
        self._session = None
        self._warned = False

    @property
    def url(self):
        return str(self.config.get('room_url') or 'http://host.docker.internal:18765').rstrip('/') + '/api/event'

    async def terminate(self):
        if self._session:
            await self._session.close()

    def _post(self, payload):
        """发出去就不管了：小房间没开也不能拖慢回复。"""
        if not self.config.get('enable', True):
            return
        asyncio.create_task(self._send({'source': 'astrbot', **payload}))

    async def _send(self, payload):
        try:
            if self._session is None or self._session.closed:
                self._session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3))
            headers = {'X-Room-Token': str(self.config.get('token') or '')}
            async with self._session.post(self.url, json=payload, headers=headers) as response:
                if response.status != 200 and not self._warned:
                    self._warned = True
                    logger.warning(f'[小房间] 上报被拒绝：HTTP {response.status}，检查 token')
        except Exception as error:
            if not self._warned:
                self._warned = True
                logger.info(f'[小房间] 连不上 {self.url}（小房间没开的话可以忽略）：{error}')

    @staticmethod
    def _who(event: AstrMessageEvent):
        return event.get_sender_name() or str(event.get_sender_id() or '有人')

    @staticmethod
    def _where(event: AstrMessageEvent):
        return 'QQ 群' if event.get_group_id() else 'QQ 私聊'

    def _preview(self, text):
        if not self.config.get('show_text', True):
            return '（一条消息）'
        return (text or '').strip()[:120]

    # 收到要交给大模型处理的消息：信从窗外飞进来，大肥鱼去书桌前想
    @filter.on_llm_request()
    async def on_request(self, event: AstrMessageEvent, req):
        self._post({'type': 'msg_in', 'who': self._who(event), 'where': self._where(event),
                    'text': self._preview(event.message_str)})

    # 大模型想好了：开始“打字”
    @filter.on_llm_response()
    async def on_response(self, event: AstrMessageEvent, resp):
        self._post({'type': 'state', 'state': 'replying', 'detail': f'在回复 {self._who(event)}'})
        text = getattr(resp, 'completion_text', '') or ''
        if text and self.config.get('show_text', True):
            self._post({'type': 'chunk', 'text': text[:600]})

    # 消息发出去了：信飞出窗外，回去闲逛
    @filter.after_message_sent()
    async def on_sent(self, event: AstrMessageEvent):
        result = event.get_result()
        text = result.get_plain_text() if result and hasattr(result, 'get_plain_text') else ''
        self._post({'type': 'msg_out', 'who': self._who(event), 'text': self._preview(text) or '（发了一条消息）'})

    # 调用工具（查热榜、发 QQ 空间等）时显示“工作中”。老版本 AstrBot 没有这个钩子就跳过。
    if hasattr(filter, 'on_using_llm_tool'):
        @filter.on_using_llm_tool()
        async def on_tool(self, event: AstrMessageEvent, tool, tool_args):
            name = getattr(tool, 'name', None) or str(tool)
            self._post({'type': 'state', 'state': 'working', 'detail': f'在用工具 {name}'})
