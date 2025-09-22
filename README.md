# smogon-bomber-public
### Windows 系统下安装和配置 Smogon reaction工具的完整指南

这个指南是为完全没有编程经验的朋友准备的。我们将一步步安装 Node.js（运行脚本的必须软件）、设置项目文件夹、安装所需依赖、配置文件，然后运行脚本。整个过程像安装游戏一样简单，只需复制粘贴命令和文件。脚本用于自动抓取 Smogon 论坛搜索结果中的帖子链接，并根据权重随机添加reaction。

#### 注意事项
- **安全警告**：这个脚本会自动访问 Smogon 论坛并添加反应。**永远不要分享你的cookies**。
#### 步骤 1: 安装 Node.js
Node.js 是运行脚本的引擎。

1. 打开浏览器，访问 Node.js 官网：https://nodejs.org。  
2. 下载 “LTS” 版本（稳定版），点击 “Windows Installer (.msi)” 下载。
3. 双击下载的文件运行安装程序。
4. 在安装向导中，点击 “Next” 直到完成。保持默认设置，选中 “Automatically install the necessary tools” 如果出现。
5. 安装完后，重启电脑。
6. 验证安装：按 Win + S 搜索 “cmd” 打开命令提示符，输入命令：
   ```
   node --version
   ```
   如果显示类似 “v20.x.x”，安装成功。如果出错，重装 Node.js。

