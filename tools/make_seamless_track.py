"""
将赛道背景图处理为垂直无缝循环版本。
方法：取顶部和底部各 BLEND_HEIGHT 像素区域，
做双向alpha渐变混合，消除拼接接缝。
"""

from PIL import Image
import os

SRC = r"F:\游戏制作\合成飞车射击\assets\scenes\track_bg\track_bg.png"
DST = r"F:\游戏制作\合成飞车射击\assets\scenes\track_bg\track_bg.png"  # 直接覆盖原文件
BLEND_HEIGHT = 150  # 混合区域高度（像素），越大越平滑

def make_seamless():
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    print(f"原图尺寸: {w}x{h}")

    # 提取顶部和底部条带
    top_strip = img.crop((0, 0, w, BLEND_HEIGHT))
    bottom_strip = img.crop((0, h - BLEND_HEIGHT, w, h))

    # === 底部混合区：bottom_strip 渐变 → top_strip ===
    for y in range(BLEND_HEIGHT):
        ratio = y / BLEND_HEIGHT  # 0(顶) → 1(底)
        alpha = ratio  # 越往下越用 top_strip 的内容
        for x in range(w):
            b_px = bottom_strip.getpixel((x, y))
            t_px = top_strip.getpixel((x, y))
            # RGBA 线性插值
            blended = tuple(
                int(b_px[c] * (1 - alpha) + t_px[c] * alpha)
                for c in range(4)
            )
            img.putpixel((x, h - BLEND_HEIGHT + y), blended)

    # === 顶部混合区：top_strip 渐变 → bottom_strip ===
    for y in range(BLEND_HEIGHT):
        ratio = y / BLEND_HEIGHT  # 0(顶) → 1(底)
        alpha = ratio  # 越往下越用 bottom_strip 的内容
        for x in range(w):
            t_px = top_strip.getpixel((x, y))
            b_px = bottom_strip.getpixel((x, y))
            blended = tuple(
                int(t_px[c] * (1 - alpha) + b_px[c] * alpha)
                for c in range(4)
            )
            img.putpixel((x, y), blended)

    # 保存
    img.save(DST, "PNG")
    print(f"✅ 无缝循环图已保存到: {DST}")
    print(f"   混合区高度: {BLEND_HEIGHT}px (上下各{BLEND_HEIGHT}px)")

if __name__ == "__main__":
    make_seamless()
