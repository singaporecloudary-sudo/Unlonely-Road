/**
 * 合成飞车射击 - 局内闯关射击场景
 * 赛道、射击、敌方、障碍物、BUFF、碰撞检测
 */

class BattleScene {
  constructor() {
    this.engine = null;
    this.ctx = null;
    this.eventBus = null;
    this.assets = window.AssetConfig;
    this.state = window.gameState;

    // 场景尺寸
    this.W = 720;
    this.H = 1280;

    // 赛道参数（720×1280背景图，路面居中占70%）
    this.laneCount = 3;
    this.roadWidth = this.W * 0.7;
    this.roadX = (this.W - this.roadWidth) / 2;
    this.laneWidth = this.roadWidth / this.laneCount;
    this.scrollSpeed = 3;
    this.scrollOffset = 0;

    // 玩家（初始位置在中间车道中央，300%尺寸）
    this.player = {
      x: this.W / 2,
      y: this.H * 0.75,
      width: 240,
      height: 360,
      hitWidth: 80,    // 碰撞箱宽度（缩小：更贴合视觉，避免子弹"擦边"误判）
      hitHeight: 140,  // 碰撞箱高度（缩小：避免子弹"擦边"误判）
      hp: 100,
      maxHp: 100,
      atk: 10,
      bullets: 1,
      shootTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      buffs: [], // {type, remaining}
    };

    // 游戏对象
    this.bullets = [];
    this.enemyBullets = [];  // Boss/敌方子弹
    this.enemies = [];
    this.obstacles = [];
    this.buffItems = []; // 场景中的BUFF道具
    this.effects = [];   // 特效
    this.floatingTexts = [];

    // 敌车sprite图片缓存（AI生成的俯视角美术资源）
    this.enemyImages = { normal: null, fast: null, tank: null, boss: null };
    // Boss变体sprite缓存（key→Image）
    this.bossVariantImages = {};
    this._enemyImagesLoaded = false;
    this._loadEnemySprites();

    // 障碍物sprite图片缓存（6种路障美术资源）
    this.obstacleImages = { barrier: null, cone: null, spike: null, gate: null, debris: null, heavy_barrier: null };
    this._obstacleImagesLoaded = false;
    this._loadObstacleSprites();

    // 赛道背景图缓存（直接drawImage实现滚动，绕过tileMode的pattern固定原点问题）
    this.trackImg = null;
    this._loadTrackBg();

    // 战斗结算UI切图缓存
    this.resultImgs = {};
    this._loadResultUI();

    // 生成计时器
    this.enemySpawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.buffSpawnTimer = 0;

    // 关卡数据
    this.stageLevel = 1;
    this.distance = 0;
    this.targetDistance = 500;
    this.kills = 0;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.stageTime = 0;  // 本局已进行时间（秒），用于刷怪分段表

    // 距离模式专用
    this.isEndless = false;       // true=距离模式
    this.earnedCoins = 0;         // 距离模式中累计获得的金币（击杀敌车）
    this.effectiveStage = 1;      // 距离模式等效关卡（随时间成长）

    // Boss关底状态
    this.bossPhase = 'none';       // 'none' | 'warning' | 'entering' | 'fighting' | 'defeated'
    this.bossWarningTimer = 0;     // Boss来袭警告倒计时(ms)
    this.bossEnemy = null;         // Boss敌车引用
    this.bossTargetY = 200;        // Boss悬浮目标Y
    this.bossShootTimer = 0;       // Boss射击计时器(ms)

    // 输入
    this.touchStartPos = null;
    this.playerStartPos = null;

    // 兼容性辅助: roundRect替代
    this._rr = function(ctx, x, y, w, h, r) {
      if (typeof r !== 'number' || r <= 0) { ctx.rect(x,y,w,h); return; }
      r = Math.min(r, Math.min(w,h)/2);
      ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r);
    };

