# Ultraflow

Integrated AI toolset for Claude Code, Codex, OpenCode, and OpenClaw.

**Bundles:** Brain memory system + OpenCode delegation + Claude Flow orchestration

## Features

- **Brain Memory (MCP Server)** - Long-term project memory with vault and session awareness
- **OpenCode Delegation** - Offload code generation, refactoring, and test writing
- **Claude Flow Orchestration** - Multi-agent swarm coordination
- **Session Hooks** - Auto-load memories, detect context, save progress
- **Interactive Setup Wizard** - Configure for your AI system in seconds

## Installation

```bash
npm install ultraflow
```

## Quick Start

### Initialize Ultraflow

```bash
npx ultraflow init
```

Follow the interactive wizard:
1. Select your AI system(s) (Claude Code, Codex, OpenCode, OpenClaw)
2. Choose features (Brain memory, OpenCode delegation, Claude Flow)
3. Auto-generates config files for your selected AI systems

### Check Status

```bash
npx ultraflow status
```

Shows which components are installed and available.

### Start Brain MCP Server

```bash
npx ultraflow start
```

Starts the Brain memory system in stdio JSON-RPC mode.

### View Activation Prompt

```bash
npx ultraflow prompt
```

Outputs the toolset activation prompt to copy into your AI system prompt.

## Usage Examples

### Using Brain Memory

```javascript
// In Claude Code or via MCP
const memories = await search_memories("polymarket trading strategy");
const context = await get_memory(memories[0].id);
```

### Delegating to OpenCode

```javascript
import { delegateToOpenCode } from 'ultraflow/lib/wrappers/opencode-delegate.js';

const result = await delegateToOpenCode(
  "Generate a REST API client for Polymarket",
  { test: true, timeout: 300 }
);
```

### Using Claude Flow

```bash
npx @claude-flow/cli swarm-init hierarchical
npx @claude-flow/cli swarm-add-agent code-generator
npx @claude-flow/cli memory-store task-context {"status": "in-progress"}
```

## CLI Commands

### `npx ultraflow init`

Interactive setup wizard. Generates config files for selected AI systems:
- `.claude/settings.json` (Claude Code)
- `AGENTS.md` (Codex)
- `.opencode/config.yaml` (OpenCode)
- `.openclaw/ultraflow-manifest.json` (OpenClaw)

### `npx ultraflow start`

Forks Brain MCP server as child process. Server listens on stdio in JSON-RPC mode.

Responds to tools:
- `search_memories` - Search brain vault
- `get_memory` - Retrieve specific memory
- `list_memories` - List all memories
- `refresh_index` - Update index

### `npx ultraflow status`

Checks installed components:
- Brain Memory (bundled, always available)
- Claude Flow CLI (@claude-flow/cli)
- OpenCode (opencode-ai in PATH)

### `npx ultraflow prompt`

Outputs toolset activation prompt. Designed to be copied into AI system prompts for immediate access to all tools and features.

## Configuration

### Brain Memory

Default path: `.claude/memory/`

Customize in `.claude/settings.json`:
```json
{
  "mcpServers": {
    "brain": {
      "env": {
        "BRAIN_MEMORY_PATH": ".claude/memory"
      }
    }
  }
}
```

### Session Hooks

Configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": "Auto-load relevant memories",
    "UserPromptSubmit": "Detect context references",
    "PostToolUse": "Auto-save session context"
  }
}
```

## Supported AI Systems

- **Claude Code** - Full integration with settings.json + hooks
- **Codex** - Agent definitions in AGENTS.md
- **OpenCode** - Config in .opencode/config.yaml
- **OpenClaw** - Manifest in .openclaw/ultraflow-manifest.json

## Architecture

```
ultraflow/
├── bin/
│   ├── ultraflow.js        (CLI entry point)
│   └── ultraflow-mcp.js    (MCP server binary)
├── lib/
│   ├── brain-server/       (Bundled MCP server)
│   ├── cli/                (Commands & generators)
│   ├── wrappers/           (OpenCode & Claude Flow)
│   └── constants.js
└── templates/              (Handlebars config templates)
```

## Features Breakdown

### Brain Memory System
- Tiered vault (conscious + archive)
- Automatic context detection
- Session persistence
- Memory indexing & search

### OpenCode Delegation
- Code generation
- Refactoring & optimization
- Test generation
- Language-aware execution

### Claude Flow Orchestration
- Multi-agent swarms
- Topology templates
- Shared memory store
- Agent lifecycle management

## Development

### Build from Source

```bash
git clone https://github.com/anthropics/ultraflow
cd ultraflow
npm install
npm test
```

### Create Custom Generators

Extend `lib/cli/generators/` with your own config generator:

```javascript
// my-ai-system-config.js
export default {
  async generate(config) {
    // Read template, render with config, write to file
    const content = await renderTemplate('my-ai.hbs', config);
    fs.writeFileSync('MY_AI_CONFIG.json', content);
  }
};
```

## Troubleshooting

### Brain server not starting

Ensure `.claude/memory/` exists and is writable:
```bash
mkdir -p .claude/memory
```

### Missing dependencies

Install optional peer dependencies:
```bash
npm install @claude-flow/cli opencode-ai
```

### Config not applying

Verify MCP server entry in `.claude/settings.json`:
```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["path/to/server.js"]
    }
  }
}
```

## License

MIT

## Support

- **GitHub:** https://github.com/anthropics/ultraflow
- **Issues:** https://github.com/anthropics/ultraflow/issues
- **Docs:** https://github.com/anthropics/ultraflow#readme

## Changelog

### v1.0.0 (Initial Release)
- Brain memory MCP server
- Interactive CLI setup
- Config generators for all AI systems
- OpenCode delegation wrapper
- Claude Flow orchestration support
- Session hooks (SessionStart, UserPromptSubmit, PostToolUse)
- Comprehensive README & activation prompt
