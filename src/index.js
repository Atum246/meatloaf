#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { printLogo, printShortLogo, log, ORANGE } = require('./utils/logger');
const SandboxCommands = require('./commands/sandbox');
const ExecCommands = require('./commands/exec');
const HttpCommands = require('./commands/http');
const ScreenshotCommands = require('./commands/screenshot');
const LogsCommands = require('./commands/logs');
const { InitCommands } = require('./commands/init');
const NetworkManager = require('./commands/network');
const VolumeManager = require('./commands/volume');
const ImageManager = require('./commands/image');
const ComposeManager = require('./commands/compose');
const ProcessManager = require('./commands/process');
const FileSystemManager = require('./commands/filesystem');
const SnapshotManager = require('./commands/snapshot');
const ShellManager = require('./commands/shell');
const BenchmarkRunner = require('./commands/benchmark');
const HealthChecker = require('./commands/health');
const PortManager = require('./commands/port');
const SecretsManager = require('./commands/secrets');
const EnvProfileManager = require('./commands/env');
const WatchManager = require('./commands/watch');
const ProxyManager = require('./commands/proxy');
const CronManager = require('./commands/cron');
const DiffEngine = require('./commands/diff');
const MonitorDashboard = require('./commands/monitor');
const GitManager = require('./commands/git');
const SyncManager = require('./commands/sync');
const { AuditLogger, audit } = require('./commands/audit');
const ResourceQuota = require('./commands/quota');
const ServiceDiscovery = require('./commands/discovery');

const program = new Command();

// ═══════════════════════════════════════════════════════════════
// 🥩 MEATLOAF — AI Agent Sandbox Runtime
// ═══════════════════════════════════════════════════════════════

program
  .name('meatloaf')
  .description('🥩 Meatloaf — AI Agent Sandbox Runtime. Build. Run. Test. Ship.')
  .version('1.0.0')
  .option('--json', 'Output in JSON format (for AI agents)')
  .option('--quiet', 'Suppress banner and decorative output')
  .option('--debug', 'Enable debug output');

// Hook for global options
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.parent?.opts() || program.opts();
  if (opts.debug) process.env.MEATLOAF_DEBUG = '1';
  if (!opts.quiet && !opts.json) {
    // Only show logo for top-level help
  }
});

