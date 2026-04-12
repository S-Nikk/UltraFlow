export { LyraOptimizer, createOptimizer } from './LyraOptimizer.js';
export { modes, optimize, handleBasicMode, handleDetailMode, handleAutoMode, getModeInfo, listModes } from './modes.js';
export { platforms, getPlatform, listPlatforms, getTips } from './platforms.js';
export { techniques, applyTechnique, applyAllFoundation, applyAllAdvanced, listAllTechniques } from './techniques.js';
export { initMiddleware, optimizePrompt, optimizeSearchQuery, optimizeMemoryContext, optimizeCheckpointSummary, optimizeToolPrompt, setAutoOptimize, setPlatform, getMiddlewareStatus, middleware } from './middleware.js';

import { LyraOptimizer } from './LyraOptimizer.js';
import { optimize as optimizeMode } from './modes.js';

export async function lyra(prompt, options = {}) {
  return await optimizeMode(prompt, options);
}

export function create(options = {}) {
  return new LyraOptimizer(options);
}

export default {
  LyraOptimizer,
  lyra,
  create,
  optimize: lyra,
};