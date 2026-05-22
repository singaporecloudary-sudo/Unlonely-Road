"""裁切 panel 切图的纯边框版本（去除内部 REWARD/LEVEL 装饰）"""
from PIL import Image
import numpy as np
import os

src_dir = r'F:/游戏制作/合成飞车射击/assets/ui'

# 读取 panel_win 和 panel_fail，仅保留外边框（顶 12%、左右边框、底 8%），中间清空
def make_clean_panel(src_name, dst_name, top_keep=0.13, bot_keep=0.08, side_keep_ratio=0.10):
    """
    保留顶部12%（LEVEL区+顶边框）、底部8%（底边框）、左右两侧10%宽度的边框，
    中间区域全部透明（避免与Canvas绘制内容冲突）。
    """
    im = Image.open(os.path.join(src_dir, src_name)).convert('RGBA')
    arr = np.array(im)
    H, W = arr.shape[:2]
    top_h = int(H * top_keep)
    bot_h = int(H * bot_keep)
    side_w = int(W * side_keep_ratio)
    # 中间区域 (top_h..H-bot_h, side_w..W-side_w) 设为透明
    arr[top_h:H - bot_h, side_w:W - side_w, 3] = 0
    Image.fromarray(arr, 'RGBA').save(os.path.join(src_dir, dst_name))
    print(f"  {dst_name}: 保留顶{top_h}px 底{bot_h}px 边{side_w}px")

make_clean_panel('panel_win.png', 'panel_win_frame.png', top_keep=0.13, bot_keep=0.05, side_keep_ratio=0.10)
make_clean_panel('panel_fail.png', 'panel_fail_frame.png', top_keep=0.13, bot_keep=0.05, side_keep_ratio=0.10)

print("Done")
