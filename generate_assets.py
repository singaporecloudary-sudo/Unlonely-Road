"""
批量生成合成飞车射击游戏缺失的占位符PNG资源
运行: python generate_assets.py
"""
import os
from PIL import Image, ImageDraw, ImageFont
import math

BASE = os.path.dirname(os.path.abspath(__file__))

def ensure_dir(path):
    d = os.path.dirname(path)
    if d and not os.path.exists(d):
        os.makedirs(d)

def save(img, path):
    ensure_dir(path)
    img.save(path)
    print(f"  [OK] {path} ({img.size[0]}x{img.size[1]})")

# ==================== UI Bars ====================
print("=== 生成UI进度条 ===")

# bar_exp.png - 经验条 (类似bar_progress但蓝色调)
w, h = 400, 20
img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.rounded_rectangle([0, 0, w-1, h-1], radius=10, fill=(30, 40, 60, 200), outline=(100, 120, 180, 255))
fill_w = int(w * 0.6)
draw.rounded_rectangle([2, 2, fill_w, h-3], radius=8, fill=(80, 130, 255, 230))
save(img, os.path.join(BASE, 'assets', 'ui', 'bars', 'bar_exp.png'))

# bar_hp.png - 血条 (红色)
w, h = 300, 30
img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.rounded_rectangle([0, 0, w-1, h-1], radius=15, fill=(50, 20, 20, 200), outline=(200, 60, 60, 255))
fill_w = int(w * 0.7)
draw.rounded_rectangle([2, 2, fill_w, h-3], radius=13, fill=(220, 50, 50, 240))
save(img, os.path.join(BASE, 'assets', 'ui', 'bars', 'bar_hp.png'))


# ==================== Scene Backgrounds ====
print("=== 生成场景背景 ===")

# track_bg.png - 赛道背景 (720x1280 可平铺)
w, h = 720, 1280
img = Image.new('RGB', (w, h), (34, 139, 34))  # 草地绿色
draw = ImageDraw.Draw(img)
# 路面
road_w = int(w * 0.65)
road_x = (w - road_w) // 2
draw.rectangle([road_x, 0, road_x + road_w, h], fill=(55, 55, 68))
# 车道线
lane_w = road_w // 3
for i in range(1, 3):
    lx = road_x + lane_w * i
    for y in range(0, h, 40):
        draw.line([(lx, y), (lx, min(y+20, h))], fill=(255, 235, 59), width=3)
# 道路边缘线
draw.line([(road_x, 0), (road_x, h)], fill=(255, 255, 255), width=4)
draw.line([(road_x+road_w, 0), (road_x+road_w, h)], fill=(255, 255, 255), width=4)
save(img, os.path.join(BASE, 'assets', 'scenes', 'track_bg', 'track_bg.png'))


# ==================== Bullets ====
print("=== 生成子弹特效 ===")