#### 步骤 2: 创建项目文件夹
1. 在桌面或任意地方创建一个文件夹，命名 “smogon-tool”。
2. 进入文件夹，右键 > “新建” > “文本文档”，命名 “index.js”。
3. 用记事本打开 “index.js”，复制粘贴下面的代码，然后保存：
   ```
   const puppeteer = require('puppeteer');
   const fs = require('fs');
   
   // Load environment variables
   require('dotenv').config();
   
   // Configuration
   const SEARCH_URLS = [
     'https://www.smogon.com/forums/search/63693360/?q=%2A&c[older_than]=1741083164&c[users]=MirrorSaMa&o=date', // 第一个搜索
     'https://www.smogon.com/forums/search/63692680/?q=%2A&c[users]=liliou&o=date', // 示例第二个搜索（替换为你的）
     // 添加更多URL，例如：
     // 'https://www.smogon.com/forums/search/NEW_ID/?q=%2A&c[users]=NewUser&o=date',
   ];
   const REACTION_WEIGHTS = [
     { id: 1, weight: 0.5 }, // 50% 概率 (Like)
     { id: 2, weight: 0.3 }, // 30% 概率 (Love)
     { id: 3, weight: 0.2 }, // 20% 概率 (Informative)
   ];
   const LINK_PATTERN = /\/forums\/threads\/[^\s]+\/post-(\d+)/i; // Matches thread post links
   const SMOGON_USERNAME = process.env.SMOGON_USERNAME || 'YOUR_SMOGON_USERNAME';
   const SMOGON_PASSWORD = process.env.SMOGON_PASSWORD || 'YOUR_SMOGON_PASSWORD';
   const PROGRESS_FILE = 'progress.json'; // Progress file
   
   // Helper function for delay
   const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
   
   // Weighted random reaction_id
   function getWeightedRandomReactionId() {
     const totalWeight = REACTION_WEIGHTS.reduce((sum, { weight }) => sum + weight, 0);
     let random = Math.random() * totalWeight;
     for (const { id, weight } of REACTION_WEIGHTS) {
       random -= weight;
       if (random <= 0) return id;
     }
     return REACTION_WEIGHTS[REACTION_WEIGHTS.length - 1].id; // Fallback
   }
   
   // Load progress from file
   function loadProgress() {
     if (fs.existsSync(PROGRESS_FILE)) {
       try {
         const data = JSON.parse(fs.readFileSync(PROGRESS_FILE));
         console.log(`Loaded progress from ${PROGRESS_FILE}: ${data.searches.length} searches, ${Object.keys(data.progress).length} posts`);
         return data;
       } catch (err) {
         console.error(`Failed to load ${PROGRESS_FILE}: ${err.message}`);
       }
     }
     console.log(`No ${PROGRESS_FILE} found, starting fresh`);
     return { searches: [], progress: {} };
   }
   
   // Save progress to file
   function saveProgress(searches, progress) {
     try {
       fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ searches, progress }, null, 2));
       console.log(`Progress saved to ${PROGRESS_FILE}`);
     } catch (err) {
       console.error(`Failed to save ${PROGRESS_FILE}: ${err.message}`);
     }
   }
   
   async function scrapeAndReact() {
     console.log('Starting Smogon search react tool (multi-search, weighted random reactions, with progress saving and error handling)...');
     
     // Load existing progress
     let { searches, progress } = loadProgress();
     let allPostIds = new Set();
     
     const browser = await puppeteer.launch({
       headless: true, // Set to false to watch
       args: ['--no-sandbox', '--disable-setuid-sandbox'],
       executablePath: '/home/codespace/.cache/puppeteer/chrome/linux-140.0.7339.82/chrome-linux64/chrome',
     });
     
     let page;
     try {
       page = await browser.newPage();
       console.log('New page created');
       
       // Set user-agent to avoid detection
       await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');
       
       // Load pre-exported cookies
       if (fs.existsSync('smogon-cookies.json')) {
         const cookies = JSON.parse(fs.readFileSync('smogon-cookies.json'));
         await page.setCookie(...cookies);
         console.log('Loaded cookies from smogon-cookies.json');
       } else {
         console.log('No smogon-cookies.json found - will attempt login if needed');
       }
       
       // Step 1: Scrape all search URLs
       for (let searchIndex = 0; searchIndex < SEARCH_URLS.length; searchIndex++) {
         const BASE_SEARCH_URL = SEARCH_URLS[searchIndex];
         console.log(`\n=== Running Search ${searchIndex + 1}/${SEARCH_URLS.length}: ${BASE_SEARCH_URL} ===`);
         
         // Check if this search was already processed
         let existingSearch = searches.find(s => s.url === BASE_SEARCH_URL);
         if (!existingSearch) {
           existingSearch = { url: BASE_SEARCH_URL, postIds: [], lastPage: 0 };
           searches.push(existingSearch);
         }
         
         let currentPage = existingSearch.lastPage + 1 || 1;
         let hasMorePages = true;
         let searchPostIds = new Set(existingSearch.postIds);
         
         console.log(`  Resuming from page ${currentPage} (last page processed: ${existingSearch.lastPage || 0})`);
         
         // Scrape pages for this search
         while (hasMorePages) {
           const searchUrl = `${BASE_SEARCH_URL}&page=${currentPage}`;
           console.log(`  Scraping page ${currentPage}: ${searchUrl}`);
           
           try {
             await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
           } catch (err) {
             console.error(`  Navigation failed for ${searchUrl}: ${err.message}`);
             const pageContent = page ? await page.content() : 'No page content';
             const debugFile = `debug-nav-search-${searchIndex + 1}-${currentPage}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
             fs.writeFileSync(debugFile, pageContent);
             console.log(`  Navigation error saved to ${debugFile}`);
             hasMorePages = false;
             continue; // Skip to next page or search
           }
           
           // Handle login if redirected
           if (page.url().includes('login')) {
             console.log(`  Login required for search page - redirected to: ${page.url()}`);
             const pageContent = await page.content();
             const debugFile = `debug-login-search-${searchIndex + 1}-${currentPage}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
             fs.writeFileSync(debugFile, pageContent);
             console.log(`  Login page saved to ${debugFile}`);
             
             const loginInput = await page.$('input[name="login"]');
             const passwordInput = await page.$('input[name="password"]');
             const submitButton = await page.$('button[type="submit"]');
             if (!loginInput || !passwordInput || !submitButton) {
               console.log('  Login form elements not found');
               hasMorePages = false;
               continue; // Skip to next page or search
             }
             await page.type('input[name="login"]', SMOGON_USERNAME);
             await page.type('input[name="password"]', SMOGON_PASSWORD);
             try {
               await Promise.all([
                 page.click('button[type="submit"]'),
                 page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
               ]);
               console.log(`  Login submitted, Current URL: ${page.url()}`);
               await page.context().cookies().then(cookies => fs.writeFileSync('cookies.json', JSON.stringify(cookies)));
               await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
             } catch (err) {
               console.error(`  Login navigation failed: ${err.message}`);
               hasMorePages = false;
               continue; // Skip to next page or search
             }
           }
           
           // Check for no results
           const noResults = await page.$('.searchResults--noResults');
           if (noResults) {
             console.log(`  No results on page ${currentPage} - stopping pagination for this search`);
             hasMorePages = false;
             break;
           }
           
           // Check for redirection (indicates last page)
           const currentUrl = page.url();
           const expectedUrl = searchUrl;
           if (!currentUrl.includes(`page=${currentPage}`) && currentUrl !== expectedUrl) {
             console.log(`  Redirected to ${currentUrl} - likely last page, stopping pagination for this search`);
             hasMorePages = false;
           }
           
           // Extract post links
           const links = await page.evaluate(() => {
             const aTags = Array.from(document.querySelectorAll('a[href*="/threads/"]'));
             return aTags
               .map(a => a.href)
               .filter(href => /\/forums\/threads\/.*\/post-\d+/.test(href));
           });
           
           console.log(`  Found ${links.length} thread post links on page ${currentPage}`);
           links.forEach(link => {
             const match = link.match(LINK_PATTERN);
             if (match) {
               const postId = match[1];
               searchPostIds.add(postId);
               allPostIds.add(postId);
               if (!progress[postId]) progress[postId] = { status: 'pending' };
               if (!existingSearch.postIds.includes(postId)) {
                 existingSearch.postIds.push(postId);
               }
             }
           });
           
           // Update last page processed
           existingSearch.lastPage = currentPage;
           
           // Save progress after each page
           saveProgress(searches, progress);
           
           // Stop if no links found (extra safety)
           if (links.length === 0) {
             console.log(`  No links found on page ${currentPage} - stopping pagination for this search`);
             hasMorePages = false;
           }
           
           if (hasMorePages) currentPage++;
           await delay(2000); // Rate limit delay
         }
         
         console.log(`  Search ${searchIndex + 1} complete: Found ${searchPostIds.size} unique post IDs`);
       }
       
       console.log(`\nTotal unique post IDs across all searches: ${allPostIds.size}`);
       
       // Step 2: Process each post for reaction
       for (const postId of allPostIds) {
         if (progress[postId] && ['reacted', 'skipped', 'error'].includes(progress[postId].status)) {
           console.log(`\nSkipping post ${postId}: Already ${progress[postId].status} (${progress[postId].reason || ''})`);
           continue;
         }
         
         const reactionId = getWeightedRandomReactionId();
         const reactUrl = `https://www.smogon.com/forums/posts/${postId}/react?reaction_id=${reactionId}`;
         console.log(`\nProcessing post ${postId}: ${reactUrl} (reaction_id=${reactionId})`);
         
         try {
           await page.goto(reactUrl, { waitUntil: 'networkidle2', timeout: 60000 });
           
           // Handle login if redirected
           if (page.url().includes('login')) {
             console.log(`  Login required for post ${postId} - redirected to: ${page.url()}`);
             const pageContent = await page.content();
             const debugFile = `debug-login-post-${postId}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
             fs.writeFileSync(debugFile, pageContent);
             console.log(`  Login page saved to ${debugFile}`);
             
             const loginInput = await page.$('input[name="login"]');
             const passwordInput = await page.$('input[name="password"]');
             const submitButton = await page.$('button[type="submit"]');
             if (!loginInput || !passwordInput || !submitButton) {
               console.log('  Login form elements not found');
               progress[postId] = { status: 'error', reason: 'Login form elements not found' };
               saveProgress(searches, progress);
               continue; // Skip to next post
             }
             await page.type('input[name="login"]', SMOGON_USERNAME);
             await page.type('input[name="password"]', SMOGON_PASSWORD);
             try {
               await Promise.all([
                 page.click('button[type="submit"]'),
                 page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
               ]);
               console.log(`  Login submitted, Current URL: ${page.url()}`);
               await page.context().cookies().then(cookies => fs.writeFileSync('cookies.json', JSON.stringify(cookies)));
               await page.goto(reactUrl, { waitUntil: 'networkidle2', timeout: 60000 });
             } catch (err) {
               console.error(`  Login navigation failed: ${err.message}`);
               progress[postId] = { status: 'error', reason: `Login navigation failed: ${err.message}` };
               saveProgress(searches, progress);
               continue; // Skip to next post
             }
           }
           
           // Check for existing reaction by searching for "remove" in page text
           const pageText = await page.evaluate(() => document.body.textContent.toLowerCase());
           if (pageText.includes('remove')) {
             console.log(`  Post ${postId} already reacted with reaction_id=${reactionId} - skipping`);
             progress[postId] = { status: 'skipped', reason: `Already reacted with reaction_id=${reactionId}` };
             saveProgress(searches, progress);
             continue;
           }
           
           // Check for invalid post or login error
           const errorMessage = await page.$('.blockMessage--error');
           if (errorMessage) {
             const errorText = await page.evaluate(el => el.textContent, errorMessage);
             console.log(`  Error on post ${postId}: ${errorText}`);
             const pageContent = await page.content();
             const debugFile = `debug-error-${postId}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
             fs.writeFileSync(debugFile, pageContent);
             console.log(`  Error page saved to ${debugFile}`);
             progress[postId] = { status: 'error', reason: errorText };
             saveProgress(searches, progress);
             continue; // Skip to next post
           }
           
           await delay(2000); // Wait for dynamic content
           
           // Find and click Confirm button
           const selectors = [
             'button.button--icon--confirm',
             'button.button--primary',
             'button:has-text("Confirm")',
             'button[type="submit"]',
           ];
           
           let clicked = false;
           let usedSelector = null;
           for (const selector of selectors) {
             console.log(`  Trying selector: ${selector}`);
             const button = await page.$(selector).catch(err => {
               console.error(`  Selector ${selector} failed: ${err.message}`);
               return null;
             });
             if (button) {
               usedSelector = selector;
               console.log(`  Clicking Confirm button with selector: ${usedSelector}`);
               await page.click(usedSelector);
               clicked = true;
               break;
             }
           }
           
           if (!clicked) {
             console.log(`  Confirm button not found for post ${postId} - likely permission issue, skipping`);
             const pageContent = await page.content();
             const debugFile = `debug-react-${postId}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
             fs.writeFileSync(debugFile, pageContent);
             console.log(`  Debug saved to ${debugFile}`);
             progress[postId] = { status: 'error', reason: 'Confirm button not found - likely permission issue' };
             saveProgress(searches, progress);
             continue; // Skip to next post
           } else {
             console.log(`  ✅ Reacted to post ${postId} with reaction_id=${reactionId}`);
             progress[postId] = { status: 'reacted', reaction_id: reactionId };
             saveProgress(searches, progress);
           }
           
           await delay(3000); // Rate limit delay
         }
         
         console.log('\nAll posts across all searches processed!');
       } catch (error) {
         console.error(`Fatal error (non-post specific): ${error.message}`);
         if (page) {
           const pageContent = await page.content();
           const debugFile = `debug-fatal-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
           fs.writeFileSync(debugFile, pageContent);
           console.log(`Fatal error debug saved to ${debugFile}`);
         }
       } finally {
         console.log('Closing browser');
         if (browser) await browser.close();
       }
  }

