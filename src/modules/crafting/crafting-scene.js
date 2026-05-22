/**
 * 合成飞车射击 - 局外合成养成场景 (占位符UI版)
 * 所有UI元素用Canvas代码绘制(圆角矩形+文字)，不依赖背景图PNG
 * 用户可后续自行替换真实素材
 */

function CraftingScene() {
  this.engine = null;
  this.ctx = null;
  this.eventBus = null;
  this.autoCraftTimer = null;
  this.idleTimer = null;
  this.dragging = null;
  this.dragX = 0;
  this.dragY = 0;
  this.mergeHintSlots = [];
  this.notification = null;
  this.notificationTimer = 0;
  this._lastBuyTime = 0;
  this._selectedSlot = -1;
  this.assets = window.AssetConfig;
  this.state = window.gameState;
  // 合成动画状态
  this.mergeAnim = null;

  // 商店弹窗状态
  this._shopOpen = false;
  this._shopCloseBtn = null;
  this._shopItemBtns = [];
  this._shopBuyBtns = [];

  // 无人机详情弹窗状态
  this._droneOpen = false;
  this._droneCloseBtn = null;
  this._droneEquipBtn = null;
  this._droneEquipped = (window.gameState && window.gameState.get) ? !!window.gameState.get('droneEquipped') : false;
  this._droneBtns = [];
  this._droneImg = null; // SR-71无人机图片
  this._droneImgLoaded = false;

  // ========== 长按自动购买状态 ==========
  this._buyAutoMode = false;      // 是否处于自动购买
  this._buyAutoTimer = 0;         // 距下次购买的累计ms
  this._buyAutoInterval = 350;    // 每次购买间隔ms
  this._buyHoldStart = 0;         // 按下购车按钮的时间戳
  this._buyHoldThreshold = 500;   // 长按触发自动购买的时长ms
  this._buyHoldTriggered = false; // 长按已触发标记
  this._buyHoldPos = null;        // 按下时的位置（用于检测滑出）
  this._buyAnimTimer = 0;         // 购车动画计时器(剩余秒数, 0=无动画)
  this._buyAnimDuration = 0.5;    // 购车动画总时长(秒)
  this._buyCoinParticles = [];    // 购车时飞出的金币粒子
  this._buyBtnPressed = false;    // 购车按钮是否被按下（用于按下视觉反馈）
  this._buyClickFlashTimer = 0;   // 单次点击的短暂闪光（秒）

  // 立即预加载无人机图片
  var droneSelf = this;
  var droneImg = new Image();
  droneImg.onload = function() { droneSelf._droneImgLoaded = true; droneSelf._droneImg = droneImg; };
  droneImg.src = 'assets/vehicles/drone_sr71.png';

  // ========== 布局参数 (720x1280) 纯Canvas UI版 ==========
  this.layout = {
    // ===== 顶部信息栏 =====
    topBar:        { x: 0,   y: 0,   w: 720, h: 50 },
    coinDisplay:   { x: 15,  y: 6,  w: 140, h: 34 },   // 金币（顶行左侧）
    cpsDisplay:    { x: 200, y: 5,  w: 320, h: 38 },   // 大号每秒收益
    gemsDisplay:   { x: 560, y: 6,  w: 150, h: 34 },   // 钻石

    // ===== 左侧横排按钮（还原到大背景图原有的最上方设置按钮轮廓位置，确保一戳即开） =====
    rankBtn:       { x: 15,  y: 100, w: 56,  h: 56 },

    // ===== 右侧竖排按钮 =====
    luckyBtn:      { x: 649, y: 100, w: 56,  h: 56 },
    coinBtn:       { x: 649, y: 165, w: 56,  h: 56 },
    ultimateBtn:   { x: 649, y: 230, w: 56,  h: 56 },

    // ===== 中央车辆展示区 =====
    carDisplay:    { x: 100, y: 145, w: 520, h: 260 },

    // ===== 功能按钮行 (Auto / Stage / Race) — 等宽均匀分布 =====
    autoCraftBtn:  { x: 30,  y: 535, w: 200, h: 70 },
    stageBtn:      { x: 260, y: 535, w: 200, h: 70 },
    raceBtn:       { x: 490, y: 535, w: 200, h: 70 },

    // ===== 合成槽位网格 3行x4列（左右边距一致，紧凑排列） =====
    slotsStart:    { x: 30,  y: 625 },
    slotSize:      { w: 160, h: 155 },
    slotGap:       8,
    slotCols:      4,

    // ===== 底部按钮行 =====
    droneBtn:      { x: 10,  y: 1120, w: 160, h: 88 },
    buyBtn:        { x: 200, y: 1120, w: 320, h: 88 },
    shopBtn:       { x: 550, y: 1120, w: 160, h: 88 },
    buyPriceLabel: { x: 280, y: 1215, w: 160, h: 26 },
  };
}

// ========== 圆角矩形辅助方法 ==========
CraftingScene.prototype._drawRoundRectPath = function(ctx, x, y, w, h, r) {
  if (typeof r !== 'number' || r <= 0) r = 0;
  r = Math.min(r, Math.min(w, h) / 2);
  if (r === 0) {
    ctx.rect(x, y, w, h);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
};

CraftingScene.prototype._fillRoundRect = function(ctx, x, y, w, h, r) {
  ctx.beginPath();
  this._drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
};

CraftingScene.prototype._strokeRoundRect = function(ctx, x, y, w, h, r) {
  ctx.beginPath();
  this._drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
};

// ========== 颜色方案 (赛博朋克风格) ==========
CraftingScene.prototype._colors = {
  bgTop: '#0a0a1a',
  bgBottom: '#1a0a2e',
  panelBg: 'rgba(20,20,50,0.85)',
  panelBorder: 'rgba(0,229,255,0.25)',
  btnPrimary: 'rgba(0,80,180,0.7)',
  btnPrimaryHover: 'rgba(0,120,255,0.9)',
  btnSecondary: 'rgba(60,30,100,0.6)',
  btnAccent: 'rgba(180,60,0,0.65)',
  textWhite: '#E8E8F0',
  textDim: '#888899',
  accentCyan: '#00E5FF',
  accentGold: '#FFD700',
  accentGreen: '#4CAF50',
  accentRed: '#FF4444',
  slotEmpty: 'rgba(40,40,70,0.5)',
  slotFill: 'rgba(60,60,100,0.35)',
};

// ========== 生命周期 ==========
CraftingScene.prototype.onEnter = function() {
  var self = this;
  // 启动主界面BGM（轻松氛围calm模式）
  if (window.AudioManager) {
    window.AudioManager.playBgm('calm');
  }

  // 检查是否从战斗场景胜利返回并设置了延迟飞入金币动画
  if (this._pendingVictoryCoins) {
    this.triggerCoinsFlyIn(360, 640, 24); // 飞入 24 颗，代表通关大量金币
    this._pendingVictoryCoins = false;
  }

  // 加载关卡按钮切图（金色科技按钮）
  if (!this._stageBtnImg) {
    var img = new Image();
    img.src = 'assets/ui/home_v2/btn_stage_gold.png?v=1';
    this._stageBtnImg = img;
  }
  // 加载车下方粒子光环切图
  if (!this._particleRingImg) {
    var ringImg = new Image();
    ringImg.src = 'assets/ui/home_v2/particle_ring_v2.png?v=1';
    this._particleRingImg = ringImg;
  }

  // 挂机/离线收益结算：如果是从战斗场景返回，只悄悄 claim 收益，不弹出提示
  var fromBattle = (this.engine && this.engine.previousScene === 'battle');
  var idleCoins = self.state.calculateIdleCoins();
  if (idleCoins > 0) {
    self.state.claimIdleCoins();
    if (!fromBattle) {
      self.showNotification('挂机收益: +' + self._formatNumber(idleCoins) + ' 金币');
    }
  }
  self.idleTimer = setInterval(function() {
    var cps = self.state.getCoinsPerSecond();
    if (cps > 0) self.state.addCoins(cps / 10);
  }, 100);
  self.autoCraftTimer = setInterval(function() {
    if (self.state.get('autoCraft') && !self.mergeAnim) {
      var pair = self.state.findMergePair();
      if (pair) {
        self._startMergeAnim(pair.slots[0], pair.slots[1], pair.level);
      }
    }
  }, window.GameConfig && GameConfig.crafting ? (GameConfig.crafting.autoCraftInterval || 1000) : 1000);

  self.eventBus.off('touchStart');
  self.eventBus.off('touchMove');
  self.eventBus.off('touchEnd');
  self._boundTouchStart = function(pos) { self._onTouchStart(pos); };
  self._boundTouchMove = function(pos) { self._onTouchMove(pos); };
  self._boundTouchEnd = function(pos) { self._onTouchEnd(pos); };
  self.eventBus.on('touchStart', self._boundTouchStart);
  self.eventBus.on('touchMove', self._boundTouchMove);
  self.eventBus.on('touchEnd', self._boundTouchEnd);
};

CraftingScene.prototype.onExit = function() {
  clearInterval(this.idleTimer);
  clearInterval(this.autoCraftTimer);
  // 重置长按自动购买状态，避免切场景后残留
  this._buyAutoMode = false;
  this._buyAutoTimer = 0;
  this._buyHoldStart = 0;
  this._buyHoldTriggered = false;
  this._buyHoldPos = null;
  // 停止BGM
  if (window.AudioManager) {
    window.AudioManager.stopBgm();
  }
  if (this._boundTouchStart) this.eventBus.off('touchStart', this._boundTouchStart);
  if (this._boundTouchMove) this.eventBus.off('touchMove', this._boundTouchMove);
  if (this._boundTouchEnd) this.eventBus.off('touchEnd', this._boundTouchEnd);
  if (this.engine && this.engine.saveManager) {
    this.engine.saveManager.save(this.state.serialize());
  }
};

CraftingScene.prototype.update = function(dt) {
  if (this.notificationTimer > 0) {
    this.notificationTimer -= dt;
    if (this.notificationTimer <= 0) this.notification = null;
  }
  this._updateMergeHints();

  // ===== 长按检测：按住购车按钮超过阈值 → 进入自动购买 =====
  if (this._buyHoldStart > 0 && !this._buyHoldTriggered) {
    var heldMs = Date.now() - this._buyHoldStart;
    if (heldMs >= this._buyHoldThreshold) {
      this._buyHoldTriggered = true;
      this._buyAutoMode = true;
      this._buyAutoTimer = 0;
      this._buyCarOnce(); // 进入自动购买立即买一辆
      this.showNotification('开始自动购买（再按一次停止）');
    }
  }
  // ===== 自动购买推进：每 _buyAutoInterval ms 买一辆 =====
  if (this._buyAutoMode) {
    this._buyAutoTimer += dt * 1000;
    if (this._buyAutoTimer >= this._buyAutoInterval) {
      this._buyAutoTimer = 0;
      this._buyCarOnce();
    }
  }

  // ===== 购车动画推进 =====
  if (this._buyAnimTimer > 0) {
    this._buyAnimTimer -= dt;
    if (this._buyAnimTimer < 0) this._buyAnimTimer = 0;
  }
  // 顶栏金币缩放衰减
  if (this._coinScoreScale && this._coinScoreScale > 1) {
    this._coinScoreScale -= dt * 1.5;
    if (this._coinScoreScale < 1) this._coinScoreScale = 1;
  }
  // 购车按钮点击闪光
  if (this._buyClickFlashTimer > 0) {
    this._buyClickFlashTimer -= dt;
    if (this._buyClickFlashTimer < 0) this._buyClickFlashTimer = 0;
  }
  if (this._buyCoinParticles && this._buyCoinParticles.length > 0) {
    for (var ci = this._buyCoinParticles.length - 1; ci >= 0; ci--) {
      var par = this._buyCoinParticles[ci];
      if (par.delay > 0) { par.delay -= dt; continue; }
      par.age += dt;
      if (par.age >= par.life) {
        this._buyCoinParticles.splice(ci, 1);
      }
    }
  }

  // 合成动画更新
  if (this.mergeAnim) {
    this.mergeAnim.timer -= dt;
    if (this.mergeAnim.timer <= 0) {
      if (this.mergeAnim.phase < 2) {
        this.mergeAnim.phase++;
        var durations = [0.28, 0.32];
        this.mergeAnim.timer = durations[this.mergeAnim.phase - 1];
        // 阶段2(弹出)开始时执行实际merge
        if (this.mergeAnim.phase === 2) {
          this.state.merge(this.mergeAnim.slotA, this.mergeAnim.slotB);
        }
      } else {
        this.mergeAnim = null;
      }
    }
  }
};

// ========== 主渲染 ==========
CraftingScene.prototype.render = function(ctx) {
  var W = 720, H = 1280;
  ctx.clearRect(0, 0, W, H);

  // 1. 背景渐变
  this._renderBackground(ctx, W, H);

  // 2. 顶部栏
  this._renderTopBar(ctx);

  // 4. 中央车辆展示区
  this._renderCarDisplay(ctx);

  // 3. 左右侧按钮（在中央面板后绘制，保证图层处于上方）
  this._renderSideButtons(ctx);

  // 5. 功能按钮 6. 功能按钮行(Auto/Stage/Race)
  this._renderActionButtons(ctx);

  // 7. 合成槽位
  this._renderSlots(ctx);

  // 8. 底部按钮行
  this._renderBottom(ctx);

  // 9. 拖拽中的车辆
  if (this.dragging !== null) {
    var dragCar = this.state.getSlot(this.dragging.slotIndex);
    if (dragCar) {
      this._renderCarInSlot(ctx, this.dragX - 72, this.dragY - 80, 145, 160, dragCar.level, true, false);
    }
  }

  // 10. 合成动画
  if (this.mergeAnim) {
    this._renderMergeAnim(ctx);
  }

  // 10.5. 购车动画粒子（金币飞向槽位）
  if (this._buyCoinParticles && this._buyCoinParticles.length > 0) {
    this._renderBuyCoinParticles(ctx);
  }

  // 10.6. 胜利返回金币飞入粒子
  if (this._victoryCoinParticles && this._victoryCoinParticles.length > 0) {
    this._renderVictoryCoinParticles(ctx);
  }

  // 11. 浮动通知
  if (this.notification) {
    this._renderNotification(ctx);
  }

  // 12. 商店弹窗（最顶层之一）
  if (this._shopOpen) {
    this._renderShopPanel(ctx);
  }

  // 13. 无人机详情弹窗（最顶层）
  if (this._droneOpen) {
    this._renderDroneEditor(ctx);
  }

  // 14. 排行榜弹窗（最顶层）
  if (this._rankOpen) {
    this._renderRankPanel(ctx);
  }
};

// ========== 1. 背景 ==========
CraftingScene.prototype._renderBackground = function(ctx, W, H) {
  // 优先尝试绘制用户上传的真实背景图（赛博朋克城市夜景，纯氛围无UI）
  var bgRendered = false;
  if (this.assets && this.assets.renderSceneBg) {
    try {
      this.assets.renderSceneBg(ctx, 'mainBg', 0, 0, W, H);
      bgRendered = true;
    } catch(e) {}
  }

  // 没有背景图时回退到渐变+网格
  if (!bgRendered) {
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#0a0a1e');
    grd.addColorStop(0.4, '#0d0d2b');
    grd.addColorStop(0.7, '#150a28');
    grd.addColorStop(1, '#0a0515');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // 网格线装饰
    ctx.strokeStyle = 'rgba(0,229,255,0.04)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (var gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  }
};

// ========== 2. 顶部栏 ==========
CraftingScene.prototype._renderTopBar = function(ctx) {
  var L = this.layout;
  var C = this._colors;
  var cps = this.state.getCoinsPerSecond();
  var coins = this.state.get('coins');
  var gems = this.state.get('gems');

  // 半透明顶栏背景（单行）
  ctx.fillStyle = 'rgba(0,0,15,0.5)';
  ctx.fillRect(0, 0, L.topBar.w, L.topBar.h);
  ctx.fillStyle = C.panelBorder;
  ctx.fillRect(0, L.topBar.h - 1, L.topBar.w, 1);

  // 左侧: 金币
  if (this.assets && this.assets.renderBar) {
    this.assets.renderBar(ctx, 'top_panel', L.coinDisplay.x - 4, L.coinDisplay.y - 2,
      L.coinDisplay.w + 8, L.coinDisplay.h + 4);
  }
  var coinIconSize = 20;
  var coinIconY = L.coinDisplay.y + (L.coinDisplay.h - coinIconSize) / 2;
  if (this.assets && this.assets.renderIcon) {
    this.assets.renderIcon(ctx, 'coin', L.coinDisplay.x + 8, coinIconY, coinIconSize);
  }
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.save();
  var coinScale = this._coinScoreScale || 1;
  if (coinScale > 1) {
    ctx.translate(L.coinDisplay.x + 36, L.coinDisplay.y + L.coinDisplay.h / 2);
    ctx.scale(coinScale, coinScale);
    ctx.translate(-(L.coinDisplay.x + 36), -(L.coinDisplay.y + L.coinDisplay.h / 2));
  }
  ctx.fillText(this._formatNumber(coins), L.coinDisplay.x + 36, L.coinDisplay.y + L.coinDisplay.h / 2);
  ctx.restore();

  // 中间: CPS
  var cp = L.cpsDisplay;
  if (this.assets && this.assets.renderBar) {
    this.assets.renderBar(ctx, 'top_panel', cp.x - 6, cp.y - 3, cp.w + 12, cp.h + 6);
  }
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this._formatNumber(cps) + '/S', cp.x + cp.w / 2, cp.y + cp.h / 2 + 1);

  // 右侧: 钻石
  var gem = L.gemsDisplay;
  if (this.assets && this.assets.renderBar) {
    this.assets.renderBar(ctx, 'top_panel', gem.x - 4, gem.y - 2, gem.w + 8, gem.h + 4);
  }
  var gemIconSize = 20;
  var gemIconY = gem.y + (gem.h - gemIconSize) / 2;
  if (this.assets && this.assets.renderIcon) {
    this.assets.renderIcon(ctx, 'gem', gem.x + 12, gemIconY, gemIconSize);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(this._formatNumber(gems), gem.x + 40, gem.y + gem.h / 2);
  ctx.textBaseline = 'alphabetic';
};

// ========== 3. 左右侧按钮（在 Canvas 上精细绘制，仅保留排行榜）==========
CraftingScene.prototype._renderSideButtons = function(ctx) {
  var L = this.layout;
  
  // 在原位精细渲染唯一的【👑排行】按钮（Y=230），完全吻合玩家一戳即开的手指直觉！
  var rb = L.rankBtn;
  if (!rb) return;

  ctx.save();
  // 按钮外发光
  ctx.shadowColor = 'rgba(255, 152, 0, 0.55)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(15, 30, 52, 0.85)';
  this._fillRoundRect(ctx, rb.x, rb.y, rb.w, rb.h, 12);
  ctx.shadowBlur = 0;

  // 尊贵金橙色金属描边
  ctx.strokeStyle = '#FF9800'; 
  this._strokeRoundRect(ctx, rb.x, rb.y, rb.w, rb.h, 12, 1.5);

  // 渲染图标
  ctx.fillStyle = '#FFD54F'; // 亮金色
  ctx.font = '24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', rb.x + rb.w / 2, rb.y + rb.h / 2 - 8);

  // 标签文字
  ctx.font = 'bold 9px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillStyle = '#FFE082';
  ctx.fillText('排行', rb.x + rb.w / 2, rb.y + rb.h - 8);
  
  ctx.restore();
};

// 图标按钮辅助
CraftingScene.prototype._drawIconButton = function(ctx, x, y, w, h, icon, label, bgColor) {
  // 图标
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x + w / 2, y + h / 2 - 8);

  // 标签文字
  ctx.font = '9px Arial, sans-serif';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(label, x + w / 2, y + h - 8);
  ctx.textBaseline = 'alphabetic';
};

