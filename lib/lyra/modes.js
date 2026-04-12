import { LyraOptimizer } from './LyraOptimizer.js';

export const modes = {
  basic: {
    description: 'Quick optimization for straightforward requests',
    clarifyingQuestions: 0,
    depth: 'core-techniques-only',
    timeEstimate: '~1-2 minutes',
  },
  detail: {
    description: 'Comprehensive optimization with context gathering',
    clarifyingQuestions: '2-3',
    depth: 'advanced-techniques',
    timeEstimate: '~3-5 minutes',
  },
  auto: {
    description: 'Automatic mode that chooses based on prompt complexity',
    clarifyingQuestions: 'adaptive',
    depth: 'adaptive',
    timeEstimate: 'auto-determined',
  },
};

export async function handleBasicMode(prompt, options = {}) {
  const optimizer = new LyraOptimizer({ mode: 'basic', platform: options.platform || 'generic' });
  return await optimizer.optimize(prompt, { mode: 'basic', ...options });
}

export async function handleDetailMode(prompt, options = {}) {
  const optimizer = new LyraOptimizer({ mode: 'detail', platform: options.platform || 'generic' });
  return await optimizer.optimize(prompt, { mode: 'detail', ...options });
}

export async function handleAutoMode(prompt, options = {}) {
  const optimizer = new LyraOptimizer({ mode: 'basic', platform: options.platform || 'generic' });
  const analysis = optimizer.analyze(prompt);
  
  const mode = analysis.diagnosis.complexity === 'complex' ? 'detail' : 'basic';
  return await optimizer.optimize(prompt, { mode, ...options });
}

export async function optimize(prompt, options = {}) {
  const mode = options.mode || 'basic';
  
  switch (mode) {
    case 'detail':
      return handleDetailMode(prompt, options);
    case 'auto':
      return handleAutoMode(prompt, options);
    case 'basic':
    default:
      return handleBasicMode(prompt, options);
  }
}

export function getModeInfo(mode) {
  return modes[mode] || modes.basic;
}

export function listModes() {
  return Object.entries(modes).map(([name, info]) => ({
    name,
    ...info,
  }));
}

export default {
  modes,
  optimize,
  handleBasicMode,
  handleDetailMode,
  handleAutoMode,
  getModeInfo,
  listModes,
};