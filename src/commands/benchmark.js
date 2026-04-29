const chalk = require('chalk');
const { log, ORANGE } = require('../utils/logger');
const { formatDuration } = require('../utils/helpers');
const axios = require('axios');

class BenchmarkRunner {
  constructor() {
    this.results = [];
  }

  async run(url, opts = {}) {
    const concurrency = parseInt(opts.concurrency) || 10;
    const requests = parseInt(opts.requests) || 100;
    const method = (opts.method || 'GET').toUpperCase();
    const timeout = parseInt(opts.timeout) || 30000;

    log.nl();
    log.banner('  ⚡ BENCHMARK\n');
    log.table([
      ['URL', url],
      ['Method', method],
      ['Total Requests', requests.toString()],
      ['Concurrency', concurrency.toString()],
      ['Timeout', timeout + 'ms']
    ].map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Parameter', 'Value']);
    log.nl();

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      latencies: [],
      statusCodes: {},
      errors: [],
      startTime: Date.now()
    };

    const batchSize = concurrency;
    const batches = Math.ceil(requests / batchSize);
    
    const spinner = { text: '', interval: null };
    let completed = 0;

    // Progress display
    const progressInterval = setInterval(() => {
      const pct = ((completed / requests) * 100).toFixed(1);
      const elapsed = Date.now() - results.startTime;
      const rps = completed > 0 ? ((completed / elapsed) * 1000).toFixed(1) : '0';
      process.stdout.write(`\r${chalk.hex(ORANGE)('⚡')} Progress: ${pct}% | ${completed}/${requests} | ${rps} req/s | Errors: ${results.failed}   `);
    }, 200);

    for (let batch = 0; batch < batches; batch++) {
      const batchSizeActual = Math.min(batchSize, requests - batch * batchSize);
      const promises = [];

      for (let i = 0; i < batchSizeActual; i++) {
        promises.push(this.singleRequest(url, method, opts, timeout));
      }

      const batchResults = await Promise.allSettled(promises);
      
      for (const r of batchResults) {
        completed++;
        results.total++;
        
        if (r.status === 'fulfilled') {
          const res = r.value;
          results.latencies.push(res.duration);
          results.statusCodes[res.status] = (results.statusCodes[res.status] || 0) + 1;
          if (res.status >= 200 && res.status < 400) results.success++;
          else results.failed++;
        } else {
          results.failed++;
          results.errors.push(r.reason?.message || 'Unknown error');
        }
      }
    }

    clearInterval(progressInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    const totalDuration = Date.now() - results.startTime;
    const avgLatency = results.latencies.length > 0 
      ? results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length 
      : 0;
    const sortedLatencies = [...results.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    const minLatency = sortedLatencies[0] || 0;
    const maxLatency = sortedLatencies[sortedLatencies.length - 1] || 0;
    const rps = (results.total / totalDuration * 1000).toFixed(2);

    log.nl();
    log.banner('  📊 Results\n');
    
    const summaryRows = [
      ['Total Time', formatDuration(totalDuration)],
      ['Requests/sec', rps],
      ['Total Requests', results.total.toString()],
      ['Successful', chalk.green(results.success.toString())],
      ['Failed', chalk.red(results.failed.toString())],
      ['Success Rate', ((results.success / results.total) * 100).toFixed(1) + '%']
    ];
    log.table(summaryRows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Metric', 'Value']);

    log.nl();
    log.banner('  ⏱️  Latency\n');
    const latencyRows = [
      ['Average', formatDuration(avgLatency)],
      ['Min', formatDuration(minLatency)],
      ['Max', formatDuration(maxLatency)],
      ['P50', formatDuration(p50)],
      ['P95', formatDuration(p95)],
      ['P99', formatDuration(p99)]
    ];
    log.table(latencyRows.map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['Percentile', 'Time']);

    if (Object.keys(results.statusCodes).length > 0) {
      log.nl();
      log.banner('  📡 Status Codes\n');
      const codeRows = Object.entries(results.statusCodes).map(([code, count]) => {
        const color = code >= 200 && code < 300 ? 'green' : code >= 400 ? 'red' : 'yellow';
        return [chalk[color](code), count.toString()];
      });
      log.table(codeRows, ['Code', 'Count']);
    }

    if (results.errors.length > 0) {
      log.nl();
      log.banner('  ❌ Errors\n');
      const errorCounts = {};
      for (const e of results.errors) errorCounts[e] = (errorCounts[e] || 0) + 1;
      const errorRows = Object.entries(errorCounts).map(([err, count]) => [err, count.toString()]);
      log.table(errorRows, ['Error', 'Count']);
    }

    log.json({
      success: true,
      url,
      duration: totalDuration,
      rps: parseFloat(rps),
      requests: { total: results.total, success: results.success, failed: results.failed },
      latency: { avg: avgLatency, min: minLatency, max: maxLatency, p50, p95, p99 },
      statusCodes: results.statusCodes,
      errors: results.errors.length > 0 ? results.errors : undefined
    });
  }

  async singleRequest(url, method, opts, timeout) {
    const start = Date.now();
    try {
      const config = { method, url, timeout, validateStatus: () => true };
      if (opts.body) config.data = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
      if (opts.header) {
        config.headers = {};
        const headers = Array.isArray(opts.header) ? opts.header : [opts.header];
        for (const h of headers) {
          const [k, ...v] = h.split(':');
          config.headers[k.trim()] = v.join(':').trim();
        }
      }
      const response = await axios(config);
      return { status: response.status, duration: Date.now() - start };
    } catch (err) {
      return { status: 0, duration: Date.now() - start, error: err.message };
    }
  }
}

module.exports = BenchmarkRunner;