    // 颜色变暗辅助: hex颜色按amount变暗
    this._darken = function(hex, amount) {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, ((num >> 16) & 0xFF) - amount);
      const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
      const b = Math.max(0, (num & 0xFF) - amount);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    // ===== 切角科技边框绘制（核心UI组件）=====
    // 绘制八边形切角科技风进度条框架，匹配美术设计稿
    this._drawChamferedFrame = function(ctx, x, y, w, h, color) {
      const ch = Math.min(h * 0.5, 10); // 切角尺寸
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

      // 外发光边框
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 内部深色填充
      ctx.fillStyle = 'rgba(4,8,18,0.92)';
      ctx.fill();

      // 左侧箭头装饰（向内指的chevron）
      ctx.save();
      ctx.beginPath();
      const arrX = x + 2, arrY = y + h * 0.15, arrH = h * 0.7, arrW = ch + 3;
      ctx.moveTo(arrX + arrW, arrY);
      ctx.lineTo(arrX + 3, arrY + arrH * 0.5);
      ctx.lineTo(arrX + arrW, arrY + arrH);
      ctx.closePath();
      ctx.fillStyle = color.replace(')', ',0.15)').replace('rgb', 'rgba');
      // 简单处理hex颜色转rgba
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
        ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
      }
      ctx.fill();
      ctx.strokeStyle = color.replace('#','').length === 6 ? color : color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // 内部水平纹理线（科技感）
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = color.startsWith('#') ? color : '#FFFFFF';
      ctx.lineWidth = 0.5;
      for (let ly = y + 4; ly < y + h - 2; ly += 3) {
        ctx.beginPath(); ctx.moveTo(x + ch + 6, ly); ctx.lineTo(x + w - ch - 4, ly); ctx.stroke();
      }
      ctx.restore();
    };

    // ===== 图标绘制 =====
    // 心形+ECG波形（车辆生命）
    this._drawHeartIcon = function(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      const s = size * 0.45;
      ctx.moveTo(0, s * 0.3);
      ctx.bezierCurveTo(-s, -s * 0.5, -s, s * 0.8, 0, s * 1.2);
      ctx.bezierCurveTo(s, s * 0.8, s, -s * 0.5, 0, s * 0.3);
      ctx.fill();
      // ECG线
      ctx.shadowBlur = 0; ctx.strokeStyle = '#001820'; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(-s*0.5, s*0.5); ctx.lineTo(-s*0.15, s*0.5); ctx.lineTo(0, s*-0.1); ctx.lineTo(s*0.12, s*0.9); ctx.lineTo(s*0.25, s*0.15); ctx.lineTo(s*0.5, s*0.5);
      ctx.stroke();
      ctx.restore();
    };

    // 雷达/瞄准圈（行驶距离）
    this._drawRadarIcon = function(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = '#FFB300'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFB300';
      const r = size * 0.42;
      // 外圈
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      // 内圈镂空
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 十字准星
      ctx.strokeStyle = 'rgba(50,20,0,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r*0.85, 0); ctx.lineTo(r*0.85, 0); ctx.moveTo(0, -r*0.85); ctx.lineTo(0, r*0.85); ctx.stroke();
      ctx.restore();
    };

    // 骷髅头（BOSS生命）
    this._drawSkullIcon = function(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = '#FF0055'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#FF0055';
      const s = size * 0.38;
      // 头骨轮廓（简化）
      ctx.beginPath();
      ctx.arc(0, -s*0.15, s, Math.PI * 1.25, Math.PI * 0.25);
      ctx.quadraticCurveTo(s*1.05, s*0.3, s*0.75, s*0.9);
      ctx.lineTo(-s*0.75, s*0.9);
      ctx.quadraticCurveTo(-s*1.05, s*0.3, -s, -s*0.85);
      ctx.fill();
      // 眼窝
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.ellipse(-s*0.35, -s*0.15, s*0.22, s*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s*0.35, -s*0.15, s*0.22, s*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 鼻子三角
      ctx.beginPath(); ctx.moveTo(0, s*0.08); ctx.lineTo(-s*0.12, s*0.32); ctx.lineTo(s*0.12, s*0.32); ctx.fill();
      ctx.restore();
    };
  }

  // 预加载敌车sprite图片
  _loadEnemySprites() {
    const types = ['normal', 'fast', 'tank', 'boss'];
    const basePath = this.assets.vehicles.enemy.path;
    let loaded = 0;
    types.forEach(type => {
      const img = new Image();
      const file = this.assets.vehicles.enemy.types[type].file;
      img.src = basePath + file;
      img.onload = () => {
        this.enemyImages[type] = img;
        loaded++;
        if (loaded === types.length) { this._enemyImagesLoaded = true; }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === types.length) { this._enemyImagesLoaded = true; }
      };
    });

    // 加载Boss变体sprite
    const bossCfg = window.GameConfig?.stages?.boss || {};
    const variants = bossCfg.variants || [];
    variants.forEach(v => {
      if (!v.sprite) return;
      const img = new Image();
      img.src = v.sprite + '?v=1';
      img.onload = () => { this.bossVariantImages[v.key] = img; };
    });
  }

  /** 预加载赛道背景图（用于手动drawImage滚动），支持多张随机切换 */
  _loadTrackBg() {
    const cfg = this.assets.scenes.trackBg;
    // 两套背景：原沙漠/赛道(track_bg.png) + 海边公路(track_bg_2.png)
    const files = ['track_bg.png', 'track_bg_2.png'];
    this.trackImgs = [];
    files.forEach((fname, idx) => {
      const img = new Image();
      img.src = cfg.path + fname + '?v=3';
      this.trackImgs.push(img);
    });
    // 默认当前背景：随机一张
    this.trackImg = this.trackImgs[Math.floor(Math.random() * this.trackImgs.length)];
  }

  /** 预加载战斗结算界面切图素材 */
  _loadResultUI() {
    const files = {
      panelWin: 'panel_win.png',
      panelFail: 'panel_fail.png',
      btnClaim: 'btn_claim.png',
      btnRetry: 'btn_retry.png',
      btnBack: 'btn_back.png',
      coinBig: 'coin_big.png',
      coinGlow: 'coin_glow.png',
      iconTargetCyan: 'icon_target_cyan.png',
      iconRoadCyan: 'icon_road_cyan.png',
      iconCoinPileCyan: 'icon_coinpile_cyan.png',
      iconTargetRed: 'icon_target_red.png',
      iconRoadRed: 'icon_road_red.png',
      iconCoinRed: 'icon_coin_red.png',
    };
    const base = 'assets/ui/';
    Object.keys(files).forEach((k) => {
      const img = new Image();
      img.src = base + files[k] + '?v=4';
      this.resultImgs[k] = img;
    });
  }

  /** 预加载障碍物sprite图片（6种路障） */
  _loadObstacleSprites() {
    const types = ['barrier', 'cone', 'spike', 'gate', 'debris', 'heavy_barrier'];
    const basePath = this.assets.vehicles.obstacle.path;
    let loaded = 0;
    types.forEach(type => {
      const img = new Image();
      const file = this.assets.vehicles.obstacle.types[type].file;
      img.src = basePath + file + '?v=1';
      img.onload = () => {
        this.obstacleImages[type] = img;
        loaded++;
        if (loaded === types.length) { this._obstacleImagesLoaded = true; }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === types.length) { this._obstacleImagesLoaded = true; }
      };
    });
  }

  onEnter() {
    // 切换到战斗BGM（更紧张的快节奏，E小调）
    if (window.AudioManager) window.AudioManager.playBgm('battle');
    this._initStage();
    this.eventBus.on('touchStart', (pos) => this._onTouchStart(pos));
    this.eventBus.on('touchMove', (pos) => this._onTouchMove(pos));
    this.eventBus.on('touchEnd', (pos) => this._onTouchEnd(pos));
  }

  onExit() {
    this.eventBus.off('touchStart');
    this.eventBus.off('touchMove');
    this.eventBus.off('touchEnd');
    // 重置结算状态，避免残留触发场景外的 advanceStage / claim 等逻辑
    this.victory = false;
    this.gameOver = false;
    this._resultBtns = null;
  }

  _initStage() {
    const stageCfg = window.GameConfig?.stages || {};
    const vehicleStats = this.state.getSelectedCarStats();

    // 距离模式判断
    this.isEndless = this.state.get('gameMode') === 'endless';

    this.stageLevel = this.state.get('currentStage');

    // 每关切换赛道背景（轮流交替：保证连续两关一定不同）
    if (this.trackImgs && this.trackImgs.length > 0) {
      // 用关卡数取模，奇偶关切换；endless 模式用时间戳
      const idx = this.isEndless
        ? Math.floor(Math.random() * this.trackImgs.length)
        : (this.stageLevel - 1) % this.trackImgs.length;
      this.trackImg = this.trackImgs[idx];
      console.log('[Track BG] stage=' + this.stageLevel + ' bg=' + idx);
    }

    if (this.isEndless) {
      // 距离模式：无距离上限、无Boss
      this.targetDistance = Infinity;
      this.effectiveStage = 1;
      this.earnedCoins = 0;
      const endlessCfg = stageCfg.endless || {};
      this.scrollSpeed = endlessCfg.baseScrollSpeed || 2.5;
    } else {
      this.targetDistance = (stageCfg.baseDistance || 500) + this.stageLevel * (stageCfg.distancePerStage || 50);
      this.scrollSpeed = 3 + this.stageLevel * 0.02;
    }

    this.distance = 0;
    this.kills = 0;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.stageTime = 0;
    this.bossPhase = 'none';
    this.bossWarningTimer = 0;
    this.bossEnemy = null;
    this.bossTargetY = 200;

    // 初始化玩家属性
    this.player.hp = vehicleStats.hp;
    this.player.maxHp = vehicleStats.hp;
    this.player.atk = vehicleStats.atk;
    this.player.bullets = vehicleStats.bullets;
    this.player.x = this.W / 2;
    this.player.y = this.H * 0.75;
    this.player.invincible = false;
    this.player.invincibleTimer = 0;
    this.player.buffs = [];
    this.player.shootTimer = 0;

    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.buffItems = [];
    this.effects = [];
    this.floatingTexts = [];

    this.enemySpawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.buffSpawnTimer = 0;
    this.scrollOffset = 0;
    this.bossShootTimer = 0;

    // ===== 无人机轰炸系统 =====
    // 是否装备无人机（从 state 读取）
    this.droneEquipped = !!this.state.get('droneEquipped');
    // 关卡模式：每关只能出现一次
    this.droneUsedThisStage = false;
    // 关卡模式：触发延时（进入关卡后2~5秒随机时刻触发）
    this.droneTriggerTimer = 2000 + Math.random() * 3000;
    // 距离模式：上次触发距离（每1000m触发一次）
    this.droneLastTriggerDist = 0;
    // 当前活跃的无人机对象（null 表示未出现）
    this.activeDrone = null;
    // 无人机抛下的炸弹列表
    this.droneBombs = [];
    // 炸弹爆炸的冲击波列表
    this.droneBlasts = [];
    // 玩家车尾气粒子缓存
    this._exhaustParticles = [];
  }

  update(dt) {
    if (this.gameOver || this.victory || this.paused) return;

    const ms = dt * 1000;

    // 距离推进 + 本局时间累计
    this.distance += this.scrollSpeed * dt * 10;
    this.stageTime += dt;
    this.scrollOffset = (this.scrollOffset + this.scrollSpeed) % this.H;

    // === 距离模式专用逻辑 ===
    if (this.isEndless) {
      const endlessCfg = window.GameConfig?.stages?.endless || {};
      // 滚动速度随时间增长
      const growthInterval = endlessCfg.scrollSpeedGrowthInterval || 60;
      const growthAmount = endlessCfg.scrollSpeedGrowth || 0.3;
      const maxSpeed = endlessCfg.maxScrollSpeed || 7;
      const growthCycles = Math.floor(this.stageTime / growthInterval);
      this.scrollSpeed = Math.min(maxSpeed, (endlessCfg.baseScrollSpeed || 2.5) + growthCycles * growthAmount);

      // 等效关卡随时间增长（用于敌车HP/ATK计算）
      const stageGrowthSec = endlessCfg.stageGrowthPerSeconds || 30;
      this.effectiveStage = Math.floor(this.stageTime / stageGrowthSec) + 1;
    }

    // Boss关底逻辑：距离模式下跳过Boss
    const bossCfg = window.GameConfig?.stages?.boss || {};
    const bossEnabled = !this.isEndless && bossCfg.enabled !== false;

    if (bossEnabled && this.bossPhase === 'none' && this.distance >= this.targetDistance) {
      // 距离达标，进入Boss警告阶段
      this.bossPhase = 'warning';
      this.bossWarningTimer = bossCfg.warningDuration || 2000;
      this.distance = this.targetDistance; // 锁定距离不再增长
      // 预先 roll variant，让警告文字能显示Boss名
      const variants = bossCfg.variants || [];
      if (variants.length > 0) {
        // 第一关必出 OK Boss；其他关卡随机
        if (this.stageLevel === 1) {
          const okVariant = variants.find(v => v.key === 'ok');
          this.pendingBossVariant = okVariant || variants[0];
        } else {
          // 后续关卡随机但排除 OK（OK 仅第一关）
          const rest = variants.filter(v => v.key !== 'ok');
          const pool = rest.length > 0 ? rest : variants;
          this.pendingBossVariant = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    }

    // Boss警告阶段倒计时
    if (this.bossPhase === 'warning') {
      this.bossWarningTimer -= ms;
      if (this.bossWarningTimer <= 0) {
        // 警告结束，Boss入场
        this.bossPhase = 'entering';
        this._spawnBoss();
      }
    }

    // Boss入场阶段：Boss移动到目标位置
    if (this.bossPhase === 'entering' && this.bossEnemy) {
      const b = this.bossEnemy;
      const enterSpeed = bossCfg.enterSpeed || 3;
      if (b.y < this.bossTargetY) {
        b.y += enterSpeed + this.scrollSpeed;
        if (b.y >= this.bossTargetY) {
          b.y = this.bossTargetY;
          this.bossPhase = 'fighting';
        }
      }
    }

    // Boss战斗阶段：Boss左右移动+上下摆动+射击
    if (this.bossPhase === 'fighting' && this.bossEnemy) {
      const b = this.bossEnemy;
      const amp = bossCfg.floatAmplitude || 15;
      const spd = bossCfg.floatSpeed || 1.5;
      b.y = this.bossTargetY + Math.sin(b.age * spd) * amp;
      // 左右移动（速度和幅度随关卡递增）
      const sc1 = bossCfg.scaling || {};
      const moveSpd = (sc1.moveBaseSpeed || 1.0) + (this.stageLevel - 1) * (sc1.moveSpeedScale || 0.015);
      const moveAmp = (sc1.moveBaseAmp || 120) + (this.stageLevel - 1) * (sc1.moveAmpScale || 1.2);
      b.x = this.W / 2 + Math.sin(b.age * moveSpd) * moveAmp;
      // 限制不出路外
      const halfW = b.width / 2;
      b.x = Math.max(this.roadX + halfW, Math.min(this.roadX + this.roadWidth - halfW, b.x));

      // Boss射击（间隔随关卡递减）
      this.bossShootTimer -= ms;
      if (this.bossShootTimer <= 0) {
        this._bossShoot();
        const sc2 = bossCfg.scaling || {};
        const shootBase = sc2.shootBaseInterval || 1200;
        const shootDec = sc2.shootIntervalDec || 15;
        const shootMin = sc2.shootMinInterval || 400;
        this.bossShootTimer = Math.max(shootMin, shootBase - (this.stageLevel - 1) * shootDec);
      }

      // 检查Boss是否被击败
      if (b.hp <= 0) {
        this.bossPhase = 'defeated';
        this._onBossDefeated();
      }
    }

    // 非Boss模式下（Boss未启用），保持旧逻辑：距离达标直接胜利
    if (!bossEnabled && this.distance >= this.targetDistance) {
      this.victory = true;
      if (window.AudioManager && window.AudioManager.victory) window.AudioManager.victory();
      return;
    }

    // 玩家射击
    this.player.shootTimer -= ms;
    if (this.player.shootTimer <= 0) {
      this._shoot();
      const interval = window.GameConfig?.battle?.shootInterval || 300;
      this.player.shootTimer = interval;
    }

    // 无敌计时
    if (this.player.invincible) {
      this.player.invincibleTimer -= ms;
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
      }
    }

    // BUFF计时
    this.player.buffs = this.player.buffs.filter(b => {
      b.remaining -= ms;
      return b.remaining > 0;
    });

    // 治疗特效计时器
    if (this._healEffectTimer && this._healEffectTimer > 0) {
      this._healEffectTimer -= dt * 1.2;
    }

    // 生成敌方（Boss阶段停止刷小兵）
    const stopRegular = this.bossPhase !== 'none' && bossCfg.stopRegularSpawns !== false;
    this.enemySpawnTimer -= ms;
    if (this.enemySpawnTimer <= 0 && !stopRegular) {
      this._spawnEnemy();
      const stgCfg = window.GameConfig?.stages || {};
      const minInterval = stgCfg.enemySpawnMinInterval || 500;
      const maxInterval = stgCfg.enemySpawnMaxInterval || 1000;

      if (this.isEndless) {
        // 无尽模式：每1000m敌车间隔减100ms, 下限280ms（保持有挑战但能操作）
        const km = this.distance / 1000;
        const baseEndless = 1000 - km * 100;
        this.enemySpawnTimer = Math.max(280, baseEndless);
      } else {
        const distFactor = stgCfg.enemySpawnDistFactor || 0.0005;
        const distBased = maxInterval * (1 - this.distance * distFactor);
        this.enemySpawnTimer = Math.max(minInterval, distBased);
      }
    }

    // 生成障碍物（Boss阶段停止刷障碍）
    const stopObstacle = this.bossPhase !== 'none' && bossCfg.stopObstacleSpawns !== false;
    this.obstacleSpawnTimer -= ms;
    if (this.obstacleSpawnTimer <= 0 && !stopObstacle) {
      this._spawnObstacle();
      const baseInterval = window.GameConfig?.stages?.obstacleSpawnBaseInterval || 3000;
      const decrease = window.GameConfig?.stages?.obstacleSpawnIntervalDecrease || 8;
      const minInterval = window.GameConfig?.stages?.obstacleSpawnMinInterval || 800;

      if (this.isEndless) {
        // 无尽模式：每1000m障碍物间隔减200ms, 下限700ms（避开难度但仍要操作）
        const km = this.distance / 1000;
        const baseEndless = 3000 - km * 200;
        this.obstacleSpawnTimer = Math.max(700, baseEndless);
      } else {
        const obsLv = this.stageLevel;
        this.obstacleSpawnTimer = Math.max(minInterval, baseInterval - obsLv * decrease);
      }
    }

    // 生成BUFF道具
    this.buffSpawnTimer -= ms;
    if (this.buffSpawnTimer <= 0) {
      this._spawnBuffItem();
      this.buffSpawnTimer = window.GameConfig?.battle?.buffSpawnInterval || 8000;
    }

    // 更新子弹
    this._updateBullets(dt);
    // 更新敌方子弹
    this._updateEnemyBullets(dt);
    // 更新敌方
    this._updateEnemies(dt);
    // 更新障碍物
    this._updateObstacles(dt);
    // 更新BUFF道具
    this._updateBuffItems(dt);
    // 更新特效
    this._updateEffects(dt);
    // 更新浮动文字
    this._updateFloatingTexts(dt);
    // 更新无人机轰炸
    this._updateDrone(dt);
    // 碰撞检测
    this._checkCollisions();
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.W, this.H);

    // 赛道背景（滚动）
    this._renderTrack(ctx);

    // BUFF道具
    this.buffItems.forEach(item => this._renderBuffItem(ctx, item));

    // 障碍物
    this.obstacles.forEach(obs => this._renderObstacle(ctx, obs));

    // 敌方
    this.enemies.forEach(enemy => this._renderEnemy(ctx, enemy));

    // 子弹
    this.bullets.forEach(bullet => this._renderBullet(ctx, bullet));

    // 敌方子弹（Boss弹幕）
    this.enemyBullets.forEach(b => this._renderEnemyBullet(ctx, b));

    // 无人机炸弹爆炸的冲击波（在玩家下方）
    this.droneBlasts.forEach(blast => this._renderDroneBlast(ctx, blast));

    // 玩家
    this._renderPlayer(ctx);

    // 无人机抛下的炸弹（在玩家之上，营造从天而降感）
    this.droneBombs.forEach(bomb => this._renderDroneBomb(ctx, bomb));

    // 无人机本体（最高层，从下方飞向上方）
    if (this.activeDrone) this._renderDroneShip(ctx, this.activeDrone);

    // 特效
    this.effects.forEach(fx => this._renderEffect(ctx, fx));

    // 浮动文字
    this.floatingTexts.forEach(ft => this._renderFloatingText(ctx, ft));

    // HUD
    this._renderHUD(ctx);

    // Boss来袭警告
    if (this.bossPhase === 'warning') this._renderBossWarning(ctx);
    // Boss专属血条
    if (this.bossEnemy && (this.bossPhase === 'entering' || this.bossPhase === 'fighting')) {
      this._renderBossHPBar(ctx);
    }

    // 结算覆盖层
    if (this.isEndless && this.gameOver) {
      this._renderEndlessResultPanel(ctx);
    } else {
      if (this.victory) this._renderVictory(ctx);
      if (this.gameOver) this._renderGameOver(ctx);
    }

    // 暂停覆盖层
    if (this.paused) this._renderPauseOverlay(ctx);
  }

  // ========== 射击 ==========

  _shoot() {
    // 射击音效
    if (window.AudioManager) window.AudioManager.shoot();
    const battleCfg = window.GameConfig?.battle || {};
    const baseBulletCount = this.player.bullets;

    // 加速buff：弹数翻倍
    const hasSpeed = this.player.buffs.some(b => b.type === 'speed');
    const bulletCount = hasSpeed ? baseBulletCount * 2 : baseBulletCount;

    // 获取弹幕模式（LV.11+ 复用 LV.10）
    const carLevel = this.state.get('selectedCarLevel') || 1;
    const patterns = battleCfg.bulletPatterns || {};
    const patternLevel = Math.min(carLevel, 10);
    const pattern = patterns[patternLevel] || { angleStep: 0.15, speed: 12, behavior: 'straight', color: 'cyan' };

    const hasFireBoost = this.player.buffs.some(b => b.type === 'fireboost');
    const damage = this.player.atk * (battleCfg.bulletDamageMultiplier || 1) * (hasFireBoost ? 2 : 1);
    const speed = pattern.speed || battleCfg.bulletSpeed || 12;
    // 加速buff下弹角更密（避免弹幕散得太开）
    const angleStep = (pattern.angleStep != null ? pattern.angleStep : 0.15) * (hasSpeed ? 0.7 : 1);

    for (let i = 0; i < bulletCount; i++) {
      const offset = (i - (bulletCount - 1) / 2) * angleStep;
      const bvx = Math.sin(offset) * speed;
      const bvy = -Math.cos(offset) * speed;

      const bullet = {
        x: this.player.x,
        y: this.player.y - this.player.height * 0.35,  // 车头位置（贴近实际车头而非视觉框顶部）
        vx: bvx,
        vy: bvy,
        damage,
        width: 16,
        height: 24,
        isPower: hasFireBoost,
        age: 0,
        behavior: pattern.behavior || 'straight',
        color: pattern.color || 'cyan',
        patternData: {},
      };

      // 弹幕行为初始化
      switch (pattern.behavior) {
        case 'wave':
          bullet.patternData.waveAmp = pattern.waveAmp || 2;
          bullet.patternData.waveFreq = pattern.waveFreq || 5;
          bullet.patternData.baseVx = bvx;
          bullet.patternData.phase = i * Math.PI; // 交替相位
          break;

        case 'spiral':
          bullet.patternData.spiralRadius = pattern.spiralRadius || 25;
          bullet.patternData.spiralSpeed = pattern.spiralSpeed || 5;
          // 子弹均匀分布在圆周上
          bullet.patternData.spiralPhase = (i / Math.max(1, bulletCount)) * Math.PI * 2;
          bullet.patternData.startX = this.player.x;
          bullet.patternData.startY = this.player.y - this.player.height / 2;
          bullet.patternData.baseSpeed = speed;
          break;

        case 'homing':
          bullet.patternData.homingStrength = pattern.homingStrength || 0.03;
          bullet.patternData.homingDelay = 0.08; // 短暂直飞后开始追踪
          break;

        case 'converge':
          bullet.patternData.convergeRate = pattern.convergeRate || 0.02;
          break;

        case 'mixed':
          // 天罚模式：中间子弹直射，最外侧2发追踪
          const isOuter = (i === 0 || i === bulletCount - 1);
          if (isOuter) {
            bullet.behavior = 'homing';
            bullet.patternData.homingStrength = pattern.homingStrength || 0.025;
            bullet.patternData.homingDelay = 0.1;
          } else {
            bullet.behavior = 'straight';
          }
          break;
      }

      this.bullets.push(bullet);
    }
  }

  // ========== 生成 ==========

  _spawnEnemy() {
    const cfg = window.GameConfig?.stages?.enemy || {};

    // 同屏敌车数量限制（按时间分段表）
    const countTable = window.GameConfig?.stages?.enemyCountTable;
    if (countTable && countTable.length > 0) {
      let segment = countTable[countTable.length - 1];
      for (let i = 0; i < countTable.length; i++) {
        if (this.stageTime < countTable[i].maxTime) {
          segment = countTable[i];
          break;
        }
      }
      const maxCount = segment.min + Math.floor(Math.random() * (segment.max - segment.min + 1));
      if (this.enemies.length >= maxCount) return;
    }

    const lane = Math.floor(Math.random() * this.laneCount);
    const x = this.roadX + this.laneWidth * (lane + 0.5);
    // Boss由关底机制生成，常规刷怪不再出Boss
    const type = Math.random() < 0.3 ? 'fast' :
                 Math.random() < 0.2 ? 'tank' : 'normal';

    // HP成长公式: 类型基础HP * growFactor^(关卡-1) + growFactor1 * ceil(关卡/growDan)
    const effectiveLv = this.isEndless ? this.effectiveStage : this.stageLevel;
    const baseHpMap = cfg.baseHp || { normal: 5, fast: 5, tank: 10, boss: 400 };
    const typeBaseHp = baseHpMap[type] || 5;
    const growFactor = cfg.hpGrowFactor || 1.05;
    const growFactor1 = cfg.hpGrowFactor1 || 0;
    const growDan = cfg.hpGrowDan || 2;
    const calculatedHp = typeBaseHp * Math.pow(growFactor, effectiveLv - 1)
                       + growFactor1 * Math.ceil(effectiveLv / growDan);
    // boss乘3倍，tank乘2倍，fast乘0.7倍（原表只有基础值，按类型再乘系数）
    const typeMult = { normal: 1, fast: 0.7, tank: 2, boss: 3 };
    const m = typeMult[type] || 1;
    const finalHp = Math.max(1, Math.floor(calculatedHp * m));

    const atkFactor = cfg.atkFactor || 1;

    this.enemies.push({
      x,
      y: -120,
      width: 80 * (type === 'boss' ? 1.7 : type === 'tank' ? 1.35 : type === 'fast' ? 1 : 1),
      height: 95 * (type === 'boss' ? 1.6 : type === 'tank' ? 1.3 : type === 'fast' ? 0.9 : 1),
      hp: finalHp,
      maxHp: finalHp,
      atk: Math.floor((cfg.atkBase || 5) * m * atkFactor + effectiveLv * (cfg.atkScale || 0.3)),
      speed: Math.min(cfg.speedMax || 6, (cfg.speedBase || 2) * m + effectiveLv * (cfg.speedScale || 0.02)),
      type,
      age: 0,
    });
  }

  /** 生成关底Boss */
  _spawnBoss() {
    const cfg = window.GameConfig?.stages?.enemy || {};
    const bossCfg = window.GameConfig?.stages?.boss || {};
    const sc = bossCfg.scaling || {};

    // 使用 warning 阶段预先 roll 好的 variant，没有则随机选
    let variant = this.pendingBossVariant;
    if (!variant) {
      const variants = bossCfg.variants || [{ key: 'default', pattern: 'fan', hpMul: 1.0 }];
      variant = variants[Math.floor(Math.random() * variants.length)];
    }
    this.pendingBossVariant = null;

    // Boss HP = scaling.baseHp * scaling.hpGrow^(关卡-1) * variant.hpMul
    const baseHp = sc.baseHp || 500;
    const hpGrow = sc.hpGrow || 1.08;
    const hpMul = variant.hpMul || 1.0;
    const bossHp = Math.floor(baseHp * Math.pow(hpGrow, this.stageLevel - 1) * hpMul);

    // Boss碰撞攻击力 = 基础atk公式（与普通敌车一致）
    const bossAtk = Math.floor((cfg.atkBase || 5) * 2 + this.stageLevel * (cfg.atkScale || 0.3));

    const boss = {
      x: this.W / 2,
      y: bossCfg.spawnY || -200,
      width: 136 * 1.2,   // Boss比普通boss更大
      height: 160 * 1.2,
      hp: bossHp,
      maxHp: bossHp,
      atk: bossAtk,
      speed: 0,            // Boss不随背景滚动，由bossPhase控制移动
      type: 'boss',
      age: 0,
      // 变体信息
      variant: variant,
      bossShotCounter: 0,  // 用于ringBurst pattern计数
    };

    this.bossEnemy = boss;
    this.bossTargetY = bossCfg.targetY || 200;
    // 射击间隔随关卡递减: max(min, base - (关卡-1)*dec)
    const shootBase = sc.shootBaseInterval || 1200;
    const shootDec = sc.shootIntervalDec || 15;
    const shootMin = sc.shootMinInterval || 500;
    this.bossShootTimer = Math.max(shootMin, shootBase - (this.stageLevel - 1) * shootDec);
    this.enemies.push(boss);
  }

  /** Boss射击 - 根据variant.pattern走不同弹幕 */
  _bossShoot() {
    const bossCfg = window.GameConfig?.stages?.boss || {};
    const sc = bossCfg.scaling || {};
    const b = this.bossEnemy;
    if (!b || b.hp <= 0) return;

    const variant = b.variant || { pattern: 'fan' };
    const pattern = variant.pattern || 'fan';

    // 子弹数量: baseCount + floor((关卡-1)/interval), 上限maxCount
    const baseCount = sc.bulletBaseCount || 2;
    const countInterval = sc.bulletCountInterval || 5;
    const maxCount = sc.bulletMaxCount || 9;
    const count = Math.min(maxCount, baseCount + Math.floor((this.stageLevel - 1) / countInterval));

    const speed = bossCfg.bulletSpeed || 7;
    // 子弹伤害
    const baseDmg = sc.bulletBaseDmg || 5;
    const dmgScale = sc.bulletDmgScale || 0.3;
    const damage = Math.floor(baseDmg + this.stageLevel * dmgScale);

    const color = variant.bulletColor || { core: '#FFFFFF', mid: '#FF80FF', outer: '#C040FF' };

    b.bossShotCounter = (b.bossShotCounter || 0) + 1;

    if (pattern === 'crossSpiral') {
      // ===== 紫晶刺甲：十字螺旋弹幕 =====
      // 4方向同时发射，整体随时间缓慢旋转，每个臂发射count颗
      const arms = variant.spiralArms || 4;
      const rotSpeed = variant.spiralRotSpeed || 1.6;
      // 当前螺旋整体旋转角（基于bossShotCounter递增）
      const spiralPhase = b.bossShotCounter * (0.35 / rotSpeed); // 每次射击转一点
      // 每个臂内子弹小扇形
      const armSpread = 0.18;
      const armBulletCount = Math.max(1, Math.floor(count / 2)); // 每臂少一点，总弹幕量与count接近
      for (let a = 0; a < arms; a++) {
        const armAngle = spiralPhase + (Math.PI * 2 / arms) * a;
        for (let i = 0; i < armBulletCount; i++) {
          const offset = armBulletCount === 1 ? 0 : (i - (armBulletCount - 1) / 2) * (armSpread / (armBulletCount - 1));
          const angle = armAngle + offset;
          this.enemyBullets.push({
            x: b.x,
            y: b.y + b.height * 0.35,  // 车前部（朝玩家方向）
            vx: Math.cos(angle) * speed * 0.85,
            vy: Math.sin(angle) * speed * 0.85,
            damage,
            width: 12,
            height: 12,
            age: 0,
            color,
            shape: 'diamond', // 菱形子弹
          });
        }
      }
    } else if (pattern === 'ringBurst') {
      // ===== 暗影暴风：环形爆裂 =====
      // 普通射击：朝玩家方向发射散弹（少量）
      // 每N次普通射击触发一次360°大环爆
      const burstInterval = variant.ringBurstInterval || 3;
      const isBurst = b.bossShotCounter % burstInterval === 0;

      if (isBurst) {
        // 大环爆：360°均匀发射ringBurstCount颗弹
        const ringCount = variant.ringBurstCount || 16;
        for (let i = 0; i < ringCount; i++) {
          const angle = (Math.PI * 2 / ringCount) * i;
          this.enemyBullets.push({
            x: b.x,
            y: b.y + b.height * 0.35,  // 车前部
            vx: Math.cos(angle) * speed * 0.7,
            vy: Math.sin(angle) * speed * 0.7,
            damage,
            width: 14,
            height: 14,
            age: 0,
            color,
            shape: 'pulse', // 脉冲圆形子弹
          });
        }
      } else {
        // 普通射击：朝玩家方向小扇形
        const dx = this.player.x - b.x;
        const dy = this.player.y - b.y;
        const baseAngle = Math.atan2(dy, dx);
        const spread = 0.5;
        const normalCount = Math.max(3, count);
        for (let i = 0; i < normalCount; i++) {
          const offset = (i - (normalCount - 1) / 2) * (spread / Math.max(1, normalCount - 1));
          const angle = baseAngle + offset;
          this.enemyBullets.push({
            x: b.x,
            y: b.y + b.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            width: 12,
            height: 12,
            age: 0,
            color,
            shape: 'pulse',
          });
        }
      }
    } else if (pattern === 'okLetters') {
      // ===== 雷电黑帮：OK字形弹幕 =====
      // 在Boss车前方拼出"OK"字样，子弹缓慢下落
      const spread = variant.okSpread || 240;
      const letterH = variant.okHeight || 110;
      const okSpeed = variant.okBulletSpeed || 5;

      // 字符位置：O在左、K在右，中间留间距
      const gap = spread * 0.18;
      const letterW = (spread - gap) / 2;
      const baseY = b.y + b.height * 0.35;
      // O 中心 X
      const ocx = b.x - (letterW / 2 + gap / 2);
      // K 起点 X（左边）
      const kx = b.x + gap / 2;

      // —— 字母 O：椭圆环（16颗子弹围一圈）
      const oCount = 14;
      const oRx = letterW / 2;
      const oRy = letterH / 2;
      for (let i = 0; i < oCount; i++) {
        const a = (Math.PI * 2 * i) / oCount - Math.PI / 2;
        const offX = Math.cos(a) * oRx;
        const offY = Math.sin(a) * oRy;
        this.enemyBullets.push({
          x: ocx + offX,
          y: baseY + offY,
          vx: 0,
          vy: okSpeed,
          damage,
          width: 14,
          height: 14,
          age: 0,
          color,
          shape: 'pulse',
        });
      }

      // —— 字母 K：三条线段
      // 竖线（K 的左边）：从顶到底，4颗
      const kStrokeCount = 5;
      for (let i = 0; i < kStrokeCount; i++) {
        const t = i / (kStrokeCount - 1);
        this.enemyBullets.push({
          x: kx,
          y: baseY - letterH / 2 + t * letterH,
          vx: 0,
          vy: okSpeed,
          damage,
          width: 14,
          height: 14,
          age: 0,
          color,
          shape: 'pulse',
        });
      }
      // 右上斜线（K 的右上）：从竖线中点到右上角，3颗
      const upStrokeCount = 4;
      for (let i = 1; i <= upStrokeCount; i++) {
        const t = i / upStrokeCount;
        this.enemyBullets.push({
          x: kx + t * letterW,
          y: baseY - t * (letterH / 2),
          vx: 0,
          vy: okSpeed,
          damage,
          width: 14,
          height: 14,
          age: 0,
          color,
          shape: 'pulse',
        });
      }
      // 右下斜线（K 的右下）：从竖线中点到右下角，3颗
      for (let i = 1; i <= upStrokeCount; i++) {
        const t = i / upStrokeCount;
        this.enemyBullets.push({
          x: kx + t * letterW,
          y: baseY + t * (letterH / 2),
          vx: 0,
          vy: okSpeed,
          damage,
          width: 14,
          height: 14,
          age: 0,
          color,
          shape: 'pulse',
        });
      }
    } else {
      // ===== 默认 fan 扇形弹幕 =====
      const baseSpread = bossCfg.bulletSpread || 0.35;
      const spread = baseSpread + (count - baseCount) * 0.12;
      const dx = this.player.x - b.x;
      const dy = this.player.y - b.y;
      const baseAngle = Math.atan2(dy, dx);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
        const angle = baseAngle + offset;
        this.enemyBullets.push({
          x: b.x,
          y: b.y + b.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          damage,
          width: 12,
          height: 12,
          age: 0,
          color,
          shape: 'comet',
        });
      }
    }
  }

  /** Boss被击败时的处理 */
  _onBossDefeated() {
    const bossCfg = window.GameConfig?.stages?.boss || {};
    const count = bossCfg.defeatExplosionCount || 5;
    const b = this.bossEnemy;
    if (b) {
      // 连环爆炸特效
      for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * b.width;
        const offsetY = (Math.random() - 0.5) * b.height;
        this.effects.push({
          x: b.x + offsetX,
          y: b.y + offsetY,
          type: 'enemyDeath',
          timer: 0.8 + i * 0.15,
          duration: 0.8 + i * 0.15,
        });
      }
      // 大额金币浮动文字
      this._addFloatingText(b.x, b.y, `+${Math.floor(b.maxHp * 2)}`, '#FFD700');
    }
    // 清理Boss残留子弹
    this.enemyBullets = [];
    // 延迟显示胜利界面（让爆炸特效播完）
    setTimeout(() => {
      this.victory = true;
      if (window.AudioManager && window.AudioManager.victory) window.AudioManager.victory();
    }, 800);
  }

  _spawnObstacle() {
    const cfg = window.GameConfig?.stages?.obstacle || {};
    const lane = Math.floor(Math.random() * this.laneCount);
    const x = this.roadX + this.laneWidth * (lane + 0.5);
    const typeList = ['barrier', 'cone', 'spike', 'gate', 'debris', 'heavy_barrier'];
    const type = typeList[Math.floor(Math.random() * typeList.length)];

    // 从配置获取尺寸
    const sizeCfg = this.assets.vehicles.obstacle.types[type]?.size || { width: 60, height: 60 };

    // 从屏幕上方生成，随背景向下滚动
    const y = -80;

    // gate（升降栏杆）横跨较宽，强制居中车道
    const finalX = (type === 'gate') ? (this.roadX + this.roadWidth / 2) : x;

    this.obstacles.push({
      x: finalX,
      y,
      width: sizeCfg.width,
      height: sizeCfg.height,
      hp: Math.floor((cfg.hpBase || 20) * (1 + (this.isEndless ? this.effectiveStage : this.stageLevel) * (cfg.hpScale || 0.1))),
      type,
      collisionDamage: cfg.collisionDamage || 15,
    });
  }

  _spawnBuffItem() {
    const buffCfg = window.GameConfig?.battle?.buffs || {};
    const types = ['fireboost', 'shield', 'speed', 'heal'];
    const type = types[Math.floor(Math.random() * types.length)];
    const cfg = buffCfg[type] || {};
    if (Math.random() > (cfg.spawnChance || 0.08)) return;

    const lane = Math.floor(Math.random() * this.laneCount);
    const x = this.roadX + this.laneWidth * (lane + 0.5);

    this.buffItems.push({
      x, y: -40,
      width: 40, height: 40,
      type,
      speed: 2,
    });
  }

  // ========== 更新 ==========

  _updateBullets(dt) {
    const self = this;
    this.bullets = this.bullets.filter(b => {
      b.age += dt;

      switch (b.behavior) {
        case 'wave': {
          // 正弦波动：在基础vx上叠加正弦偏移
          const baseVx = b.patternData.baseVx || 0;
          const amp = b.patternData.waveAmp || 2;
          const freq = b.patternData.waveFreq || 5;
          const phase = b.patternData.phase || 0;
          b.vx = baseVx + Math.sin(b.age * freq + phase) * amp;
          b.x += b.vx;
          b.y += b.vy;
          break;
        }

        case 'spiral': {
          // 螺旋：子弹绕直线上升的中心点旋转
          const radius = b.patternData.spiralRadius || 25;
          const spd = b.patternData.spiralSpeed || 5;
          const ph = b.patternData.spiralPhase || 0;
          const baseSpeed = b.patternData.baseSpeed || 12;
          const prevX = b.x, prevY = b.y;
          // 中心点直线上升
          const cx = b.patternData.startX;
          const cy = b.patternData.startY - baseSpeed * b.age * 60; // age是秒，速度按帧60fps换算
          // 子弹位置 = 中心 + 旋转偏移
          b.x = cx + Math.cos(b.age * spd + ph) * radius;
          b.y = cy + Math.sin(b.age * spd + ph) * radius;
          // 更新vx/vy供渲染用
          b.vx = b.x - prevX;
          b.vy = b.y - prevY;
          break;
        }

        case 'homing': {
          // 追踪：短暂直飞后向最近敌人偏转
          b.x += b.vx;
          b.y += b.vy;
          if (b.age > (b.patternData.homingDelay || 0.08) && self.enemies.length > 0) {
            let nearest = null, minDist = Infinity;
            for (const e of self.enemies) {
              const dx = e.x - b.x, dy = e.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < minDist) { minDist = d2; nearest = e; }
            }
            if (nearest) {
              const dx = nearest.x - b.x, dy = nearest.y - b.y;
              const targetAngle = Math.atan2(dy, dx);
              const curAngle = Math.atan2(b.vy, b.vx);
              let diff = targetAngle - curAngle;
              // 归一化到[-PI, PI]
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const strength = b.patternData.homingStrength || 0.03;
              const turn = Math.sign(diff) * Math.min(Math.abs(diff), strength);
              const spd2 = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              const newAngle = curAngle + turn;
              b.vx = Math.cos(newAngle) * spd2;
              b.vy = Math.sin(newAngle) * spd2;
            }
          }
          break;
        }

        case 'converge': {
          // 散射收束：宽散开后逐渐收窄到直线
          b.x += b.vx;
          b.y += b.vy;
          b.vx *= (1 - (b.patternData.convergeRate || 0.02));
          break;
        }

        case 'straight':
        default:
          b.x += b.vx;
          b.y += b.vy;
          break;
      }

      return b.y > -50 && b.x > -40 && b.x < this.W + 40;
    });
  }

  _updateEnemyBullets(dt) {
    this.enemyBullets = this.enemyBullets.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.age += dt;
      // 出屏移除
      return b.y < this.H + 30 && b.y > -30 && b.x > -30 && b.x < this.W + 30;
    });
  }

  _updateEnemies(dt) {
    this.enemies = this.enemies.filter(e => {
      e.age = (e.age || 0) + dt;
      // Boss不做出屏移除（由bossPhase控制）
      if (e === this.bossEnemy) {
        return e.hp > 0;
      }
      e.y += e.speed + this.scrollSpeed;
      if (e.y > this.H + 100) return false; // 出屏移除
      return e.hp > 0;
    });
    // Boss已被击败时从列表清除
    if (this.bossEnemy && this.bossEnemy.hp <= 0) {
      this.enemies = this.enemies.filter(e => e !== this.bossEnemy);
      if (this.bossPhase === 'defeated') {
        this.bossEnemy = null;
      }
    }
  }

  _updateObstacles(dt) {
    this.obstacles = this.obstacles.filter(o => {
      o.y += this.scrollSpeed;
      if (o.y > this.H + 100) return false; // 出屏移除
      return o.hp > 0;
    });
  }

  _updateBuffItems(dt) {
    this.buffItems = this.buffItems.filter(item => {
      item.y += item.speed + this.scrollSpeed;
      if (item.y > this.H + 50) return false;
      return true;
    });
  }

  _updateEffects(dt) {
    this.effects = this.effects.filter(fx => {
      fx.timer -= dt;
      return fx.timer > 0;
    });
  }

  _updateFloatingTexts(dt) {
    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.y -= 60 * dt;
      ft.timer -= dt;
      return ft.timer > 0;
    });
  }

  // ========== 碰撞检测 ==========

  _checkCollisions() {
    // 子弹 vs 敌方
    this.bullets.forEach(b => {
      this.enemies.forEach(e => {
        if (this._rectOverlap(b, e)) {
          e.hp -= b.damage;
          b.y = -100; // 标记移除
          // 命中溅射火花
          this._addEffect(b.x, b.y, 'hitSpark');
          this._addEffect(e.x, e.y, 'hit');
          // 命中音效
          if (window.AudioManager) window.AudioManager.hit();

          if (e.hp <= 0) {
            this.kills++;
            this._addEffect(e.x, e.y, 'enemyDeath');
            // 爆炸音效
            if (window.AudioManager) window.AudioManager.explosion();
            // Boss的击败由_onBossDefeated处理，这里只加普通金币文字
            if (e !== this.bossEnemy) {
              const killCoins = Math.floor(e.maxHp * 0.5);
              this._addFloatingText(e.x, e.y, `+${killCoins}`, '#FFD700');
              // 距离模式累计金币
              if (this.isEndless) this.earnedCoins += killCoins;
            }
          }
        }
      });

      // 子弹 vs 障碍物
      this.obstacles.forEach(o => {
        if (this._rectOverlap(b, o)) {
          o.hp -= b.damage;
          b.y = -100;
          // 障碍物命中溅射
          this._addEffect(b.x, b.y, 'hitSpark');
          // 命中音效
          if (window.AudioManager) window.AudioManager.hit();
          if (o.hp <= 0) {
            this._addEffect(o.x, o.y, 'enemyDeath');
            // 爆炸音效
            if (window.AudioManager) window.AudioManager.explosion();
          }
        }
      });
    });

    // 玩家碰撞箱（小于视觉尺寸，避免误判）
    const ph = { x: this.player.x, y: this.player.y,
                 width: this.player.hitWidth, height: this.player.hitHeight };

    // 玩家 vs 敌方
    if (!this.player.invincible) {
      this.enemies.forEach(e => {
        if (e.hp > 0 && this._rectOverlap(ph, e)) {
          this._playerTakeDamage(e.atk);
          if (e === this.bossEnemy) {
            // 撞Boss只扣玩家血，Boss不掉血
          } else {
            e.hp = 0;
            this._addEffect(e.x, e.y, 'enemyDeath');
          }
        }
      });

      // 玩家 vs 障碍物
      this.obstacles.forEach(o => {
        if (o.hp > 0 && this._rectOverlap(ph, o)) {
          this._playerTakeDamage(o.collisionDamage || 15);
          o.hp = 0;
          this._addEffect(o.x, o.y, 'enemyDeath');
        }
      });
    }

    // 玩家 vs BUFF道具（用碰撞箱，稍宽松）
    const pb = { x: this.player.x, y: this.player.y,
                 width: this.player.hitWidth * 1.3, height: this.player.hitHeight * 1.2 };
    this.buffItems = this.buffItems.filter(item => {
      if (this._rectOverlap(pb, item)) {
        this._applyBuff(item.type);
        return false;
      }
      return true;
    });

    // 敌方子弹 vs 玩家（用更紧凑的圆形检测，子弹必须实际打到车体才扣血）
    if (!this.player.invincible) {
      const bulletHitR = this.player.hitWidth * 0.45;  // 命中半径约36px
      this.enemyBullets = this.enemyBullets.filter(eb => {
        const dx = eb.x - this.player.x;
        const dy = eb.y - this.player.y;
        const r = bulletHitR + (eb.width || 12) * 0.5;
        if (dx * dx + dy * dy < r * r) {
          this._playerTakeDamage(eb.damage);
          this._addEffect(eb.x, eb.y, 'hit');
          return false; // 命中后移除
        }
        return true;
      });
    }
  }

  _playerTakeDamage(damage) {
    const hasShield = this.player.buffs.some(b => b.type === 'shield');
    const reduction = hasShield ? (window.GameConfig?.battle?.buffs?.shield?.damageReduction || 0.5) : 0;
    const actualDamage = Math.floor(damage * (1 - reduction));

    this.player.hp -= actualDamage;
    this._addFloatingText(this.player.x, this.player.y - 60, `-${actualDamage}`, '#FF5252');
    this._addEffect(this.player.x, this.player.y, 'hit');

    // 无敌帧
    this.player.invincible = true;
    this.player.invincibleTimer = window.GameConfig?.battle?.invincibleDuration || 1000;

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver = true;
      if (window.AudioManager && window.AudioManager.defeat) window.AudioManager.defeat();
    }
  }

  _applyBuff(type) {
    // buff拾取音效
    if (window.AudioManager) window.AudioManager.buff();
    const cfg = window.GameConfig?.battle?.buffs || {};
    const buffCfg = cfg[type] || {};

    // 移除同类旧BUFF
    this.player.buffs = this.player.buffs.filter(b => b.type !== type);

    if (type === 'heal') {
      const ratio = buffCfg.hpRestoreRatio || 0.3;
      const heal = Math.floor(this.player.maxHp * ratio);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this._addFloatingText(this.player.x, this.player.y - 60, `+${heal} HP`, '#69F0AE');
      this._healEffectTimer = 1.0; // 1秒治疗特效
    } else {
      // 同类buff刷新时间（不堆叠），避免HUD重复显示和数值多倍叠加
      const existing = this.player.buffs.find(b => b.type === type);
      const dur = buffCfg.duration || 5000;
      if (existing) {
        existing.remaining = dur;
      } else {
        this.player.buffs.push({ type, remaining: dur });
      }
    }

    // 获得buff时的闪光爆发效果
    this._addBuffPickupEffect(type);

    const labels = { fireboost: '火力增强!', shield: '护盾启动!', speed: '加速!', heal: '回血!' };
    this._addFloatingText(this.player.x, this.player.y - 90, labels[type] || 'BUFF!', '#69F0AE');
  }

  /** 拾取buff时的闪光爆发效果 */
  _addBuffPickupEffect(type) {
    const colors = {
      fireboost: [255, 109, 0],
      shield: [41, 121, 255],
      speed: [0, 230, 118],
      heal: [76, 175, 80],
    };
    const c = colors[type] || [255, 255, 255];
    // 添加一个短暂的径向闪光特效
    this.effects.push({
      x: this.player.x, y: this.player.y,
      type: 'buffPickup',
      timer: 0.4,
      duration: 0.4,
      color: c,
    });
  }

  _rectOverlap(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
           Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  }

  // ========== 渲染方法 ==========

  _renderTrack(ctx) {
    // 直接用drawImage绘制背景图，通过scrollOffset偏移实现滚动
    // 不走renderSceneBg（tileMode的createPattern原点固定，无法滚动）
    const off = Math.floor(this.scrollOffset);
    const img = this.trackImg;
    if (img && img.complete && img.naturalWidth > 0) {
      if (off > 0) {
        // 前进方向：内容向下滚动（路面朝玩家方向移动）
        // 源图底部 [H-off → H] 画到画布顶部 [0 → off]
        ctx.drawImage(img, 0, this.H - off, this.W, off, 0, 0, this.W, off);
        // 源图顶部 [0 → H-off] 画到画布 [off → H]
        ctx.drawImage(img, 0, 0, this.W, this.H - off, 0, off, this.W, this.H - off);
      } else {
        ctx.drawImage(img, 0, 0, this.W, this.H);
      }
    } else {
      // 图片未加载完，用占位符兜底
      this.assets.renderSceneBg.call(this.assets, ctx, 'trackBg', 0, 0, this.W, this.H);
    }
  }

  _renderPlayer(ctx) {
    const p = this.player;
    if (p.invincible && Math.floor(Date.now() / 100) % 2 === 0) return; // 闪烁

    const selectedLevel = this.state.get('selectedCarLevel');
    const now = Date.now();

    // ===== 速度buff：残影效果（先画残影再画主车） =====
    if (this.player.buffs.some(b => b.type === 'speed')) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#00E676';
      // 后方残影1
      this.assets.renderBattleCar.call(this.assets, ctx, selectedLevel,
        p.x - p.width / 2 - 3, p.y - p.height / 2 + 18, p.width, p.height);
      ctx.globalAlpha = 0.08;
      // 后方残影2
      this.assets.renderBattleCar.call(this.assets, ctx, selectedLevel,
        p.x - p.width / 2 + 2, p.y - p.height / 2 + 34, p.width, p.height);
      ctx.restore();
    }

    // 主车
    this.assets.renderBattleCar.call(this.assets, ctx, selectedLevel,
      p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);

    // ===== 护盾特效：科幻力场穹顶 =====
    if (this.player.buffs.some(b => b.type === 'shield')) {
      const t = (now % 3000) / 3000;
      const t2 = (now % 1500) / 1500;
      const cx = p.x, cy = p.y;
      const sw = p.width * 1.2, sh = p.height * 0.95;
      ctx.save();

      // 1) 底层脉冲波纹（从内向外扩散的同心椭圆）
      ctx.globalCompositeOperation = 'lighter';
      for (let ring = 0; ring < 3; ring++) {
        const ringT = (t + ring * 0.33) % 1;
        const rAlpha = (1 - ringT) * 0.12;
        const rx = sw * (0.6 + ringT * 0.5);
        const ry = sh * (0.5 + ringT * 0.4);
        ctx.strokeStyle = `rgba(66,165,245,${rAlpha})`;
        ctx.lineWidth = Math.max(0.5, (1 - ringT) * 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2) 主体力场穹顶（椭圆形能量罩）
      const domeAlpha = 0.12 + Math.sin(t * Math.PI * 4) * 0.04;
      const domeGrad = ctx.createRadialGradient(cx, cy - sh * 0.15, sw * 0.1, cx, cy, sw * 0.8);
      domeGrad.addColorStop(0, 'rgba(33,150,243,0)');
      domeGrad.addColorStop(0.5, `rgba(66,165,245,${domeAlpha * 0.5})`);
      domeGrad.addColorStop(0.85, `rgba(100,181,246,${domeAlpha})`);
      domeGrad.addColorStop(1, 'rgba(33,150,243,0)');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, sw * 0.75, sh * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3) 外层发光边框（双层椭圆+外发光）
      ctx.shadowColor = '#42A5F5';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = `rgba(100,181,246,${0.55 + Math.sin(t * Math.PI * 6) * 0.15})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, sw * 0.75, sh * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(144,202,249,${0.3 + Math.sin(t * Math.PI * 4) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, sw * 0.72, sh * 0.67, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4) 电弧效果（穹顶表面随机闪电线段）
      for (let arc = 0; arc < 3; arc++) {
        const arcSeed = Math.floor(t * 8 + arc * 3.7);
        const arcAngle = (arcSeed % 12) / 12 * Math.PI * 2;
        const arcStart = 0.6 + (arcSeed % 5) * 0.05;
        const ax1 = cx + Math.cos(arcAngle) * sw * arcStart * 0.75;
        const ay1 = cy + Math.sin(arcAngle) * sh * arcStart * 0.7;
        // 电弧终点（偏移+抖动）
        const arcAngle2 = arcAngle + (Math.sin(arcSeed * 2.3) * 0.3);
        const arcEnd = arcStart - 0.15 + Math.sin(arcSeed * 1.1) * 0.08;
        const ax2 = cx + Math.cos(arcAngle2) * sw * arcEnd * 0.75;
        const ay2 = cy + Math.sin(arcAngle2) * sh * arcEnd * 0.7;
        // 中间拐点
        const mx = (ax1 + ax2) / 2 + Math.sin(arcSeed * 4.7) * 8;
        const my = (ay1 + ay2) / 2 + Math.cos(arcSeed * 3.2) * 6;

        const arcAlpha = 0.4 + Math.sin(t2 * Math.PI * 10 + arc * 2) * 0.3;
        ctx.strokeStyle = `rgba(180,220,255,${arcAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#90CAF9'; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(ax1, ay1);
        ctx.quadraticCurveTo(mx, my, ax2, ay2);
        ctx.stroke();
        // 电弧亮点
        ctx.fillStyle = `rgba(220,240,255,${arcAlpha * 0.8})`;
        ctx.beginPath(); ctx.arc(ax1, ay1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ax2, ay2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5) 浮游光点（沿穹顶表面飘动的能量碎片）
      for (let i = 0; i < 8; i++) {
        const dotT = (t2 + i * 0.125) % 1;
        const dotAngle = dotT * Math.PI * 2 + i * 0.7;
        const dotR = sw * (0.68 + Math.sin(dotT * Math.PI * 3 + i) * 0.06);
        const dotRy = sh * (0.63 + Math.sin(dotT * Math.PI * 3 + i) * 0.05);
        const dx = cx + Math.cos(dotAngle) * dotR * 0.75;
        const dy = cy + Math.sin(dotAngle) * dotRy * 0.7;
        const dotAlpha = 0.3 + Math.sin(dotT * Math.PI * 4) * 0.3;
        const dotSize = 1.5 + Math.sin(dotT * Math.PI * 2 + i * 1.3) * 0.8;
        const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dotSize * 3);
        dg.addColorStop(0, `rgba(180,220,255,${dotAlpha})`);
        dg.addColorStop(0.5, `rgba(100,181,246,${dotAlpha * 0.3})`);
        dg.addColorStop(1, 'rgba(66,165,245,0)');
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(dx, dy, dotSize * 3, 0, Math.PI * 2); ctx.fill();
      }

      // 6) 顶部高光弧（模拟穹顶高光反射）
      const hlAlpha = 0.08 + Math.sin(t * Math.PI * 2) * 0.03;
      const hlGrad = ctx.createLinearGradient(cx - sw * 0.3, cy - sh * 0.6, cx + sw * 0.3, cy - sh * 0.3);
      hlGrad.addColorStop(0, 'rgba(200,230,255,0)');
      hlGrad.addColorStop(0.5, `rgba(200,230,255,${hlAlpha})`);
      hlGrad.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - sh * 0.35, sw * 0.4, sh * 0.2, 0, Math.PI * 0.9, Math.PI * 0.1, true);
      ctx.fill();

      ctx.restore();
    }

    // ===== 火力增强特效：火焰光环 + 排气管火焰 =====
    if (this.player.buffs.some(b => b.type === 'fireboost')) {
      const t = (now % 800) / 800;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 车身底部火焰光环
      const fireGlow = ctx.createRadialGradient(p.x, p.y + p.height * 0.3, 0, p.x, p.y + p.height * 0.3, p.width * 0.9);
      fireGlow.addColorStop(0, 'rgba(255,109,0,0.25)');
      fireGlow.addColorStop(0.5, 'rgba(255,80,0,0.1)');
      fireGlow.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath(); ctx.arc(p.x, p.y + p.height * 0.3, p.width * 0.9, 0, Math.PI * 2); ctx.fill();

      // 排气管火焰（车尾两侧）
      const exhaustOffsets = [-p.width * 0.25, p.width * 0.25];
      exhaustOffsets.forEach((ox, idx) => {
        const ex = p.x + ox;
        const ey = p.y + p.height * 0.45;
        const flameH = 18 + Math.sin(t * Math.PI * 8 + idx * 2) * 6;

        // 火焰渐变
        const fg = ctx.createLinearGradient(ex, ey, ex, ey + flameH);
        fg.addColorStop(0, 'rgba(255,200,50,0.9)');
        fg.addColorStop(0.3, 'rgba(255,120,0,0.7)');
        fg.addColorStop(0.7, 'rgba(255,50,0,0.3)');
        fg.addColorStop(1, 'rgba(255,20,0,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(ex - 4, ey);
        ctx.quadraticCurveTo(ex - 6, ey + flameH * 0.5, ex, ey + flameH);
        ctx.quadraticCurveTo(ex + 6, ey + flameH * 0.5, ex + 4, ey);
        ctx.closePath(); ctx.fill();

        // 火焰核心（白黄）
        const fg2 = ctx.createLinearGradient(ex, ey, ex, ey + flameH * 0.5);
        fg2.addColorStop(0, 'rgba(255,255,200,0.8)');
        fg2.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.moveTo(ex - 2, ey);
        ctx.quadraticCurveTo(ex - 3, ey + flameH * 0.25, ex, ey + flameH * 0.5);
        ctx.quadraticCurveTo(ex + 3, ey + flameH * 0.25, ex + 2, ey);
        ctx.closePath(); ctx.fill();
      });

      // 火星粒子
      for (let i = 0; i < 4; i++) {
        const px = p.x + (Math.random() - 0.5) * p.width * 0.8;
        const py = p.y + p.height * 0.3 + Math.random() * 20;
        const ps = 1 + Math.random() * 2;
        ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.random() * 105)},0,${0.4 + Math.random() * 0.4})`;
        ctx.beginPath(); ctx.arc(px, py, ps, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }

    // ===== 加速特效：速度线 =====
    if (this.player.buffs.some(b => b.type === 'speed')) {
      const t = (now % 1000) / 1000;
      ctx.save();
      ctx.globalAlpha = 0.4;
      // 两侧速度线
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const lx = p.x + side * (p.width * 0.5 + 5 + i * 6);
          const ly = p.y - p.height * 0.3 + i * 15;
          const ll = 20 + Math.sin(t * Math.PI * 4 + i * 1.5) * 8;
          ctx.strokeStyle = `rgba(0,230,118,${0.3 + Math.sin(t * Math.PI * 6 + i) * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx, ly + ll);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ===== 回血特效：绿色治疗粒子上升 =====
    // (通过_applyBuff时添加heal特效触发，这里渲染持续型)
    if (this._healEffectTimer && this._healEffectTimer > 0) {
      const t = this._healEffectTimer;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const seed = i * 137.5;
        const px = p.x + Math.sin(seed) * p.width * 0.5;
        const py = p.y + p.height * 0.3 - (1 - t) * 60 + Math.cos(seed) * 10;
        const ps = 2 + Math.sin(seed * 0.1) * 1.5;
        ctx.fillStyle = `rgba(105,240,174,${t * 0.6})`;
        ctx.beginPath(); ctx.arc(px, py, ps, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  _renderEnemy(ctx, e) {
    if (e.hp <= 0) return;
    const cx = e.x, cy = e.y;
    const w = e.width, h = e.height;
    ctx.save();

    // ===== 敌车地面阴影（增加立体感）=====
    if (e.type !== 'boss') {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy + h * 0.42, w * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ===== 优先使用sprite图片渲染，回退到Canvas绘制 =====
    const imgType = (e.type === 'boss' || e.type === 'tank' || e.type === 'fast') ? e.type : 'normal';
    // Boss优先用variant专属sprite
    let sprite = this.enemyImages[imgType];
    if (e.type === 'boss' && e.variant && e.variant.key && this.bossVariantImages[e.variant.key]) {
      sprite = this.bossVariantImages[e.variant.key];
    }
    if (sprite && (this._enemyImagesLoaded || sprite.complete)) {
      // 使用sprite图片（居中绘制，填满宽高）
      ctx.drawImage(sprite, cx - w / 2, cy - h / 2, w, h);
    } else {
      // 图片未加载完成时，使用Canvas绘制作为fallback
      const t = (e.age || 0);
      switch (e.type) {
        case 'boss': this._drawBossCar(ctx, cx, cy, w, h, t); break;
        case 'tank': this._drawTankCar(ctx, cx, cy, w, h, t); break;
        case 'fast': this._drawFastCar(ctx, cx, cy, w, h, t); break;
        default:     this._drawNormalCar(ctx, cx, cy, w, h, t); break;
      }
    }

    // 血条（在车辆上方）
    const hpRatio = e.hp / e.maxHp;
    const barW = Math.max(w * 0.8, 40);
    const barH = 5;
    const barX = cx - barW / 2;
    const barY = cy - h / 2 - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.restore();
  }

  // ==================== 敌车美术绘制方法 ====================

  /** 普通敌车：深蓝色轿车 */
  _drawNormalCar(ctx, x, y, w, h, t) {
    const hw = w / 2, hh = h / 2;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + hh * 0.8, hw * 0.7, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // 车身主体（深蓝灰渐变）
    const bodyGrad = ctx.createLinearGradient(x - hw, y - hh, x + hw, y + hh);
    bodyGrad.addColorStop(0, '#37474F');
    bodyGrad.addColorStop(0.45, '#455A64');
    bodyGrad.addColorStop(0.55, '#37474F');
    bodyGrad.addColorStop(1, '#263238');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.35, y - hh * 0.75);        // 左上
    ctx.lineTo(x + hw * 0.35, y - hh * 0.75);         // 右上（窄）
    ctx.lineTo(x + hw * 0.85, y - hh * 0.15);          // 右下（宽）
    ctx.lineTo(x + hw * 0.80, y + hh * 0.65);          // 右底
    ctx.lineTo(x - hw * 0.80, y + hh * 0.65);          // 左底
    ctx.lineTo(x - hw * 0.85, y - hh * 0.15);          // 左下
    ctx.closePath(); ctx.fill();
    // 车身边框高光
    ctx.strokeStyle = 'rgba(120,180,220,0.25)'; ctx.lineWidth = 1.5;
    ctx.stroke();
    // 挡风玻璃/车窗（深色）
    ctx.fillStyle = 'rgba(10,25,47,0.75)';
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.22, y - hh * 0.6);
    ctx.lineTo(x + hw * 0.22, y - hh * 0.6);
    ctx.lineTo(x + hw * 0.38, y - hh * 0.15);
    ctx.lineTo(x - hw * 0.38, y - hh * 0.15);
    ctx.closePath(); ctx.fill();
    // 车窗高光线条
    ctx.strokeStyle = 'rgba(140,200,255,0.3)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - hw * 0.15, y - hh * 0.5); ctx.lineTo(x + hw * 0.15, y - hh * 0.5); ctx.stroke();
    // 车轮
    this._drawWheels(ctx, x, y, w, h, '#111');
    // 前灯
    ctx.fillStyle = '#FFE082';
    ctx.beginPath(); ctx.ellipse(x - hw * 0.62, y - hh * 0.42, hw * 0.09, hh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + hw * 0.62, y - hh * 0.42, hw * 0.09, hh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    // 尾灯
    ctx.fillStyle = '#E53935';
    ctx.fillRect(x - hw * 0.65, y + hh * 0.45, hw * 0.14, hh * 0.1);
    ctx.fillRect(x + hw * 0.51, y + hh * 0.45, hw * 0.14, hh * 0.1);
  }

  /** 快速敌车：红色跑车（低矮流线型） */
  _drawFastCar(ctx, x, y, w, h, t) {
    const hw = w / 2, hh = h / 2;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + hh * 0.8, hw * 0.65, hh * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    // 车身（鲜红→深红渐变）- 更扁平流线型
    const bodyGrad = ctx.createLinearGradient(x, y - hh, x, y + hh);
    bodyGrad.addColorStop(0, '#E53935');
    bodyGrad.addColorStop(0.4, '#C62828');
    bodyGrad.addColorStop(1, '#B71C1C');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.28, y - hh * 0.65);       // 前端尖
    ctx.quadraticCurveTo(x, y - hh * 0.78, x + hw * 0.28, y - hh * 0.65); // 前弧
    ctx.lineTo(x + hw * 0.82, y);                      // 右侧最宽处偏中
    ctx.lineTo(x + hw * 0.78, y + hh * 0.6);           // 右后
    ctx.lineTo(x - hw * 0.78, y + hh * 0.6);           // 左后
    ctx.lineTo(x - hw * 0.82, y);                      // 左侧最宽处
    ctx.closePath(); ctx.fill();
    // 流线型侧边高光
    ctx.strokeStyle = 'rgba(255,180,170,0.35)'; ctx.lineWidth = 1.5;
    ctx.stroke();
    // 引擎盖装饰条纹
    ctx.fillStyle = 'rgba(255,235,200,0.15)';
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.18, y - hh * 0.48);
    ctx.lineTo(x + hw * 0.18, y - hh * 0.48);
    ctx.lineTo(x + hw * 0.12, y - hh * 0.15);
    ctx.lineTo(x - hw * 0.12, y - hh * 0.15);
    ctx.closePath(); ctx.fill();
    // 车窗（楔形，跑车风格）
    ctx.fillStyle = 'rgba(5,15,35,0.8)';
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.16, y - hh * 0.52);
    ctx.lineTo(x + hw * 0.16, y - hh * 0.52);
    ctx.lineTo(x + hw * 0.28, y - hh * 0.12);
    ctx.lineTo(x - hw * 0.28, y - hh * 0.12);
    ctx.closePath(); ctx.fill();
    // 车轮
    this._drawWheels(ctx, x, y, w, h, '#0D0D0D');
    // 大型前灯
    ctx.fillStyle = '#FFF9C4';
    ctx.shadowColor = 'rgba(255,235,150,0.6)'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.ellipse(x - hw * 0.58, y - hh * 0.4, hw * 0.11, hh * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + hw * 0.58, y - hh * 0.4, hw * 0.11, hh * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // 尾部排气管光点
    ctx.fillStyle = '#FF5722';
    ctx.globalAlpha = 0.6 + Math.sin((t || 0) * 12) * 0.3;
    ctx.beginPath(); ctx.arc(x - hw * 0.35, y + hh * 0.55, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + hw * 0.35, y + hh * 0.55, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** 坦克敌车：军绿色重型装甲车 */
  _drawTankCar(ctx, x, y, w, h, t) {
    const hw = w / 2, hh = h / 2;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + hh * 0.8, hw * 0.8, hh * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    // 车身主体（军绿色）- 宽大厚重
    const bodyGrad = ctx.createLinearGradient(x - hw, y, x + hw, y);
    bodyGrad.addColorStop(0, '#33691E');
    bodyGrad.addColorStop(0.5, '#558B2F');
    bodyGrad.addColorStop(1, '#33691E');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.45, y - hh * 0.55);        // 左前（方头）
    ctx.lineTo(x + hw * 0.45, y - hh * 0.55);        // 右前
    ctx.lineTo(x + hw * 0.92, y - hh * 0.1);          // 右肩（很宽）
    ctx.lineTo(x + hw * 0.88, y + hh * 0.6);          // 右后
    ctx.lineTo(x - hw * 0.88, y + hh * 0.6);          // 左后
    ctx.lineTo(x - hw * 0.92, y - hh * 0.1);          // 左肩
    ctx.closePath(); ctx.fill();
    // 装甲板边缘
    ctx.strokeStyle = 'rgba(80,60,20,0.5)'; ctx.lineWidth = 2.5;
    ctx.stroke();
    // 装甲面板纹理
    ctx.strokeStyle = 'rgba(60,80,40,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - hw * 0.5, y - hh * 0.2); ctx.lineTo(x + hw * 0.5, y - hh * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - hw * 0.55, y + hh * 0.15); ctx.lineTo(x + hw * 0.55, y + hh * 0.15); ctx.stroke();
    // 驾驶舱（小方块窗）
    ctx.fillStyle = 'rgba(15,30,20,0.8)';
    ctx.fillRect(x - hw * 0.22, y - hh * 0.42, hw * 0.44, hh * 0.28);
    // 驾驶舱边框
    ctx.strokeStyle = 'rgba(100,140,70,0.4)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - hw * 0.22, y - hh * 0.42, hw * 0.44, hh * 0.28);
    // 炮塔（顶部凸起）
    const turretGrad = ctx.createRadialGradient(x, y - hh * 0.55, 0, x, y - hh * 0.55, hw * 0.28);
    turretGrad.addColorStop(0, '#689F38');
    turretGrad.addColorStop(1, '#33691E');
    ctx.fillStyle = turretGrad;
    ctx.beginPath(); ctx.arc(x, y - hh * 0.55, hw * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,100,50,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 炮管
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(x - hw * 0.04, y - hh * 0.88, hw * 0.08, hh * 0.33);
    // 重型车轮（6个可见效果用4个大轮表示）
    this._drawHeavyWheels(ctx, x, y, w, h);
    // 前防撞灯
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath(); ctx.arc(x - hw * 0.72, y - hh * 0.35, hw * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + hw * 0.72, y - hh * 0.35, hw * 0.06, 0, Math.PI * 2); ctx.fill();
  }

  /** Boss敌车：暗紫色豪华座驾+发光装饰 */
  _drawBossCar(ctx, x, y, w, h, t) {
    const hw = w / 2, hh = h / 2;
    const pulse = 0.7 + Math.sin((t || 0) * 3) * 0.3; // 缓慢脉动
    // 外层能量光环
    const auraGrad = ctx.createRadialGradient(x, y, 0, x, y, hw * 1.15);
    auraGrad.addColorStop(0, `rgba(156,39,176,${0.2 * pulse})`);
    auraGrad.addColorStop(0.6, `rgba(103,58,183,${0.08 * pulse})`);
    auraGrad.addColorStop(1, 'rgba(63,0,125,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath(); ctx.ellipse(x, y, hw * 1.1, hh * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x, y + hh * 0.82, hw * 0.75, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // 车身主体（暗紫黑→亮紫渐变）
    const bodyGrad = ctx.createLinearGradient(x - hw, y - hh, x + hw, y + hh);
    bodyGrad.addColorStop(0, '#4A148C');
    bodyGrad.addColorStop(0.3, '#7B1FA2');
    bodyGrad.addColorStop(0.5, '#9C27B0');
    bodyGrad.addColorStop(0.7, '#7B1FA2');
    bodyGrad.addColorStop(1, '#311B92');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.32, y - hh * 0.68);        // 左上前端
    ctx.quadraticCurveTo(x, y - hh * 0.85, x + hw * 0.32, y - hh * 0.68); // 前弧
    ctx.lineTo(x + hw * 0.88, y - hh * 0.05);          // 右肩
    ctx.lineTo(x + hw * 0.84, y + hh * 0.62);          // 右后
    ctx.quadraticCurveTo(x, y + hh * 0.75, x - hw * 0.84, y + hh * 0.62); // 后弧底
    ctx.lineTo(x - hw * 0.88, y - hh * 0.05);          // 左肩
    ctx.closePath(); ctx.fill();
    // 金色镶边
    ctx.strokeStyle = `rgba(255,215,0,${0.35 * pulse})`; ctx.lineWidth = 2;
    ctx.stroke();
    // 侧面金色装饰条
    ctx.fillStyle = `rgba(255,193,7,${0.25 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.78, y + hh * 0.05);
    ctx.lineTo(x + hw * 0.78, y + hh * 0.05);
    ctx.lineTo(x + hw * 0.74, y + hh * 0.2);
    ctx.lineTo(x - hw * 0.74, y + hh * 0.2);
    ctx.closePath(); ctx.fill();
    // 车窗（深紫黑色+金边）
    ctx.fillStyle = 'rgba(15,5,35,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.2, y - hh * 0.54);
    ctx.lineTo(x + hw * 0.2, y - hh * 0.54);
    ctx.lineTo(x + hw * 0.4, y - hh * 0.1);
    ctx.lineTo(x - hw * 0.4, y - hh * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,215,0,${0.3 * pulse})`; ctx.lineWidth = 1; ctx.stroke();
    // Boss皇冠标志（顶部）
    ctx.fillStyle = `rgba(255,215,0,${0.5 * pulse})`;
    ctx.font = `bold ${Math.floor(hh * 0.28)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', x, y - hh * 0.78);
    // 车轮（带发光轮毂）
    this._drawBossWheels(ctx, x, y, w, h, t);
    // 前大灯（发光）
    ctx.shadowColor = `rgba(156,39,176,${0.8 * pulse})`; ctx.shadowBlur = 8;
    ctx.fillStyle = '#E1BEE7';
    ctx.beginPath(); ctx.ellipse(x - hw * 0.66, y - hh * 0.43, hw * 0.1, hh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + hw * 0.66, y - hh * 0.43, hw * 0.1, hh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // 尾部能量核心
    const coreGlow = ctx.createRadialGradient(x, y + hh * 0.48, 0, x, y + hh * 0.48, hw * 0.18);
    coreGlow.addColorStop(0, `rgba(233,30,99,${0.6 * pulse})`);
    coreGlow.addColorStop(1, 'rgba(233,30,99,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath(); ctx.arc(x, y + hh * 0.48, hw * 0.18, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * 绘制普通车轮（左右各一）
   */
  _drawWheels(ctx, x, y, w, h, color) {
    const hw = w / 2, hh = h / 2;
    const wheelW = hw * 0.2, wheelH = hh * 0.22;
    // 左轮
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x - hw * 0.55, y + hh * 0.45, wheelW, wheelH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,80,80,0.6)';
    ctx.beginPath(); ctx.ellipse(x - hw * 0.55, y + hh * 0.45, wheelW * 0.5, wheelH * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // 右轮
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x + hw * 0.55, y + hh * 0.45, wheelW, wheelH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,80,80,0.6)';
    ctx.beginPath(); ctx.ellipse(x + hw * 0.55, y + hh * 0.45, wheelW * 0.5, wheelH * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * 绘制坦克重型车轮（多对）
   */
  _drawHeavyWheels(ctx, x, y, w, h) {
    const hw = w / 2, hh = h / 2;
    const positions = [-0.65, -0.2, 0.3]; // 3对轮子位置
    positions.forEach(px => {
      const wx = x + hw * px;
      // 外轮
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.ellipse(wx, y + hh * 0.48, hw * 0.16, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      // 轮毂
      ctx.fillStyle = 'rgba(60,60,60,0.7)';
      ctx.beginPath(); ctx.ellipse(wx, y + hh * 0.48, hw * 0.08, hh * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      // 螺钉细节
      ctx.fillStyle = 'rgba(120,120,120,0.4)';
      ctx.beginPath(); ctx.arc(wx - hw * 0.04, y + hh * 0.43, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(wx + hw * 0.04, y + hh * 0.43, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(wx - hw * 0.04, y + hh * 0.53, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(wx + hw * 0.04, y + hh * 0.53, 1.2, 0, Math.PI * 2); ctx.fill();
    });
  }

  /**
   * 绘制Boss车轮（带发光效果）
   */
  _drawBossWheels(ctx, x, y, w, h, t) {
    const hw = w / 2, hh = h / 2;
    const pulse = 0.7 + Math.sin((t || 0) * 3) * 0.3;
    [[-0.55], [0.55]].forEach(([dir]) => {
      const wx = x + hw * dir;
      // 轮胎外圈发光
      const glowGrad = ctx.createRadialGradient(wx, y + hh * 0.46, 0, wx, y + hh * 0.46, hw * 0.24);
      glowGrad.addColorStop(0, `rgba(156,39,176,${0.25 * pulse})`);
      glowGrad.addColorStop(1, 'rgba(156,39,176,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath(); ctx.arc(wx, y + hh * 0.46, hw * 0.24, 0, Math.PI * 2); ctx.fill();
      // 轮胎本体
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath(); ctx.ellipse(wx, y + hh * 0.46, hw * 0.2, hh * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      // 发光轮毂
      ctx.fillStyle = `rgba(206,147,216,${0.4 * pulse})`;
      ctx.beginPath(); ctx.ellipse(wx, y + hh * 0.46, hw * 0.1, hh * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      // 中心亮点
      ctx.fillStyle = '#F3E5F5';
      ctx.beginPath(); ctx.arc(wx, y + hh * 0.46, hw * 0.04, 0, Math.PI * 2); ctx.fill();
    });
  }

  _renderObstacle(ctx, o) {
    if (o.hp <= 0) return;

    // 优先使用sprite图片
    const sprite = this.obstacleImages[o.type];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(
        sprite,
        o.x - o.width / 2,
        o.y - o.height / 2,
        o.width,
        o.height
      );
    } else {
      // 回退：用AssetConfig的renderPlaceholder（仅当图片未加载时）
      const obsCfg = this.assets.vehicles.obstacle.types[o.type];
      if (obsCfg) {
        this.assets.renderPlaceholder.call(
          this.assets, ctx, 'colored_rect',
          o.x - o.width / 2, o.y - o.height / 2,
          o.width, o.height,
          this.assets.vehicles.obstacle.placeholder, {}
        );
      }
    }
  }

  // ===== 子弹颜色调色板（按弹幕模式区分） =====
  _bulletPalettes = {
    cyan: {
      outer: [0, 220, 255], outerMid: [0, 150, 255], outerEdge: [0, 80, 200],
      tailStart: [0, 120, 255], tailMid: [0, 180, 255], tailBright: [0, 230, 255],
      innerFade: [150, 240, 255], innerMid: [200, 250, 255], innerTip: '#E0FFFF',
      headMid: [200, 245, 255], headRing: [0, 210, 255], headEdge: [0, 140, 255],
      particles: [[0x80,0xF0,0xFF], [0x40,0xD0,0xFF], [0xC0,0xF8,0xFF], [0x00,0xB0,0xF0]],
      glowR: 34, headR: 12, tailLen: 45,
    },
    green: {
      outer: [0, 255, 130], outerMid: [0, 200, 90], outerEdge: [0, 120, 50],
      tailStart: [0, 160, 60], tailMid: [0, 220, 100], tailBright: [50, 255, 160],
      innerFade: [140, 255, 180], innerMid: [180, 255, 200], innerTip: '#E0FFE8',
      headMid: [180, 255, 200], headRing: [0, 230, 120], headEdge: [0, 150, 70],
      particles: [[0x80,0xFF,0xA0], [0x40,0xE0,0x70], [0xC0,0xFF,0xB0], [0x00,0xC0,0x50]],
      glowR: 36, headR: 12, tailLen: 48,
    },
    purple: {
      outer: [180, 100, 255], outerMid: [140, 50, 255], outerEdge: [80, 20, 180],
      tailStart: [100, 30, 220], tailMid: [140, 70, 255], tailBright: [180, 130, 255],
      innerFade: [180, 140, 255], innerMid: [210, 180, 255], innerTip: '#EDE0FF',
      headMid: [210, 170, 255], headRing: [160, 80, 255], headEdge: [100, 30, 200],
      particles: [[0xC0,0x80,0xFF], [0x90,0x40,0xFF], [0xE0,0xB0,0xFF], [0x70,0x20,0xF0]],
      glowR: 36, headR: 13, tailLen: 48,
    },
    gold: {
      outer: [255, 200, 50], outerMid: [255, 160, 0], outerEdge: [200, 100, 0],
      tailStart: [200, 120, 0], tailMid: [255, 180, 20], tailBright: [255, 220, 100],
      innerFade: [255, 210, 100], innerMid: [255, 240, 160], innerTip: '#FFF8E0',
      headMid: [255, 240, 160], headRing: [255, 180, 30], headEdge: [200, 120, 0],
      particles: [[0xFF,0xE0,0x60], [0xFF,0xC0,0x20], [0xFF,0xF0,0x90], [0xE0,0xA0,0x10]],
      glowR: 37, headR: 13, tailLen: 50,
    },
    red: {
      outer: [255, 90, 60], outerMid: [255, 50, 30], outerEdge: [180, 20, 10],
      tailStart: [200, 40, 30], tailMid: [255, 80, 50], tailBright: [255, 150, 100],
      innerFade: [255, 160, 130], innerMid: [255, 200, 180], innerTip: '#FFE8E0',
      headMid: [255, 200, 170], headRing: [255, 90, 50], headEdge: [200, 40, 20],
      particles: [[0xFF,0xA0,0x80], [0xFF,0x60,0x40], [0xFF,0xC0,0x90], [0xE0,0x40,0x20]],
      glowR: 36, headR: 13, tailLen: 50,
    },
    magenta: {
      outer: [255, 80, 200], outerMid: [220, 40, 180], outerEdge: [150, 20, 120],
      tailStart: [180, 30, 150], tailMid: [220, 80, 200], tailBright: [255, 150, 230],
      innerFade: [240, 160, 230], innerMid: [255, 200, 245], innerTip: '#FFE0F5',
      headMid: [255, 190, 240], headRing: [230, 70, 200], headEdge: [180, 30, 140],
      particles: [[0xFF,0xA0,0xE0], [0xE0,0x60,0xC0], [0xFF,0xC0,0xF0], [0xC0,0x40,0xA0]],
      glowR: 36, headR: 13, tailLen: 48,
    },
    divine: {
      outer: [255, 230, 100], outerMid: [255, 190, 50], outerEdge: [200, 130, 0],
      tailStart: [220, 160, 30], tailMid: [255, 210, 80], tailBright: [255, 240, 150],
      innerFade: [255, 240, 160], innerMid: [255, 250, 210], innerTip: '#FFFEF0',
      headMid: [255, 250, 210], headRing: [255, 210, 80], headEdge: [220, 150, 20],
      particles: [[0xFF,0xF0,0xB0], [0xFF,0xD0,0x50], [0xFF,0xFF,0xE0], [0xE0,0xB0,0x30]],
      glowR: 40, headR: 14, tailLen: 52,
    },
  };

  _renderBullet(ctx, b) {
    const t = b.age || 0;
    // 子弹飞行方向（用于拖尾方向）
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 12;
    const dirX = b.vx / speed, dirY = b.vy / speed;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 叠加发光模式

    if (b.isPower) {
      // === 强化弹：烈焰彗星光束（橙金→红） ===
      const tailLen = 55; // 拖尾长度
      const hx = b.x, hy = b.y; // 头部位置
      const tx = hx - dirX * tailLen, ty = hy - dirY * tailLen; // 尾部位置

      // 1️⃣ 最外层大光晕（范围最大）
      const gOuter = ctx.createRadialGradient(hx, hy, 0, hx, hy, 38);
      gOuter.addColorStop(0, 'rgba(255,160,0,0.35)');
      gOuter.addColorStop(0.4, 'rgba(255,80,0,0.15)');
      gOuter.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.beginPath(); ctx.fillStyle = gOuter;
      ctx.arc(hx, hy, 38, 0, Math.PI * 2); ctx.fill();

      // 2️⃣ 主光束拖尾（长锥形渐变）
      ctx.beginPath();
      const beamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
      beamGrad.addColorStop(0, 'rgba(255,60,0,0)');
      beamGrad.addColorStop(0.3, 'rgba(255,100,0,0.25)');
      beamGrad.addColorStop(0.6, 'rgba(255,180,0,0.5)');
      beamGrad.addColorStop(0.85, 'rgba(255,230,100,0.8)');
      beamGrad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = beamGrad;
      // 绘制长水滴形：头部宽、尾部尖
      ctx.moveTo(hx, hy - 10);
      ctx.quadraticCurveTo(hx + 9, hy, hx, hy + 7);
      ctx.quadraticCurveTo(hx - 6*dirX + (tx-hx)*0.3, hy - 6*dirY + (ty-hy)*0.3 + 5, tx, ty);
      ctx.quadraticCurveTo(hx + 6*dirX + (tx-hx)*0.3, hy + 6*dirY + (ty-hy)*0.3 + 5, hx, hy + 7);
      ctx.quadraticCurveTo(hx - 9, hy, hx, hy - 10);
      ctx.fill();

      // 3️⃣ 内层亮芯（更细更长）
      ctx.beginPath();
      const innerGrad = ctx.createLinearGradient(hx - dirX * 35, hy - dirY * 35, hx, hy);
      innerGrad.addColorStop(0, 'rgba(255,200,50,0)');
      innerGrad.addColorStop(0.5, 'rgba(255,240,150,0.6)');
      innerGrad.addColorStop(1, '#FFFDE7');
      ctx.fillStyle = innerGrad;
      ctx.moveTo(hx, hy - 5);
      ctx.quadraticCurveTo(hx + 4, hy, hx, hy + 4);
      ctx.lineTo(tx + dirX * 8, ty + dirY * 8);
      ctx.quadraticCurveTo(hx - 4, hy, hx, hy - 5);
      ctx.fill();

      // 4️⃣ 头部高光爆发点
      const headGlow = ctx.createRadialGradient(hx, hy - 2, 0, hx, hy - 2, 14);
      headGlow.addColorStop(0, '#FFFFFF');
      headGlow.addColorStop(0.3, 'rgba(255,240,150,0.9)');
      headGlow.addColorStop(0.65, 'rgba(255,160,0,0.5)');
      headGlow.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.beginPath(); ctx.fillStyle = headGlow;
      ctx.arc(hx, hy - 2, 14, 0, Math.PI * 2); ctx.fill();

      // 5️⃣ 核心白点
      ctx.beginPath(); ctx.fillStyle = '#FFFFFF';
      ctx.arc(hx - dirX * 2, hy - dirY * 2 - 2, 3.5, 0, Math.PI * 2); ctx.fill();

      // 6️⃣ 飞溅粒子
      this._drawBulletParticles(ctx, b, t, [
        [0xFF, 0xC8, 0x00], [0xFF, 0x90, 0x00], [0xFF, 0xE0, 0x80], [0xFF, 0x60, 0x00]
      ]);

    } else {
      // === 普通弹：根据弹幕模式颜色方案渲染 ===
      const p = this._bulletPalettes[b.color] || this._bulletPalettes.cyan;
      const tailLen = p.tailLen || 45;
      const hx = b.x, hy = b.y;
      const tx = hx - dirX * tailLen, ty = hy - dirY * tailLen;

      // 1️⃣ 外层大光晕
      const gOuter = ctx.createRadialGradient(hx, hy, 0, hx, hy, p.glowR || 34);
      gOuter.addColorStop(0, `rgba(${p.outer[0]},${p.outer[1]},${p.outer[2]},0.3)`);
      gOuter.addColorStop(0.4, `rgba(${p.outerMid[0]},${p.outerMid[1]},${p.outerMid[2]},0.12)`);
      gOuter.addColorStop(1, `rgba(${p.outerEdge[0]},${p.outerEdge[1]},${p.outerEdge[2]},0)`);
      ctx.beginPath(); ctx.fillStyle = gOuter;
      ctx.arc(hx, hy, p.glowR || 34, 0, Math.PI * 2); ctx.fill();

      // 2️⃣ 主光束拖尾
      ctx.beginPath();
      const beamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
      beamGrad.addColorStop(0, `rgba(${p.tailStart[0]},${p.tailStart[1]},${p.tailStart[2]},0)`);
      beamGrad.addColorStop(0.3, `rgba(${p.tailMid[0]},${p.tailMid[1]},${p.tailMid[2]},0.22)`);
      beamGrad.addColorStop(0.6, `rgba(${p.tailBright[0]},${p.tailBright[1]},${p.tailBright[2]},0.48)`);
      beamGrad.addColorStop(0.88, `rgba(${Math.min(255,p.tailBright[0]+80)},${Math.min(255,p.tailBright[1]+40)},${Math.min(255,p.tailBright[2]+20)},0.78)`);
      beamGrad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = beamGrad;
      ctx.moveTo(hx, hy - 8);
      ctx.quadraticCurveTo(hx + 7, hy, hx, hy + 5.5);
      ctx.quadraticCurveTo(hx - 5*dirX + (tx-hx)*0.3, hy - 5*dirY + (ty-hy)*0.3 + 4, tx, ty);
      ctx.quadraticCurveTo(hx + 5*dirX + (tx-hx)*0.3, hy + 5*dirY + (ty-hy)*0.3 + 4, hx, hy + 5.5);
      ctx.quadraticCurveTo(hx - 7, hy, hx, hy - 8);
      ctx.fill();

      // 3️⃣ 内层亮芯
      ctx.beginPath();
      const innerGrad = ctx.createLinearGradient(hx - dirX * 28, hy - dirY * 28, hx, hy);
      innerGrad.addColorStop(0, `rgba(${p.innerFade[0]},${p.innerFade[1]},${p.innerFade[2]},0)`);
      innerGrad.addColorStop(0.5, `rgba(${p.innerMid[0]},${p.innerMid[1]},${p.innerMid[2]},0.55)`);
      innerGrad.addColorStop(1, p.innerTip);
      ctx.fillStyle = innerGrad;
      ctx.moveTo(hx, hy - 4);
      ctx.quadraticCurveTo(hx + 3, hy, hx, hy + 3);
      ctx.lineTo(tx + dirX * 6, ty + dirY * 6);
      ctx.quadraticCurveTo(hx - 3, hy, hx, hy - 4);
      ctx.fill();

      // 4️⃣ 头部高光爆发点
      const headR = p.headR || 12;
      const headGlow = ctx.createRadialGradient(hx, hy - 1.5, 0, hx, hy - 1.5, headR);
      headGlow.addColorStop(0, '#FFFFFF');
      headGlow.addColorStop(0.3, `rgba(${p.headMid[0]},${p.headMid[1]},${p.headMid[2]},0.85)`);
      headGlow.addColorStop(0.65, `rgba(${p.headRing[0]},${p.headRing[1]},${p.headRing[2]},0.45)`);
      headGlow.addColorStop(1, `rgba(${p.headEdge[0]},${p.headEdge[1]},${p.headEdge[2]},0)`);
      ctx.beginPath(); ctx.fillStyle = headGlow;
      ctx.arc(hx, hy - 1.5, headR, 0, Math.PI * 2); ctx.fill();

      // 5️⃣ 核心白点
      ctx.beginPath(); ctx.fillStyle = '#FFFFFF';
      ctx.arc(hx - dirX * 1.5, hy - dirY * 1.5 - 1.5, 2.8, 0, Math.PI * 2); ctx.fill();

      // 6️⃣ 飞溅粒子
      this._drawBulletParticles(ctx, b, t, p.particles);
    }

    ctx.restore();
  }

  /**
   * 绘制子弹周围飞溅粒子
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} b - bullet对象
   * @param {number} t - 时间参数
   * @param {number[][]} colors - [[r,g,b], ...] 粒子颜色数组
   */
  _drawBulletParticles(ctx, b, t, colors) {
    // 用子弹位置+age做伪随机种子，保证每帧粒子位置稳定
    const seed = ((b.x | 0) * 73856093 ^ (b.y | 0) * 19349663) >>> 0;
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const n = ((seed + i * 7919) % 100000) / 100000;
      const angle = n * Math.PI * 2 + t * (1.5 + (i % 3));
      const dist = 14 + n * 18 + Math.sin(t * 6 + i * 1.5) * 5;
      const px = b.x + Math.cos(angle) * dist;
      const py = b.y + Math.sin(angle) * dist;
      const sz = 1 + (n % 3) * 0.8 + Math.sin(t * 10 + i * 2) * 0.4;
      const alpha = 0.4 + Math.sin(t * 8 + i) * 0.25;
      const c = colors[i % colors.length];
      ctx.beginPath();
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 渲染敌方子弹（紫红能量弹） */
  _renderEnemyBullet(ctx, b) {
    const t = b.age || 0;
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 7;
    const dirX = b.vx / speed, dirY = b.vy / speed;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const hx = b.x, hy = b.y;
    const shape = b.shape || 'comet';

    // ===== 解析颜色（color 是 {core, mid, outer} 或字符串 hex；默认紫红） =====
    const col = b.color || { core: '#FFFFFF', mid: '#FF80FF', outer: '#C040FF' };
    // 把 hex 转 rgb
    const hexToRgb = (h) => {
      h = h.replace('#', '');
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    };
    const cCore = hexToRgb(col.core);
    const cMid = hexToRgb(col.mid);
    const cOuter = hexToRgb(col.outer);
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    if (shape === 'diamond') {
      // ===== 菱形子弹（用于 crossSpiral）=====
      // 外发光
      const gOuter = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22);
      gOuter.addColorStop(0, rgba(cMid, 0.4));
      gOuter.addColorStop(0.5, rgba(cOuter, 0.18));
      gOuter.addColorStop(1, rgba(cOuter, 0));
      ctx.fillStyle = gOuter;
      ctx.beginPath(); ctx.arc(hx, hy, 22, 0, Math.PI * 2); ctx.fill();

      // 菱形主体（旋转跟随方向）
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(Math.atan2(dirY, dirX));
      // 外层菱形
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(-8, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      const dGrad = ctx.createLinearGradient(-8, 0, 10, 0);
      dGrad.addColorStop(0, rgba(cOuter, 0.6));
      dGrad.addColorStop(0.6, rgba(cMid, 0.95));
      dGrad.addColorStop(1, rgba(cCore, 1));
      ctx.fillStyle = dGrad;
      ctx.fill();
      // 中心白色高光
      ctx.beginPath();
      ctx.fillStyle = rgba(cCore, 0.95);
      ctx.arc(3, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // 拖尾光带
      const tailLen = 18;
      const tx = hx - dirX * tailLen, ty = hy - dirY * tailLen;
      const tailGrad = ctx.createLinearGradient(tx, ty, hx, hy);
      tailGrad.addColorStop(0, rgba(cOuter, 0));
      tailGrad.addColorStop(1, rgba(cMid, 0.5));
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    } else if (shape === 'pulse') {
      // ===== 脉冲圆形子弹（用于 ringBurst）=====
      // 脉动半径
      const pulse = 1 + Math.sin(t * 12) * 0.15;
      // 外发光
      const gOuter = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26 * pulse);
      gOuter.addColorStop(0, rgba(cMid, 0.5));
      gOuter.addColorStop(0.5, rgba(cOuter, 0.2));
      gOuter.addColorStop(1, rgba(cOuter, 0));
      ctx.fillStyle = gOuter;
      ctx.beginPath(); ctx.arc(hx, hy, 26 * pulse, 0, Math.PI * 2); ctx.fill();

      // 主体圆
      const main = ctx.createRadialGradient(hx, hy, 0, hx, hy, 9);
      main.addColorStop(0, rgba(cCore, 1));
      main.addColorStop(0.5, rgba(cMid, 0.95));
      main.addColorStop(1, rgba(cOuter, 0.7));
      ctx.fillStyle = main;
      ctx.beginPath(); ctx.arc(hx, hy, 9 * pulse, 0, Math.PI * 2); ctx.fill();

      // 中心高光
      ctx.fillStyle = rgba(cCore, 1);
      ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill();

      // 旋转的小卫星点（2颗）
      for (let i = 0; i < 2; i++) {
        const ang = t * 8 + i * Math.PI;
        const sx = hx + Math.cos(ang) * 10;
        const sy = hy + Math.sin(ang) * 10;
        ctx.fillStyle = rgba(cMid, 0.7);
        ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // ===== 默认 comet 彗星光束 =====
      // 1️⃣ 外层大光晕
      const gOuter = ctx.createRadialGradient(hx, hy, 0, hx, hy, 28);
      gOuter.addColorStop(0, rgba(cMid, 0.35));
      gOuter.addColorStop(0.4, rgba(cOuter, 0.15));
      gOuter.addColorStop(1, rgba(cOuter, 0));
      ctx.beginPath(); ctx.fillStyle = gOuter;
      ctx.arc(hx, hy, 28, 0, Math.PI * 2); ctx.fill();

      // 2️⃣ 主光束拖尾
      const tailLen = 35;
      const tx = hx - dirX * tailLen, ty = hy - dirY * tailLen;
      ctx.beginPath();
      const beamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
      beamGrad.addColorStop(0, rgba(cOuter, 0));
      beamGrad.addColorStop(0.3, rgba(cMid, 0.2));
      beamGrad.addColorStop(0.6, rgba(cMid, 0.55));
      beamGrad.addColorStop(0.88, rgba(cCore, 0.75));
      beamGrad.addColorStop(1, col.core);
      ctx.fillStyle = beamGrad;
      ctx.moveTo(hx, hy - 6);
      ctx.quadraticCurveTo(hx + 5, hy, hx, hy + 4);
      ctx.quadraticCurveTo(hx - 4*dirX + (tx-hx)*0.3, hy - 4*dirY + (ty-hy)*0.3 + 3, tx, ty);
      ctx.quadraticCurveTo(hx + 4*dirX + (tx-hx)*0.3, hy + 4*dirY + (ty-hy)*0.3 + 3, hx, hy + 4);
      ctx.quadraticCurveTo(hx - 5, hy, hx, hy - 6);
      ctx.fill();

      // 3️⃣ 头部高光爆发点
      const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
      headGlow.addColorStop(0, col.core);
      headGlow.addColorStop(0.3, rgba(cCore, 0.85));
      headGlow.addColorStop(0.65, rgba(cMid, 0.45));
      headGlow.addColorStop(1, rgba(cOuter, 0));
      ctx.beginPath(); ctx.fillStyle = headGlow;
      ctx.arc(hx, hy, 10, 0, Math.PI * 2); ctx.fill();

      // 4️⃣ 核心白点
      ctx.beginPath(); ctx.fillStyle = col.core;
      ctx.arc(hx - dirX, hy - dirY, 2.5, 0, Math.PI * 2); ctx.fill();

      // 5️⃣ 飞溅粒子
      const seed = ((b.x | 0) * 73856093 ^ (b.y | 0) * 19349663) >>> 0;
      for (let i = 0; i < 6; i++) {
        const n = ((seed + i * 7919) % 100000) / 100000;
        const angle = n * Math.PI * 2 + t * (1.5 + (i % 3));
        const dist = 10 + n * 14 + Math.sin(t * 6 + i * 1.5) * 4;
        const px = hx + Math.cos(angle) * dist;
        const py = hy + Math.sin(angle) * dist;
        const sz = 0.8 + (n % 3) * 0.6 + Math.sin(t * 10 + i * 2) * 0.3;
        const alpha = 0.35 + Math.sin(t * 8 + i) * 0.2;
        ctx.beginPath();
        ctx.fillStyle = (i % 2 === 0) ? rgba(cMid, alpha) : rgba(cOuter, alpha);
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _renderBuffItem(ctx, item) {
    const x = item.x, y = item.y;
    const t = (Date.now() % 3000) / 3000; // 0~1 循环动画
    const colors = {
      fireboost: { main: '#FF6D00', glow: 'rgba(255,109,0,0.35)', inner: 'rgba(255,160,0,0.15)', icon: '🔥' },
      shield:    { main: '#2979FF', glow: 'rgba(41,121,255,0.35)', inner: 'rgba(66,165,245,0.15)', icon: '🛡' },
      speed:     { main: '#00E676', glow: 'rgba(0,230,118,0.35)', inner: 'rgba(77,208,76,0.15)', icon: '⚡' },
      heal:      { main: '#4CAF50', glow: 'rgba(76,175,80,0.35)', inner: 'rgba(129,199,132,0.15)', icon: '❤' },
    };
    const c = colors[item.type] || colors.heal;
    const rot = t * Math.PI * 2; // 旋转角度

    ctx.save();

    // 1️⃣ 外层大光晕
    ctx.shadowColor = c.main; ctx.shadowBlur = 16;
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 32);
    outerGlow.addColorStop(0, c.glow);
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 2️⃣ 旋转六边形边框
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot * 0.3); // 缓慢旋转
    ctx.strokeStyle = c.main; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7 + Math.sin(t * Math.PI * 4) * 0.3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = 22;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 1;

    // 3️⃣ 内层填充
    ctx.fillStyle = c.inner;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = 20;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // 4️⃣ 图标/文字（白色粗字+描边，确保清晰可读）
    ctx.font = 'bold 20px "Segoe UI","Microsoft YaHei",Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const shortLabels = { fireboost: '火', shield: '盾', speed: '速', heal: '+' };
    const label = shortLabels[item.type] || '?';
    // 黑色描边
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(label, x, y + 1);
    // 白色主体
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = c.main; ctx.shadowBlur = 6;
    ctx.fillText(label, x, y + 1);
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';

    // 5️⃣ 上下浮动微动
    // (已在_updateBuffItems中通过y偏移实现)

    // 6️⃣ 外圈粒子环绕
    for (let i = 0; i < 3; i++) {
      const pAngle = rot * 1.5 + (Math.PI * 2 / 3) * i;
      const pr = 26 + Math.sin(t * Math.PI * 6 + i) * 3;
      const px = x + Math.cos(pAngle) * pr;
      const py = y + Math.sin(pAngle) * pr;
      ctx.fillStyle = c.main;
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  _renderEffect(ctx, fx) {
    ctx.globalAlpha = Math.max(0, fx.timer / fx.duration);
    if (fx.type === 'hit') {
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 15 * (1 - fx.timer / fx.duration), 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.type === 'explosion') {
      const progress = 1 - fx.timer / fx.duration;
      const r = 40 * progress;
      ctx.fillStyle = `rgba(255,${Math.floor(152 * (1 - progress))},0,${1 - progress})`;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.type === 'hitSpark') {
      // 子弹命中溅射：8个小火花粒子向外飞散
      const progress = 1 - fx.timer / fx.duration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sparkCount = 8;
      const seed = fx.x * 7 + fx.y * 13; // 伪随机种子
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 / sparkCount) * i + (seed % 6.28);
        const dist = 8 + progress * 28;
        const sx = fx.x + Math.cos(angle) * dist;
        const sy = fx.y + Math.sin(angle) * dist;
        const sr = Math.max(0.5, (1 - progress) * 3);
        const alpha = (1 - progress) * 0.9;
        // 内核白黄+外层橙色
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2);
        grad.addColorStop(0, `rgba(255,255,200,${alpha})`);
        grad.addColorStop(0.5, `rgba(255,180,50,${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255,80,0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(sx, sy, sr * 2, 0, Math.PI * 2); ctx.fill();
      }
      // 中心闪光
      const cAlpha = Math.max(0, (1 - progress * 2.5));
      if (cAlpha > 0) {
        const cg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, 12);
        cg.addColorStop(0, `rgba(255,255,220,${cAlpha})`);
        cg.addColorStop(1, `rgba(255,200,50,0)`);
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (fx.type === 'enemyDeath') {
      // 敌车死亡爆炸：多层火焰+碎片+冲击波
      const progress = 1 - fx.timer / fx.duration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 1) 冲击波环
      const ringR = 10 + progress * 60;
      const ringAlpha = (1 - progress) * 0.6;
      ctx.strokeStyle = `rgba(255,200,100,${ringAlpha})`;
      ctx.lineWidth = Math.max(0.5, (1 - progress) * 5);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, ringR, 0, Math.PI * 2); ctx.stroke();

      // 2) 核心火焰球
      const fireR = 15 + progress * 45;
      const fireAlpha = (1 - progress) * 0.85;
      const fg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fireR);
      fg.addColorStop(0, `rgba(255,255,200,${fireAlpha})`);
      fg.addColorStop(0.25, `rgba(255,200,50,${fireAlpha * 0.8})`);
      fg.addColorStop(0.55, `rgba(255,100,0,${fireAlpha * 0.5})`);
      fg.addColorStop(0.8, `rgba(200,30,0,${fireAlpha * 0.2})`);
      fg.addColorStop(1, 'rgba(100,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fireR, 0, Math.PI * 2); ctx.fill();

      // 3) 碎片粒子（12个向外飞散）
      const seed = fx.x * 3 + fx.y * 7;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i + ((seed * (i + 1)) % 6.28) * 0.3;
        const dist = 5 + progress * 55;
        const dx = fx.x + Math.cos(angle) * dist;
        const dy = fx.y + Math.sin(angle) * dist + progress * 8; // 略带下坠
        const ds = Math.max(0.5, (1 - progress) * 4);
        const dAlpha = (1 - progress * 0.8) * 0.8;
        // 碎片颜色：橙→红→灰
        const r = Math.floor(255 - progress * 155);
        const g = Math.floor(180 * (1 - progress));
        const b = Math.floor(50 * (1 - progress));
        ctx.fillStyle = `rgba(${r},${g},${b},${dAlpha})`;
        ctx.beginPath(); ctx.arc(dx, dy, ds, 0, Math.PI * 2); ctx.fill();
      }

      // 4) 顶部明亮闪光（前30%快速消失）
      const flashAlpha = Math.max(0, 1 - progress * 3.5);
      if (flashAlpha > 0) {
        const flashR = 20 + progress * 25;
        const flashG = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, flashR);
        flashG.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
        flashG.addColorStop(0.5, `rgba(255,255,150,${flashAlpha * 0.4})`);
        flashG.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = flashG;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, flashR, 0, Math.PI * 2); ctx.fill();
      }

      // 5) 烟雾残迹（后50%渐显）
      if (progress > 0.4) {
        const smokeAlpha = (progress - 0.4) * 0.25;
        const smokeR = 20 + (progress - 0.4) * 40;
        const sg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, smokeR);
        sg.addColorStop(0, `rgba(80,60,40,${smokeAlpha})`);
        sg.addColorStop(1, 'rgba(40,30,20,0)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, smokeR, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    } else if (fx.type === 'buffPickup') {
      // buff拾取闪光：径向爆发 + 环形扩散
      const progress = 1 - fx.timer / fx.duration;
      const c = fx.color || [255, 255, 255];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // 径向爆发
      const r = 50 * progress;
      const glow = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, r);
      glow.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.6 * (1 - progress)})`);
      glow.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${0.2 * (1 - progress)})`);
      glow.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.fill();
      // 环形扩散
      const ringR = 30 + progress * 50;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.5 * (1 - progress)})`;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  _renderFloatingText(ctx, ft) {
    ctx.globalAlpha = Math.min(1, ft.timer * 3);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
  }

  _renderHUD(ctx) {
    // 顶部半透明渐变背景
    const hudGrad = ctx.createLinearGradient(0, 0, 0, 115);
    hudGrad.addColorStop(0, 'rgba(3,6,16,0.95)');
    hudGrad.addColorStop(0.8, 'rgba(3,6,16,0.7)');
    hudGrad.addColorStop(1, 'rgba(3,6,16,0)');
    ctx.fillStyle = hudGrad;
    ctx.fillRect(0, 0, this.W, 115);

    // ===== 关卡/模式标签（左上角） =====
    const stageLabel = this.isEndless ? '无尽模式' : `关卡 ${this.stageLevel}`;
    const labelColor = this.isEndless ? '#B388FF' : '#00E5FF';
    ctx.font = 'bold 18px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = labelColor; ctx.shadowBlur = 10;
    ctx.fillStyle = labelColor;
    ctx.fillText(stageLabel, 14, 24);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFF';
    ctx.fillText(stageLabel, 14, 24);
    // 标签装饰线
    ctx.strokeStyle = this.isEndless ? 'rgba(179,136,255,0.35)' : 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 1;
    const slW = ctx.measureText(stageLabel).width;
    ctx.beginPath(); ctx.moveTo(14, 28); ctx.lineTo(14 + slW + 4, 28); ctx.stroke();

    // ===== 暂停按钮（右上角，加大触摸区+科技感双竖条） =====
    const pbX = this.W - 56, pbY = 10, pbS = 46;
    // 外发光
    ctx.save();
    ctx.shadowColor = 'rgba(0,200,255,0.4)';
    ctx.shadowBlur = 8;
    // 深色科技底
    const pbGrad = ctx.createLinearGradient(pbX, pbY, pbX, pbY + pbS);
    pbGrad.addColorStop(0, 'rgba(20,40,75,0.92)');
    pbGrad.addColorStop(1, 'rgba(8,18,38,0.95)');
    ctx.fillStyle = pbGrad;
    this._rr(ctx, pbX, pbY, pbS, pbS, 10); ctx.fill();
    ctx.restore();
    // 双层边框
    ctx.strokeStyle = 'rgba(0,229,255,0.55)';
    ctx.lineWidth = 1.5;
    this._rr(ctx, pbX, pbY, pbS, pbS, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    this._rr(ctx, pbX + 2.5, pbY + 2.5, pbS - 5, pbS - 5, 8); ctx.stroke();
    // 双竖条暂停符号（Canvas绘制+发光）
    ctx.save();
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#E8FCFF';
    const barW = 4, barH = 16, barGap = 6;
    const barY1 = pbY + (pbS - barH) / 2;
    ctx.fillRect(pbX + pbS / 2 - barGap / 2 - barW, barY1, barW, barH);
    ctx.fillRect(pbX + pbS / 2 + barGap / 2, barY1, barW, barH);
    ctx.restore();

    // ===== 车辆生命（设计稿风格：图标 + 标签 + 切角边框进度条）=====
    const hpIconX = 18, hpIconY = 40;
    this._drawHeartIcon(ctx, hpIconX, hpIconY + 9, 18);

    // 标签文字 "车辆生命"
    ctx.font = 'bold 11px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#00E5FF';
    ctx.fillText('车辆生命', hpIconX + 22, hpIconY + 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#B0F0FF';
    ctx.fillText('车辆生命', hpIconX + 22, hpIconY + 12);

    // 切角科技边框血条（紧凑版）
    const hpBarX = 14, hpBarY = 62, hpBarW = 300, hpBarH = 14;
    this._drawChamferedFrame(ctx, hpBarX, hpBarY, hpBarW, hpBarH, '#00E5FF');

    // 血条填充（绿→黄→红）
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    if (hpRatio > 0) {
      const fillW = Math.max(hpBarH * 0.4, (hpBarW - 18) * hpRatio);
      let c1, c2, glowC;
      if (hpRatio > 0.5) { c1 = '#00FF88'; c2 = '#00CC66'; glowC = 'rgba(0,255,136,0.5)'; }
      else if (hpRatio > 0.25) { c1 = '#FFD700'; c2 = '#FFA000'; glowC = 'rgba(255,215,0,0.5)'; }
      else { c1 = '#FF2244'; c2 = '#DD0022'; glowC = 'rgba(255,34,68,0.55)'; }

      ctx.save();
      ctx.beginPath();
      const ch = 9;
      ctx.moveTo(hpBarX + ch + 4, hpBarY + 3);
      ctx.lineTo(hpBarX + ch + 4 + fillW - 2, hpBarY + 3);
      ctx.lineTo(hpBarX + ch + 4 + fillW - 2, hpBarY + hpBarH - 3);
      ctx.lineTo(hpBarX + ch + 4, hpBarY + hpBarH - 3);
      ctx.closePath();
      ctx.clip();
      ctx.shadowColor = glowC; ctx.shadowBlur = 8;
      const hpg = ctx.createLinearGradient(hpBarX, hpBarY, hpBarX, hpBarY+hpBarH);
      hpg.addColorStop(0, c1); hpg.addColorStop(0.5, c2); hpg.addColorStop(1, this._darken(c2, 35));
      ctx.fillStyle = hpg;
      ctx.fill();
      // 顶部高光
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(hpBarX + ch + 6, hpBarY + 3.5, fillW - 6, 4);
      ctx.restore();

      // 填充端发光点
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 5;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(hpBarX + ch + 4 + fillW, hpBarY + hpBarH / 2, 2.5, 0, Math.PI * 2);
      ctx.fill(); ctx.shadowBlur = 0;
    }

    // HP数值（右侧）
    const hpTxt = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
    ctx.font = 'bold 10px "Segoe UI", Arial';
    const htw = ctx.measureText(hpTxt).width;
    ctx.fillStyle = 'rgba(0,8,20,0.65)';
    this._rr(ctx, hpBarX + hpBarW + 4, hpBarY + 3, htw + 7, hpBarH - 6, 3); ctx.fill();
    ctx.fillStyle = hpRatio > 0.5 ? '#69F0AE' : hpRatio > 0.25 ? '#FFE57F' : '#FF8A80';
    ctx.textAlign = 'left';
    ctx.fillText(hpTxt, hpBarX + hpBarW + 7, hpBarY + hpBarH - 4);

    // ===== 行驶距离（橙金主题）=====
    const distIconX = 18, distIconY = 84;
    this._drawRadarIcon(ctx, distIconX, distIconY + 9, 18);

    // 标签文字 "行驶距离"
    ctx.font = 'bold 11px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#FFB300'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFB300';
    ctx.fillText('行驶距离', distIconX + 22, distIconY + 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFE082';
    ctx.fillText('行驶距离', distIconX + 22, distIconY + 12);

    // 切角边框距离条
    const dbX = 14, dbY = 106, dbW = 400, dbH = 12;

    if (this.isEndless) {
      // 距离模式：无进度条，只显示当前距离（脉动呼吸）
      this._drawChamferedFrame(ctx, dbX, dbY, dbW, dbH, '#B388FF');
      const pulseAlpha = 0.3 + Math.sin(Date.now() * 0.003) * 0.15;
      ctx.save();
      ctx.beginPath(); const ch2=8;
      ctx.moveTo(dbX+ch2+4,dbY+3);ctx.lineTo(dbX+dbW-ch2-4,dbY+3);ctx.lineTo(dbX+dbW-ch2-4,dbY+dbH-3);ctx.lineTo(dbX+ch2+4,dbY+dbH-3);
      ctx.closePath(); ctx.clip();
      const eg = ctx.createLinearGradient(dbX, dbY, dbX+dbW, dbY);
      eg.addColorStop(0, `rgba(179,136,255,${pulseAlpha})`);
      eg.addColorStop(0.5, `rgba(124,77,255,${pulseAlpha * 1.3})`);
      eg.addColorStop(1, `rgba(179,136,255,${pulseAlpha})`);
      ctx.fillStyle = eg; ctx.fillRect(dbX, dbY, dbW, dbH);
      ctx.restore();
      // 距离数值（放大+描边）
      ctx.save();
      ctx.font = 'bold 13px "Consolas","Segoe UI",Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var endDistY = dbY + dbH / 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(`${this._formatDistance(this.distance)}`, dbX + 14, endDistY);
      ctx.shadowColor = '#7C4DFF';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#E1BEE7';
      ctx.fillText(`${this._formatDistance(this.distance)}`, dbX + 14, endDistY);
      ctx.restore();
    } else if (this.bossPhase !== 'none') {
      // Boss阶段：红色脉动警告条
      this._drawChamferedFrame(ctx, dbX, dbY, dbW, dbH, '#FF1744');
      const pulseAlpha = 0.55 + Math.sin(Date.now() * 0.007) * 0.3;
      ctx.save();
      ctx.beginPath(); const ch2=8;
      ctx.moveTo(dbX+ch2+4,dbY+3);ctx.lineTo(dbX+dbW-ch2-4,dbY+3);ctx.lineTo(dbX+dbW-ch2-4,dbY+dbH-3);ctx.lineTo(dbX+ch2+4,dbY+dbH-3);
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = `rgba(255,23,68,${pulseAlpha})`; ctx.fillRect(dbX, dbY, dbW, dbH);
      ctx.restore();
      // ⚠ 文字
      ctx.font = 'bold 10px "Segoe UI",Arial';
      ctx.fillStyle = '#FF5252'; ctx.shadowColor='#FF1744'; ctx.shadowBlur=4;
      ctx.fillText('⚠ BOSS 战斗中', dbX + 16, dbY + dbH - 3.5);
      ctx.shadowBlur = 0;
    } else {
      this._drawChamferedFrame(ctx, dbX, dbY, dbW, dbH, '#FFB300');
      const dRatio = Math.min(1, this.distance / this.targetDistance);
      if (dRatio > 0) {
        const fillW2 = Math.max(dbH*0.4, (dbW-18)*dRatio);
        ctx.save();
        ctx.beginPath(); const ch2=8;
        ctx.moveTo(dbX+ch2+4,dbY+3);ctx.lineTo(dbX+ch2+4+fillW2,dbY+3);ctx.lineTo(dbX+ch2+4+fillW2,dbY+dbH-3);ctx.lineTo(dbX+ch2+4,dbY+dbH-3);
        ctx.closePath(); ctx.clip();
        ctx.shadowColor='rgba(255,179,0,0.55)'; ctx.shadowBlur=7;
        const dg = ctx.createLinearGradient(dbX, dbY, dbX+fillW2, dbY);
        dg.addColorStop(0, '#FFD54F'); dg.addColorStop(0.5, '#FFB300'); dg.addColorStop(1, '#FF8F00');
        ctx.fillStyle = dg; ctx.fill();
        ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,0.25)';
        ctx.fillRect(dbX+ch2+6, dbY+3.5, fillW2-6, 3);
        ctx.restore();
        // 端点
        ctx.shadowColor='#FFF'; ctx.shadowBlur=4; ctx.fillStyle='#FFF';
        ctx.beginPath(); ctx.arc(dbX+ch2+4+fillW2, dbY+dbH/2, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      }
      // 距离数值（放大+描边+发光，确保清晰）
      var distText = `${Math.floor(this.distance)} m / ${this.targetDistance} m`;
      ctx.save();
      ctx.font = 'bold 13px "Consolas","Segoe UI",Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var distTextY = dbY + dbH / 2;
      // 文字描边（深色边）
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(distText, dbX + 14, distTextY);
      // 主文字（金色+发光）
      ctx.shadowColor = '#FFB300';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#FFE082';
      ctx.fillText(distText, dbX + 14, distTextY);
      ctx.restore();
    }

    // ===== BUFF状态图标（圆形徽章 + 环形倒计时） =====
    // 起点避开左侧血量条/距离条(右边界414)，并留16px间距
    let buffX = 430;
    this.player.buffs.forEach(b => {
      const cfg = {
        fireboost: { c1: '#FF8A50', c2: '#D84315', glow: '#FF6D00', icon: '🔥', label: '火力' },
        shield:    { c1: '#64B5F6', c2: '#1565C0', glow: '#2979FF', icon: '🛡', label: '护盾' },
        speed:     { c1: '#69F0AE', c2: '#00B248', glow: '#00E676', icon: '⚡', label: '加速' },
        heal:      { c1: '#FF80AB', c2: '#C2185B', glow: '#F50057', icon: '❤', label: '回血' },
      };
      const info = cfg[b.type] || { c1: '#FFF', c2: '#888', glow: '#FFF', icon: '✦', label: b.type };

      const buffCfg = window.GameConfig?.battle?.buffs || {};
      const duration = (buffCfg[b.type] || {}).duration || 5000;
      const ratio = Math.max(0, Math.min(1, b.remaining / duration));

      // 圆形徽章（紧凑版，避免挤占下方）
      const r = 16;
      const cx = buffX + r, cy = 50 + r;

      // 1. 外发光（buff颜色光晕）
      ctx.save();
      ctx.shadowColor = info.glow;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      // 径向渐变填充（中心亮，边缘暗）
      const gradB = ctx.createRadialGradient(cx - 5, cy - 5, 3, cx, cy, r);
      gradB.addColorStop(0, info.c1);
      gradB.addColorStop(0.6, info.c2);
      gradB.addColorStop(1, this._darken(info.c2, 50));
      ctx.fillStyle = gradB;
      ctx.fill();
      ctx.restore();

      // 2. 外圈深色描边
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 3. 内圈亮边（玻璃质感高光）
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 2, Math.PI * 0.7, Math.PI * 1.4);
      ctx.stroke();

      // 4. 顶部玻璃高光（半圆形透明白色）
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
      ctx.clip();
      const topGrad = ctx.createLinearGradient(cx, cy - r, cx, cy);
      topGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
      topGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r);
      ctx.restore();

      // 5. 中心 emoji 图标（白色描边+主色填充）
      ctx.save();
      ctx.font = '15px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
      ctx.fillText(info.icon, cx, cy + 1);
      ctx.restore();

      // 6. 环形倒计时进度条（围绕徽章一圈）
      const ringR = r + 3;
      // 背景环（深色）
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      // 进度环（buff颜色，从12点钟顺时针走）
      if (ratio > 0) {
        ctx.save();
        ctx.shadowColor = info.glow;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = info.c1;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // 起点-π/2（12点钟），顺时针
        const startA = -Math.PI / 2;
        const endA = startA + Math.PI * 2 * ratio;
        ctx.arc(cx, cy, ringR, startA, endA);
        ctx.stroke();
        ctx.restore();
      }

      // 7. 底部小标签（白色描边+主色文字）
      ctx.save();
      ctx.font = 'bold 10px "Microsoft YaHei",Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(info.label, cx, cy + ringR + 9);
      ctx.shadowColor = info.glow;
      ctx.shadowBlur = 3;
      ctx.fillStyle = info.c1;
      ctx.fillText(info.label, cx, cy + ringR + 9);
      ctx.restore();

      // 8. 倒计时秒数（小角标，徽章右下角）
      const secLeft = Math.ceil(b.remaining / 1000);
      ctx.save();
      ctx.font = 'bold 9px "Consolas",Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const secX = cx + ringR - 3, secY = cy + ringR - 3;
      // 圆角小气泡背景
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath();
      ctx.arc(secX, secY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = info.c1;
      ctx.fillText(String(secLeft), secX, secY);
      ctx.restore();

      buffX += ringR * 2 + 14;
    });
  }

  /** Boss来袭警告动画 */
  _renderBossWarning(ctx) {
    const progress = 1 - (this.bossWarningTimer / (window.GameConfig?.stages?.boss?.warningDuration || 2000));
    // 全屏红色闪烁
    const flashAlpha = 0.15 + Math.sin(Date.now() * 0.012) * 0.1;
    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
    ctx.fillRect(0, 0, this.W, this.H);

    // 上下红色条纹收缩
    const stripeH = 80 * (1 - progress);
    ctx.fillStyle = 'rgba(180, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.W, stripeH);
    ctx.fillRect(0, this.H - stripeH, this.W, stripeH);

    // 中央警告文字
    const scale = 1 + Math.sin(Date.now() * 0.008) * 0.08;
    ctx.save();
    ctx.translate(this.W / 2, this.H / 2);
    ctx.scale(scale, scale);

    // 文字阴影
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ BOSS来袭 ⚠', 3, 3);

    // 文字本体（红→金渐变闪烁）
    const hue = Math.floor(Date.now() * 0.01) % 2 === 0;
    ctx.fillStyle = hue ? '#FF1744' : '#FFD600';
    ctx.fillText('⚠ BOSS来袭 ⚠', 0, 0);

    // Boss名字副标题
    if (this.pendingBossVariant && this.pendingBossVariant.name) {
      ctx.font = 'bold 28px Arial, "Microsoft YaHei"';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText('— ' + this.pendingBossVariant.name + ' —', 2, 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('— ' + this.pendingBossVariant.name + ' —', 0, 48);
    }

    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  /** 暂停覆盖层 — 科幻科技风UI（匹配panel_win/btn_retry美术风格） */
  _renderPauseOverlay(ctx) {
    const W = this.W, H = this.H;
    const cx = W / 2, cy = H / 2;

    // ===== 1. 暗色背景 + 网格纹理 =====
    ctx.fillStyle = 'rgba(2,4,12,0.88)';
    ctx.fillRect(0, 0, W, H);
    // 微弱网格线
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 0.5;
    const gridSz = 32;
    for (let gx = 0; gx < W; gx += gridSz) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += gridSz) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    ctx.restore();

    // ===== 2. 面板参数 =====
    const pw = 340, ph = 420;        // 面板尺寸（比原来300×280更大，比例更好）
    const px = cx - pw / 2, py = cy - ph / 2;
    const ch = 18;                    // 切角尺寸
    const accentColor = '#00D4FF';    // 主色调：青色

    // ===== 3. 面板外发光 =====
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 35;
    ctx.fillStyle = 'rgba(3,8,20,0.95)';
    this._drawOctagonPath(ctx, px, py, pw, ph, ch);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ===== 4. 面板主体填充（深色半透明）=====
    ctx.save();
    this._drawOctagonPath(ctx, px, py, pw, ph, ch);
    ctx.fillStyle = 'rgba(5,12,28,0.97)';
    ctx.fill();
    ctx.restore();

    // ===== 5. 边框多层描边（外亮边+内暗边）=====
    // 外发光边框
    ctx.save();
    this._drawOctagonPath(ctx, px, py, pw, ph, ch);
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 内部暗色细边框
    ctx.save();
    const inset = 3;
    this._drawOctagonPath(ctx, px + inset, py + inset, pw - inset * 2, ph - inset * 2, ch - 1);
    ctx.strokeStyle = 'rgba(0,180,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ===== 6. 四角装饰（电路纹路）=====
    this._drawCornerDeco(ctx, px, py, ch, accentColor, 'tl');  // 左上
    this._drawCornerDeco(ctx, px + pw, py, ch, accentColor, 'tr');  // 右上
    this._drawCornerDeco(ctx, px, py + ph, ch, accentColor, 'bl');  // 左下
    this._drawCornerDeco(ctx, px + pw, py + ph, ch, accentColor, 'br'); // 右下

    // ===== 7. 两侧箭头装饰（chevron）=====
    this._drawSideChevron(ctx, px, py, pw, ph, accentColor, 'left');
    this._drawSideChevron(ctx, px, py, pw, ph, accentColor, 'right');

    // ===== 8. 水平扫描线纹理 =====
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 0.6;
    for (let ly = py + ch + 8; ly < py + ph - ch - 4; ly += 3) {
      ctx.beginPath(); ctx.moveTo(px + ch + 10, ly); ctx.lineTo(px + pw - ch - 10, ly); ctx.stroke();
    }
    ctx.restore();

    // ===== 9. 顶部标题栏区域 =====
    const titleY = py + 50;

    // 顶部装饰横线（双线）
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(px + 40, titleY - 22); ctx.lineTo(cx - 50, titleY - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 50, titleY - 22); ctx.lineTo(px + pw - 40, titleY - 22); ctx.stroke();

    // 中心小菱形
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, titleY - 28); ctx.lineTo(cx + 8, titleY - 22); ctx.lineTo(cx, titleY - 16); ctx.lineTo(cx - 8, titleY - 22);
    ctx.closePath();
    ctx.fillStyle = accentColor; ctx.fill();
    ctx.shadowColor = accentColor; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();

    // ===== 10. 暂停图标（双竖条 + 光晕）=====
    const iconY = titleY + 18;
    const barW = 14, barH = 44, barGap = 10;
    // 图标光晕
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = accentColor;
    this._rr(ctx, cx - barGap - barW, iconY - barH / 2, barW, barH, 3);
    ctx.fill();
    this._rr(ctx, cx + barGap, iconY - barH / 2, barW, barH, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 图标内部高光
    const iconGradV = ctx.createLinearGradient(cx - barGap - barW, iconY - barH / 2, cx - barGap - barW, iconY + barH / 2);
    iconGradV.addColorStop(0, 'rgba(255,255,255,0.7)');
    iconGradV.addColorStop(0.4, 'rgba(150,240,255,0.3)');
    iconGradV.addColorStop(1, 'rgba(0,160,220,0.2)');
    ctx.fillStyle = iconGradV;
    this._rr(ctx, cx - barGap - barW, iconY - barH / 2, barW, barH, 3);
    ctx.fill();
    this._rr(ctx, cx + barGap, iconY - barH / 2, barW, barH, 3);
    ctx.fill();
    ctx.restore();

    // ===== 11. 标题文字 "游戏暂停" =====
    const titleTextY = iconY + barH / 2 + 38;
    ctx.font = 'bold 30px "Segoe UI", "Microsoft YaHei", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 文字光晕底层
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = accentColor;
    ctx.fillText('游 戏 暂 停', cx, titleTextY);
    ctx.shadowBlur = 0;
    // 文字本体
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('游 戏 暂 停', cx, titleTextY);
    ctx.restore();

    // 标题下方分割线（渐变）
    ctx.save();
    const divY = titleTextY + 26;
    const divGrad = ctx.createLinearGradient(px + 60, divY, px + pw - 60, divY);
    divGrad.addColorStop(0, 'rgba(0,212,255,0)');
    divGrad.addColorStop(0.2, 'rgba(0,212,255,0.5)');
    divGrad.addColorStop(0.5, 'rgba(0,212,255,0.8)');
    divGrad.addColorStop(0.8, 'rgba(0,212,255,0.5)');
    divGrad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 60, divY); ctx.lineTo(px + pw - 60, divY); ctx.stroke();
    // 分割线中心亮点
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(cx, divY, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ===== 12. 按钮 =====
    const btnW = 270, btnH = 58;
    const btnGap = 18;
    const btnStartY = divY + 34;

    // --- 继续游戏按钮 ---
    const resumeX = cx - btnW / 2;
    const resumeY = btnStartY;
    this._drawPauseButton(ctx, resumeX, resumeY, btnW, btnH,
      '#0070A0', '#00A8D4', accentColor, '▶', '继 续 游 戏', true);

    // --- 返回主界面按钮 ---
    const quitX = cx - btnW / 2;
    const quitY = resumeY + btnH + btnGap;
    this._drawPauseButton(ctx, quitX, quitY, btnW, btnH,
      '#2A1820', '#3D2028', '#FF6B6B', '✕', '返 回 主 界 面', false);

    // ===== 13. 底部装饰文字 =====
    const footerY = py + ph - 24;
    ctx.save();
    ctx.font = '10px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = accentColor;
    ctx.fillText('— TAP TO RESUME —', cx, footerY);
    ctx.restore();

    // ===== 缓存按钮坐标（供触摸判定）=====
    this._pauseBtns = {
      resume: { x: resumeX, y: resumeY, w: btnW, h: btnH },
      quit: { x: quitX, y: quitY, w: btnW, h: btnH },
    };
  }

  /** 八边形切角路径（复用） */
  _drawOctagonPath(ctx, x, y, w, h, ch) {
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
  }

  /** 四角电路装饰 */
  _drawCornerDeco(ctx, x, y, ch, color, corner) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    const len = ch * 1.8;
    ctx.beginPath();
    switch (corner) {
      case 'tl': ctx.moveTo(x + 4, y + len); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x + len, y + 4); break;
      case 'tr': ctx.moveTo(x - 4, y + len); ctx.lineTo(x - 4, y + 4); ctx.lineTo(x - len, y + 4); break;
      case 'bl': ctx.moveTo(x + 4, y - len); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x + len, y - 4); break;
      case 'br': ctx.moveTo(x - 4, y - len); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x - len, y - 4); break;
    }
    ctx.stroke();
    // 角点小圆
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color;
    const dotR = 1.8;
    switch (corner) {
      case 'tl': ctx.beginPath(); ctx.arc(x + 4, y + 4, dotR, 0, Math.PI * 2); ctx.fill(); break;
      case 'tr': ctx.beginPath(); ctx.arc(x - 4, y + 4, dotR, 0, Math.PI * 2); ctx.fill(); break;
      case 'bl': ctx.beginPath(); ctx.arc(x + 4, y - 4, dotR, 0, Math.PI * 2); ctx.fill(); break;
      case 'br': ctx.beginPath(); ctx.arc(x - 4, y - 4, dotR, 0, Math.PI * 2); ctx.fill(); break;
    }
    ctx.restore();
  }

  /** 侧边Chevron箭头装饰 */
  _drawSideChevron(ctx, x, y, w, h, color, side) {
    ctx.save();
    const arrW = 8, arrH = h * 0.22;
    const arrY = y + h * 0.38;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x + arrW + 4, arrY);
      ctx.lineTo(x + 3, arrY + arrH * 0.5);
      ctx.lineTo(x + arrW + 4, arrY + arrH);
    } else {
      ctx.moveTo(x + w - arrW - 4, arrY);
      ctx.lineTo(x + w - 3, arrY + arrH * 0.5);
      ctx.lineTo(x + w - arrW - 4, arrY + arrH);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  /** 暂停弹窗按钮（科幻风格，匹配btn_retry切图风格） */
  _drawPauseButton(ctx, x, y, w, h, c1, c2, accentColor, icon, text, isPrimary) {
    const r = 10; // 圆角
    const ch = 8;  // 切角

    // ---- 外发光 ----
    ctx.save();
    ctx.shadowColor = isPrimary ? accentColor : 'rgba(255,100,100,0.3)';
    ctx.shadowBlur = isPrimary ? 14 : 6;

    // 按钮背景渐变
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, c1);
    bgGrad.addColorStop(0.5, c2);
    bgGrad.addColorStop(1, c1);

    // 绘制切角圆角路径
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ---- 边框 ----
    ctx.strokeStyle = isPrimary ? 'rgba(0,200,255,0.5)' : 'rgba(255,100,100,0.3)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 内部暗边
    ctx.strokeStyle = isPrimary ? 'rgba(0,180,255,0.15)' : 'rgba(255,80,80,0.1)';
    ctx.lineWidth = 0.6;
    const inset = 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y + inset);
    ctx.lineTo(x + w - r, y + inset);
    ctx.quadraticCurveTo(x + w - inset, y + inset, x + w - inset, y + r + inset);
    ctx.lineTo(x + w - inset, y + h - r - inset);
    ctx.quadraticCurveTo(x + w - inset, y + h - inset, x + w - r, y + h - inset);
    ctx.lineTo(x + r, y + h - inset);
    ctx.quadraticCurveTo(x + inset, y + h - inset, x + inset, y + h - r - inset);
    ctx.lineTo(x + inset, y + r + inset);
    ctx.quadraticCurveTo(x + inset, y + inset, x + r, y + inset);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // ---- 侧边Chevron装饰（匹配btn_retry的 << >>）----
    ctx.save();
    ctx.globalAlpha = isPrimary ? 0.2 : 0.12;
    ctx.fillStyle = isPrimary ? '#FFFFFF' : '#FFAAAA';
    const chevW = 6, chevH = h * 0.35;
    const chevY = y + (h - chevH) / 2;
    // 左chevron
    ctx.beginPath();
    ctx.moveTo(x + 14 + chevW, chevY);
    ctx.lineTo(x + 8, chevY + chevH / 2);
    ctx.lineTo(x + 14 + chevW, chevY + chevH);
    ctx.closePath(); ctx.fill();
    // 右chevron
    ctx.beginPath();
    ctx.moveTo(x + w - 14 - chevW, chevY);
    ctx.lineTo(x + w - 8, chevY + chevH / 2);
    ctx.lineTo(x + w - 14 - chevW, chevY + chevH);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // ---- 图标 + 文字 ----
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isPrimary) {
      // 主按钮：白色发光文字
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 19px "Segoe UI", "Microsoft YaHei", Arial';
      ctx.fillText(text, x + w / 2, y + h / 2);
      ctx.shadowBlur = 0;
    } else {
      // 次按钮：淡红色文字
      ctx.fillStyle = '#FF9999';
      ctx.font = 'bold 17px "Segoe UI", "Microsoft YaHei", Arial';
      ctx.fillText(text, x + w / 2, y + h / 2);
    }
    ctx.restore();

    // ---- 顶部高光线条 ----
    ctx.save();
    ctx.globalAlpha = isPrimary ? 0.25 : 0.1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + r + 4, y + 2);
    ctx.lineTo(x + w - r - 4, y + 2);
    ctx.stroke();
    ctx.restore();
  }
  _renderBossHPBar(ctx) {
    const b = this.bossEnemy;
    if (!b || b.hp <= 0) return;

    const barW = this.W - 40;
    const barH = 16;
    const barX = 20;
    const barY = 130; // 距离条下方，留足间距
    const hpRatio = Math.max(0, b.hp / b.maxHp);

    // ===== 骷髅图标 =====
    this._drawSkullIcon(ctx, barX + 12, barY, 16);

    // ===== "BOSS生命" 标签（品红发光） =====
    ctx.font = 'bold 10px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.shadowColor = `rgba(255,0,85,${0.4 + pulse * 0.4})`;
    ctx.shadowBlur = 8 + pulse * 5;
    ctx.fillStyle = '#FF0055';
    ctx.fillText('BOSS生命', barX + 24, barY + 5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF80AB';
    ctx.fillText('BOSS生命', barX + 24, barY + 5);

    // ===== 切角科技边框Boss血条（品红色）=====
    const bY = barY + 8;
    this._drawChamferedFrame(ctx, barX, bY, barW, barH, '#FF0055');

    if (hpRatio > 0) {
      const fillW = Math.max(barH * 0.35, (barW - 18) * hpRatio);
      let cCore, cMid, cEdge;
      if (hpRatio > 0.5) { cCore = '#FF1155'; cMid = '#DD0033'; cEdge = '#AA0022'; }
      else if (hpRatio > 0.25) { cCore = '#FF4411'; cMid = '#DD3300'; cEdge = '#AA2200'; }
      else { cCore = '#FF8800'; cMid = '#DD6600'; cEdge = '#AA4400'; }

      // 切角填充路径
      ctx.save();
      ctx.beginPath();
      const ch = 9;
      ctx.moveTo(barX + ch + 4, bY + 3);
      ctx.lineTo(barX + ch + 4 + fillW, bY + 3);
      ctx.lineTo(barX + ch + 4 + fillW, bY + barH - 3);
      ctx.lineTo(barX + ch + 4, bY + barH - 3);
      ctx.closePath();
      ctx.clip();

      ctx.shadowColor = cCore; ctx.shadowBlur = 10;
      const fg = ctx.createLinearGradient(barX, bY, barX + fillW, bY);
      fg.addColorStop(0, cCore); fg.addColorStop(0.4, cMid); fg.addColorStop(1, cEdge);
      ctx.fillStyle = fg; ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(barX + ch + 6, bY + 3.5, fillW - 6, 3.5);

      // 分段刻度
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.8;
      for (let seg = 1; seg < 10; seg++) {
        const sx = barX + (barW * seg / 10);
        if (sx < barX + fillW - 2) {
          ctx.beginPath(); ctx.moveTo(sx, bY + 4); ctx.lineTo(sx, bY + barH - 4); ctx.stroke();
        }
      }
      ctx.restore();

      // 端点发光
      ctx.shadowColor = '#FFF'; ctx.shadowBlur = 5; ctx.fillStyle='#FFF';
      ctx.beginPath(); ctx.arc(barX + ch + 4 + fillW, bY + barH/2, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // HP数值（居中，半透明底）
    const hpTxt = `${Math.ceil(b.hp)} / ${b.maxHp}`;
    ctx.font = 'bold 10px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    const ttw = ctx.measureText(hpTxt).width;
    ctx.fillStyle = 'rgba(30,0,8,0.6)';
    this._rr(ctx, this.W/2 - ttw/2 - 3, bY + barH/2 - 6, ttw + 6, 12, 3); ctx.fill();
    ctx.fillStyle = '#FF80AB';
    ctx.fillText(hpTxt, this.W/2, bY + barH/2 + 3);
  }

  // ========== 结算界面（成功/失败）- 基于切图 ==========

  /**
   * 严格按参考图布局重排（所有 y 坐标基于 panelH 百分比）：
   *   8%:  LEVEL N（切图自带）
   *   17%: 标题 "战斗成功!/战斗失败"
   *   30%: 三星图标（仅胜利）
   *   42% / 50% / 58%: 信息行（击杀/距离/金币奖励）
   *   67%: REWARD 装饰
   *   75%: 金币卡片
   *   82%: 卡片下方 "+N"
   *   91%: 按钮区（在 +N 之下，再下不溢出）
   * 关键：保证每个元素的 yBottom <= 下一元素的 yTop，杜绝重叠
   */
  _renderResultPanel(ctx, isWin) {
    const W = this.W, H = this.H;
    // 半透明黑遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);

    const imgs = this.resultImgs;
    const panelImg = isWin ? imgs.panelWin : imgs.panelFail;
    const titleColor = isWin ? '#FFC107' : '#FF3535';
    const titleGlow = isWin ? 'rgba(255,193,7,0.95)' : 'rgba(255,53,53,0.95)';
    const valueColor = isWin ? '#FFD43B' : '#FFC107';
    const accent = isWin ? '#5BE0F3' : '#FF6B5C';

    // ===== 使用切图作为面板背景，按切图实际比例适配 =====
    // 切图实际比例 - success 1.417 / fail 1.478
    const ratio = (panelImg && panelImg.naturalHeight && panelImg.naturalWidth)
      ? panelImg.naturalHeight / panelImg.naturalWidth : 1.42;
    // 大幅缩小panel，确保底框完整可见
    // 高度优先：panelH = 65%屏高，panelW = panelH/ratio
    let panelH = Math.min(H * 0.65, 820);
    let panelW = panelH / ratio;
    // 宽度上限保护
    if (panelW > W * 0.82) {
      panelW = W * 0.82;
      panelH = panelW * ratio;
    }
    const px = (W - panelW) / 2;
    // 垂直居中，强制顶部至少 80px、底部至少 140px 留白
    const py = Math.max(80, Math.min(H - panelH - 140, (H - panelH) / 2 - 30));

    this._resultBtns = {};

    // === 1. Canvas 完整科技未来风底框（不再依赖切图，自己画完整闭合边框） ===
    this._drawSciFiPanel(ctx, px, py, panelW, panelH, accent, isWin);

    // === 2. LEVEL 标签（统一 Canvas 绘制） ===
    {
      ctx.save();
      const lvlY = py + panelH * 0.07;
      const lvlText = 'LEVEL ' + this.stageLevel;
      ctx.font = `bold ${Math.floor(panelW * 0.05)}px "Microsoft YaHei", Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lvlText).width;
      // 顶部居中 LEVEL 胶囊（嵌在顶边框中）
      const capPad = 22;
      const capW = tw + capPad * 2;
      const capH = panelW * 0.07;
      const capX = W / 2 - capW / 2;
      const capY = lvlY - capH / 2;
      // 胶囊深色底
      ctx.fillStyle = 'rgba(4,12,28,0.98)';
      this._rr(ctx, capX, capY, capW, capH, capH / 2);
      ctx.fill();
      // 胶囊青色描边
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      this._rr(ctx, capX, capY, capW, capH, capH / 2);
      ctx.stroke();
      // 文字
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(lvlText, W / 2, lvlY);
      ctx.restore();
    }

    // === 3. 标题 ===
    ctx.save();
    ctx.shadowColor = titleGlow;
    ctx.shadowBlur = 22;
    ctx.fillStyle = titleColor;
    ctx.font = `bold ${Math.floor(panelW * 0.115)}px "Microsoft YaHei", Arial Black`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    const titleY = py + panelH * 0.21;
    const titleTxt = isWin ? '战斗成功!' : '战斗失败';
    ctx.strokeText(titleTxt, W / 2, titleY);
    ctx.fillText(titleTxt, W / 2, titleY);
    ctx.restore();

    // === 4. 三星图标（仅胜利）===
    if (isWin) {
      const starY = py + panelH * 0.33;
      const starSize = panelW * 0.12;
      const starGap = panelW * 0.16;
      for (let i = 0; i < 3; i++) {
        this._drawStarIcon(ctx, W / 2 + (i - 1) * starGap, starY, starSize);
      }
    }

    // === 5. 信息区 ===
    const rewards = this._calculateRewards();
    const coinReward = isWin ? rewards.coins : Math.max(1, Math.floor(rewards.coins * 0.2));
    const iconKeySet = isWin
      ? ['iconTargetCyan', 'iconRoadCyan', 'iconCoinPileCyan']
      : ['iconTargetRed', 'iconRoadRed', 'iconCoinRed'];

    const lineStartY = py + panelH * (isWin ? 0.46 : 0.40);
    const lineGap = panelH * 0.06;
    const iconBox = Math.floor(panelW * 0.062);
    const iconCX = px + panelW * 0.22;
    const labelTextX = px + panelW * 0.30;
    const valueRightX = px + panelW * 0.78;

    ctx.font = `${Math.floor(panelW * 0.05)}px "Microsoft YaHei", Arial`;

    const drawRow = (iconKey, label, value, valueClr, y) => {
      const ic = imgs[iconKey];
      if (ic && ic.complete && ic.naturalWidth > 0) {
        const aspect = ic.naturalWidth / ic.naturalHeight;
        let iw, ih;
        if (aspect >= 1) { iw = iconBox; ih = iconBox / aspect; }
        else { ih = iconBox; iw = iconBox * aspect; }
        ctx.drawImage(ic, iconCX - iw / 2, y - ih / 2, iw, ih);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelTextX, y);
      ctx.fillStyle = valueClr || '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.fillText(value, valueRightX, y);
    };

    drawRow(iconKeySet[0], '击杀数:', `${this.kills}`, '#FFFFFF', lineStartY);
    drawRow(iconKeySet[1], '距离:', `${Math.floor(this.distance)}m`, '#FFFFFF', lineStartY + lineGap);
    drawRow(iconKeySet[2], isWin ? '金币奖励:' : '保底奖励:', `+${coinReward}`, valueColor, lineStartY + lineGap * 2);

    // === 6. REWARD 分割线（统一 Canvas 绘制） ===
    {
      ctx.save();
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;
      ctx.font = `bold ${Math.floor(panelW * 0.038)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const rewardLabelY = py + panelH * 0.71;
      ctx.fillText('REWARD', W / 2, rewardLabelY);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      const lineW = panelW * 0.14;
      ctx.beginPath();
      ctx.moveTo(W / 2 - lineW - panelW * 0.11, rewardLabelY);
      ctx.lineTo(W / 2 - panelW * 0.11, rewardLabelY);
      ctx.moveTo(W / 2 + panelW * 0.11, rewardLabelY);
      ctx.lineTo(W / 2 + lineW + panelW * 0.11, rewardLabelY);
      ctx.stroke();
      // 两端小六边形装饰
      ctx.shadowBlur = 4;
      const hexR = 4;
      [[-lineW - panelW * 0.11, 0], [lineW + panelW * 0.11, 0]].forEach(([dx]) => {
        ctx.fillStyle = accent;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * 2 * i / 6;
          const x = W / 2 + dx + Math.cos(a) * hexR;
          const y = rewardLabelY + Math.sin(a) * hexR;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    // === 7. 金币卡片 ===
    // 胜利：切图REWARD在约70%, 卡片放74%；失败：自补REWARD在66%, 卡片放74%
    const cardSize = panelW * 0.13;
    const cardCX = W / 2;
    const cardCY = py + panelH * (isWin ? 0.84 : 0.83);
    ctx.save();
    ctx.fillStyle = isWin ? 'rgba(91,224,243,0.10)' : 'rgba(255,107,92,0.10)';
    ctx.strokeStyle = accent + 'CC';
    ctx.lineWidth = 1.5;
    this._rr(ctx, cardCX - cardSize / 2, cardCY - cardSize / 2, cardSize, cardSize, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // 金币图标
    const coinImg = isWin ? imgs.coinBig : imgs.coinGlow;
    const coinH = cardSize * 0.78;
    const coinW = coinImg && coinImg.naturalWidth
      ? Math.min(cardSize * 0.92, (coinImg.naturalWidth / coinImg.naturalHeight) * coinH) : coinH;
    if (coinImg && coinImg.complete && coinImg.naturalWidth > 0) {
      ctx.drawImage(coinImg, cardCX - coinW / 2, cardCY - coinH / 2, coinW, coinH);
    }
    // "+N"
    ctx.save();
    ctx.shadowColor = 'rgba(255,193,7,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = valueColor;
    ctx.font = `bold ${Math.floor(panelW * 0.034)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`+${coinReward}`, cardCX, cardCY + cardSize / 2 + 4);
    ctx.restore();

    // === 8. 按钮（放在 panel 下方外部，让 panel 底框完整显示）===
    const btnGap = 24;  // panel 底与按钮顶的间距
    if (isWin) {
      const btn = imgs.btnClaim;
      const btnW = panelW * 0.68;
      const btnH = btn && btn.naturalWidth
        ? (btn.naturalHeight / btn.naturalWidth) * btnW : btnW * 0.24;
      const bx = W / 2 - btnW / 2;
      const by = py + panelH + btnGap;
      if (btn && btn.complete && btn.naturalWidth > 0) {
        ctx.drawImage(btn, bx, by, btnW, btnH);
      }
      this._resultBtns.claim = { x: bx, y: by, w: btnW, h: btnH };
    } else {
      const btnImg1 = imgs.btnRetry;
      const btnImg2 = imgs.btnBack;
      const btnW = panelW * 0.42;
      const btnH = btnImg1 && btnImg1.naturalWidth
        ? (btnImg1.naturalHeight / btnImg1.naturalWidth) * btnW : btnW * 0.32;
      const gap = panelW * 0.04;
      const totalW = btnW * 2 + gap;
      const bx1 = W / 2 - totalW / 2;
      const bx2 = bx1 + btnW + gap;
      const by = py + panelH + btnGap;
      if (btnImg1 && btnImg1.complete && btnImg1.naturalWidth > 0) {
        ctx.drawImage(btnImg1, bx1, by, btnW, btnH);
      }
      if (btnImg2 && btnImg2.complete && btnImg2.naturalWidth > 0) {
        ctx.drawImage(btnImg2, bx2, by, btnW, btnH);
      }
      this._resultBtns.retry = { x: bx1, y: by, w: btnW, h: btnH };
      this._resultBtns.back = { x: bx2, y: by, w: btnW, h: btnH };
    }
  }

  /**
   * 绘制完整科技未来风结算面板底框
   * 8层结构：1)外发光 2)深蓝渐变底 3)六边形纹理 4)主边框 5)四角L形装饰
   *          6)四边中点装饰 7)顶/底封口横线 8)内圈高光
   */
  _drawSciFiPanel(ctx, x, y, w, h, accent, isWin) {
    const r = 18;  // 切角半径

    // 1. 外发光（panel 整体光晕）
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.001)';
    this._rr(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();

    // 2. 深蓝主背景（径向渐变，中心稍亮）
    ctx.save();
    const bgGrad = ctx.createRadialGradient(x + w / 2, y + h * 0.4, w * 0.1, x + w / 2, y + h * 0.6, w * 0.9);
    bgGrad.addColorStop(0, isWin ? 'rgba(15,32,58,0.96)' : 'rgba(38,18,18,0.96)');
    bgGrad.addColorStop(0.6, isWin ? 'rgba(8,20,42,0.97)' : 'rgba(25,10,10,0.97)');
    bgGrad.addColorStop(1, 'rgba(3,10,22,0.98)');
    ctx.fillStyle = bgGrad;
    this._rr(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();

    // 3. 六边形纹理（极淡）
    ctx.save();
    this._rr(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.strokeStyle = accent + '12';
    ctx.lineWidth = 0.8;
    const hexSize = 18;
    const hexHor = hexSize * 1.5;
    const hexVer = hexSize * Math.sqrt(3);
    for (let row = 0; row * (hexVer / 2) < h + hexVer; row++) {
      for (let col = 0; col * hexHor < w + hexHor; col++) {
        const cx = x + col * hexHor + (row % 2 ? hexHor / 2 : 0);
        const cy = y + row * (hexVer / 2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 3 * i;
          const px = cx + Math.cos(a) * hexSize * 0.5;
          const py = cy + Math.sin(a) * hexSize * 0.5;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();

    // 4. 主边框（青色/红色双层）
    // 外圈深色描边
    ctx.save();
    ctx.strokeStyle = isWin ? 'rgba(8,40,60,0.9)' : 'rgba(50,15,15,0.9)';
    ctx.lineWidth = 4;
    this._rr(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();

    // 内圈主色发光描边
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    this._rr(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();

    // 内圈淡色高光
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    this._rr(ctx, x + 5, y + 5, w - 10, h - 10, r - 3);
    ctx.stroke();
    ctx.restore();

    // 5. 四角加粗 L 形装饰（科技感角标）
    const cornerLen = 32;
    const cornerInset = 0;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const corners = [
      [x + cornerInset + r, y + cornerInset, 1, 1],
      [x + w - cornerInset - r, y + cornerInset, -1, 1],
      [x + cornerInset + r, y + h - cornerInset, 1, -1],
      [x + w - cornerInset - r, y + h - cornerInset, -1, -1],
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      // 横线
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + cornerLen * dx, cy);
      ctx.stroke();
      // 竖线（从角的圆弧外侧延伸）
      ctx.beginPath();
      const cy2 = cy + (dy > 0 ? r : -r);
      ctx.moveTo(cx - r * dx, cy2);
      ctx.lineTo(cx - r * dx, cy2 + cornerLen * dy);
      ctx.stroke();
    });
    ctx.restore();

    // 6. 四边中点装饰（小菱形发光点）
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    ctx.fillStyle = accent;
    const dSize = 5;
    const drawDiamond = (cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - dSize);
      ctx.lineTo(cx + dSize, cy);
      ctx.lineTo(cx, cy + dSize);
      ctx.lineTo(cx - dSize, cy);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(x + w / 2, y);          // 顶
    drawDiamond(x + w / 2, y + h);      // 底
    drawDiamond(x, y + h / 2);          // 左
    drawDiamond(x + w, y + h / 2);      // 右
    ctx.restore();

    // 7. 底部装饰带（封闭感最关键的部分：双横线+中央菱形）
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = accent + 'AA';
    ctx.lineWidth = 1.2;
    // 底部内侧双横线
    const bl1Y = y + h - 14;
    const bl2Y = y + h - 18;
    ctx.beginPath();
    ctx.moveTo(x + 50, bl1Y);
    ctx.lineTo(x + w / 2 - 28, bl1Y);
    ctx.moveTo(x + w / 2 + 28, bl1Y);
    ctx.lineTo(x + w - 50, bl1Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 80, bl2Y);
    ctx.lineTo(x + w / 2 - 40, bl2Y);
    ctx.moveTo(x + w / 2 + 40, bl2Y);
    ctx.lineTo(x + w - 80, bl2Y);
    ctx.stroke();
    // 中央小菱形（带发光）
    ctx.fillStyle = accent;
    ctx.shadowBlur = 10;
    drawDiamond.call ? null : null;
    const cx = x + w / 2, cy = bl1Y;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx, cy + 7);
    ctx.lineTo(cx - 7, cy);
    ctx.closePath();
    ctx.fill();
    // 中央菱形内部高光
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 8. 顶部装饰带：去掉（LEVEL胶囊已占据顶部，避免重叠）

    // 9. 内部水平分割线（在LEVEL下方+REWARD上方各一条，增加科技层次）
    ctx.save();
    ctx.strokeStyle = accent + '50';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    // LEVEL 下方分割线
    const sep1Y = y + h * 0.13;
    ctx.beginPath();
    ctx.moveTo(x + 30, sep1Y);
    ctx.lineTo(x + w - 30, sep1Y);
    ctx.stroke();
    ctx.restore();
  }

  /** 绘制金色五角星图标（带光晕） */
  _drawStarIcon(ctx, cx, cy, size) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,193,7,0.85)';
    ctx.shadowBlur = 14;
    const r = size / 2;
    const inner = r * 0.42;
    const grad = ctx.createRadialGradient(cx, cy - r * 0.2, inner * 0.3, cx, cy, r);
    grad.addColorStop(0, '#FFE680');
    grad.addColorStop(0.6, '#FFC107');
    grad.addColorStop(1, '#E68F00');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#7A4F00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = (i % 2 === 0) ? r : inner;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _renderVictory(ctx) {
    this._renderResultPanel(ctx, true);
  }

  _renderGameOver(ctx) {
    this._renderResultPanel(ctx, false);
  }

  // ========== 交互 ==========

  _onTouchStart(pos) {
    // 暂停按钮命中检测（右上角，与渲染位置一致）
    const pbX = this.W - 56, pbY = 10, pbS = 46;
    const inPauseBtn = pos.x >= pbX && pos.x <= pbX + pbS && pos.y >= pbY && pos.y <= pbY + pbS;

    // 暂停状态下的按钮处理
    if (this.paused) {
      if (this._pauseBtns) {
        const inBtn = (b) => b && pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h;
        if (inBtn(this._pauseBtns.resume)) {
          this.paused = false;
        } else if (inBtn(this._pauseBtns.quit)) {
          this.paused = false;
          this.engine.switchScene('crafting');
        }
      }
      return;
    }

    // 结算界面点击（按缓存按钮坐标判定）
    const inBtn = (b) => b && pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h;
    if (this.victory) {
      if (this._resultBtns && inBtn(this._resultBtns.claim)) {
        const rewards = this._calculateRewards();
        this.state.addCoins(rewards.coins);
        this.state.addGems(rewards.gems);
        this.state.advanceStage();
        this.engine.switchScene('crafting');
      }
      return;
    }

    if (this.gameOver) {
      if (this.isEndless) {
        // 距离模式结算
        const endlessCfg = window.GameConfig?.stages?.endless || {};
        const coinMult = endlessCfg.coinMultiplier || 1.0;
        const finalCoins = Math.floor(this.earnedCoins * coinMult);
        if (this._resultBtns && inBtn(this._resultBtns.retry)) {
          this.state.addCoins(finalCoins);
          this._initStage();
        } else if (this._resultBtns && inBtn(this._resultBtns.back)) {
          this.state.addCoins(finalCoins);
          this.state.set('gameMode', 'stage'); // 恢复默认模式
          this.engine.switchScene('crafting');
        }
      } else {
        if (this._resultBtns && inBtn(this._resultBtns.retry)) {
          this._initStage();
        } else if (this._resultBtns && inBtn(this._resultBtns.back)) {
          const failCoins = Math.max(1, Math.floor(this._calculateRewards().coins * 0.2));
          this.state.addCoins(failCoins);
          this.engine.switchScene('crafting');
        }
      }
      return;
    }

    // 暂停按钮点击
    if (inPauseBtn) {
      this.paused = true;
      return;
    }

    this.touchStartPos = { x: pos.x, y: pos.y };
    this.playerStartPos = { x: this.player.x, y: this.player.y };
  }

  _onTouchMove(pos) {
    if (!this.touchStartPos || this.gameOver || this.victory) return;

    const dx = pos.x - this.touchStartPos.x;
    const dy = pos.y - this.touchStartPos.y;
    const speed = window.GameConfig?.battle?.playerMoveSpeed || 8;

    this.player.x = Math.max(this.roadX + this.player.width / 2,
      Math.min(this.roadX + this.roadWidth - this.player.width / 2,
        this.playerStartPos.x + dx));
    // Y范围：上限保持半个车身防止飞出顶部；下限只用碰撞盒的一半（不用视觉框）
    // 让玩家可贴近屏幕底部移动（车视觉框360px但碰撞盒140px）
    this.player.y = Math.max(this.player.height / 2,
      Math.min(this.H - this.player.hitHeight / 2 - 10,
        this.playerStartPos.y + dy));
  }

  _onTouchEnd(pos) {
    this.touchStartPos = null;
    this.playerStartPos = null;
  }

  // ========== 工具方法 ==========

  _addEffect(x, y, type, duration) {
    const d = duration || (type === 'enemyDeath' ? 0.8 : type === 'hitSpark' ? 0.25 : 0.3);
    this.effects.push({ x, y, type, timer: d, duration: d });
  }

  _addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, timer: 1.2 });
  }

  // ========== 距离模式专用 ==========

  /** 格式化距离显示 */
  _formatDistance(d) {
    if (d < 1000) return `${Math.floor(d)}m`;
    if (d < 10000) return `${(d / 1000).toFixed(1)}km`;
    return `${(d / 1000).toFixed(2)}km`;
  }

  /**
   * 距离模式结算弹窗 — 赛博紫色调
   * 布局：
   *   12%: 标题 "行程结束"
   *   28%: 距离（大字）
   *   42%: 金币图标+金额
   *   56%: 击杀数
   *   70%: 等效关卡
   *   88%: 按钮区（再来一次 / 返回主界面）
   */
  _renderEndlessResultPanel(ctx) {
    const W = this.W, H = this.H;
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, W, H);

    const endlessCfg = window.GameConfig?.stages?.endless || {};
    const coinMult = endlessCfg.coinMultiplier || 1.0;
    const finalCoins = Math.floor(this.earnedCoins * coinMult);

    // 面板尺寸
    const panelW = W * 0.82;
    const panelH = panelW * 1.35;
    const px = (W - panelW) / 2;
    const py = Math.max(40, (H - panelH) / 2);

    this._resultBtns = {};

    // === 面板背景 — 深紫渐变+切角 ===
    ctx.save();
    const ch = 16;
    ctx.beginPath();
    ctx.moveTo(px + ch, py);
    ctx.lineTo(px + panelW - ch, py);
    ctx.lineTo(px + panelW, py + ch);
    ctx.lineTo(px + panelW, py + panelH - ch);
    ctx.lineTo(px + panelW - ch, py + panelH);
    ctx.lineTo(px + ch, py + panelH);
    ctx.lineTo(px, py + panelH - ch);
    ctx.lineTo(px, py + ch);
    ctx.closePath();

    const bgGrad = ctx.createLinearGradient(px, py, px, py + panelH);
    bgGrad.addColorStop(0, '#1A0A2E');
    bgGrad.addColorStop(0.3, '#16082B');
    bgGrad.addColorStop(0.7, '#120624');
    bgGrad.addColorStop(1, '#0D0418');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // 面板边框
    ctx.strokeStyle = 'rgba(179,136,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // === 顶部装饰线 ===
    ctx.save();
    ctx.strokeStyle = 'rgba(124,77,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + ch + 10, py + panelH * 0.06);
    ctx.lineTo(px + panelW - ch - 10, py + panelH * 0.06);
    ctx.stroke();
    ctx.restore();

    // === 标题 "行程结束" ===
    ctx.save();
    ctx.shadowColor = 'rgba(179,136,255,0.9)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#B388FF';
    ctx.font = `bold ${Math.floor(panelW * 0.11)}px "Microsoft YaHei", Arial Black`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('行程结束', W / 2, py + panelH * 0.13);
    ctx.restore();

    // === 分隔线 ===
    ctx.save();
    ctx.strokeStyle = 'rgba(124,77,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + panelW * 0.15, py + panelH * 0.20);
    ctx.lineTo(px + panelW * 0.85, py + panelH * 0.20);
    ctx.stroke();
    ctx.restore();

    // === 距离 — 大字居中 ===
    ctx.save();
    ctx.shadowColor = 'rgba(224,64,251,0.8)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#E040FB';
    ctx.font = `bold ${Math.floor(panelW * 0.18)}px "Microsoft YaHei", Arial Black`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._formatDistance(this.distance), W / 2, py + panelH * 0.31);
    ctx.restore();

    // 距离标签
    ctx.save();
    ctx.fillStyle = 'rgba(179,136,255,0.6)';
    ctx.font = `${Math.floor(panelW * 0.045)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('总行驶距离', W / 2, py + panelH * 0.39);
    ctx.restore();

    // === 金币行 ===
    const coinY = py + panelH * 0.50;
    // 金币圆形图标
    ctx.save();
    ctx.shadowColor = 'rgba(255,193,7,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.arc(px + panelW * 0.25, coinY, panelW * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#5C4500';
    ctx.font = `bold ${Math.floor(panelW * 0.04)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', px + panelW * 0.25, coinY);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#FFD54F';
    ctx.shadowColor = 'rgba(255,193,7,0.5)';
    ctx.shadowBlur = 6;
    ctx.font = `bold ${Math.floor(panelW * 0.085)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${finalCoins}`, px + panelW * 0.33, coinY);
    ctx.restore();

    // === 击杀行 ===
    const killY = py + panelH * 0.60;
    ctx.save();
    ctx.fillStyle = 'rgba(179,136,255,0.5)';
    ctx.font = `${Math.floor(panelW * 0.046)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('击杀数:', px + panelW * 0.15, killY);
    ctx.fillStyle = '#CE93D8';
    ctx.font = `bold ${Math.floor(panelW * 0.058)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'right';
    ctx.fillText(`${this.kills}`, px + panelW * 0.85, killY);
    ctx.restore();

    // === 等效关卡行 ===
    const lvY = py + panelH * 0.68;
    ctx.save();
    ctx.fillStyle = 'rgba(179,136,255,0.5)';
    ctx.font = `${Math.floor(panelW * 0.046)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('难度达到:', px + panelW * 0.15, lvY);
    ctx.fillStyle = '#CE93D8';
    ctx.font = `bold ${Math.floor(panelW * 0.058)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'right';
    ctx.fillText(`LV.${this.effectiveStage}`, px + panelW * 0.85, lvY);
    ctx.restore();

    // === 分隔线 ===
    ctx.save();
    ctx.strokeStyle = 'rgba(124,77,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + panelW * 0.15, py + panelH * 0.75);
    ctx.lineTo(px + panelW * 0.85, py + panelH * 0.75);
    ctx.stroke();
    ctx.restore();

    // === 按钮 ===
    const btnW = panelW * 0.40;
    const btnH = panelW * 0.135;
    const btnGap = panelW * 0.05;
    const totalBtnW = btnW * 2 + btnGap;
    const btnY = py + panelH * 0.83;
    const btnX1 = W / 2 - totalBtnW / 2;
    const btnX2 = btnX1 + btnW + btnGap;

    // 再来一次按钮 — 紫色
    this._drawEndlessBtn(ctx, btnX1, btnY, btnW, btnH, '再来一次', '#7C4DFF', '#B388FF');
    this._resultBtns.retry = { x: btnX1, y: btnY, w: btnW, h: btnH };

    // 返回主界面按钮 — 深灰紫
    this._drawEndlessBtn(ctx, btnX2, btnY, btnW, btnH, '返回', '#4A3A6B', '#8E7BAA');
    this._resultBtns.back = { x: btnX2, y: btnY, w: btnW, h: btnH };
  }

  /** 距离模式按钮绘制 — 切角矩形+发光 */
  _drawEndlessBtn(ctx, x, y, w, h, text, bgColor, glowColor) {
    ctx.save();
    const ch = 8;
    // 背景
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

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 文字
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(h * 0.36)}px "Microsoft YaHei", Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();
  }

  _calculateRewards() {
    const cfg = window.GameConfig?.stages?.rewards || {};
    const vipMult = this.state.get('vipActive') ? (window.GameConfig?.vip?.stageRewardMultiplier || 1.2) : 1;
    // 优先使用指数公式 baseCoins * coinsGrow^(stage-1)，fallback 到线性公式
    let coinsBase;
    if (cfg.coinsGrow && cfg.coinsGrow > 1) {
      coinsBase = (cfg.baseCoins || 200) * Math.pow(cfg.coinsGrow, this.stageLevel - 1);
    } else {
      coinsBase = (cfg.baseCoins || 50) + this.stageLevel * (cfg.coinsPerStage || 15);
    }
    return {
      coins: Math.floor(coinsBase * vipMult),
      gems: this.stageLevel % (cfg.gemPerStages || 5) === 0 ? (cfg.gemAmount || 1) : 0,
    };
  }

  // ============================================================
  //  无人机轰炸系统
  //  装备无人机后, 关卡模式每关一次, 距离模式每1000m一次
  //  无人机从屏幕底部出现, 快速飞向上方, 沿途投弹轰炸敌方
  // ============================================================

  /** 触发一次无人机轰炸 */
  _spawnDrone() {
    // SR-71黑鸟尺寸
    var dW = 220, dH = 320;
    this.activeDrone = {
      x: this.W / 2,
      y: this.H + dH * 0.6,   // 从屏幕底部之外开始
      width: dW,
      height: dH,
      speed: 18,                // 向上飞行速度（每帧像素）
      bombTimer: 200,           // 投弹计时（毫秒）
      bombInterval: 260,        // 每 260ms 投1颗
      age: 0,                   // 用于动画
      bombsLeft: 8,             // 总共投8颗
    };
    // 提示
    this._addFloatingText(this.W / 2, this.H * 0.4, '▲ 无人机支援已就位', '#00E5FF');
  }

  /** 更新无人机系统（每帧调用） */
  _updateDrone(dt) {
    if (!this.droneEquipped) return;
    var ms = dt * 1000;

    // 触发判断
    if (!this.activeDrone) {
      var shouldTrigger = false;
      if (this.isEndless) {
        // 距离模式：每1000m触发一次
        var curBucket = Math.floor(this.distance / 1000);
        var lastBucket = Math.floor(this.droneLastTriggerDist / 1000);
        if (curBucket > lastBucket && this.distance > 200) {
          shouldTrigger = true;
          this.droneLastTriggerDist = this.distance;
        }
      } else {
        // 关卡模式：每关只一次
        if (!this.droneUsedThisStage && this.bossPhase === 'none') {
          this.droneTriggerTimer -= ms;
          if (this.droneTriggerTimer <= 0) {
            shouldTrigger = true;
            this.droneUsedThisStage = true;
          }
        }
      }
      if (shouldTrigger) this._spawnDrone();
    }

    // 无人机飞行 + 投弹
    if (this.activeDrone) {
      var d = this.activeDrone;
      d.age += dt;
      d.y -= d.speed;

      // 投弹（飞行过程中不断投放）
      if (d.bombsLeft > 0 && d.y > -d.height && d.y < this.H + 50) {
        d.bombTimer -= ms;
        if (d.bombTimer <= 0) {
          this._dropBomb(d);
          d.bombTimer = d.bombInterval;
          d.bombsLeft--;
        }
      }

      // 飞出屏幕顶部，移除
      if (d.y < -d.height - 50) {
        this.activeDrone = null;
      }
    }

    // 更新炸弹（沿 vx/vy 飞向目标 + 旋转）
    for (var i = this.droneBombs.length - 1; i >= 0; i--) {
      var bomb = this.droneBombs[i];
      bomb.age += dt;
      bomb.x += bomb.vx;
      bomb.y += bomb.vy;
      bomb.rot += bomb.rotSpeed * dt;

      // 到达目标位置（用age到达flightTime判定，更稳定）
      if (bomb.age >= bomb.flightTime) {
        this._explodeBomb(bomb);
        this.droneBombs.splice(i, 1);
      }
    }

    // 更新爆炸冲击波
    for (var j = this.droneBlasts.length - 1; j >= 0; j--) {
      var blast = this.droneBlasts[j];
      blast.age += dt;
      blast.radius += blast.expandSpeed * dt;
      if (blast.age >= blast.life) {
        this.droneBlasts.splice(j, 1);
      }
    }
  }

  /** 投掷一颗炸弹 */
  _dropBomb(drone) {
    // 在路面随机位置投放（X横跨3车道, Y覆盖整个屏幕路面）
    var laneIdx = Math.floor(Math.random() * 3);
    var targetX = this.roadX + this.laneWidth * (laneIdx + 0.5);
    var targetX2 = targetX + (Math.random() - 0.5) * this.laneWidth * 0.6;
    // Y范围: 整个赛道区域（顶部120到玩家上方60）
    var minY = 120;
    var maxY = this.player.y - 60;
    var targetY = minY + Math.random() * (maxY - minY);

    var startX = drone.x + (Math.random() - 0.5) * drone.width * 0.5;
    var startY = drone.y + drone.height * 0.3;

    // 计算斜向飞行所需时间和速度（约0.6秒到达）
    var flightTime = 0.5 + Math.random() * 0.3;
    var dx = targetX2 - startX;
    var dy = targetY - startY;
    // 60fps, flightTime秒 → 约 60*flightTime 帧
    var totalFrames = flightTime * 60;
    var vx = dx / totalFrames;
    var vy = dy / totalFrames;

    this.droneBombs.push({
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
      targetX: targetX2,
      targetY: targetY,
      rot: 0,
      rotSpeed: 4 + Math.random() * 4,
      age: 0,
      flightTime: flightTime,
    });
    // 投弹音效
    if (window.AudioManager && window.AudioManager.shoot) {
      window.AudioManager.shoot();
    }
  }

  /** 炸弹落地爆炸：对范围内所有敌方造成伤害 */
  _explodeBomb(bomb) {
    var blastR = 130;       // 爆炸半径
    var blastDmg = 80;      // 爆炸伤害（足以秒杀普通车）

    // 创建冲击波视觉效果
    this.droneBlasts.push({
      x: bomb.targetX,
      y: bomb.targetY,
      radius: 10,
      maxRadius: blastR,
      expandSpeed: 600,
      age: 0,
      life: 0.6,
    });

    // 对范围内所有普通敌车造成伤害
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      var dx = e.x - bomb.targetX;
      var dy = e.y - bomb.targetY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= blastR) {
        // 距离越近伤害越高
        var dmg = blastDmg * (1 - dist / blastR * 0.5);
        e.hp -= dmg;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          this.kills++;
          if (this.isEndless && e.maxHp) {
            this.earnedCoins += Math.floor(e.maxHp * 0.5);
          }
          this._addEffect(e.x, e.y, 'enemyDeath', 0.6);
        }
      }
    }

    // Boss也吃伤害（但减半）
    if (this.bossEnemy && this.bossEnemy.hp > 0) {
      var bdx = this.bossEnemy.x - bomb.targetX;
      var bdy = this.bossEnemy.y - bomb.targetY;
      var bdist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bdist <= blastR + 50) {
        this.bossEnemy.hp -= blastDmg * 0.5;
      }
    }

    // 冲击波音效（爆炸）
    if (window.AudioManager && window.AudioManager.explosion) {
      window.AudioManager.explosion();
    }

    // 爆炸时的飞溅火星（用现有特效系统的 hitSpark 类型）
    for (var sp = 0; sp < 12; sp++) {
      var ang = (Math.PI * 2 * sp / 12) + Math.random() * 0.3;
      var dr = 30 + Math.random() * 40;
      this._addEffect(
        bomb.targetX + Math.cos(ang) * dr,
        bomb.targetY + Math.sin(ang) * dr,
        'hitSpark',
        0.4 + Math.random() * 0.3
      );
    }
  }

  /** 渲染无人机本体（SR-71黑鸟） */
  _renderDroneShip(ctx, d) {
    ctx.save();
    ctx.translate(d.x, d.y);

    // 阴影（投射在地面）
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(8, d.height * 0.4, d.width * 0.35, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 引擎尾焰（细长条火箭推进风格，朝下因为飞机从下往上飞）
    var flameLen = 110 + Math.sin(d.age * 30) * 25;
    var flameW = 7;  // 细长条，单个火焰只有7px宽
    for (var f = 0; f < 2; f++) {
      var fx = (f === 0 ? -1 : 1) * d.width * 0.13;
      // 火焰起点（紧贴机身底部）
      var fStartY = d.height * 0.42;

      ctx.save();
      // 第1层：外层光晕（橙红色大范围发光）
      ctx.shadowColor = '#FF3500';
      ctx.shadowBlur = 22;
      var outerGrad = ctx.createLinearGradient(fx, fStartY, fx, fStartY + flameLen);
      outerGrad.addColorStop(0, 'rgba(255,200,80,0.9)');
      outerGrad.addColorStop(0.4, 'rgba(255,107,53,0.7)');
      outerGrad.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.moveTo(fx - flameW, fStartY);
      ctx.lineTo(fx + flameW, fStartY);
      ctx.lineTo(fx + flameW * 0.2, fStartY + flameLen);
      ctx.lineTo(fx - flameW * 0.2, fStartY + flameLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 第2层：内核白热（细长条）
      ctx.save();
      ctx.shadowColor = '#FFEB3B';
      ctx.shadowBlur = 12;
      var innerLen = flameLen * 0.7;
      var innerW = flameW * 0.45;
      var innerGrad = ctx.createLinearGradient(fx, fStartY, fx, fStartY + innerLen);
      innerGrad.addColorStop(0, '#FFFFFF');
      innerGrad.addColorStop(0.5, '#FFEB3B');
      innerGrad.addColorStop(1, 'rgba(255,180,50,0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.moveTo(fx - innerW, fStartY);
      ctx.lineTo(fx + innerW, fStartY);
      ctx.lineTo(fx + innerW * 0.15, fStartY + innerLen);
      ctx.lineTo(fx - innerW * 0.15, fStartY + innerLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 飞机本体（用立绘图，如果加载好的话）
    var craftScene = this.engine && this.engine.scenes && this.engine.scenes.crafting;
    var droneImg = craftScene && craftScene._droneImg;
    if (droneImg && droneImg.complete && droneImg.naturalWidth > 0) {
      // 旋转180度（图片朝上，但飞行方向是从下到上，飞机头朝上）
      ctx.drawImage(droneImg, -d.width / 2, -d.height / 2, d.width, d.height);
    } else {
      // 程序绘制 fallback
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath();
      ctx.moveTo(0, -d.height / 2);
      ctx.lineTo(d.width / 2, d.height / 2);
      ctx.lineTo(0, d.height / 3);
      ctx.lineTo(-d.width / 2, d.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 顶部"已锁定"光圈
    var glowR = d.width * 0.15 + Math.sin(d.age * 8) * 4;
    ctx.save();
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(0,229,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -d.height * 0.3, glowR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  /** 渲染下落炸弹（黄黑警示色 + 旋转 + 拖尾） */
  _renderDroneBomb(ctx, bomb) {
    ctx.save();

    // 拖尾火星粒子（5个沿飞行轨迹递减点）
    for (var t = 1; t <= 5; t++) {
      var trailX = bomb.x - bomb.vx * t * 0.5;
      var trailY = bomb.y - bomb.vy * t * 0.5;
      var trailA = (1 - t / 6) * 0.6;
      ctx.fillStyle = 'rgba(255,200,80,' + trailA + ')';
      ctx.beginPath();
      ctx.arc(trailX + (Math.random() - 0.5) * 4, trailY + (Math.random() - 0.5) * 4, 4 - t * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rot);

    // 炸弹本体：黄黑警示色椭圆
    var bw = 18, bh = 28;
    // 外发光
    ctx.shadowColor = '#FFD54F';
    ctx.shadowBlur = 18;

    // 主体黄底
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // 黑色危险条纹（3条横向）
    ctx.fillStyle = '#1A1A1A';
    for (var s = -1; s <= 1; s++) {
      ctx.fillRect(-bw, s * 8 - 3, bw * 2, 5);
    }

    // 顶部尾翼（X形）
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.5, -bh - 4);
    ctx.lineTo(bw * 0.5, -bh - 4);
    ctx.moveTo(0, -bh - 8);
    ctx.lineTo(0, -bh + 2);
    ctx.stroke();

    // 圆形高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-bw * 0.3, -bh * 0.3, bw * 0.3, bh * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** 渲染地面爆炸冲击波 */
  _renderDroneBlast(ctx, blast) {
    var t = blast.age / blast.life;
    var alpha = 1 - t;

    ctx.save();
    ctx.translate(blast.x, blast.y);

    // 外圈光晕
    ctx.shadowColor = '#FF6B35';
    ctx.shadowBlur = 40;
    var outerGrad = ctx.createRadialGradient(0, 0, blast.radius * 0.5, 0, 0, blast.radius);
    outerGrad.addColorStop(0, 'rgba(255,200,80,' + (alpha * 0.7) + ')');
    outerGrad.addColorStop(0.5, 'rgba(255,107,53,' + (alpha * 0.5) + ')');
    outerGrad.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, blast.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 冲击波环（白色细线）
    ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.9) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, blast.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 第二层冲击波（橙色）
    ctx.strokeStyle = 'rgba(255,140,0,' + (alpha * 0.7) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, blast.radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // 中心亮核
    if (t < 0.4) {
      ctx.fillStyle = 'rgba(255,255,255,' + ((1 - t / 0.4) * 0.9) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, blast.radius * 0.3 * (1 - t), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.BattleScene = BattleScene;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BattleScene;
}
