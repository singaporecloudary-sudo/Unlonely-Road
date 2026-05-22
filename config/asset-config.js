/**
 * ============================================
 *  合成飞车射击 - 美术资源占位符配置
 *  【素材替换指南】替换对应路径的图片即可
 *  支持格式: PNG / JPG / WebP (推荐透明背景PNG)
 *  替换时保持文件名一致，游戏逻辑自动适配
 * ============================================
 */

const AssetConfig = {
  // ==================== 载具类素材 ====================
  vehicles: {
    // 己方飞车: 1-52级，每级一个占位符
    // 替换路径: assets/vehicles/player/car_lv{N}.png (N=1~52)
    // 推荐尺寸: 80x120px, 透明背景
    player: {
      path: "assets/vehicles/player/",
      naming: "car_lv{level}.png",  // {level}会被替换为等级数字
      size: { width: 80, height: 120 },
      placeholder: {
        type: "colored_rect",
        colors: [
          // 1-10级: 绿色系
          "#4CAF50","#66BB6A","#81C784","#A5D6A7","#C8E6C9",
          "#2E7D32","#388E3C","#43A047","#4CAF50","#66BB6A",
          // 11-20级: 蓝色系
          "#2196F3","#42A5F5","#64B5F6","#90CAF9","#BBDEFB",
          "#1565C0","#1976D2","#1E88E5","#2196F3","#42A5F5",
          // 21-30级: 紫色系
          "#9C27B0","#AB47BC","#BA68C8","#CE93D8","#E1BEE7",
          "#6A1B9A","#7B1FA2","#8E24AA","#9C27B0","#AB47BC",
          // 31-40级: 橙色系
          "#FF9800","#FFA726","#FFB74D","#FFCC80","#FFE0B2",
          "#E65100","#EF6C00","#F57C00","#FF9800","#FFA726",
          // 41-50级: 红色系
          "#F44336","#EF5350","#E57373","#EF9A9A","#FFCDD2",
          "#C62828","#D32F2F","#E53935","#F44336","#EF5350",
          // 51-52级: 金色
          "#FFD700","#FFC107"
        ],
        label: "LV{level}",
        labelColor: "#FFFFFF",
      },
    },

    // 敌方车辆: 按类型分
    // 替换路径: assets/vehicles/enemy/
    enemy: {
      path: "assets/vehicles/enemy/",
      types: {
        normal: { file: "enemy_normal.png", size: { width: 70, height: 100 } },
        fast:   { file: "enemy_fast.png",   size: { width: 60, height: 90 } },
        tank:   { file: "enemy_tank.png",   size: { width: 90, height: 130 } },
        boss:   { file: "enemy_boss.png",   size: { width: 120, height: 160 } },
      },
      placeholder: {
        type: "colored_rect",
        color: "#E53935",
        label: "敌",
        labelColor: "#FFFFFF",
      },
    },

    // 障碍物（6种）
    // 替换路径: assets/vehicles/obstacle/
    obstacle: {
      path: "assets/vehicles/obstacle/",
      types: {
        barrier:        { file: "obstacle_barrier.png",        size: { width: 70, height: 80 } },
        cone:           { file: "obstacle_cone.png",           size: { width: 45, height: 55 } },
        spike:          { file: "obstacle_spike.png",          size: { width: 100, height: 40 } },
        gate:           { file: "obstacle_gate.png",           size: { width: 140, height: 55 } },
        debris:         { file: "obstacle_debris.png",         size: { width: 85, height: 75 } },
        heavy_barrier:  { file: "obstacle_heavy_barrier.png",  size: { width: 95, height: 65 } },
      },
      placeholder: {
        type: "colored_rect",
        color: "#795548",
        label: "障",
        labelColor: "#FFFFFF",
      },
    },
  },

  // ==================== 战斗场景战车素材库（独立于合成场景车辆） ====================
  // 加载优先级：1.编辑器自定义(localStorage) 2.俯视角战车精灵文件(battlePath) 3.占位符
  // 通过编辑器素材页 → 战车分类 → 上传替换
  battleCars: {
    path: "assets/vehicles/player/",
    naming: "car_lv{level}.png",
    defaultLevel: 1,
    size: { width: 80, height: 120 },
    // 战车俯视角精灵图路径（批量生成）
    battlePath: "assets/vehicles/battle/battle_car_lv{level}.png",
    placeholder: {
      type: "colored_rect",
      color: "#FFD700",
      label: "LV{level}",
      labelColor: "#FFFFFF",
    },
  },

  // ==================== UI类素材 ====================
  ui: {
    // 按钮图标
    // 替换路径: assets/ui/buttons/
    buttons: {
      path: "assets/ui/buttons/",
      items: {
        auto_craft:  { file: "btn_auto_craft.png",  size: { width: 200, height: 60 } },
        stage:       { file: "btn_stage.png",       size: { width: 200, height: 60 } },
        race:        { file: "btn_race.png",        size: { width: 200, height: 60 } },
        buy_car:     { file: "btn_buy_car.png",     size: { width: 320, height: 88 } },
        shop:        { file: "btn_shop.png",        size: { width: 160, height: 88 } },
        settings:    { file: "btn_settings.png",    size: { width: 80, height: 80 } },
        lucky:       { file: "btn_lucky.png",       size: { width: 80, height: 80 } },
        vip:         { file: "btn_vip.png",         size: { width: 80, height: 80 } },
        drone:       { file: "btn_drone.png",       size: { width: 160, height: 88 } },
        change_car:  { file: "btn_change_car.png",  size: { width: 200, height: 60 } },
        claim:       { file: "btn_claim.png",       size: { width: 240, height: 70 } },
        retry:       { file: "btn_retry.png",       size: { width: 200, height: 60 } },
        home:        { file: "btn_home.png",        size: { width: 200, height: 60 } },
      },
      placeholder: {
        type: "rounded_rect",
        color: "#37474F",
        cornerRadius: 8,
      },
    },

    // 图标
    // 替换路径: assets/ui/icons/
    icons: {
      path: "assets/ui/icons/",
      items: {
        coin:    { file: "icon_coin.png",    size: { width: 40, height: 40 } },
        gem:     { file: "icon_gem.png",     size: { width: 40, height: 40 } },
        hp:      { file: "icon_hp.png",      size: { width: 40, height: 40 } },
        shield:  { file: "icon_shield.png",  size: { width: 40, height: 40 } },
        fire:    { file: "icon_fire.png",    size: { width: 40, height: 40 } },
        speed:   { file: "icon_speed.png",   size: { width: 40, height: 40 } },
        star:    { file: "icon_star.png",    size: { width: 40, height: 40 } },
        drone:   { file: "icon_drone.png",   size: { width: 40, height: 40 } },
        shop:    { file: "icon_shop.png",    size: { width: 40, height: 40 } },
      },
      placeholder: {
        type: "circle",
        color: "#FFC107",
      },
    },

    // 进度条/血条
    // 替换路径: assets/ui/bars/
    bars: {
      path: "assets/ui/bars/",
      items: {
        hp_bar:       { file: "bar_hp.png",       size: { width: 300, height: 30 } },
        progress_bar: { file: "bar_progress.png", size: { width: 400, height: 20 } },
        exp_bar:      { file: "bar_exp.png",      size: { width: 300, height: 20 } },
        top_panel:    { file: "bar_top_panel.png", size: { width: 200, height: 42 } },
      },
      placeholder: {
        type: "bar",
        bgColor: "#424242",
        fgColor: "#4CAF50",
        borderColor: "#212121",
      },
    },

    // 槽位底座（每个合成槽位的固定底座，有车无车都显示）
    slotPlatform: {
      path: "assets/ui/screens/",
      file: "slot_platform.png",
      size: { width: 200, height: 180 },
      placeholder: {
        type: "rounded_rect",
        color: "rgba(60,40,120,0.5)",
        cornerRadius: 12,
        strokeColor: "rgba(0,200,255,0.3)",
      },
    },

    // 中央展示区车辆底座（大车下方）
    carDisplayPlatform: {
      path: "assets/ui/screens/",
      file: "car_display_platform.png",
      size: { width: 400, height: 140 },
      placeholder: {
        type: "rounded_rect",
        color: "rgba(40,30,100,0.6)",
        cornerRadius: 20,
        strokeColor: "rgba(0,200,255,0.4)",
      },
    },

    // 中央展示区粒子光环装饰（车辆下方椭圆光环）
    particleRing: {
      path: "assets/ui/",
      file: "particle_ring.png",
      size: { width: 500, height: 150 },
      placeholder: { type: "none" },
    },
  },

  // ==================== 场景类素材 ====================
  scenes: {
    // 局外主界面背景
    // 替换路径: assets/scenes/main_bg/
    mainBg: {
      path: "assets/scenes/main_bg/",
      file: "main_bg.png",
      size: { width: 720, height: 1280 },
      placeholder: {
        type: "gradient",
        colors: ["#1a1a2e", "#16213e", "#0f3460"],
        direction: "vertical",
      },
    },

    // 局内赛道背景
    // 替换路径: assets/scenes/track_bg/
    trackBg: {
      path: "assets/scenes/track_bg/",
      file: "track_bg.png",
      size: { width: 720, height: 1280 },
      // 赛道背景需要可滚动, 建议提供可无缝拼接的素材
      tileMode: true,
      placeholder: {
        type: "track",
        roadColor: "#37474F",
        lineColor: "#FFEB3B",
        grassColor: "#2E7D32",
        laneCount: 3,
      },
    },
  },

  // ==================== 特效类素材 ====================
  effects: {
    // 炮弹特效
    // 替换路径: assets/effects/bullets/
    bullets: {
      path: "assets/effects/bullets/",
      items: {
        normal:  { file: "bullet_normal.png",  frames: 1, size: { width: 16, height: 24 } },
        power:   { file: "bullet_power.png",   frames: 1, size: { width: 24, height: 32 } },
        drone:   { file: "bullet_drone.png",   frames: 1, size: { width: 12, height: 18 } },
      },
      placeholder: {
        type: "bullet",
        color: "#FFEB3B",
      },
    },

    // 爆炸/撞击特效
    // 替换路径: assets/effects/explosions/
    explosions: {
      path: "assets/effects/explosions/",
      items: {
        small:  { file: "explosion_small.png",  frames: 8, size: { width: 60, height: 60 } },
        medium: { file: "explosion_medium.png", frames: 12, size: { width: 100, height: 100 } },
        large:  { file: "explosion_large.png",  frames: 16, size: { width: 150, height: 150 } },
      },
      placeholder: {
        type: "particle",
        colors: ["#FF5722", "#FF9800", "#FFEB3B", "#FFFFFF"],
      },
    },

    // 合成升级特效
    // 替换路径: assets/effects/craft/
    craft: {
      path: "assets/effects/craft/",
      items: {
        merge:  { file: "fx_merge.png",  frames: 10, size: { width: 120, height: 120 } },
        levelup:{ file: "fx_levelup.png", frames: 15, size: { width: 200, height: 200 } },
      },
      placeholder: {
        type: "particle",
        colors: ["#7C4DFF", "#B388FF", "#E1BEE7", "#FFFFFF"],
      },
    },

    // BUFF特效
    // 替换路径: assets/effects/buff/
    buff: {
      path: "assets/effects/buff/",
      items: {
        fireboost: { file: "fx_fireboost.png", frames: 8, size: { width: 80, height: 80 } },
        shield:    { file: "fx_shield.png",    frames: 8, size: { width: 120, height: 120 } },
        speed:     { file: "fx_speed.png",     frames: 6, size: { width: 80, height: 80 } },
        heal:      { file: "fx_heal.png",      frames: 8, size: { width: 80, height: 80 } },
      },
      placeholder: {
        type: "particle",
        colors: ["#00E676", "#69F0AE", "#B9F6CA", "#FFFFFF"],
      },
    },
  },

  // ==================== 文字类样式占位 ====================
  fonts: {
    path: "assets/fonts/",
    styles: {
      title:     { family: "Arial", size: 36, weight: "bold", color: "#FFFFFF", stroke: "#000000", strokeWidth: 3 },
      subtitle:  { family: "Arial", size: 24, weight: "bold", color: "#FFFFFF", stroke: "#000000", strokeWidth: 2 },
      body:      { family: "Arial", size: 18, weight: "normal", color: "#E0E0E0" },
      number:    { family: "Arial", size: 28, weight: "bold", color: "#FFD700" },
      damage:    { family: "Arial", size: 22, weight: "bold", color: "#FF5252", stroke: "#000000", strokeWidth: 2 },
      buff:      { family: "Arial", size: 20, weight: "bold", color: "#69F0AE", stroke: "#000000", strokeWidth: 2 },
      button:    { family: "Arial", size: 20, weight: "bold", color: "#FFFFFF" },
    },
  },

  // ==================== 图片加载器 ====================
  _cacheBust: Date.now(),
  // 预加载所有图片素材，加载成功自动替换占位符
  // 替换方式：将PNG文件放入对应目录，文件名保持一致即可

  _loadedImages: {},

  /**
   * 运行时检查并注入自定义素材（localStorage中的base64图片）
   * 在每个渲染方法(getImage)中调用，确保自定义素材始终优先
   * @param {string} path - 素材文件路径
   * @returns {Image|null} - 图片对象或null
   */
  _getCustomOrLoaded: function(path) {
    var cached = this._loadedImages[path];
    // 1. 已有缓存且加载完成 → 直接返回
    if (cached && (cached.complete || cached.naturalWidth > 0)) {
      return cached;
    }

    // 2. 检查 localStorage 是否有自定义素材
    try {
      var ak = this._pathToAssetKey(path);
      if (ak) {
        var data = localStorage.getItem('merge_racer_asset_' + ak);
        if (data) {
          // 如果已有缓存但未加载完成（正在加载中），返回null等下一帧
          if (cached && !cached.complete) {
            return null;
          }
          // 创建新 Image 并缓存
          var img = new Image();
          var self = this;
          var capturedPath = path;  // 闭包捕获
          img.onload = function() {
            // 加载完成后更新缓存引用（确保同一对象）
            self._loadedImages[capturedPath] = img;
            console.log('[AssetConfig] custom loaded: ' + capturedPath + ' ' + img.naturalWidth + 'x' + img.naturalHeight);
          };
          img.src = data;
          this._loadedImages[path] = img;
          // base64 小图可能同步完成
          if (img.complete && img.naturalWidth > 0) return img;
          return null;  // 未加载完，下一帧就有
        }
      }
    } catch(e) {
      console.error('[AssetConfig] _getCustomOrLoaded error:', e);
    }
    return cached || null;
  },

  /** 路径 → asset key 映射（动态生成，不再硬编码） */
  _pathToAssetKey: function(path) {
    // 优先查缓存
    if (!this._pathKeyMap) {
      this._pathKeyMap = {};
      // 从 ui.buttons.items 生成
      if (this.ui && this.ui.buttons && this.ui.buttons.items) {
        var bPath = this.ui.buttons.path;
        for (var k in this.ui.buttons.items) {
          this._pathKeyMap[bPath + this.ui.buttons.items[k].file] = k;
        }
      }
      // 从 ui.icons.items 生成
      if (this.ui && this.ui.icons && this.ui.icons.items) {
        var iPath = this.ui.icons.path;
        for (var k2 in this.ui.icons.items) {
          this._pathKeyMap[iPath + this.ui.icons.items[k2].file] = k2;
        }
      }
      // 从 ui.bars.items 生成
      if (this.ui && this.ui.bars && this.ui.bars.items) {
        var barPath = this.ui.bars.path;
        for (var k3 in this.ui.bars.items) {
          this._pathKeyMap[barPath + this.ui.bars.items[k3].file] = k3;
        }
      }
      // 槽位底座
      if (this.slotPlatform) {
        this._pathKeyMap[this.slotPlatform.path + this.slotPlatform.file] = 'slot_platform';
      }
      // 中央展示区车辆底座
      if (this.ui.carDisplayPlatform) {
        this._pathKeyMap[this.ui.carDisplayPlatform.path + this.ui.carDisplayPlatform.file] = 'car_display_platform';
      }
      // 中央展示区粒子光环
      if (this.ui.particleRing) {
        this._pathKeyMap[this.ui.particleRing.path + this.ui.particleRing.file] = 'particle_ring';
      }
      // 场景背景
      if (this.scenes) {
        if (this.scenes.mainBg) this._pathKeyMap[this.scenes.mainBg.path + this.scenes.mainBg.file] = 'main_bg';
        if (this.scenes.trackBg) this._pathKeyMap[this.scenes.trackBg.path + this.scenes.trackBg.file] = 'track_bg';
      }
      // 注意：战车(battleCars)使用独立的renderBattleCar方法直接查localStorage
      // 不在此处映射路径，避免与制造场景renderVehicle共用同一路径导致互相干扰
    }
    return this._pathKeyMap[path] || null;
  },

  /** 预加载所有素材（游戏启动时调用一次） */
  preloadAll: function(onProgress) {
    var self = this;
    var tasks = [];
    var loaded = 0;
    var total = 0;

    // 收集所有需要加载的图片路径
    function addTask(path) {
      total++;
      tasks.push(path);
    }

    // 1-52级己方飞车
    for (var lv = 1; lv <= 52; lv++) {
      var filename = this.vehicles.player.naming.replace("{level}", lv);
      addTask(this.vehicles.player.path + filename);
    }

    // 敌方车辆
    var enemyTypes = this.vehicles.enemy.types;
    for (var key in enemyTypes) {
      addTask(this.vehicles.enemy.path + enemyTypes[key].file);
    }

    // 障碍物
    var obsTypes = this.vehicles.obstacle.types;
    for (var key2 in obsTypes) {
      addTask(this.vehicles.obstacle.path + obsTypes[key2].file);
    }

    // UI按钮
    var btnItems = this.ui.buttons.items;
    for (var bk in btnItems) {
      addTask(this.ui.buttons.path + btnItems[bk].file);
    }

    // UI图标
    var iconItems = this.ui.icons.items;
    for (var ik in iconItems) {
      addTask(this.ui.icons.path + iconItems[ik].file);
    }

    // 进度条
    var barItems = this.ui.bars.items;
    for (var brk in barItems) {
      addTask(this.ui.bars.path + barItems[brk].file);
    }

    // 槽位底座
    if (this.ui.slotPlatform) {
      addTask(this.ui.slotPlatform.path + this.ui.slotPlatform.file);
    }

    // 中央展示区车辆底座
    if (this.ui.carDisplayPlatform) {
      addTask(this.ui.carDisplayPlatform.path + this.ui.carDisplayPlatform.file);
    }

    // 中央展示区粒子光环
    if (this.ui.particleRing) {
      addTask(this.ui.particleRing.path + this.ui.particleRing.file);
    }

    // 场景背景
    addTask(this.scenes.mainBg.path + this.scenes.mainBg.file);
    addTask(this.scenes.trackBg.path + this.scenes.trackBg.file);

    // 特效
    var effectGroups = [this.effects.bullets, this.effects.explosions, this.effects.craft, this.effects.buff];
    for (var gi = 0; gi < effectGroups.length; gi++) {
      var items = effectGroups[gi].items;
      for (var ei in items) {
        addTask(effectGroups[gi].path + items[ei].file);
      }
    }

    if (total === 0) {
      if (onProgress) onProgress(1);
      return;
    }

    // 逐个加载
    for (var ti = 0; ti < tasks.length; ti++) {
      (function(taskPath) {
        var img = new Image();
        img.onload = function() {
          self._loadedImages[taskPath] = img;
          loaded++;
          if (onProgress) onProgress(loaded / total);
        };
        img.onerror = function() {
          // 图片不存在 → 使用占位符，不算错误
          loaded++;
          if (onProgress) onProgress(loaded / total);
        };
        img.src = taskPath + '?v=' + self._cacheBust;
      })(tasks[ti]);
    }
  },

  /** 检查图片是否已加载 */
  hasImage: function(path) {
    return !!this._getCustomOrLoaded(path);
  },

  /** 获取已加载的图片对象 */
  getImage: function(path) {
    return this._getCustomOrLoaded(path);
  },

  /** 等比缩放绘制图片（保持宽高比，居中显示，精确fit不裁切） */
  _drawImageFit: function(ctx, img, x, y, width, height) {
    if (!img) return;
    var iw = img.naturalWidth || img.width || width;
    var ih = img.naturalHeight || img.height || height;
    // 等比缩放fit（完全包含在区域内，不裁切）
    var scale = Math.min(width / iw, height / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    // 居中
    var dx = x + (width - dw) / 2;
    var dy = y + (height - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  },

  /** 绘制车辆（优先用图片，没有则用占位符） */
  renderVehicle: function(ctx, level, x, y, width, height) {
    var filename = this.vehicles.player.naming.replace("{level}", level);
    var path = this.vehicles.player.path + filename;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      this._drawImageFit(ctx, img, x, y, width, height);
      return true;
    }
    // 回退到占位符
    this.renderPlaceholder.call(this, ctx, 'colored_rect', x, y, width, height,
      this.vehicles.player.placeholder, { level: level });
    return false;
  },

  /** 绘制战斗场景战车（独立资源库，优先级：自定义素材 > 战斗精灵文件 > 占位符） */
  renderBattleCar: function(ctx, level, x, y, width, height) {
    // 1. 先查localStorage自定义素材（key: battle_car_lv{N}）
    var customKey = 'battle_car_lv' + level;
    var customData = null;
    try { customData = localStorage.getItem('merge_racer_asset_' + customKey); } catch(e) {}
    // 校验 base64 数据有效性：必须以 data:image 开头且长度 > 100
    var validCustom = customData && typeof customData === 'string'
      && customData.indexOf('data:image') === 0 && customData.length > 100;
    if (validCustom) {
      var customImg = this._loadedImages['battle_car_custom_' + level];
      if (!customImg) {
        customImg = new Image();
        var self = this;
        var capturedLevel = level;
        customImg.onload = function() { self._loadedImages['battle_car_custom_' + capturedLevel] = customImg; };
        customImg.onerror = function() {
          // 加载失败 → 标记损坏，清缓存，下次走实体文件
          self._loadedImages['battle_car_custom_' + capturedLevel + '_broken'] = true;
          try { delete self._loadedImages['battle_car_custom_' + capturedLevel]; } catch(e){}
        };
        customImg.src = customData;
        this._loadedImages['battle_car_custom_' + level] = customImg;
      }
      // 必须 naturalWidth > 0 才算真正可用（complete=true 包含加载失败的空图）
      var isBroken = this._loadedImages['battle_car_custom_' + level + '_broken'];
      if (!isBroken && customImg && customImg.naturalWidth > 0) {
        this._drawImageFit(ctx, customImg, x, y, width, height);
        return true;
      }
    }

    // 2. 尝试加载战斗精灵文件（assets/vehicles/battle/battle_car_lv{N}.png）
    var battleFilePath = this.battleCars.battlePath.replace('{level}', level);
    var battleFileImg = this._getCustomOrLoaded(battleFilePath);
    if (battleFileImg && battleFileImg.naturalWidth > 0) {
      this._drawImageFit(ctx, battleFileImg, x, y, width, height);
      return true;
    }

    // 3. 无任何素材 → 占位符
    this.renderPlaceholder.call(this, ctx, 'colored_rect', x, y, width, height,
      this.battleCars.placeholder, { level: level });
    return false;
  },

  /** 绘制敌方车辆 */
  renderEnemy: function(ctx, type, x, y, width, height) {
    var cfg = this.vehicles.enemy.types[type];
    if (!cfg) return;
    var path = this.vehicles.enemy.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      this._drawImageFit(ctx, img, x, y, width, height);
      return;
    }
    this.renderPlaceholder.call(this, ctx, 'colored_rect', x, y, width, height,
      this.vehicles.enemy.placeholder, {});
  },

  /** 绘制场景背景 */
  renderSceneBg: function(ctx, sceneKey, x, y, width, height) {
    var sceneCfg = this.scenes[sceneKey];
    if (!sceneCfg) return;
    var path = sceneCfg.path + sceneCfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      if (sceneCfg.tileMode) {
        // 可平铺模式
        var pat = ctx.createPattern(img, 'repeat');
        ctx.fillStyle = pat;
        ctx.fillRect(x, y, width, height);
      } else {
        // cover模式：等比缩放填满画布，顶部对齐（不变形）
        var iw = img.naturalWidth || img.width;
        var ih = img.naturalHeight || img.height;
        if (iw > 0 && ih > 0) {
          var scale = Math.max(width / iw, height / ih);
          var dw = iw * scale;
          var dh = ih * scale;
          var dx = x + (width - dw) / 2;
          var dy = y; // 顶部对齐，不裁切顶部
          ctx.drawImage(img, dx, dy, dw, dh);
        } else {
          ctx.drawImage(img, x, y, width, height);
        }
      }
      return;
    }
    this.renderPlaceholder.call(this, ctx, sceneCfg.placeholder.type, x, y, width, height,
      sceneCfg.placeholder, {});
  },

  // ==================== UI元素真实图片渲染 ====================
  // 优先绘制PNG素材，找不到则返回false让调用方回退占位符

  /** 绘制UI按钮（拉伸填满，不等比缩放） */
  renderButton: function(ctx, btnKey, x, y, w, h) {
    var cfg = this.ui.buttons.items[btnKey];
    if (!cfg) return false;
    var path = this.ui.buttons.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      ctx.drawImage(img, x, y, w, h);
      return true;
    }
    return false;
  },

  /** 绘制UI图标（等比缩放fit） */
  renderIcon: function(ctx, iconKey, x, y, size) {
    var cfg = this.ui.icons.items[iconKey];
    if (!cfg) return false;
    var path = this.ui.icons.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      // 图标不放大1.1倍，精确fit
      var iw = img.naturalWidth || img.width;
      var ih = img.naturalHeight || img.height;
      var scale = Math.min(size / iw, size / ih);
      var dw = iw * scale;
      var dh = ih * scale;
      ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
      return true;
    }
    return false;
  },

  /** 绘制进度条/条形素材（拉伸填满） */
  renderBar: function(ctx, barKey, x, y, w, h) {
    var cfg = this.ui.bars.items[barKey];
    if (!cfg) return false;
    var path = this.ui.bars.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      ctx.drawImage(img, x, y, w, h);
      return true;
    }
    return false;
  },

  /** 绘制槽位底座（等比缩放fit，居中，有车无车都显示） */
  renderSlotPlatform: function(ctx, x, y, w, h) {
    var cfg = this.ui.slotPlatform;
    if (!cfg) return false;
    var path = cfg.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      this._drawImageFit(ctx, img, x, y, w, h);
      return true;
    }
    // 占位符回退
    this.renderPlaceholder.call(this, ctx, 'rounded_rect', x, y, w, h,
      cfg.placeholder || { color: 'rgba(60,40,120,0.5)', cornerRadius: 12 }, {});
    return false;
  },

  /** 绘制中央展示区车辆底座（等比缩放fit） */
  renderCarDisplayPlatform: function(ctx, x, y, w, h) {
    var cfg = this.ui.carDisplayPlatform;
    if (!cfg) return false;
    var path = cfg.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      this._drawImageFit(ctx, img, x, y, w, h);
      return true;
    }
    this.renderPlaceholder.call(this, ctx, 'rounded_rect', x, y, w, h,
      cfg.placeholder || { color: 'rgba(30,20,80,0.4)', cornerRadius: 20 }, {});
    return false;
  },

  /** 绘制中央展示区粒子光环装饰（等比缩放fit） */
  renderParticleRing: function(ctx, x, y, w, h) {
    var cfg = this.ui.particleRing;
    if (!cfg) return false;
    var path = cfg.path + cfg.file;
    var img = this._getCustomOrLoaded(path);
    if (img && (img.complete || img.naturalWidth > 0)) {
      this._drawImageFit(ctx, img, x, y, w, h);
      return true;
    }
    return false;
  },

  // ==================== 占位符渲染引擎 ====================
  // 根据配置自动生成占位符图形(运行时Canvas绘制)
  // 使用 _drawRoundRect 替代 roundRect 确保兼容性

  /** 兼容性圆角矩形绘制 */
  _drawRoundRect: function(ctx, x, y, w, h, r) {
    if (typeof r !== 'number' || r <= 0) { ctx.rect(x, y, w, h); return; }
    r = Math.min(r, Math.min(w, h) / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  renderPlaceholder: function(ctx, type, x, y, width, height, config, extraData) {
    if (!extraData) extraData = {};
    ctx.save();
    var self = this;
    switch (type) {
      case "colored_rect": {
        var colors = config.colors;
        var color = "#4CAF50";
        if (colors) {
          color = colors[(extraData.level || 1) - 1] || config.color || "#4CAF50";
        } else if (config.color) {
          color = config.color;
        }
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        if (config.label) {
          var label = config.label.replace("{level}", extraData.level || "?");
          ctx.fillStyle = config.labelColor || "#FFF";
          var fontSize = Math.floor(Math.min(width, height) * 0.3);
          ctx.font = "bold " + fontSize + "px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, x + width / 2, y + height / 2);
        }
        break;
      }
      case "rounded_rect": {
        var cr = config.cornerRadius || 8;
        ctx.fillStyle = config.color || "#37474F";
        ctx.beginPath();
        self._drawRoundRect(ctx, x, y, width, height, cr);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        self._drawRoundRect(ctx, x, y, width, height, cr);
        ctx.stroke();
        break;
      }
      case "circle": {
        ctx.fillStyle = config.color || "#FFC107";
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "bar": {
        var ratio = (extraData.ratio !== undefined) ? extraData.ratio : 0.5;
        ctx.fillStyle = config.bgColor || "#424242";
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = config.fgColor || "#4CAF50";
        ctx.fillRect(x, y, width * ratio, height);
        ctx.strokeStyle = config.borderColor || "#212121";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        break;
      }
      case "gradient": {
        var grdColors = config.colors || ["#1a1a2e"];
        var grd = ctx.createLinearGradient(x, y, x, y + height);
        for (var gi = 0; gi < grdColors.length; gi++) {
          grd.addColorStop(gi / Math.max(grdColors.length - 1, 1), grdColors[gi]);
        }
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, width, height);
        break;
      }
      case "track": {
        var roadW = width * 0.7;
        var roadX = (width - roadW) / 2;
        var laneW = roadW / (config.laneCount || 3);
        // 草地
        ctx.fillStyle = config.grassColor || "#2E7D32";
        ctx.fillRect(x, y, width, height);
        // 路面
        ctx.fillStyle = config.roadColor || "#37474F";
        ctx.fillRect(x + roadX, y, roadW, height);
        // 车道线
        ctx.strokeStyle = config.lineColor || "#FFEB3B";
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        for (var li = 1; li < (config.laneCount || 3); li++) {
          ctx.beginPath();
          ctx.moveTo(x + roadX + laneW * li, y);
          ctx.lineTo(x + roadX + laneW * li, y + height);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        break;
      }
      case "bullet": {
        ctx.fillStyle = config.color || "#FFEB3B";
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "particle": {
        var pColors = config.colors || ["#FF5722"];
        var pcx = x + width / 2;
        var pcy = y + height / 2;
        var pr = Math.min(width, height) / 2;
        for (var pi = 0; pi < 6; pi++) {
          ctx.fillStyle = pColors[pi % pColors.length];
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(
            pcx + (Math.random() - 0.5) * pr,
            pcy + (Math.random() - 0.5) * pr,
            pr * 0.3 * Math.random(),
            0, Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
    }
    ctx.restore();
  },
};

// 导出
if (typeof window !== 'undefined') {
  window.AssetConfig = AssetConfig;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetConfig;
}
