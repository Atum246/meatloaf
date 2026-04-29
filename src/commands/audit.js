const chalk = require('chalk');
const fs = require('fs');
const { log, ORANGE } = require('../utils/logger');
const { CONFIG_DIR } = require('../utils/config');

const AUDIT_FILE = `${CONFIG_DIR}/audit.json`;

class AuditLogger {
  constructor() {
    this.entries = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(AUDIT_FILE)) return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    } catch {}
    return [];
  }

  _save() {
    // Keep last 1000 entries
    if (this.entries.length > 1000) this.entries = this.entries.slice(-1000);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.entries, null, 2));
  }

  log(action, details = {}) {
    const entry = {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      action,
      ...details
    };
    this.entries.push(entry);
    this._save();
    return entry;
  }

  query(opts = {}) {
    let entries = [...this.entries];
    
    if (opts.action) entries = entries.filter(e => e.action.includes(opts.action));
    if (opts.sandboxId) entries = entries.filter(e => e.sandboxId === opts.sandboxId);
    if (opts.since) entries = entries.filter(e => e.timestamp >= opts.since);
    if (opts.limit) entries = entries.slice(-parseInt(opts.limit));

    log.nl();
    log.banner('  📋 Audit Log\n');
    
    if (entries.length === 0) {
      log.info(chalk.gray('No audit entries found'));
    } else {
      const rows = entries.slice(-20).map(e => [
        e.iso?.split('T')[1]?.split('.')[0] || '-',
        e.action || '-',
        e.sandboxId || '-',
        e.user || 'system',
        e.success !== undefined ? (e.success ? '✅' : '❌') : '-'
      ]);
      log.table(rows, ['Time', 'Action', 'Sandbox', 'User', 'Result']);
      if (entries.length > 20) log.info(chalk.gray(`Showing last 20 of ${entries.length} entries`));
    }

    log.json({ success: true, count: entries.length, entries });
  }

  clear() {
    this.entries = [];
    this._save();
    log.success('Audit log cleared');
  }

  export(filePath) {
    fs.writeFileSync(filePath, JSON.stringify(this.entries, null, 2));
    log.success(`Audit log exported to ${filePath}`);
  }

  stats() {
    const actions = {};
    for (const e of this.entries) {
      actions[e.action] = (actions[e.action] || 0) + 1;
    }

    log.nl();
    log.banner('  📊 Audit Stats\n');
    const rows = Object.entries(actions).sort((a, b) => b[1] - a[1]).map(([action, count]) => [action, count.toString()]);
    log.table(rows, ['Action', 'Count']);
    log.json({ success: true, total: this.entries.length, actions });
  }
}

// Singleton
const audit = new AuditLogger();

// Middleware to auto-log CLI actions
function auditMiddleware(action) {
  return (opts = {}) => {
    audit.log(action, { sandboxId: opts.sandboxId, success: opts.success });
  };
}

module.exports = { AuditLogger, audit, auditMiddleware };
