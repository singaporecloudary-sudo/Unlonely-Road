# GitHub Pages 部署指南 — 不孤独的公路

预计耗时 15 分钟，全部免费。

---

## 准备清单

- [ ] 一个 GitHub 账号（没有先去 https://github.com 注册）
- [ ] 安装 Git（下面会指导）

---

## Step 1: 安装 Git（5 分钟）

### Windows

1. 访问 https://git-scm.com/download/win
2. 下载并安装（一路下一步即可）
3. 安装完成后，在 PowerShell 测试：
   ```powershell
   git --version
   ```
   能看到版本号就成功了。

---

## Step 2: 在 GitHub 创建仓库（3 分钟）

1. 登录 https://github.com
2. 右上角点 **`+`** → **`New repository`**
3. 填写：
   - **Repository name**：`lonely-road`（或你喜欢的名字，不要中文）
   - **Description**（可选）：`一款赛博朋克风格的合成射击游戏`
   - **Public**（必须选 Public，否则 Pages 免费版不可用）
   - **不要**勾选 "Add a README file"（项目里已经有了）
4. 点 **`Create repository`**
5. 复制页面上显示的仓库地址，形如：
   ```
   https://github.com/你的用户名/lonely-road.git
   ```

---

## Step 3: 提交项目到 GitHub（5 分钟）

打开 PowerShell，进入项目目录：

```powershell
cd "F:\游戏制作\合成飞车射击"
```

第一次使用 git 需要配置身份（用你的 GitHub 邮箱和用户名）：

```powershell
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱@example.com"
```

然后依次执行：

```powershell
# 初始化仓库
git init

# 添加所有文件
git add .

# 提交（第一次提交）
git commit -m "Initial commit: 不孤独的公路 游戏"

# 关联远程仓库（把下面 URL 换成你自己的仓库地址）
git remote add origin https://github.com/你的用户名/lonely-road.git

# 切换到 main 分支（GitHub 默认）
git branch -M main

# 推送到 GitHub
git push -u origin main
```

> 第一次推送会弹出登录窗口，用浏览器授权登录 GitHub 即可。

推送成功后，回到 GitHub 仓库页面刷新，应该能看到所有文件了。

---

## Step 4: 开启 GitHub Pages（2 分钟）

1. 在 GitHub 仓库页面，点 **`Settings`**（顶部菜单最右）
2. 左侧菜单找到 **`Pages`**
3. **Source** 选择：`Deploy from a branch`
4. **Branch** 选择：`main` / `/(root)` → 点 **`Save`**
5. 等 1~2 分钟，刷新页面，顶部会显示：
   ```
   Your site is live at https://你的用户名.github.io/lonely-road/
   ```

---

## Step 5: 在线游玩 ✨

复制上面的链接，**手机/电脑浏览器**都能打开！

---

## 生成二维码给朋友扫

1. 复制你的链接 `https://你的用户名.github.io/lonely-road/`
2. 访问 https://cli.im 或 https://www.qrcode-monkey.com
3. 粘贴链接，下载二维码图片
4. 发给朋友，扫码即玩

---

## 以后修改怎么更新？

每次改了代码想发布到线上，只要 3 行命令：

```powershell
cd "F:\游戏制作\合成飞车射击"
git add .
git commit -m "更新说明：比如修改了Boss平衡"
git push
```

推送后等 1~2 分钟，线上版本就自动更新了。

---

## 常见问题

### Q: 打开链接是 404？
- 检查 Pages 是否启用（Settings → Pages 看是否显示 "Your site is live"）
- 等 2~3 分钟首次部署需要时间
- 强刷浏览器 Ctrl+Shift+R

### Q: 国内访问 GitHub Pages 慢？
- 可以再部署一份到 Vercel/Netlify（同一份代码可同时部署到多平台）
- 或购买备案域名 + CDN

### Q: 想用自己的域名？
- Settings → Pages → Custom domain 填入域名
- 在域名服务商加 CNAME 记录指向 `你的用户名.github.io`

### Q: 推送时报错 "Permission denied"？
- 检查 GitHub 是否登录授权
- 或改用 SSH key（高级用法，可暂时不管）

---

## 需要我帮你做什么？

完成 Step 1 安装 git 后告诉我，我可以帮你：
- 验证 git 安装是否正确
- 帮你执行后续命令（如果你信任我直接代为操作）
- 排查推送过程中的问题
