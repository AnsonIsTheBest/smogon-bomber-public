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
    //executablePath: '/home/codespace/.cache/puppeteer/chrome/linux-140.0.7339.82/chrome-linux64/chrome',
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
      } catch (err) { // 添加缺失的 catch 块
        console.error(`  Error processing post ${postId}: ${err.message}`);
        const pageContent = page ? await page.content() : 'No page content';
        const debugFile = `debug-error-${postId}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
        fs.writeFileSync(debugFile, pageContent);
        console.log(`  Error page saved to ${debugFile}`);
        progress[postId] = { status: 'error', reason: err.message };
        saveProgress(searches, progress);
        continue; // Skip to next post
      }
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

