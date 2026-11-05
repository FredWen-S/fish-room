"""大肥鱼的小房间：本地服务。

- 把 index.html 提供给浏览器，并用 SSE（/api/stream）实时推送大肥鱼在干什么。
- /api/chat：在房间里直接和大肥鱼聊天，走 DeepSeek API（流式）。
- /api/event：给外部 agent（比如 AstrBot 里的 QQ 大肥鱼）上报状态。
- 自己会“干活”：聊过几轮后去电脑前整理聊天笔记（room/memory.md）。
- 闲久了会去床上打盹，夜里会睡觉，有消息就被叫醒。

只用 Python 标准库。运行：python server.py
"""
import json
import os
import queue
import re
import secrets
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ROOM = ROOT / 'room'              # 大肥鱼自己的“房间”文件夹：聊天记录、笔记
CONFIG_PATH = ROOT / 'config.json'
CHAT_PATH = ROOM / 'chat.jsonl'
MEMORY_PATH = ROOM / 'memory.md'

DEFAULT_PERSONA = (
    '你是“大肥鱼”，一条住在主人电脑里的蓝色小鲸鱼。你在电脑里有自己的小房间：'
    '一张书桌和电脑（你在这里工作、回消息）、一张小床（累了就睡）、一扇窗。'
    '说话口语化、简短、有点呆萌，中文回答，一般不超过三句话；需要认真回答问题时也可以写长一点，但别用 Markdown 标题。'
)

DEFAULT_CONFIG = {
    'deepseek_api_key': '',
    'deepseek_base_url': 'https://api.deepseek.com',
    'model': 'deepseek-flash',
    'host': '127.0.0.1',
    'port': 18765,
    'event_token': '',
    'rest_after_seconds': 300,
    'night_hours': [1, 7],
    'notes_every_turns': 6,
    'persona': DEFAULT_PERSONA,
}

# 这些状态如果太久没有更新，就认为外部 agent 忘了发结束信号
BUSY_STATES = {'thinking', 'replying', 'working'}
BUSY_TIMEOUT = 120
FEED_TYPES = {'state', 'msg_in', 'msg_out', 'log'}


def load_config():
    config = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        try:
            config.update(json.loads(CONFIG_PATH.read_text(encoding='utf-8')))
        except ValueError as error:
            print(f'[小房间] config.json 格式不对：{error}，先用默认值')
    changed = not CONFIG_PATH.exists()
    if not config.get('event_token'):
        config['event_token'] = secrets.token_urlsafe(16)
        changed = True
    if changed:
        CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
    return config


CONFIG = load_config()


def api_key():
    return (os.environ.get('DEEPSEEK_API_KEY') or CONFIG.get('deepseek_api_key') or '').strip()


# ---------------------------------------------------------------- 状态与广播

class Room:
    def __init__(self):
        self.lock = threading.RLock()
        self.clients = []
        self.feed = []
        self.state = {'state': 'idle', 'detail': '在房间里闲逛', 'since': time.time(), 'source': 'room'}
        self.last_activity = time.time()
        self.last_update = time.time()
        self.stats = {'day': datetime.now().strftime('%Y-%m-%d'), 'msg_in': 0, 'replies': 0, 'works': 0}
        self.pending_notes = 0
        self.last_chat_end = 0.0

    def snapshot(self):
        with self.lock:
            return {'type': 'hello', 'state': self.state, 'feed': self.feed[-60:], 'stats': self.stats,
                    'has_key': bool(api_key()), 'model': CONFIG.get('model'), 'ts': time.time()}

    def broadcast(self, event):
        event.setdefault('ts', time.time())
        with self.lock:
            if event['type'] in FEED_TYPES:
                self.feed.append(event)
                del self.feed[:-120]
            dead = []
            for client in self.clients:
                try:
                    client.put_nowait(event)
                except queue.Full:
                    dead.append(client)
            for client in dead:
                self.clients.remove(client)

    def _roll_stats(self):
        today = datetime.now().strftime('%Y-%m-%d')
        if self.stats['day'] != today:
            self.stats = {'day': today, 'msg_in': 0, 'replies': 0, 'works': 0}

    def bump(self, key):
        with self.lock:
            self._roll_stats()
            self.stats[key] += 1
            self.broadcast({'type': 'stats', 'stats': dict(self.stats)})

    def set_state(self, state, detail='', source='room', activity=True):
        with self.lock:
            now = time.time()
            self.last_update = now
            if activity:
                self.last_activity = now
            if self.state['state'] == state and self.state['detail'] == detail:
                return
            if self.state['state'] == 'resting' and state != 'resting' and source != 'room-timer':
                self.broadcast({'type': 'log', 'text': '被叫醒了，揉揉眼睛'})
            self.state = {'state': state, 'detail': detail, 'since': now, 'source': source}
            self.broadcast({'type': 'state', **self.state})

    def tick(self):
        """每几秒跑一次：超时回到闲逛、闲久了打盹、夜里睡觉、睡够了起床。"""
        with self.lock:
            now = time.time()
            current = self.state['state']
            if current in BUSY_STATES and now - self.last_update > BUSY_TIMEOUT:
                self.broadcast({'type': 'log', 'text': '上一件事没收到结束信号，先回来歇会儿'})
                self.set_state('idle', '在房间里闲逛', 'room-timer', activity=False)
                return
            hour = datetime.now().hour
            start, end = CONFIG.get('night_hours') or [1, 7]
            night = start <= hour < end
            idle_for = now - self.last_activity
            if current == 'error' and now - self.state['since'] > 20:
                self.set_state('idle', '缓过来了，在房间里闲逛', 'room-timer', activity=False)
                return
            if current == 'idle':
                if night and idle_for > 60:
                    self.set_state('resting', '夜深了，在床上睡觉', 'room-timer', activity=False)
                elif idle_for > float(CONFIG.get('rest_after_seconds') or 300):
                    self.set_state('resting', '没什么事，在床上打个盹', 'room-timer', activity=False)
            elif current == 'resting' and not night and now - self.state['since'] > 20 * 60:
                self.broadcast({'type': 'log', 'text': '睡饱了，伸个懒腰'})
                self.set_state('idle', '刚睡醒，在房间里溜达', 'room-timer')


