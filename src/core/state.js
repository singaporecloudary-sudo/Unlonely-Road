/**
 * 合成飞车射击 - 游戏状态管理
 * 管理所有运行时数据，所有数值变更通过此模块
 */

class GameState {
  constructor() {
    this._state = this._getDefaultState();
    this._listeners = {};
    // 自动为新用户/老存档初始化随机名字
    if (!this._state.playerName) {
      this.randomizeName(true);
    }
  }

  _getDefaultState() {
    var slots = new Array(12).fill(null);
    // 首次赠送3辆LV1车辆（前3个槽位）
    for (var i = 0; i < 3; i++) {
      slots[i] = { level: 1, uid: 'init_' + i };
    }

    return {
      // 经济
      coins: 100,
      gems: 100,

      // 合成系统
      slots: slots,                      // null或{level:N, uid:xxx}
      selectedCarLevel: 1,               // 当前局内使用车辆等级
      buyCount: 0,                       // 已购买1级车辆次数
      autoCraft: false,                  // 自动合成开关

      // 关卡进度
      currentStage: 1,
      remainingChallenges: 10,
      lastChallengeResetTime: Date.now(),

      // 游戏模式 'stage'=闯关(默认) | 'endless'=距离模式
      gameMode: 'stage',

      // 无人机装备状态（持久化，battle场景会读取）
      droneEquipped: false,

      // 挂机收益
      lastOnlineTime: Date.now(),
      accumulatedIdleCoins: 0,

      // 功能解锁
      droneUnlocked: false,

      // VIP
      vipActive: false,
      vipExpiry: 0,

      // 幸运转盘
      lastFreeSpinTime: 0,

      // 统计
      totalKills: 0,
      totalDistance: 0,
      highestStage: 1,

      // 玩家个人资料及排行榜最高记录
      playerName: '',            // 玩家昵称
      playerAvatar: 0,           // 玩家头像 ID (0~5)
      maxStageReached: 0,        // 通关最高关卡数，初始为 0 关
      maxStageTime: Date.now(),  // 达成关卡记录时间
      maxEndlessDist: 0,         // 无尽历史最高距离 (m)
      maxEndlessTime: Date.now() // 达成无尽记录时间
    };
  }

