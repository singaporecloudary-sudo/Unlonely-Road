"""分析fail图右上区域，确认 btn_retry 和 btn_back 的精确位置"""
from PIL import Image
import numpy as np
import os

src_dir = r'C:/Users/liuyingjie.a/Desktop/游戏AI开发/UI界面/战斗UI'
fail = Image.open(os.path.join(src_dir, '5c273eec42279c338b857875411dcc496ef292a77eb58aa5ec182f8d0fc9a9ef.png'))
arr = np.array(fail)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
red = (r > 80) & (g < 70) & (b < 70)
gray = arr[..., :3].mean(axis=2)
bright = gray > 80

# 扫描 x>650 的右半区，每行红色和亮像素分布
print("y\t红\t亮")
for y in range(100, 700, 15):
    rc = red[y, 650:1130].sum()
    bc = bright[y, 650:1130].sum()
    if rc + bc > 5:
        print(f"{y}\t{rc}\t{bc}")
