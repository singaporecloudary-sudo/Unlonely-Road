"""精确定位 panel_win 自带 REWARD 装饰的位置"""
from PIL import Image
import numpy as np

im = Image.open(r'F:/游戏制作/合成飞车射击/assets/ui/panel_win.png').convert('RGBA')
arr = np.array(im)
H, W = arr.shape[:2]
print(f"panel_win: {W}x{H}")

# 中部区域（去除左右边框），扫描每行非透明像素
mid = arr[:, W//5: W*4//5, 3]
counts = (mid > 50).sum(axis=1)
# 打印密度突变行（连续高密度区域）
print("\n中部高密度行（>30 px）：")
in_block = False
for y in range(H):
    if counts[y] > 30:
        if not in_block:
            print(f"  block start y={y} ({y/H*100:.1f}%)")
            in_block = True
    else:
        if in_block:
            print(f"  block end   y={y-1} ({(y-1)/H*100:.1f}%)")
            in_block = False
