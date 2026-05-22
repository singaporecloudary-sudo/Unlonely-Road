"""按行扫描左半边的红/青像素密度，定位面板上下边界"""
from PIL import Image
import numpy as np
import os

src_dir = r'C:/Users/liuyingjie.a/Desktop/游戏AI开发/UI界面/战斗UI'
fail_img = Image.open(os.path.join(src_dir, '5c273eec42279c338b857875411dcc496ef292a77eb58aa5ec182f8d0fc9a9ef.png'))
succ_img = Image.open(os.path.join(src_dir, '8f57db3d5ec6f70b014bbdb2c27b8d05b74fd1b710fd1b42d95964d2ede74ecf.png'))

# 输出每行红像素数（仅扫描x=0~650的左半部分）
arr = np.array(fail_img)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
red_mask = (r > 80) & (g < 60) & (b < 60)
red_left = red_mask[:, :650]
row_counts = red_left.sum(axis=1)

# 打印每50行的密度
print("=== fail 左半边各行红像素数 ===")
for y in range(0, 2048, 30):
    if row_counts[y] > 0:
        print(f"y={y}: {row_counts[y]}")
