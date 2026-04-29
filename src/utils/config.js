const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.meatloaf');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SANDBOXES_DIR = path.join(CONFIG_DIR, 'sandboxes');
const SNAPSHOTS_DIR = path.join(CONFIG_DIR, 'snapshots');

function ensureDirs() {
  [CONFIG_DIR, SANDBOXES_DIR, SNAPSHOTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function loadConfig() {
  ensureDirs();
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return getDefaultConfig();
}

function saveConfig(config) {
  ensureDirs();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getDefaultConfig() {
  return {
    version: '1.0.0',
    defaultImage: 'node:20-alpine',
    defaultShell: '/bin/sh',
    sandboxTTL: 3600000,        // 1 hour auto-cleanup
    maxSandboxes: 10,
    portRange: { start: 10000, end: 60000 },
    network: 'bridge',
    screenshot: {
      width: 1280,
      height: 720,
      format: 'png'
    },
    http: {
      timeout: 30000,
      followRedirects: true
    },
    cleanup: {
      onExit: true,
      orphanCheck: true
    }
  };
}

function getSandboxMeta(sandboxId) {
  const metaPath = path.join(SANDBOXES_DIR, `${sandboxId}.json`);
  if (fs.existsSync(metaPath)) {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  }
  return null;
}

function saveSandboxMeta(sandboxId, meta) {
  ensureDirs();
  const metaPath = path.join(SANDBOXES_DIR, `${sandboxId}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({ ...meta, updatedAt: Date.now() }, null, 2));
}

function removeSandboxMeta(sandboxId) {
  const metaPath = path.join(SANDBOXES_DIR, `${sandboxId}.json`);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
}

function listSandboxMetas() {
  ensureDirs();
  const files = fs.readdirSync(SANDBOXES_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const id = f.replace('.json', '');
    return { id, ...getSandboxMeta(id) };
  }).filter(Boolean);
}

function parseComposeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.json')) return JSON.parse(content);
  return yaml.parse(content);
}

module.exports = {
  CONFIG_DIR, CONFIG_FILE, SANDBOXES_DIR, SNAPSHOTS_DIR,
  ensureDirs, loadConfig, saveConfig, getDefaultConfig,
  getSandboxMeta, saveSandboxMeta, removeSandboxMeta, listSandboxMetas,
  parseComposeFile
};
