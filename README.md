# 不孤独的公路 (Lonely Road)

一款赛博朋克风格的合成 + 射击 + 闯关 Canvas 2D 游戏。

## 🎮 在线试玩

[点击这里在线游玩](https://singaporecloudary-sudo.github.io/Unlonely-Road/)

> 部署后请把上面的链接替换成你自己的 GitHub Pages 地址

## ✨ 核心玩法

- **合成模式**：拖动相同等级车辆合成更高级车（最高 LV.52）
- **闯关模式**：开车射击敌车 + Boss 战，每关随机赛道背景
- **无尽模式**：距离越远难度越高
- **无人机轰炸**：装备无人机后每关一次空袭支援
- **4 种 Boss 变体**：碎骨者 / 紫晶刺甲 / 暗影暴风 / 雷电黑帮（OK字弹幕）
- **4 种 Buff**：火力 / 护盾 / 加速（双倍弹幕）/ 回血

## 📱 设备支持

- ✅ 手机浏览器（竖屏 9:16）
- ✅ 桌面浏览器（Chrome / Edge / Firefox / Safari）
- ✅ 触摸 + 鼠标双重操作

## 🚀 本地运行

```bash
# 任选一个本地 HTTP 服务器
python -m http.server 9090
# 或
npx serve
```

然后浏览器打开 http://localhost:9090

## 🛠 技术栈

- 纯前端：HTML5 Canvas 2D + JavaScript（无框架）
- 程序化合成音效（Web Audio API）
- 无后端依赖，可部署到任何静态托管平台

## 📂 项目结构

```
├── index.html              # 入口（含登录页）
├── config/                 # 游戏数值配置
│   ├── game-config.js      # 关卡/Buff/Boss 数值
│   └── asset-config.js     # 资源路径映射
├── src/
│   ├── core/               # 引擎/状态/音频
│   ├── modules/            # 合成场景 + 战斗场景
│   └── editor/             # 美术资源上传编辑器
├── assets/                 # 图片资源
└── tools/                  # 美术辅助脚本
```

## 📄 License

仅供个人学习使用。
