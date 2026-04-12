const fs = require('fs');
const path = require('path');
const os = require('os');
const defaults = require('./defaults');

const CONFIG_DIR = path.join(os.homedir(), '.ultraflow');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadUserConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data.replace(/^\uFEFF/, ''));
    }
  } catch (e) {}
  return {};
}

function saveUserConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getConfig(key) {
  const user = loadUserConfig();
  if (key) return user[key] || defaults.packageLevel[key] || defaults.defaults[key];
  return { ...defaults.packageLevel, ...defaults.defaults, ...user };
}

function setConfig(key, value) {
  const user = loadUserConfig();
  user[key] = value;
  saveUserConfig(user);
}

module.exports = {
  loadUserConfig,
  saveUserConfig,
  getConfig,
  setConfig
};