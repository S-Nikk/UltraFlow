#!/usr/bin/env node

/**
 * Ultraflow Codex Agent Startup Hook
 * Initializes brain memory when Codex agent starts
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3000;

async function initBrainForCodex() {
  // Ensure dashboard is running
  const dashboardPath = path.join(__dirname, '../../lib/token-dashboard/server.js');
  
  if (!fs.existsSync(dashboardPath)) {
    console.log('[Ultraflow] Dashboard not found');
    return { status: 'error', message: 'Dashboard not found' };
  }
  
  // Check if already running
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${DASHBOARD_PORT}/api/health`, () => {
        console.log('[Ultraflow] Dashboard ready');
        resolve({ status: 'ready' });
      });
      req.on('error', () => {
        // Start dashboard
        spawn('node', [dashboardPath], {
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, PORT: DASHBOARD_PORT }
        }).unref();
        
        setTimeout(() => resolve({ status: 'started' }), 2000);
      });
      req.setTimeout(1000, () => resolve({ status: 'timeout' }));
    });
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function main() {
  console.log('[Ultraflow] Codex agent starting...');
  
  const result = await initBrainForCodex();
  
  console.log('[Ultraflow] Brain ready:', result.status);
  process.exit(0);
}

main();