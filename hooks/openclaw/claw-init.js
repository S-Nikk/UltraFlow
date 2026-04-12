#!/usr/bin/env node

/**
 * Ultraflow OpenClaw Initialization Hook
 * Initializes brain memory for OpenClaw
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3000;

async function initBrainForOpenClaw() {
  const dashboardPath = path.join(__dirname, '../../lib/token-dashboard/server.js');
  
  if (!fs.existsSync(dashboardPath)) {
    return { status: 'error', message: 'Dashboard not found at: ' + dashboardPath };
  }
  
  // Check if dashboard running
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${DASHBOARD_PORT}/api/health`, () => {
        resolve({ status: 'ready', url: `http://localhost:${DASHBOARD_PORT}` });
      });
      req.on('error', () => {
        // Start dashboard
        const child = spawn('node', [dashboardPath], {
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, PORT: DASHBOARD_PORT }
        });
        child.unref();
        
        setTimeout(() => {
          resolve({ status: 'started', url: `http://localhost:${DASHBOARD_PORT}` });
        }, 2000);
      });
      req.setTimeout(1000, () => resolve({ status: 'timeout' }));
    });
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function main() {
  console.log('[Ultraflow] OpenClaw initializing...');
  
  const result = await initBrainForOpenClaw();
  
  console.log('[Ultraflow] OpenClaw ready:', JSON.stringify(result));
  process.exit(0);
}

main();