// Run the script

scrapeAndReact().catch(console.error);

```

### Running Steps
1. **Save the Script**:
   - Copy the `<xaiArtifact>` content to `/workspaces/smogon-bomber/smogon-bomber-release/index.js`.
   - Or via terminal:
     ```bash
     cd /workspaces/smogon-bomber/smogon-bomber-release
     nano index.js
     ```
     Paste, save (Ctrl+O, Enter), exit (Ctrl+X).
2. **Verify Files**:
   ```bash
   ls -a
   cat .env
   cat smogon-cookies.json
   cat progress.json
   ```
   - `.env`: Ensure `SMOGON_USERNAME=AnsonIsTheBest` and `SMOGON_PASSWORD=anson20080130`.
   - `smogon-cookies.json`: Check for valid `xf_session` and `xf_user` (not expired).
   - `progress.json`: Review for post statuses (e.g., `error` for permission issues).
3. **Run the Script**:
   ```bash
   node index.js
   ```
4. **Manual Reset Progress** (If Needed):
   ```bash
   rm progress.json
   node index.js
   ```
5. **Monitor Progress**:
   - Logs show resumption (e.g., `Resuming from page 3`, `Skipping post 10708857: Already error (...)`).
   - For permission issues, it will log “Confirm button not found - likely permission issue, skipping” and continue.

### Expected Output (With Error Handling)
```
Starting Smogon search react tool (multi-search, weighted random reactions, with progress saving and error handling)...
Loaded progress from progress.json: 2 searches, 25 posts
New page created
Loaded cookies from smogon-cookies.json

