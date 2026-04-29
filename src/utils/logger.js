const chalk = require('chalk');

const ORANGE = '#FF6B35';

const log = {
  // Banner / header
  banner: (text) => console.log(chalk.hex(ORANGE).bold(text)),
  
  // Success
  success: (text) => console.log(chalk.green('✅ ') + text),
  
  // Error
  error: (text) => console.log(chalk.red('❌ ') + text),
  
  // Warning
  warn: (text) => console.log(chalk.yellow('⚠️  ') + text),
  
  // Info
  info: (text) => console.log(chalk.cyan('ℹ️  ') + text),
  
  // Debug
  debug: (text) => {
    if (process.env.MEATLOAF_DEBUG) {
      console.log(chalk.gray('🔍 ') + chalk.gray(text));
    }
  },
  
  // Step
  step: (text) => console.log(chalk.hex(ORANGE)('➜  ') + text),
  
  // Plain
  plain: (text) => console.log(text),
  
  // JSON output (for AI agents to parse)
  json: (data) => console.log(JSON.stringify(data, null, 2)),
  
  // Table
  table: (rows, headers) => {
    const Table = require('cli-table3');
    const t = new Table({
      head: headers.map(h => chalk.hex(ORANGE).bold(h)),
      style: { head: [], border: [] },
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      }
    });
    rows.forEach(r => t.push(r));
    console.log(t.toString());
  },

  // Horizontal rule
  hr: () => console.log(chalk.hex(ORANGE)('─'.repeat(60))),
  
  // Newline
  nl: () => console.log('')
};

function getLogo() {
  return chalk.hex(ORANGE).bold(`
  ███╗   ███╗███████╗ █████╗ ████████╗██╗      ██████╗  █████╗ ███████╗
  ████╗ ████║██╔════╝██╔══██╗╚══██╔══╝██║     ██╔═══██╗██╔══██╗██╔════╝
  ██╔████╔██║█████╗  ███████║   ██║   ██║     ██║   ██║███████║█████╗  
  ██║╚██╔╝██║██╔══╝  ██╔══██║   ██║   ██║     ██║   ██║██╔══██║██╔══╝  
  ██║ ╚═╝ ██║███████╗██║  ██║   ██║   ███████╗╚██████╔╝██║  ██║██║     
  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     
  `);
}

function getShortLogo() {
  return chalk.hex(ORANGE).bold('🥩 Meatloaf') + chalk.gray(' v1.0.0');
}

function printLogo() {
  console.log(getLogo());
  console.log(chalk.gray('  AI Agent Sandbox Runtime — Build. Run. Test. Ship. 🚀\n'));
}

function printShortLogo() {
  console.log(getShortLogo());
}

module.exports = { log, getLogo, getShortLogo, printLogo, printShortLogo, ORANGE };
