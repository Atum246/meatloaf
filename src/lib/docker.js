const Docker = require('dockerode');
const { generateId, sleep, parsePorts, parseVolumes, parseEnv } = require('../utils/helpers');
const { saveSandboxMeta, removeSandboxMeta, getSandboxMeta, loadConfig } = require('../utils/config');
const { log } = require('../utils/logger');

class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.config = loadConfig();
  }

  async init() {
    try {
      await this.docker.ping();
      return true;
    } catch (err) {
      throw new Error(`Docker is not running or not accessible. ${err.message}`);
    }
  }

  async createSandbox(opts = {}) {
    const id = generateId('sandbox');
    const config = loadConfig();
    
    const image = opts.image || config.defaultImage;
    const name = `meatloaf-${id}`;
    
    // Pull image if needed
    await this.pullImage(image);

    const createOpts = {
      Image: image,
      name: name,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: opts.workdir || '/workspace',
      Env: Object.entries(parseEnv(opts.env)).map(([k, v]) => `${k}=${v}`),
      Labels: {
        'meatloaf.sandbox': 'true',
        'meatloaf.id': id,
        'meatloaf.created': Date.now().toString()
      },
      HostConfig: {
        AutoRemove: false,
        NetworkMode: config.network || 'bridge',
        Memory: opts.memory || 512 * 1024 * 1024, // 512MB
        CpuQuota: opts.cpu || 100000, // 1 CPU
        PortBindings: {},
        Binds: []
      },
      ExposedPorts: {}
    };

    // Port mappings
    if (opts.ports) {
      const portMap = parsePorts(opts.ports);
      for (const [containerPort, hostPort] of Object.entries(portMap)) {
        const key = `${containerPort}/tcp`;
        createOpts.ExposedPorts[key] = {};
        createOpts.HostConfig.PortBindings[key] = [{ HostPort: hostPort.toString() }];
      }
    }

    // Volume mounts
    if (opts.volumes) {
      const vols = parseVolumes(opts.volumes);
      for (const vol of vols) {
        createOpts.HostConfig.Binds.push(`${vol.hostPath}:${vol.containerPath}:${vol.mode}`);
      }
    }

    const container = await this.docker.createContainer(createOpts);
    
    const meta = {
      id,
      containerId: container.id,
      name,
      image,
      status: 'created',
      createdAt: Date.now(),
      ports: opts.ports || [],
      env: opts.env || [],
      workdir: opts.workdir || '/workspace',
      labels: {}
    };
    
    saveSandboxMeta(id, meta);
    return { id, containerId: container.id, name };
  }

  async startSandbox(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    await container.start();
    
    meta.status = 'running';
    meta.startedAt = Date.now();
    saveSandboxMeta(sandboxId, meta);
    
    return meta;
  }

  async stopSandbox(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    try {
      await container.stop({ t: 5 });
    } catch (err) {
      // Container might already be stopped
      if (!err.message.includes('already stopped')) throw err;
    }
    
    meta.status = 'stopped';
    meta.stoppedAt = Date.now();
    saveSandboxMeta(sandboxId, meta);
    
    return meta;
  }

  async destroySandbox(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    try {
      await container.remove({ force: true, v: true });
    } catch (err) {
      if (!err.message.includes('No such container')) throw err;
    }
    
    removeSandboxMeta(sandboxId);
    return true;
  }

  async execInSandbox(sandboxId, command, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      Tty: opts.tty !== false,
      WorkingDir: opts.workdir || meta.workdir
    });

    const stream = await exec.start({ Detach: false, Tty: opts.tty !== false });
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      stream.on('data', (chunk) => {
        const data = chunk.toString();
        stdout += data;
        if (opts.onData) opts.onData(data);
        if (opts.stream) process.stdout.write(data);
      });
      
      stream.on('error', (err) => {
        stderr += err.toString();
        if (opts.onError) opts.onError(err.toString());
      });
      
      stream.on('end', async () => {
        try {
          const inspectResult = await exec.inspect();
          resolve({
            exitCode: inspectResult.ExitCode || 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            duration: Date.now() - (opts.startTime || Date.now())
          });
        } catch (err) {
          resolve({
            exitCode: 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            duration: 0
          });
        }
      });
      
      // Timeout
      if (opts.timeout) {
        setTimeout(() => {
          stream.destroy();
          reject(new Error(`Command timed out after ${opts.timeout}ms`));
        }, opts.timeout);
      }
    });
  }

  async getContainerStats(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const stats = await container.stats({ stream: false });
    
    return {
      cpu: stats.cpu_stats,
      memory: {
        usage: stats.memory_stats.usage,
        limit: stats.memory_stats.limit,
        percent: ((stats.memory_stats.usage / stats.memory_stats.limit) * 100).toFixed(2)
      },
      network: stats.networks
    };
  }

  async getContainerLogs(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    
    const logOpts = {
      stdout: true,
      stderr: true,
      timestamps: opts.timestamps || false,
      tail: opts.tail || 100,
      follow: opts.follow || false
    };

    if (opts.since) logOpts.since = opts.since;
    
    const stream = await container.logs(logOpts);
    return stream;
  }

  async streamLogs(sandboxId, callback) {
    const stream = await this.getContainerLogs(sandboxId, { follow: true });
    stream.on('data', (chunk) => {
      // Strip Docker stream header
      const data = chunk.toString();
      callback(data);
    });
    return stream;
  }

  async inspectSandbox(sandboxId) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const info = await container.inspect();
    
    return {
      ...meta,
      container: {
        id: info.Id,
        state: info.State.Status,
        running: info.State.Running,
        startedAt: info.State.StartedAt,
        finishedAt: info.State.FinishedAt,
        exitCode: info.State.ExitCode,
        ports: info.NetworkSettings.Ports,
        networks: Object.keys(info.NetworkSettings.Networks)
      }
    };
  }

  async listSandboxes() {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: ['meatloaf.sandbox=true'] }
    });
    
    return containers.map(c => ({
      containerId: c.Id,
      name: c.Names[0]?.replace('/', ''),
      image: c.Image,
      status: c.State,
      ports: c.Ports,
      created: c.Created,
      labels: c.Labels
    }));
  }

  async pullImage(image) {
    try {
      await this.docker.getImage(image).inspect();
      log.debug(`Image ${image} already present`);
      return;
    } catch (err) {
      // Image not found, pull it
    }

    log.step(`Pulling image: ${image}...`);
    
    const stream = await this.docker.pull(image);
    
    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      }, (event) => {
        if (event.status === 'Downloading') {
          // Progress tracking
        }
      });
    });
  }

  async buildImage(dockerfile, tag, context = '.') {
    const stream = await this.docker.buildImage({
      context: context,
      src: [dockerfile]
    }, { t: tag });

    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, output) => {
        if (err) reject(err);
        else resolve({ tag, output });
      }, (event) => {
        if (event.stream) process.stdout.write(event.stream);
      });
    });
  }

  async cleanupOrphans() {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: ['meatloaf.sandbox=true'] }
    });

    const config = loadConfig();
    const ttl = config.sandboxTTL;
    const now = Date.now();
    let cleaned = 0;

    for (const c of containers) {
      const createdAt = c.Labels['meatloaf.created'];
      if (createdAt && (now - parseInt(createdAt)) > ttl) {
        await this.docker.getContainer(c.Id).remove({ force: true, v: true });
        const id = c.Labels['meatloaf.id'];
        if (id) removeSandboxMeta(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

module.exports = DockerManager;
