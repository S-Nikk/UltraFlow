# ⚡ Ultraflow

AI coding agent brain, token dashboard, Lyra prompt optimization, and ruflo orchestration.

## Features

- **Brain Memory MCP** - Persistent memory and checkpoint system for AI agents
- **Token Dashboard** - Real-time token usage tracking on port 3000
- **Lyra Optimization** - 4-D prompt optimization (Deconstruct → Diagnose → Develop → Deliver)
- **Ruflo Integration** - Multi-agent swarm orchestration
- **GitNexus Intelligence** - Code intelligence with blast radius analysis

## Installation

```bash
npm install -g ultraflow
```

Or install locally in a project:

```bash
npm install ultraflow
```

## Auto-Connect

When installed, ultraflow automatically:
1. Installs ruflo globally
2. Detects available coding agents (Claude Code, OpenCode, Codex, OpenClaw)
3. Registers MCP server
4. Starts services (Token Dashboard on port 3000, Brain MCP on port 3001)

## Commands

| Command | Description |
|---------|-------------|
| `ultraflow init [agent]` | Initialize for specific agent |
| `ultraflow start` | Start all services |
| `ultraflow start --dashboard` | Start token dashboard only |
| `ultraflow start --brain` | Start brain MCP only |
| `ultraflow status` | Check services status |
| `ultraflow lyra "prompt"` | Optimize a prompt |
| `ultraflow lyra "prompt" --mode detail` | Detail mode |
| `ultraflow lyra "prompt" --platform claude-code` | Platform-specific |
| `ultraflow register [agent]` | Manually register MCP |
| `ultraflow ruflo [args]` | Pass through to ruflo CLI |
| `ultraflow gitnexus --analyze` | Analyze codebase with GitNexus |
| `ultraflow gitnexus --impact <symbol>` | Get blast radius for symbol |
| `ultraflow gitnexus --query <concept>` | Query codebase by concept |
| `ultraflow gitnexus --context <symbol>` | Get 360-degree view of symbol |
| `ultraflow gitnexus --detect-changes` | Detect changes and risk level |

## Services

| Service | Port | URL |
|---------|------|-----|
| Token Dashboard | 3000 | http://localhost:3000 |
| Brain MCP | 3001 | http://localhost:3001/mcp |

## Lyra Modes

- `basic` - Minimal optimization
- `detail` - Maximum context and clarity
- `auto` - Adaptive optimization (default)

## Data Sources

Token dashboard reads from (in priority order):
1. `~/.claude/memory/agent-usage-log.json`
2. `~/.claude/token-cost-dashboard.json`
3. Sample data fallback

## Configuration

Package-level defaults are optimal for most use cases. User config can override:

```bash
# View current config
cat ~/.ultraflow/config.json
```

## Hooks

Hooks for agent-specific integration are in `hooks/`:
- `hooks/claude-code/` - Claude Code MCP registration
- `hooks/opencode/` - OpenCode configuration
- `hooks/codex/` - Codex configuration
- `hooks/openclaw/` - OpenClaw configuration

## Acknowledgments

Ultraflow builds on these amazing open source projects:

### Core Dependencies
- **[Express](https://github.com/expressjs/express)** - Fast, unopinionated web framework
- **[Commander](https://github.com/tj/commander.js)** - CLI framework
- **[Chalk](https://github.com/chalk/chalk)** - Terminal string styling
- **[Inquirer](https://github.com/SBoudrias/Inquirer.js)** - Interactive CLI prompts
- **[Handlebars](https://github.com/handlebars-lang/handlebars.js)** - Logicless templating
- **[ws](https://github.com/websockets/ws)** - WebSocket implementation

### Integrations
- **[Ruflo](https://github.com/ruflabs/ruffle)** - Enterprise AI agent orchestration platform
- **[GitNexus](https://github.com/abhigyanpatwari/GitNexus)** - Zero-server code intelligence engine
  - Tree-sitter for AST parsing
  - LadybugDB for graph database
  - Sigma.js for visualization
  - MCP for Model Context Protocol

### Inspired By
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Open protocol for AI agents
- Claude Code, Cursor, Codex, Windsurf, OpenCode - AI coding agents