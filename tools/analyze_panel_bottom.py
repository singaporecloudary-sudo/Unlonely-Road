"""分析 panel_win 真实底部边框位置"""
from PIL import Image
import numpy as np

im = Image.open(r'F:/游戏制作/合成飞车射击/assets/ui/panel_win.png').convert('RGBA')
arr = np.array(im)
H, W = arr.shape[:2]
alpha = arr[..., 3]

# 倒序扫描每行非透明像素
print(f"size: {W}x{H}")
print("\n=== 底部 200px 每行非透明像素分布 ===")
for y in range(H - 200, H, 5):
    cnt = (alpha[y] > 50).sum()
    print(f"y={y} ({y/H*100:.1f}%): {cnt}")
