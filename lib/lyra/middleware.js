const LyraOptimizer = require('./LyraOptimizer');

function createLyraMiddleware(options = {}) {
  const optimizer = new LyraOptimizer(options);
  
  return async (req, res, next) => {
    if (req.body && req.body.prompt) {
      const result = optimizer.optimize(req.body.prompt);
      req.body.optimizedPrompt = result.optimized;
      req.body.lyraData = {
        original: req.body.prompt,
        optimized: result.optimized,
        techniques: result.techniques,
        diagnosis: result.diagnosis,
        metadata: result.metadata
      };
    }
    next();
  };
}

function wrapWithLyra(fn, options = {}) {
  const optimizer = new LyraOptimizer(options);
  
  return async function(...args) {
    const prompt = args[0];
    if (typeof prompt === 'string') {
      const result = optimizer.optimize(prompt);
      args[0] = result.optimized;
      args.push({ lyra: result });
    }
    return fn.apply(this, args);
  };
}

module.exports = {
  createLyraMiddleware,
  wrapWithLyra
};