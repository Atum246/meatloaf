const chalk = require('chalk');
const ora = require('ora');
const HttpTester = require('../lib/http');
const DockerManager = require('../lib/docker');
const { log, ORANGE } = require('../utils/logger');
const { formatDuration, formatBytes } = require('../utils/helpers');
const { getSandboxMeta, loadConfig } = require('../utils/config');

class HttpCommands {
  constructor() {
    this.http = new HttpTester(loadConfig().http);
    this.docker = null; // Lazy init only when needed
  }

  async init() {
    // No-op for commands that don't need Docker
  }

  async initDocker() {
    this.docker = new DockerManager();
    await this.docker.init();
  }

  async test(opts) {
    const url = opts.url;
    const method = (opts.method || 'GET').toUpperCase();
    
    const spinner = ora({ text: `${method} ${url}`, color: 'yellow' }).start();
    
    try {
      let body = opts.body;
      if (opts.json && !body) {
        body = opts.json;
      }
      if (body && typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { /* keep as string */ }
      }

      let headers = {};
      if (opts.header) {
        const headerArr = Array.isArray(opts.header) ? opts.header : [opts.header];
        for (const h of headerArr) {
          const [key, ...val] = h.split(':');
          headers[key.trim()] = val.join(':').trim();
        }
      }

      const result = await this.http.request({
        method,
        url,
        body,
        headers,
        timeout: opts.timeout ? parseInt(opts.timeout) : undefined,
        query: opts.query ? JSON.parse(opts.query) : undefined
      });

      spinner.stop();
      
      log.nl();
      log.banner('  🌐 HTTP Test Result\n');
      log.plain(this.http.formatResult(result));
      
      log.nl();
      log.banner('  📦 Response Body:\n');
      log.plain(this.http.formatBody(result.body, opts.maxBodyLength ? parseInt(opts.maxBodyLength) : 1000));
      
      log.nl();
      log.json({
        success: result.success,
        status: result.status,
        statusText: result.statusText,
        duration: result.duration,
        size: result.size,
        headers: result.headers,
        body: result.body,
        error: result.error
      });
      
      return result;
    } catch (err) {
      spinner.fail(chalk.red(`Request failed: ${err.message}`));
      throw err;
    }
  }

  async batch(filePath, opts) {
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test file not found: ${filePath}`);
    }

    const testContent = fs.readFileSync(filePath, 'utf8');
    let tests;
    
    try {
      tests = JSON.parse(testContent);
    } catch (e) {
      throw new Error(`Invalid test file: ${e.message}`);
    }

    const spinner = ora({ text: `Running ${tests.length} tests...`, color: 'yellow' }).start();
    
    try {
      const results = await this.http.batchTest(tests);
      spinner.stop();

      log.nl();
      log.banner('  🧪 Batch Test Results\n');
      
      const rows = results.map((r, i) => [
        (i + 1).toString(),
        r.name || r.url,
        r.method || 'GET',
        r.status >= 200 && r.status < 300 ? chalk.green(r.status.toString()) : chalk.red(r.status.toString()),
        formatDuration(r.duration),
        r.error ? chalk.red(r.error.substring(0, 40)) : chalk.green('OK')
      ]);

      log.table(rows, ['#', 'Name/URL', 'Method', 'Status', 'Duration', 'Result']);
      
      const passed = results.filter(r => r.status >= 200 && r.status < 300).length;
      const failed = results.length - passed;
      
      log.nl();
      if (failed === 0) {
        log.success(chalk.green(`All ${passed} tests passed! ✅`));
      } else {
        log.error(chalk.red(`${failed} of ${results.length} tests failed`));
      }

      log.nl();
      log.json({
        success: failed === 0,
        total: results.length,
        passed,
        failed,
        results: results.map(r => ({
          name: r.name,
          method: r.method,
          status: r.status,
          duration: r.duration,
          error: r.error
        }))
      });
      
      return results;
    } catch (err) {
      spinner.fail(chalk.red(`Batch test failed: ${err.message}`));
      throw err;
    }
  }

  async wait(sandboxId, opts) {
    await this.initDocker();
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const port = opts.port || 3000;
    const url = `http://localhost:${port}${opts.path || '/'}`;
    
    const spinner = ora({ text: `Waiting for ${url} to be ready...`, color: 'yellow' }).start();
    
    try {
      const result = await this.http.waitForEndpoint(url, {
        attempts: parseInt(opts.attempts) || 30,
        interval: parseInt(opts.interval) || 2000,
        expectedStatus: parseInt(opts.expectedStatus) || 200
      });

      if (result.ready) {
        spinner.succeed(chalk.green(`Endpoint ready after ${result.attempts} attempts`));
      } else {
        spinner.fail(chalk.red(`Endpoint not ready after ${result.attempts} attempts`));
      }

      log.json({
        success: result.ready,
        url,
        attempts: result.attempts,
        message: result.ready ? 'Endpoint is ready ✅' : 'Endpoint not responding ❌'
      });
      
      return result;
    } catch (err) {
      spinner.fail(chalk.red(`Wait failed: ${err.message}`));
      throw err;
    }
  }

  async proxy(sandboxId, path, opts) {
    await this.initDocker();
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const port = opts.port || 3000;
    const url = `http://localhost:${port}${path || '/'}`;
    
    return this.test({
      url,
      method: opts.method,
      body: opts.body,
      header: opts.header,
      timeout: opts.timeout
    });
  }
}

module.exports = HttpCommands;
