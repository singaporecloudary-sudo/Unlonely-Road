"""精确裁剪：分别定位每个图标，去除 panel_fail 底部"金币图标"文字"""
from PIL import Image
import numpy as np
import os

src_dir = r'C:/Users/liuyingjie.a/Desktop/游戏AI开发/UI界面/战斗UI'
out_dir = r'F:/游戏制作/合成飞车射击/assets/ui'
os.makedirs(out_dir, exist_ok=True)


def find_bbox(mask, x0, y0, x1, y1, pad=4, img_h=2048, img_w=1152):
    region = mask[y0:y1, x0:x1]
    ys = np.where(region.any(axis=1))[0]
    xs = np.where(region.any(axis=0))[0]
    if len(ys) == 0 or len(xs) == 0:
        return None
    return (
        max(0, x0 + int(xs.min()) - pad),
        max(0, y0 + int(ys.min()) - pad),
        min(img_w, x0 + int(xs.max()) + 1 + pad),
        min(img_h, y0 + int(ys.max()) + 1 + pad),
    )


def black_to_transparent(img, threshold=25):
    img = img.convert('RGBA')
    arr = np.array(img)
    rgb = arr[..., :3]
    brightness = rgb.max(axis=2)
    alpha = arr[..., 3].copy()
    alpha[brightness < threshold] = 0
    soft_mask = (brightness >= threshold) & (brightness < threshold + 30)
    alpha_factor = ((brightness - threshold).astype(np.float32) / 30.0) * 255
    alpha[soft_mask] = np.minimum(alpha[soft_mask], alpha_factor[soft_mask].astype(np.uint8))
    arr[..., 3] = alpha
    return Image.fromarray(arr, mode='RGBA')


def crop_save(img, bbox, name, transparent=True):
    if bbox is None:
        print(f"  {name}: 未找到")
        return
    cropped = img.crop(bbox)
    if transparent:
        cropped = black_to_transparent(cropped)
    cropped.save(os.path.join(out_dir, name))
    print(f"  {name}: {bbox} -> {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]}")


# ========== fail图 ==========
fail = Image.open(os.path.join(src_dir, '5c273eec42279c338b857875411dcc496ef292a77eb58aa5ec182f8d0fc9a9ef.png'))
arr = np.array(fail)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
red = (r > 80) & (g < 70) & (b < 70)
gray = arr[..., :3].mean(axis=2)
bright = gray > 80

print("=== FAIL ===")
# panel：只取面板主体，y下界限制到800（避免文字"金币图标"误入）
crop_save(fail, find_bbox(red, 30, 70, 650, 820), 'panel_fail.png')
crop_save(fail, find_bbox(red | bright, 650, 110, 1130, 295), 'btn_retry.png')
crop_save(fail, find_bbox(bright, 650, 350, 1130, 500), 'btn_back.png')
crop_save(fail, find_bbox(red | bright, 700, 620, 1000, 770), 'coin_glow.png')

# 红色三个小图标 —— 仔细分别定位
# 整张大图左下侧三排图标(瞄准镜/道路/金币)按行分开
# 通过列扫描确认每个图标的y位置
left_red = red[1300:1800, 50:280]
ys = np.where(left_red.any(axis=1))[0]
print(f"  左侧红色图标y范围: {ys.min()+1300}~{ys.max()+1300}" if len(ys) else "  无")

# 严格按行边界裁切 - 三个图标各自一格 (经实测)
crop_save(fail, find_bbox(red, 100, 1340, 200, 1410), 'icon_target_red.png')
crop_save(fail, find_bbox(red, 100, 1410, 200, 1500), 'icon_road_red.png')
crop_save(fail, find_bbox(red, 100, 1500, 200, 1610), 'icon_coin_red.png')

# ========== success图 ==========
succ = Image.open(os.path.join(src_dir, '8f57db3d5ec6f70b014bbdb2c27b8d05b74fd1b710fd1b42d95964d2ede74ecf.png'))
arr2 = np.array(succ)
r2, g2, b2 = arr2[..., 0], arr2[..., 1], arr2[..., 2]
cyan = (g2 > 100) & (b2 > 100) & (r2 < 100)
green = (g2 > 100) & (r2 < 100) & (b2 < 100)
gold = (r2 > 180) & (g2 > 130) & (b2 < 100)

print("\n=== SUCCESS ===")
# panel：从y=127开始（避开"背景"白字）
crop_save(succ, find_bbox(cyan, 30, 127, 650, 900), 'panel_win.png')
# 绿按钮：从y=130开始捕获
crop_save(succ, find_bbox(green, 650, 110, 1130, 330), 'btn_claim.png')
# coin_big：仅gold色域
crop_save(succ, find_bbox(gold, 700, 540, 1130, 800), 'coin_big.png')

# 青色小图标
crop_save(succ, find_bbox(cyan, 700, 1140, 950, 1320), 'icon_target_cyan.png')
crop_save(succ, find_bbox(cyan, 60, 1480, 280, 1640), 'icon_road_cyan.png')
crop_save(succ, find_bbox(cyan, 700, 1480, 970, 1640), 'icon_coinpile_cyan.png')

print("\nDone!")
