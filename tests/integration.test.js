#!/usr/bin/env node

/**
 * 🧪 Meatloaf Integration Tests
 * 
 * Tests the core functionality of the Meatloaf CLI.
 * Requires Docker to be running.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const MEATLOAF = path.join(__dirname, '..', 'bin', 'meatloaf.js');
const TIMEOUT = 60000;

let passed = 0;
let failed = 0;
let total = 0;

function run(args, opts = {}) {
  try {
    const result = execSync(`node ${MEATLOAF} ${args}`, {
      timeout: opts.timeout || TIMEOUT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MEATLOAF_DEBUG: opts.debug ? '1' : '' }
    });
    return { success: true, stdout: result.trim(), stderr: '' };
  } catch (err) {
    return {
      success: false,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      exitCode: err.status
    };
  }
}

function test(name, fn) {
  total++;
  process.stdout.write(chalk.hex('#FF6B35')(`  🧪 ${name} ... `));
  
  try {
    const result = fn();
    if (result && result.then) {
      return result.then(() => {
        passed++;
        console.log(chalk.green('✅ PASS'));
      }).catch(err => {
        failed++;
        console.log(chalk.red(`❌ FAIL: ${err.message}`));
      });
    }
    passed++;
    console.log(chalk.green('✅ PASS'));
  } catch (err) {
    failed++;
    console.log(chalk.red(`❌ FAIL: ${err.message}`));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertContains(str, substr, message) {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected "${str}" to contain "${substr}"`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧪 TEST SUITE
// ═══════════════════════════════════════════════════════════════

async function runTests() {
  console.log(chalk.hex('#FF6B35').bold('\n  🥩 MEATLOAF TEST SUITE\n'));
  console.log(chalk.gray('  Testing CLI functionality...\n'));

  // ── CLI Basics ──────────────────────────────────────────────

  test('CLI --version', () => {
    const r = run('--version');
    assert(r.success, 'Version command failed');
    assertContains(r.stdout, '1.0.0');
  });

  test('CLI --help', () => {
    const r = run('--help');
    assert(r.success, 'Help command failed');
    assertContains(r.stdout, 'Meatloaf');
    assertContains(r.stdout, 'create');
    assertContains(r.stdout, 'exec');
    assertContains(r.stdout, 'test');
  });

  test('CLI templates list', () => {
    const r = run('templates');
    assert(r.success, 'Templates command failed');
    assertContains(r.stdout, 'node-express');
    assertContains(r.stdout, 'python-flask');
  });

  // ── Init ────────────────────────────────────────────────────

  test('Init project from template', () => {
    const testDir = '/tmp/meatloaf-test-init';
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
    
    const r = run(`init -t node-express -o ${testDir}`);
    assert(r.success, 'Init failed');
    assert(fs.existsSync(path.join(testDir, 'server.js')), 'server.js not created');
    assert(fs.existsSync(path.join(testDir, 'meatloaf.yml')), 'meatloaf.yml not created');
    assert(fs.existsSync(path.join(testDir, '.meatloaf.json')), '.meatloaf.json not created');
    
    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  });

  // ── Sandbox Lifecycle ───────────────────────────────────────

  let sandboxId = null;

  test('Create sandbox', async () => {
    const r = run('create --image alpine:latest --json');
    assert(r.success, `Create failed: ${r.stderr}`);
    
    // Extract sandbox ID from JSON output
    const lines = r.stdout.split('\n');
    const jsonLine = lines.find(l => l.includes('"sandboxId"'));
    assert(jsonLine, 'No JSON output found');
    
    const data = JSON.parse(lines.slice(lines.indexOf(lines.find(l => l.startsWith('{')))).join('\n'));
    sandboxId = data.sandboxId;
    assert(sandboxId, 'No sandbox ID returned');
  });

  test('List sandboxes', () => {
    const r = run('list');
    assert(r.success, 'List failed');
    assertContains(r.stdout, sandboxId);
  });

  test('Inspect sandbox', () => {
    const r = run(`inspect ${sandboxId}`);
    assert(r.success, 'Inspect failed');
    assertContains(r.stdout, sandboxId);
  });

  test('Execute command in sandbox', () => {
    const r = run(`exec ${sandboxId} "echo hello-meatloaf" --json`);
    assert(r.success, 'Exec failed');
    assertContains(r.stdout, 'hello-meatloaf');
  });

  test('Execute multi-command in sandbox', () => {
    const r = run(`exec ${sandboxId} "mkdir -p /tmp/test && echo works > /tmp/test/file.txt && cat /tmp/test/file.txt" --json`);
    assert(r.success, 'Multi-exec failed');
    assertContains(r.stdout, 'works');
  });

  // ── HTTP Testing ────────────────────────────────────────────

  test('HTTP test against public endpoint', () => {
    const r = run('test --url https://httpbin.org/get --json');
    assert(r.success, 'HTTP test failed');
    assertContains(r.stdout, '200');
  });

  test('HTTP test with custom method', () => {
    const r = run('test --url https://httpbin.org/post -m POST -b \'{"test":"data"}\' --json');
    assert(r.success, 'HTTP POST test failed');
    assertContains(r.stdout, '200');
  });

  // ── Cleanup ─────────────────────────────────────────────────

  test('Destroy sandbox', () => {
    const r = run(`destroy ${sandboxId}`);
    assert(r.success, 'Destroy failed');
  });

  test('Verify sandbox destroyed', () => {
    const r = run('list');
    assert(r.success, 'List failed');
    // Should not contain our sandbox anymore
    assert(!r.stdout.includes(sandboxId), 'Sandbox still exists after destroy');
  });

  // ── Results ─────────────────────────────────────────────────

  console.log(chalk.gray('\n  ' + '─'.repeat(50)));
  console.log(chalk.hex('#FF6B35').bold(`\n  📊 Results: ${passed}/${total} passed`));
  
  if (failed > 0) {
    console.log(chalk.red(`  ❌ ${failed} tests failed\n`));
    process.exit(1);
  } else {
    console.log(chalk.green(`  ✅ All tests passed! 🎉\n`));
    process.exit(0);
  }
}

// Run
runTests().catch(err => {
  console.error(chalk.red(`\n  💥 Test suite crashed: ${err.message}\n`));
  process.exit(1);
});
