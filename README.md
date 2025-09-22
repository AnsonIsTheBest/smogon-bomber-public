# smogon-bomber-public


#### 注意事项
- **不要分享你的cookies。**
- **系统要求**：Windows 10 或更高版本，稳定的网络连接。
---

#### 步骤 1: 下载代码
1. 打开浏览器（推荐 Chrome），访问https://github.com/AnsonIsTheBest/smogon-bomber-public。
2. 点击绿色的 **Code** 按钮，选择 **Download ZIP**。
3. 下载完成后，解压 ZIP 文件到一个方便的地方，比如桌面，命名为 `smogon-tool`。
4. 解压后，你会看到一个文件夹（比如 `smogon-bomber-public`），里面有 `index.js` 等文件。进入这个文件夹，确保 `index.js` 存在。

---

#### 步骤 2: 安装 Node.js（运行脚本的软件）

1. 打开浏览器，访问 Node.js 官网：**https://nodejs.org**。
2. 下载 **LTS** 版本（稳定版），点击 **Windows Installer (.msi)** 下载。
3. 双击下载的 `.msi` 文件，运行安装程序：
   - 点击 **Next**，接受默认设置。
   - 如果看到 “Automatically install the necessary tools”，勾选它。
   - 一直点击 **Next** 直到 **Finish**。
4. 安装完成后，重启电脑。
5. 验证安装：
   - 按 **Win + R**，输入“powershell”并回车，打开powershell。
   - 输入以下命令并按回车：
     ```
     node --version
     ```
   - 如果显示类似 `v20.x.x`，说明安装成功。如果报错，重新下载安装 Node.js。

---

#### 步骤 3: 设置项目文件夹
1. 打开解压后的 `smogon-tool` 文件夹（比如 `C:\Users\你的用户名\Desktop\smogon-bomber-public`）。
2. 检查是否有以下文件：
   - `index.js`

---

#### 步骤 4: 安装依赖
你的脚本需要一些额外的工具（`puppeteer` 和 `dotenv`），我们通过命令安装。

1. 打开 **Powershell**：
   - 按 **Win + R**，打开 “powershell”。
2. 进入项目文件夹：
   - 假设文件夹在 `C:\Users\用户名\Desktop\smogon-bomber-public`，输入：
     ```
     cd C:\Users\用户名\Desktop\smogon-bomber-public(或者你自己的路径）
     ```
   - 按回车，命令提示符路径应变为项目文件夹。
   - （如果光标左边的字C:\Users\用户名\>变成了C:\Users\用户名\Desktop\smogon-bomber-public>就是成功了）
3. 安装依赖：
   - 输入以下命令并按回车：
     ```
     npm install puppeteer dotenv
     ```
   - 这会下载 `puppeteer`（控制浏览器的工具）和 `dotenv`（读取配置文件的工具）。
   - 等待几分钟，完成后你会看到一个 `node_modules` 文件夹和 `package.json` 文件。
4. 验证安装：
   - 输入：
     ```
     dir
     ```
   - 确认 `node_modules` 和 `package.json` 存在。

---

#### 步骤 5: 配置登录信息
脚本需要你的 Smogon 论坛账号登录信息，存储在两个文件中：`.env` 和 `smogon-cookies.json`。

##### 5.1 创建 `smogon-cookies.json` 文件
1. 前往https://greasyfork.org/en/scripts/550007-export-discord-token-and-smogon-cookies安装脚本
2. 前往https://www.smogon.com/forums/，右上角会出来一个框，点击绿色的copy按钮。在index.js同个文件夹下创建一个smogon-cookies.json，用记事本打开并黏贴你剪贴板上的内容。
   - 示例内容（你的会不同）：
     ```json
     [
       {
         "name": "xf_session",
         "value": "abc123...",
         "domain": "www.smogon.com",
         "path": "/",
         "expires": 1741083164,
         ...
       },
       {
         "name": "xf_user",
         "value": "xyz789...",
         ...
       }
     ]
     ```

---

#### 步骤 6: 配置搜索和反应
你的 `index.js` 已经包含搜索链接和反应权重。如果需要修改：

1. 打开 `index.js`（用记事本），找到以下部分：
   ```javascript
   const SEARCH_URLS = [
     'https://www.smogon.com/forums/search/63693360/?q=%2A&c[older_than]=1741083164&c[users]=MirrorSaMa&o=date',
     'https://www.smogon.com/forums/search/63692680/?q=%2A&c[users]=liliou&o=date',
   ];
   ```
   - 这些是搜索链接。每次搜索你需要更换链接。如果需要对一个用户定向轰炸请访问smogon->用户主页->postings->view more->复制网址，黏贴进来。支持批量处理，就是说可以复制好几个人的链接一次跑完。用''包含链接并用,分割各个链接：
     ```javascript
     const SEARCH_URLS = [
       '你的新搜索链接',
       '另一个搜索链接',
     ];
     ```
