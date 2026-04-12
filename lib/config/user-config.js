/**
 * User Configuration
 * Handles user overrides from config file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DEFAULTS from './defaults.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_FILE = '.ultraflow/config.json';

/**
 * Get config file path
 * @returns {string} Path to config file
 */
export function getConfigPath() {
  return path.join(process.cwd(), CONFIG_FILE);
}

/**
 * Check if config file exists
 * @returns {boolean} True if config exists
 */
export function configExists() {
  return fs.existsSync(getConfigPath());
}

/**
 * Load user configuration
 * @returns {Object} User config or null
 */
export function loadConfig() {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Error loading config:', e.message);
    return null;
  }
}

/**
 * Save user configuration
 * @param {Object} config - Config to save
 */
export function saveConfig(config) {
  const configDir = path.dirname(getConfigPath());
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

/**
 * Merge user config with defaults
 * @returns {Object} Merged config
 */
export function getMergedConfig() {
  const userConfig = loadConfig();
  
  if (!userConfig) {
    return { ...DEFAULTS };
  }
  
  // Deep merge - user config overrides defaults
  return deepMerge(DEFAULTS, userConfig);
}

/**
 * Deep merge two objects
 * @param {Object} target - Default values
 * @param {Object} source - User overrides
 * @returns {Object} Merged result
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Update specific config value
 * @param {string} key - Config key (dot notation supported)
 * @param {*} value - New value
 */
export function updateConfig(key, value) {
  const config = loadConfig() || {};
  
  // Support dot notation: "dashboard.port"
  const keys = key.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  
  saveConfig(config);
}

/**
 * Get specific config value
 * @param {string} key - Config key (dot notation supported)
 * @param {*} defaultValue - Default if not found
 * @returns {*} Config value
 */
export function getConfigValue(key, defaultValue) {
  const config = getMergedConfig();
  
  const keys = key.split('.');
  let current = config;
  
  for (const k of keys) {
    if (current === undefined || current === null) {
      return defaultValue;
    }
    current = current[k];
  }
  
  return current !== undefined ? current : defaultValue;
}

export default {
  getConfigPath,
  configExists,
  loadConfig,
  saveConfig,
  getMergedConfig,
  updateConfig,
  getConfigValue,
};