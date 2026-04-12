#!/usr/bin/env node

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { CostTracker } from './lib/cost-tracker.js';
import { DataLoader } from './lib/data-loader.js';
import { UsageCalculator } from './lib/usage-calculator.js';
import { UsageAggregator } from './lib/usage-aggregator.js';
import { ConversationTracker } from './lib/conversation-tracker.js';
import { initMiddleware as initLyra } from '../lyra/middleware.js';
import { getMergedConfig } from '../config/user-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

let costTracker = null;
let dataLoader = null;
let conversationTracker = null;
let fileWatcher = null;
let usageWatcher = null;
let lastUpdateTime = 0;
let lastUsageUpdateTime = 0;

// Initialize on startup
async function initialize() {
  // Initialize Lyra middleware
  const config = getMergedConfig();
  if (config.lyra?.enabled) {
    initLyra({
      mode: config.lyra.mode || 'auto',
      platform: config.lyra.platforms?.searchQueries || 'generic',
      autoOptimize: config.lyra.autoOptimize !== false,
    });
    console.log('[Dashboard] Lyra prompt optimization enabled');
  }

  // Find real data first (agent-usage-log.json), then token-cost-dashboard.json, then sample
  const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
  const possiblePaths = [
    path.join(homeDir, '.claude', 'memory', 'agent-usage-log.json'),
    path.join(homeDir, '.claude', 'memory', 'token-cost-dashboard.json'),
    path.join(process.cwd(), '.claude', 'memory', 'agent-usage-log.json'),
  ];

  let dashboardDataPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dashboardDataPath = p;
      break;
    }
  }

  // Fall back to sample data only if no real data found
  if (!dashboardDataPath) {
    dashboardDataPath = path.join(__dirname, 'data', 'sample.json');
  }

  dataLoader = new DataLoader(dashboardDataPath);
  costTracker = new CostTracker(dataLoader);

  // Initialize conversation tracker
  const memoryDir = path.join(homeDir, '.claude', 'memory');
  conversationTracker = new ConversationTracker(memoryDir);

  console.log(`[Dashboard] Data file: ${dashboardDataPath}`);
  console.log(`[Dashboard] Data file exists: ${fs.existsSync(dashboardDataPath)}`);
  console.log(`[Dashboard] Conversation tracker initialized at: ${memoryDir}`);

  // Setup file watchers for live updates
  setupFileWatcher(dashboardDataPath);
  setupUsageFileWatcher();
}

function setupFileWatcher(filePath) {
  try {
    if (fileWatcher) fileWatcher.close();

    fileWatcher = fs.watch(filePath, (eventType, filename) => {
      const now = Date.now();
      if (now - lastUpdateTime < 500) return;
      lastUpdateTime = now;

      console.log(`[Dashboard] File changed: ${eventType}`);
      dataLoader.reload();

      const summary = costTracker.getSummary();
      const tasks = costTracker.getTasks();

      broadcast({
        type: 'summary',
        data: summary,
        timestamp: new Date().toISOString(),
      });

      broadcast({
        type: 'tasks',
        data: tasks,
        timestamp: new Date().toISOString(),
      });
    });

    console.log(`[Dashboard] File watcher started for: ${filePath}`);
  } catch (e) {
    console.error(`[Dashboard] Error setting up file watcher:`, e.message);
  }
}

function setupUsageFileWatcher() {
  try {
    if (usageWatcher) usageWatcher.close();

    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
    const usageLogPath = path.join(homeDir, '.claude', 'memory', 'agent-usage-log.json');

    usageWatcher = fs.watch(usageLogPath, (eventType, filename) => {
      const now = Date.now();
      if (now - lastUsageUpdateTime < 500) return;
      lastUsageUpdateTime = now;

      console.log(`[Dashboard] Usage log changed: ${eventType}`);
      const calculator = new UsageCalculator(usageLogPath);
      const usage = calculator.calculate();
      const formatted = UsageAggregator.formatForDisplay(usage);

      broadcast({
        type: 'usage',
        data: formatted,
        timestamp: new Date().toISOString(),
      });
    });

    console.log(`[Dashboard] Usage watcher started for: ${usageLogPath}`);
  } catch (e) {
    console.error(`[Dashboard] Error setting up usage watcher:`, e.message);
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('[Dashboard] WebSocket client connected');
  clients.add(ws);

  // Send current data on connect
  try {
    const summary = costTracker.getSummary();
    ws.send(JSON.stringify({ type: 'summary', data: summary }));
  } catch (e) {
    console.error('[Dashboard] Error sending initial data:', e.message);
  }

  ws.on('close', () => {
    console.log('[Dashboard] WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[Dashboard] WebSocket error:', err.message);
  });
});

