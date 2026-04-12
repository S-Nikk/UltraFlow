# Ultraflow — Comprehensive Summary

## What It Is

**Ultraflow** is a unified brain memory and token tracking system designed for AI coding agents working across multiple platforms. It acts as a centralized nervous system that enables persistent memory, context management, and cost optimization for Claude Code, OpenCode, Codex, and OpenClaw environments.

Think of it as:
- **A persistent memory bank** for AI agents that survives across sessions
- **A cost tracker** that monitors token usage in real-time
- **A context manager** that intelligently loads/unloads memory based on what you're working on
- **A multi-agent orchestrator** that coordinates work across different AI platforms
- **An MCP server** exposing 17 specialized tools for memory, checkpointing, and reporting

**Current Version:** 1.3.1

**Core Package:** `@s-nikk/ultraflow` (MIT License)

---

## What It Does

### 1. **Brain Memory System (MCP Server)**

Ultraflow provides 18 specialized tools organized into 6 categories:

#### Memory Tools (5 tools)
- `search_memories` — Find memories by keyword or semantic query
- `get_memory` — Retrieve full content of a specific memory
- `list_memories` — Index all saved memories with metadata
- `refresh_index` — Update memory index from disk (for external changes)
- `save_memory` — Persist new memories with type classification

#### Context Management (2 tools)
- `checkpoint` — Save conversation state at logical breakpoints
- `load_context` — Restore previous sessions by loading checkpoints

#### Checkpoint System (3 tools)
- `generateCheckpoint` — Create bidirectional learning checkpoints
- `loadCheckpoint` — Resume from specific checkpoint by ID
- `adjustThreshold` — Tune context compression sensitivity

#### Token Dashboard (4 tools)
- `view_dashboard` — Display real-time cost tracking UI
- `get_token_summary` — Query total tokens, cost, budget metrics
- `get_task_list` — List all tasks with cost breakdown
- `get_optimization_alerts` — Identify top 5 cost-saving opportunities

#### Reporting (3 tools)
- `generate_session_report` — Create detailed cost breakdown report
- `get_agent_usage_log` — View all agent dispatch logs with timestamps
- `get_agent_usage_summary` — Aggregate usage by model (Haiku, Sonnet, Opus, etc.)

#### Learning & Analysis (1 tool)
- Additional tools for context analysis and optimization

### 2. **Token Dashboard**

Real-time dashboard on **http://localhost:3000** providing:

**Metrics Tracked:**
- Total tokens consumed (input + output)
- Cost per interaction ($)
- Budget usage % against configured limit
- Cost breakdown by model (Haiku, Sonnet, Opus, OpenCode variants)
- Conversation turns with costs per turn
- Efficiency metrics (tokens per action, cost per fix)

**API Endpoints:**
- `/api/health` — Service status
- `/api/summary` — Overall cost summary
- `/api/tasks` — Task-level cost breakdown
- `/api/usage` — Usage by model with pricing
- `/api/turns` — Conversation turn history
- `/api/pricing` — Model pricing tiers
- `/api/costs` — Raw cost tracking data
- `/api/opportunities` — Optimization recommendations
- WebSocket — Real-time updates (streaming metrics)

**Features:**
- Configurable port (default: 3000)
- Real-time WebSocket streaming
- RESTful API for programmatic access
- Historical data retention
- Budget alerts

### 3. **Session Hooks (Auto-Execution)**

Ultraflow hooks into your AI agent's lifecycle:

| Hook Event | When It Fires | What It Does |
|------------|---|---|
| `SessionStart` | First message in new session | Auto-load relevant memories, show context checkpoint |
| `UserPromptSubmit` | Before processing your input | Detect context needs, load related memories |
| `PostToolUse` | After tool execution | Monitor context usage, save progress incrementally |
| `SessionEnd` | Session closing | Consolidate memories, save final checkpoint |
| `PostCompact` | After context compression | Adjust memory threshold for next session |

### 4. **Agent Auto-Detection**

Ultraflow detects which AI agent you're using by checking for:

| Agent | Detection Method |
|-------|---|
| **Claude Code** | Presence of `.claude/settings.json` |
| **OpenCode** | Presence of `.opencode/config.yaml` |
| **Codex** | Presence of `.codex/config.toml` or `AGENTS.md` |
| **OpenClaw** | Presence of `.openclaw/manifest.json` |

Auto-detection enables agent-specific hooks and configuration provisioning.

### 5. **Two-Level Configuration**

#### Package Defaults (No Setup Required)
- Auto-detects your agent
- Starts dashboard on port 3000
- All 17 tools enabled
- Memory index created on startup
- Context threshold: 2000 tokens
- **Works immediately after install**

