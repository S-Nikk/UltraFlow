import { LyraOptimizer } from './LyraOptimizer.js';
import { optimize as optimizeMode } from './modes.js';
import { getPlatform } from './platforms.js';

let globalOptimizer = null;
let autoOptimizeEnabled = true;
let platformOverride = null;

export function initMiddleware(options = {}) {
  globalOptimizer = new LyraOptimizer({
    mode: options.mode || 'auto',
    platform: options.platform || 'generic',
  });
  
  autoOptimizeEnabled = options.autoOptimize !== false;
  platformOverride = options.platform || null;
  
  return {
    enabled: autoOptimizeEnabled,
    platform: platformOverride || 'auto-detect',
    mode: options.mode || 'auto',
  };
}

export function optimizePrompt(prompt, options = {}) {
  if (!globalOptimizer) {
    initMiddleware(options);
  }
  
  if (!autoOptimizeEnabled) {
    return prompt;
  }
  
  const platform = options.platform || platformOverride || 'generic';
  const mode = options.mode || 'auto';
  
  const result = globalOptimizer.optimize(prompt, { platform, mode });
  return result.optimized;
}

export function optimizeSearchQuery(query) {
  return optimizePrompt(query, {
    platform: platformOverride || 'generic',
    mode: 'basic',
  });
}

export function optimizeMemoryContext(context) {
  return optimizePrompt(context, {
    platform: platformOverride || 'claude',
    mode: 'detail',
  });
}

export function optimizeCheckpointSummary(summary) {
  return optimizePrompt(summary, {
    platform: platformOverride || 'generic',
    mode: 'basic',
  });
}

export function optimizeToolPrompt(toolName, prompt) {
  const platformMap = {
    'search_memories': 'claude',
    'get_memory': 'claude',
    'load_context': 'claude',
    'checkpoint': 'claude',
    'save_memory': 'opencode',
    'view_dashboard': 'generic',
    'get_token_summary': 'generic',
    'log_agent_dispatch': 'generic',
  };
  
  const platform = platformOverride || platformMap[toolName] || 'generic';
  const mode = toolName.includes('context') || toolName.includes('checkpoint') ? 'detail' : 'basic';
  
  return optimizePrompt(prompt, { platform, mode });
}

export function setAutoOptimize(enabled) {
  autoOptimizeEnabled = enabled;
  return { autoOptimizeEnabled };
}

export function setPlatform(platform) {
  platformOverride = platform;
  if (globalOptimizer) {
    globalOptimizer.platform = platform;
  }
  return { platform: platformOverride };
}

export function getMiddlewareStatus() {
  return {
    initialized: globalOptimizer !== null,
    autoOptimizeEnabled,
    platform: platformOverride || 'generic',
  };
}

export async function middleware(req, res, next) {
  if (!autoOptimizeEnabled || !globalOptimizer) {
    return next();
  }

  try {
    if (req.body && req.body.prompt) {
      const result = globalOptimizer.optimize(req.body.prompt, {
        platform: platformOverride || 'generic',
        mode: 'auto',
      });
      req.body.originalPrompt = req.body.prompt;
      req.body.prompt = result.optimized;
      req.body.lyraOptimization = {
        techniquesUsed: result.techniquesUsed,
        mode: result.mode,
        platform: result.platform,
      };
    }

    if (req.query && req.query.q) {
      const result = globalOptimizer.optimize(req.query.q, {
        platform: platformOverride || 'generic',
        mode: 'basic',
      });
      req.query.originalQ = req.query.q;
      req.query.q = result.optimized;
    }
  } catch (error) {
    console.error('[Lyra Middleware] Optimization error:', error.message);
  }

  return next();
}

export default {
  initMiddleware,
  optimizePrompt,
  optimizeSearchQuery,
  optimizeMemoryContext,
  optimizeCheckpointSummary,
  optimizeToolPrompt,
  setAutoOptimize,
  setPlatform,
  getMiddlewareStatus,
  middleware,
};