ROOM_STATE = Room()


def ticker():
    while True:
        time.sleep(5)
        try:
            ROOM_STATE.tick()
            maybe_take_notes()
        except Exception as error:  # 定时器不能挂
            print('[小房间] tick 出错：', error)


# ---------------------------------------------------------------- DeepSeek

def deepseek_stream(messages, on_chunk):
    """调用 DeepSeek 流式接口，返回完整文本。"""
    body = json.dumps({'model': CONFIG.get('model') or 'deepseek-flash', 'messages': messages,
                       'stream': True}).encode('utf-8')
    url = CONFIG.get('deepseek_base_url', 'https://api.deepseek.com').rstrip('/') + '/chat/completions'
    request = urllib.request.Request(url, data=body, method='POST', headers={
        'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key()}'})
    parts = []
    with urllib.request.urlopen(request, timeout=90) as response:
        for raw in response:
            line = raw.decode('utf-8', 'replace').strip()
            if not line.startswith('data:'):
                continue
            data = line[5:].strip()
            if data == '[DONE]':
                break
            try:
                delta = json.loads(data)['choices'][0].get('delta') or {}
            except (ValueError, KeyError, IndexError):
                continue
            text = delta.get('content') or ''
            if text:
                parts.append(text)
                on_chunk(text)
    return ''.join(parts)


def describe_error(error):
    if isinstance(error, urllib.error.HTTPError):
        try:
            detail = error.read().decode('utf-8', 'replace')[:200]
        except OSError:
            detail = ''
        if error.code == 401:
            return 'DeepSeek Key 不对（401），检查一下 config.json'
        if error.code == 402:
            return 'DeepSeek 账户余额不足（402）'
        return f'DeepSeek 返回 {error.code}：{detail}'
    return f'连不上 DeepSeek：{error}'


def read_history(limit):
    if not CHAT_PATH.exists():
        return []
    lines = CHAT_PATH.read_text(encoding='utf-8').splitlines()[-limit:]
    history = []
    for line in lines:
        try:
            history.append(json.loads(line))
        except ValueError:
            pass
    return history


def append_history(role, content):
    ROOM.mkdir(exist_ok=True)
    with CHAT_PATH.open('a', encoding='utf-8') as file:
        file.write(json.dumps({'role': role, 'content': content, 'ts': time.time()}, ensure_ascii=False) + '\n')


CHAT_LOCK = threading.Lock()
WORK_LOCK = threading.Lock()


