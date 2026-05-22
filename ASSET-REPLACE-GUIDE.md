# 合成飞车射击 - 素材替换指南

## 目录结构

```
合成飞车射击/
├── assets/                          ← 所有美术素材存放目录
│   ├── vehicles/                    ← 载具类
│   │   ├── player/                  ← 己方飞车 (1-52级)
│   │   │   └── car_lv1.png ~ car_lv52.png   ← 替换这些文件
│   │   ├── enemy/                   ← 敌方车辆
│   │   │   ├── enemy_normal.png     ← 普通敌车
│   │   │   ├── enemy_fast.png       ← 快速敌车
│   │   │   ├── enemy_tank.png       ← 重型敌车
│   │   │   └── enemy_boss.png       ← BOSS敌车
│   │   └── obstacle/                ← 障碍物
│   │       ├── obstacle_barrier.png ← 路障
│   │       ├── obstacle_cone.png    ← 锥桶
│   │       └── obstacle_rock.png    ← 岩石
│   ├── ui/                          ← UI类
│   │   ├── buttons/                 ← 按钮图标
│   │   ├── icons/                   ← 功能图标(金币/钻石/血量等)
│   │   └── bars/                    ← 进度条/血条
│   ├── scenes/                      ← 场景类
│   │   ├── main_bg/                 ← 局外主界面背景
│   │   │   └── main_bg.png
│   │   └── track_bg/                ← 局内赛道背景
│   │       └── track_bg.png
│   ├── effects/                     ← 特效类
│   │   ├── bullets/                 ← 炮弹
│   │   ├── explosions/              ← 爆炸
│   │   ├── craft/                   ← 合成特效
│   │   └── buff/                    ← BUFF特效
│   └── fonts/                       ← 自定义字体
├── config/
│   ├── game-config.js               ← 【零代码】修改所有数值
│   └── asset-config.js              ← 素材配置(尺寸/路径/占位符)
├── src/
│   ├── core/                        ← 核心引擎(无需修改)
│   ├── modules/
│   │   ├── crafting/                ← 局外合成模块
│   │   └── battle/                  ← 局内射击模块
│   └── editor/                      ← 零代码编辑器
└── index.html                       ← 游戏入口
```

---

## 素材替换规则

### 1. 通用规则
- **格式**: PNG (推荐透明背景)、JPG、WebP
- **命名**: 保持文件名一致，游戏通过文件名加载
- **尺寸**: 推荐尺寸见 asset-config.js，实际尺寸不限，游戏会按配置比例缩放
- **替换后无需修改任何代码**

### 2. 载具类素材

#### 己方飞车 (52级)
- 路径: `assets/vehicles/player/car_lv{N}.png` (N=1~52)
- 推荐尺寸: 80×120px
- **必须提供52个文件** (未提供的等级会使用占位符)
- 示例: `car_lv1.png`, `car_lv2.png`, ..., `car_lv52.png`

#### 敌方车辆 (4类)
| 文件名 | 类型 | 推荐尺寸 |
|--------|------|----------|
| enemy_normal.png | 普通敌车 | 70×100px |
| enemy_fast.png | 快速敌车 | 60×90px |
| enemy_tank.png | 重型敌车 | 90×130px |
| enemy_boss.png | BOSS | 120×160px |

#### 障碍物 (3类)
| 文件名 | 类型 | 推荐尺寸 |
|--------|------|----------|
| obstacle_barrier.png | 路障 | 60×60px |
| obstacle_cone.png | 锥桶 | 40×50px |
| obstacle_rock.png | 岩石 | 70×70px |

### 3. UI类素材

#### 按钮图标
路径: `assets/ui/buttons/`
| 文件名 | 用途 | 推荐尺寸 |
|--------|------|----------|
| btn_auto_craft.png | 自动合成按钮 | 200×60px |
| btn_stage.png | 关卡入口 | 200×60px |
| btn_race.png | 挑战赛入口 | 200×60px |
| btn_shop.png | 商店按钮 | 80×80px |
| btn_settings.png | 设置按钮 | 80×80px |
| btn_lucky.png | 幸运转盘 | 80×80px |
| btn_vip.png | VIP按钮 | 80×80px |
| btn_drone.png | 无人机按钮 | 80×80px |
| btn_buy_car.png | 购买车辆 | 200×60px |
| btn_change_car.png | 换车按钮 | 200×60px |
| btn_claim.png | 领取奖励 | 240×70px |
| btn_retry.png | 重新挑战 | 200×60px |
| btn_home.png | 返回主界面 | 200×60px |

