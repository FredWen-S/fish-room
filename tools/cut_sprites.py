"""把三视图设定图切成透明背景的立绘：front.png / side.png / back.png。

用法：python tools/cut_sprites.py assets/design.jpg
从图片边缘开始，把连着边缘的白色背景去掉，边缘做抗锯齿，再按空白列切成三张。
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from PIL import ImageFilter

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/design.jpg')
OUT = SRC.parent
WHITE = 228        # 比这个亮、而且不怎么带颜色的像素算“可能是背景”
NAMES = ['front', 'side', 'back']

rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
h, w, _ = rgb.shape
low = rgb.min(axis=2)
spread = rgb.max(axis=2) - low
whiteish = (low > WHITE) & (spread < 22)



def dilate(mask, size):
    image = Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(size))
    return np.asarray(image) > 127


def erode(mask, size):
    image = Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(size))
    return np.asarray(image) > 127


def label(mask):
    """四连通标记（纯 Python 广度优先，不依赖 scipy）。返回 (labels, 个数)。"""
    hh, ww = mask.shape
    flat = mask.ravel()
    labels = np.zeros(hh * ww, np.int32)
    todo = np.flatnonzero(flat)
    current = 0
    for start in todo:
        if labels[start]:
            continue
        current += 1
        labels[start] = current
        stack = [start]
        while stack:
            index = stack.pop()
            y, x = divmod(index, ww)
            for n, ok in ((index - ww, y > 0), (index + ww, y < hh - 1), (index - 1, x > 0), (index + 1, x < ww - 1)):
                if ok and flat[n] and not labels[n]:
                    labels[n] = current
                    stack.append(n)
    return labels.reshape(hh, ww), current


# 1. 连着图片边缘的白色区域就是背景
labels, _ = label(whiteish)
edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
background = np.isin(labels, edge[edge > 0])
# 被身体围住、但面积很大又很纯的白块（比如胳膊和身体之间的空隙）也算背景
pure = (low > 246) & (spread < 10) & ~background
plabels, count = label(pure)
sizes = np.bincount(plabels.ravel(), minlength=count + 1)
for index in np.flatnonzero(sizes > 900):
    if index == 0:
        continue
    region = plabels == index
    ring = dilate(region, 7) & ~region
    # 四周大多是深色描边才算空隙；白色毛绒的边缘是浅色阴影，不动
    if (low[ring] < 150).mean() > 0.55:
        background |= dilate(region, 3) & whiteish

# 2. 抗锯齿：靠近背景的一圈像素，按“有多白”给半透明，并去掉白边
near = dilate(background, 5) & ~background
alpha = np.where(background, 0.0, 1.0)
soft = np.clip((255 - low) / (255 - 170), 0, 1)
alpha = np.where(near, np.minimum(alpha, soft), alpha)
safe = np.maximum(alpha, 1e-3)[..., None]
color = np.clip((rgb - (1 - alpha[..., None]) * 255) / safe, 0, 255)
rgba = np.dstack([color, alpha * 255]).astype(np.uint8)

# 3. 按连通块分成三个人：最大的三块是三个视图，小碎块（雪花、飘出去的发梢）归给离得最近的那个
fg = alpha > 0.1
flabels, fcount = label(fg)
fsizes = np.bincount(flabels.ravel(), minlength=fcount + 1)
fsizes[0] = 0
main = sorted(np.argsort(fsizes)[-3:], key=lambda i: np.argwhere(flabels == i)[:, 1].mean())
owner = np.zeros(fcount + 1, np.int32)
boxes = []
for view, index in enumerate(main):
    ys, xs = np.nonzero(flabels == index)
    boxes.append((xs.min() - 15, xs.max() + 15, ys.min() - 15, ys.max() + 15))
    owner[index] = view + 1
for index in np.flatnonzero(fsizes):
    if owner[index]:
        continue
    ys, xs = np.nonzero(flabels == index)
    cx, cy = xs.mean(), ys.mean()
    for view, (x0, x1, y0, y1) in enumerate(boxes):
        if x0 <= cx <= x1 and y0 <= cy <= y1:
            owner[index] = view + 1
            break
who = owner[flabels]
# 背景边缘那圈半透明像素归给紧挨着的视图
for view in range(3):
    grow = dilate(who == view + 1, 5) & (who == 0) & (alpha > 0)
    who[grow] = view + 1

for view, name in enumerate(NAMES):
    mask = who == view + 1
    ys, xs = np.nonzero(mask)
    part = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    part[..., 3] = np.where(mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1], part[..., 3], 0)
    pad = 6
    canvas = np.zeros((part.shape[0] + pad * 2, part.shape[1] + pad * 2, 4), np.uint8)
    canvas[pad:-pad, pad:-pad] = part
    Image.fromarray(canvas).save(OUT / f'{name}.png', optimize=True)
    print(name, canvas.shape[1], 'x', canvas.shape[0], f'(原图 x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()})')