#### User-Level Customization (Optional)
Run `npx ultraflow init` to override:
- Dashboard port
- Hook execution timing
- Context compression sensitivity
- Memory indexing strategy
- Agent priority (if multiple detected)

---

## What More It Can Do

### Advanced Capabilities (Implemented)

#### 1. **Memory Compression & Consolidation**
- Automatic summarization of long conversation histories
- Extractive memory (keep important details, discard noise)
- Bidirectional learning from prior sessions
- Memory type classification:
  - `user` — Profile, preferences, roles
  - `feedback` — Guidance, patterns, what works/doesn't
  - `project` — Goals, deadlines, decisions
  - `reference` — External pointers, resource links

#### 2. **OpenCode Integration for Cost Reduction**
- Delegates non-decision-making to OpenCode (FREE tier)
- Falls back to Claude/Anthropic only when needed
- Tracks cost savings from delegation
- Cost comparison: Haiku vs OpenCode analysis

#### 3. **Multi-Agent Swarm Coordination**
- Ruflo integration for enterprise multi-agent swarms
- Agent dispatch logging with full traceability
- Parallel task orchestration with cost tracking
- Agent-to-agent memory sharing

#### 4. **Context Degradation Analysis**
- Identifies when context is becoming stale
- Suggests memory refresh points
- Measures relevancy drift over time
- Triggers re-indexing when needed

#### 5. **Adaptive Effort Selection**
- Wrapper for OpenCode's model picker
- Routes tasks to best model for effort level:
  - Simple: Qwen (fastest)
  - Moderate: Minimax (balanced)
  - Complex: Nemotron (advanced reasoning)
  - Edge cases: BigPickle (robustness)
  - Fallback: GPT-5-Nano

#### 6. **Prompt Optimization**
- `ultraflow prompt` command analyzes prompts
- Detects ambiguity, missing context, overspecification
- Generates optimized versions
- Measures expected token savings

#### 7. **Template Engine**
- Handlebars-based prompt templating
- Generate agent configs from templates:
  - Claude Code (.claude/CLAUDE.md)
  - OpenCode (.opencode/config.yaml)
  - Codex (AGENTS.md)
  - OpenClaw (.openclaw/manifest.json)

### Planned Features (Roadmap)

#### Phase 2: Semantic Memory
- Vector embeddings for memory search
- Similarity-based retrieval (not just keyword)
- Automatic memory clustering
- Memory decay (older memories deprioritized)

#### Phase 3: Budget Enforcement
- Hard budget limits (fail gracefully)
- Cost prediction before running tasks
- Model autopilot (auto-select cheapest model)
- Rate limiting per agent

#### Phase 4: Enterprise Features
- Multi-user agent coordination
- Cost chargeback by project/team
- Audit logs for compliance
- Governance policies (approved models, cost limits)

#### Phase 5: Visual Analytics
- Dashboard graphs: cost trends, model distribution
- Memory usage visualization
- Performance vs. cost tradeoffs
- Optimization scoring

---

## Usage Examples

### 1. **Getting Started (5 minutes)**

```bash
# Install
npm install ultraflow

# Initialize (detects your agent automatically)
npx ultraflow init

# Start everything
npx ultraflow start

# Dashboard appears at http://localhost:3000
```

**Result:** Dashboard running, 17 MCP tools available, memory system active.

---

### 2. **Using Memory Tools in Claude Code**

Once Ultraflow is running, access memory tools in Claude Code:

#### Save a memory
```javascript
await mcp.call('brain', 'save_memory', {
  name: 'auth-pattern',
  content: 'JWT tokens stored in httpOnly cookies, refresh on 401',
  type: 'reference',
  description: 'Auth implementation pattern for this project'
});
```

#### Search for memories
```javascript
const results = await mcp.call('brain', 'search_memories', {
  query: 'database migration error handling'
});
// Returns: [{ name, description, type, tokens }, ...]
```

#### Load context from memory
```javascript
const context = await mcp.call('brain', 'load_context', {
  query: 'what was I working on yesterday?'
});
// Returns: checkpoint summary + relevant memory pointers
```

---

### 3. **Token Tracking in Real-Time**

#### Monitor costs via dashboard API
```bash
curl http://localhost:3000/api/summary
# Response:
{
  "totalTokens": 45230,
  "totalCost": "$1.24",
  "budget": "$5.00",
  "efficiency": 0.85,
  "costPerInteraction": "$0.031"
}
```

#### Get optimization alerts
```bash
curl http://localhost:3000/api/opportunities
# Response:
[
  { opportunity: "Use Haiku instead of Sonnet for code review", savings: "$0.42" },
  { opportunity: "Compress memory, reduce context by 15%", savings: "$0.18" },
  ...
]
```

