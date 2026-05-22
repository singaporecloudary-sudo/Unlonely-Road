/**
 * 车辆变换编辑器
 * 提供 X/Y轴倾斜 / Z轴旋转 / X/Y偏移 / 缩放 实时调节
 * 通过localStorage持久化，刷新后保留
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'merge_racer_car_transform';
  var DEFAULTS = {
    rotZ: 0,      // Z轴旋转(度)
    skewX: 0,     // X轴倾斜(度) — 类似透视
    skewY: 0,     // Y轴倾斜(度)
    offsetX: 0,   // 水平偏移(px)
    offsetY: 0,   // 垂直偏移(px)
    scale: 1,     // 缩放
  };

  var Editor = {
    visible: false,
    transform: null,
    panelEl: null,

    init: function() {
      this.transform = this._load();
      this._buildPanel();
      this._buildToggleBtn();
    },

    getTransform: function() {
      if (!this.transform) this.transform = this._load();
      return this.transform;
    },

    _load: function() {
      try {
        var s = localStorage.getItem(STORAGE_KEY);
        if (s) return Object.assign({}, DEFAULTS, JSON.parse(s));
      } catch (e) {}
      return Object.assign({}, DEFAULTS);
    },

    _save: function() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transform)); } catch (e) {}
    },

    _buildToggleBtn: function() {
      var btn = document.createElement('button');
      btn.id = 'car-transform-toggle';
      btn.textContent = '🚗调车';
      btn.title = '车辆变换编辑器';
      btn.style.cssText =
        'position:fixed; bottom:60px; right:10px; width:60px; height:40px;' +
        'background:rgba(0,200,255,0.85); border:none; border-radius:8px;' +
        'color:#FFF; font-size:13px; font-weight:bold; cursor:pointer;' +
        'z-index:200; box-shadow:0 0 12px rgba(0,200,255,0.6);';
      // 只有在 URL 中带了 ?editor=1 或 ?admin=1 时，才显示调车按钮
      var isEditorUrl = window.location.search.indexOf('editor=1') !== -1 || window.location.search.indexOf('admin=1') !== -1;
      if (!isEditorUrl) {
        btn.style.display = 'none';
      }
      var self = this;
      btn.addEventListener('click', function() { self.toggle(); });
      document.body.appendChild(btn);
    },

    toggle: function() {
      this.visible = !this.visible;
      this.panelEl.style.display = this.visible ? 'block' : 'none';
    },

    _buildPanel: function() {
      var panel = document.createElement('div');
      panel.id = 'car-transform-panel';
      panel.style.cssText =
        'position:fixed; top:80px; right:10px; width:260px;' +
        'background:rgba(8,15,35,0.96); border:1px solid rgba(0,200,255,0.5);' +
        'border-radius:8px; padding:14px; z-index:300;' +
        'color:#FFF; font-family:Arial,"Microsoft YaHei",sans-serif; font-size:12px;' +
        'box-shadow:0 4px 24px rgba(0,200,255,0.3);' +
        'display:none;';

      panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<span style="color:#00E5FF;font-weight:bold;font-size:14px;">车辆变换编辑器</span>' +
          '<button id="ct-close" style="background:transparent;border:none;color:#FFF;font-size:18px;cursor:pointer;">×</button>' +
        '</div>';

      var sliders = [
        { key: 'rotZ',    label: 'Z轴旋转 (°)', min: -45, max: 45, step: 0.5 },
        { key: 'skewX',   label: 'X轴倾斜 (°)', min: -30, max: 30, step: 0.5 },
        { key: 'skewY',   label: 'Y轴倾斜 (°)', min: -30, max: 30, step: 0.5 },
        { key: 'offsetX', label: '水平偏移 (px)', min: -200, max: 200, step: 1 },
        { key: 'offsetY', label: '垂直偏移 (px)', min: -200, max: 200, step: 1 },
        { key: 'scale',   label: '缩放',         min: 0.5,  max: 2,    step: 0.01 },
      ];

      var self = this;
      sliders.forEach(function(s) {
        var v = self.transform[s.key];
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:10px;';
        row.innerHTML =
          '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
            '<span>' + s.label + '</span>' +
            '<span id="ct-val-' + s.key + '" style="color:#00E5FF;font-weight:bold;">' + v + '</span>' +
          '</div>' +
          '<input type="range" id="ct-' + s.key + '" min="' + s.min + '" max="' + s.max + '" ' +
            'step="' + s.step + '" value="' + v + '" ' +
            'style="width:100%;accent-color:#00E5FF;">';
        panel.appendChild(row);
      });

      // 重置按钮
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
      btnRow.innerHTML =
        '<button id="ct-reset" style="flex:1;padding:8px;background:rgba(255,80,80,0.7);border:none;border-radius:4px;color:#FFF;cursor:pointer;font-weight:bold;">重置</button>' +
        '<button id="ct-copy" style="flex:1;padding:8px;background:rgba(80,180,80,0.7);border:none;border-radius:4px;color:#FFF;cursor:pointer;font-weight:bold;">复制参数</button>';
      panel.appendChild(btnRow);

      // 输出区
      var outDiv = document.createElement('div');
      outDiv.style.cssText = 'margin-top:10px;padding:8px;background:rgba(0,0,30,0.6);border-radius:4px;font-family:monospace;font-size:11px;color:#80E0FF;word-break:break-all;';
      outDiv.id = 'ct-output';
      panel.appendChild(outDiv);

      document.body.appendChild(panel);
      this.panelEl = panel;

      // 绑定事件
      sliders.forEach(function(s) {
        var input = document.getElementById('ct-' + s.key);
        var valSpan = document.getElementById('ct-val-' + s.key);
        input.addEventListener('input', function() {
          var v = parseFloat(input.value);
          self.transform[s.key] = v;
          valSpan.textContent = v;
          self._save();
          self._updateOutput();
        });
      });

      document.getElementById('ct-close').addEventListener('click', function() { self.toggle(); });
      document.getElementById('ct-reset').addEventListener('click', function() {
        self.transform = Object.assign({}, DEFAULTS);
        self._save();
        sliders.forEach(function(s) {
          document.getElementById('ct-' + s.key).value = self.transform[s.key];
          document.getElementById('ct-val-' + s.key).textContent = self.transform[s.key];
        });
        self._updateOutput();
      });
      document.getElementById('ct-copy').addEventListener('click', function() {
        var json = JSON.stringify(self.transform);
        try {
          navigator.clipboard.writeText(json);
          document.getElementById('ct-copy').textContent = '已复制!';
          setTimeout(function() { document.getElementById('ct-copy').textContent = '复制参数'; }, 1500);
        } catch (e) {}
      });

      this._updateOutput();
    },

    _updateOutput: function() {
      var out = document.getElementById('ct-output');
      if (out) out.textContent = JSON.stringify(this.transform);
    },
  };

  // 单例
  window.CarTransformEditor = Editor;

  // DOM ready后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { Editor.init(); });
  } else {
    Editor.init();
  }
})();
