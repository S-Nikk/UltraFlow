#!/usr/bin/env node

/**
 * Ultraflow OpenCode Init Hook
 * Initializes brain memory system for OpenCode
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3000;

async function ensureServicesRunning() {
  // Check if dashboard is running
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${DASHBOARD_PORT}/api/health`, (res) => {
        console.log('[Ultraflow] Dashboard already running');
        resolve(true);
      });
      req.on('error', () => {
        // Not running, start it
        startDashboard().then(() => resolve(true));
      });
      req.setTimeout(1000, () => resolve(false));
    });
  } catch (e) {
    return false;
  }
}

async function startDashboard() {
  const dashboardPath = path.join(__dirname, '../../lib/token-dashboard/server.js');
  
  if (!fs.existsSync(dashboardPath)) {
    console.log('[Ultraflow] Dashboard not found');
    return;
  }
  
  console.log('[Ultraflow] Starting dashboard...');
  
  spawn('node', [dashboardPath], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, PORT: DASHBOARD_PORT }
  }).unref();
  
  // Wait for start
  await new Promise(r => setTimeout(r, 2000));
}

async function main() {
  console.log('[Ultraflow] Initializing for OpenCode...');
  
  await ensureServicesRunning();
  
  console.log('[Ultraflow] OpenCode initialization complete');
  process.exit(0);
}

main().catch(e => {
  console.error('[Ultraflow] Error:', e.message);
  process.exit(1);
});