#### Stream real-time dashboard
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.on('message', (msg) => {
  const update = JSON.parse(msg);
  console.log(`Cost updated: $${update.totalCost}`);
});
```

---

### 4. **Session Checkpointing**

#### Manual checkpoint at breakpoint
```javascript
await mcp.call('brain', 'generateCheckpoint', {
  summary: 'Completed authentication system with OAuth2',
  nextSteps: 'Implement rate limiting middleware',
  tags: ['auth', 'complete', 'phase-1']
});
```

#### Resume from checkpoint in new session
```javascript
const checkpoint = await mcp.call('brain', 'loadCheckpoint', {
  id: 'checkpoint-abc123'
});
// Returns: { summary, nextSteps, tags, timestamp, context }
```

#### Adjust context sensitivity
```javascript
await mcp.call('brain', 'adjustThreshold', {
  newThreshold: 1500, // Lower = more aggressive compression
  reason: 'Budget constraint this quarter'
});
```

---

### 5. **Agent Dispatch Logging**

#### Log a Claude API call
```javascript
await mcp.call('brain', 'log_agent_dispatch', {
  agent_id: 'dispatch-xyz789',
  model: 'claude-haiku-4-5',
  input_tokens: 2048,
  output_tokens: 512,
  status: 'complete',
  description: 'Code generation for auth system'
});
```

#### View all dispatches
```javascript
const log = await mcp.call('brain', 'get_agent_usage_log');
// Returns: [{ timestamp, model, tokens, cost, status }, ...]
```

#### Cost summary by model
```javascript
const summary = await mcp.call('brain', 'get_agent_usage_summary');
// Response:
{
  'claude-haiku': { tokens: 125000, cost: '$1.25' },
  'claude-sonnet': { tokens: 45000, cost: '$1.35' },
  'opencode-qwen': { tokens: 230000, cost: '$0' }
}
```

---

### 6. **Prompt Optimization (Lyra)**

#### Analyze and optimize a prompt
```bash
npx ultraflow lyra "Generate a React component that handles form validation with error messages" -m detail

# Output:
# ✨ Lyra Optimized Prompt:
# Generate a React component that handles form validation with error messages.
# 
# Input: { formFields: Array<{ name: string, type: string, required: boolean }> }
# Output: <Component /> with real-time validation feedback and error display
# 
# Details:
#   Mode: detail
#   Platform: generic
#   Techniques: context-injection, specificity-improvement, scope-definition
# 
# 🔧 Improvements:
#   • Added explicit input/output format
#   • Clarified component scope and responsibilities
#   • Specified validation trigger points
#
# 💡 Pro Tips:
#   • Consider adding accessibility requirements
#   • Specify error message placement preferences
```

#### Analyze a prompt without optimizing
```bash
npx ultraflow lyra "your prompt here" --analyze
# Shows: complexity, request type, specificity, completeness, context level, quality gates
```

#### Generate platform-specific versions
```bash
npx ultraflow lyra "your prompt here" --versions
# Generates optimized versions for: claude, chatgpt, gemini, opencode, codex
```

---

### 7. **Generating Agent Configuration**

#### Create Claude Code config from template
```bash
npx ultraflow init
# Prompts: Which agent? Claude Code
# Generates: .claude/CLAUDE.md with optimized settings
```

#### Override port and hooks
Edit `.ultraflow/config.json`:
```json
{
  "version": "1.3.1",
  "agent": "claude-code",
  "dashboard": {
    "port": 3001,
    "autoStart": true
  },
  "hooks": {
    "SessionStart": ["load-memories", "show-checkpoint"],
    "SessionEnd": ["consolidate-memories", "generate-report"]
  }
}
```

Then restart:
```bash
npx ultraflow start
# Dashboard now on http://localhost:3001
```

---

### 8. **Multi-Agent Coordination (Ruflo Integration)**

#### Dispatch multiple agents in parallel
```bash
npx ultraflow ruflo dispatch \
  --agent "claude-code" \
  --agent "opencode:nemotron" \
  --task "Analyze database schema" \
  --task "Generate migrations"

# Runs both in parallel, tracks cost for each
# Returns: { agent, cost, result }[]
```

#### Monitor multi-agent costs
```bash
curl http://localhost:3000/api/usage
# Shows breakdown by agent + model combination
```

---

### 9. **Generating a Session Report**

#### After significant work, generate a report
```bash
curl -X POST http://localhost:3000/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-2026-04-12",
    "startTime": "2026-04-12T09:00:00Z",
    "endTime": "2026-04-12T12:30:00Z"
  }'

