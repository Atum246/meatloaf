const fs = require('fs');
const path = require('path');
const { SNAPSHOTS_DIR } = require('../utils/config');

class Screenshotter {
  constructor(config = {}) {
    this.width = config.width || 1280;
    this.height = config.height || 720;
    this.format = config.format || 'png';
    this.browser = null;
  }

  async init() {
    // Try to use puppeteer-core or playwright if available
    try {
      const puppeteer = require('puppeteer-core');
      this.engine = 'puppeteer';
      this.puppeteer = puppeteer;
      return true;
    } catch (e) {
      // Try playwright
      try {
        const { chromium } = require('playwright');
        this.engine = 'playwright';
        this.playwright = { chromium };
        return true;
      } catch (e2) {
        this.engine = 'fallback';
        return true;
      }
    }
  }

  async launch() {
    if (this.browser) return;

    if (this.engine === 'puppeteer') {
      this.browser = await this.puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    } else if (this.engine === 'playwright') {
      this.browser = await this.playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox']
      });
    }
  }

  async capture(url, opts = {}) {
    await this.init();
    await this.launch();

    const outputDir = opts.outputDir || SNAPSHOTS_DIR;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filename = opts.filename || `snapshot-${Date.now()}.${this.format}`;
    const outputPath = path.join(outputDir, filename);

    const width = opts.width || this.width;
    const height = opts.height || this.height;

    if (this.engine === 'puppeteer') {
      const page = await this.browser.newPage();
      await page.setViewport({ width, height });
      
      if (opts.waitUntil) {
        await page.goto(url, { waitUntil: opts.waitUntil, timeout: opts.timeout || 30000 });
      } else {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: opts.timeout || 30000 });
      }

      if (opts.waitFor) {
        await page.waitForSelector(opts.waitFor, { timeout: 10000 }).catch(() => {});
      }

      if (opts.fullPage) {
        await page.screenshot({ path: outputPath, fullPage: true, type: this.format });
      } else {
        await page.screenshot({ path: outputPath, type: this.format });
      }

      if (opts.evaluate) {
        const evalResult = await page.evaluate(opts.evaluate);
        await page.close();
        return { path: outputPath, evalResult };
      }

      await page.close();
    } else if (this.engine === 'playwright') {
      const page = await this.browser.newPage();
      await page.setViewportSize({ width, height });
      await page.goto(url, { waitUntil: opts.waitUntil || 'networkidle', timeout: opts.timeout || 30000 });

      if (opts.waitFor) {
        await page.waitForSelector(opts.waitFor, { timeout: 10000 }).catch(() => {});
      }

      await page.screenshot({ path: outputPath, fullPage: opts.fullPage || false });
      await page.close();
    } else {
      // Fallback: use curl to get the HTML and save it
      const { execSync } = require('child_process');
      try {
        const html = execSync(`curl -sL "${url}"`, { timeout: 10000 }).toString();
        const htmlPath = outputPath.replace(/\.\w+$/, '.html');
        fs.writeFileSync(htmlPath, html);
        return { path: htmlPath, fallback: true, message: 'Browser not available. Saved HTML snapshot.' };
      } catch (err) {
        return { path: null, error: `Cannot capture screenshot: ${err.message}` };
      }
    }

    return { path: outputPath };
  }

  async captureHtml(url, opts = {}) {
    const { execSync } = require('child_process');
    try {
      const html = execSync(`curl -sL "${url}"`, { timeout: opts.timeout || 10000 }).toString();
      
      if (opts.outputPath) {
        fs.writeFileSync(opts.outputPath, html);
      }
      
      return { html, length: html.length };
    } catch (err) {
      return { error: err.message };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = Screenshotter;
