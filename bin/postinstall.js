const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

const HOME = os.homedir();
const AUTOSTART_FILE = path.join(HOME, '.ultraflow', 'autostart.json');
const RUFLO_CONFIG_FILE = path.join(HOME, '.ultraflow', 'ruflo.json');

function log(msg, type = 'info') {
  const colors = { info: chalk.blue, success: chalk.green, warn: chalk.yellow, error: chalk.red };
  console.log(colors[type] || chalk.white(`[postinstall] ${msg}`));
}

function detectAgents() {
  const agents = [];
  
  if (execSync('claude --version 2>nul', { stdio: 'ignore', shell: 'cmd.exe' })) agents.push('claude-code');
  if (execSync('opencode --version 2>nul', { stdio: 'ignore', shell: 'cmd.exe' })) agents.push('opencode');
  if (execSync('codex --version 2>nul', { stdio: 'ignore', shell: 'cmd.exe' })) agents.push('codex');
  if (execSync('openclaw --version 2>nul', { stdio: 'ignore', shell: 'cmd.exe' })) agents.push('openclaw');
  
  return agents.length > 0 ? agents : ['opencode'];
}

function checkRuflo() {
  try {
    const v = execSync('ruflo --version 2>nul', { shell: 'cmd.exe' }).toString().trim();
    if (v) {
      saveRufloConfig('global');
      return true;
    }
  } catch {}
  
  log('Testing npx ruflo@latest fallback...', 'warn');
  try {
    const v = execSync('npx ruflo@latest --version', { stdio: 'ignore' }).toString().trim();
    if (v) {
      saveRufloConfig('npx');
      log('Ruflo available via npx fallback', 'success');
      return true;
    }
  } catch {}
  
  saveRufloConfig('npx');
  return false;
}

function saveRufloConfig(mode) {
  const configDir = path.dirname(RUFLO_CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(RUFLO_CONFIG_FILE, JSON.stringify({ mode, fallback: mode === 'npx' }, null, 2));
}

function checkGitNexus() {
  try {
    execSync('gitnexus --version 2>nul', { shell: 'cmd.exe' });
    return true;
  } catch {
    log('Installing gitnexus...', 'warn');
    try {
      execSync('npm install -g gitnexus@latest', { stdio: 'ignore', shell: 'cmd.exe' });
      return true;
    } catch { return false; }
  }
}

function analyzeMainProjects() {
  const projects = [
    path.join(HOME, 'AI'),
    path.join(HOME, 'AI-OpenCode')
  ];
  
  for (const project of projects) {
    if (fs.existsSync(project)) {
      try {
        log(`Analyzing ${path.basename(project)} with GitNexus...`, 'info');
        execSync('npx gitnexus analyze', { cwd: project, stdio: 'ignore', shell: true });
        log(`✓ ${path.basename(project)} indexed`, 'success');
      } catch (e) {
        log(`⚠ ${path.basename(project)}: ${e.message}`, 'warn');
      }
    }
  }
}

function startServices() {
  const autostart = JSON.parse(fs.readFileSync(AUTOSTART_FILE, 'utf-8').replace(/^\uFEFF/, ''));
  
  if (autostart.tokenDashboard) {
    spawn('node', [__dirname, 'start', '--dashboard'], { detached: true, stdio: 'ignore', shell: true });
    log('Token dashboard started', 'success');
  }
  
  if (autostart.brainMcp) {
    spawn('node', [__dirname, 'start', '--brain'], { detached: true, stdio: 'ignore', shell: true });
    log('Brain MCP started', 'success');
  }
}

function registerMcp(agent) {
  const mcpPath = path.join(__dirname, 'ultraflow-mcp.js');
  log(`Registering MCP for ${agent}...`);
}

log('⚡ ultraflow postinstall running...');

const agents = detectAgents();
log(`Detected agents: ${agents.join(', ')}`, 'success');

const hasRuflo = checkRuflo();
log(`Ruflo available: ${hasRuflo}`, hasRuflo ? 'success' : 'warn');

const hasGitNexus = checkGitNexus();
log(`GitNexus available: ${hasGitNexus}`, hasGitNexus ? 'success' : 'warn');

if (hasGitNexus) {
  analyzeMainProjects();
}

if (!fs.existsSync(path.dirname(AUTOSTART_FILE))) {
  fs.mkdirSync(path.dirname(AUTOSTART_FILE), { recursive: true });
}

const autostart = { tokenDashboard: true, brainMcp: true, agents };
fs.writeFileSync(AUTOSTART_FILE, JSON.stringify(autostart, null, 2));

agents.forEach(registerMcp);

startServices();

log('✓ Postinstall complete', 'success');
console.log(chalk.cyan('  Run ') + chalk.white('npx ultraflow status') + chalk.cyan(' to see services'));
console.log(chalk.cyan('  Token dashboard: ') + chalk.white('http://localhost:3000'));