# Response: Detailed report with:
# - Total tokens and cost
# - Cost by model breakdown
# - Efficiency metrics
# - Top optimization opportunities
# - Recommendations for next session
```

---

### 10. **Advanced: Custom Context Management**

#### Monitor context usage in real-time
```javascript
const monitor = await mcp.call('brain', 'view_dashboard');
// Returns: dashboard state with context metrics
```

#### Detect context degradation and refresh
```javascript
// In hooks, after each tool use:
const threshold = 2000; // tokens
if (contextTokens > threshold * 0.8) {
  await mcp.call('brain', 'generateCheckpoint', {
    summary: 'Context approaching limit',
    nextSteps: 'Load fresh context in next session'
  });
}
```

---

## Command Reference

| Command | Function | Example |
|---------|----------|---------|
| `npx ultraflow init` | Initialize for your agent | `npx ultraflow init` |
| `npx ultraflow start` | Start dashboard + brain | `npx ultraflow start` |
| `npx ultraflow start brain` | MCP server only | `npx ultraflow start brain` |
| `npx ultraflow start dashboard` | Dashboard only | `npx ultraflow start dashboard` |
| `npx ultraflow status` | Show running services | `npx ultraflow status` |
| `npx ultraflow stop` | Stop all services | `npx ultraflow stop` |
| `npx ultraflow lyra <text>` | Optimize a prompt with Lyra | `npx ultraflow lyra "generate auth" -m detail` |
| `npx ultraflow prompt` | Output toolset activation prompt | `npx ultraflow prompt` |
| `npx ultraflow register` | Register with Ruflo | `npx ultraflow register` |
| `npx ultraflow ruflo <args>` | Ruflo multi-agent | `npx ultraflow ruflo dispatch --agent opencode` |

---

## System Architecture

```
User AI Agent (Claude Code / OpenCode / Codex / OpenClaw)
         ↓
    Ultraflow Hooks (SessionStart, UserPromptSubmit, etc.)
         ↓
    ┌─────────────────────────────────────┐
    │  Ultraflow Core (MCP Server)        │
    ├─────────────────────────────────────┤
    │ • Memory System (save/search/load)   │
    │ • Checkpoint Manager                 │
    │ • Context Analyzer                   │
    │ • Token Tracker (real-time)          │
    │ • Agent Dispatcher                   │
    └─────────────────────────────────────┘
         ↓                          ↓
    Local Memory DB         Token Dashboard
    (JSON + Index)          (http://localhost:3000)
         ↓
    OpenCode (for compression)
```

---

## Pricing Impact

### Cost Reduction Through Ultraflow:

| Strategy | Savings |
|----------|---------|
| Route simple tasks to OpenCode | **75% reduction** ($0 per task vs $0.01 Haiku) |
| Compress context with memory | **30-40% reduction** (fewer tokens per interaction) |
| Use Haiku instead of Sonnet | **80% reduction** ($0.01 vs $0.05 per interaction) |
| Detect code reuse, skip regeneration | **50% reduction** (skip 50% of tasks) |
| Batch similar tasks to same model | **15% reduction** (better cache hits) |

**Example Session:**
- Without Ultraflow: $12.50 (125K tokens @ $0.10/1K)
- With Ultraflow: $3.75 (37.5% original cost)
  - OpenCode: $0
  - Haiku: $1.25
  - Compressed context: $2.50

---

## Summary

**Ultraflow** is a complete brain-memory platform for AI agents that:
- ✅ Persists knowledge across sessions
- ✅ Tracks every dollar spent
- ✅ Optimizes context to reduce costs
- ✅ Detects your AI platform automatically
- ✅ Provides 17 specialized tools via MCP
- ✅ Shows real-time costs on a dashboard
- ✅ Coordinates multi-agent swarms
- ✅ Generates optimized prompts
- ✅ Runs with zero configuration

**Start using it:**
```bash
npm install ultraflow
npx ultraflow init
npx ultraflow start
# Dashboard at http://localhost:3000
```

---

## 🙏 Acknowledgments

Ultraflow is built on top of these exceptional open source projects:

- **[GitNexus](https://github.com/abhigyanpatwari/GitNexus)** — Code intelligence, execution flow analysis, and impact assessment
- **[Ruflo](https://github.com/ruvnet/ruflo)** — Multi-agent AI orchestration framework for coordinated agent workflows
- **[OpenCode](https://github.com/anomalyco/opencode)** — Open source AI model routing and intelligent task delegation

These foundational projects enable Ultraflow to provide code understanding, agent coordination, and cost-effective task routing.
