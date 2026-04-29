const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { log, ORANGE } = require('../utils/logger');
const { CONFIG_DIR } = require('../utils/config');

const PROFILES_DIR = path.join(CONFIG_DIR, 'profiles');

class EnvProfileManager {
  constructor() {
    if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
  }

  create(name, vars = {}) {
    const profilePath = path.join(PROFILES_DIR, `${name}.json`);
    const profile = {
      name,
      variables: vars,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    log.success(`Profile "${name}" created 📋`);
    log.json({ success: true, name, variables: Object.keys(vars) });
  }

  load(name) {
    const profilePath = path.join(PROFILES_DIR, `${name}.json`);
    if (!fs.existsSync(profilePath)) throw new Error(`Profile "${name}" not found`);
    return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  }

  list() {
    const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));
    log.nl();
    log.banner('  📋 Environment Profiles\n');
    if (files.length === 0) {
      log.info(chalk.gray('No profiles. Create with: meatloaf env create <name>'));
      return;
    }
    const rows = files.map(f => {
      const profile = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), 'utf8'));
      return [profile.name, Object.keys(profile.variables || {}).length.toString(), new Date(profile.updatedAt).toISOString().split('T')[0]];
    });
    log.table(rows, ['Name', 'Variables', 'Updated']);
    log.json({ success: true, profiles: files.map(f => f.replace('.json', '')) });
  }

  set(name, key, value) {
    const profile = this.load(name);
    profile.variables[key] = value;
    profile.updatedAt = Date.now();
    fs.writeFileSync(path.join(PROFILES_DIR, `${name}.json`), JSON.stringify(profile, null, 2));
    log.success(`Set ${key} in profile "${name}"`);
  }

  unset(name, key) {
    const profile = this.load(name);
    delete profile.variables[key];
    profile.updatedAt = Date.now();
    fs.writeFileSync(path.join(PROFILES_DIR, `${name}.json`), JSON.stringify(profile, null, 2));
    log.success(`Removed ${key} from profile "${name}"`);
  }

  show(name) {
    const profile = this.load(name);
    log.nl();
    log.banner(`  📋 Profile: ${name}\n`);
    const rows = Object.entries(profile.variables || {}).map(([k, v]) => [k, v]);
    if (rows.length === 0) {
      log.info(chalk.gray('No variables set'));
    } else {
      log.table(rows, ['Variable', 'Value']);
    }
    log.json({ success: true, profile });
  }

  delete(name) {
    const profilePath = path.join(PROFILES_DIR, `${name}.json`);
    if (!fs.existsSync(profilePath)) throw new Error(`Profile "${name}" not found`);
    fs.unlinkSync(profilePath);
    log.success(`Profile "${name}" deleted 🗑️`);
  }

  inject(sandboxId, profileName) {
    const profile = this.load(profileName);
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const { getSandboxMeta } = require('../utils/config');
    
    const meta = getSandboxMeta(sandboxId);
    if (!meta) throw new Error(`Sandbox ${sandboxId} not found`);

    const envVars = Object.entries(profile.variables || {}).map(([k, v]) => `${k}=${v}`);
    log.success(`Injected ${envVars.length} variable(s) from "${profileName}" into ${sandboxId}`);
    log.json({ success: true, sandboxId, profile: profileName, variables: envVars });
    return envVars;
  }

  merge(...names) {
    const merged = {};
    for (const name of names) {
      const profile = this.load(name);
      Object.assign(merged, profile.variables || {});
    }
    log.json({ success: true, merged, count: Object.keys(merged).length });
    return merged;
  }

  diff(name1, name2) {
    const p1 = this.load(name1);
    const p2 = this.load(name2);
    const v1 = p1.variables || {};
    const v2 = p2.variables || {};
    
    const added = Object.keys(v2).filter(k => !v1[k]);
    const removed = Object.keys(v1).filter(k => !v2[k]);
    const changed = Object.keys(v1).filter(k => v2[k] && v1[k] !== v2[k]);
    const same = Object.keys(v1).filter(k => v2[k] && v1[k] === v2[k]);

    log.nl();
    log.banner(`  🔀 Diff: ${name1} ↔ ${name2}\n`);
    if (added.length) { log.success(`Added: ${added.join(', ')}`); }
    if (removed.length) { log.error(`Removed: ${removed.join(', ')}`); }
    if (changed.length) { log.warn(`Changed: ${changed.join(', ')}`); }
    if (same.length) { log.info(`Same: ${same.length} variable(s)`); }
    
    log.json({ success: true, added, removed, changed, same });
  }
}

module.exports = EnvProfileManager;