#### 功能图标
路径: `assets/ui/icons/`
| 文件名 | 用途 | 推荐尺寸 |
|--------|------|----------|
| icon_coin.png | 金币 | 40×40px |
| icon_gem.png | 钻石 | 40×40px |
| icon_hp.png | 血量 | 40×40px |
| icon_shield.png | 护盾 | 40×40px |
| icon_fire.png | 火力增强 | 40×40px |
| icon_speed.png | 加速 | 40×40px |
| icon_star.png | 星级 | 40×40px |

#### 进度条
路径: `assets/ui/bars/`
| 文件名 | 用途 | 推荐尺寸 |
|--------|------|----------|
| bar_hp.png | 血量条 | 300×30px |
| bar_progress.png | 进度条 | 400×20px |
| bar_exp.png | 经验条 | 300×20px |

### 4. 场景类素材

| 路径 | 用途 | 推荐尺寸 | 备注 |
|------|------|----------|------|
| scenes/main_bg/main_bg.png | 主界面背景 | 720×1280px | 全屏 |
| scenes/track_bg/track_bg.png | 赛道背景 | 720×1280px | 需可无缝垂直拼接 |

### 5. 特效类素材

#### 炮弹
路径: `assets/effects/bullets/`
| 文件名 | 用途 | 帧数 | 推荐尺寸 |
|--------|------|------|----------|
| bullet_normal.png | 普通炮弹 | 1 | 16×24px |
| bullet_power.png | 增强炮弹 | 1 | 24×32px |
| bullet_drone.png | 无人机弹 | 1 | 12×18px |

#### 爆炸
路径: `assets/effects/explosions/`
| 文件名 | 用途 | 帧数 | 推荐尺寸 |
|--------|------|------|----------|
| explosion_small.png | 小爆炸 | 8 | 60×60px |
| explosion_medium.png | 中爆炸 | 12 | 100×100px |
| explosion_large.png | 大爆炸 | 16 | 150×150px |

#### 合成特效
路径: `assets/effects/craft/`
| 文件名 | 用途 | 帧数 | 推荐尺寸 |
|--------|------|------|----------|
| fx_merge.png | 合并特效 | 10 | 120×120px |
| fx_levelup.png | 升级特效 | 15 | 200×200px |

#### BUFF特效
路径: `assets/effects/buff/`
| 文件名 | 用途 | 帧数 | 推荐尺寸 |
|--------|------|------|----------|
| fx_fireboost.png | 火力增强 | 8 | 80×80px |
| fx_shield.png | 护盾 | 8 | 120×120px |
| fx_speed.png | 加速 | 6 | 80×80px |
| fx_heal.png | 回血 | 8 | 80×80px |

---

## 零代码数值修改

编辑 `config/game-config.js` 即可修改所有游戏数值，无需修改代码：

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 槽位数量 | crafting.maxSlots | 默认12 |
| 最高等级 | crafting.maxLevel | 默认52 |
| 合成数量 | crafting.mergeRule | 默认2 |
| 收益公式 | crafting.incomeBase/Exponent | base × level^exp |
| 购买价格 | crafting.buyBasePrice/Multiplier | base × mult^次数 |
| 车辆属性 | crafting.vehicleStats.* | ATK/HP/弹幕 |
| 关卡数量 | stages.totalStages | 默认200 |
| 关卡距离 | stages.baseDistance + distancePerStage | 动态计算 |
| 敌方属性 | stages.enemy.* | HP/ATK/速度 |
| 射击间隔 | battle.shootInterval | 默认300ms |
| 子弹速度 | battle.bulletSpeed | 默认12 |
| BUFF参数 | battle.buffs.* | 倍率/持续时间/触发率 |

---

## 导出说明

### 网页版
```bash
python export/export.py web
```
输出: `build/web/` → 上传至任意静态服务器

### 安卓APK
```bash
python export/export.py android
```
输出: `build/android/` → 用Android Studio打开后Build APK

### 微信小游戏
```bash
python export/export.py wechat
```
输出: `build/wechat/` → 用微信开发者工具打开，需引入DOM适配层

### 全部导出
```bash
python export/export.py all
```

---

## 技术说明

1. **占位符系统**: 游戏运行时自动绘制彩色占位符，替换素材后自动切换为实际图片
2. **素材加载**: 当对应路径存在PNG文件时，自动加载替换占位符；不存在时使用占位符
3. **响应式**: 画布720×1280，自动缩放适配各种屏幕
4. **存档**: 使用localStorage自动存档，每30秒+关闭页面时
5. **编辑器**: 点击右下角⚙按钮打开零代码编辑器
