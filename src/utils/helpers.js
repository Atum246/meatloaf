const chalk = require('chalk');

function generateId(prefix = 'ml') {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${id}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function truncate(str, maxLen = 100) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function parseEnv(envArray) {
  const env = {};
  if (!envArray) return env;
  for (const item of envArray) {
    const eqIdx = item.indexOf('=');
    if (eqIdx > 0) {
      env[item.substring(0, eqIdx)] = item.substring(eqIdx + 1);
    }
  }
  return env;
}

function parsePorts(portMappings) {
  const ports = {};
  if (!portMappings) return ports;
  for (const mapping of portMappings) {
    const parts = mapping.split(':');
    if (parts.length === 2) {
      ports[parseInt(parts[1])] = parseInt(parts[0]);
    } else if (parts.length === 1) {
      const port = parseInt(parts[0]);
      ports[port] = port;
    }
  }
  return ports;
}

function parseVolumes(volumeMappings) {
  const volumes = [];
  if (!volumeMappings) return volumes;
  for (const mapping of volumeMappings) {
    const parts = mapping.split(':');
    if (parts.length >= 2) {
      volumes.push({
        hostPath: parts[0],
        containerPath: parts[1],
        mode: parts[2] || 'rw'
      });
    }
  }
  return volumes;
}

function timestamp() {
  return new Date().toISOString();
}

function statusEmoji(status) {
  const map = {
    'created': '🆕',
    'running': '🟢',
    'paused': '⏸️',
    'stopped': '🔴',
    'exited': '⏹️',
    'dead': '💀',
    'unknown': '❓'
  };
  return map[status] || '❓';
}

module.exports = {
  generateId, sleep, formatBytes, formatDuration,
  truncate, parseEnv, parsePorts, parseVolumes,
  timestamp, statusEmoji
};
