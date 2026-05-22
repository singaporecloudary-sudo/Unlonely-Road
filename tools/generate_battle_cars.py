"""
批量生成 LV.4~LV.52 俯视角战车精灵图
- 从首页车辆图片(car_lv{N}.png)提取车身主色和点缀色
- 按等级段(tier)设计不同复杂度的车型
- 输出到 assets/vehicles/battle/battle_car_lv{N}.png
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
import math
from collections import Counter

# ============ 配置 ============
HOME_CAR_DIR = r"F:\游戏制作\合成飞车射击\assets\vehicles\player"
OUTPUT_DIR = r"F:\游戏制作\合成飞车射击\assets\vehicles\battle"
SPRITE_W, SPRITE_H = 160, 240  # 2x渲染尺寸(80x120)，游戏内缩放
START_LV, END_LV = 4, 52


def extract_colors(img, n=8):
    """从图片提取非透明像素的主色"""
    small = img.resize((48, 48))
    pixels = []
    for y in range(small.height):
        for x in range(small.width):
            r, g, b, a = small.getpixel((x, y))
            if a > 100:
                pixels.append((r, g, b))
    if not pixels:
        return [(128, 128, 128)]
    # 按亮度分组取主色
    counter = Counter(pixels)
    top = counter.most_common(n)
    # 分离深色（车身）和亮色（点缀）
    dark_colors = []
    bright_colors = []
    for (r, g, b), cnt in top:
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum < 140:
            dark_colors.append(((r, g, b), cnt))
        else:
            bright_colors.append(((r, g, b), cnt))
    body = dark_colors[0][0] if dark_colors else (40, 40, 50)
    accent = bright_colors[0][0] if bright_colors else (200, 200, 200)
    return body, accent


def get_tier(level):
    """根据等级返回车型段"""
    if level <= 10:
        return 1  # 基础轿车
    elif level <= 20:
        return 2  # 运动轿车
    elif level <= 30:
        return 3  # 跑车
    elif level <= 40:
        return 4  # 超跑
    else:
        return 5  # Hypercar


def color_shift(color, dr=0, dg=0, db=0):
    """偏移颜色"""
    return (
        max(0, min(255, color[0] + dr)),
        max(0, min(255, color[1] + dg)),
        max(0, min(255, color[2] + db))
    )


def hex_color(rgb):
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


def draw_topdown_car(level, body_color, accent_color):
    """绘制俯视角战车精灵"""
    W, H = SPRITE_W, SPRITE_H
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    tier = get_tier(level)

    # --- 颜色方案 ---
    body = body_color
    dark = color_shift(body, -30, -30, -30)
    darker = color_shift(body, -60, -60, -60)
    highlight = color_shift(body, 40, 40, 40)
    bright = color_shift(body, 80, 80, 80)
    accent = accent_color
    accent_dark = color_shift(accent, -50, -50, -50)
    glass = (20, 30, 50, 180)  # 挡风玻璃
    wheel = (25, 25, 30, 255)
    wheel_rim = (60, 60, 70, 255)

    # --- 尺寸参数（基于tier） ---
    cx = W // 2  # 中心X
    car_w = 70 + tier * 4      # 车身宽度：74~90
    hood_len = 50 + tier * 4   # 引擎盖长度：54~70
    cabin_len = 45 + tier * 2  # 座舱长度：47~55
    rear_len = 35 + tier * 3   # 尾部长度：38~50
    wheel_w = 12 + tier        # 轮胎宽度：13~17
    wheel_h = 28 + tier * 2    # 轮胎长度：30~38

    total_len = hood_len + cabin_len + rear_len
    start_y = (H - total_len) // 2  # 顶部起始Y

    # === 1. 轮胎（4个，先画，被车身覆盖内侧部分）===
    wheel_inset = 6  # 轮胎内缩量
    # 前轮
    fw_y = start_y + hood_len - wheel_h // 2 - 5
    fw_x_left = cx - car_w // 2 - wheel_w + wheel_inset
    fw_x_right = cx + car_w // 2 - wheel_inset
    # 后轮
    rw_y = start_y + hood_len + cabin_len + 5
    rw_x_left = fw_x_left
    rw_x_right = fw_x_right

    for (wx, wy) in [(fw_x_left, fw_y), (fw_x_right, fw_y),
                      (rw_x_left, rw_y), (rw_x_right, rw_y)]:
        # 轮胎外框
        draw.rounded_rectangle(
            [wx, wy, wx + wheel_w, wy + wheel_h],
            radius=3, fill=wheel
        )
        # 轮毂
        rim_x = wx + wheel_w // 2 - 3
        rim_y = wy + wheel_h // 2 - 3
        draw.rounded_rectangle(
            [rim_x, rim_y, rim_x + 6, rim_y + 6],
            radius=2, fill=wheel_rim
        )

    # === 2. 车身阴影 ===
    shadow_offset = 3
    body_left = cx - car_w // 2
    body_right = cx + car_w // 2
    body_top = start_y
    body_bot = start_y + total_len

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [body_left + shadow_offset, body_top + shadow_offset,
         body_right + shadow_offset, body_bot + shadow_offset],
        radius=8, fill=(0, 0, 0, 60)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)

    # === 3. 车身主体 ===
    # 使用多边形绘制流线型车身
    half_w = car_w // 2
    # 引擎盖前端（尖角，tier越高越尖）
    nose_taper = 6 + tier * 2  # 8~16

    # 车身轮廓点（从引擎盖前端顺时针）
    body_pts = [
        (cx, body_top),                                    # 车头尖角
        (cx + nose_taper, body_top + 8),                   # 右前斜面
        (cx + half_w - 4, body_top + hood_len // 2),      # 右前侧
        (cx + half_w, body_top + hood_len),                # 右A柱
        (cx + half_w + 2, body_top + hood_len + cabin_len // 2),  # 右侧最宽
        (cx + half_w, body_top + hood_len + cabin_len),    # 右C柱
        (cx + half_w - 2, body_bot - rear_len // 3),      # 右后腰
        (cx + half_w - 6, body_bot - 4),                  # 右后角
        (cx, body_bot + 2),                                # 车尾中心
        (cx - half_w + 6, body_bot - 4),                  # 左后角
        (cx - half_w + 2, body_bot - rear_len // 3),      # 左后腰
        (cx - half_w, body_top + hood_len + cabin_len),    # 左C柱
        (cx - half_w - 2, body_top + hood_len + cabin_len // 2),
        (cx - half_w, body_top + hood_len),                # 左A柱
        (cx - half_w + 4, body_top + hood_len // 2),      # 左前侧
        (cx - nose_taper, body_top + 8),                   # 左前斜面
    ]
    draw.polygon(body_pts, fill=body)

    # === 4. 车身高光线（中间纵线）===
    line_w = 2 if tier < 3 else 3
    draw.line([(cx, body_top + 10), (cx, body_bot - 8)],
              fill=highlight, width=line_w)

    # === 5. 引擎盖 ===
    hood_top = body_top + 8
    hood_bot = body_top + hood_len - 2
    # 引擎盖轮廓
    hood_pts = [
        (cx - nose_taper + 4, hood_top),
        (cx + nose_taper - 4, hood_top),
        (cx + half_w - 10, hood_bot),
        (cx - half_w + 10, hood_bot),
    ]
    draw.polygon(hood_pts, fill=dark)

    # 引擎盖线条（tier 2+）
    if tier >= 2:
        # 中间隆起线
        bulge_w = 8 + tier * 2
        draw.polygon([
            (cx - bulge_w, hood_top + 5),
            (cx + bulge_w, hood_top + 5),
            (cx + bulge_w + 2, hood_bot),
            (cx - bulge_w - 2, hood_bot),
        ], fill=body)
        # 引擎盖进气口
        if tier >= 3:
            vent_w = 4 + tier
            for i in range(tier - 1):
                vy = hood_top + 12 + i * 8
                draw.rounded_rectangle(
                    [cx - vent_w, vy, cx + vent_w, vy + 4],
                    radius=1, fill=darker
                )

    # === 6. 挡风玻璃 ===
    glass_top = body_top + hood_len - 4
    glass_bot = body_top + hood_len + 18
    glass_w = half_w - 10
    glass_pts = [
        (cx - glass_w, glass_bot),
        (cx - glass_w + 6, glass_top),
        (cx + glass_w - 6, glass_top),
        (cx + glass_w, glass_bot),
    ]
    draw.polygon(glass_pts, fill=glass)
    # 玻璃反光
    draw.polygon([
        (cx - glass_w + 8, glass_top + 3),
        (cx - 2, glass_top + 3),
        (cx - 6, glass_bot - 3),
        (cx - glass_w + 4, glass_bot - 3),
    ], fill=(40, 60, 90, 100))

    # === 7. 座舱 ===
    cabin_top = glass_bot
    cabin_bot = body_top + hood_len + cabin_len
    # 座舱侧线
    cabin_w = half_w - 6
    draw.rounded_rectangle(
        [cx - cabin_w, cabin_top + 2, cx + cabin_w, cabin_bot - 2],
        radius=4, fill=body
    )

    # 后窗
    rw_top = cabin_bot - 14
    rw_bot = cabin_bot - 2
    rw_w = cabin_w - 6
    draw.polygon([
        (cx - rw_w, rw_top + 4),
        (cx - rw_w + 4, rw_top),
        (cx + rw_w - 4, rw_top),
        (cx + rw_w, rw_top + 4),
        (cx + rw_w - 2, rw_bot),
        (cx - rw_w + 2, rw_bot),
    ], fill=(25, 35, 55, 160))

    # === 8. 车尾 ===
    rear_top = cabin_bot
    rear_bot = body_bot
    # 尾部主体
    draw.polygon([
        (cx - half_w + 4, rear_top),
        (cx + half_w - 4, rear_top),
        (cx + half_w - 8, rear_bot - 6),
        (cx - half_w + 8, rear_bot - 6),
    ], fill=dark)

    # 尾灯
    tl_w = 8 + tier
    tl_h = 4
    for side in [-1, 1]:
        tl_x = cx + side * (half_w - 14) - tl_w // 2
        tl_y = rear_bot - 10
        draw.rounded_rectangle(
            [tl_x, tl_y, tl_x + tl_w, tl_y + tl_h],
            radius=1, fill=(255, 30, 30, 220)
        )
        # 尾灯发光
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle(
            [tl_x - 2, tl_y - 2, tl_x + tl_w + 2, tl_y + tl_h + 2],
            radius=2, fill=(255, 50, 50, 40)
        )
        glow = glow.filter(ImageFilter.GaussianBlur(3))
        img = Image.alpha_composite(img, glow)
        draw = ImageDraw.Draw(img)

    # === 9. 扰流板/尾翼（tier 2+）===
    if tier >= 2:
        spoiler_w = car_w - 8 - (5 - tier) * 4
        spoiler_h = 5 + tier
        spoiler_y = rear_bot + 1
        # 翼板
        draw.rounded_rectangle(
            [cx - spoiler_w // 2, spoiler_y,
             cx + spoiler_w // 2, spoiler_y + spoiler_h],
            radius=2, fill=darker
        )
        # 支架
        strut_w = 3
        for side in [-1, 1]:
            sx = cx + side * (spoiler_w // 2 - 10)
            draw.rectangle(
                [sx, spoiler_y - 6, sx + strut_w, spoiler_y],
                fill=darker
            )
        # 尾翼accent色
        if tier >= 4:
            draw.rounded_rectangle(
                [cx - spoiler_w // 2 + 2, spoiler_y + 1,
                 cx + spoiler_w // 2 - 2, spoiler_y + 3],
                radius=1, fill=accent
            )

    # === 10. 赛车条纹（tier 2+）===
    if tier >= 2:
        stripe_w = 4 + tier
        # 中间竖条纹
        draw.line(
            [(cx, body_top + 12), (cx, body_bot - 10)],
            fill=accent, width=stripe_w
        )
    if tier >= 3:
        # 双侧条纹
        for side in [-1, 1]:
            sx = cx + side * (half_w - 14)
            draw.line(
                [(sx, body_top + hood_len), (sx, body_bot - 15)],
                fill=accent_dark, width=2
            )
    if tier >= 5:
        # 赛车宽条纹
        for side in [-1, 1]:
            sx = cx + side * 12
            draw.line(
                [(sx, body_top + 14), (sx, body_top + hood_len - 2)],
                fill=accent, width=3
            )

    # === 11. 侧裙/进气口（tier 3+）===
    if tier >= 3:
        for side in [-1, 1]:
            intake_x = cx + side * (half_w - 3)
            intake_top = body_top + hood_len + 8
            intake_bot = body_top + hood_len + cabin_len - 8
            # 侧进气口
            draw.rounded_rectangle(
                [intake_x - 4, intake_top, intake_x + 4, intake_top + 12],
                radius=2, fill=darker
            )
            draw.rounded_rectangle(
                [intake_x - 4, intake_bot - 12, intake_x + 4, intake_bot],
                radius=2, fill=darker
            )

    # === 12. 侧后视镜 ===
    mirror_size = 5 + tier
    mirror_y = body_top + hood_len + 4
    for side in [-1, 1]:
        mx = cx + side * (half_w + 1)
        draw.rounded_rectangle(
            [mx - mirror_size, mirror_y,
             mx + mirror_size, mirror_y + mirror_size],
            radius=2, fill=body
        )
        # 镜面
        draw.rounded_rectangle(
            [mx - mirror_size + 1, mirror_y + 1,
             mx + mirror_size - 1, mirror_y + mirror_size - 1],
            radius=1, fill=highlight
        )

    # === 13. 车头灯 ===
    hl_w = 6 + tier
    hl_h = 3 + tier // 2
    for side in [-1, 1]:
        hx = cx + side * (nose_taper - 2) - hl_w // 2
        hy = body_top + 6
        draw.rounded_rectangle(
            [hx, hy, hx + hl_w, hy + hl_h],
            radius=1, fill=(255, 255, 220, 230)
        )
        # 灯光发光
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle(
            [hx - 3, hy - 3, hx + hl_w + 3, hy + hl_h + 3],
            radius=3, fill=(255, 255, 200, 30)
        )
        glow = glow.filter(ImageFilter.GaussianBlur(4))
        img = Image.alpha_composite(img, glow)
        draw = ImageDraw.Draw(img)

    # === 14. 等级标识（小型LV文字，底部）===
    try:
        font = ImageFont.truetype("arial.ttf", 10)
    except:
        font = ImageFont.load_default()
    label = f"Lv{level}"
    draw.text((cx - 10, body_bot + 8), label, fill=(*accent, 200), font=font)

    # === 15. 发光特效（tier 4+）===
    if tier >= 4:
        # accent色发光轮廓
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        # 底部发光
        gd.rounded_rectangle(
            [body_left - 4, body_bot - 8,
             body_right + 4, body_bot + 4],
            radius=4, fill=(*accent, 25)
        )
        glow = glow.filter(ImageFilter.GaussianBlur(6))
        img = Image.alpha_composite(img, glow)
        draw = ImageDraw.Draw(img)

    # === 16. 排气管火焰（tier 5）===
    if tier >= 5:
        for side in [-1, 1]:
            ex = cx + side * 10
            ey = body_bot + 2
            # 小火焰
            for fi in range(3):
                fw = 3 - fi
                fh = 6 + fi * 3
                alpha = 150 - fi * 40
                draw.rounded_rectangle(
                    [ex - fw, ey, ex + fw, ey + fh],
                    radius=2, fill=(255, 150 + fi * 30, 30, alpha)
                )

    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for lv in range(START_LV, END_LV + 1):
        # 读取首页车辆图片提取颜色
        home_path = os.path.join(HOME_CAR_DIR, f"car_lv{lv}.png")
        if not os.path.exists(home_path):
            print(f"[SKIP] LV{lv}: 首页车辆图片不存在")
            continue

        home_img = Image.open(home_path).convert("RGBA")
        body_color, accent_color = extract_colors(home_img)
        tier = get_tier(lv)

        # 生成俯视角精灵
        sprite = draw_topdown_car(lv, body_color, accent_color)

        # 保存
        out_path = os.path.join(OUTPUT_DIR, f"battle_car_lv{lv}.png")
        sprite.save(out_path, "PNG")
        print(f"[OK] LV{lv} (tier {tier}): body={hex_color(body_color)} accent={hex_color(accent_color)} → {out_path}")

    print(f"\n完成！共生成 LV{START_LV}~LV{END_LV} 的俯视角战车精灵图")


if __name__ == "__main__":
    main()
