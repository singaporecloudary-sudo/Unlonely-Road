/**
 * 合成飞车射击 - 零代码可视化编辑器
 * 支持：拖拽移动 / 调整大小 / UI素材替换 / 数值编辑
 */

class ComponentEditor {
  constructor() {
    this.visible = false;
    this.activeTab = 'layout'; // values | rules | layout | assets
    this.selectedComponent = null;
    this.configBackup = null;
    this.layoutBackup = null;

    // 实时预览模式 (live preview - 在游戏画面上直接编辑)
    this.liveMode = false;  // true = 直接在场景上编辑，false = 缩略图模式

    // 布局编辑器状态
    this.selectedLayoutItem = null;
    this._layoutItems = [];
    this._layoutDrag = null;   // { type: 'move'|'resize', startX, startY, origRect }
    this._previewInfo = null;  // { scale, x, y, w, h }

    // 素材编辑器状态
    this.selectedAsset = null;
    this._assetList = [
      { key: 'main_bg', label: '主界面背景', path: 'assets/scenes/main_bg/main_bg.png', size: '720x1280', category: '场景' },
      { key: 'btn_auto_craft', label: '自动合成按钮', path: 'assets/ui/buttons/btn_auto_craft.png', size: '200x60', category: '按钮' },
      { key: 'btn_stage', label: '闯关按钮', path: 'assets/ui/buttons/btn_stage.png', size: '200x60', category: '按钮' },
      { key: 'btn_race', label: '挑战赛按钮', path: 'assets/ui/buttons/btn_race.png', size: '200x60', category: '按钮' },
      { key: 'btn_buy_car', label: '购买按钮', path: 'assets/ui/buttons/btn_buy_car.png', size: '200x60', category: '按钮' },
      { key: 'btn_shop', label: '商店按钮', path: 'assets/ui/buttons/btn_shop.png', size: '80x80', category: '按钮' },
      { key: 'btn_settings', label: '设置按钮', path: 'assets/ui/buttons/btn_settings.png', size: '80x80', category: '按钮' },
      { key: 'btn_lucky', label: '幸运转盘', path: 'assets/ui/buttons/btn_lucky.png', size: '80x80', category: '按钮' },
      { key: 'btn_vip', label: 'VIP按钮', path: 'assets/ui/buttons/btn_vip.png', size: '80x80', category: '按钮' },
      { key: 'icon_coin', label: '金币图标', path: 'assets/ui/icons/icon_coin.png', size: '40x40', category: '图标' },
      { key: 'icon_gem', label: '钻石图标', path: 'assets/ui/icons/icon_gem.png', size: '40x40', category: '图标' },
      { key: 'icon_hp', label: '血量图标', path: 'assets/ui/icons/icon_hp.png', size: '40x40', category: '图标' },
      { key: 'bar_progress', label: '进度条', path: 'assets/ui/bars/bar_progress.png', size: '400x20', category: '条' },
      { key: 'bar_hp', label: '血条', path: 'assets/ui/bars/bar_hp.png', size: '300x30', category: '条' },
      { key: 'slot_platform', label: '槽位底座', path: 'assets/ui/screens/slot_platform.png', size: '165x148', category: '屏幕元素' },
    ];

    // 动态生成52级战车素材条目
    for (var bclv = 1; bclv <= 52; bclv++) {
      this._assetList.push({
        key: 'battle_car_lv' + bclv,
        label: '战车 LV.' + bclv,
        path: 'assets/vehicles/player/car_lv' + bclv + '.png',
        size: '80x120',
        category: '战车'
      });
    }

    // 兼容性: roundRect替代
    this._rr = function(ctx, x, y, w, h, r) {
      if (typeof r !== 'number' || r <= 0) { ctx.rect(x,y,w,h); return; }
      r = Math.min(r, Math.min(w,h)/2);
      ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r);
    };

    // 编辑器UI尺寸 - 全屏模式
    this.panelWidth = 720;
    this.panelHeight = 1280;
    this.panelX = 0;
    this.panelY = 0;

    // 可编辑组件列表
    this.editableComponents = [
      { id: 'coins', group: '经济', label: '金币数量', type: 'number', path: 'economy.coins' },
      { id: 'gems', group: '经济', label: '钻石数量', type: 'number', path: 'economy.gems' },
      { id: 'maxSlots', group: '合成', label: '槽位数量', type: 'number', min: 1, max: 24, path: 'crafting.maxSlots' },
      { id: 'maxLevel', group: '合成', label: '最高等级', type: 'number', min: 1, max: 999, path: 'crafting.maxLevel' },
      { id: 'mergeRule', group: '合成', label: '合成数量', type: 'number', min: 2, max: 5, path: 'crafting.mergeRule' },
      { id: 'incomeBase', group: '合成', label: '收益基数', type: 'number', step: 0.1, path: 'crafting.incomeBase' },
      { id: 'incomeExponent', group: '合成', label: '收益指数', type: 'number', step: 0.01, path: 'crafting.incomeExponent' },
      { id: 'buyBasePrice', group: '合成', label: '购买基础价格', type: 'number', path: 'crafting.buyBasePrice' },
      { id: 'buyMultiplier', group: '合成', label: '购买递增系数', type: 'number', step: 0.01, path: 'crafting.buyMultiplier' },
      { id: 'atkBase', group: '车辆', label: '攻击力基数', type: 'number', path: 'crafting.vehicleStats.atkBase' },
      { id: 'atkExponent', group: '车辆', label: '攻击力指数', type: 'number', step: 0.01, path: 'crafting.vehicleStats.atkExponent' },
      { id: 'hpBase', group: '车辆', label: '血量基数', type: 'number', path: 'crafting.vehicleStats.hpBase' },
      { id: 'hpExponent', group: '车辆', label: '血量指数', type: 'number', step: 0.01, path: 'crafting.vehicleStats.hpExponent' },
      { id: 'bulletBase', group: '车辆', label: '初始弹幕数', type: 'number', path: 'crafting.vehicleStats.bulletBase' },
      { id: 'bulletMax', group: '车辆', label: '最大弹幕数', type: 'number', path: 'crafting.vehicleStats.bulletMax' },
      { id: 'totalStages', group: '关卡', label: '总关卡数', type: 'number', path: 'stages.totalStages' },
      { id: 'baseDistance', group: '关卡', label: '基础距离', type: 'number', path: 'stages.baseDistance' },
      { id: 'distancePerStage', group: '关卡', label: '每关距离增量', type: 'number', path: 'stages.distancePerStage' },
      { id: 'enemyHpBase', group: '敌方', label: '敌方血量基数', type: 'number', path: 'stages.enemy.hpBase' },
      { id: 'enemyHpScale', group: '敌方', label: '敌方血量系数', type: 'number', step: 0.01, path: 'stages.enemy.hpScale' },
      { id: 'enemyAtkBase', group: '敌方', label: '敌方攻击基数', type: 'number', path: 'stages.enemy.atkBase' },
      { id: 'enemySpeedBase', group: '敌方', label: '敌方速度基数', type: 'number', step: 0.1, path: 'stages.enemy.speedBase' },
      { id: 'shootInterval', group: '战斗', label: '射击间隔(ms)', type: 'number', path: 'battle.shootInterval' },
      { id: 'bulletSpeed', group: '战斗', label: '子弹速度', type: 'number', path: 'battle.bulletSpeed' },
      { id: 'playerMoveSpeed', group: '战斗', label: '玩家移速', type: 'number', path: 'battle.playerMoveSpeed' },
      { id: 'invincibleDuration', group: '战斗', label: '无敌时间(ms)', type: 'number', path: 'battle.invincibleDuration' },
      { id: 'idleMaxHours', group: '挂机', label: '最大挂机时长(h)', type: 'number', path: 'economy.idleMaxHours' },
    ];

