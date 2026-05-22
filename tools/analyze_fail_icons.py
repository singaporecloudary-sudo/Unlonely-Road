"""精确扫描fail图左侧红色图标的边界"""
from PIL import Image
import numpy as np
import os

src_dir = r'C:/Users/liuyingjie.a/Desktop/游戏AI开发/UI界面/战斗UI'
fail = Image.open(os.path.join(src_dir, '5c273eec42279c338b857875411dcc496ef292a77eb58aa5ec182f8d0fc9a9ef.png'))
arr = np.array(fail)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
red = (r > 80) & (g < 70) & (b < 70)

# 在 x=50~280 范围扫描，逐行红色像素数
print("y\t红像素数")
for y in range(1300, 1800, 5):
    rc = red[y, 50:280].sum()
    if rc > 2:
        print(f"{y}\t{rc}")
