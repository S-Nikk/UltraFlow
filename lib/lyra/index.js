const LyraOptimizer = require('./LyraOptimizer');

const lyra = {
  optimize: (prompt, options = {}) => {
    const optimizer = new LyraOptimizer(options);
    return optimizer.optimize(prompt);
  },
  
  optimizeCheckpoint: (checkpoint, options = {}) => {
    const optimizer = new LyraOptimizer(options);
    return optimizer.optimizeCheckpoint(checkpoint);
  },
  
  createMiddleware: (options = {}) => {
    const optimizer = new LyraOptimizer(options);
    return optimizer.createMiddleware();
  },
  
  modes: require('./modes'),
  platforms: require('./platforms'),
  techniques: require('./techniques')
};

module.exports = lyra;