const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log, ORANGE } = require('../utils/logger');
const { CONFIG_DIR } = require('../utils/config');

const SECRETS_DIR = path.join(CONFIG_DIR, 'secrets');
const SECRETS_FILE = path.join(SECRETS_DIR, 'secrets.enc');
const KEY_FILE = path.join(SECRETS_DIR, '.key');

class SecretsManager {
  constructor() {
    this._ensureDir();
    this.key = this._loadOrCreateKey();
  }

  _ensureDir() {
    if (!fs.existsSync(SECRETS_DIR)) fs.mkdirSync(SECRETS_DIR, { recursive: true });
  }

  _loadOrCreateKey() {
    if (fs.existsSync(KEY_FILE)) {
      return fs.readFileSync(KEY_FILE);
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, key);
    fs.chmodSync(KEY_FILE, 0o600);
    return key;
  }

  _encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  _decrypt(encrypted) {
    const [ivHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  _loadSecrets() {
    if (!fs.existsSync(SECRETS_FILE)) return {};
    try {
      const encrypted = fs.readFileSync(SECRETS_FILE, 'utf8');
      return JSON.parse(this._decrypt(encrypted));
    } catch {
      return {};
    }
  }

  _saveSecrets(secrets) {
    const encrypted = this._encrypt(JSON.stringify(secrets));
    fs.writeFileSync(SECRETS_FILE, encrypted);
    fs.chmodSync(SECRETS_FILE, 0o600);
  }

  set(name, value) {
    const secrets = this._loadSecrets();
    secrets[name] = { value, createdAt: Date.now(), updatedAt: Date.now() };
    this._saveSecrets(secrets);
    log.success(`Secret "${name}" stored 🔐`);
    log.json({ success: true, name, message: 'Secret stored securely' });
  }

  get(name) {
    const secrets = this._loadSecrets();
    const secret = secrets[name];
    if (!secret) {
      log.error(`Secret "${name}" not found`);
      log.json({ success: false, name, error: 'Not found' });
      return null;
    }
    log.json({ success: true, name, value: secret.value, createdAt: secret.createdAt });
    return secret.value;
  }

  list() {
    const secrets = this._loadSecrets();
    const names = Object.keys(secrets);
    
    log.nl();
    log.banner('  🔐 Secrets\n');
    if (names.length === 0) {
      log.info(chalk.gray('No secrets stored. Use: meatloaf secrets set <name> <value>'));
    } else {
      const rows = names.map(n => [
        n,
        '••••••••',
        new Date(secrets[n].createdAt).toISOString().split('T')[0],
        new Date(secrets[n].updatedAt).toISOString().split('T')[0]
      ]);
      log.table(rows, ['Name', 'Value', 'Created', 'Updated']);
    }
    log.json({ success: true, count: names.length, names });
  }

  remove(name) {
    const secrets = this._loadSecrets();
    if (!secrets[name]) {
      log.error(`Secret "${name}" not found`);
      return;
    }
    delete secrets[name];
    this._saveSecrets(secrets);
    log.success(`Secret "${name}" removed 🗑️`);
    log.json({ success: true, name, message: 'Secret removed' });
  }

  inject(sandboxId, secretNames) {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const { getSandboxMeta } = require('../utils/config');
    
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const secrets = this._loadSecrets();
    const injected = [];

    for (const name of secretNames) {
      const secret = secrets[name];
      if (!secret) {
        log.warn(`Secret "${name}" not found, skipping`);
        continue;
      }
      injected.push(`${name}=${secret.value}`);
    }

    log.success(`Injected ${injected.length} secret(s) into ${sandboxId}`);
    log.json({ success: true, sandboxId, injected: secretNames, count: injected.length });
    return injected;
  }

  export_env(secretNames) {
    const secrets = this._loadSecrets();
    const lines = [];
    for (const name of secretNames) {
      const secret = secrets[name];
      if (secret) lines.push(`export ${name}="${secret.value}"`);
    }
    const output = lines.join('\n');
    log.plain(output);
    log.json({ success: true, env: output });
    return output;
  }

  import_env(filePath) {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const secrets = this._loadSecrets();
    let count = 0;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        secrets[name] = { value: value.replace(/^["']|["']$/g, ''), createdAt: Date.now(), updatedAt: Date.now() };
        count++;
      }
    }

    this._saveSecrets(secrets);
    log.success(`Imported ${count} secret(s) from ${filePath}`);
    log.json({ success: true, imported: count, file: filePath });
  }
}

module.exports = SecretsManager;