  // ========== 监听器 ==========
  on(key, callback) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(callback);
  }

  _notify(key, oldValue, newValue) {
    if (this._listeners[key]) {
      this._listeners[key].forEach(cb => cb(oldValue, newValue));
    }
    if (this._listeners['*']) {
      this._listeners['*'].forEach(cb => cb(key, oldValue, newValue));
    }
    // 自动存盘（每次 slots/coins/gems 等重要数据修改时触发存盘，排除时间高频key）
    if (['slots', 'coins', 'gems', 'currentStage', 'highestStage', 'droneEquipped', 'buyCount', 'unlockedStage'].indexOf(key) !== -1) {
      if (window.gameEngine && window.gameEngine.saveManager) {
        window.gameEngine.saveManager.save(this.serialize());
      }
    }
  }

  // ========== 通用获取/设置 ==========
  get(key) {
    return this._state[key];
  }

  set(key, value) {
    const old = this._state[key];
    this._state[key] = value;
    this._notify(key, old, value);
  }

  // ========== 经济系统 ==========
  addCoins(amount) {
    const old = this._state.coins;
    this._state.coins = Math.floor(old + amount);
    this._notify('coins', old, this._state.coins);
  }

  spendCoins(amount) {
    if (this._state.coins < amount) return false;
    const old = this._state.coins;
    this._state.coins = Math.floor(old - amount);
    this._notify('coins', old, this._state.coins);
    return true;
  }

  addGems(amount) {
    const old = this._state.gems;
    this._state.gems = old + amount;
    this._notify('gems', old, this._state.gems);
  }

  spendGems(amount) {
    if (this._state.gems < amount) return false;
    const old = this._state.gems;
    this._state.gems = old - amount;
    this._notify('gems', old, this._state.gems);
    return true;
  }

  // ========== 合成系统 ==========
  getSlot(index) {
    return this._state.slots[index];
  }

  setSlot(index, carData) {
    this._state.slots[index] = carData;
    this._notify('slots', null, this._state.slots);
  }

  // 找到两个同级车辆可合成
  findMergePair() {
    const levelMap = {};
    for (let i = 0; i < this._state.slots.length; i++) {
      const car = this._state.slots[i];
      if (!car) continue;
      if (!levelMap[car.level]) levelMap[car.level] = [];
      levelMap[car.level].push(i);
    }
    for (const level in levelMap) {
      if (levelMap[level].length >= 2) {
        return { level: parseInt(level), slots: levelMap[level].slice(0, 2) };
      }
    }
    return null;
  }

  // 执行合成
  merge(slotA, slotB) {
    const carA = this._state.slots[slotA];
    const carB = this._state.slots[slotB];
    if (!carA || !carB || carA.level !== carB.level) return false;
    if (carA.level >= (window.GameConfig?.crafting?.maxLevel || 52)) return false;

    const newLevel = carA.level + 1;
    this._state.slots[slotA] = { level: newLevel, uid: this._genUID() };
    this._state.slots[slotB] = null;
    // 同步selectedCarLevel为最高等级
    const highest = this.getHighestLevelCar();
    if (newLevel > this._state.selectedCarLevel) {
      this._state.selectedCarLevel = newLevel;
      this._notify('selectedCarLevel', this._state.selectedCarLevel - 1, this._state.selectedCarLevel);
    }
    this._notify('slots', null, this._state.slots);
    this._notify('merge', null, { newLevel, slot: slotA });
    return true;
  }

  // 自动合成
  autoMerge() {
    const pair = this.findMergePair();
    if (pair) {
      return this.merge(pair.slots[0], pair.slots[1]);
    }
    return false;
  }

  // 购买车辆（等级由buyLevelOffset配置决定）
  buyCar() {
    const cfg = window.GameConfig?.crafting || {};
    const basePrice = cfg.buyBasePrice || 10;
    const multiplier = cfg.buyMultiplier || 1.08;
    const price = Math.floor(basePrice * Math.pow(multiplier, this._state.buyCount));

    // 找空槽
    const emptySlot = this._state.slots.findIndex(s => s === null);
    if (emptySlot === -1) return { success: false, reason: 'no_slot' };

    if (!this.spendCoins(price)) return { success: false, reason: 'no_coins' };

    // 购买车辆等级 = max(1, 最高合成等级 - buyLevelOffset)
    const offset = cfg.buyLevelOffset || 0;
    const highestLevel = this.getHighestLevelCar();
    const buyLevel = Math.max(1, highestLevel - offset);

    this._state.slots[emptySlot] = { level: buyLevel, uid: this._genUID() };
    this._state.buyCount++;
    this._notify('slots', null, this._state.slots);
    this._notify('buyCar', null, { slot: emptySlot, level: buyLevel });
    return { success: true, price, slot: emptySlot, level: buyLevel };
  }

  // 获取购买价格
  getBuyPrice() {
    const cfg = window.GameConfig?.crafting || {};
    const basePrice = cfg.buyBasePrice || 10;
    const multiplier = cfg.buyMultiplier || 1.08;
    return Math.floor(basePrice * Math.pow(multiplier, this._state.buyCount));
  }

  // 商店购买指定等级车辆
  buyShopCar(level) {
    // 找空槽
    const emptySlot = this._state.slots.findIndex(s => s === null);
    if (emptySlot === -1) return { success: false, reason: 'no_slot' };

    // 计算商店价格
    const price = this.getShopCarPrice(level);
    if (price === null) return { success: false, reason: 'invalid_level' };

    // 扣金币
    if (!this.spendCoins(price)) return { success: false, reason: 'no_coins' };

    this._state.slots[emptySlot] = { level: level, uid: this._genUID() };
    this._notify('slots', null, this._state.slots);
    this._notify('buyCar', null, { slot: emptySlot, level: level });
    return { success: true, price, slot: emptySlot, level: level };
  }

  // 获取商店中指定等级车辆的价格
  getShopCarPrice(level) {
    const table = window.GameConfig?.crafting?.vehicleTable;
    const vt = window.GameConfig?.crafting?._vt;
    const shopCfg = window.GameConfig?.shop || {};
    const mult = shopCfg.priceMultiplier || 1.5;

    // 从vehicleTable取buyPrice
    if (table && vt) {
      const row = table.find(r => r[0] === level);
      if (row) {
        const tablePrice = row[vt.buyPrice];
        // 商店价格 = vehicleTable.buyPrice × multiplier，但不能低于首页购车价
        const homeBuyPrice = this.getBuyPrice();
        return Math.max(Math.floor(tablePrice * mult), homeBuyPrice);
      }
    }

    // fallback：首页购车价的 level^2 倍
    const homeBuyPrice = this.getBuyPrice();
    return Math.floor(homeBuyPrice * Math.pow(level, 2) * mult);
  }

  // 获取商店可购买的5个等级范围
  getShopCarLevels() {
    const highest = this.getHighestLevelCar();
    const levels = [];
    for (let i = 1; i <= 5; i++) {
      const lv = highest + i;
      if (lv <= 52) levels.push(lv);
    }
    return levels;
  }

  // 计算每秒金币收益（优先从vehicleTable取earnings，fallback到公式）
  getCoinsPerSecond() {
    const table = window.GameConfig?.crafting?.vehicleTable;
    const vt = window.GameConfig?.crafting?._vt;
    let total = 0;
    for (const car of this._state.slots) {
      if (!car) continue;
      if (table && vt) {
        const row = table.find(r => r[0] === car.level);
        if (row) {
          total += row[vt.earnings];
          continue;
        }
      }
      // fallback
      const cfg = window.GameConfig?.crafting || {};
      const base = cfg.incomeBase || 1;
      const exp = cfg.incomeExponent || 1.15;
      total += base * Math.pow(car.level, exp);
    }
    return Math.floor(total * 10) / 10;
  }

  // 获取最高等级车辆
  getHighestLevelCar() {
    let max = 0;
    for (const car of this._state.slots) {
      if (car && car.level > max) max = car.level;
    }
    return max;
  }

  // 获取当前车辆属性（优先从vehicleTable取值，fallback到公式）
  getSelectedCarStats() {
    const level = this._state.selectedCarLevel;
    const table = window.GameConfig?.crafting?.vehicleTable;
    const idx = table ? table.findIndex(row => row[0] === level) : -1;

    if (idx >= 0) {
      const vt = window.GameConfig.crafting._vt;
      return {
        level,
        hp: table[idx][vt.hp],
        atk: table[idx][vt.atk],
        bullets: table[idx][vt.bullets],
        earnings: table[idx][vt.earnings],
        unlockLevel: table[idx][vt.unlockLevel],
        autoSpawnLevel: table[idx][vt.autoSpawnLevel],
        buyPrice: table[idx][vt.buyPrice],
        diamondPrice: table[idx][vt.diamondPrice],
      };
    }

    // fallback到公式
    const cfg = window.GameConfig?.crafting?.vehicleStats || {};
    return {
      level,
      atk: Math.floor((cfg.atkBase || 5) * Math.pow(level, cfg.atkExponent || 1.2)),
      hp: Math.floor((cfg.hpBase || 100) * Math.pow(level, cfg.hpExponent || 1.18)),
      bullets: Math.min(
        (cfg.bulletMax || 12),
        (cfg.bulletBase || 1) + Math.floor(level / (cfg.bulletPerLevels || 10))
      ),
    };
  }

  // ========== 关卡系统 ==========
  advanceStage() {
    this._state.currentStage++;
    if (this._state.currentStage > this._state.highestStage) {
      this._state.highestStage = this._state.currentStage;
    }
    this._notify('currentStage', null, this._state.currentStage);
  }

  useChallenge() {
    if (this._state.remainingChallenges <= 0) return false;
    this._state.remainingChallenges--;
    this._notify('remainingChallenges', null, this._state.remainingChallenges);
    return true;
  }

  // ========== 挂机收益 ==========
  calculateIdleCoins() {
    const now = Date.now();
    const elapsed = (now - this._state.lastOnlineTime) / 1000; // 秒
    const maxHours = window.GameConfig?.economy?.idleMaxHours || 4;
    const maxSeconds = maxHours * 3600;
    const effectiveSeconds = Math.min(elapsed, maxSeconds);
    const cps = this.getCoinsPerSecond();
    const vipMult = this._state.vipActive ? (window.GameConfig?.vip?.idleBonusMultiplier || 1.5) : 1;
    return Math.floor(cps * effectiveSeconds * vipMult);
  }

  claimIdleCoins() {
    const coins = this.calculateIdleCoins();
    this.addCoins(coins);
    this._state.lastOnlineTime = Date.now();
    return coins;
  }

  // ========== 存档 ==========
  serialize() {
    return JSON.parse(JSON.stringify(this._state));
  }

  deserialize(data) {
    if (!data) return;
    Object.assign(this._state, data);
    // 兼容老存档：如果所有槽位都为空，自动补发3辆LV1车
    var hasAnyCar = false;
    for (var i = 0; i < this._state.slots.length; i++) {
      if (this._state.slots[i]) { hasAnyCar = true; break; }
    }
    if (!hasAnyCar) {
      for (var j = 0; j < 3; j++) {
        this._state.slots[j] = { level: 1, uid: 'recover_' + j };
      }
      this._state.selectedCarLevel = 1;
    }
  }

  reset() {
    this._state = this._getDefaultState();
  }

  _genUID() {
    return 'car_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ========== 排行榜与个人资料方法 ==========
  randomizeName(silent) {
    const prefixes = ['狂暴', '疾风', '烈焰', '雷霆', '幽灵', '极速', '机甲', '合金', '重装', '虚空', '电光', '钢骨', '风暴', '暗夜', '终极'];
    const suffixes = ['车神', '射手', '暴击手', '狂飙者', '领跑者', '火炮', '引擎', '核心', '幻影', '闪电', '黑帮', '王牌', '猎手', '先锋', '暴风'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const name = p + s;
    this._state.playerName = name;
    if (!silent) {
      this._notify('playerName', null, name);
    }
    return name;
  }

  setAvatar(id) {
    var val = Math.max(0, Math.min(5, Math.floor(id)));
    this._state.playerAvatar = val;
    this._notify('playerAvatar', null, val);
  }

  updateMaxStage(stage) {
    var sVal = Math.max(1, Math.floor(stage));
    if (sVal > this._state.maxStageReached) {
      this._state.maxStageReached = sVal;
      this._state.maxStageTime = Date.now();
      this._notify('maxStageReached', null, sVal);
    }
  }

  updateMaxEndless(dist) {
    var dVal = Math.max(0, Math.floor(dist));
    if (dVal > this._state.maxEndlessDist) {
      this._state.maxEndlessDist = dVal;
      this._state.maxEndlessTime = Date.now();
      this._notify('maxEndlessDist', null, dVal);
    }
  }

  getStageLeaderboard() {
    const VIRTUAL_AI_PLAYERS = [
      { name: '雷霆先锋', avatar: 1, score: 15, time: 1779430000000 },
      { name: '合金暴击手', avatar: 2, score: 12, time: 1779431000000 },
      { name: '疾风狂飙者', avatar: 3, score: 9,  time: 1779432000000 },
      { name: '幽灵引擎', avatar: 4, score: 7,  time: 1779433000000 },
      { name: '烈焰核心', avatar: 5, score: 5,  time: 1779434000000 },
      { name: '极速车神', avatar: 0, score: 4,  time: 1779435000000 },
      { name: '重装幻影', avatar: 1, score: 3,  time: 1779436000000 },
      { name: '虚空闪电', avatar: 2, score: 2,  time: 1779437000000 },
      { name: '电光王牌', avatar: 3, score: 1,  time: 1779438000000 }
    ];

    const playerRecord = {
      name: this._state.playerName || '狂暴车神',
      avatar: this._state.playerAvatar || 0,
      score: this._state.maxStageReached || 1,
      time: this._state.maxStageTime || Date.now(),
      isPlayer: true
    };

    const list = VIRTUAL_AI_PLAYERS.concat(playerRecord);

    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time - b.time;
    });

    return list.slice(0, 10);
  }

  getEndlessLeaderboard() {
    const VIRTUAL_AI_PLAYERS = [
      { name: '雷霆先锋', avatar: 1, score: 5820, time: 1779430000000 },
      { name: '合金暴击手', avatar: 2, score: 4210, time: 1779431000000 },
      { name: '疾风狂飙者', avatar: 3, score: 3150, time: 1779432000000 },
      { name: '幽灵引擎', avatar: 4, score: 2280, time: 1779433000000 },
      { name: '烈焰核心', avatar: 5, score: 1560, time: 1779434000000 },
      { name: '极速车神', avatar: 0, score: 1120, time: 1779435000000 },
      { name: '重装幻影', avatar: 1, score: 850,  time: 1779436000000 },
      { name: '虚空闪电', avatar: 2, score: 480,  time: 1779437000000 },
      { name: '电光王牌', avatar: 3, score: 180,  time: 1779438000000 }
    ];

    const playerRecord = {
      name: this._state.playerName || '狂暴车神',
      avatar: this._state.playerAvatar || 0,
      score: this._state.maxEndlessDist || 0,
      time: this._state.maxEndlessTime || Date.now(),
      isPlayer: true
    };

    const list = VIRTUAL_AI_PLAYERS.concat(playerRecord);

    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time - b.time;
    });

    return list.slice(0, 10);
  }
}

// 全局单例
const gameState = new GameState();

// 全局导出
if (typeof window !== 'undefined') {
  window.GameState = GameState;
  window.gameState = gameState;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameState, gameState };
}