2. 找到反应权重部分：
   ```javascript
   const REACTION_WEIGHTS = [
     { id: 1, weight: 0.5 }, // 50% 概率 (Like)
     { id: 2, weight: 0.3 }, // 30% 概率 (Love)
     { id: 3, weight: 0.2 }, // 20% 概率 (Informative)
   ];
   ```
   - 这控制反应类型概率（`id=1` 是 Like，`id=2` 是 Love，`id=3` 是haha。剩下三个忘了）。
   - 可修改权重（保持正数），例如：
     ```javascript
     const REACTION_WEIGHTS = [
       { id: 1, weight: 0.7 }, // 70% 概率 (Like)
       { id: 2, weight: 0.2 }, // 20% 概率 (Love)
       { id: 3, weight: 0.1 }, // 10% 概率 (Informative)
     ];
     ```
3. 保存 `index.js`。

---

#### 步骤 7: 运行脚本
1. 打开 **命令提示符**（Win + S，搜索 “cmd”）。
2. 进入项目文件夹：
   ```
   cd C:\Users\你的用户名\Desktop\smogon-tool\smogon-bomber-release
   ```
3. 运行脚本：
   ```
   node index.js
   ```
4. 脚本会开始运行，显示类似以下输出：
   ```
   Starting Smogon search react tool (multi-search, weighted random reactions, with progress saving and error handling)...
   Loaded progress from progress.json: 2 searches, 25 posts
   New page created
   Loaded cookies from smogon-cookies.json
   ...
   Processing post 10703515: https://www.smogon.com/forums/posts/10703515/react?reaction_id=2 (reaction_id=2)
   ✅ Reacted to post 10703515 with reaction_id=2
   Progress saved to progress.json
   ```
5. 如果中断（比如关机），下次运行 `node index.js`，脚本会从上次进度继续（检查 `progress.json`）。

---

#### 步骤 8: 检查进度
1. 脚本运行时，会在文件夹中生成 `progress.json`，记录搜索链接、帖子 ID 和处理状态（`pending`、`reacted`、`skipped`、`error`）。
2. 查看进度：
   - 打开文件夹，用记事本打开 `progress.json`。
   - 示例内容：
     ```json
     {
       "searches": [
         {
           "url": "https://www.smogon.com/forums/search/63693360/...",
           "postIds": ["10708857", "10703515"],
           "lastPage": 2
         }
       ],
       "progress": {
         "10708857": { "status": "error", "reason": "Confirm button not found - likely permission issue" },
         "10703515": { "status": "reacted", "reaction_id": 2 }
       }
     }
     ```
3. 如果想重新开始（忽略之前进度）：
   - 删除 `progress.json`：
     ```
     del progress.json
     ```
   - 重新运行：
     ```
     node index.js
     ```

---

#### 故障排除
1. **命令提示符报错**：
   - 如果 `node --version` 失败，重新安装 Node.js。
   - 如果 `npm install` 失败，确保网络连接正常，重新运行：
     ```
     npm install puppeteer dotenv
     ```
2. **登录失败**（日志显示 “You must be logged-in to do that”）：
   - 检查 `smogon-cookies.json`：
     - 打开 Chrome，访问 Smogon，重新登录。
     - 按 F12 > Application > Cookies > 复制 JSON 到 `smogon-cookies.json`。
   - 检查 `.env` 文件，确保用户名和密码正确。
   - 如果有验证码，修改 `index.js`，将 `headless: true` 改为 `headless: false`，保存后运行，浏览器会弹出，手动完成验证码。
3. **权限问题**（日志显示 “Confirm button not found - likely permission issue”）：
   - 正常现象，脚本会跳过无权限的帖子，继续处理其他帖子。
   - 检查 `progress.json`，确认这些帖子标记为 `error`。
   - 如果太多帖子无权限，检查 Smogon 账号是否有访问权限（可能需要更高权限的账号）。
4. **脚本卡住或崩溃**：
   - 检查日志最后几行，找 `debug-*.html` 文件（在项目文件夹中）。
   - 打开一个 `debug-error-*.html` 或 `debug-react-*.html`，复制内容给我。
   - 清理缓存：
     ```
     rmdir /s /q node_modules
     npm install puppeteer dotenv
     ```
5. **进度没有继续**：
   - 检查 `progress.json` 是否存在且格式正确。
   - 如果损坏，删除并重新运行：
     ```
     del progress.json
     node index.js
     ```

---

#### 额外说明
- **Smogon 使用规则**：自动反应可能导致账号被封，建议用测试账号，延长脚本延迟（在 `index.js` 中将 `await delay(3000)` 改为 `await delay(5000)`）。
- **自定义**：
  - 添加新搜索链接：编辑 `index.js` 的 `SEARCH_URLS` 数组。
  - 调整反应概率：修改 `REACTION_WEIGHTS`（确保 `id` 对应 Smogon 的反应类型，例如 1=Like，2=Love，3=Informative）。
- **备份**：定期复制 `progress.json`：
  ```
  copy progress.json progress-backup.json
  ```

---