// ═══════════════════════════════════════════════════════════════
// 🆕 CREATE — Spin up a new sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('create')
  .description('🆕 Create a new sandbox environment')
  .option('-i, --image <image>', 'Docker image to use', 'node:20-alpine')
  .option('-p, --port <port...>', 'Port mappings (host:container)')
  .option('-e, --env <env...>', 'Environment variables (KEY=VALUE)')
  .option('-v, --volume <volume...>', 'Volume mounts (host:container)')
  .option('-w, --workdir <dir>', 'Working directory', '/workspace')
  .option('-m, --memory <mb>', 'Memory limit in MB', '512')
  .option('-c, --cpu <cores>', 'CPU cores', '1')
  .option('--no-start', 'Create but don\'t start')
  .action(async (opts) => {
    try {
      if (!opts.quiet) printShortLogo();
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.create(opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 💀 DESTROY — Tear down a sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('destroy <sandbox-id>')
  .alias('rm')
  .description('💀 Destroy a sandbox and clean up')
  .action(async (sandboxId, opts) => {
    try {
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.destroy(sandboxId, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📋 LIST — Show all sandboxes
// ═══════════════════════════════════════════════════════════════

program
  .command('list')
  .alias('ls')
  .description('📋 List all active sandboxes')
  .action(async () => {
    try {
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.list();
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🔍 INSPECT — Detailed sandbox info
// ═══════════════════════════════════════════════════════════════

program
  .command('inspect <sandbox-id>')
  .description('🔍 Inspect a sandbox in detail')
  .action(async (sandboxId) => {
    try {
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.inspect(sandboxId);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// ⏹️ STOP — Stop a running sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('stop <sandbox-id>')
  .description('⏹️ Stop a running sandbox')
  .action(async (sandboxId) => {
    try {
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.stop(sandboxId);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🟢 START — Start a stopped sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('start <sandbox-id>')
  .description('🟢 Start a stopped sandbox')
  .action(async (sandboxId) => {
    try {
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.start(sandboxId);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// ▶️ EXEC — Execute a command in a sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('exec <sandbox-id> <command...>')
  .description('▶️ Execute a command inside a sandbox')
  .option('-t, --timeout <ms>', 'Command timeout in ms')
  .option('-w, --workdir <dir>', 'Working directory')
  .option('--stream', 'Stream output in real-time')
  .option('--no-tty', 'Disable TTY')
  .action(async (sandboxId, command, opts) => {
    try {
      const cmd = new ExecCommands();
      await cmd.init();
      await cmd.run(sandboxId, command.join(' '), opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📜 SCRIPT — Run a script file in a sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('script <sandbox-id> <script-path>')
  .description('📜 Run a script file inside a sandbox')
  .option('-t, --timeout <ms>', 'Script timeout in ms')
  .option('-w, --workdir <dir>', 'Working directory')
  .action(async (sandboxId, scriptPath, opts) => {
    try {
      const cmd = new ExecCommands();
      await cmd.init();
      await cmd.script(sandboxId, scriptPath, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// ⬆️ UPLOAD — Upload file to sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('upload <sandbox-id> <local-path> [container-path]')
  .alias('cp')
  .description('⬆️ Upload a file to the sandbox')
  .action(async (sandboxId, localPath, containerPath) => {
    try {
      const cmd = new ExecCommands();
      await cmd.init();
      await cmd.upload(sandboxId, localPath, containerPath);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// ⬇️ DOWNLOAD — Download file from sandbox
// ═══════════════════════════════════════════════════════════════

program
  .command('download <sandbox-id> <container-path> [local-path]')
  .description('⬇️ Download a file from the sandbox')
  .action(async (sandboxId, containerPath, localPath) => {
    try {
      const cmd = new ExecCommands();
      await cmd.init();
      await cmd.download(sandboxId, containerPath, localPath);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🌐 TEST — HTTP request tester
// ═══════════════════════════════════════════════════════════════

program
  .command('test [url]')
  .description('🌐 Test an HTTP endpoint')
  .option('-m, --method <method>', 'HTTP method', 'GET')
  .option('-b, --body <body>', 'Request body (JSON string)')
  .option('-j, --json <json>', 'JSON body (alias for --body)')
  .option('-H, --header <header...>', 'Headers (Key: Value)')
  .option('-t, --timeout <ms>', 'Request timeout', '30000')
  .option('--query <query>', 'Query parameters (JSON string)')
  .option('--max-body-length <len>', 'Max response body to display', '1000')
  .action(async (url, opts) => {
    try {
      const cmd = new HttpCommands();
      await cmd.init();
      await cmd.test({ url, ...opts });
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🧪 BATCH — Run batch HTTP tests
// ═══════════════════════════════════════════════════════════════

program
  .command('batch <test-file>')
  .description('🧪 Run batch HTTP tests from a JSON file')
  .action(async (filePath, opts) => {
    try {
      const cmd = new HttpCommands();
      await cmd.init();
      await cmd.batch(filePath, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// ⏳ WAIT — Wait for endpoint to be ready
// ═══════════════════════════════════════════════════════════════

program
  .command('wait <sandbox-id>')
  .description('⏳ Wait for a sandbox endpoint to be ready')
  .option('-p, --port <port>', 'Port to check', '3000')
  .option('--path <path>', 'URL path to check', '/')
  .option('-a, --attempts <n>', 'Max attempts', '30')
  .option('-i, --interval <ms>', 'Interval between attempts', '2000')
  .option('--expected-status <code>', 'Expected HTTP status', '200')
  .action(async (sandboxId, opts) => {
    try {
      const cmd = new HttpCommands();
      await cmd.init();
      await cmd.wait(sandboxId, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📸 SCREENSHOT — Capture a screenshot
// ═══════════════════════════════════════════════════════════════

program
  .command('screenshot <url-or-sandbox>')
  .alias('snap')
  .description('📸 Capture a screenshot of a URL or sandbox')
  .option('-p, --port <port>', 'Port (if sandbox ID)', '3000')
  .option('--path <path>', 'URL path', '/')
  .option('-W, --width <px>', 'Viewport width', '1280')
  .option('-H, --height <px>', 'Viewport height', '720')
  .option('--full-page', 'Capture full page')
  .option('-o, --output <filename>', 'Output filename')
  .option('--wait-for <selector>', 'Wait for CSS selector')
  .option('--wait-until <event>', 'Wait until event (load, domcontentloaded, networkidle)')
  .action(async (urlOrSandbox, opts) => {
    try {
      const cmd = new ScreenshotCommands();
      await cmd.init();
      await cmd.capture(urlOrSandbox, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📄 HTML — Get HTML snapshot
// ═══════════════════════════════════════════════════════════════

program
  .command('html <url-or-sandbox>')
  .description('📄 Get HTML snapshot of a page')
  .option('-p, --port <port>', 'Port (if sandbox ID)', '3000')
  .option('--path <path>', 'URL path', '/')
  .option('-o, --output <filename>', 'Save to file')
  .option('--full-output', 'Show full HTML in JSON')
  .action(async (urlOrSandbox, opts) => {
    try {
      const cmd = new ScreenshotCommands();
      await cmd.init();
      await cmd.html(urlOrSandbox, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📋 LOGS — View sandbox logs
// ═══════════════════════════════════════════════════════════════

program
  .command('logs <sandbox-id>')
  .description('📋 View sandbox logs')
  .option('-n, --tail <lines>', 'Number of lines to show', '100')
  .option('-t, --timestamps', 'Show timestamps')
  .option('-f, --follow', 'Follow log output')
  .option('-s, --since <timestamp>', 'Show logs since timestamp')
  .action(async (sandboxId, opts) => {
    try {
      const cmd = new LogsCommands();
      await cmd.init();
      
      if (opts.follow) {
        await cmd.follow(sandboxId, opts);
      } else {
        await cmd.get(sandboxId, opts);
      }
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📊 STATS — View sandbox resource usage
// ═══════════════════════════════════════════════════════════════

program
  .command('stats <sandbox-id>')
  .description('📊 View sandbox resource usage')
  .action(async (sandboxId) => {
    try {
      const cmd = new LogsCommands();
      await cmd.init();
      await cmd.stats(sandboxId);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🧹 CLEANUP — Remove orphaned sandboxes
// ═══════════════════════════════════════════════════════════════

program
  .command('cleanup')
  .description('🧹 Clean up orphaned sandboxes')
  .action(async () => {
    try {
      const cmd = new SandboxCommands();
      await cmd.init();
      await cmd.cleanup();
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🚀 INIT — Initialize a project from template
// ═══════════════════════════════════════════════════════════════

program
  .command('init')
  .description('🚀 Initialize a new project from a template')
  .option('-t, --template <name>', 'Template name', 'node-express')
  .option('-o, --output <dir>', 'Output directory')
  .action(async (opts) => {
    try {
      if (!opts.quiet) printShortLogo();
      const cmd = new InitCommands();
      await cmd.init(opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 📚 TEMPLATES — List available templates
// ═══════════════════════════════════════════════════════════════

program
  .command('templates')
  .alias('tpl')
  .description('📚 List available project templates')
  .action(async () => {
    try {
      const cmd = new InitCommands();
      await cmd.listTemplates();
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🔥 UP — Full lifecycle: create + setup + run
// ═══════════════════════════════════════════════════════════════

program
  .command('up [project-dir]')
  .description('🔥 Full lifecycle: create sandbox, setup, and run')
  .option('-i, --image <image>', 'Docker image')
  .option('-p, --port <port...>', 'Port mappings')
  .option('-e, --env <env...>', 'Environment variables')
  .option('--no-setup', 'Skip setup commands')
  .action(async (projectDir, opts) => {
    try {
      if (!opts.quiet) printShortLogo();
      
      const fs = require('fs');
      const path = require('path');
      const yaml = require('yaml');
      
      // Load meatloaf.yml if exists
      let config = {};
      const configPath = path.join(projectDir || '.', 'meatloaf.yml');
      const jsonConfigPath = path.join(projectDir || '.', '.meatloaf.json');
      
      if (fs.existsSync(configPath)) {
        config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
        log.step(`Loaded config: ${configPath}`);
      } else if (fs.existsSync(jsonConfigPath)) {
        config = JSON.parse(fs.readFileSync(jsonConfigPath, 'utf8'));
        log.step(`Loaded config: ${jsonConfigPath}`);
      }

      const sandboxCmd = new SandboxCommands();
      const execCmd = new ExecCommands();
      const httpCmd = new HttpCommands();
      await sandboxCmd.init();
      await execCmd.init();
      await httpCmd.init();

      // 1. Create sandbox
      log.nl();
      log.banner('  🥩 MEATLOAF UP — Full Lifecycle\n');
      
      const sandbox = await sandboxCmd.create({
        image: opts.image || config.image,
        ports: opts.port || config.ports,
        env: opts.env || config.env
      });

      // 2. Copy project files
      if (projectDir && fs.existsSync(projectDir)) {
        log.step('Uploading project files...');
        const files = fs.readdirSync(projectDir);
        for (const file of files) {
          if (file.startsWith('.') && file !== '.meatloaf.json') continue;
          const filePath = path.join(projectDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            await execCmd.upload(sandbox.id, filePath, `/workspace/${file}`);
          }
        }
      }

      // 3. Run setup commands
      if (opts.setup !== false && config.setup?.length) {
        log.nl();
        log.banner('  🔧 Running Setup\n');
        for (const cmd of config.setup) {
          log.step(`Running: ${cmd}`);
          await execCmd.run(sandbox.id, cmd, { timeout: 120000 });
        }
      }

      // 4. Start the application
      if (config.commands?.start) {
        log.nl();
        log.banner('  🚀 Starting Application\n');
        log.step(`Running: ${config.commands.start}`);
        // Run in background
        execCmd.run(sandbox.id, config.commands.start + ' &', { 
          timeout: 10000,
          stream: false 
        }).catch(() => {});
      }

      // 5. Wait for endpoint
      const port = config.ports?.[0]?.split(':')[0] || '3000';
      log.step(`Waiting for endpoint on port ${port}...`);
      
      const waitResult = await httpCmd.wait(sandbox.id, {
        port,
        attempts: 15,
        interval: 2000
      });

      log.nl();
      if (waitResult.ready) {
        log.success(chalk.green(`Application is ready on port ${port}! 🎉`));
      } else {
        log.warn(chalk.yellow(`Application may not be fully ready on port ${port}`));
      }

      log.nl();
      log.json({
        success: true,
        sandboxId: sandbox.id,
        port,
        ready: waitResult.ready,
        url: `http://localhost:${port}`,
        message: `Meatloaf is serving your app! 🥩🔥`
      });

    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🤖 AGENT — AI Agent integration helpers
// ═══════════════════════════════════════════════════════════════

program
  .command('agent')
  .description('🤖 AI Agent integration helpers')
  .option('--detect', 'Detect current AI agent environment')
  .action(async (opts) => {
    try {
      if (opts.detect) {
        const env = {
          platform: process.env.MEATLOAF_AGENT || 'unknown',
          openclaw: !!process.env.OPENCLAW_SESSION,
          claudeCode: !!process.env.CLAUDE_CODE,
          cursor: !!process.env.CURSOR,
          vscode: !!process.env.VSCODE_INJECTION,
          terminal: process.env.TERM_PROGRAM || 'unknown',
          shell: process.env.SHELL || 'unknown',
          cwd: process.cwd(),
          pid: process.pid
        };
        
        log.nl();
        log.banner('  🤖 Agent Environment\n');
        log.json(env);
      }
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🌐 NETWORK — Docker network management
// ═══════════════════════════════════════════════════════════════

const networkCmd = program.command('network').description('🌐 Docker network management');

networkCmd.command('create <name>')
  .description('🌐 Create a network')
  .option('-d, --driver <driver>', 'Network driver', 'bridge')
  .option('--subnet <subnet>', 'Subnet (e.g. 172.20.0.0/16)')
  .option('--gateway <gateway>', 'Gateway IP')
  .action(async (name, opts) => {
    try { await new NetworkManager().create(name, opts); } catch (e) { log.error(e.message); process.exit(1); }
  });

networkCmd.command('list').alias('ls').description('🌐 List networks')
  .action(async () => { try { await new NetworkManager().list(); } catch (e) { log.error(e.message); process.exit(1); } });

networkCmd.command('remove <name>').alias('rm').description('🌐 Remove a network')
  .action(async (name) => { try { await new NetworkManager().remove(name); } catch (e) { log.error(e.message); process.exit(1); } });

networkCmd.command('connect <network> <sandbox-id>').description('🌐 Connect sandbox to network')
  .action(async (n, s) => { try { await new NetworkManager().connect(n, s); } catch (e) { log.error(e.message); process.exit(1); } });

networkCmd.command('disconnect <network> <sandbox-id>').description('🌐 Disconnect sandbox from network')
  .action(async (n, s) => { try { await new NetworkManager().disconnect(n, s); } catch (e) { log.error(e.message); process.exit(1); } });

networkCmd.command('inspect <name>').description('🌐 Inspect a network')
  .action(async (name) => { try { await new NetworkManager().inspectNetwork(name); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 💾 VOLUME — Docker volume management
// ═══════════════════════════════════════════════════════════════

const volumeCmd = program.command('volume').description('💾 Docker volume management');

volumeCmd.command('create <name>').description('💾 Create a volume')
  .option('-d, --driver <driver>', 'Volume driver', 'local')
  .action(async (name, opts) => { try { await new VolumeManager().create(name, opts); } catch (e) { log.error(e.message); process.exit(1); } });

volumeCmd.command('list').alias('ls').description('💾 List volumes')
  .action(async () => { try { await new VolumeManager().list(); } catch (e) { log.error(e.message); process.exit(1); } });

volumeCmd.command('remove <name>').alias('rm').description('💾 Remove a volume')
  .action(async (name) => { try { await new VolumeManager().remove(name); } catch (e) { log.error(e.message); process.exit(1); } });

volumeCmd.command('inspect <name>').description('💾 Inspect a volume')
  .action(async (name) => { try { await new VolumeManager().inspectVolume(name); } catch (e) { log.error(e.message); process.exit(1); } });

volumeCmd.command('prune').description('💾 Remove unused volumes')
  .action(async () => { try { await new VolumeManager().prune(); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🖼️ IMAGE — Docker image management
// ═══════════════════════════════════════════════════════════════

const imageCmd = program.command('image').description('🖼️  Docker image management');

imageCmd.command('list').alias('ls').description('🖼️  List images')
  .option('--meatloaf', 'Show only Meatloaf images')
  .action(async (opts) => { try { await new ImageManager().list(opts); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('pull <image>').description('🖼️  Pull an image')
  .action(async (img) => { try { await new ImageManager().pull(img); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('remove <image>').alias('rm').description('🖼️  Remove an image')
  .option('-f, --force', 'Force remove')
  .action(async (img, opts) => { try { await new ImageManager().remove(img, opts); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('build <dockerfile> <tag>').description('🖼️  Build an image')
  .option('-c, --context <dir>', 'Build context', '.')
  .action(async (df, tag, opts) => { try { await new ImageManager().build(df, tag, opts); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('inspect <image>').description('🖼️  Inspect an image')
  .action(async (img) => { try { await new ImageManager().inspectImage(img); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('history <image>').description('🖼️  Show image history')
  .action(async (img) => { try { await new ImageManager().history(img); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('tag <source> <target>').description('🖼️  Tag an image')
  .action(async (s, t) => { try { await new ImageManager().tag(s, t); } catch (e) { log.error(e.message); process.exit(1); } });

imageCmd.command('prune').description('🖼️  Remove unused images')
  .action(async () => { try { await new ImageManager().prune(); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🎼 COMPOSE — Multi-container orchestration
// ═══════════════════════════════════════════════════════════════

const composeCmd = program.command('compose').alias('cmp').description('🎼 Multi-container orchestration');

composeCmd.command('up [file]').description('🎼 Start all services')
  .option('-n, --project-name <name>', 'Project name')
  .action(async (file, opts) => { try { await new ComposeManager().up(file, opts); } catch (e) { log.error(e.message); process.exit(1); } });

composeCmd.command('down [file]').description('🎼 Stop and remove all services')
  .option('-n, --project-name <name>', 'Project name')
  .action(async (file, opts) => { try { await new ComposeManager().down(file, opts); } catch (e) { log.error(e.message); process.exit(1); } });

composeCmd.command('ps [project]').description('🎼 List compose services')
  .action(async (project) => { try { await new ComposeManager().ps(project); } catch (e) { log.error(e.message); process.exit(1); } });

composeCmd.command('logs <project>').description('🎼 Show compose logs')
  .option('-n, --tail <lines>', 'Number of lines', '50')
  .action(async (project, opts) => { try { await new ComposeManager().logs(project, opts); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🔄 PROCESS — Process management inside sandboxes
// ═══════════════════════════════════════════════════════════════

const procCmd = program.command('ps').description('🔄 Process management');

procCmd.command('list <sandbox-id>').alias('ls').description('🔄 List processes')
  .option('-a, --all', 'Show all processes')
  .action(async (id, opts) => { try { await new ProcessManager().list(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

procCmd.command('kill <sandbox-id> <pid>').description('🔄 Kill a process')
  .option('-s, --signal <signal>', 'Signal', 'SIGTERM')
  .action(async (id, pid, opts) => { try { await new ProcessManager().kill(id, pid, opts); } catch (e) { log.error(e.message); process.exit(1); } });

procCmd.command('top <sandbox-id>').description('🔄 Top processes')
  .action(async (id) => { try { await new ProcessManager().top(id); } catch (e) { log.error(e.message); process.exit(1); } });

procCmd.command('tree <sandbox-id>').description('🔄 Process tree')
  .action(async (id) => { try { await new ProcessManager().tree(id); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 📁 FS — Filesystem operations inside sandboxes
// ═══════════════════════════════════════════════════════════════

const fsCmd = program.command('fs').description('📁 Filesystem operations');

fsCmd.command('ls <sandbox-id> [path]').description('📁 List directory')
  .option('-a, --all', 'Show hidden files')
  .action(async (id, p, opts) => { try { await new FileSystemManager().ls(id, p || '/workspace', opts); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('cat <sandbox-id> <path>').description('📁 Read file')
  .action(async (id, p) => { try { await new FileSystemManager().cat(id, p); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('find <sandbox-id> <pattern>').description('📁 Find files')
  .option('-p, --path <dir>', 'Search path', '/workspace')
  .option('-t, --type <type>', 'File type (f/d)')
  .action(async (id, pattern, opts) => { try { await new FileSystemManager().find(id, pattern, opts); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('write <sandbox-id> <path> <content>').description('📁 Write to file')
  .action(async (id, p, c) => { try { await new FileSystemManager().write(id, p, c); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('mkdir <sandbox-id> <path>').description('📁 Create directory')
  .option('-p, --parents', 'Create parent directories')
  .action(async (id, p, opts) => { try { await new FileSystemManager().mkdir(id, p, opts); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('rm <sandbox-id> <path>').description('📁 Remove file/dir')
  .option('-r, --recursive', 'Remove recursively')
  .action(async (id, p, opts) => { try { await new FileSystemManager().rm(id, p, opts); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('du <sandbox-id> [path]').description('📁 Disk usage')
  .action(async (id, p) => { try { await new FileSystemManager().du(id, p || '/workspace'); } catch (e) { log.error(e.message); process.exit(1); } });

fsCmd.command('grep <sandbox-id> <pattern>').description('📁 Search in files')
  .option('-p, --path <dir>', 'Search path', '/workspace')
  .option('-r, --recursive', 'Search recursively')
  .option('-n, --line-numbers', 'Show line numbers')
  .action(async (id, pattern, opts) => { try { await new FileSystemManager().grep(id, pattern, opts); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 📸 SNAPSHOT — Save/restore sandbox state
// ═══════════════════════════════════════════════════════════════

const snapCmd = program.command('snapshot').alias('snap2').description('📸 Save/restore sandbox state');

snapCmd.command('save <sandbox-id>').description('📸 Save sandbox as snapshot')
  .option('-t, --tag <tag>', 'Image tag')
  .option('-m, --message <msg>', 'Snapshot message')
  .action(async (id, opts) => { try { await new SnapshotManager().commit(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

snapCmd.command('restore <image-tag>').description('📸 Restore from snapshot')
  .option('-p, --port <port...>', 'Port mappings')
  .action(async (tag, opts) => { try { await new SnapshotManager().restore(tag, opts); } catch (e) { log.error(e.message); process.exit(1); } });

snapCmd.command('list').alias('ls').description('📸 List snapshots')
  .action(async () => { try { await new SnapshotManager().listSnapshots(); } catch (e) { log.error(e.message); process.exit(1); } });

snapCmd.command('export <sandbox-id> [output]').description('📸 Export sandbox as tar')
  .action(async (id, out) => { try { await new SnapshotManager().export(id, out); } catch (e) { log.error(e.message); process.exit(1); } });

snapCmd.command('import <tar-path>').description('📸 Import from tar')
  .option('-t, --tag <tag>', 'Image tag', 'meatloaf-import:latest')
  .action(async (p, opts) => { try { await new SnapshotManager().import(p, opts); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🐚 SHELL — Interactive shell
// ═══════════════════════════════════════════════════════════════

program
  .command('shell <sandbox-id>')
  .alias('sh')
  .description('🐚 Open interactive shell')
  .option('-s, --shell <shell>', 'Shell to use', '/bin/sh')
  .action(async (sandboxId, opts) => {
    try {
      await new ShellManager().open(sandboxId, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// ⚡ BENCHMARK — Load testing
// ═══════════════════════════════════════════════════════════════

program
  .command('bench <url>')
  .description('⚡ Benchmark / load test an endpoint')
  .option('-n, --requests <n>', 'Total requests', '100')
  .option('-c, --concurrency <n>', 'Concurrent requests', '10')
  .option('-m, --method <method>', 'HTTP method', 'GET')
  .option('-b, --body <body>', 'Request body')
  .option('-H, --header <header...>', 'Headers')
  .option('-t, --timeout <ms>', 'Request timeout', '30000')
  .action(async (url, opts) => {
    try {
      await new BenchmarkRunner().run(url, opts);
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🏥 HEALTH — Health checks
// ═══════════════════════════════════════════════════════════════

const healthCmd = program.command('health').description('🏥 Health checks');

healthCmd.command('check <sandbox-id>').description('🏥 Run health check')
  .option('-p, --port <port>', 'Port', '3000')
  .option('--path <path>', 'Health endpoint path', '/health')
  .action(async (id, opts) => { try { await new HealthChecker().check(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

healthCmd.command('watch <sandbox-id>').description('🏥 Watch health continuously')
  .option('-p, --port <port>', 'Port', '3000')
  .option('--path <path>', 'Health endpoint path', '/health')
  .option('-i, --interval <ms>', 'Check interval', '10000')
  .action(async (id, opts) => { try { await new HealthChecker().watch(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

healthCmd.command('system').description('🏥 Docker system health')
  .action(async () => { try { await new HealthChecker().system(); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🔌 PORT — Port scanning and management
// ═══════════════════════════════════════════════════════════════

const portCmd = program.command('port').description('🔌 Port management');

portCmd.command('scan [host]').description('🔌 Scan for open ports')
  .option('-s, --start <port>', 'Start port', '1')
  .option('-e, --end <port>', 'End port', '1024')
  .action(async (host, opts) => { try { await new PortManager().scan(host || 'localhost', opts); } catch (e) { log.error(e.message); process.exit(1); } });

portCmd.command('check <port>').description('🔌 Check if port is open')
  .option('-h, --host <host>', 'Host', 'localhost')
  .action(async (port, opts) => { try { await new PortManager().check(opts.host, parseInt(port)); } catch (e) { log.error(e.message); process.exit(1); } });

portCmd.command('find').description('🔌 Find available ports')
  .option('-s, --start <port>', 'Start port', '3000')
  .option('-n, --count <n>', 'Number of ports', '1')
  .action(async (opts) => { try { await new PortManager().findAvailable(parseInt(opts.start), parseInt(opts.count)); } catch (e) { log.error(e.message); process.exit(1); } });

portCmd.command('map <sandbox-id>').description('🔌 Show port mappings')
  .action(async (id) => { try { await new PortManager().map(id); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🧹 SYSTEM — System-wide operations
// ═══════════════════════════════════════════════════════════════

program
  .command('system')
  .description('🧹 System-wide operations')
  .option('--prune', 'Prune all unused resources')
  .option('--info', 'Show Docker system info')
  .action(async (opts) => {
    try {
      const Docker = require('dockerode');
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      
      if (opts.prune) {
        const spinner = ora({ text: 'Pruning all unused resources...', color: 'yellow' }).start();
        const containers = await docker.pruneContainers();
        const images = await docker.pruneImages();
        const volumes = await docker.pruneVolumes();
        const networks = await docker.pruneNetworks();
        spinner.succeed(chalk.green('Prune complete'));
        log.json({
          success: true,
          pruned: {
            containers: containers.ContainersDeleted?.length || 0,
            images: images.ImagesDeleted?.length || 0,
            volumes: volumes.VolumesDeleted?.length || 0,
            networks: networks.NetworksDeleted?.length || 0
          }
        });
      }
      
      if (opts.info) {
        const info = await docker.info();
        log.nl();
        log.banner('  🖥️  Docker System Info\n');
        log.json(info);
      }
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🔐 SECRETS — Encrypted secrets management
// ═══════════════════════════════════════════════════════════════

const secretsCmd = program.command('secrets').description('🔐 Encrypted secrets management');

secretsCmd.command('set <name> <value>').description('🔐 Store a secret')
  .action(async (n, v) => { try { new SecretsManager().set(n, v); } catch (e) { log.error(e.message); process.exit(1); } });

secretsCmd.command('get <name>').description('🔐 Get a secret')
  .action(async (n) => { try { new SecretsManager().get(n); } catch (e) { log.error(e.message); process.exit(1); } });

secretsCmd.command('list').alias('ls').description('🔐 List secrets')
  .action(async () => { try { new SecretsManager().list(); } catch (e) { log.error(e.message); process.exit(1); } });

secretsCmd.command('remove <name>').alias('rm').description('🔐 Remove a secret')
  .action(async (n) => { try { new SecretsManager().remove(n); } catch (e) { log.error(e.message); process.exit(1); } });

secretsCmd.command('inject <sandbox-id> <names...>').description('🔐 Inject secrets into sandbox')
  .action(async (id, names) => { try { new SecretsManager().inject(id, names); } catch (e) { log.error(e.message); process.exit(1); } });

secretsCmd.command('export <names...>').description('🔐 Export as env vars')
  .action(async (names) => { try { new SecretsManager().export_env(names); } catch (e) { log.error(e.message); process.exit(1); } });

secretsCmd.command('import <file>').description('🔐 Import from .env file')
  .action(async (f) => { try { new SecretsManager().import_env(f); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 📋 ENV — Environment profiles
// ═══════════════════════════════════════════════════════════════

const envCmd = program.command('env').alias('profile').description('📋 Environment profiles');

envCmd.command('create <name>').description('📋 Create a profile')
  .option('-v, --var <vars...>', 'Variables (KEY=VALUE)')
  .action(async (name, opts) => {
    try {
      const vars = {};
      if (opts.var) for (const v of opts.var) { const [k, ...val] = v.split('='); vars[k] = val.join('='); }
      new EnvProfileManager().create(name, vars);
    } catch (e) { log.error(e.message); process.exit(1); }
  });

envCmd.command('list').alias('ls').description('📋 List profiles')
  .action(async () => { try { new EnvProfileManager().list(); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('show <name>').description('📋 Show profile')
  .action(async (n) => { try { new EnvProfileManager().show(n); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('set <name> <key> <value>').description('📋 Set variable')
  .action(async (n, k, v) => { try { new EnvProfileManager().set(n, k, v); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('unset <name> <key>').description('📋 Remove variable')
  .action(async (n, k) => { try { new EnvProfileManager().unset(n, k); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('delete <name>').description('📋 Delete profile')
  .action(async (n) => { try { new EnvProfileManager().delete(n); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('inject <sandbox-id> <profile>').description('📋 Inject profile into sandbox')
  .action(async (id, p) => { try { new EnvProfileManager().inject(id, p); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('merge <profiles...>').description('📋 Merge profiles')
  .action(async (profiles) => { try { new EnvProfileManager().merge(...profiles); } catch (e) { log.error(e.message); process.exit(1); } });

envCmd.command('diff <profile1> <profile2>').description('📋 Compare profiles')
  .action(async (p1, p2) => { try { new EnvProfileManager().diff(p1, p2); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 👁️ WATCH — Auto-restart on changes
// ═══════════════════════════════════════════════════════════════

program
  .command('watch <sandbox-id>')
  .description('👁️  Watch for changes and auto-sync/restart')
  .option('-p, --path <path>', 'Watch path', '.')
  .option('--pattern <pattern>', 'File pattern', '**/*')
  .option('--debounce <ms>', 'Debounce ms', '1000')
  .option('-e, --exec <command>', 'Command to run on change')
  .action(async (id, opts) => {
    try { await new WatchManager().start(id, opts); } catch (e) { log.error(e.message); process.exit(1); }
  });

// ═══════════════════════════════════════════════════════════════
// 🔀 PROXY — Port forwarding & tunneling
// ═══════════════════════════════════════════════════════════════

const proxyCmd = program.command('proxy').description('🔀 Proxy & tunnel management');

proxyCmd.command('start <sandbox-id>').description('🔀 Start HTTP proxy')
  .option('-p, --port <port>', 'Local port', '8888')
  .option('-t, --target <port>', 'Target port', '3000')
  .action(async (id, opts) => { try { await new ProxyManager().start(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

proxyCmd.command('forward <sandbox-id>').description('🔀 TCP forward')
  .option('-p, --port <port>', 'Local port', '8888')
  .option('-t, --target <port>', 'Target port', '3000')
  .action(async (id, opts) => { try { await new ProxyManager().forward(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

proxyCmd.command('tunnel <sandbox-id>').description('🔀 Public tunnel (localhost.run)')
  .option('-p, --port <port>', 'Local port', '3000')
  .action(async (id, opts) => { try { await new ProxyManager().tunnel(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

proxyCmd.command('stop <sandbox-id>').description('🔀 Stop proxy')
  .action(async (id) => { try { new ProxyManager().stop(id); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// ⏰ CRON — Scheduled tasks inside sandboxes
// ═══════════════════════════════════════════════════════════════

const cronCmd = program.command('cron').alias('schedule').description('⏰ Scheduled tasks');

cronCmd.command('add <sandbox-id> <name> <schedule> <command>').description('⏰ Add cron job')
  .action(async (id, n, s, c) => { try { await new CronManager().add(id, n, s, c); } catch (e) { log.error(e.message); process.exit(1); } });

cronCmd.command('list <sandbox-id>').alias('ls').description('⏰ List cron jobs')
  .action(async (id) => { try { await new CronManager().list(id); } catch (e) { log.error(e.message); process.exit(1); } });

cronCmd.command('remove <sandbox-id> <pattern>').alias('rm').description('⏰ Remove cron jobs')
  .action(async (id, p) => { try { await new CronManager().remove(id, p); } catch (e) { log.error(e.message); process.exit(1); } });

cronCmd.command('clear <sandbox-id>').description('⏰ Clear all cron jobs')
  .action(async (id) => { try { await new CronManager().clear(id); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🔀 DIFF — Compare files and sandboxes
// ═══════════════════════════════════════════════════════════════

const diffCmd = program.command('diff').description('🔀 Compare files and sandboxes');

diffCmd.command('files <sandbox-id> <file1> <file2>').description('🔀 Diff two files')
  .action(async (id, f1, f2) => { try { await new DiffEngine().files(id, f1, f2); } catch (e) { log.error(e.message); process.exit(1); } });

diffCmd.command('sb <id1> <id2>').description('🔀 Compare two sandboxes')
  .option('-p, --path <path>', 'Compare path', '/workspace')
  .action(async (id1, id2, opts) => { try { await new DiffEngine().sandboxes(id1, id2, opts); } catch (e) { log.error(e.message); process.exit(1); } });

diffCmd.command('changes <sandbox-id>').description('🔀 Show filesystem changes')
  .action(async (id) => { try { await new DiffEngine().inspect(id); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 📊 MONITOR — Live dashboard
// ═══════════════════════════════════════════════════════════════

program
  .command('monitor')
  .alias('dash')
  .description('📊 Live monitoring dashboard')
  .option('-i, --interval <ms>', 'Refresh rate', '3000')
  .action(async (opts) => {
    try { await new MonitorDashboard().start(opts); } catch (e) { log.error(e.message); process.exit(1); }
  });

// ═══════════════════════════════════════════════════════════════
// 📁 GIT — Git operations inside sandboxes
// ═══════════════════════════════════════════════════════════════

const gitCmd = program.command('git').description('📁 Git operations');

gitCmd.command('clone <sandbox-id> <repo>').description('📁 Clone a repo')
  .option('-d, --dest <path>', 'Destination path')
  .option('-b, --branch <branch>', 'Branch')
  .option('--shallow', 'Shallow clone')
  .action(async (id, repo, opts) => { try { await new GitManager().clone(id, repo, opts); } catch (e) { log.error(e.message); process.exit(1); } });

gitCmd.command('status <sandbox-id>').description('📁 Git status')
  .option('-p, --path <path>', 'Repo path')
  .action(async (id, opts) => { try { await new GitManager().status(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

gitCmd.command('commit <sandbox-id> <message>').description('📁 Git commit')
  .option('-p, --path <path>', 'Repo path')
  .action(async (id, msg, opts) => { try { await new GitManager().commit(id, msg, opts); } catch (e) { log.error(e.message); process.exit(1); } });

gitCmd.command('push <sandbox-id>').description('📁 Git push')
  .option('-r, --remote <remote>', 'Remote', 'origin')
  .option('-b, --branch <branch>', 'Branch', 'main')
  .action(async (id, opts) => { try { await new GitManager().push(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

gitCmd.command('diff <sandbox-id>').description('📁 Git diff')
  .option('--staged', 'Show staged changes')
  .action(async (id, opts) => { try { await new GitManager().diff(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

gitCmd.command('log <sandbox-id>').description('📁 Git log')
  .option('-n, --count <n>', 'Number of entries', '20')
  .action(async (id, opts) => { try { await new GitManager().log(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🔄 SYNC — File synchronization
// ═══════════════════════════════════════════════════════════════

const syncCmd = program.command('sync').description('🔄 File synchronization');

syncCmd.command('up <sandbox-id> <local-path>').description('🔄 Upload directory')
  .option('-d, --dest <path>', 'Destination', '/workspace')
  .option('-e, --exclude <patterns...>', 'Exclude patterns')
  .action(async (id, p, opts) => { try { await new SyncManager().up(id, p, opts); } catch (e) { log.error(e.message); process.exit(1); } });

syncCmd.command('down <sandbox-id> <container-path>').description('🔄 Download directory')
  .option('-d, --dest <path>', 'Destination', './synced')
  .action(async (id, p, opts) => { try { await new SyncManager().down(id, p, opts); } catch (e) { log.error(e.message); process.exit(1); } });

syncCmd.command('watch <sandbox-id> <local-path>').description('🔄 Live sync')
  .option('--debounce <ms>', 'Debounce ms', '500')
  .action(async (id, p, opts) => { try { await new SyncManager().watch(id, p, opts); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 📋 AUDIT — Audit logging
// ═══════════════════════════════════════════════════════════════

const auditCmd = program.command('audit').description('📋 Audit logging');

auditCmd.command('log').description('📋 Show audit log')
  .option('-a, --action <action>', 'Filter by action')
  .option('-s, --sandbox <id>', 'Filter by sandbox')
  .option('-l, --limit <n>', 'Limit entries', '50')
  .action(async (opts) => { try { new AuditLogger().query(opts); } catch (e) { log.error(e.message); process.exit(1); } });

auditCmd.command('stats').description('📋 Audit statistics')
  .action(async () => { try { new AuditLogger().stats(); } catch (e) { log.error(e.message); process.exit(1); } });

auditCmd.command('clear').description('📋 Clear audit log')
  .action(async () => { try { new AuditLogger().clear(); } catch (e) { log.error(e.message); process.exit(1); } });

auditCmd.command('export <file>').description('📋 Export audit log')
  .action(async (f) => { try { new AuditLogger().export(f); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 📊 QUOTA — Resource quotas
// ═══════════════════════════════════════════════════════════════

const quotaCmd = program.command('quota').description('📊 Resource quotas');

quotaCmd.command('set <sandbox-id>').description('📊 Set resource limits')
  .option('-m, --memory <mb>', 'Memory limit (MB)')
  .option('-c, --cpu <cores>', 'CPU cores')
  .action(async (id, opts) => { try { await new ResourceQuota().set(id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

quotaCmd.command('get <sandbox-id>').description('📊 Get current limits')
  .action(async (id) => { try { await new ResourceQuota().get(id); } catch (e) { log.error(e.message); process.exit(1); } });

quotaCmd.command('limits').description('📊 System resource limits')
  .action(async () => { try { await new ResourceQuota().limits(); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// 🌐 DISCOVER — Service discovery
// ═══════════════════════════════════════════════════════════════

const discoverCmd = program.command('discover').alias('dns').description('🌐 Service discovery');

discoverCmd.command('resolve <name>').description('🌐 Resolve service name')
  .option('-n, --network <network>', 'Network', 'bridge')
  .action(async (name, opts) => { try { await new ServiceDiscovery().resolve(name, opts); } catch (e) { log.error(e.message); process.exit(1); } });

discoverCmd.command('lookup <sandbox-id>').description('🌐 Lookup sandbox network info')
  .action(async (id) => { try { await new ServiceDiscovery().lookup(id); } catch (e) { log.error(e.message); process.exit(1); } });

discoverCmd.command('register <name> <sandbox-id>').description('🌐 Register service')
  .option('-n, --network <network>', 'Network', 'meatloaf-services')
  .action(async (name, id, opts) => { try { await new ServiceDiscovery().register(name, id, opts); } catch (e) { log.error(e.message); process.exit(1); } });

discoverCmd.command('list').alias('ls').description('🌐 Discover services')
  .option('-n, --network <network>', 'Network', 'meatloaf-services')
  .action(async (opts) => { try { await new ServiceDiscovery().discover(opts); } catch (e) { log.error(e.message); process.exit(1); } });

// ═══════════════════════════════════════════════════════════════
// ❓ HELP — Custom help with logo
// ═══════════════════════════════════════════════════════════════

program.addHelpText('before', `
${chalk.hex(ORANGE).bold(`
  ███╗   ███╗███████╗ █████╗ ████████╗██╗      ██████╗  █████╗ ███████╗
  ████╗ ████║██╔════╝██╔══██╗╚══██╔══╝██║     ██╔═══██╗██╔══██╗██╔════╝
  ██╔████╔██║█████╗  ███████║   ██║   ██║     ██║   ██║███████║█████╗  
  ██║╚██╔╝██║██╔══╝  ██╔══██║   ██║   ██║     ██║   ██║██╔══██║██╔══╝  
  ██║ ╚═╝ ██║███████╗██║  ██║   ██║   ███████╗╚██████╔╝██║  ██║██║     
  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     
`)}
${chalk.gray('  AI Agent Sandbox Runtime — Build. Run. Test. Ship. 🚀\n')}
`);

// Parse and run
program.parse(process.argv);

// Show help if no command given
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
