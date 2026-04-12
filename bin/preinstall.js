#!/usr/bin/env node

/**
 * Ultraflow Preinstall Script
 * Installs ruflo globally BEFORE package dependencies are installed
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const LOG_PREFIX = '[Ultraflow Preinstall]';

function log(msg) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${LOG_PREFIX} ✓ ${msg}`);
}

function checkRufloInstalled() {
  return new Promise((resolve) => {
    const check = spawn('npm', ['list', '-g', 'ruflo'], {
      stdio: 'pipe'
    });
    
    check.on('close', (code) => {
      resolve(code === 0);
    });
    
    check.on('error', () => {
      resolve(false);
    });
  });
}

async function installRuflo() {
  return new Promise((resolve) => {
    log('Installing ruflo globally...');
    
    const install = spawn('npm', ['install', '-g', 'ruflo@latest', '--omit=optional'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true
    });
    
    install.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        log('ruflo install failed, will use npx fallback');
        resolve(false);
      }
    });
    
    install.on('error', () => {
      log('ruflo install error, will use npx fallback');
      resolve(false);
    });
  });
}

async function main() {
  log('Checking for ruflo...');
  
  const alreadyInstalled = await checkRufloInstalled();
  
  if (alreadyInstalled) {
    logSuccess('ruflo already installed globally');
  } else {
    log('ruflo not found, installing...');
    await installRuflo();
  }
  
  log('Preinstall complete');
}

main().catch(e => {
  console.error(`${LOG_PREFIX} Error: ${e.message}`);
  // Don't fail the install
});