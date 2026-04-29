const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const Screenshotter = require('../lib/screenshot');
const DockerManager = require('../lib/docker');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta, loadConfig, SNAPSHOTS_DIR } = require('../utils/config');

class ScreenshotCommands {
  constructor() {
    this.docker = new DockerManager();
    this.screenshotter = new Screenshotter(loadConfig().screenshot);
  }

  async init() {
    await this.docker.init();
    await this.screenshotter.init();
  }

  async capture(urlOrSandbox, opts) {
    let url = urlOrSandbox;
    
    // If it's a sandbox ID, resolve to localhost
    if (!urlOrSandbox.startsWith('http')) {
      const meta = getSandboxMeta(urlOrSandbox);
      if (!meta) throw new Error(`Sandbox or URL not found: ${urlOrSandbox}`);
      const port = opts.port || 3000;
      url = `http://localhost:${port}${opts.path || '/'}`;
    }

    const spinner = ora({ text: `Capturing screenshot: ${url}`, color: 'yellow' }).start();
    
    try {
      const result = await this.screenshotter.capture(url, {
        width: opts.width ? parseInt(opts.width) : undefined,
        height: opts.height ? parseInt(opts.height) : undefined,
        fullPage: opts.fullPage || false,
        waitUntil: opts.waitUntil,
        waitFor: opts.waitFor,
        timeout: opts.timeout ? parseInt(opts.timeout) : undefined,
        filename: opts.output,
        outputDir: opts.outputDir || SNAPSHOTS_DIR
      });

      if (result.error) {
        spinner.fail(chalk.red(`Screenshot failed: ${result.error}`));
        throw new Error(result.error);
      }

      spinner.succeed(chalk.green(`Screenshot saved: ${result.path}`));
      
      log.json({
        success: true,
        path: result.path,
        url,
        fallback: result.fallback || false,
        message: result.fallback 
          ? 'Saved HTML snapshot (browser not available)'
          : `Screenshot captured successfully 📸`
      });
      
      return result;
    } catch (err) {
      spinner.fail(chalk.red(`Screenshot failed: ${err.message}`));
      throw err;
    } finally {
      await this.screenshotter.close();
    }
  }

  async snapshot(sandboxId, opts) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const port = opts.port || 3000;
    const url = `http://localhost:${port}${opts.path || '/'}`;
    
    return this.capture(url, opts);
  }

  async html(urlOrSandbox, opts) {
    let url = urlOrSandbox;
    
    if (!urlOrSandbox.startsWith('http')) {
      const meta = getSandboxMeta(urlOrSandbox);
      if (!meta) throw new Error(`Sandbox or URL not found: ${urlOrSandbox}`);
      const port = opts.port || 3000;
      url = `http://localhost:${port}${opts.path || '/'}`;
    }

    const spinner = ora({ text: `Fetching HTML: ${url}`, color: 'yellow' }).start();
    
    try {
      const result = await this.screenshotter.captureHtml(url, {
        timeout: opts.timeout ? parseInt(opts.timeout) : undefined,
        outputPath: opts.output
      });

      spinner.stop();
      
      if (result.error) {
        throw new Error(result.error);
      }

      log.nl();
      log.banner('  📄 HTML Snapshot\n');
      log.plain(result.html);
      
      log.json({
        success: true,
        url,
        length: result.length,
        html: opts.fullOutput ? result.html : result.html.substring(0, 500) + '...'
      });
      
      return result;
    } catch (err) {
      spinner.fail(chalk.red(`HTML fetch failed: ${err.message}`));
      throw err;
    }
  }
}

module.exports = ScreenshotCommands;