def chat(message):
    with CHAT_LOCK:
        ROOM_STATE.broadcast({'type': 'msg_in', 'who': '你', 'text': message, 'where': '小房间'})
        ROOM_STATE.bump('msg_in')
        ROOM_STATE.set_state('thinking', '在想怎么回你', 'room')
        if not api_key():
            time.sleep(1.2)
            reply = '咕噜……我还没有 DeepSeek Key，脑子转不起来。把 Key 填进 config.json 的 deepseek_api_key 再重启我就能说话啦。'
            ROOM_STATE.set_state('replying', '在回复你', 'room')
            for index in range(0, len(reply), 4):
                ROOM_STATE.broadcast({'type': 'chunk', 'text': reply[index:index + 4]})
                time.sleep(0.05)
            ROOM_STATE.broadcast({'type': 'msg_out', 'who': '你', 'text': reply})
            ROOM_STATE.bump('replies')
            ROOM_STATE.set_state('idle', '回完消息，在房间里闲逛', 'room')
            return {'ok': True, 'reply': reply, 'demo': True}

        memory = MEMORY_PATH.read_text(encoding='utf-8') if MEMORY_PATH.exists() else ''
        system = CONFIG.get('persona') or DEFAULT_PERSONA
        system += f'\n现在是 {datetime.now():%Y-%m-%d %H:%M}。'
        if memory.strip():
            system += '\n你记在小本本上的东西：\n' + memory[-2000:]
        messages = [{'role': 'system', 'content': system}]
        messages += [{'role': item['role'], 'content': item['content']} for item in read_history(12)]
        messages.append({'role': 'user', 'content': message})

        started = []

        def on_chunk(text):
            if not started:
                started.append(True)
                ROOM_STATE.set_state('replying', '在回复你', 'room')
            ROOM_STATE.broadcast({'type': 'chunk', 'text': text})

        try:
            reply = deepseek_stream(messages, on_chunk).strip()
        except Exception as error:
            text = describe_error(error)
            ROOM_STATE.broadcast({'type': 'log', 'text': '出错了：' + text})
            ROOM_STATE.set_state('error', '没回上：' + text[:40], 'room')
            return {'ok': False, 'error': text}
        reply = reply or '（大肥鱼张了张嘴，没想出说什么）'
        append_history('user', message)
        append_history('assistant', reply)
        ROOM_STATE.broadcast({'type': 'msg_out', 'who': '你', 'text': reply})
        ROOM_STATE.bump('replies')
        ROOM_STATE.set_state('idle', '回完消息，在房间里闲逛', 'room')
        ROOM_STATE.pending_notes += 1
        ROOM_STATE.last_chat_end = time.time()
        return {'ok': True, 'reply': reply}


def maybe_take_notes():
    """聊够几轮、并且安静了一会儿，就去电脑前把聊天整理进小本本。"""
    room = ROOM_STATE
    every = int(CONFIG.get('notes_every_turns') or 6)
    if not api_key() or room.pending_notes < every:
        return
    if room.state['state'] != 'idle' or time.time() - room.last_chat_end < 30:
        return
    if not WORK_LOCK.acquire(blocking=False):
        return
    threading.Thread(target=take_notes, daemon=True).start()


def take_notes():
    try:
        room = ROOM_STATE
        room.pending_notes = 0
        room.set_state('working', '在电脑前整理聊天笔记', 'room')
        room.broadcast({'type': 'log', 'text': '去书桌前整理今天的聊天笔记'})
        memory = MEMORY_PATH.read_text(encoding='utf-8') if MEMORY_PATH.exists() else ''
        recent = '\n'.join(f"{'主人' if item['role'] == 'user' else '我'}：{item['content'][:300]}"
                           for item in read_history(30))
        prompt = ('你是大肥鱼，在整理自己的小本本。下面是旧笔记和最近的聊天。'
                  '把值得长期记住的事（主人的喜好、近况、约定、重要的事）合并成一份新笔记，'
                  '用简短的“- ”列表，不超过 25 条，去掉过时或重复的。只输出笔记本身。\n\n'
                  f'【旧笔记】\n{memory or "（空）"}\n\n【最近的聊天】\n{recent}')
        screen = []

        def on_chunk(text):
            screen.append(text)
            room.broadcast({'type': 'work_chunk', 'text': text})

        notes = deepseek_stream([{'role': 'user', 'content': prompt}], on_chunk).strip()
        if notes:
            ROOM.mkdir(exist_ok=True)
            MEMORY_PATH.write_text(notes + '\n', encoding='utf-8')
            room.broadcast({'type': 'log', 'text': f'笔记整理好了，小本本里现在有 {notes.count(chr(10)) + 1} 行'})
        room.bump('works')
        room.set_state('idle', '干完活了，在房间里溜达', 'room')
    except Exception as error:
        ROOM_STATE.broadcast({'type': 'log', 'text': '整理笔记失败：' + describe_error(error)})
        ROOM_STATE.set_state('error', '整理笔记失败', 'room')
    finally:
        WORK_LOCK.release()


# ---------------------------------------------------------------- HTTP

VALID_STATES = {'idle', 'thinking', 'replying', 'working', 'resting', 'error'}
STATIC = {'/': 'index.html', '/index.html': 'index.html'}
ASSET = re.compile(r'/assets/([A-Za-z0-9_-]+\.(?:jpg|png|webp))')
MODULE = re.compile(r'/src/([A-Za-z0-9_-]+\.js)')