=== Running Search 1/2: https://www.smogon.com/forums/search/63693360/?q=%2A&c[older_than]=1741083164&c[users]=MirrorSaMa&o=date ===
  Resuming from page 3 (last page processed: 2)
  Scraping page 3: https://www.smogon.com/forums/search/63693360/?q=%2A&c[older_than]=1741083164&c[users]=MirrorSaMa&o=date&page=3
  Found 5 thread post links on page 3
  Progress saved to progress.json
  ...
  Search 1 complete: Found 15 unique post IDs

=== Running Search 2/2: https://www.smogon.com/forums/search/63692680/?q=%2A&c[users]=liliou&o=date ===
  Resuming from page 2 (last page processed: 1)
  
  Search 2 complete: Found 10 unique post IDs

Total unique post IDs across all searches: 25

Skipping post 10708857: Already error (Confirm button not found - likely permission issue)
Processing post 10703515: https://www.smogon.com/forums/posts/10703515/react?reaction_id=2 (reaction_id=2)
  Trying selector: button.button--icon--confirm
  Clicking Confirm button with selector: button.button--icon--confirm
  ✅ Reacted to post 10703515 with reaction_id=2
  Progress saved to progress.json

All posts across all searches processed!
Closing browser
```

### Troubleshooting
1. **Permission Errors**:
   - The script now skips these posts and marks them as `error` in `progress.json`.
   - Check `debug-react-*.html` or `debug-error-*.html` for details (e.g., “You must be logged-in” or “No permission”).
   - Share one debug file content.
2. **Login Issues**:
   - Re-export `smogon-cookies.json` (Chrome: F12 > Application > Cookies > Copy as JSON).
   - Test in private browser.
   - If 2FA/CAPTCHA, set `headless: false` and handle manually.
3. **Progress Not Resuming**:
   - Check `progress.json`:
     ```bash
     cat progress.json
     ```
   - Reset if needed:
     ```bash
     rm progress.json
     ```
4. **Button Not Found**:
   - Share `<button>` HTML from `https://www.smogon.com/forums/posts/10708857/react?reaction_id=2`.
5. **Script Crashes**:
  - Check `debug-fatal-*.html` for non-post errors.
  - Increase delays or timeouts.

### Notes
- **Smogon ToS**: Automated reactions violate rules. Use test account, increase delays (e.g., `delay(5000)`) to avoid bans.
- **Customize**:
  - Add URLs to `SEARCH_URLS`.
  - Adjust `REACTION_WEIGHTS`.
- **Backup**: Copy `progress.json` before resetting:
  ```bash
  cp progress.json progress-backup.json
  ```

Run the updated script and share:
- Full logs (redact `SMOGON_USERNAME`, `SMOGON_PASSWORD`).
- `cat progress.json` output.
- `ls -a /home/codespace/.cache/puppeteer/chrome` output.
- Content of one `debug-*.html` if errors occur.
- `<button>` HTML from a reaction page.

If you need a GUI or specific weights, let me know!
