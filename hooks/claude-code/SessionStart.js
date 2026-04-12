#!/usr/bin/env node

/**
 * Ultraflow SessionStart Hook
 * Auto-loads relevant memories and starts services at session begin
 */

import { fork } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3000;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;

// Check if dashboard is already running
function isDashboardRunning() {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(DASHBOARD_URL + '/api/health', (res) => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => resolve(false));
    });
  } catch (e) {
    return false;
  }
}

// Start token dashboard if not running
async function ensureDashboardRunning() {
  const running = await isDashboardRunning();
  if (running) {
    console.log('[Ultraflow] Dashboard already running at', DASHBOARD_URL);
    return;
  }

  console.log('[Ultraflow] Starting token dashboard...');
  
  const dashboardPath = path.join(__dirname, '../../lib/token-dashboard/server.js');
  
  if (!fs.existsSync(dashboardPath)) {
    console.log('[Ultraflow] Dashboard not found at:', dashboardPath);
    return;
  }

  // Start dashboard in background
  const dashboard = fork(dashboardPath, [], {
    detached: true,
    stdio: 'ignore'
  });
  
  dashboard.unref();
  
  // Wait for it to start
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    const check = await isDashboardRunning();
    if (check) {
      console.log('[Ultraflow] Dashboard started at', DASHBOARD_URL);
      return;
    }
  }
  
  console.log('[Ultraflow] Warning: Dashboard may not have started');
}

// Load context from brain server
async function loadContext() {
  const brainPath = path.join(__dirname, '../../lib/brain-server/server.js');
  
  if (!fs.existsSync(brainPath)) {
    console.log('[Ultraflow] Brain server not found');
    return { checkpoint: null, predictions: [] };
  }

  // The brain server is an MCP server, not a CLI
  // For session start, we just ensure it's ready
  // Actual context loading happens via MCP tools
  
  return { status: 'ready' };
}

// Main
async function main() {
  console.log('[Ultraflow] Session starting...');
  
  // Start dashboard
  await ensureDashboardRunning();
  
  // Load context (via MCP tools when needed)
  const context = await loadContext();
  
  console.log('[Ultraflow] Session ready');
  
  process.exit(0);
}

main().catch(e => {
  console.error('[Ultraflow] Error:', e.message);
  process.exit(1);
});