"""
敌车精灵图去背景 v3 - 强力去背（无外部依赖）
1. 泛洪填充清除主背景
2. alpha < 160 的全部归零（二值化）
3. 手动腐蚀边缘2像素
"""
from PIL import Image, ImageFilter
import numpy as np
import os
from collections import deque

ENEMY_DIR = r"F:\游戏制作\合成飞车射击\assets\vehicles\enemy"
SPRITES = ["enemy_normal.png", "enemy_fast.png", "enemy_tank.png", "enemy_boss.png"]
COLOR_TOLERANCE = 35       # 泛洪填充容差
ALPHA_CUTOFF = 160         # 低于此值的alpha直接归零
ERODE_PIXELS = 2           # 边缘腐蚀像素数

def numpy_erode(binary_mask, iterations=1):
    """用numpy实现形态学腐蚀"""
    result = binary_mask.copy()
    for _ in range(iterations):
        padded = np.pad(result, 1, mode='constant', constant_values=False)
        # 3x3全为True才保留True
        for dr in range(-1, 2):
            for dc in range(-1, 2):
                if dr == 0 and dc == 0:
                    continue
                shifted = padded[1+dr:1+dr+result.shape[0], 1+dc:1+dc+result.shape[1]]
                result = result & shifted
    return result

def strong_remove_bg(img):
    """强力去背：泛洪 + 二值化 + 腐蚀"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    data = np.array(img, dtype=np.float32)
    rows, cols = data.shape[:2]
    rgb = data[:, :, :3]
    
    # === Step 1: 泛洪填充 ===
    corners_rgb = [rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]]
    seed_color = np.mean(corners_rgb, axis=0)
    dist = np.sqrt(np.sum((rgb - seed_color) ** 2, axis=2))
    
    mask = np.zeros((rows, cols), dtype=bool)
    visited = np.zeros((rows, cols), dtype=bool)
    queue = deque()
    for sr, sc in [(0,0),(0,cols-1),(rows-1,0),(rows-1,cols-1)]:
        if not visited[sr, sc]:
            queue.append((sr, sc))
            visited[sr, sc] = True
    
    dirs8 = [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]
    while queue:
        r, c = queue.popleft()
        if dist[r, c] < COLOR_TOLERANCE * 3:
            mask[r, c] = True
            for dr, dc in dirs8:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and not visited[nr, nc]:
                    visited[nr, nc] = True
                    queue.append((nr, nc))
    
    # === Step 2: 构建初始alpha ===
    alpha_base = (~mask).astype(np.float32) * 255.0
    
    # === Step 3: 二值化 — 低于阈值直接归零 ===
    binary_mask = alpha_base > ALPHA_CUTOFF
    
    # === Step 4: 边缘腐蚀 ===
    if ERODE_PIXELS > 0:
        binary_mask = numpy_erode(binary_mask, ERODE_PIXELS)
    
    # === Step 5: 微羽化防硬边 ===
    alpha_final = (binary_mask.astype(np.float32) * 255.0)
    alpha_img = Image.fromarray(alpha_final.astype(np.uint8), mode='L')
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.6))
    alpha_final = np.array(alpha_img, dtype=np.float32)
    # 内部保持不透明
    alpha_final[binary_mask] = np.maximum(alpha_final[binary_mask], 230)
    # 外部确保完全透明
    alpha_final[~binary_mask] = 0
    
    data[:, :, 3] = alpha_final.astype(np.uint8)
    return Image.fromarray(data.astype(np.uint8), mode='RGBA')

def main():
    for fname in SPRITES:
        fpath = os.path.join(ENEMY_DIR, fname)
        print(f"处理: {fname} ... ", end='')
        
        img = Image.open(fpath)
        result = strong_remove_bg(img)
        result.save(fpath, 'PNG')
        
        a = result.split()[3]
        w, h = result.size
        corners = [a.getpixel((5,5)), a.getpixel((w-6,5)), 
                   a.getpixel((5,h-6)), a.getpixel((w-6,h-6))]
        arr = np.array(a)
        semi_count = ((arr > 10) & (arr < 200)).sum()
        size_kb = os.path.getsize(fpath) / 1024
        print(f"完成 ({size_kb:.0f}KB, 角落={corners}, 半透明像素={semi_count})")
    
    print("\n完成！Ctrl+Shift+R 刷新游戏查看")

if __name__ == '__main__':
    main()
