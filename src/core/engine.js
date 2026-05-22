/**
 * 合成飞车射击 - 核心游戏引擎
 * 管理游戏主循环、场景切换、输入处理
 */

// ========== Polyfill: roundRect兼容性修复 ==========
if (typeof CanvasRenderingContext2D !== 'undefined') {
  const _proto = CanvasRenderingContext2D.prototype;
  if (!_proto.roundRect) {
    _proto.roundRect = function(x, y, w, h, radii) {
      if (typeof radii === 'number') {
        var r = Math.min(radii, Math.min(w, h) / 2);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
      } else {
        this.rect(x, y, w, h);
      }
    };
  }
}

// ========== Polyfill: Path2D.roundRect ==========
if (typeof Path2D !== 'undefined' && !Path2D.prototype.roundRect) {
  // Path2D不支持polyfill roundRect，改用rect
}

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('Canvas元素未找到:', canvasId);
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    this.scenes = {};
    this.currentScene = null;
    this.running = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.input = { touch: false, x: 0, y: 0, startX: 0, startY: 0, deltaX: 0, deltaY: 0 };
    this.eventBus = new EventBus();
    this.saveManager = new SaveManager();

    this._setupCanvas();
    this._setupInput();
  }

  _setupCanvas() {
    const cfg = window.GameConfig?.general || { canvasWidth: 720, canvasHeight: 1280 };
    this.canvas.width = cfg.canvasWidth || 720;
    this.canvas.height = cfg.canvasHeight || 1280;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    try {
      const ratio = this.canvas.width / this.canvas.height;
      const winW = window.innerWidth || 800;
      const winH = window.innerHeight || 600;
      const winRatio = winW / winH;

      if (winRatio < ratio) {
        this.canvas.style.width = winW + 'px';
        this.canvas.style.height = Math.floor(winW / ratio) + 'px';
      } else {
        this.canvas.style.height = winH + 'px';
        this.canvas.style.width = Math.floor(winH * ratio) + 'px';
      }

      const rect = this.canvas.getBoundingClientRect();
      this.scaleX = this.canvas.width / (rect.width || this.canvas.width);
      this.scaleY = this.canvas.height / (rect.height || this.canvas.height);
    } catch(e) {
      console.warn('Resize error:', e);
      this.scaleX = 1;
      this.scaleY = 1;
    }
  }

  _setupInput() {
    var self = this;

    var getPos = function(e) {
      try {
        var rect = self.canvas.getBoundingClientRect();
        var touch = e.touches ? e.touches[0] : e;
        if (!touch) { touch = e; }
        return {
          x: ((touch.clientX || 0) - (rect.left || 0)) * self.scaleX,
          y: ((touch.clientY || 0) - (rect.top || 0)) * self.scaleY,
        };
      } catch(err) {
        return { x: self.input.x, y: self.input.y };
      }
    };

    this.canvas.addEventListener('touchstart', function(e) {
      if (e.cancelable) e.preventDefault();
      var pos = getPos(e);
      self.input.touch = true;
      self.input.startX = pos.x;
      self.input.startY = pos.y;
      self.input.x = pos.x;
      self.input.y = pos.y;
      self.input.deltaX = 0;
      self.input.deltaY = 0;
      try { self.eventBus.emit('touchStart', pos); } catch(err) {}
    }, { passive: false });

    this.canvas.addEventListener('touchmove', function(e) {
      if (e.cancelable) e.preventDefault();
      var pos = getPos(e);
      self.input.deltaX = pos.x - self.input.x;
      self.input.deltaY = pos.y - self.input.y;
      self.input.x = pos.x;
      self.input.y = pos.y;
      try { self.eventBus.emit('touchMove', pos); } catch(err) {}
    }, { passive: false });

    this.canvas.addEventListener('touchend', function(e) {
      if (e.cancelable) e.preventDefault();
      // 使用changedTouches获取实际释放位置
      var pos;
      if (e.changedTouches && e.changedTouches[0]) {
        pos = getPos({ touches: null, clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY });
      } else {
        pos = { x: self.input.x, y: self.input.y };
      }
      self.input.x = pos.x;
      self.input.y = pos.y;
      self.input.touch = false;
      try { self.eventBus.emit('touchEnd', pos); } catch(err) {}
    }, { passive: false });

    this.canvas.addEventListener('mousedown', function(e) {
      var pos = getPos(e);
      self.input.touch = true;
      self.input.startX = pos.x;
      self.input.startY = pos.y;
      self.input.x = pos.x;
      self.input.y = pos.y;
      try { self.eventBus.emit('touchStart', pos); } catch(err) {}
    });
    this.canvas.addEventListener('mousemove', function(e) {
      var pos = getPos(e);
      if (self.input.touch) {
        self.input.deltaX = pos.x - self.input.x;
        self.input.deltaY = pos.y - self.input.y;
        self.input.x = pos.x;
        self.input.y = pos.y;
        try { self.eventBus.emit('touchMove', pos); } catch(err) {}
      }
    });
    this.canvas.addEventListener('mouseup', function(e) {
      // 重要：更新到实际释放位置
      var pos = getPos(e);
      self.input.x = pos.x;
      self.input.y = pos.y;
      self.input.touch = false;
      try { self.eventBus.emit('touchEnd', pos); } catch(err) {}
    });

    // 滚轮事件（用于编辑器列表滚动）
    this.canvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 1 : -1;
      try { self.eventBus.emit('wheel', delta); } catch(err) {}
    }, { passive: false });
  }

  registerScene(name, scene) {
    this.scenes[name] = scene;
    scene.engine = this;
    scene.ctx = this.ctx;
    scene.eventBus = this.eventBus;
  }

  switchScene(name) {
    if (this.currentScene && this.scenes[this.currentScene]) {
      try { this.scenes[this.currentScene].onExit(); } catch(err) {}
    }
    this.currentScene = name;
    if (this.scenes[name]) {
      try { this.scenes[name].onEnter(); } catch(err) {}
    }
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop() {
    if (!this.running) return;
    var now = performance.now();
    this.deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (this.deltaTime > 0.1) this.deltaTime = 0.016;
    if (this.deltaTime <= 0) this.deltaTime = 0.016;

    var scene = this.scenes[this.currentScene];
    if (scene && scene.update && scene.render) {
      scene.update(this.deltaTime);
      scene.render(this.ctx);
    }
    var self = this;
    requestAnimationFrame(function() { self._loop(); });
  }
}

