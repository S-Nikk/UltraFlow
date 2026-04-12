module.exports = {
  opencode: {
    name: 'OpenCode',
    prefix: 'You are an expert coding assistant powered by OpenCode.',
    suffix: 'Think step by step and provide working solutions.',
    codeFormatting: true,
    defaultMode: 'auto'
  },
  
  'claude-code': {
    name: 'Claude Code',
    prefix: 'You are Claude Code, an AI coding assistant.',
    suffix: 'Provide efficient, production-ready solutions.',
    codeFormatting: true,
    defaultMode: 'auto'
  },
  
  codex: {
    name: 'Codex',
    prefix: 'You are Codex, an AI coding agent.',
    suffix: 'Focus on correctness and performance.',
    codeFormatting: true,
    defaultMode: 'detail'
  },
  
  openclaw: {
    name: 'OpenClaw',
    prefix: 'You are OpenClaw, an AI coding agent.',
    suffix: 'Provide robust and maintainable code.',
    codeFormatting: true,
    defaultMode: 'basic'
  },
  
  auto: {
    name: 'Auto-detect',
    description: 'Automatically detect platform from environment',
    detectFromEnv: true
  }
};