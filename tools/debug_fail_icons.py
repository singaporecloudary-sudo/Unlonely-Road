"""可视化fail左侧图标列：每个图标独立保存"""
from PIL import Image
import numpy as np
import os

src_dir = r'C:/Users/liuyingjie.a/Desktop/游戏AI开发/UI界面/战斗UI'
out_dir = r'F:/游戏制作/合成飞车射击/assets/ui'
fail = Image.open(os.path.join(src_dir, '5c273eec42279c338b857875411dcc496ef292a77eb58aa5ec182f8d0fc9a9ef.png'))

# 三个图标按区段精确切（只裁第一行图标，不要其它行）
# 通过观察密度分布：
#   target: y=1350~1410 (主要)，1440~1490是细节装饰（属于同一图标）
#   road:   y=1530~1585
#   coin:   y=1635~1740（含3层金币堆）
# 但实际看到的"+13"等标签其实在不同行

# 严格只取单个图标的紧密区域
def crop(box, name):
    fail.crop(box).save(os.path.join(out_dir, f'_dbg_{name}.png'))
    print(f"  {name}: {box}")

# 看看每个区间的样子
crop((100, 1340, 200, 1410), 'target_only')   # 瞄准镜
crop((100, 1410, 200, 1500), 'road_only')     # 道路虚线
crop((100, 1500, 200, 1610), 'coin_only')     # 金币堆（之前误标road）
