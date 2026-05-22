/**
 * 合成飞车射击 - 音频管理器
 * 使用 Web Audio API 程序化合成所有音效（无需音频文件）
 *
 * 提供的音效：
 *  - bgm:        主界面背景音乐（循环赛博朋克氛围）
 *  - merge:      合成成功
 *  - shoot:      射击
 *  - hit:        子弹命中
 *  - explosion:  爆炸（敌车死亡）
 *  - buff:       拾取buff
 *  - click:      UI按钮点击
 */
(function() {
  'use strict';

  function AudioManager() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.muted = false;
    this.lastSfxTime = {}; // 节流：相同sfx最小间隔
  }

  /** 首次用户交互后才能创建AudioContext */
  AudioManager.prototype._ensureContext = function() {
    if (this.ctx) return true;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.25;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
      return true;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
      return false;
    }
  };

  /** 解锁音频（首次用户交互调用） */
  AudioManager.prototype.unlock = function() {
    if (this.unlocked) return;
    if (!this._ensureContext()) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
    // 解锁后自动启动挂起的BGM请求
    if (this.pendingBgmMode) {
      var mode = this.pendingBgmMode;
      this.pendingBgmMode = null;
      this.playBgm(mode);
    }
  };

  AudioManager.prototype.setMuted = function(m) {
    this.muted = !!m;
    if (this.masterGain) this.masterGain.gain.value = m ? 0 : 0.7;
  };

  AudioManager.prototype.setBgmVolume = function(v) {
    if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, v));
  };

  AudioManager.prototype.setSfxVolume = function(v) {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
  };

  // ========== 音效合成原语 ==========

  /** 创建ADSR包络 */
  AudioManager.prototype._envelope = function(gain, t0, attack, decay, sustain, release, peak) {
    if (peak == null) peak = 1;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.linearRampToValueAtTime(peak * sustain, t0 + attack + decay);
    gain.gain.linearRampToValueAtTime(0, t0 + attack + decay + release);
  };

  /** 创建噪声buffer（白噪声） */
  AudioManager.prototype._noiseBuffer = function(duration) {
    var len = Math.floor(this.ctx.sampleRate * duration);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  };

  // ========== 各种音效 ==========

  /** 射击：低音"砰"+高频"嘶"——重型激光炮风格 */
  AudioManager.prototype.shoot = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var now = this.ctx.currentTime;
    if (this.lastSfxTime.shoot && now - this.lastSfxTime.shoot < 0.05) return;
    this.lastSfxTime.shoot = now;

    var t = now;

    // 1) 低音冲击（sine 80→30Hz）—— "砰"的撞击感
    var subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
    var subG = this.ctx.createGain();
    this._envelope(subG, t, 0.002, 0.04, 0.3, 0.06, 0.35);
    subOsc.connect(subG); subG.connect(this.sfxGain);
    subOsc.start(t); subOsc.stop(t + 0.12);

    // 2) 主音（sawtooth 1400→200Hz 快速下扫）—— 激光"咻"
    var mainOsc = this.ctx.createOscillator();
    mainOsc.type = 'sawtooth';
    mainOsc.frequency.setValueAtTime(1400, t);
    mainOsc.frequency.exponentialRampToValueAtTime(200, t + 0.07);
    var mainFilt = this.ctx.createBiquadFilter();
    mainFilt.type = 'bandpass';
    mainFilt.frequency.setValueAtTime(1200, t);
    mainFilt.frequency.exponentialRampToValueAtTime(400, t + 0.07);
    mainFilt.Q.value = 6;
    var mainG = this.ctx.createGain();
    this._envelope(mainG, t, 0.003, 0.025, 0.25, 0.04, 0.22);
    mainOsc.connect(mainFilt); mainFilt.connect(mainG); mainG.connect(this.sfxGain);
    mainOsc.start(t); mainOsc.stop(t + 0.1);

    // 3) 高频"嘶"（短噪声爆破，营造能量释放感）
    var noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.04);
    var noiseFilt = this.ctx.createBiquadFilter();
    noiseFilt.type = 'highpass';
    noiseFilt.frequency.value = 3500;
    var noiseG = this.ctx.createGain();
    this._envelope(noiseG, t, 0.001, 0.012, 0.15, 0.025, 0.12);
    noise.connect(noiseFilt); noiseFilt.connect(noiseG); noiseG.connect(this.sfxGain);
    noise.start(t); noise.stop(t + 0.04);
  };

  /** 命中：清脆"叮"水滴感——金属铃铛+短促击打 */
  AudioManager.prototype.hit = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var now = this.ctx.currentTime;
    if (this.lastSfxTime.hit && now - this.lastSfxTime.hit < 0.03) return;
    this.lastSfxTime.hit = now;

    var t = now;
    // 1) 高频"叮"（sine 1800Hz短促铃声，类似水滴）
    var bell = this.ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1800, t);
    bell.frequency.exponentialRampToValueAtTime(1500, t + 0.08);
    var bellG = this.ctx.createGain();
    this._envelope(bellG, t, 0.002, 0.025, 0.3, 0.05, 0.18);
    bell.connect(bellG); bellG.connect(this.sfxGain);
    bell.start(t); bell.stop(t + 0.1);

    // 2) 谐波层（sine 2400Hz加丰富度）
    var harm = this.ctx.createOscillator();
    harm.type = 'sine';
    harm.frequency.setValueAtTime(2400, t);
    harm.frequency.exponentialRampToValueAtTime(1900, t + 0.06);
    var harmG = this.ctx.createGain();
    this._envelope(harmG, t, 0.002, 0.018, 0.2, 0.04, 0.1);
    harm.connect(harmG); harmG.connect(this.sfxGain);
    harm.start(t); harm.stop(t + 0.08);

    // 3) 极短低频"咚"（增加击打的实感，<10ms）
    var thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(180, t);
    thud.frequency.exponentialRampToValueAtTime(80, t + 0.03);
    var thudG = this.ctx.createGain();
    this._envelope(thudG, t, 0.001, 0.01, 0.15, 0.015, 0.18);
    thud.connect(thudG); thudG.connect(this.sfxGain);
    thud.start(t); thud.stop(t + 0.04);
  };

  /** 爆炸：温和低沉的"轰"——纯低频+柔和噪声，去除刺耳高频 */
  AudioManager.prototype.explosion = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var now = this.ctx.currentTime;
    if (this.lastSfxTime.explosion && now - this.lastSfxTime.explosion < 0.06) return;
    this.lastSfxTime.explosion = now;

    var t = now;

    // 1) 主体超低频"轰"（sine 100→25Hz, 0.6s）—— 主要body
    var subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(100, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.5);
    var subG = this.ctx.createGain();
    this._envelope(subG, t, 0.008, 0.1, 0.55, 0.4, 0.75);
    subOsc.connect(subG); subG.connect(this.sfxGain);
    subOsc.start(t); subOsc.stop(t + 0.6);

    // 2) 中频暖音（triangle 180→50Hz, 替代尖锐sawtooth）
    var midOsc = this.ctx.createOscillator();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(180, t);
    midOsc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
    var midG = this.ctx.createGain();
    this._envelope(midG, t, 0.005, 0.08, 0.4, 0.22, 0.4);
    midOsc.connect(midG); midG.connect(this.sfxGain);
    midOsc.start(t); midOsc.stop(t + 0.4);

    // 3) 柔和爆炸噪声（lowpass锁死1500Hz以下，绝不刺耳）
    var noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.55);
    var nFilt = this.ctx.createBiquadFilter();
    nFilt.type = 'lowpass';
    nFilt.frequency.setValueAtTime(1500, t);
    nFilt.frequency.exponentialRampToValueAtTime(150, t + 0.5);
    nFilt.Q.value = 0.7;
    // 加一层lowpass进一步削弱高频
    var nFilt2 = this.ctx.createBiquadFilter();
    nFilt2.type = 'lowpass';
    nFilt2.frequency.value = 2000;
    var nG = this.ctx.createGain();
    this._envelope(nG, t, 0.008, 0.1, 0.35, 0.42, 0.4);
    noise.connect(nFilt); nFilt.connect(nFilt2); nFilt2.connect(nG); nG.connect(this.sfxGain);
    noise.start(t); noise.stop(t + 0.55);

    // 4) 微弱回声（180ms后，bandpass 400Hz中频，温暖空间感）
    var echoT = t + 0.18;
    var echoNoise = this.ctx.createBufferSource();
    echoNoise.buffer = this._noiseBuffer(0.3);
    var echoFilt = this.ctx.createBiquadFilter();
    echoFilt.type = 'bandpass';
    echoFilt.frequency.value = 400;
    echoFilt.Q.value = 0.8;
    var echoG = this.ctx.createGain();
    this._envelope(echoG, echoT, 0.015, 0.08, 0.3, 0.2, 0.16);
    echoNoise.connect(echoFilt); echoFilt.connect(echoG); echoG.connect(this.sfxGain);
    echoNoise.start(echoT); echoNoise.stop(echoT + 0.3);
  };

  /** 合成成功：上扬和弦+闪光"叮" */
  AudioManager.prototype.merge = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var t = this.ctx.currentTime;

    // 三音和弦上扬（C5-E5-G5）
    var notes = [523.25, 659.25, 783.99, 1046.5];
    var self = this;
    notes.forEach(function(freq, i) {
      var osc = self.ctx.createOscillator();
      osc.type = 'triangle';
      var startT = t + i * 0.06;
      osc.frequency.setValueAtTime(freq * 0.5, startT);
      osc.frequency.linearRampToValueAtTime(freq, startT + 0.03);

      var g = self.ctx.createGain();
      self._envelope(g, startT, 0.01, 0.05, 0.5, 0.3, 0.22);
      osc.connect(g); g.connect(self.sfxGain);
      osc.start(startT); osc.stop(startT + 0.4);
    });

    // 闪光"叮"（高频铃声）
    var bell = this.ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.value = 2093; // C7
    var bellG = this.ctx.createGain();
    this._envelope(bellG, t + 0.25, 0.005, 0.05, 0.3, 0.4, 0.25);
    bell.connect(bellG); bellG.connect(this.sfxGain);
    bell.start(t + 0.25); bell.stop(t + 0.75);
  };

  /** 拾取buff：清脆"咔嚓"+上扬 */
  AudioManager.prototype.buff = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var t = this.ctx.currentTime;

    var osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.1);

    var g = this.ctx.createGain();
    this._envelope(g, t, 0.005, 0.04, 0.3, 0.1, 0.18);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.18);

    // 第二音
    var osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, t + 0.05);
    osc2.frequency.linearRampToValueAtTime(1500, t + 0.15);
    var g2 = this.ctx.createGain();
    this._envelope(g2, t + 0.05, 0.005, 0.03, 0.2, 0.1, 0.15);
    osc2.connect(g2); g2.connect(this.sfxGain);
    osc2.start(t + 0.05); osc2.stop(t + 0.25);
  };

  /** UI点击 */
  AudioManager.prototype.click = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var t = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    var g = this.ctx.createGain();
    this._envelope(g, t, 0.002, 0.02, 0.2, 0.02, 0.1);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.06);
  };

  /** 战斗胜利 — 上扬胜利号角 (C大调三连音: C-E-G-C') */
  AudioManager.prototype.victory = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var t = this.ctx.currentTime;
    var self = this;
    // 大调三和弦音阶 (C-E-G-C')，模拟胜利号角
    var notes = [
      { freq: 523.25, start: 0,    dur: 0.18 },  // C5
      { freq: 659.25, start: 0.12, dur: 0.18 },  // E5
      { freq: 783.99, start: 0.24, dur: 0.22 },  // G5
      { freq: 1046.5, start: 0.36, dur: 0.55 },  // C6（长音）
    ];

    notes.forEach(function(n) {
      // 主音（明亮的triangle+sawtooth叠加）
      var osc1 = self.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(n.freq, t + n.start);

      var osc2 = self.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(n.freq * 0.5, t + n.start);  // 低八度，更厚

      var g1 = self.ctx.createGain();
      self._envelope(g1, t + n.start, 0.008, 0.03, 0.5, 0.15, n.dur);
      var g2 = self.ctx.createGain();
      self._envelope(g2, t + n.start, 0.008, 0.03, 0.2, 0.15, n.dur);

      // 加一个高频谐波（铃铛感）
      var oscH = self.ctx.createOscillator();
      oscH.type = 'sine';
      oscH.frequency.setValueAtTime(n.freq * 2, t + n.start);
      var gH = self.ctx.createGain();
      self._envelope(gH, t + n.start, 0.005, 0.02, 0.15, 0.1, n.dur);

      osc1.connect(g1); g1.connect(self.sfxGain);
      osc2.connect(g2); g2.connect(self.sfxGain);
      oscH.connect(gH); gH.connect(self.sfxGain);

      osc1.start(t + n.start); osc1.stop(t + n.start + n.dur + 0.1);
      osc2.start(t + n.start); osc2.stop(t + n.start + n.dur + 0.1);
      oscH.start(t + n.start); oscH.stop(t + n.start + n.dur + 0.1);
    });

    // 最后一记闪光叮（高频亮音）
    var sparkle = self.ctx.createOscillator();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(2093, t + 0.4);  // C7
    var sg = self.ctx.createGain();
    self._envelope(sg, t + 0.4, 0.005, 0.05, 0.3, 0.3, 0.5);
    sparkle.connect(sg); sg.connect(self.sfxGain);
    sparkle.start(t + 0.4); sparkle.stop(t + 0.95);
  };

  /** 战斗失败 — 下沉沮丧音 (小调下行: A-F-D，伴随低频沉响) */
  AudioManager.prototype.defeat = function() {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var t = this.ctx.currentTime;
    var self = this;

    // 三个下行小调音
    var notes = [
      { freq: 440,    start: 0,    dur: 0.28 },  // A4
      { freq: 349.23, start: 0.18, dur: 0.32 },  // F4
      { freq: 293.66, start: 0.40, dur: 0.85 },  // D4（长音延展）
    ];

    notes.forEach(function(n) {
      // 主音：triangle温暖音色
      var osc = self.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, t + n.start);
      // 后段轻微下滑（沮丧感）
      osc.frequency.exponentialRampToValueAtTime(n.freq * 0.94, t + n.start + n.dur);

      var g = self.ctx.createGain();
      self._envelope(g, t + n.start, 0.02, 0.05, 0.45, 0.3, n.dur);
      osc.connect(g); g.connect(self.sfxGain);
      osc.start(t + n.start); osc.stop(t + n.start + n.dur + 0.15);

      // 次低音（sub bass加重沉重感）
      var subOsc = self.ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(n.freq * 0.5, t + n.start);
      subOsc.frequency.exponentialRampToValueAtTime(n.freq * 0.42, t + n.start + n.dur);
      var sg = self.ctx.createGain();
      self._envelope(sg, t + n.start, 0.03, 0.06, 0.3, 0.3, n.dur);
      subOsc.connect(sg); sg.connect(self.sfxGain);
      subOsc.start(t + n.start); subOsc.stop(t + n.start + n.dur + 0.15);
    });

    // 末端一个失真低频"嗡"（mod模拟引擎熄火感）
    var subEnd = self.ctx.createOscillator();
    subEnd.type = 'sawtooth';
    subEnd.frequency.setValueAtTime(80, t + 0.5);
    subEnd.frequency.exponentialRampToValueAtTime(45, t + 1.3);
    var lp = self.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    var sgE = self.ctx.createGain();
    self._envelope(sgE, t + 0.5, 0.05, 0.1, 0.18, 0.6, 0.85);
    subEnd.connect(lp); lp.connect(sgE); sgE.connect(self.sfxGain);
    subEnd.start(t + 0.5); subEnd.stop(t + 1.4);
  };

  // ========== BGM：双模式（calm主界面 / battle战斗）==========

  /** BGM配置定义 */
  AudioManager.prototype._bgmConfigs = {
    calm: {
      stepDur: 0.3, // 较慢节奏100 BPM,放松
      // C大调五声音阶 + 大调和弦低音（轻松愉快）
      bass: [130.81, 130.81, 196, 130.81, 174.61, 174.61, 220, 196], // C3-G3-F3-A3
      melody: [
        [523.25, 0.3], // C5
        [659.25, 0.3], // E5
        [783.99, 0.3], // G5
        [659.25, 0.3], // E5
        [880, 0.3],    // A5
        [783.99, 0.3], // G5
        [659.25, 0.3], // E5
        [523.25, 0.3], // C5
        [587.33, 0.3], // D5
        [659.25, 0.3], // E5
        [783.99, 0.3], // G5
        [880, 0.3],    // A5
        [1046.5, 0.3], // C6
        [880, 0.3],    // A5
        [783.99, 0.3], // G5
        [659.25, 0.3], // E5
      ],
      bassFiltCutoff: 700,
      bassFiltQ: 2,
      bassWave: 'triangle', // 三角波温柔
      melodyWave: 'sine',   // sine最温柔
      kickStep: 4,
      snareStep: 8, // 极少snare
      drumIntensity: 0.4, // 鼓点很弱
    },
    battle: {
      stepDur: 0.18,
      bass: [82.41, 82.41, 82.41, 82.41, 110, 110, 92.5, 82.41],
      melody: [
        [659.25, 0.18], [987.77, 0.18], [659.25, 0.18], [880, 0.18],
        [987.77, 0.18], [1174.66, 0.18], [987.77, 0.18], [880, 0.18],
        [659.25, 0.18], [739.99, 0.18], [659.25, 0.18], [587.33, 0.18],
        [493.88, 0.18], [587.33, 0.18], [659.25, 0.18], [880, 0.18],
      ],
      bassFiltCutoff: 800,
      bassFiltQ: 6,
      bassWave: 'sawtooth',
      melodyWave: 'sawtooth',
      kickStep: 2,
      snareStep: 4,
      drumIntensity: 1.0,
      arpeggio: true,
    },
  };

  /** 启动BGM
   * @param {string} mode 'calm'(默认主界面) 或 'battle'(战斗)
   */
  AudioManager.prototype.playBgm = function(mode) {
    mode = mode || 'calm';
    // 未解锁时挂起请求，等unlock时自动启动
    if (!this.unlocked || !this.ctx) {
      this.pendingBgmMode = mode;
      return;
    }
    // 已在播且模式相同则忽略；模式不同需先停止
    if (this.bgmPlaying && this.bgmMode === mode) return;
    if (this.bgmPlaying) this.stopBgm();

    var cfg = this._bgmConfigs[mode] || this._bgmConfigs.calm;
    this.bgmPlaying = true;
    this.bgmMode = mode;
    this.bgmStep = 0;
    var self = this;

    var scheduleStep = function() {
      if (!self.bgmPlaying || !self.ctx) return;
      var t = self.ctx.currentTime;

      // 低音
      var bIdx = self.bgmStep % cfg.bass.length;
      var bFreq = cfg.bass[bIdx];
      if (bFreq > 0) {
        var bOsc = self.ctx.createOscillator();
        bOsc.type = cfg.bassWave;
        bOsc.frequency.value = bFreq;
        var bFilt = self.ctx.createBiquadFilter();
        bFilt.type = 'lowpass';
        bFilt.frequency.value = cfg.bassFiltCutoff;
        bFilt.Q.value = cfg.bassFiltQ;
        var bG = self.ctx.createGain();
        var bDur = cfg.stepDur * 1.2;
        self._envelope(bG, t, 0.01, 0.06, 0.4, bDur * 0.5, 0.5);
        bOsc.connect(bFilt); bFilt.connect(bG); bG.connect(self.bgmGain);
        bOsc.start(t); bOsc.stop(t + bDur + 0.05);
      }

      // 旋律
      var mIdx = self.bgmStep % cfg.melody.length;
      var mEntry = cfg.melody[mIdx];
      if (mEntry[0] > 0) {
        var mOsc = self.ctx.createOscillator();
        mOsc.type = cfg.melodyWave;
        mOsc.frequency.value = mEntry[0];
        // battle模式给旋律加滤波，柔化锯齿波刺耳感
        var mFilt = null;
        if (cfg.melodyWave === 'sawtooth') {
          mFilt = self.ctx.createBiquadFilter();
          mFilt.type = 'lowpass';
          mFilt.frequency.value = 2400;
          mFilt.Q.value = 2;
        }
        var mG = self.ctx.createGain();
        self._envelope(mG, t, 0.015, 0.06, 0.45, mEntry[1] * 0.6, 0.32);
        if (mFilt) {
          mOsc.connect(mFilt); mFilt.connect(mG);
        } else {
          mOsc.connect(mG);
        }
        mG.connect(self.bgmGain);
        mOsc.start(t); mOsc.stop(t + mEntry[1] + 0.05);

        // 谐波叠加
        var mOsc2 = self.ctx.createOscillator();
        mOsc2.type = 'sine';
        mOsc2.frequency.value = mEntry[0] * 2;
        var mG2 = self.ctx.createGain();
        self._envelope(mG2, t, 0.02, 0.06, 0.3, mEntry[1] * 0.5, 0.15);
        mOsc2.connect(mG2); mG2.connect(self.bgmGain);
        mOsc2.start(t); mOsc2.stop(t + mEntry[1] + 0.05);
      }

      // Kick
      if (self.bgmStep % cfg.kickStep === 0) {
        var kOsc = self.ctx.createOscillator();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(140, t);
        kOsc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        var kG = self.ctx.createGain();
        self._envelope(kG, t, 0.002, 0.05, 0.2, 0.05, 0.85 * cfg.drumIntensity);
        kOsc.connect(kG); kG.connect(self.bgmGain);
        kOsc.start(t); kOsc.stop(t + 0.13);
      }
      // Snare
      if (self.bgmStep % cfg.snareStep === Math.floor(cfg.snareStep / 2)) {
        var sNoise = self.ctx.createBufferSource();
        sNoise.buffer = self._noiseBuffer(0.1);
        var sFilt = self.ctx.createBiquadFilter();
        sFilt.type = 'highpass';
        sFilt.frequency.value = 1200;
        var sG = self.ctx.createGain();
        self._envelope(sG, t, 0.002, 0.03, 0.2, 0.07, 0.4 * cfg.drumIntensity);
        // 加snare body（triangle 200Hz）
        var sBody = self.ctx.createOscillator();
        sBody.type = 'triangle';
        sBody.frequency.setValueAtTime(220, t);
        sBody.frequency.exponentialRampToValueAtTime(120, t + 0.05);
        var sBodyG = self.ctx.createGain();
        self._envelope(sBodyG, t, 0.002, 0.03, 0.2, 0.05, 0.25 * cfg.drumIntensity);
        sNoise.connect(sFilt); sFilt.connect(sG); sG.connect(self.bgmGain);
        sBody.connect(sBodyG); sBodyG.connect(self.bgmGain);
        sNoise.start(t); sNoise.stop(t + 0.1);
        sBody.start(t); sBody.stop(t + 0.08);
      }
      // Hi-hat（每step）
      var hNoise = self.ctx.createBufferSource();
      hNoise.buffer = self._noiseBuffer(0.04);
      var hFilt = self.ctx.createBiquadFilter();
      hFilt.type = 'highpass';
      hFilt.frequency.value = 6500;
      var hG = self.ctx.createGain();
      self._envelope(hG, t, 0.001, 0.012, 0.08, 0.018, 0.13 * cfg.drumIntensity);
      hNoise.connect(hFilt); hFilt.connect(hG); hG.connect(self.bgmGain);
      hNoise.start(t); hNoise.stop(t + 0.04);

      // 战斗模式额外的"激进"层：每8步一次低频"轰"+琶音点缀
      if (cfg.arpeggio && self.bgmStep % 8 === 7) {
        var subOsc = self.ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(55, t);
        subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);
        var subG = self.ctx.createGain();
        self._envelope(subG, t, 0.005, 0.08, 0.4, 0.2, 0.65);
        subOsc.connect(subG); subG.connect(self.bgmGain);
        subOsc.start(t); subOsc.stop(t + 0.32);
      }

      self.bgmStep++;
    };

    this.bgmTimer = setInterval(scheduleStep, cfg.stepDur * 1000);
    scheduleStep();
  };

  AudioManager.prototype.stopBgm = function() {
    this.bgmPlaying = false;
    this.bgmMode = null;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  };

  // ========== 单例导出 ==========
  window.AudioManager = new AudioManager();

  // 全局首次交互解锁
  var unlockOnce = function() {
    window.AudioManager.unlock();
    window.removeEventListener('touchstart', unlockOnce);
    window.removeEventListener('mousedown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('touchstart', unlockOnce, { passive: true });
  window.addEventListener('mousedown', unlockOnce);
  window.addEventListener('keydown', unlockOnce);
})();
