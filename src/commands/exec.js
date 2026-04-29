const chalk = require('chalk');
const ora = require('ora');
const DockerManager = require('../lib/docker');
const { log, ORANGE } = require('../utils/logger');
const { formatDuration } = require('../utils/helpers');

class ExecCommands {
  constructor() {
    this.docker = new DockerManager();
  }

  async init() {
    await this.docker.init();
  }

  async run(sandboxId, command, opts) {
    const spinner = ora({ text: `Running: ${command}`, color: 'yellow' }).start();
    const startTime = Date.now();
    
    try {
      spinner.stop();
      
      const result = await this.docker.execInSandbox(sandboxId, command, {
        timeout: opts.timeout ? parseInt(opts.timeout) : undefined,
        workdir: opts.workdir,
        stream: opts.stream || false,
        tty: opts.tty !== false,
        startTime
      });

      const duration = formatDuration(Date.now() - startTime);
      
      if (result.exitCode === 0) {
        log.nl();
        log.success(chalk.green(`Command completed in ${chalk.cyan(duration)}`));
      } else {
        log.nl();
        log.error(chalk.red(`Command failed with exit code ${result.exitCode}`));
      }

      if (!opts.stream && result.stdout) {
        log.nl();
        log.banner('  📤 STDOUT:\n');
        log.plain(result.stdout);
      }

      if (result.stderr) {
        log.nl();
        log.banner('  📥 STDERR:\n');
        log.plain(chalk.yellow(result.stderr));
      }

      log.nl();
      log.json({
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        command
      });

      return result;
    } catch (err) {
      spinner.fail(chalk.red(`Execution failed: ${err.message}`));
      log.json({
        success: false,
        error: err.message,
        command
      });
      throw err;
    }
  }

  async exec(sandboxId, command, opts) {
    return this.run(sandboxId, command, opts);
  }

  async script(sandboxId, scriptPath, opts) {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    const scriptName = path.basename(scriptPath);
    
    log.step(`Running script: ${scriptName}`);
    
    // Copy script to sandbox and execute
    const wrappedScript = `cat << 'MEATLOAF_SCRIPT_EOF' > /tmp/meatloaf-script.sh
${scriptContent}
MEATLOAF_SCRIPT_EOF
chmod +x /tmp/meatloaf-script.sh
/bin/sh /tmp/meatloaf-script.sh`;

    return this.run(sandboxId, wrappedScript, opts);
  }

  async upload(sandboxId, localPath, containerPath, opts) {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }

    const fileName = path.basename(localPath);
    const dest = containerPath || `/workspace/${fileName}`;
    
    log.step(`Uploading ${fileName} → ${dest}`);
    
    // Use docker cp equivalent via exec
    const content = fs.readFileSync(localPath);
    const base64 = content.toString('base64');
    
    const cmd = `echo '${base64}' | base64 -d > ${dest}`;
    await this.docker.execInSandbox(sandboxId, cmd);
    
    log.success(`File uploaded: ${dest}`);
    return { success: true, path: dest };
  }

  async download(sandboxId, containerPath, localPath, opts) {
    const fs = require('fs');
    
    log.step(`Downloading ${containerPath} → ${localPath || './'}`);
    
    const result = await this.docker.execInSandbox(sandboxId, `cat ${containerPath}`);
    
    if (localPath) {
      fs.writeFileSync(localPath, result.stdout);
      log.success(`File downloaded: ${localPath}`);
    }
    
    return { success: true, content: result.stdout, path: localPath };
  }
}

module.exports = ExecCommands;
