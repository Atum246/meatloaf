/**
 * 🥩 Meatloaf — Programmatic API
 * 
 * Use Meatloaf as a library in your AI agent code:
 * 
 *   const { Sandbox, HttpTester, Screenshotter } = require('meatloaf');
 *   
 *   const sb = new Sandbox();
 *   await sb.create({ image: 'node:20-alpine' });
 *   await sb.exec('npm install express');
 *   await sb.test('http://localhost:3000');
 */

const DockerManager = require('./docker');
const HttpTester = require('./http');
const Screenshotter = require('./screenshot');

class Sandbox {
  constructor(opts = {}) {
    this.manager = new DockerManager();
    this.id = null;
    this.opts = opts;
  }

  async create(opts = {}) {
    const result = await this.manager.createSandbox({ ...this.opts, ...opts });
    this.id = result.id;
    await this.manager.startSandbox(this.id);
    return result;
  }

  async exec(command, opts = {}) {
    if (!this.id) throw new Error('Sandbox not created. Call create() first.');
    return this.manager.execInSandbox(this.id, command, opts);
  }

  async test(url, opts = {}) {
    const http = new HttpTester();
    return http.request({ url, ...opts });
  }

  async screenshot(url, opts = {}) {
    const ss = new Screenshotter();
    await ss.init();
    const result = await ss.capture(url, opts);
    await ss.close();
    return result;
  }

  async logs(opts = {}) {
    if (!this.id) throw new Error('Sandbox not created.');
    return this.manager.getContainerLogs(this.id, opts);
  }

  async stats() {
    if (!this.id) throw new Error('Sandbox not created.');
    return this.manager.getContainerStats(this.id);
  }

  async stop() {
    if (!this.id) throw new Error('Sandbox not created.');
    return this.manager.stopSandbox(this.id);
  }

  async start() {
    if (!this.id) throw new Error('Sandbox not created.');
    return this.manager.startSandbox(this.id);
  }

  async destroy() {
    if (!this.id) throw new Error('Sandbox not created.');
    const result = await this.manager.destroySandbox(this.id);
    this.id = null;
    return result;
  }
}

module.exports = {
  Sandbox,
  DockerManager,
  HttpTester,
  Screenshotter
};
