module.exports = {
  packageLevel: {
    tokenDashboard: { port: 3000, autoStart: true },
    brainMcp: { port: 3001, autoStart: true },
    lyra: { mode: 'auto', platform: 'auto', autoOptimize: true },
    ruflo: { install: true, autoConnect: true },
    gitnexus: { install: true, autoIndex: true, projects: ['AI', 'AI-OpenCode'] },
    mcp: { autoRegister: true }
  },
  
  defaults: {
    theme: 'dark',
    autoOptimize: true,
    lyraMode: 'auto',
    logLevel: 'info'
  },
  
  orchestration: {
    package: { level: 'package', priority: 1 },
    user: { level: 'user', priority: 2, override: true }
  }
};