#!/usr/bin/env node

/**
 * Ultraflow Autostart
 * Starts background services: Token Dashboard, Brain MCP Server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const LOG_PREFIX = '[Ultraflow Autostart]';
const PID_DIR = path.join(__dirname, '..', '.ultraflow');
const PID_FILE = path.join(PID_DIR, 'pids.json');

function log(msg) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function ensurePidDir() {
  if (!fs.existsSync(PID_DIR)) {
    fs.mkdirSync(PID_DIR, { recursive: true });
  }
}

function savePids(pids) {
  ensurePidDir();
  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
}

function loadPids() {
  try {
    if (fs.existsSync(PID_FILE)) {
      return JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function killPid(pid, name) {
  try {
    process.kill(pid, 'SIGTERM');
    log(`Stopped ${name} (PID: ${pid})`);
  } catch (e) {
    log(`Could not stop ${name}: ${e.message}`);
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function startService(scriptPath, name) {
  const pids = loadPids();

  // Check if already running
  if (pids[name] && isRunning(pids[name])) {
    log(`${name} already running (PID: ${pids[name]})`);
    return true;
  }

  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT_DIR,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    pids[name] = child.pid;
    savePids(pids);

    log(`${name} started (PID: ${child.pid})`);
    return true;
  } catch (e) {
    log(`Failed to start ${name}: ${e.message}`);
    return false;
  }
}

function stopService(name) {
  const pids = loadPids();
  if (pids[name]) {
    killPid(pids[name], name);
    delete pids[name];
    savePids(pids);
  }
}

function stopAll() {
  const pids = loadPids();
  for (const name of Object.keys(pids)) {
    stopService(name);
  }
  log('All services stopped');
}

function startAll() {
  log('Starting all services...');

  // Start Token Dashboard
  startService(
    path.join(ROOT_DIR, 'lib/token-dashboard/server.js'),
    'token-dashboard'
  );

  // Start Brain MCP Server
  startService(
    path.join(ROOT_DIR, 'lib/brain-server/server.js'),
    'brain-server'
  );

  // Start MCP Server
  startService(
    path.join(ROOT_DIR, 'bin/ultraflow-mcp.js'),
    'mcp-server'
  );

  log('All services started');
}

function status() {
  const pids = loadPids();
  const running = [];
  const stopped = [];

  for (const [name, pid] of Object.entries(pids)) {
    if (isRunning(pid)) {
      running.push({ name, pid });
    } else {
      stopped.push(name);
    }
  }

  console.log('\n=== Ultraflow Services Status ===');
  if (running.length > 0) {
    console.log('\nRunning:');
    for (const r of running) {
      console.log(`  ✓ ${r.name} (PID: ${r.pid})`);
    }
  }
  if (stopped.length > 0) {
    console.log('\nStopped:');
    for (const s of stopped) {
      console.log(`  ✗ ${s}`);
    }
  }
  if (running.length === 0 && stopped.length === 0) {
    console.log('No services started yet');
  }
  console.log('');
}

const args = process.argv.slice(2);
const command = args[0] || 'start';

switch (command) {
  case 'start':
    startAll();
    console.log('\nServices:');
    console.log('  - Token Dashboard: http://localhost:3000');
    console.log('  - Brain MCP Server: ready');
    console.log('  - MCP Server: ready');
    break;
  case 'stop':
    stopAll();
    break;
  case 'restart':
    stopAll();
    startAll();
    break;
  case 'status':
    status();
    break;
  default:
    console.log('Usage: node autostart.js [start|stop|restart|status]');
}