// Broadcast updates to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// API Routes

// GET /api/summary
app.get('/api/summary', (req, res) => {
  try {
    const summary = costTracker.getSummary();
    res.json(summary);
  } catch (e) {
    console.error('[API] Error in /api/summary:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = costTracker.getTasks();
    res.json(tasks);
  } catch (e) {
    console.error('[API] Error in /api/tasks:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/costs
app.get('/api/costs', (req, res) => {
  try {
    const costs = costTracker.getCosts();
    res.json(costs);
  } catch (e) {
    console.error('[API] Error in /api/costs:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/opportunities
app.get('/api/opportunities', (req, res) => {
  try {
    const opportunities = costTracker.getOptimizations();
    res.json(opportunities);
  } catch (e) {
    console.error('[API] Error in /api/opportunities:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pricing - Return pricing tiers
app.get('/api/pricing', (req, res) => {
  try {
    res.json(costTracker.pricingTiers);
  } catch (e) {
    console.error('[API] Error in /api/pricing:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tasks - Add new task
app.post('/api/tasks', (req, res) => {
  try {
    const { name, tokens_in, tokens_out, model, status } = req.body;

    if (!name || tokens_in === undefined || tokens_out === undefined || !model) {
      return res.status(400).json({ error: 'Missing required fields: name, tokens_in, tokens_out, model' });
    }

    const newTask = {
      id: `task-${Date.now()}`,
      name,
      tokens_in: parseInt(tokens_in),
      tokens_out: parseInt(tokens_out),
      model,
      status: status || 'complete',
      timestamp: new Date().toISOString(),
    };

    const data = dataLoader.getData();
    if (!Array.isArray(data.tasks)) data.tasks = [];

    data.tasks.push(newTask);

    let totalTokens = 0;
    let totalCost = 0;
    data.tasks.forEach(task => {
      totalTokens += (task.tokens_in || 0) + (task.tokens_out || 0);
      totalCost += costTracker.calculateTaskCost(task);
    });

    data.total_tokens = totalTokens;
    data.total_cost = totalCost;

    fs.writeFileSync(dataLoader.dataPath, JSON.stringify(data, null, 2));
    dataLoader.reload();

    const summary = costTracker.getSummary();
    const tasks = costTracker.getTasks();

    broadcast({
      type: 'summary',
      data: summary,
      timestamp: new Date().toISOString(),
    });

    broadcast({
      type: 'tasks',
      data: tasks,
      timestamp: new Date().toISOString(),
    });

    res.json({
      task: newTask,
      cost: costTracker.calculateTaskCost(newTask).toFixed(2),
      summary,
    });
  } catch (e) {
    console.error('[API] Error in /api/tasks POST:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/usage - Get percentage-based usage tracker
app.get('/api/usage', (req, res) => {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
    const usageLogPath = path.join(homeDir, '.claude', 'memory', 'agent-usage-log.json');

    // Return empty result if file doesn't exist (no hang)
    if (!fs.existsSync(usageLogPath)) {
      console.log('[API] Agent usage log not found, returning empty result');
      return res.json({
        summary: {
          total_tokens: 0,
          window_tokens: 0,
          usage_percentage: 0,
          window_minutes: 300,
          session_start: new Date().toISOString(),
        },
        models: [],
        tasks: [],
      });
    }

    const calculator = new UsageCalculator(usageLogPath);
    const usage = calculator.calculate();
    const formatted = UsageAggregator.formatForDisplay(usage);

    res.json(formatted);
  } catch (e) {
    console.error('[API] Error in /api/usage GET:', e.message);
    // Return empty result on error instead of 500 (prevents hang)
    res.json({
      summary: {
        total_tokens: 0,
        window_tokens: 0,
        usage_percentage: 0,
        window_minutes: 300,
        session_start: new Date().toISOString(),
      },
      models: [],
      tasks: [],
    });
  }
});

// GET /api/agent-usage - Get all agent dispatch logs
app.get('/api/agent-usage', (req, res) => {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
    const agentUsageLogPath = path.join(homeDir, '.claude', 'memory', 'agent-usage-log.json');

    let usageLog = { entries: [] };
    if (fs.existsSync(agentUsageLogPath)) {
      usageLog = JSON.parse(fs.readFileSync(agentUsageLogPath, 'utf-8'));
    }

    res.json(usageLog);
  } catch (e) {
    console.error('[API] Error in /api/agent-usage GET:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/agent-usage - Log new agent dispatch
app.post('/api/agent-usage', (req, res) => {
  try {
    const {
      agent_id,
      model,
      description,
      input_tokens,
      output_tokens,
      total_tokens,
      cost,
      status,
    } = req.body;

    if (!agent_id || !model) {
      return res.status(400).json({ error: 'Missing required fields: agent_id, model' });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      agent_id,
      model,
      description: description || '',
      input_tokens: input_tokens || 0,
      output_tokens: output_tokens || 0,
      total_tokens: total_tokens || 0,
      cost: cost || 0,
      status: status || 'complete',
    };

    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
    const agentUsageLogPath = path.join(homeDir, '.claude', 'memory', 'agent-usage-log.json');

    let usageLog = { entries: [] };
    if (fs.existsSync(agentUsageLogPath)) {
      usageLog = JSON.parse(fs.readFileSync(agentUsageLogPath, 'utf-8'));
    }

    if (!Array.isArray(usageLog.entries)) {
      usageLog.entries = [];
    }

    usageLog.entries.push(entry);

    // Keep last 500 entries
    if (usageLog.entries.length > 500) {
      usageLog.entries = usageLog.entries.slice(-500);
    }

    // Ensure directory exists
    const dir = path.dirname(agentUsageLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(agentUsageLogPath, JSON.stringify(usageLog, null, 2));

    // Broadcast to WebSocket clients
    broadcast({
      type: 'agent-usage',
      data: entry,
      timestamp: new Date().toISOString(),
    });

    res.json({ entry, status: 'logged' });
  } catch (e) {
    console.error('[API] Error in /api/agent-usage POST:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agent-usage/summary - Get agent usage summary by model
app.get('/api/agent-usage/summary', (req, res) => {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '.';
    const agentUsageLogPath = path.join(homeDir, '.claude', 'memory', 'agent-usage-log.json');

    let usageLog = { entries: [] };
    if (fs.existsSync(agentUsageLogPath)) {
      usageLog = JSON.parse(fs.readFileSync(agentUsageLogPath, 'utf-8'));
    }

    const summary = {};
    (usageLog.entries || []).forEach(entry => {
      if (!summary[entry.model]) {
        summary[entry.model] = {
          count: 0,
          total_tokens: 0,
          total_cost: 0,
          agents: [],
        };
      }

      summary[entry.model].count++;
      summary[entry.model].total_tokens += entry.total_tokens || 0;
      summary[entry.model].total_cost += entry.cost || 0;

      if (!summary[entry.model].agents.includes(entry.agent_id)) {
        summary[entry.model].agents.push(entry.agent_id);
      }
    });

    res.json(summary);
  } catch (e) {
    console.error('[API] Error in /api/agent-usage/summary:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/turns - Get all conversation turns
app.get('/api/turns', (req, res) => {
  try {
    if (!conversationTracker) {
      return res.json({ turns: [] });
    }
    const turns = conversationTracker.getTurns();
    res.json({ turns });
  } catch (e) {
    console.error('[API] Error in /api/turns GET:', e.message);
    res.json({ turns: [] });
  }
});

// POST /api/turns - Log a new conversation turn
app.post('/api/turns', (req, res) => {
  try {
    const {
      user_prompt,
      input_tokens,
      output_tokens,
      model,
      timestamp,
    } = req.body;

    if (!user_prompt || input_tokens === undefined || output_tokens === undefined || !model) {
      return res.status(400).json({
        error: 'Missing required fields: user_prompt, input_tokens, output_tokens, model',
      });
    }

    const turn = conversationTracker.logTurn(
      user_prompt,
      input_tokens,
      output_tokens,
      model,
      timestamp
    );

    if (!turn) {
      return res.status(500).json({ error: 'Failed to log turn' });
    }

    // Broadcast to WebSocket clients
    broadcast({
      type: 'turn',
      data: turn,
      timestamp: new Date().toISOString(),
    });

    res.json({ turn, status: 'logged' });
  } catch (e) {
    console.error('[API] Error in /api/turns POST:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/turns/summary - Get conversation turns summary
app.get('/api/turns/summary', (req, res) => {
  try {
    if (!conversationTracker) {
      return res.json({
        total_turns: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        models: {},
      });
    }
    const summary = conversationTracker.getTurnsSummary();
    res.json(summary);
  } catch (e) {
    console.error('[API] Error in /api/turns/summary:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`[Dashboard] Server running on http://localhost:${PORT}`);
  console.log(`[Dashboard] WebSocket: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Dashboard] Shutting down...');
  if (fileWatcher) fileWatcher.close();
  if (usageWatcher) usageWatcher.close();
  wss.close();
  server.close(() => {
    process.exit(0);
  });
});

// Initialize
initialize().catch(err => {
  console.error('[Dashboard] Initialization error:', err);
  process.exit(1);
});

export { app, wss, broadcast, costTracker, dataLoader };