// ========== 4. 车辆展示区（左右双侧面板：性能/能量核心）==========
CraftingScene.prototype._renderCarDisplay = function(ctx) {
  var L = this.layout.carDisplay;
  var displayLevel = this.state.getHighestLevelCar();
  var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // ===== 1. 左侧"性能"面板（科技切角风格）=====
  var perfX = 20, perfY = L.y + 20, perfW = 130, perfH = 180;
  this._drawSciPanel(ctx, perfX, perfY, perfW, perfH, '#00D4FF', 'left');

  // 内容用切片透视绘制（与边框梯形匹配）
  var self = this;
  this._drawPanelContentPerspective(ctx, perfX, perfY, perfW, perfH, 'left', function(c, ox, oy) {
    // 标题"性能"
    c.fillStyle = '#00E5FF';
    c.font = 'bold 18px Arial, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.shadowColor = '#00E5FF'; c.shadowBlur = 6;
    c.fillText('性能', perfX + 14 + ox, perfY + 22 + oy);
    c.shadowBlur = 0;

    // 用车辆等级生成稳定伪随机的3项数值（同等级数值不变, 不同等级数值不同）
    // hash(level, seed) → 0~1
    var hash = function(lv, seed) {
      var x = Math.sin(lv * 9301 + seed * 49297) * 233280;
      return x - Math.floor(x); // 0~1
    };
    var lvNorm = Math.min(1, displayLevel / 52); // 等级越高基础越高
    var stats = [
      { label: '速度',    icon: '✈', value: Math.min(1, 0.3 + lvNorm * 0.5 + hash(displayLevel, 1) * 0.25) },
      { label: '加速度',  icon: '✈', value: Math.min(1, 0.3 + lvNorm * 0.5 + hash(displayLevel, 2) * 0.25) },
      { label: '操控性',  icon: '✈', value: Math.min(1, 0.3 + lvNorm * 0.5 + hash(displayLevel, 3) * 0.25) },
    ];
    var statY = perfY + 52;
    for (var si = 0; si < stats.length; si++) {
      var s = stats[si];
      var sy = statY + si * 40 + oy;
      c.fillStyle = 'rgba(0,229,255,0.15)';
      c.beginPath(); c.arc(perfX + 18 + ox, sy, 7, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#00E5FF'; c.lineWidth = 1;
      c.stroke();
      c.fillStyle = '#00E5FF'; c.font = '10px Arial';
      c.textAlign = 'center';
      c.fillText(s.icon, perfX + 18 + ox, sy + 1);
      c.fillStyle = '#E0F7FA';
      c.font = '12px Arial, sans-serif';
      c.textAlign = 'left';
      c.fillText(s.label, perfX + 32 + ox, sy);
      var barX = perfX + 32 + ox, barY = sy + 8, barW = perfW - 44, barH = 6;
      c.fillStyle = 'rgba(255,255,255,0.08)';
      self._fillRoundRect(c, barX, barY, barW, barH, 3);
      var fillW = barW * s.value;
      var bg = c.createLinearGradient(barX, barY, barX + fillW, barY);
      bg.addColorStop(0, '#00B0FF');
      bg.addColorStop(1, '#00E5FF');
      c.fillStyle = bg;
      self._fillRoundRect(c, barX, barY, fillW, barH, 3);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      self._fillRoundRect(c, barX, barY, fillW, barH * 0.4, 2);
    }

    c.fillStyle = 'rgba(0,229,255,0.18)';
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.fillText('PERFORMANCE', perfX + perfW / 2 + ox, perfY + perfH - 12 + oy);
  });

  // ===== 2. 右侧"能量核心"面板 =====
  var coreX = 720 - 150, coreY = L.y + 20, coreW = 130, coreH = 180;
  this._drawSciPanel(ctx, coreX, coreY, coreW, coreH, '#00D4FF', 'right');

  this._drawPanelContentPerspective(ctx, coreX, coreY, coreW, coreH, 'right', function(c, ox, oy) {
    c.fillStyle = '#00E5FF';
    c.font = 'bold 18px Arial, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.shadowColor = '#00E5FF'; c.shadowBlur = 6;
    c.fillText('能量核心', coreX + 12 + ox, coreY + 22 + oy);
    c.shadowBlur = 0;

    self._drawEnergyCore(c, coreX + coreW / 2 + ox, coreY + coreH / 2 + 8 + oy, 38, now, self._getEnergyCoreColor(displayLevel));

    c.fillStyle = 'rgba(0,229,255,0.18)';
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.fillText('ENERGY CORE', coreX + coreW / 2 + ox, coreY + coreH - 12 + oy);
  });

  // ===== 3. 中央LV标签（上移到顶部栏下方）=====
  var lvW = 180, lvH = 50;
  var lvX = (720 - lvW) / 2, lvY = L.y - 90;
  this._drawLvBadge(ctx, lvX, lvY, lvW, lvH, displayLevel, now);

  // ===== 4. 车辆下方光环平台（多层立体能量底座）=====
  var platCx = 360, platCy = L.y + L.h * 0.78;
  this._drawCarPlatform(ctx, platCx, platCy, 360, 108, now);

  // ===== 5. 中央车辆（应用车辆变换编辑器参数）=====
  if (displayLevel > 0) {
    var baseW = 450, baseH = 278;
    // 从localStorage读取变换参数（车辆变换编辑器调节）
    var tf = window.CarTransformEditor ? window.CarTransformEditor.getTransform() : null;
    if (!tf) tf = { rotZ: 0, skewX: 0, skewY: 0, offsetX: 0, offsetY: 0, scale: 1 };

    var carW = baseW * tf.scale;
    var carH = baseH * tf.scale;
    var carX = 360 - carW / 2 + tf.offsetX;
    var carY = (L.y - 10) + (baseH - carH) / 2 + tf.offsetY;

    ctx.save();
    var pivotX = carX + carW / 2, pivotY = carY + carH / 2;
    ctx.translate(pivotX, pivotY);
    // Z轴旋转（图像平面内）
    ctx.rotate(tf.rotZ * Math.PI / 180);
    // skewX/Y 模拟X/Y轴透视倾斜（伪3D）
    ctx.transform(1, Math.tan(tf.skewY * Math.PI / 180), Math.tan(tf.skewX * Math.PI / 180), 1, 0, 0);
    ctx.translate(-pivotX, -pivotY);
    this._renderCarInSlot(ctx, carX, carY, carW, carH, displayLevel, false, true);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('[ No Vehicle ]', 360, L.y + L.h / 2);
  }
  ctx.textBaseline = 'alphabetic';
};

// ========== 科技切角面板（左右两侧用）==========
CraftingScene.prototype._drawSciPanel = function(ctx, x, y, w, h, color, tilt) {
  var ch = 12; // 切角
  ctx.save();

  // ===== 透视模式：左右面板朝向中央倾斜 =====
  // tilt = 'left'  → 左侧面板，外侧(左,远离中心)宽，内侧(右,靠近中心)窄
  // tilt = 'right' → 右侧面板，外侧(右,远离中心)宽，内侧(左,靠近中心)窄

  // 计算8个顶点
  var pts;
  if (tilt === 'left') {
    // 左面板：外侧(x)宽，内侧(x+w)窄→上下边内端向内收
    var inH = h * 0.06;        // 内侧高度收缩
    var inX = w * 0.05;        // 内侧X向内缩
    pts = [
      [x + ch, y],                              // 左上(外侧)
      [x + w - ch - inX, y + inH],              // 右上(内侧)向内向下
      [x + w - inX, y + ch + inH],
      [x + w - inX, y + h - ch - inH],
      [x + w - ch - inX, y + h - inH],          // 右下(内侧)向内向上
      [x + ch, y + h],                          // 左下(外侧)
      [x, y + h - ch],
      [x, y + ch],
    ];
  } else if (tilt === 'right') {
    // 右面板：外侧(x+w)宽，内侧(x)窄→上下边内端向内收
    var inH2 = h * 0.06;
    var inX2 = w * 0.05;
    pts = [
      [x + ch + inX2, y + inH2],                // 左上(内侧)向内向下
      [x + w - ch, y],                          // 右上(外侧)
      [x + w, y + ch],
      [x + w, y + h - ch],
      [x + w - ch, y + h],                      // 右下(外侧)
      [x + ch + inX2, y + h - inH2],            // 左下(内侧)向内向上
      [x + inX2, y + h - ch - inH2],
      [x + inX2, y + ch + inH2],
    ];
  } else {
    // 默认八边形（无透视）
    pts = [
      [x + ch, y],
      [x + w - ch, y],
      [x + w, y + ch],
      [x + w, y + h - ch],
      [x + w - ch, y + h],
      [x + ch, y + h],
      [x, y + h - ch],
      [x, y + ch],
    ];
  }

  var drawPath = function() {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };

  // 渐变填充
  drawPath();
  var bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, 'rgba(10,30,60,0.85)');
  bg.addColorStop(0.5, 'rgba(5,20,50,0.9)');
  bg.addColorStop(1, 'rgba(10,30,60,0.85)');
  ctx.fillStyle = bg;
  ctx.fill();

  // 外发光边框
  drawPath();
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 内层细边（按相同顶点向内偏3px）
  var inset = 3;
  ctx.strokeStyle = 'rgba(0,180,255,0.2)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  // 用cx,cy作为中心做向内偏移
  var cx = x + w / 2, cy = y + h / 2;
  for (var i = 0; i < pts.length; i++) {
    var dx = pts[i][0] - cx, dy = pts[i][1] - cy;
    var len = Math.sqrt(dx * dx + dy * dy);
    var ix = pts[i][0] - dx / len * inset;
    var iy = pts[i][1] - dy / len * inset;
    if (i === 0) ctx.moveTo(ix, iy); else ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.stroke();

  // 四角小装饰（4个上下顶点）
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  [pts[0], pts[1], pts[4], pts[5]].forEach(function(pt) {
    ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.restore();
};

/** 给面板内容应用与 _drawSciPanel 一致的透视变换（梯形等比缩放）
 * 用 setTransform 替换当前坐标系，把内容压缩到梯形轮廓内
 * 注意：调用前 ctx.save()，结束后 ctx.restore()
 */
CraftingScene.prototype._applyPanelTilt = function(ctx, x, y, w, h, tilt) {
  // 此方法已废弃 — 仿射变换无法做真透视
};

/** 在矩形(0,0,w,h)的离屏canvas上调用callback绘制内容，再用切片drawImage把内容映射到梯形
 * @param ctx 目标上下文
 * @param x,y,w,h 目标梯形外接矩形
 * @param tilt 'left'|'right' 透视方向
 * @param callback 在离屏ctx上绘制内容，坐标从(0,0)开始, w*h范围
 */
CraftingScene.prototype._drawPanelContentPerspective = function(ctx, x, y, w, h, tilt, callback) {
  if (!tilt) {
    callback(ctx, x, y);
    return;
  }
  // 准备/复用离屏canvas
  if (!this._offCanvas) {
    this._offCanvas = document.createElement('canvas');
  }
  var off = this._offCanvas;
  // 留 padding 防止shadow/glow被裁
  var pad = 16;
  off.width = w + pad * 2;
  off.height = h + pad * 2;
  var offCtx = off.getContext('2d');
  offCtx.clearRect(0, 0, off.width, off.height);

  // 在离屏画布上绘制内容，坐标偏移 pad
  callback(offCtx, pad - x, pad - y);

  // 切片透视绘制：把 (pad, pad, w, h) 区域映射到梯形
  // 内侧端 inH 收缩，外侧端不收缩
  var inH = h * 0.06;
  var slices = 28; // 切片数量越多越平滑
  var sliceW = w / slices;
  ctx.save();
  for (var i = 0; i < slices; i++) {
    // t = 0(外侧) ~ 1(内侧)
    var t;
    if (tilt === 'left')  t = i / (slices - 1);   // 左面板：外侧x=0, 内侧x+w=1
    else                  t = 1 - i / (slices - 1); // 右面板：反向
    // 当前切片在Y方向的压缩量（线性插值）
    var dY = inH * t;
    // 源矩形：离屏画布上对应这一切片
    var sx = pad + i * sliceW;
    var sy = pad;
    var sw = sliceW + 0.5; // +0.5消除接缝
    var sh = h;
    // 目标矩形：在ctx上的对应位置（高度被dY压缩）
    var dx = x + i * sliceW;
    var dy = y + dY;
    var dw = sliceW + 0.5;
    var dh = h - dY * 2;
    ctx.drawImage(off, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
};

// ========== LV徽章（顶部居中，科技切角）==========
CraftingScene.prototype._drawLvBadge = function(ctx, x, y, w, h, level, now) {
  var ch = 18;
  ctx.save();
  // 路径
  ctx.beginPath();
  ctx.moveTo(x + ch, y);
  ctx.lineTo(x + w - ch, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w - ch, y + h);
  ctx.lineTo(x + ch, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();

  // 填充
  var bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, 'rgba(15,35,70,0.9)');
  bg.addColorStop(0.5, 'rgba(8,22,55,0.95)');
  bg.addColorStop(1, 'rgba(15,35,70,0.9)');
  ctx.fillStyle = bg;
  ctx.fill();

  // 脉动边框
  var pulse = 0.6 + Math.sin(now * 0.003) * 0.2;
  ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 12 * pulse + 5;
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 文字
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('LV.' + Math.max(level, 1), x + w / 2, y + h / 2);
  ctx.shadowBlur = 0;

  ctx.restore();
};

// ========== 车辆光环平台（橙+蓝螺旋光环）==========
CraftingScene.prototype._drawCarPlatform = function(ctx, cx, cy, rw, rh, now) {
  var t = (now % 4000) / 4000;
  var ringImg = this._particleRingImg;

  // ===== 优先使用粒子装饰切图（橙蓝椭圆光环底座）=====
  if (ringImg && ringImg.complete && ringImg.naturalWidth) {
    ctx.save();

    // 粒子切图：宽度=rw, 按原图比例算高度
    var imgRatio = ringImg.naturalHeight / ringImg.naturalWidth; // ≈ 0.278
    var ringW = rw;
    var ringH = ringW * imgRatio;

    // ===== 底座主层：实色（不旋转，加深显色感）=====
    // 双绘叠加让颜色更实
    ctx.globalAlpha = 1;
    ctx.drawImage(ringImg, cx - ringW / 2, cy - ringH / 2 + rh * 0.05, ringW, ringH);
    ctx.globalAlpha = 0.8;
    ctx.drawImage(ringImg, cx - ringW / 2, cy - ringH / 2 + rh * 0.05, ringW, ringH);
    ctx.globalAlpha = 1;

    // ===== 粒子飘动动画 =====
    ctx.globalCompositeOperation = 'lighter';
    var particleCount = 22;
    for (var i = 0; i < particleCount; i++) {
      var seed = i * 0.137;
      var lifeT = (t * 0.6 + seed) % 1; // 粒子生命周期 0~1

      // 起点：底座椭圆边缘随机一点
      var angle = (Math.PI * 2 / particleCount) * i + seed * 7.3;
      var startX = cx + Math.cos(angle) * ringW * 0.42;
      var startY = cy + rh * 0.08 + Math.sin(angle) * ringH * 0.42;

      // 飘动方向：往上+随机左右摆动
      var driftX = Math.sin(seed * 13.7 + lifeT * Math.PI * 2) * 18;
      var riseY = -lifeT * (rh * 1.2 + 25); // 向上飘升

      var px = startX + driftX;
      var py = startY + riseY;

      // 大小：先增大再缩小
      var sizeFactor = Math.sin(lifeT * Math.PI); // 0→1→0
      var pSize = 1.5 + sizeFactor * 2.5;

      // 透明度：中段最亮，两端淡入淡出
      var pAlpha = sizeFactor * 0.85;

      // 颜色：橙蓝交替
      var isOrange = i % 2 === 0;
      var color = isOrange ? '255,180,60' : '120,210,255';

      // 渐变发光小球
      var pg = ctx.createRadialGradient(px, py, 0, px, py, pSize * 3);
      pg.addColorStop(0, 'rgba(' + color + ',' + pAlpha + ')');
      pg.addColorStop(0.4, 'rgba(' + color + ',' + (pAlpha * 0.5) + ')');
      pg.addColorStop(1, 'rgba(' + color + ',0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, pSize * 3, 0, Math.PI * 2);
      ctx.fill();

      // 中心亮点
      ctx.fillStyle = 'rgba(255,255,255,' + (pAlpha * 0.8) + ')';
      ctx.beginPath();
      ctx.arc(px, py, pSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // ===== 底座边缘几颗呼吸亮点（在椭圆环上脉动）=====
    for (var j = 0; j < 6; j++) {
      var ja = (Math.PI * 2 / 6) * j;
      var jx = cx + Math.cos(ja) * ringW * 0.4;
      var jy = cy + rh * 0.08 + Math.sin(ja) * ringH * 0.4;
      var jPulse = 0.5 + Math.sin(t * Math.PI * 4 + j) * 0.4;
      var jColor = j % 2 === 0 ? '255,200,80' : '150,220,255';
      var jg = ctx.createRadialGradient(jx, jy, 0, jx, jy, 6);
      jg.addColorStop(0, 'rgba(' + jColor + ',' + jPulse + ')');
      jg.addColorStop(1, 'rgba(' + jColor + ',0)');
      ctx.fillStyle = jg;
      ctx.beginPath();
      ctx.arc(jx, jy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  // ===== 回退：原程序化绘制（切图未加载完时）=====
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  var baseW = rw * 1.3;
  var baseH = rh * 1.4;
  var baseG2 = ctx.createRadialGradient(cx, cy + rh * 0.15, 0, cx, cy + rh * 0.15, baseW / 2);
  baseG2.addColorStop(0, 'rgba(0,180,255,0.32)');
  baseG2.addColorStop(0.4, 'rgba(0,140,255,0.18)');
  baseG2.addColorStop(0.7, 'rgba(80,80,255,0.08)');
  baseG2.addColorStop(1, 'rgba(0,0,80,0)');
  ctx.fillStyle = baseG2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + rh * 0.15, baseW / 2, baseH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// ========== 能量核心（全息涡轮）==========
CraftingScene.prototype._drawEnergyCore = function(ctx, cx, cy, r, now, colorScheme) {
  var t = (now % 3000) / 3000;
  // colorScheme = { glow:[outR,outG,outB], ring:[r,g,b], inner:[r,g,b] }
  // 默认青色
  var cs = colorScheme || {
    glow:  [0, 229, 255],
    ring:  [120, 220, 255],
    inner: [150, 230, 255],
    deep:  [0, 100, 200],
  };
  var glowC = cs.glow.join(',');
  var ringC = cs.ring.join(',');
  var innerC = cs.inner.join(',');
  var deepC = cs.deep.join(',');

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 外发光
  var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
  glow.addColorStop(0, 'rgba(' + glowC + ',0.5)');
  glow.addColorStop(0.5, 'rgba(' + glowC + ',0.2)');
  glow.addColorStop(1, 'rgba(' + deepC + ',0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();

  // 核心球体（多层椭圆叠加，模拟涡轮）
  for (var i = 0; i < 5; i++) {
    var angle = (Math.PI / 5) * i + t * Math.PI;
    var ringAlpha = 0.4 + Math.sin(t * Math.PI * 2 + i) * 0.2;
    ctx.strokeStyle = 'rgba(' + ringC + ',' + ringAlpha + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.85, r * 0.3, angle, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 中心光球
  var coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
  coreG.addColorStop(0, 'rgba(255,255,255,0.95)');
  coreG.addColorStop(0.3, 'rgba(' + innerC + ',0.7)');
  coreG.addColorStop(0.7, 'rgba(' + glowC + ',0.3)');
  coreG.addColorStop(1, 'rgba(' + deepC + ',0)');
  ctx.fillStyle = coreG;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();

  // 旋转的能量碎片
  for (var j = 0; j < 8; j++) {
    var sa = t * Math.PI * 2 + (Math.PI * 2 / 8) * j;
    var sr = r * 0.7;
    var sx = cx + Math.cos(sa) * sr;
    var sy = cy + Math.sin(sa) * sr * 0.5;
    var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 3);
    sg.addColorStop(0, 'rgba(' + innerC + ',0.9)');
    sg.addColorStop(1, 'rgba(' + glowC + ',0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
};

/** 根据车辆等级选择能量核心颜色方案 */
CraftingScene.prototype._getEnergyCoreColor = function(level) {
  // 7种配色方案，按等级分段
  var schemes = [
    { glow: [0, 229, 255],   ring: [120, 220, 255], inner: [150, 230, 255], deep: [0, 100, 200] },   // 青(默认)
    { glow: [76, 255, 130],  ring: [150, 255, 180], inner: [200, 255, 220], deep: [0, 150, 80] },    // 绿
    { glow: [180, 100, 255], ring: [210, 160, 255], inner: [230, 200, 255], deep: [80, 30, 180] },   // 紫
    { glow: [255, 200, 60],  ring: [255, 220, 130], inner: [255, 240, 180], deep: [200, 130, 0] },   // 金
    { glow: [255, 80, 80],   ring: [255, 140, 140], inner: [255, 200, 200], deep: [180, 30, 30] },   // 红
    { glow: [255, 140, 220], ring: [255, 180, 230], inner: [255, 220, 240], deep: [180, 50, 130] },  // 粉
    { glow: [255, 130, 30],  ring: [255, 180, 100], inner: [255, 220, 160], deep: [180, 60, 0] },    // 橙
  ];
  return schemes[level % schemes.length];
};

// ========== 5. 功能按钮行（科技切角按钮）==========
CraftingScene.prototype._renderActionButtons = function(ctx) {
  var L = this.layout;
  var self = this;
  var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // 等宽分布
  L.autoCraftBtn.x=30;  L.autoCraftBtn.w=200; L.autoCraftBtn.h=70;
  L.stageBtn.x=260;     L.stageBtn.w=200;     L.stageBtn.h=70;
  L.raceBtn.x=490;      L.raceBtn.w=200;      L.raceBtn.h=70;

  var isOn = self.state.get('autoCraft');
  var stageNum = self.state.get('currentStage') || 1;

  // AUTO 合成 —— 蓝青色
  var autoOpts = isOn ? {
    primary: '#00E5FF',
    dark: '#00557A',
    glow: '#00FFFF',
    textColor: '#FFFFFF',
    isPrimary: true,
    now: now
  } : {
    primary: '#0090B0',
    dark: '#002235',
    glow: '#00B0FF',
    textColor: '#A0D5F0',
    isPrimary: false,
    now: now
  };
  this._drawSciActionBtn(ctx, L.autoCraftBtn, 'AUTO ' + (isOn ? '开' : '合成'), autoOpts);

  // 关卡 —— 金色切图按钮（保留呼吸动画）
  this._drawStageBtnFromImage(ctx, L.stageBtn, '关卡' + stageNum, now);

  // 竞速模式 —— 紫色
  this._drawSciActionBtn(ctx, L.raceBtn, '无尽模式',
    { primary: '#B388FF', dark: '#3C1A6E', glow: '#7C4DFF', textColor: '#FFFFFF' });
};

/** 关卡按钮：使用切图素材 + scale pulse 呼吸动画 + 文字叠加 */
CraftingScene.prototype._drawStageBtnFromImage = function(ctx, btn, text, now) {
  var img = this._stageBtnImg;
  // 切图未就绪时退回程序化绘制
  if (!img || !img.complete || !img.naturalWidth) {
    return this._drawSciActionBtn(ctx, btn, text, {
      primary: '#FFD54F', dark: '#5C4500', glow: '#FFC107',
      textColor: '#1A1A1A', isPrimary: true, now: now,
    });
  }

  var x = btn.x, y = btn.y, w = btn.w, h = btn.h;
  // 呼吸缩放（与原科技按钮的 pulse 保持一致）
  var pulse = 1 + Math.sin(now * 0.004) * 0.04;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  // 外发光
  ctx.shadowColor = '#FFC107';
  ctx.shadowBlur = 18;
  ctx.drawImage(img, x, y, w, h);
  ctx.shadowBlur = 0;

  // 文字
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px Arial, "Microsoft YaHei", sans-serif';
  // 描边
  ctx.strokeStyle = 'rgba(120,60,0,0.85)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x + w / 2, y + h / 2);
  // 主体（白色+发光）
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.shadowBlur = 0;
  ctx.textBaseline = 'alphabetic';

  ctx.restore();
};

/** 绘制科技切角动作按钮 */
CraftingScene.prototype._drawSciActionBtn = function(ctx, btn, text, opts) {
  var x = btn.x, y = btn.y, w = btn.w, h = btn.h;
  var ch = 14; // 切角
  ctx.save();

  // 八边形路径
  var drawPath = function() {
    ctx.beginPath();
    ctx.moveTo(x + ch, y);
    ctx.lineTo(x + w - ch, y);
    ctx.lineTo(x + w, y + ch);
    ctx.lineTo(x + w, y + h - ch);
    ctx.lineTo(x + w - ch, y + h);
    ctx.lineTo(x + ch, y + h);
    ctx.lineTo(x, y + h - ch);
    ctx.lineTo(x, y + ch);
    ctx.closePath();
  };

  // 主推按钮的脉动效果
  var pulse = 1;
  if (opts.isPrimary) {
    pulse = 1 + Math.sin(opts.now * 0.004) * 0.04;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  // 渐变填充（主推按钮用更亮的金色梯度，其他用深色暗梯度）
  drawPath();
  if (opts.isPrimary) {
    var bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#FFE680');
    bg.addColorStop(0.4, '#FFC107');
    bg.addColorStop(0.6, '#FF9800');
    bg.addColorStop(1, '#E68900');
    ctx.fillStyle = bg;
  } else {
    var bg2 = ctx.createLinearGradient(x, y, x, y + h);
    bg2.addColorStop(0, opts.dark);
    bg2.addColorStop(0.5, 'rgba(8,15,40,0.95)');
    bg2.addColorStop(1, opts.dark);
    ctx.fillStyle = bg2;
  }
  ctx.fill();

  // 顶部高光
  ctx.save();
  ctx.clip();
  var hl = ctx.createLinearGradient(x, y, x, y + h * 0.4);
  hl.addColorStop(0, opts.isPrimary ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(x, y, w, h * 0.4);
  ctx.restore();

  // 外发光边框
  drawPath();
  var blur = opts.isPrimary ? (15 + Math.sin((opts.now || Date.now()) * 0.015) * 7) : 10;
  ctx.shadowColor = opts.glow; ctx.shadowBlur = blur;
  ctx.strokeStyle = opts.primary;
  ctx.lineWidth = opts.isPrimary ? 2.5 : 1.8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 赛博横向高光扫描线
  if (opts.isPrimary) {
    var scanY = y + (Math.sin((opts.now || Date.now()) * 0.004) * 0.5 + 0.5) * h;
    ctx.save();
    drawPath();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, scanY - 1.5, w, 3);
    ctx.restore();
  }

  // 内层细边
  ctx.strokeStyle = 'rgba(255,255,255,' + (opts.isPrimary ? 0.4 : 0.15) + ')';
  ctx.lineWidth = 0.8;
  var inset = 3;
  ctx.beginPath();
  ctx.moveTo(x + ch, y + inset);
  ctx.lineTo(x + w - ch, y + inset);
  ctx.lineTo(x + w - inset, y + ch);
  ctx.lineTo(x + w - inset, y + h - ch);
  ctx.lineTo(x + w - ch, y + h - inset);
  ctx.lineTo(x + ch, y + h - inset);
  ctx.lineTo(x + inset, y + h - ch);
  ctx.lineTo(x + inset, y + ch);
  ctx.closePath();
  ctx.stroke();

  // 主推按钮的金色钻石装饰（左右两侧）
  if (opts.isPrimary) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    [x + 18, x + w - 18].forEach(function(dx) {
      var dy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(dx, dy - 6);
      ctx.lineTo(dx + 5, dy);
      ctx.lineTo(dx, dy + 6);
      ctx.lineTo(dx - 5, dy);
      ctx.closePath();
      ctx.fill();
    });
  }

  // 文字
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px Arial, "Microsoft YaHei", sans-serif';
  // 描边
  ctx.strokeStyle = opts.isPrimary ? 'rgba(120,80,0,0.7)' : 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x + w / 2, y + h / 2);
  // 主体
  if (opts.isPrimary) {
    ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 6;
  } else {
    ctx.shadowColor = opts.glow; ctx.shadowBlur = 8;
  }
  ctx.fillStyle = opts.textColor;
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.shadowBlur = 0;
  ctx.textBaseline = 'alphabetic';

  if (opts.isPrimary) ctx.restore();
  ctx.restore();
};

// ========== 7. 合成槽位 ==========
CraftingScene.prototype._renderSlots = function(ctx) {
  var L = this.layout;
  var C = this._colors;

  // 区域标题
  ctx.fillStyle = C.textDim;
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('= GARAGE SLOTS =', L.slotsStart.x, L.slotsStart.y - 5);

  for (var i = 0; i < 12; i++) {
    var row = Math.floor(i / L.slotCols);
    var col = i % L.slotCols;
    var sx = L.slotsStart.x + col * (L.slotSize.w + L.slotGap);
    var sy = L.slotsStart.y + row * (L.slotSize.h + L.slotGap);

    var car = this.state.getSlot(i);
    var isHighlighted = this.mergeHintSlots.indexOf(i) !== -1;
    // 合成动画隐藏规则：
    // - phase 1~2：slotA和slotB都隐藏（动画自己画两辆原级车）
    // - phase 3：slotA隐藏（光柱遮盖，避免突然出现新车）
    // - phase 1: 隐藏 slotA + slotB（动画自己画两车碰撞）
    // - phase 2: 都不隐藏（slotA已显示新车，动画只叠加爆裂+弹出特效）
    var isMerging = false;
    if (this.mergeAnim) {
      if (this.mergeAnim.phase === 1 && (i === this.mergeAnim.slotA || i === this.mergeAnim.slotB)) {
        isMerging = true;
      }
    }

    // ===== 底层：固定底座（使用切图：蓝紫色等距平台 + 橙色霓虹边框）=====
    if (this.assets && this.assets.renderSlotPlatform) {
      var pad = 14;
      var platW = L.slotSize.w + pad * 2;
      var platH = L.slotSize.h + pad * 2;
      var ox = pad;
      var oy = pad;
      this.assets.renderSlotPlatform(ctx, sx - ox, sy - oy, platW, platH);
    }

    // 合并提示：不画外圈粗边框，改为LV标签变色

    if (car && !(this.dragging && this.dragging.slotIndex === i) && !isMerging) {
      // 有车：画车（在底座之上，留出空间给底部LV标签，放大并翻转方向）
      this._renderCarInSlot(ctx, sx + 4, sy + 8, L.slotSize.w - 8, L.slotSize.h - 40, car.level, false, false);

      // ===== LV等级标签（可合成时黄色高亮，平时深色） =====
      var lvText = String(car.level);
      ctx.font = 'bold 15px Arial, sans-serif';
      var lvW = Math.max(50, ctx.measureText(lvText).width + 20);
      var lvH = 24;
      var lvX = sx + (L.slotSize.w - lvW) / 2;
      var lvY = sy + L.slotSize.h - lvH - 6;

      // 背景：可合成时金黄，平时深色
      if (isHighlighted) {
        ctx.fillStyle = 'rgba(255,193,7,0.9)';
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
      }
      this._fillRoundRect(ctx, lvX, lvY, lvW, lvH, lvH / 2);

      // 文字：可合成时深色，平时白色
      if (isHighlighted) {
        ctx.fillStyle = '#1a1a1a';
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lvText, sx + L.slotSize.w / 2, lvY + lvH - 7);

      // 选中高亮（跟随底座110%放大）
      if (this._selectedSlot === i) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        this._strokeRoundRect(ctx, sx - 3, sy - 3, L.slotSize.w + 6, L.slotSize.h + 6, 14);
      }
    } else if (!car) {
      // 空位编号(小字)
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.font = '10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('#' + (i + 1), sx + L.slotSize.w / 2, sy + L.slotSize.h - 6);
    }
  }
};

// ========== 车辆占位符渲染 ==========
CraftingScene.prototype._renderCarInSlot = function(ctx, x, y, w, h, level, isDragging, flipH) {
  if (isDragging) ctx.globalAlpha = 0.85;

  // 水平翻转：参考图车头朝左上，原图朝右上
  if (flipH) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.scale(-1, 1);
    x = -w / 2;
    y = 0;
  }

  // 尝试用图片素材，没有则回退到占位符
  var imgOk = false;
  if (this.assets && this.assets.renderVehicle) {
    imgOk = this.assets.renderVehicle.call(this.assets, ctx, level, x, y, w, h);
  }
  if (!imgOk) {
    // 占位符：彩色方块+车型图标
    var hue = ((level * 47) % 360);
    var sat = Math.min(70, 40 + level);
    var light = Math.min(55, 25 + level * 0.5);

    // 车身颜色根据等级变化
    var carColor;
    if (level <= 10) carColor = '#4CAF50';       // 绿色-低级
    else if (level <= 20) carColor = '#2196F3';    // 蓝色
    else if (level <= 30) carColor = '#9C27B0';    // 紫色
    else if (level <= 42) carColor = '#FF9800';    // 橙色
    else carColor = '#F44336';                      // 红色-高级

    // 车身主体(圆角矩形模拟)
    ctx.fillStyle = carColor;
    this._fillRoundRect(ctx, x + w * 0.1, y + h * 0.15, w * 0.8, h * 0.5, 8);

    // 车窗
    ctx.fillStyle = 'rgba(100,180,255,0.4)';
    this._fillRoundRect(ctx, x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.25, 4);

    // 轮子
    ctx.fillStyle = '#333333';
    ctx.beginPath(); ctx.arc(x + w * 0.22, y + h * 0.72, w * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.72, w * 0.12, 0, Math.PI * 2); ctx.fill();

    // 星级标识
    var stars = level <= 5 ? 1 : level <= 15 ? 2 : level <= 30 ? 3 : level <= 42 ? 4 : 5;
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'center';
    var starStr = '';
    for (var s = 0; s < stars; s++) starStr += '\u2605';
    ctx.fillText(starStr, x + w / 2, y + h * 0.92);
  }

  if (flipH) ctx.restore();
  if (isDragging) ctx.globalAlpha = 1;
};

// ========== 8. 底部按钮行 ==========
CraftingScene.prototype._renderBottom = function(ctx) {
  var L = this.layout;
  var C = this._colors;

  // Drone 按钮
  var dr = L.droneBtn;
  var droneImgOk = false;
  if (this.assets && this.assets.renderButton) {
    droneImgOk = this.assets.renderButton(ctx, 'drone', dr.x, dr.y, dr.w, dr.h);
  }
  if (!droneImgOk) {
    ctx.fillStyle = C.btnSecondary;
    this._fillRoundRect(ctx, dr.x, dr.y, dr.w, dr.h, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this._strokeRoundRect(ctx, dr.x, dr.y, dr.w, dr.h, 12);
  }
  var iconSize = Math.min(dr.w * 0.45, 44);
  var iconX = dr.x + (dr.w - iconSize) / 2;
  var iconY = dr.y + 8;
  if (this.assets && this.assets.renderIcon) {
    this.assets.renderIcon(ctx, 'drone', iconX, iconY, iconSize);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Drone', dr.x + dr.w / 2, dr.y + dr.h - 14);

  // BUY CAR 按钮
  var by = L.buyBtn;
  var buyImgOk = false;
  if (this.assets && this.assets.renderButton) {
    buyImgOk = this.assets.renderButton(ctx, 'buy_car', by.x, by.y, by.w, by.h);
  }
  if (!buyImgOk) {
    ctx.fillStyle = 'rgba(0,150,60,0.6)';
    this._fillRoundRect(ctx, by.x, by.y, by.w, by.h, 14);
    ctx.strokeStyle = 'rgba(76,175,80,0.5)';
    ctx.lineWidth = 2;
    this._strokeRoundRect(ctx, by.x, by.y, by.w, by.h, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u27A1 BUY CAR', by.x + by.w / 2, by.y + 40);
  }

  // 购车按钮内：参考图布局——车在左、LV在右上、coin+价格在下方居中
  var cfgBuy = window.GameConfig && GameConfig.crafting ? GameConfig.crafting : {};
  var buyOffset = cfgBuy.buyLevelOffset || 0;
  var highestLv = this.state.getHighestLevelCar();
  var nextBuyLevel = Math.max(1, highestLv - buyOffset);

  // === 第1行：车辆 + LV.X，整体居上 ===
  var buyIconSize = Math.floor(by.h * 0.55); // 车更大约48-50
  var lvText = 'LV.' + nextBuyLevel;
  ctx.font = 'bold 18px Arial, sans-serif';
  var lvW = ctx.measureText(lvText).width;
  var rowGap = 8;
  var row1W = buyIconSize + rowGap + lvW;
  var row1X = by.x + (by.w - row1W) / 2;
  var row1Y = by.y + 6;
  if (this.assets && this.assets.renderVehicle) {
    this.assets.renderVehicle.call(this.assets, ctx, nextBuyLevel, row1X, row1Y, buyIconSize, buyIconSize * 0.85);
  }
  // LV文字：白色+青色发光，居中对齐车辆垂直中线
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 6;
  ctx.fillText(lvText, row1X + buyIconSize + rowGap, row1Y + buyIconSize * 0.85 / 2);
  ctx.shadowBlur = 0;

  // === 第2行：金币+价格，在下方居中 ===
  var price = this.state.getBuyPrice();
  ctx.font = 'bold 18px Arial, sans-serif';
  var priceStr = this._formatNumber(price);
  var coinIconSz = 20;
  var priceRowW = coinIconSz + 6 + ctx.measureText(priceStr).width;
  var priceRowX = by.x + (by.w - priceRowW) / 2;
  var priceRowY = by.y + by.h - 18; // 距按钮底部18px
  if (this.assets && this.assets.renderIcon) {
    this.assets.renderIcon(ctx, 'coin', priceRowX, priceRowY - coinIconSz / 2, coinIconSz);
  }
  ctx.fillStyle = C.accentGold;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 4;
  ctx.fillText(priceStr, priceRowX + coinIconSz + 6, priceRowY);
  ctx.shadowBlur = 0;

  // ===== 按下视觉反馈：半透明深色覆盖（按住时）=====
  if (this._buyBtnPressed) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    this._fillRoundRect(ctx, by.x, by.y, by.w, by.h, 14);
    // 顶部细高光线变暗
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(by.x + 8, by.y + 3);
    ctx.lineTo(by.x + by.w - 8, by.y + 3);
    ctx.stroke();
    ctx.restore();
  }

  // ===== 点击瞬间反馈：青色闪光向外扩散 =====
  if (this._buyClickFlashTimer > 0) {
    var flashT = 1 - this._buyClickFlashTimer / 0.25; // 0~1
    var flashA = (1 - flashT) * 0.7;
    ctx.save();
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 18 + flashT * 10;
    // 闪光描边（线宽逐渐变粗+消散）
    ctx.strokeStyle = 'rgba(180,240,255,' + flashA + ')';
    ctx.lineWidth = 2 + flashT * 3;
    var expand = flashT * 8;
    this._strokeRoundRect(ctx, by.x - expand, by.y - expand,
      by.w + expand * 2, by.h + expand * 2, 14 + expand);
    // 内部白色闪光
    ctx.fillStyle = 'rgba(255,255,255,' + (flashA * 0.3) + ')';
    this._fillRoundRect(ctx, by.x, by.y, by.w, by.h, 14);
    ctx.restore();
  }

  // ===== 自动购买状态：黄色高亮边框 + 底部黄色发光条（覆盖蓝条）=====
  if (this._buyAutoMode) {
    var pulseT = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.003;
    var pulseAlpha = 0.7 + Math.sin(pulseT) * 0.25;
    // 整体黄色发光边框
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(255,215,0,' + pulseAlpha + ')';
    ctx.lineWidth = 3;
    this._strokeRoundRect(ctx, by.x, by.y, by.w, by.h, 14);
    ctx.restore();
    // 底部黄色条（盖住原蓝条）
    var barY = by.y + by.h - 6;
    var barH = 4;
    ctx.save();
    ctx.shadowColor = '#FFC107';
    ctx.shadowBlur = 10;
    var barGrad = ctx.createLinearGradient(by.x, barY, by.x + by.w, barY);
    barGrad.addColorStop(0, '#FF8F00');
    barGrad.addColorStop(0.5, '#FFD700');
    barGrad.addColorStop(1, '#FF8F00');
    ctx.fillStyle = barGrad;
    this._fillRoundRect(ctx, by.x + 8, barY, by.w - 16, barH, 2);
    ctx.restore();
    // 右上角"AUTO"小标签
    ctx.save();
    ctx.font = 'bold 11px "Microsoft YaHei",Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(by.x + by.w - 50, by.y + 4, 46, 16);
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFC107';
    ctx.shadowBlur = 6;
    ctx.fillText('AUTO', by.x + by.w - 8, by.y + 6);
    ctx.restore();
  }

  // Shop 按钮
  var sh = L.shopBtn;
  var shopImgOk = false;
  if (this.assets && this.assets.renderButton) {
    shopImgOk = this.assets.renderButton(ctx, 'shop', sh.x, sh.y, sh.w, sh.h);
  }
  if (!shopImgOk) {
    ctx.fillStyle = C.btnSecondary;
    this._fillRoundRect(ctx, sh.x, sh.y, sh.w, sh.h, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this._strokeRoundRect(ctx, sh.x, sh.y, sh.w, sh.h, 12);
  }
  var shopIconSize = Math.min(sh.w * 0.45, 44);
  var shopIconX = sh.x + (sh.w - shopIconSize) / 2;
  var shopIconY = sh.y + 8;
  if (this.assets && this.assets.renderIcon) {
    this.assets.renderIcon(ctx, 'shop', shopIconX, shopIconY, shopIconSize);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Shop', sh.x + sh.w / 2, sh.y + sh.h - 14);
};

// ========== 通知浮窗 ==========
CraftingScene.prototype._renderNotification = function(ctx) {
  if (!this.notification) return;
  ctx.save();
  var timeLeft = this.notificationTimer || 0;
  var alpha = Math.min(1, timeLeft * 2);
  ctx.globalAlpha = alpha;

  var text = this.notification;
  // 智能区分：警告提示 vs 普通通知
  var isWarning = text.indexOf('不足') !== -1 || text.indexOf('空位') !== -1 || text.indexOf('满') !== -1 || text.indexOf('完') !== -1 || text.indexOf('失败') !== -1;

  var bgGradStart, bgGradEnd, borderColor, textColor, glowColor;
  if (isWarning) {
    bgGradStart = 'rgba(70, 8, 16, 0.95)';
    bgGradEnd = 'rgba(40, 4, 8, 0.98)';
    borderColor = '#FF3D00'; // 亮红
    textColor = '#FFD54F';   // 刺眼金色文本，防视觉疲劳
    glowColor = 'rgba(255, 61, 0, 0.7)';
  } else {
    bgGradStart = 'rgba(0, 32, 54, 0.95)';
    bgGradEnd = 'rgba(0, 16, 32, 0.98)';
    borderColor = '#00E5FF'; // 亮青
    textColor = '#E0F7FA';   // 明亮白青色
    glowColor = 'rgba(0, 229, 255, 0.5)';
  }

  // 弹性落下动效：3秒定时器，前0.4秒做弹落
  var startY = 560;
  var targetY = 590;
  var boxY = targetY;
  var elapsed = 3.0 - timeLeft; // 已经过去的时间
  if (elapsed < 0.4) {
    var ratio = elapsed / 0.4;
    // 弹性公式
    var bounce = Math.sin(ratio * Math.PI * 1.35) * 0.3 + ratio * 0.7;
    boxY = startY + (targetY - startY) * bounce;
  }

  // 动态测量内容宽度以自适应提示框大小并居中
  ctx.font = 'bold 20px "Microsoft YaHei", Arial, sans-serif';
  var textW = ctx.measureText(text).width;
  var totalW = 24 + 10 + textW; // 图标宽度约24px + 间距10px + 文本宽度
  var boxW = Math.max(300, Math.min(540, totalW + 60)); // 自适应精致宽度，范围 300~540px
  var boxH = 64;
  var boxX = 360 - boxW / 2;

  // 绘制圆角科技切角框背景
  var ch = 12; // 切角
  ctx.beginPath();
  ctx.moveTo(boxX + ch, boxY);
  ctx.lineTo(boxX + boxW - ch, boxY);
  ctx.lineTo(boxX + boxW, boxY + ch);
  ctx.lineTo(boxX + boxW, boxY + boxH - ch);
  ctx.lineTo(boxX + boxW - ch, boxY + boxH);
  ctx.lineTo(boxX + ch, boxY + boxH);
  ctx.lineTo(boxX, boxY + boxH - ch);
  ctx.lineTo(boxX, boxY + ch);
  ctx.closePath();

  var bg = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  bg.addColorStop(0, bgGradStart);
  bg.addColorStop(1, bgGradEnd);
  ctx.fillStyle = bg;
  ctx.fill();

  // 霓虹发光边框
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 计算内容整体（图标+文字）在框内绝对居中的起始坐标
  var contentStartX = boxX + (boxW - totalW) / 2;

  // 警告符号图标
  if (isWarning) {
    ctx.fillStyle = '#FF3D00';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️', contentStartX + 12, boxY + boxH / 2);
  } else {
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', contentStartX + 12, boxY + boxH / 2);
  }

  // 通知文本
  ctx.fillStyle = textColor;
  ctx.font = 'bold 20px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, contentStartX + 24 + 10, boxY + boxH / 2 + 1);

  ctx.restore();
};

// ========== 预设 6 款赛车机甲风矢量头像程序化渲染 ==========
CraftingScene.prototype._drawVectorAvatar = function(ctx, avatarId, cx, cy, size) {
  ctx.save();

  // 底色：极富科幻质感的黑蓝色金属渐变背景
  var bgG = ctx.createRadialGradient(cx, cy, 1, cx, cy, size / 2);
  bgG.addColorStop(0, '#0a1d37');
  bgG.addColorStop(1, '#02050a');
  ctx.fillStyle = bgG;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // 默认机械外圈框（带炫青发光描边）
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();

  // 精细绘制跑车及战车高精度矢量图形
  var id = Math.max(0, Math.min(5, Math.floor(avatarId || 0)));
  switch (id) {
    case 0: // 🏎️ 未来超跑 (Hypercar - 俯视折线车影)
      ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#E0F7FA'; // 主车身
      
      // 绘制流线型赛车车身
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.38); // 前盖
      ctx.lineTo(cx + size * 0.12, cy - size * 0.22);
      ctx.lineTo(cx + size * 0.16, cy + size * 0.1);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.32); // 尾翼右
      ctx.lineTo(cx - size * 0.22, cy + size * 0.32); // 尾翼左
      ctx.lineTo(cx - size * 0.16, cy + size * 0.1);
      ctx.lineTo(cx - size * 0.12, cy - size * 0.22);
      ctx.closePath();
      ctx.fill();
      
      // 亮蓝色大灯
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(cx - size * 0.08, cy - size * 0.22, 2.5, 0, Math.PI*2);
      ctx.arc(cx + size * 0.08, cy - size * 0.22, 2.5, 0, Math.PI*2);
      ctx.fill();
      
      // 红色尾气火焰
      ctx.fillStyle = '#FF3D00';
      ctx.beginPath();
      ctx.moveTo(cx - size*0.06, cy + size*0.32);
      ctx.lineTo(cx, cy + size*0.44);
      ctx.lineTo(cx + size*0.06, cy + size*0.32);
      ctx.closePath();
      ctx.fill();
      break;

    case 1: // 🌀 喷气涡轮 (Turbo - 聚能气流)
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      // 内聚能环
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      
      // 旋转的涡轮叶片
      ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
      for (var a = 0; a < 8; a++) {
        var angle = a * Math.PI * 2 / 8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * size * 0.12, cy + Math.sin(angle) * size * 0.12);
        ctx.quadraticCurveTo(
          cx + Math.cos(angle + 0.3) * size * 0.32, cy + Math.sin(angle + 0.3) * size * 0.32,
          cx + Math.cos(angle + 0.45) * size * 0.36, cy + Math.sin(angle + 0.45) * size * 0.36
        );
        ctx.lineTo(cx + Math.cos(angle + 0.15) * size * 0.32, cy + Math.sin(angle + 0.15) * size * 0.32);
        ctx.closePath();
        ctx.fill();
      }
      
      // 白热化能量核心
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 2: // 🛡️ 重装泰坦 (Titan - 越野战车正面)
      ctx.fillStyle = '#90A4AE'; // 银灰色合金
      ctx.strokeStyle = '#37474F';
      ctx.lineWidth = 1.5;
      
      // 重甲前格栅
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.32, cy + size * 0.22);
      ctx.lineTo(cx - size * 0.28, cy - size * 0.15); // 左车灯角
      ctx.lineTo(cx, cy - size * 0.25); // 机盖
      ctx.lineTo(cx + size * 0.28, cy - size * 0.15); // 右车灯角
      ctx.lineTo(cx + size * 0.32, cy + size * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // 战车横向中网格
      ctx.fillStyle = '#263238';
      ctx.fillRect(cx - size * 0.18, cy + size * 0.04, size * 0.36, size * 0.12);
      
      // 战车顶置发光机枪口
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(cx - size*0.14, cy - size*0.22, 3, 0, Math.PI*2);
      ctx.arc(cx + size*0.14, cy - size*0.22, 3, 0, Math.PI*2);
      ctx.fill();
      break;

    case 3: // 🚀 极速氮气 (NOS - 速度线喷薄)
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      
      // 倾斜喷气管轮廓
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.16, cy + size * 0.05);
      ctx.lineTo(cx - size * 0.1, cy - size * 0.25);
      ctx.moveTo(cx + size * 0.1, cy - size * 0.25);
      ctx.lineTo(cx + size * 0.16, cy + size * 0.05);
      ctx.stroke();
      
      // 向下喷涌出深浅蓝渐变的氮气火光
      var nGrad = ctx.createLinearGradient(cx, cy - size*0.1, cx, cy + size*0.42);
      nGrad.addColorStop(0, '#FFFFFF');
      nGrad.addColorStop(0.3, '#00E5FF'); // 亮蓝
      nGrad.addColorStop(1, 'rgba(0,77,255,0)'); // 渐隐
      
      ctx.fillStyle = nGrad;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.18, cy);
      ctx.quadraticCurveTo(cx - size * 0.22, cy + size * 0.2, cx, cy + size * 0.42); // 喷气左翼
      ctx.quadraticCurveTo(cx + size * 0.22, cy + size * 0.2, cx + size * 0.18, cy);
      ctx.closePath();
      ctx.fill();
      break;

    case 4: // 🔫 狂暴加特林 (Gatling - 六管白热机炮)
      ctx.fillStyle = '#37474F';
      // 机炮大圆盘
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 六根转动枪管
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#FF3D00'; // 枪口红热描边
      ctx.lineWidth = 1;
      for (var j = 0; j < 6; j++) {
        var gAngle = j * Math.PI * 2 / 6;
        var gx = cx + Math.cos(gAngle) * size * 0.2;
        var gy = cy + Math.sin(gAngle) * size * 0.2;
        ctx.beginPath();
        ctx.arc(gx, gy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // 中心主弹轴
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 5: // 🪽 王牌赛翼 (Wings - 发光碳纤尾翼)
      ctx.strokeStyle = '#FF9800'; // 金色赛道翼描边
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 152, 0, 0.5)';
      ctx.shadowBlur = 8;
      
      // 碳纤维大尾翼
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.42, cy - size * 0.22);
      ctx.lineTo(cx - size * 0.24, cy - size * 0.12);
      ctx.lineTo(cx + size * 0.24, cy - size * 0.12);
      ctx.lineTo(cx + size * 0.42, cy - size * 0.22);
      ctx.lineTo(cx + size * 0.32, cy - size * 0.02);
      ctx.lineTo(cx - size * 0.32, cy - size * 0.02);
      ctx.closePath();
      ctx.stroke();
      
      // 尾翼支撑架
      ctx.strokeStyle = '#90A4AE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.15, cy - size * 0.1);
      ctx.lineTo(cx - size * 0.18, cy + size * 0.22);
      ctx.moveTo(cx + size * 0.15, cy - size * 0.1);
      ctx.lineTo(cx + size * 0.18, cy + size * 0.22);
      ctx.stroke();
      break;
  }

  ctx.restore();
};

// ========== 🎨 赛博机甲风全屏排行榜弹窗 UI 渲染 ==========
CraftingScene.prototype._renderRankPanel = function(ctx) {
  var W = 720, H = 1280;
  ctx.save();

  // 1. 半透明高品质灰黑科技遮罩背景
  ctx.fillStyle = 'rgba(3, 8, 18, 0.94)';
  ctx.fillRect(0, 0, W, H);

  // 2. 排行榜面板尺寸及定位
  var panelW = 640;
  var panelH = 1000;
  var px = (W - panelW) / 2;  // 40
  var py = (H - panelH) / 2; // 140
  var pch = 20; // 科技切角尺寸

  // ====== 3. 面板大底框（赛博朋克深蓝黑渐变+外发光） ======
  ctx.shadowColor = 'rgba(0, 180, 255, 0.3)';
  ctx.shadowBlur = 24;
  this._fillChamferRect(ctx, px, py, panelW, panelH, pch);
  ctx.shadowBlur = 0;

  var bgGrad = ctx.createLinearGradient(px, py, px, py + panelH);
  bgGrad.addColorStop(0, '#040d1a');
  bgGrad.addColorStop(0.5, '#02060b');
  bgGrad.addColorStop(1, '#010204');
  ctx.fillStyle = bgGrad;
  this._fillChamferRect(ctx, px, py, panelW, panelH, pch);

  // 炫彩双边框
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)'; // 更明亮的亮青发光
  this._strokeChamferRect(ctx, px, py, panelW, panelH, pch, 2);
  ctx.strokeStyle = 'rgba(0, 120, 200, 0.2)';
  this._strokeChamferRect(ctx, px + 3, py + 3, panelW - 6, panelH - 6, pch - 2, 1);

  // ====== 4. 四个角的“重装机甲防撞卡扣” (Armor Clamps) ======
  var corners = [
    { x: px - 4, y: py - 4, rot: 0 },
    { x: px + panelW + 4, y: py - 4, rot: Math.PI / 2 },
    { x: px + panelW + 4, y: py + panelH + 4, rot: Math.PI },
    { x: px - 4, y: py + panelH + 4, rot: -Math.PI / 2 }
  ];
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 3;
  corners.forEach(function(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(0, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();
    // 固定铆钉白点
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });

  // ====== 5. 赛车速度计/仪表盘发光底纹 (Dashboard Glow Ring) ======
  ctx.save();
  var dbCX = px + panelW / 2, dbCY = py + panelH * 0.42, dbR = 210;
  ctx.strokeStyle = 'rgba(255, 152, 0, 0.04)'; // 极弱橙色
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(dbCX, dbCY, dbR, 0, Math.PI * 2);
  ctx.stroke();
  
  // 外层圆点圈与散射刻度线
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.02)'; // 极弱青色
  ctx.setLineDash([4, 12]);
  ctx.beginPath();
  ctx.arc(dbCX, dbCY, dbR + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ====== 6. 右上角科技风关闭按钮 "X" ======
  var closeX = px + panelW - 55, closeY = py + 20, closeS = 36;
  this._closeBtnRect = { x: closeX, y: closeY, w: closeS, h: closeS };

  ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
  ctx.beginPath();
  ctx.rect(closeX, closeY, closeS, closeS);
  ctx.fill();
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(closeX + 11, closeY + 11); ctx.lineTo(closeX + closeS - 11, closeY + closeS - 11);
  ctx.moveTo(closeX + closeS - 11, closeY + 11); ctx.lineTo(closeX + 11, closeY + closeS - 11);
  ctx.stroke();

  // ====== 7. 双独立“动感倾斜平行四边形”页签 (Slanted Parallel Tabs) ======
  var tabW = 200, tabH = 46;
  var tabAY = py + 30;
  var tabAX = px + 80;
  var tabBX = px + 285;
  
  this._rankTabRects = {
    stage: { x: tabAX - 10, y: tabAY, w: tabW + 20, h: tabH },
    endless: { x: tabBX - 10, y: tabAY, w: tabW + 20, h: tabH }
  };

  if (typeof this._rankTab === 'undefined') this._rankTab = 'stage';

  // 绘制动感平行四边形页签的函数
  var drawSlantedTab = function(c, x, y, w, h, active, text) {
    c.save();
    var skew = 14; // 斜切度
    c.beginPath();
    c.moveTo(x + skew, y);
    c.lineTo(x + w + skew, y);
    c.lineTo(x + w - skew, y + h);
    c.lineTo(x - skew, y + h);
    c.closePath();
    
    if (active) {
      // 炽盛的火焰橙渐变
      var tabGrad = c.createLinearGradient(x, y, x, y + h);
      tabGrad.addColorStop(0, '#FF8F00');
      tabGrad.addColorStop(1, '#E65100');
      c.fillStyle = tabGrad;
      c.fill();
      c.strokeStyle = '#FFFFFF';
      c.lineWidth = 1.5;
      c.stroke();
    } else {
      c.fillStyle = 'rgba(15, 34, 56, 0.72)';
      c.fill();
      c.strokeStyle = 'rgba(0, 229, 255, 0.3)';
      c.lineWidth = 1;
      c.stroke();
    }
    
    c.fillStyle = active ? '#FFFFFF' : '#88AABF';
    c.font = 'bold 15px "Microsoft YaHei", Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x + w / 2, y + h / 2 + 1);
    c.restore();
  };

  drawSlantedTab(ctx, tabAX, tabAY, tabW, tabH, this._rankTab === 'stage', '关卡排行榜');
  drawSlantedTab(ctx, tabBX, tabAY, tabW, tabH, this._rankTab === 'endless', '无尽模式榜');

  // ====== 8. 排行榜列表渲染 (前10名，动感平行四边形卡槽) ======
  var list = this._rankTab === 'stage' 
    ? this.state.getStageLeaderboard() 
    : this.state.getEndlessLeaderboard();

  var listStartY = py + 102;
  var rowH = 55;

  for (var i = 0; i < 10; i++) {
    var item = list[i];
    var rowY = listStartY + i * rowH;
    var rank = i + 1;

    // 绘制倾斜平行四边形条目卡槽的函数
    var drawRowCard = function(c, rx, ry, rw, rh, isPlayer, rowIdx) {
      var rSkew = 12; // 条目斜切度
      c.beginPath();
      c.moveTo(rx + rSkew, ry);
      c.lineTo(rx + rw, ry);
      c.lineTo(rx + rw - rSkew, ry + rh - 6);
      c.lineTo(rx, ry + rh - 6);
      c.closePath();

      if (isPlayer) {
        c.fillStyle = 'rgba(255, 143, 0, 0.12)'; // 暖橙高亮底色
        c.fill();
        c.strokeStyle = '#FF8F00';
        c.lineWidth = 1.5;
        c.save();
        c.shadowColor = 'rgba(255, 143, 0, 0.45)';
        c.shadowBlur = 8;
        c.stroke();
        c.restore();
      } else {
        c.fillStyle = (rowIdx % 2 === 0) ? 'rgba(15, 34, 56, 0.3)' : 'rgba(8, 17, 30, 0.45)';
        c.fill();
        c.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        c.lineWidth = 1;
        c.stroke();
      }
    };

    drawRowCard(ctx, px + 25, rowY, panelW - 50, rowH, item && item.isPlayer, i);

    if (!item) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.font = 'italic 13px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('期待车神登顶...', px + panelW / 2, rowY + rowH / 2 - 3);
      continue;
    }

    // B. 绘制前三名“高能发光金属盾牌”徽章
    var medalCX = px + 62, medalCY = rowY + rowH / 2 - 3;
    if (rank <= 3) {
      ctx.save();
      // 绘制五边形精美盾牌
      ctx.beginPath();
      ctx.moveTo(medalCX, medalCY - 13);
      ctx.lineTo(medalCX + 12, medalCY - 6);
      ctx.lineTo(medalCX + 8, medalCY + 11);
      ctx.lineTo(medalCX, medalCY + 14);
      ctx.lineTo(medalCX - 8, medalCY + 11);
      ctx.lineTo(medalCX - 12, medalCY - 6);
      ctx.closePath();

      var mColor, mGlow;
      if (rank === 1) { mColor = '#FFD700'; mGlow = 'rgba(255, 215, 0, 0.75)'; }
      else if (rank === 2) { mColor = '#ECEFF1'; mGlow = 'rgba(200, 220, 240, 0.6)'; }
      else { mColor = '#CD7F32'; mGlow = 'rgba(205, 127, 50, 0.5)'; }

      ctx.shadowColor = mGlow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = mColor;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 写上白色或黑色数字
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(rank, medalCX, medalCY + 1);
      ctx.restore();
    } else {
      // 4~10名极简圆环
      ctx.fillStyle = '#1b2f46';
      ctx.beginPath(); ctx.arc(medalCX, medalCY, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#374f66';
      ctx.stroke();
      ctx.fillStyle = '#88AABF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(rank, medalCX, medalCY + 1);
    }

    // C. 绘制头像
    var avCX = px + 112, avCY = rowY + rowH / 2 - 3;
    this._drawVectorAvatar(ctx, item.avatar, avCX, avCY, 34);

    // D. 绘制名字
    ctx.fillStyle = item.isPlayer ? '#FFD54F' : '#E0F7FA';
    ctx.font = 'bold 15px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var dispName = item.name;
    if (item.isPlayer) dispName += ' (我)';
    ctx.fillText(dispName, px + 146, rowY + rowH / 2 - 2);

    // E. 绘制分数
    var scoreText = (this._rankTab === 'stage') ? '通关 ' + item.score + ' 关' : item.score + ' m';
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(scoreText, px + panelW - 55, rowY + rowH / 2 - 2);
  }

  // ====== 9. 底部常驻：玩家专属资料极速编辑卡片 ======
  var editY = py + 675;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 25, editY);
  ctx.lineTo(px + panelW - 25, editY);
  ctx.stroke();

  // 底部资料大背景（斜切面金属外壳风格）
  ctx.fillStyle = 'rgba(10, 25, 48, 0.65)';
  this._fillChamferRect(ctx, px + 25, editY + 12, panelW - 50, panelH - (editY - py) - 34, 12);
  ctx.strokeStyle = 'rgba(255, 152, 0, 0.35)'; // 金黄色外框
  this._strokeChamferRect(ctx, px + 25, editY + 12, panelW - 50, panelH - (editY - py) - 34, 12, 1.5);

  // 玩家大头像
  var pAvCX = px + 80, pAvCY = editY + 70;
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pAvCX, pAvCY, 34, 0, Math.PI * 2); ctx.stroke();
  this._drawVectorAvatar(ctx, this.state.get('playerAvatar'), pAvCX, pAvCY, 64);

  // 玩家大名字
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 24px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.state.get('playerName') || '狂暴车神', px + 138, editY + 48);

  // 副标题描述
  ctx.fillStyle = '#88AABF';
  ctx.font = '12px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText('点击下方头像一键更换，或点击右侧按钮点火起名', px + 138, editY + 80);

  // 🚀 LAUNCH 启动起名按钮 (橙红色拉风启动键)
  var rNameX = px + panelW - 195, rNameY = editY + 36, rNameW = 145, rNameH = 48;
  this._randomNameBtnRect = { x: rNameX, y: rNameY, w: rNameW, h: rNameH };

  var rGrad = ctx.createLinearGradient(rNameX, rNameY, rNameX, rNameY + rNameH);
  rGrad.addColorStop(0, '#FF3D00'); // 亮火红
  rGrad.addColorStop(1, '#DD2C00');
  ctx.fillStyle = rGrad;
  
  ctx.save();
  ctx.shadowColor = 'rgba(255, 61, 0, 0.55)';
  ctx.shadowBlur = 10;
  this._fillChamferRect(ctx, rNameX, rNameY, rNameW, rNameH, 6);
  ctx.restore();
  
  ctx.strokeStyle = '#FFFFFF';
  this._strokeChamferRect(ctx, rNameX, rNameY, rNameW, rNameH, 6, 1.5);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAUNCH 🚀', rNameX + rNameW / 2, rNameY + rNameH / 2 + 1);

  // 头像选择列表网格一字排开
  var avGridY = editY + 124;
  var avBoxSize = 48;
  var avBoxGap = 16;
  var avGridStartX = px + 138;
  this._avatarGridRects = [];

  for (var k = 0; k < 6; k++) {
    var avBoxX = avGridStartX + k * (avBoxSize + avBoxGap);
    this._avatarGridRects.push({ x: avBoxX, y: avGridY, w: avBoxSize, h: avBoxSize, avatarId: k });

    var isSel = (this.state.get('playerAvatar') === k);
    if (isSel) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
      this._fillChamferRect(ctx, avBoxX, avGridY, avBoxSize, avBoxSize, 6);
      ctx.strokeStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 8;
      this._strokeChamferRect(ctx, avBoxX, avGridY, avBoxSize, avBoxSize, 6, 2);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#102236';
      this._fillChamferRect(ctx, avBoxX, avGridY, avBoxSize, avBoxSize, 6);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      this._strokeChamferRect(ctx, avBoxX, avGridY, avBoxSize, avBoxSize, 6, 1);
    }

    this._drawVectorAvatar(ctx, k, avBoxX + avBoxSize / 2, avGridY + avBoxSize / 2, 38);
  }

  ctx.restore();
};

// ========== 📊 排行榜交互点击与资料快速修改处理 ==========
CraftingScene.prototype._handleRankClick = function(pos) {
  var inRect = function(r) { return r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h; };

  // 1. 关闭按钮 "X" 点击
  if (inRect(this._closeBtnRect)) {
    this._rankOpen = false;
    if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
    return;
  }

  // 2. 标签切换点击
  if (this._rankTabRects) {
    if (inRect(this._rankTabRects.stage) && this._rankTab !== 'stage') {
      this._rankTab = 'stage';
      if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
      return;
    }
    if (inRect(this._rankTabRects.endless) && this._rankTab !== 'endless') {
      this._rankTab = 'endless';
      if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
      return;
    }
  }

  // 3. 🎲 随机昵称按钮点击
  if (inRect(this._randomNameBtnRect)) {
    if (this.state && this.state.randomizeName) {
      this.state.randomizeName();
      if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
    }
    return;
  }

  // 4. 头像微风格子一键选用网格点击
  if (this._avatarGridRects) {
    for (var i = 0; i < this._avatarGridRects.length; i++) {
      var av = this._avatarGridRects[i];
      if (inRect(av)) {
        if (this.state && this.state.setAvatar) {
          this.state.setAvatar(av.avatarId);
          if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
        }
        return;
      }
    }
  }
};

// ========== 交互处理 ==========
CraftingScene.prototype._onTouchStart = function(pos) {
  // 排行榜弹窗打开时拦截所有点击（最优先）
  if (this._rankOpen) {
    this._handleRankClick(pos);
    return;
  }
  // 无人机编辑器弹窗拦截
  if (this._droneOpen) {
    this._handleDroneClick(pos);
    return;
  }
  // 商店弹窗打开时拦截所有点击
  if (this._shopOpen) {
    this._handleShopClick(pos);
    return;
  }
  var slotIndex = this._hitTestSlot(pos.x, pos.y);
  if (slotIndex !== -1 && this.state.getSlot(slotIndex)) {
    this.dragging = { slotIndex: slotIndex };
    this.dragX = pos.x;
    this.dragY = pos.y;
    return;
  }
  // 购车按钮长按检测：记录按下时间和位置，update()里检测是否触发长按
  var L = this.layout;
  if (pos.x >= L.buyBtn.x && pos.x <= L.buyBtn.x + L.buyBtn.w &&
      pos.y >= L.buyBtn.y && pos.y <= L.buyBtn.y + L.buyBtn.h) {
    this._buyHoldStart = Date.now();
    this._buyHoldTriggered = false;
    this._buyHoldPos = { x: pos.x, y: pos.y };
    this._buyBtnPressed = true;  // 视觉反馈：按下感
    return;
  }
  this._handleButtonClick(pos);
};

CraftingScene.prototype._onTouchMove = function(pos) {
  if (this.dragging !== null) {
    this.dragX = pos.x;
    this.dragY = pos.y;
  }
};

CraftingScene.prototype._onTouchEnd = function(pos) {
  // 处理购车按钮抬起
  if (this._buyHoldStart > 0) {
    var heldMs = Date.now() - this._buyHoldStart;
    this._buyHoldStart = 0;
    var startPos = this._buyHoldPos;
    this._buyHoldPos = null;
    this._buyBtnPressed = false;  // 清除按下状态
    // 长按已触发(已经进入自动购买模式)：本次抬起不做单次购买
    if (this._buyHoldTriggered) {
      this._buyHoldTriggered = false;
      return;
    }
    // 短按
    var L = this.layout;
    var stillInButton = pos.x >= L.buyBtn.x && pos.x <= L.buyBtn.x + L.buyBtn.w &&
                        pos.y >= L.buyBtn.y && pos.y <= L.buyBtn.y + L.buyBtn.h;
    if (!stillInButton) return;  // 滑出了不做任何操作
    // 触发点击闪光反馈（短暂的青色闪光）
    this._buyClickFlashTimer = 0.25;
    if (this._buyAutoMode) {
      // 处于自动购买状态：再点一下取消
      this._buyAutoMode = false;
      this._buyAutoTimer = 0;
      this.showNotification('已停止自动购买');
    } else {
      // 普通单次购买
      this._buyCarOnce();
    }
    // 播放点击音效
    if (window.AudioManager && window.AudioManager.click) {
      window.AudioManager.click();
    }
    return;
  }

  if (this.dragging === null) return;
  // 合成动画中禁止操作
  if (this.mergeAnim) { this.dragging = null; return; }
  var srcIndex = this.dragging.slotIndex;
  var targetSlot = this._hitTestSlot(pos.x, pos.y);
  this.dragging = null;
  var srcCar = this.state.getSlot(srcIndex);
  if (!srcCar) return;

  // 有目标slot
  if (targetSlot !== -1 && targetSlot !== srcIndex) {
    var dstCar = this.state.getSlot(targetSlot);
    if (dstCar && srcCar.level === dstCar.level) {
      this._startMergeAnim(targetSlot, srcIndex, srcCar.level);
      return;
    } else if (!dstCar) {
      this.state.setSlot(targetSlot, srcCar);
      this.state.setSlot(srcIndex, null);
      this._selectedSlot = -1;
      return;
    } else {
      this._selectedSlot = targetSlot;
      return;
    }
  }

  // 点在同一辆车上
  if (targetSlot === srcIndex) {
    if (this._selectedSlot === -1) {
      this._selectedSlot = srcIndex;
    } else if (this._selectedSlot === srcIndex) {
      this._selectedSlot = -1;
    } else {
      var carA = this.state.getSlot(this._selectedSlot);
      var carB = this.state.getSlot(srcIndex);
      if (carA && carB && carA.level === carB.level) {
        this._startMergeAnim(this._selectedSlot, srcIndex, carB.level);
      }
      this._selectedSlot = -1;
    }
    return;
  }
};

CraftingScene.prototype._hitTestSlot = function(x, y) {
  var L = this.layout;
  for (var i = 0; i < 12; i++) {
    var row = Math.floor(i / L.slotCols);
    var col = i % L.slotCols;
    var sx = L.slotsStart.x + col * (L.slotSize.w + L.slotGap);
    var sy = L.slotsStart.y + row * (L.slotSize.h + L.slotGap);
    if (x >= sx && x <= sx + L.slotSize.w && y >= sy && y <= sy + L.slotSize.h) return i;
  }
  return -1;
};


/** 单次购买车辆（供短按和自动购买共用） */
CraftingScene.prototype._buyCarOnce = function() {
  var now = Date.now();
  if (now - this._lastBuyTime < 100) return false;
  this._lastBuyTime = now;
  var result = this.state.buyCar();
  if (result.success) {
    // 自动购买时不显示气泡通知（避免刷屏）
    if (!this._buyAutoMode) {
      this.showNotification('购买成功! 花费 ' + this._formatNumber(result.price) + ' 金币');
    }
    return true;
  } else if (result.reason === 'no_coins') {
    this.showNotification('金币不足!');
    // 自动购买时金币不足→自动停止
    if (this._buyAutoMode) {
      this._buyAutoMode = false;
      this._buyAutoTimer = 0;
    }
    return false;
  } else if (result.reason === 'no_slot') {
    this.showNotification('槽位已满!');
    if (this._buyAutoMode) {
      this._buyAutoMode = false;
      this._buyAutoTimer = 0;
    }
    return false;
  }
  return false;
};

/** 触发购车动画：按钮闪光 + 金币粒子从按钮飞向落入的槽位 */
CraftingScene.prototype._triggerBuyAnim = function(slotIndex) {
  this._buyAnimTimer = this._buyAnimDuration;
  // 起点：购车按钮中心
  var L = this.layout;
  var startX = L.buyBtn.x + L.buyBtn.w / 2;
  var startY = L.buyBtn.y + L.buyBtn.h / 2;
  // 终点：新车的槽位中心
  var slotX = L.slotsStart.x, slotY = L.slotsStart.y;
  var col = (slotIndex != null && slotIndex >= 0) ? slotIndex % L.slotCols : 0;
  var row = (slotIndex != null && slotIndex >= 0) ? Math.floor(slotIndex / L.slotCols) : 0;
  var endX = slotX + col * (L.slotSize.w + L.slotGap) + L.slotSize.w / 2;
  var endY = slotY + row * (L.slotSize.h + L.slotGap) + L.slotSize.h / 2;
  // 生成 8~10 颗金币粒子
  if (!this._buyCoinParticles) this._buyCoinParticles = [];
  var n = 8;
  for (var i = 0; i < n; i++) {
    this._buyCoinParticles.push({
      x: startX + (Math.random() - 0.5) * 30,
      y: startY + (Math.random() - 0.5) * 16,
      tx: endX,
      ty: endY,
      delay: i * 0.04,
      age: 0,
      life: 0.42 + Math.random() * 0.08,
      r: 6 + Math.random() * 3,
    });
  }
};

/** 渲染购车金币粒子（从按钮飞到槽位的曲线轨迹） */
CraftingScene.prototype._renderBuyCoinParticles = function(ctx) {
  ctx.save();
  for (var i = 0; i < this._buyCoinParticles.length; i++) {
    var par = this._buyCoinParticles[i];
    if (par.delay > 0) continue;
    var t = Math.min(1, par.age / par.life);
    // 抛物线插值（中间高，模拟轻微上抛）
    var ease = t;
    var cx = par.x + (par.tx - par.x) * ease;
    var cy = par.y + (par.ty - par.y) * ease - Math.sin(t * Math.PI) * 35;
    var alpha = 1 - t * 0.35;
    var r = par.r * (1 - t * 0.3);
    // 外发光
    ctx.shadowColor = '#FFD54F';
    ctx.shadowBlur = 14;
    // 金币圆（三层渐变）
    var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,250,200,' + alpha + ')');
    grad.addColorStop(0.5, 'rgba(255,193,7,' + alpha + ')');
    grad.addColorStop(1, 'rgba(255,143,0,' + alpha + ')');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // 中心 ¥ 符号
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(140,80,0,' + alpha + ')';
    ctx.font = 'bold ' + Math.floor(r * 1.3) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + 1);
  }
  ctx.restore();
};

/** 触发胜利返回金币飞入动画 */
CraftingScene.prototype.triggerCoinsFlyIn = function(startX, startY, count) {
  if (!this._victoryCoinParticles) this._victoryCoinParticles = [];
  var n = count || 15;
  var targetX = 33;  // 金币余额图标终点 X
  var targetY = 23;  // 金币余额图标终点 Y
  for (var i = 0; i < n; i++) {
    this._victoryCoinParticles.push({
      x: startX + (Math.random() - 0.5) * 50,
      y: startY + (Math.random() - 0.5) * 50,
      tx: targetX,
      ty: targetY,
      delay: i * 0.05, // 有层次地分批起飞
      age: 0,
      life: 0.72 + Math.random() * 0.15,
      r: 8 + Math.random() * 3,
    });
  }
};

/** 渲染并更新胜利返回的金币飞入粒子（从屏幕中央抛物线飞向左上角余额） */
CraftingScene.prototype._renderVictoryCoinParticles = function(ctx) {
  if (!this._victoryCoinParticles || this._victoryCoinParticles.length === 0) return;
  var dt = this.engine ? this.engine.deltaTime : 0.016;
  ctx.save();
  for (var i = this._victoryCoinParticles.length - 1; i >= 0; i--) {
    var par = this._victoryCoinParticles[i];
    if (par.delay > 0) {
      par.delay -= dt;
      continue;
    }
    par.age += dt;
    var t = Math.min(1, par.age / par.life);
    if (t >= 1) {
      // 飞到终点：触发加金币余额视觉反馈并播放清脆叮音（节流防音爆）
      this._coinScoreScale = 1.35;
      if (!this._lastCoinSoundTime || Date.now() - this._lastCoinSoundTime > 60) {
        if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
        this._lastCoinSoundTime = Date.now();
      }
      this._victoryCoinParticles.splice(i, 1);
      continue;
    }

    // 飞行动画：向左上方抛出曲线
    var ease = t * t; // 加速飞入
    var cx = par.x + (par.tx - par.x) * ease;
    // 抛物线：向上拱起一部分
    var cy = par.y + (par.ty - par.y) * ease - Math.sin(t * Math.PI) * 90;
    var alpha = 1 - t * 0.2;
    var r = par.r * (1 - t * 0.4);

    // 绘制硬币（带耀眼金色渐变和外发光）
    ctx.shadowColor = '#FFD54F';
    ctx.shadowBlur = 12;
    var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,250,220,' + alpha + ')');
    grad.addColorStop(0.5, 'rgba(255,193,7,' + alpha + ')');
    grad.addColorStop(1, 'rgba(255,143,0,' + alpha + ')');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 硬币中央绘制 '$' 符号
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(140,80,0,' + alpha + ')';
    ctx.font = 'bold ' + Math.floor(r * 1.35) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + 1);
  }
  ctx.restore();
};

CraftingScene.prototype._handleButtonClick = function(pos) {
  var L = this.layout;
  var inRect = function(r) { return r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h; };

  // 功能按钮行
  if (inRect(L.autoCraftBtn)) {
    this.state.set('autoCraft', !this.state.get('autoCraft'));
  } else if (inRect(L.stageBtn)) {
    if (this.state.get('remainingChallenges') > 0) {
      this.state.useChallenge();
      this.state.set('gameMode', 'stage');
      this.engine.switchScene('battle');
    } else {
      this.showNotification('今日闯关次数已用完');
    }
  } else if (inRect(L.raceBtn)) {
    this.state.set('gameMode', 'endless');
    this.engine.switchScene('battle');
  }

  // 左侧按钮（已精简净化，仅保留排行榜）
  else if (inRect(L.rankBtn)) {
    this._rankOpen = true;
    if (window.AudioManager && window.AudioManager.click) window.AudioManager.click();
  }

  // 右侧按钮
  else if (inRect(L.luckyBtn)) {
    this.showNotification('幸运转盘(开发中)');
  } else if (inRect(L.coinBtn)) {
    this.showNotification('金币获取(开发中)');
  } else if (inRect(L.ultimateBtn)) {
    this.showNotification('终极挑战(开发中)');
  }

  // 底部按钮
  // 购车按钮已由 _onTouchStart/_onTouchEnd 单独处理（支持长按自动购买）
  else if (inRect(L.shopBtn)) {
    this._shopOpen = true;
  } else if (inRect(L.droneBtn)) {
    this._droneOpen = true;
    // 从state读取装备状态（保持持久化）
    if (this.state && this.state.get) {
      this._droneEquipped = !!this.state.get('droneEquipped');
    }
  }
};

CraftingScene.prototype._updateMergeHints = function() {
  var hints = [];
  var levelMap = {};
  for (var i = 0; i < 12; i++) {
    var car = this.state.getSlot(i);
    if (!car) continue;
    if (!levelMap[car.level]) levelMap[car.level] = [];
    levelMap[car.level].push(i);
  }
  for (var lvl in levelMap) {
    if (levelMap[lvl].length >= 2) {
      for (var j = 0; j < levelMap[lvl].length; j++) hints.push(levelMap[lvl][j]);
    }
  }
  this.mergeHintSlots = hints;
};

CraftingScene.prototype.showNotification = function(text) {
  this.notification = text;
  this.notificationTimer = 2;
};

// ========== 合成动画系统 ==========

/** 启动合成动画（slotA保留新车的位置, slotB是被消耗的） */
CraftingScene.prototype._startMergeAnim = function(slotA, slotB, level) {
  // 触发合成音效
  if (window.AudioManager) window.AudioManager.merge();
  var L = this.layout;
  var getSlotCenter = function(idx) {
    var row = Math.floor(idx / L.slotCols);
    var col = idx % L.slotCols;
    var sx = L.slotsStart.x + col * (L.slotSize.w + L.slotGap) + L.slotSize.w / 2;
    var sy = L.slotsStart.y + row * (L.slotSize.h + L.slotGap) + L.slotSize.h / 2;
    return { x: sx, y: sy };
  };
  var posA = getSlotCenter(slotA);
  var posB = getSlotCenter(slotB);

  this.mergeAnim = {
    slotA: slotA,
    slotB: slotB,
    level: level,
    newLevel: level + 1,
    posA: posA,
    posB: posB,
    // 目标位置 = slotA（最终新车出现的位置）
    tx: posA.x,
    ty: posA.y,
    phase: 1,       // 1=合并冲撞 2=新车弹出
    timer: 0.28,
    notified: false,
  };
  this._selectedSlot = -1;
};

/** 获取合成动画当前阶段进度(0~1) */
CraftingScene.prototype._mergePhaseProgress = function() {
  var a = this.mergeAnim;
  if (!a) return 0;
  var durations = [0.28, 0.32];  // 简化为2阶段, 总时长0.6s
  var total = durations[a.phase - 1];
  return Math.max(0, Math.min(1, 1 - a.timer / total));
};

/** 渲染合成动画 */
CraftingScene.prototype._renderMergeAnim = function(ctx) {
  var a = this.mergeAnim;
  if (!a) return;
  var p = this._mergePhaseProgress();
  var tx = a.tx, ty = a.ty;
  var L = this.layout;
  var carW = L.slotSize.w - 8;
  var carH = L.slotSize.h - 40;

  ctx.save();

  if (a.phase === 1) {
    // ===== 阶段1：两车快速冲向中心 + 即将碰撞的能量光晕（0.28s） =====
    var ease = 1 - Math.pow(1 - p, 2.5);  // easeOutQuad+
    // 两车都向中心(tx,ty)冲
    var ax = a.posA.x + (tx - a.posA.x) * ease;
    var ay = a.posA.y + (ty - a.posA.y) * ease;
    var bx = a.posB.x + (tx - a.posB.x) * ease;
    var by = a.posB.y + (ty - a.posB.y) * ease;

    // 中心能量聚焦（随p增长）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var coreR = 8 + p * 35;
    var coreA = p * 0.85;
    var cg = ctx.createRadialGradient(tx, ty, 0, tx, ty, coreR);
    cg.addColorStop(0, 'rgba(255,255,255,' + coreA + ')');
    cg.addColorStop(0.4, 'rgba(255,220,100,' + (coreA * 0.7) + ')');
    cg.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(tx, ty, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 两车（速度线拖尾）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [{x: a.posA.x, y: a.posA.y, ex: ax, ey: ay},
     {x: a.posB.x, y: a.posB.y, ex: bx, ey: by}].forEach(function(seg) {
      var dx = seg.ex - seg.x, dy = seg.ey - seg.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      var nx = -dy / len, ny = dx / len;
      var trailG = ctx.createLinearGradient(seg.x, seg.y, seg.ex, seg.ey);
      trailG.addColorStop(0, 'rgba(0,229,255,0)');
      trailG.addColorStop(1, 'rgba(0,229,255,' + (0.5 * p) + ')');
      ctx.strokeStyle = trailG;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x, seg.y);
      ctx.lineTo(seg.ex, seg.ey);
      ctx.stroke();
    });
    ctx.restore();

    // 渲染两辆车
    ctx.save();
    ctx.translate(ax, ay);
    this._renderCarInSlot(ctx, -carW / 2, -carH / 2, carW, carH, a.level, false, false);
    ctx.restore();
    ctx.save();
    ctx.translate(bx, by);
    this._renderCarInSlot(ctx, -carW / 2, -carH / 2, carW, carH, a.level, false, true);
    ctx.restore();

  } else if (a.phase === 2) {
    // ===== 阶段2：金光环爆裂 + 新车从0缩放反弹弹出（0.32s） =====
    // 弹簧曲线 - 先放大到1.2再回到1.0
    var bounce;
    if (p < 0.5) {
      // 0~0.5: 0 -> 1.2 (放大)
      var b1 = p / 0.5;
      bounce = b1 * 1.2;
    } else {
      // 0.5~1: 1.2 -> 1.0 (回弹)
      var b2 = (p - 0.5) / 0.5;
      bounce = 1.2 - b2 * 0.2;
    }

    // 金色冲击波环（向外扩散，前60%可见）
    if (p < 0.6) {
      var ringP = p / 0.6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // 主环
      var ringR1 = 30 + ringP * 110;
      var ringA1 = (1 - ringP) * 0.85;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255,220,100,' + ringA1 + ')';
      ctx.lineWidth = Math.max(0.5, (1 - ringP) * 5);
      ctx.beginPath();
      ctx.arc(tx, ty, ringR1, 0, Math.PI * 2);
      ctx.stroke();
      // 第二层青色环（晚一点）
      if (ringP > 0.15) {
        var ringP2 = (ringP - 0.15) / 0.85;
        var ringR2 = 25 + ringP2 * 85;
        var ringA2 = (1 - ringP2) * 0.6;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(0,229,255,' + ringA2 + ')';
        ctx.lineWidth = Math.max(0.5, (1 - ringP2) * 3);
        ctx.beginPath();
        ctx.arc(tx, ty, ringR2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 中心闪光（前40%消散）
    if (p < 0.4) {
      var flashP = p / 0.4;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var flashR = 50 - flashP * 30;
      var flashA = (1 - flashP) * 0.95;
      var fg = ctx.createRadialGradient(tx, ty, 0, tx, ty, flashR);
      fg.addColorStop(0, 'rgba(255,255,255,' + flashA + ')');
      fg.addColorStop(0.5, 'rgba(255,240,180,' + (flashA * 0.6) + ')');
      fg.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(tx, ty, flashR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8 颗放射状星屑（向外飞）
    if (p < 0.7) {
      var sP = p / 0.7;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var ki = 0; ki < 8; ki++) {
        var ka = (Math.PI * 2 / 8) * ki;
        var kr = 20 + sP * 80;
        var kx = tx + Math.cos(ka) * kr;
        var ky = ty + Math.sin(ka) * kr;
        var ksz = 4 * (1 - sP);
        var kAlpha = (1 - sP) * 0.9;
        if (ksz > 0.5) {
          var kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, ksz * 2.5);
          kg.addColorStop(0, 'rgba(255,255,200,' + kAlpha + ')');
          kg.addColorStop(0.5, 'rgba(255,180,80,' + (kAlpha * 0.6) + ')');
          kg.addColorStop(1, 'rgba(255,80,0,0)');
          ctx.fillStyle = kg;
          ctx.beginPath();
          ctx.arc(kx, ky, ksz * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 新车（弹簧缩放出现）
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(bounce, bounce);
    this._renderCarInSlot(ctx, -carW / 2, -carH / 2, carW, carH, a.newLevel, false, false);
    ctx.restore();

    // "LV.X" 金色标签飞起（30%~80%）
    if (p > 0.2 && p < 0.85) {
      var textP = (p - 0.2) / 0.65;
      var textY = ty - 20 - textP * 60;
      var textAlpha = textP < 0.15 ? textP / 0.15 : (1 - (textP - 0.15) / 0.85);
      textAlpha = Math.max(0, Math.min(1, textAlpha));

      ctx.save();
      ctx.translate(tx, textY);
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.globalAlpha = textAlpha;
      ctx.strokeText('LV.' + a.newLevel, 0, 0);
      var grad = ctx.createLinearGradient(0, -16, 0, 16);
      grad.addColorStop(0, '#FFEE88');
      grad.addColorStop(0.5, '#FFD700');
      grad.addColorStop(1, '#FF9800');
      ctx.fillStyle = grad;
      ctx.fillText('LV.' + a.newLevel, 0, 0);
      ctx.restore();
    }

    // 通知
    if (!a.notified && p > 0.1) {
      this.showNotification('合成成功! LV.' + a.newLevel);
      a.notified = true;
    }
  }

  ctx.restore();
};

// ========== 商店弹窗系统（效果图v2 — 赛博朋克风）==========

/** 绘制切角矩形路径（用于复用） */
CraftingScene.prototype._drawChamferRect = function(ctx, x, y, w, h, ch) {
  if (!ch) ch = 10;
  ctx.beginPath();
  ctx.moveTo(x + ch, y);
  ctx.lineTo(x + w - ch, y);
  ctx.lineTo(x + w, y + ch);
  ctx.lineTo(x + w, y + h - ch);
  ctx.lineTo(x + w - ch, y + h);
  ctx.lineTo(x + ch, y + h);
  ctx.lineTo(x, y + h - ch);
  ctx.lineTo(x, y + ch);
  ctx.closePath();
};

/** 填充切角矩形 */
CraftingScene.prototype._fillChamferRect = function(ctx, x, y, w, h, ch) {
  this._drawChamferRect(ctx, x, y, w, h, ch);
  ctx.fill();
};

/** 描边切角矩形 */
CraftingScene.prototype._strokeChamferRect = function(ctx, x, y, w, h, ch, lw) {
  if (!lw) lw = 1;
  this._drawChamferRect(ctx, x, y, w, h, ch);
  ctx.lineWidth = lw;
  ctx.stroke();
};

CraftingScene.prototype._renderShopPanel = function(ctx) {
  var W = 720, H = 1280;
  ctx.save();

  // 遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, W, H);

  // 面板尺寸
  var panelW = 640;
  var panelH = 960;
  var px = (W - panelW) / 2;   // 40
  var py = (H - panelH) / 2;  // 160
  var pch = 20; // 面板切角

  // ====== 面板背景：深色赛博朋克渐变+外发光 ======
  // 外发光层
  ctx.shadowColor = 'rgba(0,180,255,0.25)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  this._fillChamferRect(ctx, px, py, panelW, panelH, pch);
  ctx.shadowBlur = 0;

  var bgGrad = ctx.createLinearGradient(px, py, px, py + panelH);
  bgGrad.addColorStop(0, '#0a1628');
  bgGrad.addColorStop(0.4, '#08101c');
  bgGrad.addColorStop(1, '#050a10');
  ctx.fillStyle = bgGrad;
  this._fillChamferRect(ctx, px, py, panelW, panelH, pch);

  // 面板边框（双层：外亮内暗）
  ctx.strokeStyle = 'rgba(0,180,255,0.5)';
  this._strokeChamferRect(ctx, px, py, panelW, panelH, pch, 2);
  ctx.strokeStyle = 'rgba(0,140,200,0.15)';
  this._strokeChamferRect(ctx, px + 3, py + 3, panelW - 6, panelH - 6, pch - 2, 1);

  // ====== 标题栏区域 ======
  var titleY = py + 46;

  // 左侧装饰斜线 ///
  ctx.save();
  ctx.strokeStyle = 'rgba(0,200,255,0.7)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  var slX = px + 70;
  for (var si = 0; si < 3; si++) {
    ctx.beginPath();
    ctx.moveTo(slX + si * 12, titleY - 8);
    ctx.lineTo(slX + si * 12 + 6, titleY + 4);
    ctx.stroke();
  }
  ctx.restore();

  // 标题 "商 店"
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#E0F7FF';
  ctx.font = 'bold 34px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('商 店', W / 2, titleY);
  ctx.shadowBlur = 0;

  // 右侧装饰斜线 ///
  ctx.save();
  ctx.strokeStyle = 'rgba(0,200,255,0.7)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  var srX = W / 2 + 55;
  for (var sj = 0; sj < 3; sj++) {
    ctx.beginPath();
    ctx.moveTo(srX + sj * 12, titleY - 8);
    ctx.lineTo(srX + sj * 12 + 6, titleY + 4);
    ctx.stroke();
  }
  ctx.restore();

  // 关闭按钮 ✕（右上角，圆形背景）
  var closeR = 20;
  var closeX = px + panelW - 36;
  var closeY = titleY;
  ctx.beginPath();
  ctx.arc(closeX, closeY, closeR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,160,220,0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,200,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#80D8FF';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeX, closeY + 1);
  this._shopCloseBtn = { x: closeX - closeR, y: closeY - closeR, w: closeR * 2, h: closeR * 2 };

  // ====== 副标题 + 金币显示行 ======
  var subY = titleY + 38;

  // 左侧金币
  var coins = this.state.get('coins') || 0;
  // 金币图标（圆角方形风格）
  ctx.save();
  ctx.beginPath();
  this._drawRoundRectPath(ctx, px + 22, subY - 11, 22, 22, 5);
  ctx.fillStyle = '#FFB300';
  ctx.fill();
  ctx.fillStyle = '#8B6914';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', px + 33, subY + 1);
  ctx.restore();
  // 金币数值
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 19px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(this._formatNumber(coins), px + 50, subY);

  // 右侧副标题
  ctx.fillStyle = 'rgba(160,190,210,0.55)';
  ctx.font = '13px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('购买车辆提升车队，提升战斗力', px + panelW - 20, subY);

  // ====== 商品卡片列表 ======
  var levels = this.state.getShopCarLevels();
  this._shopItemBtns = [];

  if (levels.length === 0) {
    ctx.fillStyle = 'rgba(160,180,200,0.5)';
    ctx.font = '18px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂无可购买车辆', W / 2, py + panelH / 2);
    ctx.restore();
    return;
  }

  var listY = py + 100;
  var cardH = 148;
  var cardGap = 10;
  var cardW = panelW - 36;   // 稍微留边距
  var cardX = px + 18;

  for (var i = 0; i < levels.length; i++) {
    var lv = levels[i];
    var cy = listY + i * (cardH + cardGap);
    var price = this.state.getShopCarPrice(lv);
    var canAfford = coins >= price;
    var hasSlot = this.state.get('slots').some(function(s) { return s === null; });

    this._renderShopCarCard(ctx, cardX, cy, cardW, cardH, lv, price, canAfford, hasSlot, i);

    // 存储按钮命中区域
    this._shopItemBtns.push({
      x: cardX, y: cy, w: cardW, h: cardH,
      level: lv, price: price, canAfford: canAfford, hasSlot: hasSlot
    });
  }

  ctx.restore();
};

/** 渲染商店单个车辆卡片（效果图v2风格） */
CraftingScene.prototype._renderShopCarCard = function(ctx, x, y, w, h, level, price, canAfford, hasSlot, index) {
  var cch = 12; // 卡片切角
  ctx.save();

  // ====== 层级颜色系统（低级青色→高级紫色渐变） ======
  var tierColors = [
    { max: 10, color: '#00BFA5', glow: '#00E5CC', glowRgba: '0,229,204', name: 'green' },    // 青绿
    { max: 20, color: '#2196F3', glow: '#42A5F5', glowRgba: '66,165,245', name: 'blue' },     // 蓝
    { max: 30, color: '#7C4DFF', glow: '#B388FF', glowRgba: '179,136,255', name: 'purple' },   // 紫
    { max: 42, color: '#FF6D00', glow: '#FF9100', glowRgba: '255,145,0', name: 'orange' },   // 橙
    { max: 52, color: '#FF1744', glow: '#FF5252', glowRgba: '255,82,82', name: 'red' },      // 红
  ];
  var tierColor = tierColors[0].color;
  var tierGlow = tierColors[0].glow;
  var tierGlowRgba = tierColors[0].glowRgba;
  for (var t = 0; t < tierColors.length; t++) {
    if (level <= tierColors[t].max) { tierColor = tierColors[t].color; tierGlow = tierColors[t].glow; tierGlowRgba = tierColors[t].glowRgba; break; }
  }

  var isActive = canAfford && hasSlot;
  var dimColor = 'rgba(60,60,80,0.5)';
  var borderColor = isActive ? tierColor : dimColor;

  // ====== 卡片背景 ======
  var cardGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  if (isActive) {
    cardGrad.addColorStop(0, 'rgba(10,20,40,0.85)');
    cardGrad.addColorStop(1, 'rgba(5,12,25,0.9)');
  } else {
    cardGrad.addColorStop(0, 'rgba(20,20,30,0.6)');
    cardGrad.addColorStop(1, 'rgba(15,15,20,0.7)');
  }
  ctx.fillStyle = cardGrad;
  this._fillChamferRect(ctx, x, y, w, h, cch);

  // 卡片边框（发光效果）
  if (isActive) {
    ctx.save();
    ctx.shadowColor = tierGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = tierColor;
    this._strokeChamferRect(ctx, x, y, w, h, cch, 1.5);
    ctx.restore();
  } else {
    ctx.strokeStyle = dimColor;
    this._strokeChamferRect(ctx, x, y, w, h, cch, 1);
  }

  // ====== 左上角 VEHICLE 编号水印 ======
  ctx.save();
  ctx.globalAlpha = isActive ? 0.12 : 0.06;
  ctx.fillStyle = tierColor;
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('VEHICLE-' + String(level).padStart(2, '0'), x + 10, y + 8);
  ctx.restore();

  // ====== 右上角锁定图标（不可购买状态） ======
  if (!isActive) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    var lockX = x + w - 24;
    var lockY = y + 10;
    // 锁体
    ctx.fillStyle = '#888';
    this._fillRoundRect(ctx, lockX - 6, lockY + 4, 12, 9, 2);
    ctx.fill();
    // 锁环
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lockX, lockY + 5, 5, Math.PI, 0, false);
    ctx.stroke();
    ctx.restore();
  }

  // ====== 左侧：车辆展示区 ======
  var carAreaW = w * 0.35;
  var carAreaH = h - 12;
  var carAreaX = x + 6;
  var carAreaY = y + 6;

  // 车辆底座发光椭圆
  if (isActive) {
    ctx.save();
    var baseGlow = ctx.createRadialGradient(
      carAreaX + carAreaW / 2, carAreaY + carAreaH * 0.78, 0,
      carAreaX + carAreaW / 2, carAreaY + carAreaH * 0.78, carAreaW * 0.42
    );
    baseGlow.addColorStop(0, 'rgba(' + tierGlowRgba + ',0.35)');
    baseGlow.addColorStop(0.6, 'rgba(' + tierGlowRgba + ',0.08)');
    baseGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = baseGlow;
    ctx.beginPath();
    ctx.ellipse(carAreaX + carAreaW / 2, carAreaY + carAreaH * 0.78, carAreaW * 0.42, carAreaH * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 车辆渲染
  var carW = carAreaW * 0.9;
  var carH = carAreaH * 0.62;
  var carX = carAreaX + (carAreaW - carW) / 2;
  var carY = carAreaY + (carAreaH - carH) / 2 - 2;
  this._renderCarInSlot(ctx, carX, carY, carW, carH, level, false, false);

  // ====== 右侧：信息区 ======
  var infoX = x + carAreaW + 8;
  var infoW = w - carAreaW - 16;

  // --- LV标签胶囊（渐变效果） ---
  var lvText = 'LV.' + level;
  ctx.font = 'bold 20px Arial, sans-serif';
  var lvW = ctx.measureText(lvText).width;
  var capW = lvW + 18;
  var capH = 26;
  var capX = infoX;
  var capY = y + 14;

  // LV胶囊渐变背景
  var capGrad = ctx.createLinearGradient(capX, capY, capX + capW, capY + capH);
  if (level <= 10) {
    capGrad.addColorStop(0, '#00897B');
    capGrad.addColorStop(1, '#00BFA5');
  } else if (level <= 20) {
    capGrad.addColorStop(0, '#1565C0');
    capGrad.addColorStop(1, '#2196F3');
  } else if (level <= 30) {
    capGrad.addColorStop(0, '#6200EA');
    capGrad.addColorStop(1, '#7C4DFF');
  } else if (level <= 42) {
    capGrad.addColorStop(0, '#E65100');
    capGrad.addColorStop(1, '#FF6D00');
  } else {
    capGrad.addColorStop(0, '#C62828');
    capGrad.addColorStop(1, '#FF1744');
  }
  ctx.beginPath();
  this._drawRoundRectPath(ctx, capX, capY, capW, capH, 6);
  ctx.fillStyle = capGrad;
  ctx.fill();
  // 胶囊高光
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  this._drawRoundRectPath(ctx, capX, capY, capW, capH / 2, 6);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.restore();
  // LV文字
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lvText, capX + capW / 2, capY + capH / 2 + 1);

  // --- 车辆属性（HP / ATK / RUI 三列） ---
  var table = window.GameConfig && GameConfig.crafting ? GameConfig.crafting.vehicleTable : null;
  var vt = window.GameConfig && GameConfig.crafting ? GameConfig.crafting._vt : null;
  var hp = '-', atk = '-', bullets = '-';
  if (table && vt) {
    var row = null;
    for (var r = 0; r < table.length; r++) {
      if (table[r][0] === level) { row = table[r]; break; }
    }
    if (row) {
      hp = row[vt.hp];
      atk = row[vt.atk];
      bullets = row[vt.bullets];
    }
  }

  var statY = capY + capH + 14;
  var statColW = infoW / 3;

  // HP
  ctx.font = '10px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isActive ? 'rgba(100,200,180,0.6)' : 'rgba(120,120,140,0.4)';
  ctx.fillText('HP', infoX + statColW * 0.5, statY);
  ctx.fillStyle = isActive ? '#B2DFDB' : 'rgba(150,150,170,0.5)';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(hp, infoX + statColW * 0.5, statY + 16);

  // ATK
  ctx.font = '10px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillStyle = isActive ? 'rgba(100,180,220,0.6)' : 'rgba(120,120,140,0.4)';
  ctx.fillText('ATK', infoX + statColW * 1.5, statY);
  ctx.fillStyle = isActive ? '#B3E5FC' : 'rgba(150,150,170,0.5)';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(atk, infoX + statColW * 1.5, statY + 16);

  // RUI (bullets)
  ctx.font = '10px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillStyle = isActive ? 'rgba(180,160,220,0.6)' : 'rgba(120,120,140,0.4)';
  ctx.fillText('RUI', infoX + statColW * 2.5, statY);
  ctx.fillStyle = isActive ? '#D1C4E9' : 'rgba(150,150,170,0.5)';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(bullets, infoX + statColW * 2.5, statY + 16);

  // --- 分隔线 ---
  var sepY = statY + 32;
  ctx.strokeStyle = isActive ? 'rgba(0,180,255,0.2)' : 'rgba(80,80,100,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(infoX, sepY);
  ctx.lineTo(infoX + infoW, sepY);
  ctx.stroke();

  // --- 价格行 ---
  var priceY = sepY + 22;
  // 金币图标（圆角方形）
  ctx.save();
  ctx.beginPath();
  this._drawRoundRectPath(ctx, infoX, priceY - 9, 18, 18, 4);
  ctx.fillStyle = isActive ? '#FFB300' : '#666';
  ctx.fill();
  ctx.fillStyle = isActive ? '#8B6914' : '#444';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', infoX + 9, priceY + 1);
  ctx.restore();
  // 价格数值
  ctx.fillStyle = canAfford ? '#FFD54F' : '#FF6B6B';
  ctx.font = 'bold 19px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(this._formatNumber(price), infoX + 24, priceY);

  // --- 购买按钮 ---
  var buyBtnW = 88;
  var buyBtnH = 36;
  var buyBtnX = infoX + infoW - buyBtnW;
  var buyBtnY = priceY - buyBtnH / 2;

  var btnLabel, btnGradStart, btnGradEnd, btnBorderColor;
  if (!hasSlot) {
    btnLabel = '无空位';
    btnGradStart = 'rgba(50,50,60,0.7)';
    btnGradEnd = 'rgba(40,40,50,0.8)';
    btnBorderColor = 'rgba(80,80,90,0.5)';
  } else if (!canAfford) {
    btnLabel = '金币不足';
    btnGradStart = 'rgba(140,30,30,0.7)';
    btnGradEnd = 'rgba(100,20,20,0.8)';
    btnBorderColor = 'rgba(200,60,60,0.6)';
  } else {
    btnLabel = '购买';
    btnGradStart = 'rgba(0,120,60,0.8)';
    btnGradEnd = 'rgba(0,80,40,0.9)';
    btnBorderColor = '#4CAF50';
  }

  // 按钮背景渐变
  var btnGrad = ctx.createLinearGradient(buyBtnX, buyBtnY, buyBtnX, buyBtnY + buyBtnH);
  btnGrad.addColorStop(0, btnGradStart);
  btnGrad.addColorStop(1, btnGradEnd);
  ctx.beginPath();
  this._drawRoundRectPath(ctx, buyBtnX, buyBtnY, buyBtnW, buyBtnH, 6);
  ctx.fillStyle = btnGrad;
  ctx.fill();

  // 可购买按钮发光
  if (isActive) {
    ctx.save();
    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = btnBorderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this._drawRoundRectPath(ctx, buyBtnX, buyBtnY, buyBtnW, buyBtnH, 6);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = btnBorderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    this._drawRoundRectPath(ctx, buyBtnX, buyBtnY, buyBtnW, buyBtnH, 6);
    ctx.stroke();
  }

  // 按钮文字
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btnLabel, buyBtnX + buyBtnW / 2, buyBtnY + buyBtnH / 2);

  // 存储购买按钮区域供点击检测
  if (!this._shopBuyBtns) this._shopBuyBtns = [];
  this._shopBuyBtns[index] = { x: buyBtnX, y: buyBtnY, w: buyBtnW, h: buyBtnH };

  ctx.restore();
};

/** 商店面板点击处理（v2 适配新布局） */
CraftingScene.prototype._handleShopClick = function(pos) {
  if (!this._shopOpen) return false;

  // 关闭按钮
  if (this._shopCloseBtn) {
    var cb = this._shopCloseBtn;
    if (pos.x >= cb.x && pos.x <= cb.x + cb.w && pos.y >= cb.y && pos.y <= cb.y + cb.h) {
      this._shopOpen = false;
      return true;
    }
  }

  // 点击遮罩区域关闭（面板外）
  var W = 720, H = 1280;
  var panelW = 640, panelH = 960;
  var px = (W - panelW) / 2;
  var py = (H - panelH) / 2;
  if (pos.x < px || pos.x > px + panelW || pos.y < py || pos.y > py + panelH) {
    this._shopOpen = false;
    return true;
  }

  // 商品卡片点击（优先检查购买按钮区域）
  if (this._shopItemBtns) {
    for (var i = 0; i < this._shopItemBtns.length; i++) {
      var btn = this._shopItemBtns[i];
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        // 优先检查购买按钮精确区域
        var buyHit = false;
        if (this._shopBuyBtns && this._shopBuyBtns[i]) {
          var bb = this._shopBuyBtns[i];
          if (pos.x >= bb.x && pos.x <= bb.x + bb.w && pos.y >= bb.y && pos.y <= bb.y + bb.h) {
            buyHit = true;
          }
        }
        // 点击购买按钮区域 或 整张卡片可购买状态 → 尝试购买
        if (buyHit || (btn.canAfford && btn.hasSlot)) {
          if (!btn.hasSlot) {
            this.showNotification('您当前无空位，请先合成');
          } else if (!btn.canAfford) {
            this.showNotification('金币不足!');
          } else {
            var result = this.state.buyShopCar(btn.level);
            if (result.success) {
              this.showNotification('购买成功! LV.' + btn.level + ' 花费 ' + this._formatNumber(result.price) + ' 金币');
            } else if (result.reason === 'no_slot') {
              this.showNotification('您当前无空位，请先合成');
            } else if (result.reason === 'no_coins') {
              this.showNotification('金币不足!');
            }
          }
        } else if (!btn.hasSlot) {
          this.showNotification('您当前无空位，请先合成');
        } else if (!btn.canAfford) {
          this.showNotification('金币不足!');
        }
        return true;
      }
    }
  }

  return true; // 商店打开时拦截所有点击
};

CraftingScene.prototype._formatNumber = function(n) {
  if (!n) n = 0;
  n = Math.floor(Number(n) || 0);
  var result;
  if (n >= 1e9) result = String((n / 1e9).toFixed(1)) + String.fromCharCode(66);
  else if (n >= 1e6) result = String((n / 1e6).toFixed(1)) + String.fromCharCode(77);
  else if (n >= 1e3) result = String((n / 1e3).toFixed(1)) + String.fromCharCode(75);
  else result = String(Math.floor(n));
  return result;
};

// ==================== 无人机详情展示弹窗 ====================

/** 渲染无人机详情展示弹窗（参考角色卡面展示风格） */
CraftingScene.prototype._renderDroneEditor = function(ctx) {
  var W = 720, H = 1280;
  var t = Date.now() * 0.001;

  // ====== 全屏半透明遮罩 ======
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  // ====== 弹窗面板（居中，不铺满屏幕） ======
  var panelW = 620;
  var panelH = 980;
  var px = (W - panelW) / 2;
  var py = (H - panelH) / 2 - 30;
  var ch = 18;

  // 弹窗外发光
  ctx.save();
  ctx.shadowColor = 'rgba(0,180,255,0.25)';
  ctx.shadowBlur = 40;
  this._drawChamferRect(ctx, px, py, panelW, panelH, ch);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill();
  ctx.restore();

  // 弹窗主体背景
  ctx.save();
  this._drawChamferRect(ctx, px, py, panelW, panelH, ch);
  var bgGrad = ctx.createLinearGradient(px, py, px, py + panelH);
  bgGrad.addColorStop(0, '#111B2A');
  bgGrad.addColorStop(0.3, '#0D1520');
  bgGrad.addColorStop(1, '#080E18');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // 外边框（青蓝渐变）
  var borderGrad = ctx.createLinearGradient(px, py, px + panelW, py + panelH);
  borderGrad.addColorStop(0, 'rgba(0,200,255,0.5)');
  borderGrad.addColorStop(0.5, 'rgba(0,255,200,0.3)');
  borderGrad.addColorStop(1, 'rgba(0,150,255,0.5)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  this._strokeChamferRect(ctx, px, py, panelW, panelH, ch, 2);

  // 内边框细线
  ctx.strokeStyle = 'rgba(0,200,255,0.07)';
  ctx.lineWidth = 1;
  this._drawChamferRect(ctx, px + 4, py + 4, panelW - 8, panelH - 8, ch - 3);
  ctx.stroke();
  ctx.restore();

  // ====== 顶部标题栏（艺术字设计） ======
  var titleBarH = 56;

  // 标题栏底色
  ctx.save();
  ctx.beginPath();
  this._drawRoundRectPath(ctx, px + 5, py + 5, panelW - 10, titleBarH, ch - 3);
  var titleGrad = ctx.createLinearGradient(px, py, px + panelW, py);
  titleGrad.addColorStop(0, 'rgba(0,180,255,0.15)');
  titleGrad.addColorStop(0.5, 'rgba(0,120,200,0.08)');
  titleGrad.addColorStop(1, 'rgba(0,180,255,0.15)');
  ctx.fillStyle = titleGrad;
  ctx.fill();
  ctx.restore();

  // 关闭按钮（X）—— 立体红色按钮，带渐变+边框+阴影
  var closeBtnR = 18;
  var closeBtnX = px + panelW - 38;
  var closeBtnY = py + 5 + titleBarH / 2;

  ctx.save();
  // 外发光
  ctx.shadowColor = 'rgba(255,80,80,0.6)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(closeBtnX, closeBtnY, closeBtnR, 0, Math.PI * 2);
  // 红色径向渐变填充
  var closeGrad = ctx.createRadialGradient(closeBtnX - 4, closeBtnY - 4, 2, closeBtnX, closeBtnY, closeBtnR);
  closeGrad.addColorStop(0, '#FF6B6B');
  closeGrad.addColorStop(0.6, '#E53935');
  closeGrad.addColorStop(1, '#B71C1C');
  ctx.fillStyle = closeGrad;
  ctx.fill();
  ctx.restore();

  // 外圈亮边
  ctx.strokeStyle = 'rgba(255,180,180,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(closeBtnX, closeBtnY, closeBtnR, 0, Math.PI * 2);
  ctx.stroke();

  // 内圈暗边
  ctx.strokeStyle = 'rgba(120,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(closeBtnX, closeBtnY, closeBtnR - 2, 0, Math.PI * 2);
  ctx.stroke();

  // 顶部高光（模拟玻璃反射）
  ctx.save();
  ctx.beginPath();
  ctx.arc(closeBtnX, closeBtnY, closeBtnR - 1, 0, Math.PI * 2);
  ctx.clip();
  var hlGrad = ctx.createLinearGradient(closeBtnX, closeBtnY - closeBtnR, closeBtnX, closeBtnY);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hlGrad;
  ctx.fillRect(closeBtnX - closeBtnR, closeBtnY - closeBtnR, closeBtnR * 2, closeBtnR);
  ctx.restore();

  // X 符号（白色粗线条+轻微阴影）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  var xSize = 7;
  ctx.beginPath();
  ctx.moveTo(closeBtnX - xSize, closeBtnY - xSize);
  ctx.lineTo(closeBtnX + xSize, closeBtnY + xSize);
  ctx.moveTo(closeBtnX + xSize, closeBtnY - xSize);
  ctx.lineTo(closeBtnX - xSize, closeBtnY + xSize);
  ctx.stroke();
  ctx.restore();
  ctx.lineCap = 'butt';
  this._droneCloseBtn = { x: closeBtnX - closeBtnR - 4, y: closeBtnY - closeBtnR - 4, w: closeBtnR * 2 + 8, h: closeBtnR * 2 + 8 };

  // 艺术字标题：多层渲染实现发光+描边+立体效果
  var titleText = '\u25C6 无人机详情';
  var titleX = px + 24;
  var titleY = py + 5 + titleBarH / 2;

  // 第1层：外发光（最底层）
  ctx.save();
  ctx.font = 'bold 22px "Microsoft YaHei", "PingFang SC", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(0,229,255,0.3)';
  ctx.fillText(titleText, titleX, titleY);
  ctx.restore();

  // 第2层：描边层
  ctx.save();
  ctx.font = 'bold 22px "Microsoft YaHei", "PingFang SC", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,180,220,0.7)';
  ctx.lineWidth = 2.5;
  ctx.strokeText(titleText, titleX, titleY);
  ctx.restore();

  // 第3层：白色填充主文字
  ctx.save();
  ctx.font = 'bold 22px "Microsoft YaHei", "PingFang SC", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // 渐变填充文字
  var titleFillGrad = ctx.createLinearGradient(titleX, titleY - 12, titleX, titleY + 12);
  titleFillGrad.addColorStop(0, '#FFFFFF');
  titleFillGrad.addColorStop(0.45, '#B2EBF2');
  titleFillGrad.addColorStop(0.55, '#80DEEA');
  titleFillGrad.addColorStop(1, '#E0F7FA');
  ctx.fillStyle = titleFillGrad;
  ctx.fillText(titleText, titleX, titleY);

  // 高光点（文字上方细白线模拟反光）
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(titleX + 2, titleY - 11, ctx.measureText(titleText).width - 4, 2);
  ctx.restore();

  // ====== 无人机立绘展示区（紧凑版） ======
  var charAreaY = py + titleBarH + 30;
  var charAreaH = 280;  // 立绘区放大，让无人机更突出
  var charCenterX = px + panelW / 2;
  var charCenterY = charAreaY + charAreaH / 2;

  // 立绘底部发光基座
  ctx.save();
  var baseGlow = ctx.createRadialGradient(charCenterX, charCenterY + 60, 10, charCenterX, charCenterY + 60, 150);
  baseGlow.addColorStop(0, 'rgba(0,200,255,0.18)');
  baseGlow.addColorStop(0.5, 'rgba(0,150,255,0.05)');
  baseGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = baseGlow;
  ctx.fillRect(px + 20, charAreaY + 30, panelW - 40, charAreaH - 30);
  ctx.restore();

  // 旋转能量环装饰
  ctx.save();
  ctx.translate(charCenterX, charCenterY);
  var ringRadius = 95;
  var ringAngle = t * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius + 14, ringAngle, ringAngle + Math.PI * 1.2);
  ctx.strokeStyle = 'rgba(0,200,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius - 10, -ringAngle * 0.6, -ringAngle * 0.6 + Math.PI * 0.9);
  ctx.strokeStyle = 'rgba(0,255,200,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  var pulseR = ringRadius + 5 + Math.sin(t * 1.8) * 6;
  ctx.beginPath();
  ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,200,255,' + (0.05 + Math.sin(t * 1.8) * 0.03) + ')';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // 无人机立绘（SR-71黑鸟俯视图）
  ctx.save();
  if (this._droneImgLoaded && this._droneImg) {
    var imgW = this._droneImg.naturalWidth;
    var imgH = this._droneImg.naturalHeight;
    var drawW = panelW * 0.62;  // 缩小图片占比
    var drawH = drawW * (imgH / imgW);
    ctx.drawImage(this._droneImg,
      charCenterX - drawW / 2, charCenterY - drawH * 0.42,
      drawW, drawH
    );
  } else {
    ctx.fillStyle = 'rgba(100,200,255,0.4)';
    ctx.font = '14px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('加载中...', charCenterX, charCenterY);
  }
  ctx.restore();

  // ====== 名称与品质标签 ======
  var nameY = charAreaY + charAreaH + 75;  // 名称再下移，远离机翼

  // 名称（艺术字风格）
  ctx.save();
  ctx.shadowColor = 'rgba(0,200,255,0.5)';
  ctx.shadowBlur = 14;
  ctx.font = 'bold 26px "Microsoft YaHei", "PingFang SC", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 名称渐变填充
  var nameGrad = ctx.createLinearGradient(charCenterX - 70, nameY - 13, charCenterX + 70, nameY + 13);
  nameGrad.addColorStop(0, '#FFFFFF');
  nameGrad.addColorStop(0.5, '#E0F7FA');
  nameGrad.addColorStop(1, '#B2EBF2');
  ctx.fillStyle = nameGrad;
  ctx.fillText('\u9ED1\u9E1F SR-71', charCenterX, nameY);
  ctx.restore();

  // SR品质标签（名称右侧）
  var srW = 40, srH = 20;
  var srX = charCenterX + 82;
  var srY = nameY - srH / 2;
  ctx.beginPath();
  this._drawRoundRectPath(ctx, srX, srY, srW, srH, 4);
  ctx.fillStyle = 'rgba(255,152,0,0.15)';
  ctx.fill();
  ctx.strokeStyle = '#FF9800';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#FF9800';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SR', srX + srW / 2, srY + srH / 2);

  // ====== 属性数据区（3项：火力/速度/续航）——增加与名称的间距 ======
  var statAreaY = nameY + 36;
  var statAreaW = panelW - 56;
  var statAreaX = px + 28;

  // 属性区标题
  ctx.fillStyle = 'rgba(0,210,255,0.65)';
  ctx.font = 'bold 13px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u25C6 \u5C5E\u6027\u6570\u636E', statAreaX, statAreaY);

  // 分隔线
  ctx.strokeStyle = 'rgba(0,200,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(statAreaX, statAreaY + 12);
  ctx.lineTo(statAreaX + statAreaW, statAreaY + 12);
  ctx.stroke();

  // 3项属性
  var stats = [
    { name: '\u706B\u529B', value: 85, max: 100, color: '#FF5252', glowColor: 'rgba(255,82,82,0.3)', icon: '\uD83D\uDD25' },
    { name: '\u901F\u5EA6', value: 78, max: 100, color: '#AB47BC', glowColor: 'rgba(171,71,188,0.3)', icon: '\uD83D\uDE80' },
    { name: '\u7EED\u822A', value: 60, max: 100, color: '#42A5F5', glowColor: 'rgba(66,165,245,0.3)', icon: '\uD83D\uDD0B' }
  ];

  var statStartY = statAreaY + 26;
  var statItemH = 56;
  var barStartX = statAreaX + 72;
  var barEndX = statAreaX + statAreaW - 48;
  var barW = barEndX - barStartX;
  var barH = 13;                        // 原来是12→13

  for (var si = 0; si < stats.length; si++) {
    var st = stats[si];
    var sy = statStartY + si * statItemH;
    var barCenterY = sy + barH / 2;

    // 属性图标+名称（左侧，DIN字体增加科技感）
    ctx.save();
    ctx.shadowColor = 'rgba(0,200,255,0.4)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(220,235,255,0.85)';
    ctx.font = 'bold 14px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.icon + ' ' + st.name, statAreaX, barCenterY);
    ctx.restore();

    // ===== 进度条容器：切角矩形（六边形端帽） =====
    var capCut = barH / 2;  // 端帽切角宽度

    // 容器轨道（深色凹陷感）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(barStartX + capCut, sy);
    ctx.lineTo(barEndX - capCut, sy);
    ctx.lineTo(barEndX, sy + barH / 2);
    ctx.lineTo(barEndX - capCut, sy + barH);
    ctx.lineTo(barStartX + capCut, sy + barH);
    ctx.lineTo(barStartX, sy + barH / 2);
    ctx.closePath();
    var trackGrad = ctx.createLinearGradient(barStartX, sy, barStartX, sy + barH);
    trackGrad.addColorStop(0, 'rgba(5,10,20,0.95)');
    trackGrad.addColorStop(0.5, 'rgba(15,25,40,0.9)');
    trackGrad.addColorStop(1, 'rgba(8,14,25,0.95)');
    ctx.fillStyle = trackGrad;
    ctx.fill();
    // 容器外发光描边
    ctx.strokeStyle = 'rgba(0,200,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ===== 进度填充（带霓虹光晕） =====
    var fillW = Math.max(barH, barW * (st.value / st.max));
    if (fillW > 0) {
      ctx.save();
      // 裁剪到容器形状
      ctx.beginPath();
      ctx.moveTo(barStartX + capCut, sy);
      ctx.lineTo(barEndX - capCut, sy);
      ctx.lineTo(barEndX, sy + barH / 2);
      ctx.lineTo(barEndX - capCut, sy + barH);
      ctx.lineTo(barStartX + capCut, sy + barH);
      ctx.lineTo(barStartX, sy + barH / 2);
      ctx.closePath();
      ctx.clip();

      // 主填充渐变（带高光）
      var barGrad = ctx.createLinearGradient(barStartX, sy, barStartX, sy + barH);
      barGrad.addColorStop(0, st.color + 'AA');
      barGrad.addColorStop(0.5, st.color);
      barGrad.addColorStop(1, st.color + 'BB');
      ctx.fillStyle = barGrad;
      ctx.fillRect(barStartX, sy, fillW, barH);

      // 内部扫描线刻度（每10%一格）
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      for (var seg = 1; seg < 10; seg++) {
        var segX = barStartX + (barW / 10) * seg;
        if (segX < barStartX + fillW) {
          ctx.beginPath();
          ctx.moveTo(segX, sy + 2);
          ctx.lineTo(segX, sy + barH - 2);
          ctx.stroke();
        }
      }

      // 顶部高光线（玻璃质感）
      var topGrad = ctx.createLinearGradient(barStartX, sy, barStartX, sy + barH * 0.5);
      topGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
      topGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(barStartX, sy, fillW, barH * 0.5);
      ctx.restore();

      // 末端能量箭头（向前的三角推进感）
      ctx.save();
      var arrowX = barStartX + fillW;
      ctx.shadowColor = st.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(arrowX - 3, sy + 1);
      ctx.lineTo(arrowX + 4, barCenterY);
      ctx.lineTo(arrowX - 3, sy + barH - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ===== 数值（右侧，DIN风格大数字+发光） =====
    ctx.save();
    ctx.shadowColor = st.glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = st.color;
    ctx.font = 'bold 22px "Consolas", "DIN Alternate", "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.value + '', barEndX + 44, barCenterY);
    ctx.restore();

    // 属性间分隔线（科技虚线）
    if (si < stats.length - 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,200,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(statAreaX + 10, sy + statItemH - 8);
      ctx.lineTo(statAreaX + statAreaW - 10, sy + statItemH - 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ====== 技能描述区 —— 增加与属性的间距 ======
  var skillY = statStartY + stats.length * statItemH + 22;
  var skillPanelW = panelW - 56;
  var skillPanelH = 96;
  var skillPanelX = px + 28;
  var skillCh = 12;

  ctx.save();
  this._drawChamferRect(ctx, skillPanelX, skillY, skillPanelW, skillPanelH, skillCh);
  var skillGrad = ctx.createLinearGradient(skillPanelX, skillY, skillPanelX, skillY + skillPanelH);
  skillGrad.addColorStop(0, 'rgba(12,18,30,0.9)');
  skillGrad.addColorStop(1, 'rgba(8,14,24,0.93)');
  ctx.fillStyle = skillGrad;
  ctx.fill();
  var skillBorderGrad = ctx.createLinearGradient(skillPanelX, skillY, skillPanelX + skillPanelW, skillY);
  skillBorderGrad.addColorStop(0, 'rgba(0,200,255,0.2)');
  skillBorderGrad.addColorStop(0.5, 'rgba(0,255,200,0.12)');
  skillBorderGrad.addColorStop(1, 'rgba(0,200,255,0.2)');
  ctx.strokeStyle = skillBorderGrad;
  ctx.lineWidth = 1;
  this._strokeChamferRect(ctx, skillPanelX, skillY, skillPanelW, skillPanelH, skillCh, 1);
  ctx.restore();

  // 技能图标 + 标题
  ctx.fillStyle = '#4DD0E1';
  ctx.font = 'bold 13px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2726 \u4E13\u5C5E\u6280\u80FD', skillPanelX + 16, skillY + 20);

  // 技能名称（金色高亮）
  ctx.fillStyle = '#FFE082';
  ctx.font = 'bold 15px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText('\u9E70\u773C\u9501\u5B9A', skillPanelX + 108, skillY + 20);

  // 技能描述
  ctx.fillStyle = 'rgba(180,200,220,0.6)';
  ctx.font = '12px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  var skillDesc = '\u65E0\u4EBA\u673A\u8FDB\u5165\u9501\u5B9A\u6A21\u5F0F\uFF0C\u81EA\u52A8\u8FFD\u8EAA\u6700\u8FD1\u654C\u4EBA\u5E76\u63D0\u534730%\u547D\u4E2D\u7387\uFF0C\u6301\u7EE78\u79D2\u3002';
  var descLines = this._wrapText(ctx, skillDesc, skillPanelW - 32);
  for (var di = 0; di < descLines.length; di++) {
    ctx.fillText(descLines[di], skillPanelX + 16, skillY + 40 + di * 18);
  }

  // ====== 装备按钮（科技风：六边形切角+霓虹边框+扫光+能量纹理） ======
  var equipBtnW = 280;
  var equipBtnH = 64;
  var equipBtnX = px + (panelW - equipBtnW) / 2;
  var equipBtnY = skillY + skillPanelH + 60;
  var equipBtnT = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

  var isEquipped = this._droneEquipped;
  var btnAccent = isEquipped ? '#00FFA0' : '#00E5FF';
  var btnAccentDark = isEquipped ? '#00B870' : '#00A8DC';
  var btnGlowAlpha = 0.5 + Math.sin(equipBtnT * 2) * 0.15;  // 呼吸发光

  // —— 第1层：外发光（呼吸光晕）
  ctx.save();
  ctx.shadowColor = btnAccent;
  ctx.shadowBlur = 22 + Math.sin(equipBtnT * 2) * 6;
  this._drawChamferRect(ctx, equipBtnX, equipBtnY, equipBtnW, equipBtnH, 14);
  ctx.fillStyle = isEquipped ? 'rgba(0,80,40,0.001)' : 'rgba(0,40,80,0.001)';
  ctx.fill();
  ctx.restore();

  // —— 第2层：按钮主体（深色科技底+斜向条纹）
  ctx.save();
  this._drawChamferRect(ctx, equipBtnX, equipBtnY, equipBtnW, equipBtnH, 14);
  // 深色基底
  var baseGrad = ctx.createLinearGradient(equipBtnX, equipBtnY, equipBtnX, equipBtnY + equipBtnH);
  if (isEquipped) {
    baseGrad.addColorStop(0, '#0A2A1A');
    baseGrad.addColorStop(0.5, '#0E3A24');
    baseGrad.addColorStop(1, '#082014');
  } else {
    baseGrad.addColorStop(0, '#0A1F35');
    baseGrad.addColorStop(0.5, '#0E2D4A');
    baseGrad.addColorStop(1, '#08182A');
  }
  ctx.fillStyle = baseGrad;
  ctx.fill();
  ctx.restore();

  // —— 第3层：内部斜向科技条纹
  ctx.save();
  this._drawChamferRect(ctx, equipBtnX, equipBtnY, equipBtnW, equipBtnH, 14);
  ctx.clip();
  ctx.strokeStyle = btnAccent + '15';
  ctx.lineWidth = 1;
  for (var stripeI = -equipBtnH; stripeI < equipBtnW; stripeI += 14) {
    ctx.beginPath();
    ctx.moveTo(equipBtnX + stripeI, equipBtnY);
    ctx.lineTo(equipBtnX + stripeI + equipBtnH, equipBtnY + equipBtnH);
    ctx.stroke();
  }
  ctx.restore();

  // —— 第4层：扫光动画（从左到右的横向亮带）
  ctx.save();
  this._drawChamferRect(ctx, equipBtnX, equipBtnY, equipBtnW, equipBtnH, 14);
  ctx.clip();
  var sweepX = equipBtnX + ((equipBtnT * 80) % (equipBtnW + 80)) - 80;
  var sweepGrad = ctx.createLinearGradient(sweepX, 0, sweepX + 80, 0);
  sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
  sweepGrad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(sweepX, equipBtnY, 80, equipBtnH);
  ctx.restore();

  // —— 第5层：顶部玻璃高光
  ctx.save();
  this._drawChamferRect(ctx, equipBtnX + 6, equipBtnY + 4, equipBtnW - 12, equipBtnH * 0.4, 8);
  var topShine = ctx.createLinearGradient(0, equipBtnY + 4, 0, equipBtnY + 4 + equipBtnH * 0.4);
  topShine.addColorStop(0, 'rgba(255,255,255,0.18)');
  topShine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topShine;
  ctx.fill();
  ctx.restore();

  // —— 第6层：双层科技边框（外亮内深）
  ctx.save();
  ctx.shadowColor = btnAccent;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = btnAccent;
  ctx.lineWidth = 2;
  this._strokeChamferRect(ctx, equipBtnX, equipBtnY, equipBtnW, equipBtnH, 14, 2);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = btnAccentDark + '88';
  ctx.lineWidth = 1;
  this._strokeChamferRect(ctx, equipBtnX + 3, equipBtnY + 3, equipBtnW - 6, equipBtnH - 6, 11, 1);
  ctx.restore();

  // —— 第7层：左右两侧科技小装饰（角标）
  ctx.save();
  ctx.fillStyle = btnAccent;
  ctx.shadowColor = btnAccent;
  ctx.shadowBlur = 6;
  // 左侧三道竖线
  for (var li = 0; li < 3; li++) {
    ctx.fillRect(equipBtnX + 10 + li * 4, equipBtnY + equipBtnH / 2 - 6, 1.5, 12);
  }
  // 右侧三道竖线
  for (var ri = 0; ri < 3; ri++) {
    ctx.fillRect(equipBtnX + equipBtnW - 14 - ri * 4, equipBtnY + equipBtnH / 2 - 6, 1.5, 12);
  }
  ctx.restore();

  // —— 第8层：按钮文字（艺术字：发光+描边+渐变填充）
  var btnText = isEquipped ? '\u2713  \u5DF2 \u88C5 \u5907' : '\u26A1  \u88C5  \u5907';
  var textCenterX = equipBtnX + equipBtnW / 2;
  var textCenterY = equipBtnY + equipBtnH / 2;

  // 文字外发光
  ctx.save();
  ctx.font = 'bold 22px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = btnAccent;
  ctx.shadowBlur = 12;
  ctx.fillStyle = btnAccent + '40';
  ctx.fillText(btnText, textCenterX, textCenterY);
  ctx.restore();

  // 文字深色描边
  ctx.save();
  ctx.font = 'bold 22px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,30,50,0.85)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(btnText, textCenterX, textCenterY);
  ctx.restore();

  // 文字主体（白→淡青渐变）
  ctx.save();
  ctx.font = 'bold 22px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var textGrad = ctx.createLinearGradient(textCenterX, textCenterY - 12, textCenterX, textCenterY + 12);
  textGrad.addColorStop(0, '#FFFFFF');
  textGrad.addColorStop(0.5, '#E8FCFF');
  textGrad.addColorStop(1, btnAccent);
  ctx.fillStyle = textGrad;
  ctx.fillText(btnText, textCenterX, textCenterY);
  ctx.restore();

  // 记录按钮区域
  this._droneBtns = [{ x: equipBtnX, y: equipBtnY, w: equipBtnW, h: equipBtnH, type: 'equip' }];
  this._droneEquipBtn = this._droneBtns[0];
};

/** 无人机详情弹窗点击处理 */
CraftingScene.prototype._handleDroneClick = function(pos) {
  if (!this._droneOpen) return false;

  // 关闭按钮（面板右上角X）
  if (this._droneCloseBtn) {
    var cb = this._droneCloseBtn;
    if (pos.x >= cb.x && pos.x <= cb.x + cb.w && pos.y >= cb.y && pos.y <= cb.y + cb.h) {
      this._droneOpen = false;
      return true;
    }
  }

  // 装备按钮
  if (this._droneEquipBtn) {
    var eb = this._droneEquipBtn;
    if (pos.x >= eb.x && pos.x <= eb.x + eb.w && pos.y >= eb.y && pos.y <= eb.y + eb.h) {
      this._droneEquipped = !this._droneEquipped;
      // 同步到 state，battle 场景会读取
      if (this.state && this.state.set) {
        this.state.set('droneEquipped', this._droneEquipped);
      }
      if (this._droneEquipped) {
        this.showNotification('无人机已装备！战斗中将提供火力支援');
      } else {
        this.showNotification('无人机已卸载');
      }
      return true;
    }
  }

  // 点击弹窗外部区域关闭
  var panelW = 620, panelH = 980;
  var px = (720 - panelW) / 2;
  var py = (1280 - panelH) / 2 - 30;
  if (pos.x < px || pos.x > px + panelW || pos.y < py || pos.y > py + panelH) {
    this._droneOpen = false;
    return true;
  }

  return true; // 弹窗打开时拦截所有点击
};

/** 文字自动换行辅助方法 */
CraftingScene.prototype._wrapText = function(ctx, text, maxWidth) {
  var lines = [];
  var currentLine = '';
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    var testLine = currentLine + ch;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CraftingScene;
}

// ========== 新版首页UI切图加载/绘制 ==========

CraftingScene.prototype._loadHomeUI = function() {
  if (this._homeUILoaded || this._homeUILoading) return;
  this._homeUILoading = true;
  var manifest = {
    topBar:        'assets/ui/home_v2/01_top_bar_full.png',
    perfPanel:     'assets/ui/home_v2/02_panel_performance.png',
    lvLabel:       'assets/ui/home_v2/03_label_lv4.png',
    corePanel:     'assets/ui/home_v2/04_panel_energy_core.png',
    glowRing:      'assets/ui/home_v2/06_glow_ring.png',
    btnAuto:       'assets/ui/home_v2/07_btn_auto_merge.png',
    btnStage:      'assets/ui/home_v2/08_btn_level2.png',
    btnRace:       'assets/ui/home_v2/09_btn_race_mode.png',
    slotCar:       'assets/ui/home_v2/10_slot_car_white.png',
    slotEmpty:     'assets/ui/home_v2/11_slot_empty_1.png',
    bottomNav:     'assets/ui/home_v2/33_bottom_nav_full.png',
    btnDrone:      'assets/ui/home_v2/34_btn_drone.png',
    btnCarLv:      'assets/ui/home_v2/35_btn_car_lv1.png',
    btnShop:       'assets/ui/home_v2/36_btn_shop.png',
  };
  this._homeUI = {};
  var self = this;
  var total = Object.keys(manifest).length;
  var loaded = 0;
  Object.keys(manifest).forEach(function(key) {
    var rawPath = manifest[key];
    // 优先尝试从全局预加载缓存中获取
    var preloadImg = window.AssetConfig && window.AssetConfig._loadedImages && window.AssetConfig._loadedImages[rawPath];
    if (preloadImg && (preloadImg.complete || preloadImg.naturalWidth > 0)) {
      self._homeUI[key] = preloadImg;
      loaded++;
      if (loaded >= total) self._homeUILoaded = true;
    } else {
      var img = new Image();
      img.onload = function() {
        loaded++;
        if (loaded >= total) self._homeUILoaded = true;
      };
      img.onerror = function() {
        loaded++;
        if (loaded >= total) self._homeUILoaded = true;
      };
      img.src = rawPath + '?v=' + (window.AssetConfig ? window.AssetConfig._cacheBust : '1');
      self._homeUI[key] = img;
    }
  });
};

/** 检查素材是否加载完成 */
CraftingScene.prototype._homeUIReady = function(key) {
  var img = this._homeUI && this._homeUI[key];
  return img && img.complete && img.naturalWidth > 0;
};
