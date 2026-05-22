/**
 * ============================================
 *  合成飞车射击 - 全局数值配置文件
 *  【零代码编辑】修改此文件即可调整所有游戏数值
 *  无需修改任何代码逻辑
 * ============================================
 */

const GameConfig = {
  // ==================== 通用设置 ====================
  general: {
    gameName: "合成飞车射击",
    version: "1.0.0",
    fps: 60,
    canvasWidth: 720,
    canvasHeight: 1280,
    language: "zh-CN",
  },

  // ==================== 车辆合成系统 ====================
  crafting: {
    maxSlots: 12,             // 合成槽位数
    maxLevel: 52,             // 车辆最高等级
    mergeRule: 2,             // 合成所需同等级数量 (2辆同级=1辆高级)
    autoCraftInterval: 1000,  // 自动合成检测间隔(ms)

    // 每等级车辆每秒金币收益 = baseIncome * level ^ incomeExponent
    incomeBase: 1,
    incomeExponent: 1.15,

    // 购买1级车辆价格公式: buyBasePrice * buyMultiplier ^ buyCount
    buyBasePrice: 10,
    buyMultiplier: 1.08,
    buyMaxCount: 9999,        // 最大购买次数
    buyLevelOffset: 4,        // 购买车辆等级 = 最高合成等级 - 此值 (0=与最高同级, 1=低1级)

    // ====== 52级车辆数值表（数值策划重新平衡 v2）======
    // 设计目标：HP随等级线性成长（让玩家明显感知车辆变强）
    //          ATK + 弹幕数 复合成长，DPS 平滑递增
    //          收益指数曲线匹配下一辆车解锁成本（1/3经济循环）
    // 优先从此表取值，fallback到下方公式
    vehicleTable: [
      // [level, hp, atk, bullets, earnings, unlockLevel, autoSpawnLevel, buyPrice, diamondPrice]
      // LV1-5：新手期，玩家承伤 ~6-8次（HP 80→200），DPS 26→55
      [ 1,   80,   8, 1,    20,  1,  1,  100,       1],
      [ 2,  100,  10, 1,    40,  4,  1,  1500,      2],
      [ 3,  120,   8, 2,    90,  5,  1,  4725,      2],
      [ 4,  150,  10, 2,   200,  6,  1,  14883,     3],
      [ 5,  180,  11, 2,   430,  7,  1,  46883,     3],
      // LV6-10：成长期，承伤 ~8-10次，DPS 73→150
      [ 6,  220,  11, 2,   920,  8,  1,  147684,    4],
      [ 7,  260,  10, 3,  1980,  9,  2,  465204,    4],
      [ 8,  300,  12, 3,  4250, 10,  2,  1465394,   5],
      [ 9,  340,  10, 4,  9130, 11,  3,  4615992,   5],
      [10,  380,  12, 4, 19630, 12,  3,  14540377,  6],
      // LV11-15：稳定期，承伤 ~10-12次，DPS 187→320
      [11,  420,  14, 4, 42210, 13,  4,  45802189,  6],
      [12,  470,  12, 5, 90750, 14,  4,  144276898, 7],
      [13,  520,  13, 5,195100, 15,  5,  454472229, 8],
      [14,  570,  14, 5,419500, 16,  5,  1431587522,10],
      [15,  620,  16, 5,901900, 17,  6,  4509500696,12],
      // LV16-20：进阶期，承伤 ~12-14次，DPS 380→680
      [16,  680,  17, 5,1940000,18,  7,  14204927193,15],
      [17,  740,  15, 6,4170000,19,  8,  44745520659,20],
      [18,  810,  17, 6,8960000,20,  8,  140948000000,25],
      [19,  880,  19, 6,19270000,21, 9,  443987000000,30],
      [20,  950,  17, 7,41430000,22, 9,  1398560000000,35],
      // LV21-25：高阶期
      [21, 1020,  18, 7,89080000,23,10,  4405470000000,45],
      [22, 1100,  21, 7,191530000,24,11, 13877200000000,60],
      [23, 1180,  19, 8,411790000,25,11, 43713200000000,80],
      [24, 1260,  21, 8,885350000,26,13, 137697000000000,100],
      [25, 1340,  23, 8,1904000000,27,13,433745000000000,130],
      // LV26-30
      [26, 1430,  21, 9,4093000000,28,14, 1366300000000000,160],
      [27, 1520,  23, 9,8799000000,29,14, 4303830000000000,200],
      [28, 1610,  25, 9,18918000000,30,15,13557100000000000,250],
      [29, 1710,  23,10,40673000000,31,15,42704800000000000,300],
      [30, 1800,  25,10,87447000000,32,16,134520000000000000,400],
      // LV31-40
      [31, 1900,  27,10,188000000000,33,16, 423738000000000000,500],
      [32, 2000,  25,11,404000000000,34,17, 1334770000000000000,600],
      [33, 2110,  27,11,869000000000,35,17, 4204540000000000000,700],
      [34, 2220,  29,11,1869000000000,36,18,13244300000000000000,800],
      [35, 2330,  27,12,4017000000000,37,18,41719500000000000000,900],
      [36, 2440,  29,12,8637000000000,38,19,131417000000000000000,1000],
      [37, 2550,  31,12,18570000000000,39,19,413962000000000000000,1100],
      [38, 2670,  29,13,39926000000000,40,20,1.30398e+21,1200],
      [39, 2790,  31,13,85840000000000,41,20,4.10754e+21,1300],
      [40, 2910,  33,13,185000000000000,42,21,1.29387e+22,1400],
      // LV41-50
      [41, 3030,  31,14,397000000000000,43,21,4.07571e+22,1500],
      [42, 3160,  33,14,853000000000000,44,22,1.28385e+23,1600],
      [43, 3290,  35,14,1832770000000000,45,22,4.04412e+23,1700],
      [44, 3420,  33,15,3937910000000000,46,23,1.2739e+24,1800],
      [45, 3550,  35,15,8461060000000000,47,23,4.01278e+24,1900],
      [46, 3690,  37,15,18179500000000000,48,24,1.26402e+25,2000],
      [47, 3830,  35,16,39060800000000000,49,24,3.98168e+25,2100],
      [48, 3970,  37,16,83926700000000000,50,25,1.25423e+26,2200],
      [49, 4110,  39,16,180326000000000000,51,25,3.95082e+26,2300],
      [50, 4250,  41,16,387451000000000000,52,26,1.24451e+27,2400],
      [51, 4400,  39,17,832484000000000000,52,26,3.9202e+27,2500],
      [52, 4550,  41,17,1788690000000000000,52,27,1.23486e+28,2600],
    ],
    // vehicleTable 列索引常量
    _vt: { level:0, hp:1, atk:2, bullets:3, earnings:4, unlockLevel:5, autoSpawnLevel:6, buyPrice:7, diamondPrice:8 },

    // 车辆属性公式（fallback，当vehicleTable无数据时使用）
    vehicleStats: {
      atkBase: 5,
      atkExponent: 1.2,
      hpBase: 100,
      hpExponent: 1.18,
      bulletBase: 1,
      bulletPerLevels: 10,
      bulletMax: 12,
    },
  },

  // ==================== 关卡系统 ====================
  stages: {
    totalStages: 200,
    dailyChallengeLimit: 10,  // 每日闯关次数
    dailyChallengeResetHour: 0, // 重置时间(小时)

    // 每关目标距离 = baseDistance + stage * distancePerStage
    baseDistance: 500,
    distancePerStage: 50,

    // 敌方生成间隔(ms) — 来源：飞车数据与部分公式.xlsx
    // 公式: max(minInterval, maxInterval * (1 - 单局米数 * distFactor))
    enemySpawnMinInterval: 500,    // DefaultMinSpawnEnemyInterval = 0.5s
    enemySpawnMaxInterval: 1000,   // DefaultMaxSpawnEnemyInterval = 1s
    enemySpawnDistFactor: 0.0005,  // EnemySpawnIntervalDistanceFactor = 0.0005
    // 旧公式fallback（距离因子公式计算时不用这两个）
    enemySpawnBaseInterval: 1500,
    enemySpawnIntervalDecrease: 5,

    // 障碍物生成间隔(ms)
    obstacleSpawnBaseInterval: 3000,
    obstacleSpawnIntervalDecrease: 8,
    obstacleSpawnMinInterval: 800,

    // ===== 同屏敌车数量分段表（数值策划重新平衡）=====
    // 设计：随时间推进，同屏敌车数量小幅增加，营造压迫感
    enemyCountTable: [
      { maxTime: 10,       min: 1, max: 2 },  // 0-10s 热身
      { maxTime: 25,       min: 2, max: 3 },  // 10-25s 入场
      { maxTime: 45,       min: 2, max: 4 },  // 25-45s 高峰
      { maxTime: 70,       min: 3, max: 4 },  // 45-70s 紧张
      { maxTime: Infinity, min: 3, max: 5 },  // 70s+ 极限
    ],

    // 敌方属性公式（数值策划重新平衡 v2）
    enemy: {
      // ===== 敌人基础HP表 =====
      // 设计：normal 30HP（LV1车1次秒杀），fast 25HP（脆但快），tank 60HP（需2-3发）
      // boss 用 boss.scaling.baseHp 取值（避免冲突），此处仅作 fallback
      baseHp: { normal: 30, fast: 25, tank: 60, boss: 500 },

      // HP成长公式: 类型基础HP * growFactor^(关卡-1) + growFactor1 * ceil(关卡/growDan)
      // 设计：1.06 增长率，每10关HP×1.79倍，匹配车辆DPS成长（约1.8倍/10关）
      hpGrowFactor: 1.06,
      hpGrowFactor1: 0,
      hpGrowDan: 2,

      // 攻击力(碰撞伤害) = base + stage * atkScale
      // 设计：第1关5伤害（80HP车被撞16次才死），50关30伤害
      atkBase: 5,
      atkScale: 0.5,
      atkFactor: 1,

      // 移动速度 = base + stage * spdScale
      speedBase: 2,
      speedScale: 0.025,
      speedMax: 6,
    },

    // 障碍物属性（数值策划重新平衡 v2）
    obstacle: {
      // 血量 = base + stage * hpScale
      hpBase: 30,
      hpScale: 1,
      // 碰撞伤害（降低！原15让LV1车2次必死，现在改为8 → LV1车10次才死）
      collisionDamage: 8,
    },

    // ===== Boss关底系统（数值策划重新平衡 v2）=====
    boss: {
      enabled: true,
      warningDuration: 2000,
      spawnY: -200,
      targetY: 200,
      floatAmplitude: 15,
      floatSpeed: 1.5,
      enterSpeed: 3,
      stopRegularSpawns: true,
      stopObstacleSpawns: true,
      defeatExplosionCount: 5,

      // ===== Boss难度递增公式（6维度随关卡成长）=====
      // 设计原则（玩家用对应等级车辆时）：
      //   Stage 1  (LV1 8DPS×1=27DPS): Boss HP=500 → 击杀≈19s ✅
      //   Stage 5  (LV5 22DPS):        Boss HP=684 → 击杀≈31s（鼓励合成升级）
      //   Stage 20 (LV20 119DPS):      Boss HP=2159 → 击杀≈18s ✅
      //   Stage 50 (LV50 219DPS):      Boss HP=24803 → 玩家应已升级到LV60+ 才能继续
      // 注：LV2车 atk=10 bullets=1 DPS=33，LV5 atk=11 bullets=2 DPS=73
      scaling: {
        // --- HP公式: baseHp * hpGrow^(关卡-1) ---
        // 第1关Boss HP=400（LV1车 27DPS ≈ 15s击杀），略调低
        baseHp: 400,
        hpGrow: 1.07,             // 7%递增（原8%太陡）
        // Stage 1: 400 | Stage 10: 736 | Stage 20: 1448 | Stage 50: 11797

        // --- 子弹伤害: bulletBaseDmg + 关卡 × bulletDmgScale ---
        // 第1关5伤害（LV1车80HP抗16次），50关20伤害（LV20车950HP抗47次）
        bulletBaseDmg: 5,
        bulletDmgScale: 0.3,
        // Stage 1: 5 | Stage 10: 8 | Stage 20: 11 | Stage 50: 20

        // --- 子弹数量 ---
        bulletBaseCount: 2,
        bulletCountInterval: 5,
        bulletMaxCount: 9,
        // Stage 1: 2 | Stage 6: 3 | Stage 11: 4 | Stage 21: 6 | Stage 41: 9(封顶)

        // --- 射击间隔(ms) ---
        // 第1关1500ms（让玩家有反应时间），后期最短500ms
        shootBaseInterval: 1500,
        shootIntervalDec: 20,
        shootMinInterval: 500,
        // Stage 1: 1500 | Stage 20: 1120 | Stage 50: 520

        // --- 横移速度 ---
        moveBaseSpeed: 1.0,
        moveSpeedScale: 0.015,
        moveBaseAmp: 120,
        moveAmpScale: 1.2,
      },

      // ===== Boss变体（每个变体有独特的外观和弹幕模式）=====
      // 进入Boss战时从此数组中随机选择一个variant
      variants: [
        {
          key: 'default',
          name: '碎骨者',
          // 默认敌车boss sprite (enemy_boss.png)
          sprite: null,
          // 弹幕模式：扇形展开（原有逻辑）
          pattern: 'fan',
          // 子弹颜色（紫红）
          bulletColor: { core: '#FFFFFF', mid: '#FF80FF', outer: '#C040FF' },
          // HP倍率（相对baseHp）
          hpMul: 1.0,
        },
        {
          key: 'purple',
          name: '紫晶刺甲',
          // 紫色刺甲Boss（双枪重型）
          sprite: 'assets/vehicles/boss/boss_purple.png',
          // 弹幕模式：十字螺旋（4方向同时发射，整体缓慢旋转）
          pattern: 'crossSpiral',
          // 子弹颜色（青紫）
          bulletColor: { core: '#FFFFFF', mid: '#80E0FF', outer: '#A040FF' },
          hpMul: 1.15,
          // 专属参数
          spiralRotSpeed: 1.6,  // 螺旋旋转速度
          spiralArms: 4,         // 螺旋臂数（十字=4）
        },
        {
          key: 'dark',
          name: '暗影暴风',
          // 黑暗暴风Boss（红光暗装）
          sprite: 'assets/vehicles/boss/boss_dark.png',
          // 弹幕模式：环形爆裂（360°环爆，每3次射击后插入一次大圈爆裂）
          pattern: 'ringBurst',
          // 子弹颜色（暗红）
          bulletColor: { core: '#FFFFFF', mid: '#FF8080', outer: '#D02020' },
          hpMul: 1.2,
          // 专属参数
          ringBurstInterval: 3,  // 每N次普通射击后1次大环爆
          ringBurstCount: 16,    // 大环爆子弹数
        },
        {
          key: 'ok',
          name: '雷电黑帮',
          // OK人脸蓝跑车（第一关必出）
          sprite: 'assets/vehicles/boss/boss_ok.png',
          // 弹幕模式：OK字形弹幕（拼出"OK"字样的子弹组合）
          pattern: 'okLetters',
          // 子弹颜色（金色霓虹）
          bulletColor: { core: '#FFFFFF', mid: '#FFEB3B', outer: '#FF9800' },
          hpMul: 0.9,  // 第一关boss略弱，新手友好
          // 专属参数
          okSpread: 240,    // OK字宽度
          okHeight: 110,    // OK字高度
          okBulletSpeed: 5, // OK子弹下落速度
        },
      ],
    },

    // 通关奖励（数值策划重新平衡 v2）
    rewards: {
      // 第1关200金币（≈10次LV1车自动收益），后续随关卡指数增长
      // 公式: baseCoins * coinsGrow^(stage-1)
      baseCoins: 200,
      coinsGrow: 1.18,         // 每关18%递增（匹配车辆收益指数曲线）
      // 兼容旧字段（线性fallback）
      coinsPerStage: 50,
      // 钻石奖励
      gemPerStages: 5,
      gemAmount: 1,
    },

    // 失败保底奖励
    failRewards: {
      coinsRatio: 0.2,
      gems: 0,
    },

    // ===== 距离模式（无尽）=====
    // 无关卡距离限制、无Boss，看最终跑多远，玩家被击杀时结束
    // 金币 = 击杀敌车收益（每击杀获得 Math.floor(enemy.maxHp * 0.5) 金币）
    endless: {
      // 初始滚动速度（比闯关慢一点，拉长体验）
      baseScrollSpeed: 2.5,
      // 滚动速度随时间缓慢增加（每60秒+0.3，有上限）
      scrollSpeedGrowth: 0.3,
      scrollSpeedGrowthInterval: 60,   // 秒
      maxScrollSpeed: 7,
      // 敌方HP成长使用等效关卡 = floor(时间/30) + 1，每30秒等效+1关
      stageGrowthPerSeconds: 30,
      // 金币倍率：最终结算金币 × 此倍率
      coinMultiplier: 1.0,
      // 距离显示单位（1=米, 100=百米等）
      distanceUnit: 1,
    },
  },

  // ==================== 战斗系统 ====================
  battle: {
    // 己方车辆射击间隔(ms)
    shootInterval: 300,
    // 炮弹速度
    bulletSpeed: 12,
    // 炮弹伤害 = 车辆攻击力 * bulletDamageMultiplier
    bulletDamageMultiplier: 1.0,
    // 碰撞伤害(玩家撞敌) = 敌方攻击力 * collisionMultiplier
    collisionMultiplier: 1.0,
    // 玩家移动速度
    playerMoveSpeed: 8,
    // 无敌时间(ms) - 被撞后短暂无敌
    invincibleDuration: 1000,

    // ===== 弹幕模式配置（按车辆等级区分）=====
    // LV.1~LV.10 各有独特弹幕，LV.11+ 复用 LV.10
    // 弹数仍由 vehicleTable 的 bullets 列决定，此处控制弹幕的排列方式和运动行为
    bulletPatterns: {
      1: {
        name: '直射',
        angleStep: 0,          // 单发直射，无扇形
        speed: 12,
        behavior: 'straight',
        color: 'cyan',
      },
      2: {
        name: '双轨',
        angleStep: 0.06,       // 微微分开的双轨
        speed: 13,
        behavior: 'straight',
        color: 'cyan',
      },
      3: {
        name: '三叉',
        angleStep: 0.12,       // 经典三叉窄扇
        speed: 12,
        behavior: 'straight',
        color: 'cyan',
      },
      4: {
        name: '波动',
        angleStep: 0.1,
        speed: 11,
        behavior: 'wave',
        waveAmp: 2.5,          // 波动振幅(像素)
        waveFreq: 6,           // 波动频率(次/秒)
        color: 'green',
      },
      5: {
        name: '宽扇',
        angleStep: 0.18,       // 更宽的扇形覆盖
        speed: 12,
        behavior: 'straight',
        color: 'purple',
      },
      6: {
        name: '螺旋',
        angleStep: 0.06,
        speed: 10,
        behavior: 'spiral',
        spiralRadius: 28,      // 螺旋半径(像素)
        spiralSpeed: 5,        // 螺旋角速度(弧度/秒)
        color: 'purple',
      },
      7: {
        name: '追踪',
        angleStep: 0.15,
        speed: 10,
        behavior: 'homing',
        homingStrength: 0.04,  // 追踪力度(每帧偏转弧度)
        color: 'gold',
      },
      8: {
        name: '散射',
        angleStep: 0.25,       // 宽角度散开
        speed: 14,
        behavior: 'converge',
        convergeRate: 0.018,   // 收束速率(每帧vx衰减比例)
        color: 'red',
      },
      9: {
        name: '交叉',
        angleStep: 0.28,       // 交叉火力宽角度
        speed: 12,
        behavior: 'wave',
        waveAmp: 3.5,          // 大幅波动实现交叉效果
        waveFreq: 3,           // 较低频率让交叉更明显
        color: 'magenta',
      },
      10: {
        name: '天罚',
        angleStep: 0.16,       // 扇形+追踪混合
        speed: 12,
        behavior: 'mixed',     // 中间直射 + 两侧追踪
        homingStrength: 0.025,
        color: 'divine',
      },
    },

    // BUFF系统（数值优化v2: 延长持续时间提升体验, 收益清晰）
    buffs: {
      // 火力增强: 伤害倍率 ×2, 持续 7s（原5s）
      fireboost: { multiplier: 2.0, duration: 7000, spawnChance: 0.55 },
      // 护盾: 减伤50%, 持续 8s（原6s, 减少被秒杀挫败感）
      shield: { damageReduction: 0.5, duration: 8000, spawnChance: 0.5 },
      // 加速: ×1.5, 持续 6s（原4s, 加速感太短）
      speed: { multiplier: 1.5, duration: 6000, spawnChance: 0.5 },
      // 回血: 恢复 35%（原30%, 关键回血更慷慨）
      heal: { hpRestoreRatio: 0.35, spawnChance: 0.45 },
    },

    // BUFF道具生成间隔(ms) - 略微缩短让buff出现更频繁
    buffSpawnInterval: 3500,
  },

  // ==================== 经济系统 ====================
  economy: {
    // 挂机金币上限(小时)
    idleMaxHours: 4,
    // 钻石兑换比例
    gemToCoinsRate: 100,
  },

  // ==================== 商店系统 ====================
  shop: {
    // 车辆商店：展示 highestLevel+1 ~ highestLevel+5 的5辆车
    // 价格算法：基于vehicleTable.buyPrice × 价格系数
    priceMultiplier: 1.5,       // 商店价格 = vehicleTable.buyPrice × 1.5（不低于首页购车价）
    items: [
      { id: "coin_pack_s", name: "金币小包", cost: 10, costType: "gem", reward: 1000, rewardType: "coin" },
      { id: "coin_pack_m", name: "金币中包", cost: 50, costType: "gem", reward: 6000, rewardType: "coin" },
      { id: "coin_pack_l", name: "金币大包", cost: 200, costType: "gem", reward: 30000, rewardType: "coin" },
      { id: "gem_pack_s", name: "钻石小包", cost: 6, costType: "usd", reward: 60, rewardType: "gem" },
      { id: "gem_pack_m", name: "钻石中包", cost: 30, costType: "usd", reward: 330, rewardType: "gem" },
      { id: "vip_card", name: "VIP月卡", cost: 5, costType: "usd", reward: 30, rewardType: "gem_daily", duration: 30 },
    ],
  },

  // ==================== VIP系统 ====================
  vip: {
    dailyGemBonus: 30,
    idleBonusMultiplier: 1.5,
    stageRewardMultiplier: 1.2,
  },

  // ==================== 速度挑战赛 ====================
  race: {
    entryCost: 1,            // 每次消耗体力
    duration: 30,            // 持续时间(秒)
    targetDistance: 3000,     // 目标距离
    rewardMultiplier: 2.0,   // 奖励倍率
  },

  // ==================== 无人机系统 ====================
  drone: {
    unlockLevel: 10,          // 解锁所需车辆等级
    damageMultiplier: 0.3,    // 无人机伤害 = 车辆攻击力 * 此系数
    fireRate: 800,            // 射击间隔(ms)
  },

  // ==================== 幸运系统 ====================
  lucky: {
    freeSpinInterval: 3600000, // 免费抽奖间隔(ms) = 1小时
    costPerSpin: 10,           // 每次钻石消耗
    prizes: [
      { id: "coins_100", name: "100金币", weight: 30, reward: 100, rewardType: "coin" },
      { id: "coins_500", name: "500金币", weight: 20, reward: 500, rewardType: "coin" },
      { id: "gem_1", name: "1钻石", weight: 25, reward: 1, rewardType: "gem" },
      { id: "gem_5", name: "5钻石", weight: 15, reward: 5, rewardType: "gem" },
      { id: "car_lv1", name: "1级车辆", weight: 8, reward: 1, rewardType: "car" },
      { id: "gem_20", name: "20钻石", weight: 2, reward: 20, rewardType: "gem" },
    ],
  },
};

// 导出配置
if (typeof window !== 'undefined') {
  window.GameConfig = GameConfig;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameConfig;
}