    // 分组
    this.groups = [];
    var seen = {};
    this.editableComponents.forEach(function(c) {
      if (!seen[c.group]) { seen[c.group] = true; this.groups.push(c.group); }
    }.bind(this));

    // 数值页滚动
    this._valuesScroll = 0;
    this._valuesScrollTarget = 0;

    // 素材页滚动
    this._assetsScroll = 0;

    // 布局 +/- 调整步长
    this._layoutStep = 10;
  }

  toggle() {
    this.visible = !this.visible;
    if (this.visible) {
      this.configBackup = JSON.parse(JSON.stringify(window.GameConfig));
      var scene = this._getScene();
      if (scene) this.layoutBackup = JSON.parse(JSON.stringify(scene.layout));
      this.activeTab = 'layout';
    }
  }

  _getScene() {
    return (window.gameEngine && window.gameEngine.scenes && window.gameEngine.scenes.crafting) || null;
  }

  _getByPath(obj, path) {
    return path.split('.').reduce(function(o, k) { return o && o[k]; }, obj);
  }

  _setByPath(obj, path, value) {
    var keys = path.split('.');
    var last = keys.pop();
    var target = keys.reduce(function(o, k) { return o[k]; }, obj);
    target[last] = value;
  }

  // ==================== 渲染主框架 ====================
  render(ctx) {
    if (!this.visible) return;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 720, 1280);

    // 面板背景
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, 720, 1280);

    // 标题栏
    ctx.fillStyle = '#16213E';
    ctx.fillRect(0, 0, 720, 50);
    ctx.fillStyle = '#7C4DFF';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('\u2699 \u53EF\u89C6\u5316\u7F16\u8F91\u5668', 360, 34);

    // 关闭按钮 (右上角X)
    ctx.fillStyle = '#FF5252';
    ctx.fillRect(670, 8, 40, 34);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('\u00D7', 690, 31);

    // 标签页 - 4个标签
    var tabs = ['layout', 'assets', 'values', 'rules'];
    var tabLabels = ['\u5E03\u5C40', '\u7D20\u6750', '\u6570\u503C', '\u89C4\u5219'];
    var tabW = 720 / 4;
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = this.activeTab === tabs[i] ? '#7C4DFF' : '#0F3460';
      ctx.fillRect(i * tabW, 50, tabW, 40);
      ctx.fillStyle = this.activeTab === tabs[i] ? '#FFF' : '#8892B0';
      ctx.font = (this.activeTab === tabs[i] ? 'bold ' : '') + '15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tabLabels[i], i * tabW + tabW / 2, 76);
    }

    // 内容区
    if (this.activeTab === 'layout') {
      this._renderLayoutTab(ctx, 0, 95, 720, 1140);
    } else if (this.activeTab === 'assets') {
      this._renderAssetsTab(ctx, 0, 95, 720, 1140);
    } else if (this.activeTab === 'values') {
      this._renderValuesTab(ctx, 0, 95, 720, 1140);
    } else {
      this._renderRulesTab(ctx, 0, 95, 720, 1140);
    }

    // 底部按钮栏
    this._renderBottomBar(ctx);
  }

  _renderBottomBar(ctx) {
    var barY = 1230;
    ctx.fillStyle = '#16213E';
    ctx.fillRect(0, barY, 720, 50);

    // 应用
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath(); this._rr(ctx, 20, barY + 8, 160, 34, 8); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
    ctx.fillText('\u2713 \u5E94\u7528\u4FDD\u5B58', 100, barY + 30);

    // 重置
    ctx.fillStyle = '#FF5722';
    ctx.beginPath(); this._rr(ctx, 200, barY + 8, 160, 34, 8); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText('\u21BA \u91CD\u7F6E', 280, barY + 30);

    // 导出代码
    ctx.fillStyle = '#2196F3';
    ctx.beginPath(); this._rr(ctx, 380, barY + 8, 160, 34, 8); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText('\u2B07 \u5BFC\u51FA\u4EE3\u7801', 460, barY + 30);

    // 关闭
    ctx.fillStyle = '#455A64';
    ctx.beginPath(); this._rr(ctx, 560, barY + 8, 140, 34, 8); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText('\u2715 \u5173\u95ED', 630, barY + 30);
  }

  // ==================== 布局标签页 ====================
  _renderLayoutTab(ctx, x, y, w, h) {
    var scene = this._getScene();
    if (!scene || !scene.layout) {
      ctx.fillStyle = '#9E9E9E'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
      ctx.fillText('\u573A\u666F\u672A\u52A0\u8F7D\uFF0C\u8BF7\u5148\u8FDB\u5165\u6E38\u620F', x + w / 2, y + 200);
      return;
    }
    var layout = scene.layout;

    // 模式切换按钮
    ctx.fillStyle = this.liveMode ? '#4CAF50' : '#0F3460';
    ctx.beginPath(); this._rr(ctx, x + 10, y, 160, 32, 6); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(this.liveMode ? '\u25C0 \u7F29\u7565\u56FE\u6A21\u5F0F' : '\u25B6 \u5B9E\u65F6\u9884\u89C8\u6A21\u5F0F', x + 90, y + 21);

    if (this.liveMode) {
      this._renderLivePreview(ctx, x, y + 40, w, h - 40);
    } else {
      this._renderMiniPreview(ctx, x, y + 35, w, h - 35, layout, scene);
    }
  }

  // ===== 缩略图模式（原有逻辑） =====
  _renderMiniPreview(ctx, x, y, w, h, layout, scene) {

    // ===== 上半部：缩略图预览 =====
    var previewAreaH = 500;
    var scale = Math.min((w - 20) / 720, (previewAreaH - 20) / 1280);
    var previewW = 720 * scale;
    var previewH = 1280 * scale;
    var previewX = x + (w - previewW) / 2;
    var previewY = y + 10;

    // 存储预览信息
    this._previewInfo = { scale: scale, x: previewX, y: previewY, w: previewW, h: previewH };

    // 预览背景
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(previewX - 2, previewY - 2, previewW + 4, previewH + 4);
    ctx.fillStyle = '#161B22';
    ctx.fillRect(previewX, previewY, previewW, previewH);

    // 布局元素列表
    this._layoutItems = [
      { key: 'topBar', label: '\u9876\u680F', color: 'rgba(255,193,7,0.5)', border: '#FFC107' },
      { key: 'cpsLabel', label: '\u6BCF\u79D2\u6536\u76CA', color: 'rgba(100,200,255,0.4)', border: '#64B5F6' },
      { key: 'cpsBig', label: '\u5927\u53F7CPS', color: 'rgba(0,229,255,0.5)', border: '#00E5FF' },
      { key: 'gemsDisplay', label: '\u94BB\u77F3', color: 'rgba(66,165,245,0.5)', border: '#42A5F5' },
      { key: 'coinsDisplay', label: '\u91D1\u5E01', color: 'rgba(255,215,0,0.5)', border: '#FFD700' },
      { key: 'settingsBtn', label: '\u8BBE\u7F6E', color: 'rgba(69,90,104,0.5)', border: '#455A64' },
      { key: 'vipBtn', label: 'VIP', color: 'rgba(183,28,28,0.5)', border: '#B71C1C' },
      { key: 'carDisplay', label: '\u8F66\u5C55\u793A', color: 'rgba(76,175,80,0.5)', border: '#4CAF50' },
      { key: 'changeCarBtn', label: '\u6362\u8F66', color: 'rgba(0,188,212,0.5)', border: '#00BCD4' },
      { key: 'progressBar', label: '\u8FDB\u5EA6\u6761', color: 'rgba(33,150,243,0.5)', border: '#2196F3' },
      { key: 'autoCraftBtn', label: '\u81EA\u52A8\u5408\u6210', color: 'rgba(156,39,176,0.5)', border: '#9C27B0' },
      { key: 'stageBtn', label: '\u95EF\u5173', color: 'rgba(230,120,20,0.5)', border: '#E65100' },
      { key: 'raceBtn', label: '\u6311\u6218', color: 'rgba(156,39,176,0.5)', border: '#9C27B0' },
      { key: 'droneBtn', label: '\u65E0\u4EBA\u673A', color: 'rgba(0,188,212,0.5)', border: '#00BCD4' },
      { key: 'buyBtn', label: '\u8D2D\u4E70', color: 'rgba(255,87,34,0.5)', border: '#FF5722' },
      { key: 'shopBtn', label: '\u5546\u5E97', color: 'rgba(198,40,40,0.5)', border: '#C62828' },
    ];

    // 绘制布局元素
    for (var i = 0; i < this._layoutItems.length; i++) {
      var item = this._layoutItems[i];
      var rect = layout[item.key];
      if (!rect) continue;

      var rx = previewX + rect.x * scale;
      var ry = previewY + rect.y * scale;
      var rw = (rect.w || 80) * scale;
      var rh = (rect.h || 40) * scale;
      var isSelected = (this.selectedLayoutItem === item.key);

      ctx.fillStyle = isSelected ? item.color.replace('0.5', '0.8') : item.color;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = isSelected ? '#FFFFFF' : item.border;
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(rx, ry, rw, rh);

      // 标签文字
      if (rw > 25 && rh > 10) {
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold ' + Math.max(8, Math.min(13, rw / 5)) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, rx + rw / 2, ry + rh / 2 + 4);
      }

      // 选中时画调整手柄（右下角小方块）
      if (isSelected) {
        var handleSize = 10;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(rx + rw - handleSize, ry + rh - handleSize, handleSize, handleSize);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + rw - handleSize, ry + rh - handleSize, handleSize, handleSize);
      }

      // 存储屏幕坐标
      item._screenRect = { x: rx, y: ry, w: rw, h: rh };
    }

    // 槽位网格
    if (layout.slotsStart) {
      var sx = previewX + layout.slotsStart.x * scale;
      var sy = previewY + layout.slotsStart.y * scale;
      var sw = layout.slotSize.w * scale;
      var sh = layout.slotSize.h * scale;
      var sg = layout.slotGap * scale;
      ctx.strokeStyle = 'rgba(158,158,158,0.3)'; ctx.lineWidth = 0.5;
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < (layout.slotCols || 4); col++) {
          ctx.strokeRect(sx + col * (sw + sg), sy + row * (sh + sg), sw, sh);
        }
      }
    }

    // 拖拽中提示
    if (this._layoutDrag) {
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillText(this._layoutDrag.type === 'move' ? '\u62D6\u62FD\u79FB\u52A8\u4E2D...' : '\u8C03\u6574\u5927\u5C0F\u4E2D...', previewX + previewW / 2, previewY - 2);
    }

    // ===== 下半部：选中元素的属性面板 =====
    var propY = previewY + previewH + 15;
    ctx.fillStyle = '#16213E';
    ctx.fillRect(x, propY, w, h - (propY - y));

    if (this.selectedLayoutItem && layout[this.selectedLayoutItem]) {
      var selRect = layout[this.selectedLayoutItem];
      var itemLabel = '';
      for (var li = 0; li < this._layoutItems.length; li++) {
        if (this._layoutItems[li].key === this.selectedLayoutItem) { itemLabel = this._layoutItems[li].label; break; }
      }

      // 元素名称
      ctx.fillStyle = '#7C4DFF'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'left';
      ctx.fillText(itemLabel + ' (' + this.selectedLayoutItem + ')', 20, propY + 28);

      // 属性行
      var rowY = propY + 50;
      var fields = ['x', 'y'];
      if (selRect.w !== undefined) fields.push('w');
      if (selRect.h !== undefined) fields.push('h');

      for (var fi = 0; fi < fields.length; fi++) {
        var field = fields[fi];
        var val = selRect[field];
        var colX = 20 + (fi % 2) * 350;
        var rowOff = Math.floor(fi / 2) * 65;

        // 字段名
        ctx.fillStyle = '#8892B0'; ctx.font = '14px Arial'; ctx.textAlign = 'left';
        ctx.fillText(field.toUpperCase() + ':', colX, rowY + rowOff);

        // - 按钮
        ctx.fillStyle = '#FF5252';
        ctx.beginPath(); this._rr(ctx, colX, rowY + rowOff + 8, 50, 36, 6); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
        ctx.fillText('-', colX + 25, rowY + rowOff + 33);

        // 数值
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(val), colX + 120, rowY + rowOff + 35);

        // + 按钮
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath(); this._rr(ctx, colX + 170, rowY + rowOff + 8, 50, 36, 6); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px Arial';
        ctx.fillText('+', colX + 195, rowY + rowOff + 33);

        // 存储按钮区域供点击检测
        if (!this._propButtons) this._propButtons = [];
        this._propButtons.push({
          field: field, type: 'minus',
          x: colX, y: rowY + rowOff + 8, w: 50, h: 36
        });
        this._propButtons.push({
          field: field, type: 'plus',
          x: colX + 170, y: rowY + rowOff + 8, w: 50, h: 36
        });
      }

      // 步长调整
      var stepY = rowY + Math.ceil(fields.length / 2) * 65 + 10;
      ctx.fillStyle = '#8892B0'; ctx.font = '13px Arial'; ctx.textAlign = 'left';
      ctx.fillText('\u6B65\u957F:', 20, stepY + 14);

      var steps = [1, 5, 10, 20, 50];
      for (var si = 0; si < steps.length; si++) {
        var sx2 = 80 + si * 55;
        ctx.fillStyle = this._layoutStep === steps[si] ? '#7C4DFF' : '#2A2A3E';
        ctx.beginPath(); this._rr(ctx, sx2, stepY, 48, 28, 5); ctx.fill();
        ctx.fillStyle = this._layoutStep === steps[si] ? '#FFF' : '#8892B0';
        ctx.font = '13px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(steps[si]), sx2 + 24, stepY + 19);
        if (!this._stepButtons) this._stepButtons = [];
        this._stepButtons.push({ value: steps[si], x: sx2, y: stepY, w: 48, h: 28 });
      }

      // 提示
      ctx.fillStyle = '#546E7A'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
      ctx.fillText('\u70B9\u51FB\u9884\u89C8\u56FE\u4E2D\u5143\u7D20\u62D6\u62FD\u79FB\u52A8 / \u62D6\u53F3\u4E0B\u89D2\u8C03\u6574\u5927\u5C0F / \u7528\u6309\u94AE\u7CBE\u786E\u8C03\u6574', 360, stepY + 55);

    } else {
      ctx.fillStyle = '#546E7A'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
      ctx.fillText('\u70B9\u51FB\u9884\u89C8\u56FE\u4E2D\u7684\u5143\u7D20\u8FDB\u884C\u7F16\u8F91', 360, propY + 50);
      ctx.font = '13px Arial';
      ctx.fillText('\u62D6\u62FD\u79FB\u52A8\u4F4D\u7F6E / \u62D6\u53F3\u4E0B\u89D2\u8C03\u6574\u5927\u5C0F', 360, propY + 80);
    }
  }

  // ===== 实时预览模式（全尺寸渲染场景 + 可编辑覆盖层） =====
  _renderLivePreview(ctx, x, y, w, h) {
    var scene = this._getScene();
    if (!scene || !scene.layout) return;
    var layout = scene.layout;

    // 计算缩放：将720x1280适配到编辑器区域
    var scale = Math.min((w - 10) / 720, (h - 10) / 1280);
    var previewW = Math.round(720 * scale);
    var previewH = Math.round(1280 * scale);
    var previewX = x + (w - previewW) / 2;
    var previewY = y;

    // 存储预览信息（供点击检测用）
    this._previewInfo = { scale: scale, x: previewX, y: previewY, w: previewW, h: previewH, live: true };

    // ===== 渲染实际场景画面 =====
    ctx.save();
    ctx.beginPath();
    this._rr(ctx, previewX, previewY, previewW, previewH, 4);
    ctx.clip();

    // 绘制背景
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(previewX, previewY, previewW, previewH);

    if (scene.assets && scene.assets.renderSceneBg) {
      scene.assets.renderSceneBg(ctx, previewX, previewY, previewW, previewH);
    }

    // 尝试渲染完整场景（如果场景有render方法）
    if (typeof scene.render === 'function') {
      // 临时调整ctx变换来渲染到预览区域
      ctx.translate(previewX, previewY);
      ctx.scale(scale, scale);
      scene.render(ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ===== 编辑覆盖层：高亮选中元素、绘制手柄 =====
    for (var i = 0; i < this._layoutItems.length; i++) {
      var item = this._layoutItems[i];
      var rect = layout[item.key];
      if (!rect) continue;

      var rx = previewX + rect.x * scale;
      var ry = previewY + rect.y * scale;
      var rw = (rect.w || 80) * scale;
      var rh = (rect.h || 40) * scale;
      var isSelected = (this.selectedLayoutItem === item.key);

      // 只画边框，不填充（不遮挡游戏画面）
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);
        ctx.setLineDash([]);

        // 调整手柄
        var handleSize = Math.max(8, 12 * scale);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(rx + rw - handleSize, ry + rh - handleSize, handleSize, handleSize);
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.strokeRect(rx + rw - handleSize, ry + rh - handleSize, handleSize, handleSize);

        // 元素标签
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(rx, ry - 20, item.label.length * 12 + 16, 18);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, rx + 6, ry - 6);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);
      }

      item._screenRect = { x: rx, y: ry, w: rw, h: rh };
    }

    // 槽位网格标注
    if (layout.slotsStart) {
      var sx = previewX + layout.slotsStart.x * scale;
      var sy = previewY + layout.slotsStart.y * scale;
      var sw = layout.slotSize.w * scale;
      var sh = layout.slotSize.h * scale;
      var sg = layout.slotGap * scale;
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < (layout.slotCols || 4); col++) {
          ctx.strokeRect(sx + col * (sw + sg), sy + row * (sh + sg), sw, sh);
        }
      }
      ctx.setLineDash([]);
    }

    ctx.restore();

    // ===== 底部属性面板（紧凑版） =====
    var propY = previewY + previewH + 8;
    ctx.fillStyle = '#16213E';
    ctx.fillRect(x, propY, w, y + h - propY + 40);

    if (this.selectedLayoutItem && layout[this.selectedLayoutItem]) {
      var selRect = layout[this.selectedLayoutItem];
      var itemLabel = '';
      for (var li = 0; li < this._layoutItems.length; li++) {
        if (this._layoutItems[li].key === this.selectedLayoutItem) { itemLabel = this._layoutItems[li].label; break; }
      }

      ctx.fillStyle = '#7C4DFF'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'left';
      ctx.fillText(itemLabel + ' (' + this.selectedLayoutItem + ')', 15, propY + 22);

      // 单行属性：x / y / w / h 横排
      var fields = ['x', 'y'];
      if (selRect.w !== undefined) fields.push('w');
      if (selRect.h !== undefined) fields.push('h');

      var fieldX = 15;
      for (var fi = 0; fi < fields.length; fi++) {
        var fld = fields[fi];
        var val = selRect[fld] || 0;

        ctx.fillStyle = '#8892B0'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
        ctx.fillText(fld.toUpperCase() + ':', fieldX, propY + 42);

        // -
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(fieldX, propY + 48, 28, 24);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
        ctx.fillText('-', fieldX + 14, propY + 65);

        // 值
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial';
        ctx.fillText(String(val), fieldX + 38, propY + 65);

        // +
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(fieldX + 85, propY + 48, 28, 24);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial';
        ctx.fillText('+', fieldX + 99, propY + 65);

        // 存储按钮区域
        if (!this._propButtons) this._propButtons = [];
        this._propButtons.push({ field: fld, type: 'minus', live: true, x: fieldX, y: propY + 48, w: 28, h: 24 });
        this._propButtons.push({ field: fld, type: 'plus', live: true, x: fieldX + 85, y: propY + 48, w: 28, h: 24 });

        fieldX += 140;
      }

      // 步长
      ctx.fillStyle = '#8892B0'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
      ctx.fillText('\u6B65\u957F:', 15, propY + 90);
      var steps2 = [1, 5, 10, 20, 50];
      for (var si2 = 0; si2 < steps2.length; si2++) {
        var sxx = 55 + si2 * 42;
        ctx.fillStyle = this._layoutStep === steps2[si2] ? '#7C4DFF' : '#2A2A3E';
        ctx.fillRect(sxx, propY + 78, 36, 22);
        ctx.fillStyle = this._layoutStep === steps2[si2] ? '#FFF' : '#8892B0';
        ctx.font = '11px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(steps2[si2]), sxx + 18, propY + 93);
        if (!this._stepButtons) this._stepButtons = [];
        this._stepButtons.push({ value: steps2[si2], live: true, x: sxx, y: propY + 78, w: 36, h: 22 });
      }
    } else {
      ctx.fillStyle = '#546E7A'; ctx.font = '13px Arial'; ctx.textAlign = 'center';
      ctx.fillText('\u70B9\u51FB\u753B\u9762\u4E2D\u7684\u5143\u7D20\u62D6\u62FD\u79FB\u52A8\uFF0C\u53F3\u4E0B\u89D2\u8C03\u6574\u5927\u5C0F', x + w / 2, propY + 30);
      ctx.font = '11px Arial';
      ctx.fillText('\u5207\u6362\u5230 [ \u7F29\u7565\u56FE\u6A21\u5F0F ] \u53EF\u67E5\u770B\u5168\u5C40', x + w / 2, propY + 50);
    }
  }

  // ==================== 素材标签页 ====================
  _renderAssetsTab(ctx, x, y, w, h) {
    // 说明
    ctx.fillStyle = '#7C4DFF'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
    ctx.fillText('\u70B9\u51FB\u7D20\u6750\u9879\u4E0A\u4F20\u56FE\u7247\u66FF\u6362', 20, y + 22);
    ctx.fillStyle = '#546E7A'; ctx.font = '12px Arial';
    ctx.fillText('\u56FE\u7247\u5C06\u81EA\u52A8\u4FDD\u5B58\u5230\u5BF9\u5E94\u76EE\u5F55\uFF0C\u5237\u65B0\u540E\u751F\u6548', 20, y + 42);

    // 可滚动区域
    var listAreaY = y + 55;
    var listAreaH = h - 70; // 留出底部提示空间

    // 裁剪，防止内容溢出
    ctx.save();
    ctx.beginPath();
    this._rr(ctx, x, listAreaY, w, listAreaH, 0);
    ctx.clip();

    // 计算总高度以确定滚动范围
    var totalH = 0;
    var prevCat = '';
    for (var ti = 0; ti < this._assetList.length; ti++) {
      var ta = this._assetList[ti];
      if (ta.category !== prevCat) { totalH += 24; prevCat = ta.category; }
      totalH += 60; // rowH + gap
    }

    // 滚动范围限制
    this._assetsMaxScroll = Math.max(0, totalH - listAreaH);
    if (this._assetsScroll > this._assetsMaxScroll) this._assetsScroll = this._assetsMaxScroll;
    if (this._assetsScroll < 0) this._assetsScroll = 0;

    // 素材列表（带滚动偏移）
    var listY = listAreaY - this._assetsScroll;
    var currentCat = '';

    for (var i = 0; i < this._assetList.length; i++) {
      var asset = this._assetList[i];

      // 分组标题
      if (asset.category !== currentCat) {
        currentCat = asset.category;
        ctx.fillStyle = '#7C4DFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left';
        ctx.fillText('[ ' + currentCat + ' ]', 20, listY + 14);
        listY += 24;
      }

      // 跳过不可见项（性能优化）
      if (listY + 55 < listAreaY || listY > listAreaY + listAreaH) {
        listY += 60; continue;
      }

      var isSelected = (this.selectedAsset === asset.key);
      var rowH = 55;

      // 行背景
      ctx.fillStyle = isSelected ? '#1E3A5F' : '#16213E';
      ctx.fillRect(10, listY, 700, rowH);
      if (isSelected) {
        ctx.strokeStyle = '#7C4DFF'; ctx.lineWidth = 2;
        ctx.strokeRect(10, listY, 700, rowH);
      }

      // 图标预览区域
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(20, listY + 5, 45, 45);
      ctx.strokeStyle = '#30363D'; ctx.lineWidth = 1;
      ctx.strokeRect(20, listY + 5, 45, 45);

      // 检查素材是否已替换（有自定义图）
      var hasCustom = this._checkAssetExists(asset.key);
      if (hasCustom) {
        ctx.fillStyle = '#4CAF50'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
        ctx.fillText('\u2713', 42, listY + 32);
      } else {
        ctx.fillStyle = '#546E7A'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
        ctx.fillText('\u7A7A', 42, listY + 32);
      }

      // 名称
      ctx.fillStyle = '#E0E0E0'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left';
      ctx.fillText(asset.label, 75, listY + 20);

      // 尺寸
      ctx.fillStyle = '#546E7A'; ctx.font = '11px Arial';
      ctx.fillText(asset.size + 'px', 75, listY + 38);

      // 路径
      ctx.fillStyle = '#3D5A80'; ctx.font = '10px Arial';
      ctx.fillText(asset.path, 200, listY + 38);

      // 上传按钮
      ctx.fillStyle = '#2196F3';
      ctx.beginPath(); this._rr(ctx, 580, listY + 10, 110, 35, 6); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      ctx.fillText('\u4E0A\u4F20\u66FF\u6362', 635, listY + 32);

      // 存储行区域（存储的是屏幕坐标，点击检测需要考虑scroll偏移）
      asset._rowRect = { x: 10, y: listY, w: 700, h: rowH };
      asset._uploadBtnRect = { x: 580, y: listY + 10, w: 110, h: 35 };

      listY += rowH + 5;
    }

    ctx.restore();

    // 滚动条指示器
    if (this._assetsMaxScroll > 0) {
      var barX = x + w - 8;
      var barH = Math.max(30, listAreaH * (listAreaH / totalH));
      var barY = listAreaY + (this._assetsScroll / this._assetsMaxScroll) * (listAreaH - barH);
      ctx.fillStyle = 'rgba(124,77,255,0.5)';
      ctx.beginPath(); this._rr(ctx, barX, barY, 6, barH, 3); ctx.fill();
    }

    // 底部提示
    ctx.fillStyle = '#546E7A'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('\u63D0\u793A: \u4E5F\u53EF\u76F4\u63A5\u5C06\u56FE\u7247\u653E\u5165\u5BF9\u5E94\u76EE\u5F55\uFF0C\u5237\u65B0\u9875\u9762\u5373\u53EF\u751F\u6548 \u00B7 \u53EF\u4EE5\u5728\u7D20\u6750\u533A\u57DF\u4E0A/\u4E0B\u6ED1\u52A8\u6EDA\u52A8', 360, y + h - 10);
  }

  _checkAssetExists(key) {
    var asset = null;
    for (var i = 0; i < this._assetList.length; i++) {
      if (this._assetList[i].key === key) { asset = this._assetList[i]; break; }
    }
    if (!asset) return false;
    // 检查localStorage中是否有自定义素材
    try {
      return !!localStorage.getItem('merge_racer_asset_' + key);
    } catch (e) { return false; }
  }

  // ==================== 数值标签页 ====================
  _renderValuesTab(ctx, x, y, w, h) {
    this._propButtons = [];
    var currentY = y + 10;
    var currentGroup = '';

    for (var ci = 0; ci < this.editableComponents.length; ci++) {
      var comp = this.editableComponents[ci];
      if (currentY > y + h - 30) break;

      if (comp.group !== currentGroup) {
        currentGroup = comp.group;
        ctx.fillStyle = '#7C4DFF'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'left';
        ctx.fillText('[ ' + currentGroup + ' ]', 20, currentY + 16);
        currentY += 26;
      }

      var value = this._getByPath(window.GameConfig, comp.path);
      var isSelected = (this.selectedComponent === comp.id);

      // 标签
      ctx.fillStyle = isSelected ? '#FFD700' : '#B0BEC5'; ctx.font = '14px Arial'; ctx.textAlign = 'left';
      ctx.fillText(comp.label, 25, currentY + 16);

      // - 按钮
      ctx.fillStyle = '#FF5252';
      ctx.beginPath(); this._rr(ctx, 420, currentY, 40, 24, 4); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillText('-', 440, currentY + 17);

      // 值
      ctx.fillStyle = '#1E1E2E';
      ctx.beginPath(); this._rr(ctx, 470, currentY, 130, 24, 4); ctx.fill();
      ctx.strokeStyle = isSelected ? '#7C4DFF' : '#455A64'; ctx.lineWidth = 1;
      ctx.beginPath(); this._rr(ctx, 470, currentY, 130, 24, 4); ctx.stroke();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'right';
      ctx.fillText(String(value ?? '?'), 595, currentY + 17);

      // + 按钮
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath(); this._rr(ctx, 610, currentY, 40, 24, 4); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillText('+', 630, currentY + 17);

      // 存储按钮区域
      this._propButtons.push({ compId: comp.id, type: 'minus', x: 420, y: currentY, w: 40, h: 24 });
      this._propButtons.push({ compId: comp.id, type: 'plus', x: 610, y: currentY, w: 40, h: 24 });

      currentY += 32;
    }
  }

  // ==================== 规则标签页 ====================
  _renderRulesTab(ctx, x, y, w, h) {
    var rules = [
      { label: '\u5408\u6210\u89C4\u5219', desc: '2\u8F86\u540C\u7B49\u7EA7 \u2192 1\u8F86\u9AD81\u7EA7' },
      { label: '\u6536\u76CA\u516C\u5F0F', desc: '\u91D1\u5E01/\u79D2 = base \u00D7 level^exp' },
      { label: '\u653B\u51FB\u529B\u516C\u5F0F', desc: 'ATK = atkBase \u00D7 level^atkExp' },
      { label: '\u8840\u91CF\u516C\u5F0F', desc: 'HP = hpBase \u00D7 level^hpExp' },
      { label: '\u8D2D\u4E70\u4EF7\u683C\u516C\u5F0F', desc: '\u4EF7\u683C = base \u00D7 mult^\u6B21\u6570' },
      { label: '\u901A\u5173\u5956\u52B1\u516C\u5F0F', desc: '\u91D1\u5E01 = base + \u5173\u5361\u00D7\u589E\u91CF' },
      { label: '\u654C\u65B9\u5C5E\u6027\u516C\u5F0F', desc: 'HP/ATK = base \u00D7 (1+\u5173\u5361\u00D7\u7CFB\u6570)' },
      { label: '\u78B0\u649E\u4F24\u5BB3\u89C4\u5219', desc: '\u73A9\u5BB6\u649E\u654C = \u654CATK \u00D7 \u78B0\u649E\u7CFB\u6570' },
    ];

    var currentY = y + 20;
    for (var ri = 0; ri < rules.length; ri++) {
      if (currentY > y + h - 40) break;
      ctx.fillStyle = '#E0E0E0'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
      ctx.fillText(rules[ri].label, 25, currentY + 14);
      ctx.fillStyle = '#9E9E9E'; ctx.font = '14px Arial';
      ctx.fillText(rules[ri].desc, 30, currentY + 36);
      currentY += 55;
    }
  }

  // ==================== 事件处理 ====================
  handleClick(pos) {
    if (!this.visible) {
      // 编辑器开关
      if (pos.x > 670 && pos.x < 720 && pos.y > 1240 && pos.y < 1280) {
        this.toggle();
        return true;
      }
      return false;
    }

    // 清空按钮区域缓存
    this._propButtons = [];
    this._stepButtons = [];

    // 关闭按钮 (X)
    if (pos.x >= 670 && pos.x <= 710 && pos.y >= 8 && pos.y <= 42) {
      this.visible = false;
      return true;
    }

    // 标签页切换
    if (pos.y >= 50 && pos.y <= 90) {
      var tabIdx = Math.floor(pos.x / (720 / 4));
      var tabs = ['layout', 'assets', 'values', 'rules'];
      if (tabIdx >= 0 && tabIdx < 4) {
        this.activeTab = tabs[tabIdx];
        this.selectedLayoutItem = null;
        this.selectedAsset = null;
      }
      return true;
    }

    // 布局页 - 模式切换按钮
    if (this.activeTab === 'layout' && pos.y >= 95 && pos.y <= 127) {
      if (pos.x >= 10 && pos.x <= 170) {
        this.liveMode = !this.liveMode;
        this.selectedLayoutItem = null;
        return true;
      }
    }

    // 底部按钮
    var barY = 1230;
    if (pos.y >= barY + 8 && pos.y <= barY + 42) {
      if (pos.x >= 20 && pos.x <= 180) {
        this._applyChanges();
      } else if (pos.x >= 200 && pos.x <= 360) {
        this._resetChanges();
      } else if (pos.x >= 380 && pos.x <= 540) {
        this._exportCode();
      } else if (pos.x >= 560 && pos.x <= 700) {
        this.visible = false;
      }
      return true;
    }

    // 布局页处理
    if (this.activeTab === 'layout') {
      return this._handleLayoutClick(pos);
    }

    // 素材页处理
    if (this.activeTab === 'assets') {
      return this._handleAssetsClick(pos);
    }

    // 数值页处理
    if (this.activeTab === 'values') {
      return this._handleValuesClick(pos);
    }

    return true;
  }

  _handleLayoutClick(pos) {
    var scene = this._getScene();
    if (!scene || !scene.layout) return true;
    var layout = scene.layout;
    var pi = this._previewInfo;
    if (!pi) return true;

    // 检查属性面板的 +/- 按钮（需要先渲染一遍才能有数据，这里做检测）
    if (this.selectedLayoutItem && layout[this.selectedLayoutItem]) {
      var selRect = layout[this.selectedLayoutItem];
      var fields = ['x', 'y'];
      if (selRect.w !== undefined) fields.push('w');
      if (selRect.h !== undefined) fields.push('h');

      // 根据模式确定属性面板位置
      var propY;
      if (this.liveMode && pi.live) {
        propY = pi.y + pi.h + 8;
        // 实时预览模式的属性面板按钮检测（横排紧凑版）
        for (var fi2 = 0; fi2 < fields.length; fi2++) {
          var fld2 = fields[fi2];
          var fX = 15 + fi2 * 140;

          // minus
          if (pos.x >= fX && pos.x <= fX + 28 &&
              pos.y >= propY + 48 && pos.y <= propY + 72) {
            selRect[fld2] = Math.max(0, (selRect[fld2] || 0) - this._layoutStep);
            return true;
          }
          // plus
          if (pos.x >= fX + 85 && pos.x <= fX + 113 &&
              pos.y >= propY + 48 && pos.y <= propY + 72) {
            selRect[fld2] = (selRect[fld2] || 0) + this._layoutStep;
            return true;
          }
        }
        // 步长按钮
        var stepBtnY = propY + 78;
        for (var si3 = 0; si3 < [1,5,10,20,50].length; si3++) {
          var sxx3 = 55 + si3 * 42;
          if (pos.x >= sxx3 && pos.x <= sxx3 + 36 && pos.y >= stepBtnY && pos.y <= stepBtnY + 22) {
            this._layoutStep = [1,5,10,20,50][si3];
            return true;
          }
        }
        // 不继续到下面的缩略图逻辑
        return this._checkLivePreviewClick(pos, pi, layout);
      }

      // 重建按钮位置（缩略图模式）
      var propY = pi.y + pi.h + 15 + 50;
      for (var fi = 0; fi < fields.length; fi++) {
        var field = fields[fi];
        var colX = 20 + (fi % 2) * 350;
        var rowOff = Math.floor(fi / 2) * 65;

        // minus按钮
        if (pos.x >= colX && pos.x <= colX + 50 &&
            pos.y >= propY + rowOff + 8 && pos.y <= propY + rowOff + 44) {
          selRect[field] = Math.max(0, (selRect[field] || 0) - this._layoutStep);
          return true;
        }
        // plus按钮
        if (pos.x >= colX + 170 && pos.x <= colX + 220 &&
            pos.y >= propY + rowOff + 8 && pos.y <= propY + rowOff + 44) {
          selRect[field] = (selRect[field] || 0) + this._layoutStep;
          return true;
        }
      }

      // 步长按钮
      var steps = [1, 5, 10, 20, 50];
      var stepBtnY = propY + Math.ceil(fields.length / 2) * 65 + 10;
      for (var si = 0; si < steps.length; si++) {
        var sx = 80 + si * 55;
        if (pos.x >= sx && pos.x <= sx + 48 && pos.y >= stepBtnY && pos.y <= stepBtnY + 28) {
          this._layoutStep = steps[si];
          return true;
        }
      }
    }

    // 预览区域 - 选中元素 / 开始拖拽
    if (pos.x >= pi.x && pos.x <= pi.x + pi.w && pos.y >= pi.y && pos.y <= pi.y + pi.h) {
      var layoutScale = pi.scale;
      // 转换为画布坐标
      var canvasX = (pos.x - pi.x) / layoutScale;
      var canvasY = (pos.y - pi.y) / layoutScale;

      // 如果已选中，检查是否点在调整手柄上（右下角）
      if (this.selectedLayoutItem && layout[this.selectedLayoutItem]) {
        var sr = layout[this.selectedLayoutItem];
        var handleX = sr.x + (sr.w || 80);
        var handleY = sr.y + (sr.h || 40);
        if (Math.abs(canvasX - handleX) < 20 && Math.abs(canvasY - handleY) < 20) {
          // 开始调整大小
          this._layoutDrag = {
            type: 'resize', key: this.selectedLayoutItem,
            startX: canvasX, startY: canvasY,
            origRect: { x: sr.x, y: sr.y, w: sr.w || 80, h: sr.h || 40 }
          };
          return true;
        }
      }

      // 检查点击了哪个元素（倒序，上层优先）
      for (var li = this._layoutItems.length - 1; li >= 0; li--) {
        var item = this._layoutItems[li];
        var rect = layout[item.key];
        if (!rect) continue;
        var rw = rect.w || 80;
        var rh = rect.h || 40;
        if (canvasX >= rect.x && canvasX <= rect.x + rw &&
            canvasY >= rect.y && canvasY <= rect.y + rh) {
          this.selectedLayoutItem = item.key;
          // 开始移动拖拽
          this._layoutDrag = {
            type: 'move', key: item.key,
            startX: canvasX, startY: canvasY,
            origRect: { x: rect.x, y: rect.y, w: rect.w || 80, h: rect.h || 40 }
          };
          return true;
        }
      }

      // 点击空白处取消选中
      this.selectedLayoutItem = null;
      return true;
    }

    // 实时预览模式：检查预览区点击
    if (this.liveMode && pi.live) {
      return this._checkLivePreviewClick(pos, pi, layout);
    }

    return true;
  }

  // ===== 实时预览模式点击检测 =====
  _checkLivePreviewClick(pos, pi, layout) {
    var layoutScale = pi.scale;
    var canvasX = (pos.x - pi.x) / layoutScale;
    var canvasY = (pos.y - pi.y) / layoutScale;

    // 检查是否在预览区域内
    if (canvasX < 0 || canvasX > 720 || canvasY < 0 || canvasY > 1280) return true;

    // 调整手柄
    if (this.selectedLayoutItem && layout[this.selectedLayoutItem]) {
      var sr = layout[this.selectedLayoutItem];
      var handleX = sr.x + (sr.w || 80);
      var handleY = sr.y + (sr.h || 40);
      if (Math.abs(canvasX - handleX) < 30 / scale && Math.abs(canvasY - handleY) < 30 / scale) {
        this._layoutDrag = {
          type: 'resize', key: this.selectedLayoutItem,
          startX: canvasX, startY: canvasY,
          origRect: { x: sr.x, y: sr.y, w: sr.w || 80, h: sr.h || 40 }
        };
        return true;
      }
    }

    // 元素选中/拖拽（倒序）
    for (var li = this._layoutItems.length - 1; li >= 0; li--) {
      var item2 = this._layoutItems[li];
      var rect2 = layout[item2.key];
      if (!rect2) continue;
      var rw = rect2.w || 80;
      var rh = rect2.h || 40;
      if (canvasX >= rect2.x && canvasX <= rect2.x + rw &&
          canvasY >= rect2.y && canvasY <= rect2.y + rh) {
        this.selectedLayoutItem = item2.key;
        this._layoutDrag = {
          type: 'move', key: item2.key,
          startX: canvasX, startY: canvasY,
          origRect: { x: rect2.x, y: rect2.y, w: rw, h: rh }
        };
        return true;
      }
    }

    this.selectedLayoutItem = null;
    return true;
  }

  handleMove(pos) {
    if (!this.visible) return;

    // 素材页：拖拽滚动
    if (this.activeTab === 'assets' && this._assetsDragStart) {
      var dy = pos.y - this._assetsDragStart.y;
      this._assetsScroll = this._assetsDragStart.scroll - dy;
      if (this._assetsScroll < 0) this._assetsScroll = 0;
      if (this._assetsScroll > this._assetsMaxScroll) this._assetsScroll = this._assetsMaxScroll;
      return;
    }

    // 数值页：拖拽滚动
    if (this.activeTab === 'values' && this._valuesDragStart) {
      var dvy = pos.y - this._valuesDragStart.y;
      this._valuesScroll = this._valuesDragStart.scroll - dvy;
      if (this._valuesScroll < 0) this._valuesScroll = 0;
      return;
    }

    if (this.activeTab !== 'layout' || !this._layoutDrag) return;
    var pi = this._previewInfo;
    if (!pi) return;

    var scene = this._getScene();
    if (!scene || !scene.layout) return;
    var layout = scene.layout;
    var rect = layout[this._layoutDrag.key];
    if (!rect) return;

    var layoutScale = pi.scale;
    var canvasX = (pos.x - pi.x) / layoutScale;
    var canvasY = (pos.y - pi.y) / layoutScale;
    var dx = canvasX - this._layoutDrag.startX;
    var dy = canvasY - this._layoutDrag.startY;
    var orig = this._layoutDrag.origRect;

    if (this._layoutDrag.type === 'move') {
      rect.x = Math.round(Math.max(0, Math.min(720 - (rect.w || 80), orig.x + dx)));
      rect.y = Math.round(Math.max(0, Math.min(1280 - (rect.h || 40), orig.y + dy)));
    } else if (this._layoutDrag.type === 'resize') {
      if (rect.w !== undefined) rect.w = Math.round(Math.max(20, orig.w + dx));
      if (rect.h !== undefined) rect.h = Math.round(Math.max(20, orig.h + dy));
    }
  }

  handleUp(pos) {
    this._layoutDrag = null;
    this._assetsDragStart = null;
    this._valuesDragStart = null;
  }

  // 滚轮/触摸滚动
  handleWheel(delta) {
    if (!this.visible) return;
    if (this.activeTab === 'assets') {
      this._assetsScroll += delta * 30;
      if (this._assetsScroll < 0) this._assetsScroll = 0;
      if (this._assetsScroll > this._assetsMaxScroll) this._assetsScroll = this._assetsMaxScroll;
    } else if (this.activeTab === 'values') {
      this._valuesScroll += delta * 20;
      if (this._valuesScroll < 0) this._valuesScroll = 0;
    }
  }

  // 触摸开始（用于滚动）
  handleTouchDown(pos) {
    if (!this.visible) return;
    // 素材页：记录拖拽起始位置
    if (this.activeTab === 'assets' && pos.y >= 155 && pos.y <= 1220) {
      this._assetsDragStart = { x: pos.x, y: pos.y, scroll: this._assetsScroll };
    }
    // 数值页
    if (this.activeTab === 'values' && pos.y >= 105 && pos.y <= 1220) {
      this._valuesDragStart = { y: pos.y, scroll: this._valuesScroll };
    }
  }

  _handleAssetsClick(pos) {
    // 检查上传按钮点击
    for (var i = 0; i < this._assetList.length; i++) {
      var asset = this._assetList[i];
      var btn = asset._uploadBtnRect;
      if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w &&
          pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        this._triggerAssetUpload(asset);
        return true;
      }
      // 行点击选中
      var row = asset._rowRect;
      if (row && pos.x >= row.x && pos.x <= row.x + row.w &&
          pos.y >= row.y && pos.y <= row.y + row.h) {
        this.selectedAsset = asset.key;
        return true;
      }
    }
    return true;
  }

  _triggerAssetUpload(asset) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpg,image/jpeg,image/webp';
    input.style.display = 'none';
    document.body.appendChild(input);

    var assetKey = asset.key;
    var assetPath = asset.path;

    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) { document.body.removeChild(input); return; }

      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var base64Data = ev.target.result;

          // 1. 保存到 localStorage（原样保存，不做任何缩放处理）
          localStorage.setItem('merge_racer_asset_' + assetKey, base64Data);

          // 2. 直接注入到 AssetConfig._loadedImages（确保立即生效）
          var img = new Image();
          img.onload = function() {
            if (window.AssetConfig) {
              // 清除旧的 pathKeyMap 缓存，强制下次重新生成
              window.AssetConfig._pathKeyMap = null;
              // 战车素材用独立key，避免污染制造场景的renderVehicle路径缓存
              if (assetKey.indexOf('battle_car_lv') === 0) {
                var lvNum = assetKey.replace('battle_car_lv', '');
                window.AssetConfig._loadedImages['battle_car_custom_' + lvNum] = img;
              } else {
                window.AssetConfig._loadedImages[assetPath] = img;
              }
              console.log('[Editor] OK: ' + assetKey + ' ' + img.naturalWidth + 'x' + img.naturalHeight);
            }
          };
          img.onerror = function() {
            console.error('[Editor] FAIL: ' + assetPath);
          };
          img.src = base64Data;

          alert('\u7D20\u6750\u5DF2\u66FF\u6362: ' + asset.label + '\uFF01');
        } catch (err) {
          alert('\u4FDD\u5B58\u5931\u8D25: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
      document.body.removeChild(input);
    });

    input.click();
  }

  _handleValuesClick(pos) {
    // 检查+/-按钮
    for (var i = 0; i < this.editableComponents.length; i++) {
      var comp = this.editableComponents[i];

      // 重建按钮位置（与渲染逻辑一致）
      var rowY = 95 + 10 + 10; // y起始
      // 简化: 使用当前鼠标位置匹配
    }

    // 更简单的方法：直接遍历检测区域
    var currentY = 95 + 10;
    var currentGroup = '';
    for (var ci = 0; ci < this.editableComponents.length; ci++) {
      var comp = this.editableComponents[ci];
      if (currentY > 95 + 1140 - 30) break;

      if (comp.group !== currentGroup) {
        currentGroup = comp.group;
        currentY += 26;
      }

      // minus按钮
      if (pos.x >= 420 && pos.x <= 460 && pos.y >= currentY && pos.y <= currentY + 24) {
        this._adjustValue(comp, -1);
        return true;
      }
      // plus按钮
      if (pos.x >= 610 && pos.x <= 650 && pos.y >= currentY && pos.y <= currentY + 24) {
        this._adjustValue(comp, 1);
        return true;
      }
      // 选中
      if (pos.x >= 25 && pos.x <= 650 && pos.y >= currentY && pos.y <= currentY + 24) {
        this.selectedComponent = comp.id;
        return true;
      }

      currentY += 32;
    }
    return true;
  }

  _adjustValue(comp, direction) {
    var value = this._getByPath(window.GameConfig, comp.path);
    var step = comp.step || 1;
    var min = comp.min !== undefined ? comp.min : -999999;
    var max = comp.max !== undefined ? comp.max : 999999;
    value = value + direction * step;
    value = Math.max(min, Math.min(max, value));
    // 如果是浮点步长，保留精度
    if (comp.step && comp.step < 1) {
      value = Math.round(value * 1000) / 1000;
    }
    this._setByPath(window.GameConfig, comp.path, value);
  }

  // ==================== 保存/重置/导出 ====================
  _applyChanges() {
    try {
      // 保存数值配置
      var customConfig = {};
      for (var i = 0; i < this.editableComponents.length; i++) {
        var comp = this.editableComponents[i];
        var value = this._getByPath(window.GameConfig, comp.path);
        this._setByPath(customConfig, comp.path, value);
      }
      localStorage.setItem('merge_racer_custom_config', JSON.stringify(customConfig));

      // 保存布局配置
      var scene = this._getScene();
      if (scene && scene.layout) {
        localStorage.setItem('merge_racer_custom_layout', JSON.stringify(scene.layout));
      }

      alert('\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF01\u5237\u65B0\u9875\u9762\u540E\u751F\u6548\u3002');
    } catch (e) {
      alert('\u4FDD\u5B58\u5931\u8D25: ' + e.message);
    }
  }

  _resetChanges() {
    if (this.configBackup) {
      Object.assign(window.GameConfig, JSON.parse(JSON.stringify(this.configBackup)));
    }
    var scene = this._getScene();
    if (scene && this.layoutBackup) {
      Object.assign(scene.layout, JSON.parse(JSON.stringify(this.layoutBackup)));
    }
    this.selectedLayoutItem = null;
  }

  _exportCode() {
    var scene = this._getScene();
    if (!scene || !scene.layout) {
      alert('\u573A\u666F\u672A\u52A0\u8F7D');
      return;
    }
    var layout = scene.layout;
    var code = '// \u590D\u5236\u4EE5\u4E0B\u5185\u5BB9\u5230 crafting-scene.js \u7684 this.layout \u5BF9\u8C61\nthis.layout = {\n';
    var keys = Object.keys(layout);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = layout[k];
      if (typeof v === 'object') {
        code += '  ' + k + ': { ' + Object.keys(v).map(function(vk) { return vk + ': ' + v[vk]; }).join(', ') + ' },\n';
      } else {
        code += '  ' + k + ': ' + v + ',\n';
      }
    }
    code += '};';

    // 复制到剪贴板
    try {
      navigator.clipboard.writeText(code).then(function() {
        alert('\u5E03\u5C40\u4EE3\u7801\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF01\n\u7C98\u8D34\u5230 crafting-scene.js \u7684 this.layout \u5BF9\u8C61\u5373\u53EF\u3002');
      });
    } catch (e) {
      // fallback
      var textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('\u5E03\u5C40\u4EE3\u7801\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF01');
    }
  }

  loadCustomConfig() {
    try {
      var saved = localStorage.getItem('merge_racer_custom_config');
      if (saved) {
        Object.assign(window.GameConfig, JSON.parse(saved));
      }
      // 加载自定义布局
      var savedLayout = localStorage.getItem('merge_racer_custom_layout');
      if (savedLayout) {
        var customLayout = JSON.parse(savedLayout);
        var scene = this._getScene();
        if (scene && scene.layout) {
          Object.assign(scene.layout, customLayout);
        }
      }
      // 加载自定义素材 - 注入到渲染系统的 _loadedImages 缓存
      var assetKeys = Object.keys(localStorage).filter(function(k) {
        return k.indexOf('merge_racer_asset_') === 0;
      });
      for (var i = 0; i < assetKeys.length; i++) {
        var key = assetKeys[i].replace('merge_racer_asset_', '');
        var data = localStorage.getItem(assetKeys[i]);
        // 查找对应的素材路径
        var assetPath = null;
        for (var j = 0; j < this._assetList.length; j++) {
          if (this._assetList[j].key === key) { assetPath = this._assetList[j].path; break; }
        }
        if (!assetPath && window.AssetConfig && window.AssetConfig._loadedImages) {
          // 尝试直接用key作为路径
          assetPath = key;
        }
        if (assetPath && data) {
          // 战车素材用独立key，避免污染制造场景renderVehicle的路径缓存
          if (key.indexOf('battle_car_lv') === 0) {
            var lvNum2 = key.replace('battle_car_lv', '');
            (function(battleKey, base64Data) {
              var img = new Image();
              img.onload = function() {
                if (window.AssetConfig && window.AssetConfig._loadedImages) {
                  window.AssetConfig._loadedImages[battleKey] = img;
                }
              };
              img.src = base64Data;
            })('battle_custom_' + lvNum2, data);
          } else {
            // 创建Image对象注入到渲染缓存
            (function(path, base64Data) {
              var img = new Image();
              img.onload = function() {
                if (window.AssetConfig && window.AssetConfig._loadedImages) {
                  window.AssetConfig._loadedImages[path] = img;
                }
              };
              img.src = base64Data;
            })(assetPath, data);
          }
        }
      }
    } catch (e) {
      console.warn('\u52A0\u8F7D\u81EA\u5B9A\u4E49\u914D\u7F6E\u5931\u8D25:', e);
    }
  }
}

if (typeof window !== 'undefined') {
  window.ComponentEditor = ComponentEditor;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentEditor;
}
