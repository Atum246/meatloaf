const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const Docker = require('dockerode');
const DockerManager = require('../lib/docker');
const { log, ORANGE } = require('../utils/logger');
const { generateId } = require('../utils/helpers');

class ComposeManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.manager = new DockerManager();
    this.services = new Map();
  }

  async up(composeFile, opts = {}) {
    const filePath = composeFile || 'meatloaf-compose.yml';
    if (!fs.existsSync(filePath)) throw new Error(`Compose file not found: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const config = filePath.endsWith('.json') ? JSON.parse(content) : yaml.parse(content);
    
    const projectName = opts.projectName || config.name || path.basename(process.cwd());
    const networkName = `${projectName}-net`;
    
    log.nl();
    log.banner(`  🥩 COMPOSE UP: ${projectName}\n`);
    
    // Create network
    log.step(`Creating network: ${networkName}`);
    try {
      await this.docker.createNetwork({ Name: networkName, Labels: { 'meatloaf.compose': projectName } });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      log.info(`Network ${networkName} already exists`);
    }

    const results = [];
    
    // Start services in order
    const services = config.services || {};
    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      const containerName = `${projectName}-${serviceName}`;
      log.nl();
      log.step(`Starting service: ${serviceName}`);
      
      try {
        // Remove existing container
        try {
          const existing = this.docker.getContainer(containerName);
          await existing.remove({ force: true });
        } catch (e) { /* not found, ok */ }

        // Create container
        const ports = {};
        const exposedPorts = {};
        if (serviceConfig.ports) {
          for (const p of serviceConfig.ports) {
            const parts = String(p).split(':');
            if (parts.length === 2) {
              exposedPorts[`${parts[1]}/tcp`] = {};
              ports[`${parts[1]}/tcp`] = [{ HostPort: parts[0] }];
            }
          }
        }

        const env = [];
        if (serviceConfig.environment) {
          if (Array.isArray(serviceConfig.environment)) {
            env.push(...serviceConfig.environment);
          } else {
            Object.entries(serviceConfig.environment).forEach(([k, v]) => env.push(`${k}=${v}`));
          }
        }

        const binds = [];
        if (serviceConfig.volumes) {
          for (const v of serviceConfig.volumes) {
            const parts = String(v).split(':');
            if (parts.length >= 2) binds.push(`${parts[0]}:${parts[1]}:${parts[2] || 'rw'}`);
          }
        }

        const container = await this.docker.createContainer({
          Image: serviceConfig.image,
          name: containerName,
          Env: env,
          ExposedPorts: exposedPorts,
          Labels: {
            'meatloaf.compose': projectName,
            'meatloaf.service': serviceName
          },
          HostConfig: {
            PortBindings: ports,
            Binds: binds,
            NetworkMode: networkName
          },
          Cmd: serviceConfig.command ? (Array.isArray(serviceConfig.command) ? serviceConfig.command : ['/bin/sh', '-c', serviceConfig.command]) : undefined
        });

        await container.start();
        
        const info = await container.inspect();
        results.push({
          service: serviceName,
          container: containerName,
          status: 'started',
          id: info.Id.substring(0, 12)
        });
        
        log.success(`${serviceName} started (${info.Id.substring(0, 12)})`);
      } catch (err) {
        results.push({ service: serviceName, status: 'failed', error: err.message });
        log.error(`${serviceName} failed: ${err.message}`);
      }
    }

    log.nl();
    log.banner('  📊 Compose Status\n');
    const rows = results.map(r => [
      r.service,
      r.status === 'started' ? chalk.green('🟢 Running') : chalk.red('🔴 Failed'),
      r.container || '-',
      r.error || '-'
    ]);
    log.table(rows, ['Service', 'Status', 'Container', 'Error']);
    
    log.json({ success: true, project: projectName, network: networkName, services: results });
    return results;
  }

  async down(composeFile, opts = {}) {
    const filePath = composeFile || 'meatloaf-compose.yml';
    let projectName = opts.projectName;
    
    if (!projectName && fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = filePath.endsWith('.json') ? JSON.parse(content) : yaml.parse(content);
      projectName = config.name || path.basename(process.cwd());
    }
    
    if (!projectName) throw new Error('Project name required. Use --project-name or provide compose file.');

    log.nl();
    log.banner(`  🥩 COMPOSE DOWN: ${projectName}\n`);
    
    // Find and remove containers
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: [`meatloaf.compose=${projectName}`] }
    });

    for (const c of containers) {
      const name = c.Names[0]?.replace('/', '');
      log.step(`Stopping: ${name}`);
      try {
        await this.docker.getContainer(c.Id).remove({ force: true, v: true });
        log.success(`Removed: ${name}`);
      } catch (e) {
        log.warn(`Failed to remove ${name}: ${e.message}`);
      }
    }

    // Remove network
    const networkName = `${projectName}-net`;
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [networkName] } });
      if (networks.length > 0) {
        await this.docker.getNetwork(networks[0].Id).remove();
        log.success(`Network removed: ${networkName}`);
      }
    } catch (e) {
      log.warn(`Failed to remove network: ${e.message}`);
    }

    log.nl();
    log.success(chalk.green(`Compose project ${projectName} destroyed`));
    log.json({ success: true, project: projectName, message: 'All services stopped and removed' });
  }

  async ps(projectName) {
    const containers = await this.docker.listContainers({
      all: true,
      filters: projectName ? { label: [`meatloaf.compose=${projectName}`] } : { label: ['meatloaf.compose'] }
    });

    log.nl();
    log.banner('  🥩 Compose Services\n');
    
    if (containers.length === 0) {
      log.info(chalk.gray('No compose services running'));
      return;
    }

    const rows = containers.map(c => {
      const project = c.Labels['meatloaf.compose'];
      const service = c.Labels['meatloaf.service'];
      const ports = c.Ports?.map(p => `${p.PublicPort}:${p.PrivatePort}`).join(', ') || '-';
      return [project, service, c.State, c.Image.substring(0, 30), ports, c.Names[0]?.replace('/', '')];
    });

    log.table(rows, ['Project', 'Service', 'Status', 'Image', 'Ports', 'Name']);
    log.json({ success: true, containers });
  }

  async logs(projectName, opts = {}) {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: [`meatloaf.compose=${projectName}`] }
    });

    for (const c of containers) {
      const service = c.Labels['meatloaf.service'];
      log.nl();
      log.banner(`  📋 ${service} (${c.Names[0]?.replace('/', '')}):\n`);
      
      try {
        const container = this.docker.getContainer(c.Id);
        const stream = await container.logs({ stdout: true, stderr: true, tail: opts.tail || 50 });
        process.stdout.write(stream.toString());
      } catch (e) {
        log.warn(`Could not fetch logs: ${e.message}`);
      }
    }
  }
}

module.exports = ComposeManager;
