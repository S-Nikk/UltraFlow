import { homedir } from 'os';
import { join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const SERVICE_DIR = join(homedir(), '.ultraflow');
const PID_FILE = join(SERVICE_DIR, 'services.json');

function ensureServiceDir() {
  if (!fs.existsSync(SERVICE_DIR)) {
    fs.mkdirSync(SERVICE_DIR, { recursive: true });
  }
}

function loadServicePIDs() {
  ensureServiceDir();
  try {
    if (fs.existsSync(PID_FILE)) {
      return JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
    }
  } catch (e) {
    // Ignore
  }
  return { dashboard: null, brain: null, mcp: null };
}

function saveServicePIDs(pids) {
  ensureServiceDir();
  fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
}

export async function getRunningServices() {
  const pids = loadServicePIDs();
  const services = [];
  
  for (const [name, pid] of Object.entries(pids)) {
    if (pid) {
      try {
        // Check if process is still running
        await new Promise((resolve, reject) => {
          exec(`tasklist /FI "PID eq ${pid}" /NH`, (err, stdout) => {
            if (err || !stdout.includes(pid)) {
              reject(new Error('Process not found'));
            } else {
              resolve();
            }
          });
        });
        services.push({ name, pid });
      } catch (e) {
        // Process not running, clear stale PID
        pids[name] = null;
      }
    }
  }
  
  saveServicePIDs(pids);
  return services;
}

export async function stopService(name) {
  const pids = loadServicePIDs();
  const pid = pids[name];
  
  if (!pid) {
    return false;
  }
  
  try {
    await new Promise((resolve, reject) => {
      exec(`taskkill /PID ${pid} /F`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    pids[name] = null;
    saveServicePIDs(pids);
    return true;
  } catch (e) {
    pids[name] = null;
    saveServicePIDs(pids);
    return false;
  }
}

export function saveServicePID(name, pid) {
  const pids = loadServicePIDs();
  pids[name] = pid;
  saveServicePIDs(pids);
}