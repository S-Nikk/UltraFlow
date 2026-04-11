export function buildPrompt(config) {
  const features = config.features.includes('All')
    ? ['Brain memory', 'OpenCode delegation', 'Claude Flow orchestration']
    : config.features;

  let prompt = '====== ULTRAFLOW TOOLSET ACTIVATION PROMPT ======\n\n';
  prompt += 'You now have access to the Ultraflow integrated AI toolset.\n\n';
  prompt += 'AVAILABLE COMPONENTS:\n';

  if (features.includes('Brain memory')) {
    prompt += '\n1. BRAIN MEMORY (MCP Server)\n';
    prompt += '   Tools: search_memories(query), get_memory(id), list_memories(), refresh_index()\n';
  }

  if (features.includes('Claude Flow orchestration')) {
    prompt += '\n2. CLAUDE FLOW ORCHESTRATION (CLI)\n';
    prompt += '   Tools: swarm-init(topology), swarm-add-agent(type), memory-store(key, value)\n';
  }

  if (features.includes('OpenCode delegation')) {
    prompt += '\n3. OPENCODE DELEGATION\n';
    prompt += '   Function: delegateToOpenCode(prompt, options)\n';
  }

  prompt += '\n\nACTIVATION CHECKLIST:\n';
  prompt += '☐ Brain memory initialized: .claude/memory/\n';
  prompt += '☐ Claude Flow CLI installed: @claude-flow/cli\n';
  prompt += '☐ OpenCode available: opencode-ai\n';
  prompt += '☐ MCP servers registered: .claude/settings.json\n';
  prompt += '☐ Hooks configured: SessionStart, UserPromptSubmit, PostToolUse\n';

  return prompt;
}
