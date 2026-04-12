# 🧠 Ultraflow

> **Persistent brain memory + token tracking for AI coding agents**  
> Works seamlessly with Claude Code, OpenCode, Codex, and OpenClaw

[![npm](https://img.shields.io/npm/v/@s-nikk/ultraflow)](https://www.npmjs.com/package/@s-nikk/ultraflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

---

## 🎯 What It Does

Ultraflow is your AI agent's **nervous system**—a persistent memory layer that survives sessions, tracks every token spent, automatically delegates to OpenCode for FREE, and intelligently loads context when needed.

### Core Capabilities

| 🧠 **Brain** | 💭 **DreamLord** | 🎁 **OpenCode** | ✨ **Lyra** | 🤖 **Ruflo** |
|:---|:---|:---|:---|:---|
| 18 MCP tools | Context management | FREE delegation | Prompt optimization | Multi-agent coord |
| Semantic search | Checkpoint system | Smart routing | Platform-specific modes | Cost tracking |
| Persistent storage | Token tracking | Cost optimization | Clarity analysis | Parallel execution |
| Memory clustering | Budget alerts | Auto task routing | Optimization tips | Agent logging |

### In 30 Seconds

```bash
# Install
npm install ultraflow

# Initialize (auto-detects your agent)
npx ultraflow init

# Start everything
npx ultraflow start

# Dashboard appears at http://localhost:3000
```

**That's it.** Memory, token tracking, OpenCode delegation, and 18 MCP tools are now available.

---

## 🚀 What More It Can Do

### Advanced Features (Already Built)

<details open>
<summary><strong>💾 Brain: Memory Compression & Consolidation</strong></summary>

Brain automatically:
- Summarizes long conversation histories
- Keeps important details, discards noise
- Learns bidirectionally from prior sessions
- Classifies memories: user profiles, feedback patterns, project context, external references

```javascript
// Save a memory once, search across all sessions
await brain.save_memory({
  name: 'auth-pattern',
  content: 'JWT tokens stored in httpOnly cookies, refresh on 401',
  type: 'reference'
});

// Later: intelligent search across sessions
const matches = await brain.search_memories('authentication best practices');
```

</details>

<details open>
<summary><strong>🎁 OpenCode Delegation: FREE Token Usage</strong></summary>

Ultraflow automatically routes non-critical work to **OpenCode (FREE)**, reserving Claude tokens for complex reasoning only:

**What goes to OpenCode (FREE):**
- Code generation & boilerplate
- Test writing & test data
- Documentation generation
- Simple refactoring
- Analysis & planning
- Error fixing & debugging

**What stays on Claude (paid):**
- Architectural decisions
- Complex problem-solving
- Security/performance reviews
- Novel design patterns
- Code review & approval

**Example Flow:**
```javascript
// Ultraflow sees: "Generate API tests"
// Routes to: OpenCode:Nemotron (FREE)
// Returns: Full test suite, $0 cost

// Ultraflow sees: "Design auth architecture"
// Routes to: Claude Haiku (pays $0.01+)
// Returns: Vetted design with tradeoffs
```

**Cost Impact:**
- Without Ultraflow: $12.50 (125K tokens @ $0.10/1K)
- With Ultraflow: $3.75 (70% reduction)
  - OpenCode: $0 (50K tokens, boilerplate/analysis)
  - Haiku: $1.25 (12.5K tokens, decisions only)
  - Compressed context: $2.50 (savings on all interactions)

</details>

<details open>
<summary><strong>⚡ DreamLord: Smart Cost Routing & Budget Tracking</strong></summary>

DreamLord monitors and optimizes token spending:
- Real-time cost tracking per model
- Budget alerts when approaching limits
- Cost predictions before running tasks
- Auto-suggests cheaper alternatives
- Dashboard shows per-model costs and savings opportunities

**Dashboard insights:**
```
├─ Total tokens: 45,230
├─ Total cost: $1.24
├─ Budget remaining: $3.76 (43% of $5.00)
├─ Cost per interaction: $0.031
│
└─ Optimization opportunities:
   • Use Haiku instead of Sonnet: +$0.42 savings
   • Compress context by 15%: +$0.18 savings
   • Delegate to OpenCode: +$0.95 savings
```

</details>

<details open>
<summary><strong>🎯 DreamLord: Checkpoint & Context Management</strong></summary>

Safe `/clear` without losing progress:
```javascript
// Before clearing context
await dreamlord.generateCheckpoint({
  summary: 'Completed auth system with OAuth2',
  nextSteps: 'Implement rate limiting',
  tags: ['auth', 'phase-1', 'complete']
});

// Later: resume exactly where you left off
const checkpoint = await dreamlord.loadCheckpoint({ id: '...' });
```

Automatic context degradation detection—refresh memories when context gets stale.

</details>

<details open>
<summary><strong>📈 Ruflo: Multi-Agent Orchestration</strong></summary>

Ruflo coordinates multiple AI agents in parallel:
```bash
npx ultraflow ruflo dispatch \
  --agent "claude-code" \
  --agent "opencode:nemotron" \
  --task "Analyze database schema" \
  --task "Generate migrations"
```

Cost tracking per agent, parallel execution, unified memory.

</details>

<details open>
<summary><strong>🔍 Brain: Semantic Memory Search</strong></summary>

- Find memories by concept, not just keywords
- Automatic memory clustering
- Similarity-based retrieval
- Memory relevancy over time (decay older memories)

</details>

<details open>
<summary><strong>✨ Lyra: Prompt Optimization</strong></summary>

Lyra analyzes and optimizes prompts for clarity, context, scope:
```bash
npx ultraflow lyra "Generate a React form with validation" -m detail

# Output: Optimized prompt with specific input/output format
# Techniques used, improvements found, pro tips
```

Works with platform-specific modes: Claude, ChatGPT, Gemini, OpenCode, Codex.

</details>

---

## 📋 Usage Examples (Summarized, Cool)

### Example 1: Save & Search Memories Across Sessions
```bash
# Session 1: Learn something
claude> "Hey, save that database pattern we just worked out"
brain.save_memory({
  name: 'postgres-indexing',
  content: '...',
  type: 'reference'
})
# ✅ Saved

# Session 2 (next day): Instant recall
claude> "What was that database pattern?"
brain.search_memories('postgres') 
# ✅ Returns: postgres-indexing + 3 related memories
```

### Example 2: Token Tracking in Real-Time
```bash
# Dashboard: http://localhost:3000
# Shows:
# ├─ Total tokens: 45,230
# ├─ Total cost: $1.24
# ├─ Budget used: 25%
# ├─ Cost per interaction: $0.031
# └─ Top optimization: "Use Haiku for code review (+$0.42 savings)"
```

### Example 3: Safe Context Clear with Checkpoint
```javascript
// Before /clear:
await brain.generateCheckpoint({
  summary: 'Built authentication with JWT',
  nextSteps: 'Rate limiting, CORS config',
  tags: ['auth', 'complete']
});

// Later (fresh session):
const context = await brain.loadContext();
// Returns checkpoint + relevant memories auto-loaded
```

### Example 4: OpenCode Delegation (FREE Tokens)
```bash
# Request: "Generate comprehensive API tests"
# Ultraflow detects: Non-critical work
# Routes to: OpenCode:Nemotron (FREE)
# Result: Full test suite, $0 cost

# Compare:
# ❌ Without delegation: $0.08 (Haiku cost)
# ✅ With delegation: $0.00 (OpenCode FREE)
# Savings: $0.08 per request
```

### Example 5: Multi-Agent Cost Tracking
```bash
# Dispatch to multiple agents
npx ultraflow ruflo dispatch \
  --agent "claude-haiku" \
  --agent "opencode:nemotron" \
  --task "Design auth system" \
  --task "Generate tests"

# Dashboard shows:
# ├─ Haiku: 2,048 tokens, $0.02 (critical decisions)
# ├─ OpenCode: 5,900 tokens, $0.00 (tests + analysis)
# └─ Total cost: $0.02 (vs $0.12 if both Haiku)
# ✅ 83% cost savings
```

---

## 🎯 Feature Comparison

| Feature | Ultraflow | DIY Memory | No System |
|---------|:---------:|:----------:|:---------:|
| **Persistent Memory** | ✅ | ❌ | ❌ |
| **Semantic Search** | ✅ | ⚠️ (manual) | ❌ |
| **Token Tracking** | ✅ | ❌ | ❌ |
| **Cost Optimization** | ✅ | ❌ | ❌ |
| **Multi-Agent Coord** | ✅ | ❌ | ❌ |
| **Auto-Detection** | ✅ | ❌ | ❌ |
| **Zero Config** | ✅ | ❌ | ❌ |

---

## 🛠️ Installation & Setup

### Quick Install

```bash
npm install ultraflow
```

### Initialize for Your Agent

```bash
npx ultraflow init
```

Auto-detects: Claude Code • OpenCode • Codex • OpenClaw

### Start Services

```bash
# Both dashboard + MCP server
npx ultraflow start

# Just dashboard
npx ultraflow start dashboard

# Just MCP server
npx ultraflow start brain
```

### Check Status

```bash
npx ultraflow status
```

---

## 📚 MCP Tools (18 Total)

### 🧠 Memory Tools (5)
- `search_memories` — Find by keyword or concept
- `get_memory` — Retrieve full content
- `list_memories` — Index all saved memories
- `refresh_index` — Update from disk
- `save_memory` — Persist new memories

### 🔄 Context Management (2)
- `checkpoint` — Save state before /clear
- `load_context` — Restore from checkpoint or memories

### ✅ Checkpoint System (3)
- `generateCheckpoint` — Create bidirectional learning checkpoints
- `loadCheckpoint` — Resume from specific checkpoint
- `adjustThreshold` — Tune context compression

### 📊 Dashboard (4)
- `view_dashboard` — Real-time cost UI
- `get_token_summary` — Total tokens, cost, budget
- `get_task_list` — Tasks with cost breakdown
- `get_optimization_alerts` — Top 5 savings opportunities

### 📈 Reporting & Logging (4)
- `generate_session_report` — Detailed cost report
- `get_agent_usage_log` — All dispatches with timestamps
- `log_agent_dispatch` — Log a single dispatch
- `get_agent_usage_summary` — Usage by model

---

## 🎛️ Configuration

### User-Level Customization

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

### Environment Variables

```bash
PORT=3001 npx ultraflow start dashboard
DASHBOARD_URL=http://localhost:3001 npx ultraflow start brain
BRAIN_MEMORY_PATH=/custom/path npx ultraflow start
```

---

## 🌐 Supported AI Systems

| Agent | Detection | Integration |
|-------|-----------|-------------|
| **Claude Code** | `.claude/settings.json` | Full hooks + MCP |
| **OpenCode** | `.opencode/config.yaml` | Full hooks + MCP |
| **Codex** | `.codex/config.toml` | Full hooks + MCP |
| **OpenClaw** | `.openclaw/manifest.json` | Full hooks + MCP |

Auto-detection runs on `npx ultraflow init` — no manual config needed.

---

## 📡 Dashboard API

The dashboard exposes a REST API for programmatic access:

```bash
# Health check
curl http://localhost:3000/api/health

# Cost summary
curl http://localhost:3000/api/summary
# { "totalTokens": 45230, "totalCost": "$1.24", "budget": "$5.00" }

# Optimization opportunities
curl http://localhost:3000/api/opportunities
# [ { "opportunity": "Use Haiku instead of Sonnet", "savings": "$0.42" }, ... ]
```

**Real-time updates via WebSocket:**

```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.on('message', (msg) => {
  const update = JSON.parse(msg);
  console.log(`Cost updated: $${update.totalCost}`);
});
```

---

## 🚀 Advanced Usage

<details>
<summary><strong>Prompt Optimization with Lyra</strong></summary>

```bash
# Analyze and optimize
npx ultraflow lyra "your prompt here" -m detail

# Platform-specific versions
npx ultraflow lyra "your prompt" --versions
# Generates: claude, chatgpt, gemini, opencode, codex versions

# Analyze without optimizing
npx ultraflow lyra "your prompt" --analyze
```

</details>

<details>
<summary><strong>Multi-Agent Coordination</strong></summary>

```bash
npx ultraflow ruflo dispatch \
  --agent "claude-code" \
  --agent "opencode:nemotron" \
  --task "Analyze schema" \
  --task "Generate migrations"

# Monitor costs across agents
curl http://localhost:3000/api/usage
```

</details>

<details>
<summary><strong>Custom Context Management</strong></summary>

```javascript
// Detect context degradation
const threshold = 2000; // tokens
if (contextTokens > threshold * 0.8) {
  await brain.generateCheckpoint({
    summary: 'Context approaching limit',
    nextSteps: 'Load fresh context in next session'
  });
}

// Adjust compression sensitivity
await brain.adjustThreshold({
  newThreshold: 1500,
  reason: 'Budget constraint this quarter'
});
```

</details>

---

## 📊 Architecture

```
┌──────────────────────────────────────────────────┐
│  Your AI Agent (Claude Code/OpenCode/Codex)     │
│         ↓ (MCP Server)                           │
├──────────────────────────────────────────────────┤
│  Ultraflow Core                                  │
│  ├─ Brain (semantic memory + search)             │
│  ├─ DreamLord (context + checkpoints + costs)    │
│  ├─ Lyra (prompt optimization)                   │
│  ├─ Ruflo (multi-agent orchestration)            │
│  └─ GitNexus (code intelligence analysis)        │
├──────────────────────────────────────────────────┤
│  ↓               ↓                ↓              │
│ Memory DB    Dashboard (3000)  GitNexus Index    │
│ (.claude/)   (token tracking)  (code graph)      │
│             (optimization)                       │
└──────────────────────────────────────────────────┘
```

---

## 🎓 Quickstart Commands

| Task | Command |
|------|---------|
| Initialize | `npx ultraflow init` |
| Start everything | `npx ultraflow start` |
| Start just dashboard | `npx ultraflow start dashboard` |
| Check status | `npx ultraflow status` |
| Stop services | `npx ultraflow stop` |
| Optimize prompt | `npx ultraflow lyra "your prompt"` |
| View agent config | `npx ultraflow register` |

---

## 📦 Version

**v1.3.1** — Stable

---

## 📄 License

MIT © S-Nikk

---

## 🤝 Support

- 📖 [DETAILED_SUMMARY.md](./DETAILED_SUMMARY.md) — Comprehensive feature guide
- 🔧 [CLI Reference](#-quickstart-commands)
- 📊 [Dashboard](#-dashboard-api)

**Get started in 30 seconds:**
```bash
npm install ultraflow && npx ultraflow init && npx ultraflow start
```
