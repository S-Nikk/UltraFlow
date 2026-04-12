# Claude Code hook for ultraflow

# This hook enables ultraflow integration with Claude Code
# Location: ~/.claude/settings.json (MCP servers section)

{
  "mcpServers": {
    "ultraflow-brain": {
      "command": "node",
      "args": ["${HOME}/.npm-global/lib/node_modules/ultraflow/bin/ultraflow-mcp.js"]
    }
  }
}