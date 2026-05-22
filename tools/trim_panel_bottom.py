"""裁掉 panel 底部空白边框，让 panel 紧凑显示"""
from PIL import Image
import numpy as np
import os

ui_dir = r'F:/游戏制作/合成飞车射击/assets/ui'

def trim_bottom_padding(name, target_bottom_keep_px=18):
    """裁切 panel 切图底部空白：保留底边框 target_bottom_keep_px 像素"""
    im = Image.open(os.path.join(ui_dir, name)).convert('RGBA')
    arr = np.array(im)
    H, W = arr.shape[:2]
    alpha = arr[..., 3]
    # 找到最后一个非透明像素的 y
    rows_with_content = np.where((alpha > 50).any(axis=1))[0]
    if len(rows_with_content) == 0:
        print(f"  {name}: 无内容")
        return
    last_y = int(rows_with_content[-1])
    # 保留到 last_y + target_bottom_keep_px
    new_h = min(H, last_y + target_bottom_keep_px)
    if new_h < H:
        new_arr = arr[:new_h]
        Image.fromarray(new_arr, 'RGBA').save(os.path.join(ui_dir, name))
        print(f"  {name}: {H} -> {new_h} ({W}x{new_h})")
    else:
        print(f"  {name}: 无需裁切 (H={H}, last_y+keep={last_y + target_bottom_keep_px})")

trim_bottom_padding('panel_win.png', 18)
trim_bottom_padding('panel_fail.png', 18)
print("Done")
