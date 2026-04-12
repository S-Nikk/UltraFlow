export const platforms = {
  chatgpt: {
    name: 'ChatGPT/GPT-4',
    style: 'structured-sections',
    focus: 'conversation-starters',
    length: 'medium',
    features: {
      useSections: true,
      conversationStarters: true,
      supportsImages: true,
      supportsCodeHighlighting: true,
    },
    tips: [
      'Use clear section headers',
      'Include conversation starters when appropriate',
      'Format code blocks properly',
      'Use bullet points for lists',
    ],
  },
  claude: {
    name: 'Claude',
    style: 'reasoning-frameworks',
    focus: 'longer-context',
    length: 'long',
    features: {
      xmlTags: true,
      thinking: true,
      extendedContext: true,
      toolUse: true,
    },
    tips: [
      'Use XML tags for structured output: <analysis>, <output>, <notes>',
      'Include reasoning frameworks when helpful',
      'Leverage longer context window',
      'Be specific about desired output format',
    ],
  },
  gemini: {
    name: 'Gemini',
    style: 'creative-analysis',
    focus: 'comparative-tasks',
    length: 'medium-to-long',
    features: {
      multiModal: true,
      nativeThinking: true,
      searchGrounding: true,
    },
    tips: [
      'Great for comparative analysis tasks',
      'Use for creative and analytical combinations',
      'Leverage multimodal capabilities when applicable',
      'Ground with search when helpful',
    ],
  },
  generic: {
    name: 'Generic/Other',
    style: 'universal-best-practices',
    focus: 'clarity-completeness',
    length: 'appropriate-to-task',
    features: {
      universal: true,
    },
    tips: [
      'Be clear and specific',
      'Include all necessary context',
      'Specify output format when important',
      'Add examples when helpful',
    ],
  },
  opencode: {
    name: 'OpenCode',
    style: 'task-oriented',
    focus: 'code-generation',
    length: 'concise-but-complete',
    features: {
      codeGeneration: true,
      fileOperations: true,
      commandExecution: true,
    },
    tips: [
      'Be specific about file paths and names',
      'Include code examples when possible',
      'Specify language/framework when relevant',
      'Include error messages if debugging',
    ],
  },
  codex: {
    name: 'OpenAI Codex',
    style: 'code-first',
    focus: 'implementation',
    length: 'code-focused',
    features: {
      codeExecution: true,
      fileOperations: true,
    },
    tips: [
      'Focus on what to accomplish, not how',
      'Include constraints and requirements',
      'Mention testing approach if relevant',
      'Specify language and framework',
    ],
  },
  'claude-code': {
    name: 'Claude Code',
    style: 'cli-focused',
    focus: 'terminal-tasks',
    length: 'action-oriented',
    features: {
      cli: true,
      codeExecution: true,
      fileOperations: true,
    },
    tips: [
      'Use clear action verbs',
      'Be specific about file paths',
      'Include relevant context about the codebase',
      'Mention any existing similar implementations',
    ],
  },
};

export function getPlatform(platform) {
  return platforms[platform] || platforms.generic;
}

export function listPlatforms() {
  return Object.entries(platforms).map(([id, info]) => ({
    id,
    ...info,
  }));
}

export function getTips(platform) {
  const p = getPlatform(platform);
  return p.tips || [];
}

export default {
  platforms,
  getPlatform,
  listPlatforms,
  getTips,
};