/**
 * 事件总线
 */
function EventBus() {
  this.listeners = {};
}
EventBus.prototype.on = function(event, callback) {
  if (!this.listeners[event]) this.listeners[event] = [];
  this.listeners[event].push(callback);
};
EventBus.prototype.off = function(event, callback) {
  if (!this.listeners[event]) return;
  // 不传 callback → 移除该 event 的全部监听器
  if (callback === undefined) {
    this.listeners[event] = [];
    return;
  }
  this.listeners[event] = this.listeners[event].filter(function(cb) { return cb !== callback; });
};
EventBus.prototype.emit = function(event, data) {
  if (!this.listeners[event]) return;
  for (var i = 0; i < this.listeners[event].length; i++) {
    try { this.listeners[event][i](data); } catch(err) {}
  }
};

/**
 * 存档管理
 */
function SaveManager() {
  this.saveKey = 'merge_racer_shooter_save';
}
SaveManager.prototype.save = function(data) {
  try {
    localStorage.setItem(this.saveKey, JSON.stringify(data));
    return true;
  } catch(e) {
    console.warn('存档失败:', e);
    return false;
  }
};
SaveManager.prototype.load = function() {
  try {
    var data = localStorage.getItem(this.saveKey);
    return data ? JSON.parse(data) : null;
  } catch(e) {
    console.warn('读档失败:', e);
    return null;
  }
};
SaveManager.prototype.clear = function() {
  try { localStorage.removeItem(this.saveKey); } catch(e) {}
};

// 全局导出（浏览器环境class不会自动挂window，需显式声明）
if (typeof window !== 'undefined') {
  window.GameEngine = GameEngine;
  window.EventBus = EventBus;
  window.SaveManager = SaveManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameEngine: GameEngine, EventBus: EventBus, SaveManager: SaveManager };
}