def draw_bullet(path, size, color, glow_color=None):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w//2, h//2
    # 发光效果
    if glow_color:
        for r in range(max(w,h)//2, max(w,h)//4, -2):
            alpha = int(60 * (1 - r / (max(w,h)//2)))
            gc = (*glow_color[:3], alpha) if len(glow_color)==4 else (*glow_color, alpha)
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=gc)
    # 子弹主体（椭圆/子弹形状）
    draw.ellipse([cx-w//2+2, cy-h//2+2, cx+w//2-2, cy+h//2-2], fill=color)
    # 高光
    draw.ellipse([cx-w//4, cy-h//3, cx, cy-h//6], fill=tuple(min(c+80, 255) for c in color[:3])+(color[3],))
    save(img, path)

draw_bullet(os.path.join(BASE, 'assets', 'effects', 'bullets', 'bullet_normal.png'), (16, 24), (255, 235, 59, 255), (255, 200, 0))
draw_bullet(os.path.join(BASE, 'assets', 'effects', 'bullets', 'bullet_power.png'), (24, 32), (255, 100, 50, 255), (255, 150, 0))
draw_bullet(os.path.join(BASE, 'assets', 'effects', 'bullets', 'bullet_drone.png'), (12, 18), (100, 200, 255, 255), (50, 150, 255))


# ==================== Explosions ====
print("=== 生成爆炸特效 ===")

def draw_explosion(path, size, colors):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w//2, h//2
    # 多层粒子
    for i in range(12):
        angle = i * math.pi / 6
        dist = (w//3) * (0.5 + 0.5 * (i % 3) / 2)
        px = cx + math.cos(angle) * dist
        py = cy + math.sin(angle) * dist
        r = (w // 6) * (1 - (i % 3) * 0.2)
        color = colors[i % len(colors)]
        alpha = int(200 * (1 - (i % 4) * 0.15))
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(*color[:3], alpha))
    # 核心白亮
    draw.ellipse([cx-w//8, cy-h//8, cx+w//8, cy+h//8], fill=(255, 255, 255, 240))
    save(img, path)

draw_explosion(os.path.join(BASE, 'assets', 'effects', 'explosions', 'explosion_small.png'), (60, 60), [(255,87,34),(255,152,0),(255,235,59),(255,255,255)])
draw_explosion(os.path.join(BASE, 'assets', 'effects', 'explosions', 'explosion_medium.png'), (100, 100), [(255,87,34),(255,152,0),(255,193,7),(255,235,59),(255,255,255)])
draw_explosion(os.path.join(BASE, 'assets', 'effects', 'explosions', 'explosion_large.png'), (150, 150), [(244,67,54),(255,87,34),(255,152,0),(255,193,7),(255,235,59),(255,255,255)])


# ==================== Craft Effects ====
print("=== 生成合成特效 ===")

def draw_craft_fx(path, size, colors, has_ring=True):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w//2, h//2
    # 环形光芒
    if has_ring:
        for r_idx in range(3):
            r = (w//3) - r_idx * (w//10)
            alpha = 150 - r_idx * 40
            c = colors[r_idx % len(colors)]
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*c[:3], alpha), width=3)
    # 星形射线
    for i in range(8):
        angle = i * math.pi / 4 + 0.2
        inner_r = w // 6
        outer_r = w // 3
        x1 = cx + math.cos(angle) * inner_r
        y1 = cy + math.sin(angle) * inner_r
        x2 = cx + math.cos(angle) * outer_r
        y2 = cy + math.sin(angle) * outer_r
        c = colors[i % len(colors)]
        draw.line([(x1,y1),(x2,y2)], fill=(*c[:3], 180), width=2)
    # 中心发光
    draw.ellipse([cx-w//8, cy-h//8, cx+w//8, cy+h//8], fill=(255,255,255,220))
    # 粒子
    for i in range(16):
        angle = i * math.pi / 8
        dist = w//3 + (i%4)*10
        px = cx + math.cos(angle) * dist
        py = cy + math.sin(angle) * dist
        pr = 3 + (i%3)*2
        c = colors[i % len(colors)]
        draw.ellipse([px-pr, py-pr, px+pr, py+pr], fill=(*c[:3], 160))
    save(img, path)

draw_craft_fx(os.path.join(BASE, 'assets', 'effects', 'craft', 'fx_merge.png'), (120, 120), [(124,77,255),(179,136,255),(225,204,255)])
draw_craft_fx(os.path.join(BASE, 'assets', 'effects', 'craft', 'fx_levelup.png'), (200, 200), [(124,77,255),(179,136,255),(225,204,255),(255,215,0),(255,255,255)])


# ==================== Buff Effects ====
print("=== 生成Buff特效 ===")

def draw_buff_fx(path, size, colors):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w//2, h//2
    # 外圈光环
    for r_idx in range(4):
        r = (min(w,h)//2 - 5) - r_idx * (min(w,h)//10)
        if r <= 0: break
        alpha = 120 - r_idx * 25
        c = colors[r_idx % len(colors)]
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*c[:3], alpha), width=2)
    # 旋转菱形
    for i in range(4):
        angle = i * math.pi / 2 + 0.3
        r = min(w,h) // 3
        points = []
        for j in range(4):
            a = angle + j * math.pi / 2
            points.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        c = colors[i % len(colors)]
        draw.polygon(points, fill=(*c[:3], 100), outline=(*c[:3], 200))
    # 中心图标区
    draw.ellipse([cx-w//5, cy-h//5, cx+w//5, cy+h//5], fill=(*colors[0][:3], 180), outline=(255,255,255,200))
    save(img, path)

draw_buff_fx(os.path.join(BASE, 'assets', 'effects', 'buff', 'fx_fireboost.png'), (80, 80), [(255,87,34),(255,152,0),(255,193,7)])
draw_buff_fx(os.path.join(BASE, 'assets', 'effects', 'buff', 'fx_shield.png'), (120, 120), [(33,150,243),(100,181,246),(144,202,249)])
draw_buff_fx(os.path.join(BASE, 'assets', 'effects', 'buff', 'fx_speed.png'), (80, 80), [(76,175,80),(129,199,132),(165,214,167)])
draw_buff_fx(os.path.join(BASE, 'assets', 'effects', 'buff', 'fx_heal.png'), (80, 80), [(0,230,176),(105,240,174),(178,245,194)])


# ==================== Enemy Vehicles ====
print("=== 生成敌方车辆 ===")

def draw_enemy(path, size, color, label):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 车身 - 梯形状
    body_pts = [
        (w*0.1, h*0.7), (w*0.9, h*0.7),
        (w*0.75, h*0.25), (w*0.25, h*0.25)
    ]
    draw.polygon(body_pts, fill=color, outline=(255,255,255,180))
    # 挡风玻璃
    glass_pts = [
        (w*0.35, h*0.55), (w*0.65, h*0.55),
        (w*0.58, h*0.32), (w*0.42, h*0.32)
    ]
    draw.polygon(glass_pts, fill=(100,150,200,200), outline=(200,230,255,200))
    # 轮子
    draw.ellipse([w*0.05, h*0.6, w*0.22, h*0.85], fill=(30,30,30,255))
    draw.ellipse([w*0.78, h*0.6, w*0.95, h*0.85], fill=(30,30,30,255))
    # 标签
    try:
        font = ImageFont.truetype("arial.ttf", int(h*0.25))
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0,0), label, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.text((w/2-tw/2, h/2-th/2), label, fill=(255,255,255,255), font=font)
    save(img, path)

draw_enemy(os.path.join(BASE, 'assets', 'vehicles', 'enemy', 'enemy_normal.png'), (70, 100), (220, 60, 60), "敌")
draw_enemy(os.path.join(BASE, 'assets', 'vehicles', 'enemy', 'enemy_fast.png'), (60, 90), (255, 140, 0), "快")
draw_enemy(os.path.join(BASE, 'assets', 'vehicles', 'enemy', 'enemy_tank.png'), (90, 130), (100, 100, 110), "坦")
draw_enemy(os.path.join(BASE, 'assets', 'vehicles', 'enemy', 'enemy_boss.png'), (120, 160), (140, 0, 200), "BOSS")


# ==================== Obstacles ====
print("=== 生成障碍物 ===")

def draw_obstacle(path, size, color, shape, label=""):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if shape == "barrier":
        # 路障条纹
        draw.rounded_rectangle([0, 0, w-1, h-1], radius=5, fill=color, outline=(255,200,0,255))
        for i in range(0, w, 12):
            draw.polygon([(i,0),(i+8,0),(i+4,h)], fill=(255,255,255,150))
    elif shape == "cone":
        # 锥形路障
        pts = [(w/2, 0), (w-2, h-4), (2, h-4)]
        draw.polygon(pts, fill=(255, 140, 0, 255), outline=(255, 255, 255, 200))
        draw.rectangle([4, h-8, w-4, h-2], fill=(200, 200, 200, 255))
    elif shape == "rock":
        # 石头
        pts = [(w*0.1, h*0.6), (w*0.35, h*0.1), (w*0.7, h*0.15), (w*0.9, h*0.55), (w*0.6, h*0.9), (w*0.2, h*0.85)]
        draw.polygon(pts, fill=color, outline=(120, 100, 80, 255))
    if label:
        try:
            font = ImageFont.truetype("arial.ttf", int(h*0.3))
        except:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0,0), label, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        draw.text((w/2-tw/2, h/2-th/2), label, fill=(255,255,255,255), font=font)
    save(img, path)

draw_obstacle(os.path.join(BASE, 'assets', 'vehicles', 'obstacle', 'obstacle_barrier.png'), (60, 60), (180, 50, 50), "barrier", "障")
draw_obstacle(os.path.join(BASE, 'assets', 'vehicles', 'obstacle', 'obstacle_cone.png'), (40, 50), (200, 120, 0), "cone")
draw_obstacle(os.path.join(BASE, 'assets', 'vehicles', 'obstacle', 'obstacle_rock.png'), (70, 70), (121, 85, 72), "rock", "石")


# ==================== UI Icons (missing ones) ====
print("=== 生成缺失的UI图标 ===")

def draw_icon(path, size, icon_type, color):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w//2, h//2
    r = min(w,h)//2 - 4

    if icon_type == "hp":  # 心形/血量
        # 心形
        scale = r * 0.04
        points = []
        for t_deg in range(0, 360, 5):
            t = math.radians(t_deg)
            x = 16 * math.sin(t)**3
            y = -(13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t))
            points.append((cx + x*scale, cy + y*scale))
        if len(points) > 2:
            draw.polygon(points, fill=color, outline=(255,255,255,200))
    elif icon_type == "shield":  # 盾牌
        shield_pts = [
            (cx, cy-r), (cx+r, cy-r*0.5), (cx+r, cy),
            (cx, cy+r), (cx-r, cy), (cx-r, cy-r*0.5)
        ]
        draw.polygon(shield_pts, fill=color, outline=(255,255,255,200))
        draw.line([(cx, cy-r*0.5), (cx, cy+r*0.3)], fill=(255,255,255,200), width=2)
    elif icon_type == "speed":  # 闪电
        pts = [
            (cx+r*0.3, cy-r), (cx-r*0.2, cy+r*0.1),
            (cx+r*0.1, cy+r*0.1), (cx-r*0.3, cy+r),
            (cx+r*0.2, cy-r*0.1), (cx-r*0.1, cy-r*0.1)
        ]
        draw.polygon(pts, fill=color, outline=(255,255,255,180))
    elif icon_type == "star":  # 星星
        star_pts = []
        for i in range(5):
            outer_angle = -math.pi/2 + i * 2*math.pi/5
            inner_angle = -math.pi/2 + (i + 0.5) * 2*math.pi/5
            star_pts.append((cx + math.cos(outer_angle)*r, cy + math.sin(outer_angle)*r))
            star_pts.append((cx + math.cos(inner_angle)*r*0.45, cy + math.sin(inner_angle)*r*0.45))
        draw.polygon(star_pts, fill=color, outline=(255,255,255,200))
    else:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color, outline=(255,255,255,200))

    save(img, path)

draw_icon(os.path.join(BASE, 'assets', 'ui', 'icons', 'icon_hp.png'), (40, 40), "hp", (244, 67, 54, 255))
draw_icon(os.path.join(BASE, 'assets', 'ui', 'icons', 'icon_shield.png'), (40, 40), "shield", (33, 150, 243, 255))
draw_icon(os.path.join(BASE, 'assets', 'ui', 'icons', 'icon_speed.png'), (40, 40), "speed", (76, 175, 80, 255))
draw_icon(os.path.join(BASE, 'assets', 'ui', 'icons', 'icon_star.png'), (40, 40), "star", (255, 193, 7, 255))


# ==================== Missing Buttons ====
print("=== 生成缺失的按钮 ===")

def draw_button(path, size, text, bg_color, border_color, text_color=(255,255,255)):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 圆角矩形背景
    rr = min(w,h) // 6
    draw.rounded_rectangle([0, 0, w-1, h-1], radius=rr, fill=bg_color, outline=border_color, width=2)
    # 内部高光
    draw.rounded_rectangle([4, 4, w-5, h*0.4], radius=rr-2, fill=tuple(min(c+30, 255) for c in bg_color[:3])+(60,))
    try:
        font = ImageFont.truetype("arial.ttf", int(h*0.38))
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0,0), text, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.text((w/2-tw/2, h/2-th/2-2), text, fill=text_color, font=font)
    save(img, path)

draw_button(os.path.join(BASE, 'assets', 'ui', 'buttons', 'btn_claim.png'), (240, 70), "CLAIM", (76, 175, 80, 230), (129, 199, 132, 255))
draw_button(os.path.join(BASE, 'assets', 'ui', 'buttons', 'btn_retry.png'), (200, 60), "RETRY", (33, 150, 243, 230), (100, 181, 246, 255))
draw_button(os.path.join(BASE, 'assets', 'ui', 'buttons', 'btn_home.png'), (200, 60), "HOME", (158, 158, 158, 230), (200, 200, 200, 255))


# ==================== favicon.ico ====
print("=== 生成favicon ===")
try:
    fav_img = Image.new('RGB', (32, 32), (124, 77, 255))
    fav_draw = ImageDraw.Draw(fav_img)
    fav_draw.text((4, 4), "🏎", fill=(255,255,255))
    fav_img.save(os.path.join(BASE, 'favicon.ico'), format='ICO')
    print(f"  [OK] favicon.ico")
except Exception as e:
    print(f"  [WARN] favicon skipped: {e}")


print("\n========== 全部完成! ==========")
print(f"总共生成的资源文件已保存到 {os.path.join(BASE, 'assets')}")
print("\n现在请刷新浏览器查看效果！")
