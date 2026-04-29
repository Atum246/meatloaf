const axios = require('axios');
const chalk = require('chalk');
const { ORANGE } = require('../utils/logger');
const { formatDuration } = require('../utils/helpers');

class HttpTester {
  constructor(config = {}) {
    this.defaultTimeout = config.timeout || 30000;
    this.followRedirects = config.followRedirects !== false;
  }

  async request(opts) {
    const startTime = Date.now();
    
    const config = {
      method: opts.method || 'GET',
      url: opts.url,
      timeout: opts.timeout || this.defaultTimeout,
      maxRedirects: this.followRedirects ? 5 : 0,
      validateStatus: () => true, // Don't throw on any status
      headers: opts.headers || {}
    };

    if (opts.body) {
      config.data = opts.body;
    }

    if (opts.query) {
      config.params = opts.query;
    }

    if (opts.auth) {
      config.auth = opts.auth;
    }

    try {
      const response = await axios(config);
      const duration = Date.now() - startTime;

      return {
        success: true,
        method: config.method,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
        duration,
        size: JSON.stringify(response.data || '').length,
        url: response.request?.res?.responseUrl || opts.url
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      
      if (err.response) {
        return {
          success: false,
          method: config.method,
          status: err.response.status,
          statusText: err.response.statusText,
          headers: err.response.headers,
          body: err.response.data,
          duration,
          error: err.message
        };
      }
      
      return {
        success: false,
        method: config.method,
        status: 0,
        statusText: 'Connection Failed',
        headers: {},
        body: null,
        duration,
        error: err.message,
        code: err.code
      };
    }
  }

  async get(url, opts = {}) {
    return this.request({ ...opts, method: 'GET', url });
  }

  async post(url, body, opts = {}) {
    return this.request({ ...opts, method: 'POST', url, body });
  }

  async put(url, body, opts = {}) {
    return this.request({ ...opts, method: 'PUT', url, body });
  }

  async patch(url, body, opts = {}) {
    return this.request({ ...opts, method: 'PATCH', url, body });
  }

  async delete(url, opts = {}) {
    return this.request({ ...opts, method: 'DELETE', url });
  }

  async head(url, opts = {}) {
    return this.request({ ...opts, method: 'HEAD', url });
  }

  async options(url, opts = {}) {
    return this.request({ ...opts, method: 'OPTIONS', url });
  }

  // Batch test multiple endpoints
  async batchTest(tests) {
    const results = [];
    for (const test of tests) {
      const result = await this.request(test);
      results.push({
        ...result,
        name: test.name || test.url,
        method: test.method || 'GET'
      });
    }
    return results;
  }

  // Health check - wait for endpoint to respond
  async waitForEndpoint(url, opts = {}) {
    const maxAttempts = opts.attempts || 30;
    const interval = opts.interval || 2000;
    const expectedStatus = opts.expectedStatus || 200;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.get(url, { timeout: 5000 });
        if (result.status === expectedStatus) {
          return { ready: true, attempts: i + 1, result };
        }
      } catch (err) {
        // Not ready yet
      }
      await new Promise(r => setTimeout(r, interval));
    }

    return { ready: false, attempts: maxAttempts };
  }

  formatResult(result) {
    const statusColor = result.status >= 200 && result.status < 300 ? 'green' :
                        result.status >= 300 && result.status < 400 ? 'yellow' :
                        result.status >= 400 && result.status < 500 ? 'red' :
                        result.status >= 500 ? 'red' : 'gray';

    const lines = [];
    lines.push(chalk.hex(ORANGE).bold(`${result.method || 'GET'} ${result.url}`));
    lines.push(`  Status:   ${chalk[statusColor](result.status)} ${result.statusText || ''}`);
    lines.push(`  Duration: ${chalk.cyan(formatDuration(result.duration))}`);
    lines.push(`  Size:     ${chalk.cyan(result.size + ' bytes')}`);
    
    if (result.error) {
      lines.push(`  Error:    ${chalk.red(result.error)}`);
    }

    return lines.join('\n');
  }

  formatBody(body, maxLen = 500) {
    if (!body) return chalk.gray('(empty)');
    const str = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    if (str.length > maxLen) return str.substring(0, maxLen) + chalk.gray('...(truncated)');
    return str;
  }
}

module.exports = HttpTester;
