const chalk = require('chalk');
const http = require('http');
const net = require('net');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class ProxyManager {
  constructor() {
    this.servers = new Map();
  }

  async start(sandboxId, opts = {}) {
    const localPort = parseInt(opts.port) || 8888;
    const targetPort = parseInt(opts.target) || 3000;
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = docker.getContainer(meta.containerId);
    const info = await container.inspect();
    const containerIP = Object.values(info.NetworkSettings.Networks)[0]?.IPAddress;
    if (!containerIP) throw new Error('Cannot determine container IP');

    const target = `http://${containerIP}:${targetPort}`;

    const server = http.createServer((req, res) => {
      const proxyReq = http.request(`${target}${req.url}`, { method: req.method, headers: req.headers }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      req.pipe(proxyReq);
      proxyReq.on('error', (err) => {
        res.writeHead(502);
        res.end(`Proxy Error: ${err.message}`);
      });
    });

    server.listen(localPort, () => {
      log.nl();
      log.banner('  🔀 Proxy Started\n');
      log.table([
        ['Local', `http://localhost:${localPort}`],
        ['Target', target],
        ['Sandbox', sandboxId]
      ].map(([k, v]) => [chalk.hex(ORANGE).bold(k), v]), ['From', 'To']);
      log.nl();
      log.json({ success: true, localPort, target, sandboxId, message: `Proxy running on :${localPort} → :${targetPort}` });
    });

    this.servers.set(sandboxId, server);

    process.on('SIGINT', () => {
      this.stopAll();
      process.exit(0);
    });

    await new Promise(() => {});
  }

  async forward(sandboxId, opts = {}) {
    const localPort = parseInt(opts.port) || 8888;
    const targetPort = parseInt(opts.target) || 3000;
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = docker.getContainer(meta.containerId);
    const info = await container.inspect();
    const containerIP = Object.values(info.NetworkSettings.Networks)[0]?.IPAddress;
    if (!containerIP) throw new Error('Cannot determine container IP');

    const server = net.createServer((clientSocket) => {
      const targetSocket = net.createConnection(targetPort, containerIP);
      clientSocket.pipe(targetSocket);
      targetSocket.pipe(clientSocket);
      clientSocket.on('error', () => targetSocket.destroy());
      targetSocket.on('error', () => clientSocket.destroy());
    });

    server.listen(localPort, () => {
      log.success(`TCP Forward: localhost:${localPort} → ${containerIP}:${targetPort}`);
      log.json({ success: true, localPort, target: `${containerIP}:${targetPort}`, type: 'tcp' });
    });

    this.servers.set(`tcp-${sandboxId}`, server);
    process.on('SIGINT', () => { this.stopAll(); process.exit(0); });
    await new Promise(() => {});
  }

  stop(sandboxId) {
    const server = this.servers.get(sandboxId) || this.servers.get(`tcp-${sandboxId}`);
    if (server) {
      server.close();
      this.servers.delete(sandboxId);
      this.servers.delete(`tcp-${sandboxId}`);
      log.success(`Proxy stopped for ${sandboxId}`);
    }
  }

  stopAll() {
    for (const [id, server] of this.servers) {
      server.close();
    }
    this.servers.clear();
    log.info('All proxies stopped');
  }

  async tunnel(sandboxId, opts = {}) {
    log.banner('  🚇 Tunnel Mode\n');
    log.info('Creating secure tunnel to sandbox...');
    
    const localPort = parseInt(opts.port) || 3000;
    const subdomain = opts.subdomain || `ml-${sandboxId}`;
    
    // Use localhost.run for free SSH tunneling
    try {
      const tunnel = require('child_process').spawn('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-R', `80:localhost:${localPort}`,
        'localhost.run'
      ], { stdio: ['pipe', 'pipe', 'pipe'] });

      tunnel.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('http')) {
          const url = output.match(/(https?:\/\/[^\s]+)/)?.[1];
          if (url) {
            log.nl();
            log.success(chalk.green(`Tunnel URL: ${chalk.bold(url)}`));
            log.json({ success: true, url, localPort, sandboxId });
          }
        }
        process.stdout.write(output);
      });

      tunnel.stderr.on('data', (data) => {
        process.stdout.write(chalk.gray(data.toString()));
      });

      process.on('SIGINT', () => {
        tunnel.kill();
        log.info('\nTunnel closed');
        process.exit(0);
      });

      await new Promise(() => {});
    } catch (err) {
      log.error(`Tunnel failed: ${err.message}. Install ssh client.`);
    }
  }
}

module.exports = ProxyManager;
