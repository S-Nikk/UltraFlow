# Ultraflow

Brain memory system for AI coding agents - works with Claude Code, OpenCode, Codex, and OpenClaw.

## Features

- **Brain Memory (MCP Server)** - 17 tools for memory, context, checkpoint, and token tracking
- **Token Dashboard** - Real-time token cost monitoring on port 3000
- **Session Hooks** - Auto-load memories, detect context, save progress
- **Agent-Specific Configuration** - Detects your AI agent and provisions accordingly

## Installation

```bash
npm install ultraflow
```

## Quick Start

### Start Everything (Recommended)

```bash
npx ultraflow start
```

This starts:
- Token Dashboard on http://localhost:3000
- Brain MCP Server (17 tools available)

### Initialize for Your Agent

```bash
npx ultraflow init
```

This detects which AI agent you're using and generates appropriate config files.

### Start Specific Services

```bash
npx ultraflow start dashboard  # Just the dashboard
npx ultraflow start brain       # Just the MCP server
npx ultraflow start all          # Both (default)
```

### Check Status

```bash
npx ultraflow status
```

## Token Dashboard

The dashboard is always available at **http://localhost:3000** regardless of which AI agent you use.

### Changing the Port

Edit the dashboard server:

```javascript
// lib/token-dashboard/server.js
const PORT = process.env.PORT || 3000;  // Change 3000 here
```

Or via environment variable:

```bash
PORT=3001 npx ultraflow start dashboard
```

If you change the port, also update the brain-server's dashboard viewer:

```javascript
// lib/brain-server/dashboard-viewer.js
this.baseUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check |
| `/api/summary` | Token cost summary |
| `/api/tasks` | Task list with costs |
| `/api/usage` | Usage by model |
| `/api/turns` | Conversation turns |
| `/api/pricing` | Pricing tiers |
| `/api/costs` | Cost tracking |
| `/api/opportunities` | Optimization |
| WebSocket | Real-time updates |

## MCP Tools (17 Total)

| Category | Tools |
|----------|-------|
| **Memory** | `search_memories`, `get_memory`, `list_memories`, `refresh_index`, `save_memory` |
| **Context** | `checkpoint`, `load_context` |
| **Checkpoint** | `generateCheckpoint`, `loadCheckpoint`, `adjustThreshold` |
| **Dashboard** | `view_dashboard`, `get_token_summary`, `get_task_list`, `get_optimization_alerts` |
| **Reporting** | `generate_session_report` |
| **Agent Logging** | `get_agent_usage_log`, `log_agent_dispatch`, `get_agent_usage_summary` |

## Configuration

### User Configuration

After running `npx ultraflow init`, config is saved to `.ultraflow/config.json`:

```json
{
  "version": "1.1.0",
  "agent": "claude-code",
  "dashboard": {
    "port": 3000,
    "autoStart": true
  }
}
```

### Auto-Detection

Ultraflow auto-detects your AI agent from the environment:

| Agent | Detected By |
|-------|------------|
| Claude Code | `.claude/settings.json` |
| OpenCode | `.opencode/config.yaml` |
| Codex | `.codex/config.toml` or `AGENTS.md` |
| OpenClaw | `.openclaw/manifest.json` |

If multiple agents detected, `npx ultraflow init` asks which to prioritize.

## Architecture

### Two-Level Orchestration

**Package Level (Defaults - Always Optimal)**
- Auto-detects agent
- Auto-starts dashboard on port 3000
- All 17 MCP tools enabled
- Auto-indexes memories on startup
- Context threshold: 2000 tokens

**User Level (Optional Override)**
- Run `npx ultraflow init` to customize
- Override agent, port, hooks

### File Structure

```
ultraflow/
├── lib/
│   ├── brain-server/     # MCP server (17 tools)
│   ├── token-dashboard/ # Token tracking (port 3000)
│   ├── config/          # Defaults, auto-detect, user-config
│   └── wrappers/        # OpenCode delegation
├── hooks/               # Per-agent hooks
├── templates/           # Config templates
└── bin/                 # CLI
```

## Supported AI Systems

- **Claude Code** - Full integration via settings.json + hooks
- **OpenCode** - Config in .opencode/config.yaml
- **Codex** - Agent definitions in AGENTS.md
- **OpenClaw** - Manifest in .openclaw/ultraflow-manifest.json

## OpenCode Integration

Brain-swarm uses OpenCode for memory compression. If OpenCode is not available, Ultraflow attempts to install it automatically:

```bash
npm install -g opencode-ai
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx ultraflow init` | Initialize for your agent |
| `npx ultraflow start` | Start dashboard + brain |
| `npx ultraflow start brain` | Just MCP server |
| `npx ultraflow start dashboard` | Just token dashboard |
| `npx ultraflow status` | Show running services |
| `npx ultraflow stop` | Stop all services |

## Version

1.3.1