class Handler(BaseHTTPRequestHandler):
    server_version = 'FishRoom/1.0'

    def log_message(self, fmt, *args):
        pass

    def _loopback(self):
        return self.client_address[0] in ('127.0.0.1', '::1', '::ffff:127.0.0.1')

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length > 64 * 1024:
            return None
        try:
            return json.loads(self.rfile.read(length) or b'{}')
        except ValueError:
            return None

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/stream':
            if not self._loopback():
                return self._json(403, {'error': '只允许本机查看'})
            return self._stream()
        if path == '/api/state':
            return self._json(200, ROOM_STATE.snapshot())
        name, kind = STATIC.get(path), 'text/html; charset=utf-8'
        asset = ASSET.fullmatch(path)
        if asset and (ROOT / 'assets' / asset.group(1)).is_file():
            name, kind = 'assets/' + asset.group(1), {
                'jpg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'
            }[asset.group(1).rsplit('.', 1)[1]]
        module = MODULE.fullmatch(path)
        if module and (ROOT / 'src' / module.group(1)).is_file():
            name, kind = 'src/' + module.group(1), 'text/javascript'
        if not name or not self._loopback():
            return self._json(404, {'error': 'not found'})
        body = (ROOT / name).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _stream(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        client = queue.Queue(maxsize=500)
        with ROOM_STATE.lock:
            ROOM_STATE.clients.append(client)
        try:
            self._send_event(ROOM_STATE.snapshot())
            while True:
                try:
                    event = client.get(timeout=15)
                    self._send_event(event)
                except queue.Empty:
                    self.wfile.write(b': ping\n\n')
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with ROOM_STATE.lock:
                if client in ROOM_STATE.clients:
                    ROOM_STATE.clients.remove(client)

    def _send_event(self, event):
        self.wfile.write(b'data: ' + json.dumps(event, ensure_ascii=False).encode('utf-8') + b'\n\n')
        self.wfile.flush()

    def do_POST(self):
        path = self.path.split('?')[0]
        data = self._body()
        if data is None:
            return self._json(400, {'error': '请求体不是 JSON 或太大'})
        if path == '/api/chat':
            if not self._loopback():
                return self._json(403, {'error': '只允许本机聊天'})
            message = str(data.get('message') or '').strip()[:2000]
            if not message:
                return self._json(400, {'error': '空消息'})
            return self._json(200, chat(message))
        if path == '/api/event':
            token = self.headers.get('X-Room-Token') or data.get('token') or ''
            if not self._loopback() and not secrets.compare_digest(str(token), CONFIG['event_token']):
                return self._json(403, {'error': 'token 不对'})
            return self._json(200, handle_event(data))
        return self._json(404, {'error': 'not found'})


def clip(value, size=200):
    return str(value or '').strip()[:size]


def handle_event(data):
    """外部 agent 上报。type 可以是 state / msg_in / msg_out / log。"""
    kind = data.get('type') or 'state'
    source = clip(data.get('source') or 'agent', 40)
    if kind == 'state':
        state = data.get('state')
        if state not in VALID_STATES:
            return {'ok': False, 'error': f'state 只能是 {sorted(VALID_STATES)}'}
        ROOM_STATE.set_state(state, clip(data.get('detail'), 80), source, activity=state != 'resting')
    elif kind == 'msg_in':
        ROOM_STATE.broadcast({'type': 'msg_in', 'who': clip(data.get('who') or '有人', 30),
                              'text': clip(data.get('text'), 300), 'where': clip(data.get('where'), 40)})
        ROOM_STATE.bump('msg_in')
        ROOM_STATE.set_state('thinking', f"在想怎么回 {clip(data.get('who') or '有人', 30)}", source)
    elif kind == 'msg_out':
        ROOM_STATE.broadcast({'type': 'msg_out', 'who': clip(data.get('who'), 30), 'text': clip(data.get('text'), 600)})
        ROOM_STATE.bump('replies')
        ROOM_STATE.set_state('idle', '回完消息，在房间里闲逛', source)
    elif kind == 'chunk':
        ROOM_STATE.broadcast({'type': 'chunk', 'text': clip(data.get('text'), 600)})
    elif kind == 'log':
        ROOM_STATE.broadcast({'type': 'log', 'text': clip(data.get('text'), 200)})
    else:
        return {'ok': False, 'error': '未知 type'}
    return {'ok': True}


def main():
    ROOM.mkdir(exist_ok=True)
    host, port = CONFIG.get('host', '127.0.0.1'), int(CONFIG.get('port', 18765))
    threading.Thread(target=ticker, daemon=True).start()
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    print(f'[小房间] 大肥鱼住进来了：http://127.0.0.1:{port}')
    print(f'[小房间] DeepSeek Key：{"已配置" if api_key() else "未配置（只能演示，填 config.json 里的 deepseek_api_key）"}')
    if host not in ('127.0.0.1', 'localhost'):
        print(f'[小房间] 正在监听 {host}，外部上报需要带 X-Room-Token（见 config.json 的 event_token）')
    ROOM_STATE.broadcast({'type': 'log', 'text': '小房间开门了'})
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
