const chalk = require('chalk');
const Docker = require('dockerode');
const { log, ORANGE } = require('../utils/logger');
const { getSandboxMeta } = require('../utils/config');

class ShellManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async open(sandboxId, opts = {}) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const shell = opts.shell || '/bin/sh';
    const container = this.docker.getContainer(meta.containerId);

    log.nl();
    log.banner(`  🐚 Interactive Shell: ${sandboxId}`);
    log.info(chalk.gray(`Using: ${shell} | Type 'exit' to leave\n`));

    const exec = await container.exec({
      Cmd: [shell],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true,
      Tty: true
    });

    // Pipe stdin/stdout
    process.stdin.setRawMode(true);
    process.stdin.pipe(stream);
    stream.pipe(process.stdout);

    stream.on('end', () => {
      process.stdin.setRawMode(false);
      process.stdin.unref();
      log.nl();
      log.info('Shell session ended');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      stream.end();
      process.stdin.setRawMode(false);
      log.nl();
      log.info('Shell session terminated');
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});
  }

  async quick(sandboxId, command) {
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const container = this.docker.getContainer(meta.containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await exec.start({ Detach: false, Tty: true });
    stream.pipe(process.stdout);
    
    await new Promise((resolve) => {
      stream.on('end', resolve);
      setTimeout(resolve, 30000);
    });
  }
}

module.exports = ShellManager;
