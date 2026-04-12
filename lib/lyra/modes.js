module.exports = {
  basic: {
    name: 'Basic',
    description: 'Minimal optimization, preserve original intent',
    expandIntent: false,
    addContext: false,
    enhanceClarity: false
  },
  
  detail: {
    name: 'Detail',
    description: 'Maximum context and clarity enhancements',
    expandIntent: true,
    addContext: true,
    enhanceClarity: true
  },
  
  auto: {
    name: 'Auto',
    description: 'Intelligent adaptive optimization based on prompt analysis',
    expandIntent: 'adaptive',
    addContext: true,
    enhanceClarity: 'adaptive'
  }
};