#!/usr/bin/env python3
"""
合成飞车射击 - 一键导出脚本
支持: 网页版 / 安卓APK / 微信小游戏
"""

import os
import sys
import shutil
import json
import zipfile

# 项目根目录
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD_DIR = os.path.join(PROJECT_ROOT, 'build')
SOURCE_DIR = PROJECT_ROOT

def clean_build():
    """清理构建目录"""
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR, exist_ok=True)
    print("[✓] 构建目录已清理")

def copy_source_files(dest_dir):
    """复制源代码文件到目标目录"""
    excludes = {'build', 'export', 'node_modules', '.git', '__pycache__'}
    for item in os.listdir(SOURCE_DIR):
        if item in excludes or item.startswith('.'):
            continue
        src = os.path.join(SOURCE_DIR, item)
        dst = os.path.join(dest_dir, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    print(f"[✓] 源文件已复制到 {dest_dir}")

# ==================== 网页版导出 ====================
def export_web():
    """导出为可直接部署的网页版"""
    print("\n" + "="*50)
    print("  导出网页版...")
    print("="*50)

    web_dir = os.path.join(BUILD_DIR, 'web')
    os.makedirs(web_dir, exist_ok=True)

    copy_source_files(web_dir)

    # 生成精简版HTML（去除开发工具）
    html_path = os.path.join(web_dir, 'index.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 移除编辑器开关（生产版不需要）
    html = html.replace('<button id="editor-toggle" title="零代码编辑器">⚙</button>', '')
    html = html.replace('document.getElementById(\'editor-toggle\').addEventListener', '// editor toggle removed')

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # 创建ZIP包
    zip_path = os.path.join(BUILD_DIR, 'merge-racer-shooter-web.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(web_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, web_dir)
                zf.write(file_path, arcname)

    print(f"[✓] 网页版已导出:")
    print(f"    目录: {web_dir}")
    print(f"    ZIP:  {zip_path}")
    print(f"    部署: 将web目录内容上传至任意静态服务器即可")
    return web_dir

# ==================== 安卓APK导出 ====================
def export_android():
    """导出为安卓APK（使用TWA/PWA方案）"""
    print("\n" + "="*50)
    print("  导出安卓APK版...")
    print("="*50)

    android_dir = os.path.join(BUILD_DIR, 'android')
    os.makedirs(android_dir, exist_ok=True)
    web_assets_dir = os.path.join(android_dir, 'app', 'src', 'main', 'assets', 'www')
    os.makedirs(web_assets_dir, exist_ok=True)

    # 复制网页文件到assets
    copy_source_files(web_assets_dir)

    # 生成AndroidManifest.xml
    manifest_dir = os.path.join(android_dir, 'app', 'src', 'main')
    os.makedirs(manifest_dir, exist_ok=True)

    manifest = '''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.merge.racer.shooter"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="合成飞车射击"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="portrait"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>'''

    with open(os.path.join(manifest_dir, 'AndroidManifest.xml'), 'w', encoding='utf-8') as f:
        f.write(manifest)

    # 生成MainActivity.java (WebView方案)
    java_dir = os.path.join(manifest_dir, 'java', 'com', 'merge', 'racer', 'shooter')
    os.makedirs(java_dir, exist_ok=True)

    main_activity = '''package com.merge.racer.shooter;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/www/index.html");

        setContentView(webView);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    public void onBackPressed() {
        // 不退出,保持后台运行
        moveTaskToBack(true);
    }
}'''

    with open(os.path.join(java_dir, 'MainActivity.java'), 'w', encoding='utf-8') as f:
        f.write(main_activity)

    # 生成build.gradle
    gradle = '''plugins {
    id 'com.android.application'
}
android {
    namespace 'com.merge.racer.shooter'
    compileSdk 34
    defaultConfig {
        applicationId "com.merge.racer.shooter"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}'''

    with open(os.path.join(android_dir, 'app', 'build.gradle'), 'w', encoding='utf-8') as f:
        f.write(gradle)

    # 生成settings.gradle
    with open(os.path.join(android_dir, 'settings.gradle'), 'w', encoding='utf-8') as f:
        f.write('rootProject.name = "MergeRacerShooter"\ninclude \':app\'')

    # 生成项目级build.gradle
    with open(os.path.join(android_dir, 'build.gradle'), 'w', encoding='utf-8') as f:
        f.write('''plugins {
    id 'com.android.application' version '8.1.0' apply false
}''')

    # 生成gradle.properties
    with open(os.path.join(android_dir, 'gradle.properties'), 'w', encoding='utf-8') as f:
        f.write('android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2048m\n')

    # 生成README
    readme = """# 合成飞车射击 - 安卓版构建指南

## 前置要求
1. Android Studio (最新版)
2. JDK 17+

## 构建步骤
1. 用Android Studio打开此目录
2. 等待Gradle同步完成
3. Build → Build Bundle(s) / APK(s) → Build APK(s)
4. 生成的APK位于: app/build/outputs/apk/debug/

## 签名发布
1. Build → Generate Signed Bundle / APK
2. 创建或选择签名密钥
3. 选择release构建类型
4. 完成后获得可发布的APK

## 说明
- 游戏逻辑在assets/www/目录中
- 修改游戏内容只需替换该目录下的文件
- WebView加载本地HTML,无需网络(除非接入SDK)
"""
    with open(os.path.join(android_dir, 'README.md'), 'w', encoding='utf-8') as f:
        f.write(readme)

    print(f"[✓] 安卓项目已导出:")
    print(f"    目录: {android_dir}")
    print(f"    构建: 用Android Studio打开后Build APK")
    return android_dir

# ==================== 微信小游戏导出 ====================
def export_wechat():
    """导出为微信小游戏源码"""
    print("\n" + "="*50)
    print("  导出微信小游戏版...")
    print("="*50)

    wx_dir = os.path.join(BUILD_DIR, 'wechat')
    os.makedirs(wx_dir, exist_ok=True)

    # 复制源文件
    copy_source_files(wx_dir)

    # 生成game.js (微信小游戏入口)
    game_js = """// 微信小游戏入口
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const screenW = canvas.width;
const screenH = canvas.height;

// 加载适配层
// 注意: 需要引入wechat-adapter.js来适配DOM API
// 下载地址: https://github.com/nicoleffect/wechat-adapter

// 绘制启动画面
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, screenW, screenH);
ctx.fillStyle = '#7C4DFF';
ctx.font = 'bold 32px Arial';
ctx.textAlign = 'center';
ctx.fillText('合成飞车射击', screenW / 2, screenH / 2);
ctx.fillStyle = '#9E9E9E';
ctx.font = '16px Arial';
ctx.fillText('加载中...', screenW / 2, screenH / 2 + 40);

// TODO: 加载wechat-adapter后初始化游戏
// 参考项目根目录的EXPORT-GUIDE.md获取完整适配说明
"""
    with open(os.path.join(wx_dir, 'game.js'), 'w', encoding='utf-8') as f:
        f.write(game_js)

    # 生成game.json
    game_json = {
        "deviceOrientation": "portrait",
        "showStatusBar": False,
        "networkTimeout": {"request": 5000, "connectSocket": 5000},
        "subpackages": [],
    }
    with open(os.path.join(wx_dir, 'game.json'), 'w', encoding='utf-8') as f:
        json.dump(game_json, f, indent=2, ensure_ascii=False)

    # 生成project.config.json
    project_config = {
        "description": "合成飞车射击 - 微信小游戏",
        "packOptions": {"ignore": [{"type": "folder", "value": "export"}]},
        "setting": {
            "urlCheck": False,
            "es6": True,
            "enhance": True,
            "postcss": True,
            "minified": True,
        },
        "compileType": "game",
        "appid": "你的小游戏AppID",
        "projectname": "merge-racer-shooter",
        "libVersion": "3.3.4",
    }
    with open(os.path.join(wx_dir, 'project.config.json'), 'w', encoding='utf-8') as f:
        json.dump(project_config, f, indent=2, ensure_ascii=False)

    # 生成适配说明
    adapter_note = """# 微信小游戏适配说明

## 当前状态
本项目为Web Canvas游戏，微信小游戏需要额外适配：

## 适配步骤

### 1. 获取小游戏AppID
- 登录微信公众平台 → 小游戏管理 → 创建小游戏
- 获取AppID后填入 project.config.json

### 2. 引入DOM适配层
微信小游戏没有DOM API，需要引入适配库：
```bash
# 推荐适配库
https://github.com/nicoleffect/wechat-adapter
# 或官方适配
https://github.com/nicewarm/wegame-adapter
```

将适配库放入项目根目录，在game.js中引入:
```javascript
import './wechat-adapter.js';
```

### 3. 适配要点
- `document.getElementById` → 适配层提供的虚拟DOM
- `localStorage` → `wx.getStorageSync / wx.setStorageSync`
- `window.innerWidth/Height` → `canvas.width / canvas.height`
- `requestAnimationFrame` → 微信已支持
- 触摸事件 → `wx.onTouchStart/Move/End`

### 4. 本地存储适配
将 SaveManager 中的:
- `localStorage.setItem` → `wx.setStorageSync`
- `localStorage.getItem` → `wx.getStorageSync`
- `localStorage.removeItem` → `wx.removeStorageSync`

### 5. 构建上传
1. 用微信开发者工具打开此目录
2. 预览调试
3. 上传代码 → 提交审核

## 资源限制
- 首包不超过4MB (使用分包可扩展至20MB)
- 单个分包不超过20MB
- 总包不超过20MB
"""
    with open(os.path.join(wx_dir, 'ADAPT-GUIDE.md'), 'w', encoding='utf-8') as f:
        f.write(adapter_note)

    print(f"[✓] 微信小游戏源码已导出:")
    print(f"    目录: {wx_dir}")
    print(f"    注意: 需要引入DOM适配层和替换AppID")
    return wx_dir

# ==================== 主流程 ====================
def main():
    print("="*50)
    print("  合成飞车射击 - 一键导出工具")
    print("="*50)

    if len(sys.argv) < 2:
        print("\n用法: python export.py [web|android|wechat|all]")
        print("  web     - 导出网页版")
        print("  android - 导出安卓APK项目")
        print("  wechat  - 导出微信小游戏源码")
        print("  all     - 全部导出")
        return

    target = sys.argv[1].lower()
    clean_build()

    if target in ('web', 'all'):
        export_web()
    if target in ('android', 'all'):
        export_android()
    if target in ('wechat', 'all'):
        export_wechat()

    print("\n" + "="*50)
    print("  导出完成!")
    print(f"  输出目录: {BUILD_DIR}")
    print("="*50)

if __name__ == '__main__':
    main()
