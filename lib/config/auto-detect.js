const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

function detectAgents() {
  const agents = [];
  const check = (cmd, name) => {
    try {
      execSync(cmd, { stdio: 'ignore', shell: true });
      agents.push(name);
    } catch {}
  };

  check('claude --version', 'claude-code');
  check('opencode --version', 'opencode');
  check('codex --version', 'codex');
  check('openclaw --version', 'openclaw');

  return agents.length > 0 ? agents : ['opencode'];
}

function detectPlatform() {
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  return 'linux';
}

function detectConfigLocations(agent) {
  const HOME = os.homedir();
  const locations = {
    'claude-code': path.join(HOME, '.claude', 'settings.json'),
    'opencode': path.join(HOME, '.config', 'opencode', 'config.json'),
    'codex': path.join(HOME, '.codex', 'config.json'),
    'openclaw': path.join(HOME, '.openclaw', 'config.json')
  };
  return locations[agent] || null;
}

module.exports = {
  detectAgents,
  detectPlatform,
  detectConfigLocations
};