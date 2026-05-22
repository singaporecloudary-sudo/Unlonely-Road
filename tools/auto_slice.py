"""
自动切图脚本 v2 — 从参考图 image_1.png 切割所有UI元素
参考图尺寸: 3072x5504 -> 缩放到720宽(高1290)进行切割
核心: 使用 crafting-scene.js 中验证过的 layout 坐标
"""
import os
from PIL import Image

# ==================== 路径配置 ====================
BASE_DIR = r"F:\游戏制作\合成飞车射击"
REF_IMAGE = r"C:\Users\liuyingjie.a\Desktop\游戏AI开发\UI界面\image_1.png"
OUT_DIR = os.path.join(BASE_DIR, "assets")

# 加载并缩放参考图
img_full = Image.open(REF_IMAGE)
img = img_full.resize((720, int(img_full.size[1] * 720 / img_full.size[0])), Image.LANCZOS)
print(f"📷 参考图: {img_full.size} -> 工作图: {img.size}")

# ==================== 切割定义 ====================
# 格式: (输出路径, (x1,y1,x2,y2), 目标尺寸)
# 坐标基于720宽缩放图，来自crafting-scene.js layout对象
REGIONS = [
    # ===== 按钮 assets/ui/buttons/ =====
    ("ui/buttons/btn_settings.png",   (22, 108, 80, 166),     (80, 80)),
    ("ui/buttons/btn_vip.png",        (22, 172, 80, 230),     (80, 80)),
    ("ui/buttons/btn_change_car.png", (270, 360, 450, 398),   (200, 60)),
    ("ui/buttons/btn_auto_craft.png",(48, 508, 223, 560),    (200, 60)),
    ("ui/buttons/btn_stage.png",     (268, 508, 453, 572),   (200, 60)),
    ("ui/buttons/btn_race.png",      (498, 508, 670, 560),   (200, 60)),
    ("ui/buttons/btn_drone.png",     (35, 1120, 200, 1180),  (80, 80)),
    ("ui/buttons/btn_buy_car.png",   (228, 1120, 492, 1180), (200, 60)),
    ("ui/buttons/btn_shop.png",      (520, 1120, 685, 1180), (80, 80)),

    # ===== 图标 assets/ui/icons/ =====
    ("ui/icons/icon_fire.png",       (28, 32, 68, 72),         (40, 40)),

    # ===== 进度条 assets/ui/bars/ =====
    ("ui/bars/bar_progress.png",     (256, 465, 466, 480),    (400, 20)),

    # ===== 场景 assets/scenes/ =====
    ("scenes/main_bg/main_bg.png",  (0, 0, 720, 1280),        (720, 1280)),
]

# 右侧栏元素（超出720宽度，从原图切）
RIGHT_SIDE = [
    ("ui/buttons/btn_lucky.png", (2620, 310, 2860, 530), (80, 80)),
    ("ui/icons/icon_coin.png",  (2640, 580, 2860, 780), (40, 40)),
    ("ui/icons/icon_gem.png",   (2710, 90,  2840, 200), (40, 40)),
]

# ==================== 执行切割 ====================
ok, fail = 0, 0

for path, (x1, y1, x2, y2), out_size in REGIONS + RIGHT_SIDE:
    try:
        # 选择图片来源
        if path in [r[0] for r in RIGHT_SIDE]:
            src = img_full
        else:
            src = img

        x1i, x2i, y1i, y2i = int(x1), int(x2), int(y1), int(y2)
        x2i = min(x2i, src.size[0])
        y2i = min(y2i, src.size[1])

        crop = src.crop((x1i, y1i, x2i, y2i))
        if crop.size[0] <= 0 or crop.size[1] <= 0:
            print(f"  ⚠️  {path}: 空裁剪区域")
            fail += 1
            continue

        full_path = os.path.join(OUT_DIR, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        crop.resize(out_size, Image.LANCZOS).save(full_path, "PNG")
        ok += 1
        print(f"  ✅ {path}")
    except Exception as e:
        fail += 1
        print(f"  ❌ {path}: {e}")

print(f"\n{'='*50}")
print(f"🎉 完成! 成功: {ok}, 失败: {fail}")
print(f"📂 输出目录: {OUT_DIR}")
print(f"{'='*50}")
