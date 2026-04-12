const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const HOME = os.homedir();

class TokenDashboard {
  constructor() {
    this.app = express();
    this.setupRoutes();
    this.start();
  }

  loadData() {
    const sources = [
      path.join(HOME, '.claude', 'memory', 'agent-usage-log.json'),
      path.join(HOME, '.claude', 'token-cost-dashboard.json'),
      path.join(__dirname, 'data', 'sample.json')
    ];

    for (const source of sources) {
      try {
        if (fs.existsSync(source)) {
          const raw = fs.readFileSync(source, 'utf-8');
          const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
          
          if (Array.isArray(data) && data.length > 0) {
            return this.transformData(data, source);
          }
          if (data.entries || data.tokens || data.sessions) {
            return this.transformData(data, source);
          }
        }
      } catch (e) {
        console.log(`Failed to load from ${source}: ${e.message}`);
      }
    }

    return this.getSampleData();
  }

  transformData(data, source) {
    const isArray = Array.isArray(data);
    const entries = isArray ? data : (data.entries || data.tokens || []);
    
    const daily = {};
    const byModel = {};
    let totalTokens = 0;
    let totalCost = 0;

    entries.forEach(entry => {
      const date = entry.date || entry.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
      const tokens = entry.tokens || entry.total_tokens || entry.input_tokens + (entry.output_tokens || 0) || 0;
      const cost = entry.cost || entry.total_cost || entry.estimated_cost || 0;
      const model = entry.model || entry.model_name || 'claude-3-sonnet';

      daily[date] = (daily[date] || 0) + tokens;
      byModel[model] = (byModel[model] || 0) + tokens;
      totalTokens += tokens;
      totalCost += cost;
    });

    return {
      source: path.basename(source),
      totalTokens,
      totalCost: totalCost.toFixed(4),
      daily: Object.entries(daily).map(([date, tokens]) => ({ date, tokens })),
      byModel: Object.entries(byModel).map(([model, tokens]) => ({ model, tokens })),
      recent: entries.slice(-10).map(e => ({
        date: e.date || e.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
        tokens: e.tokens || e.total_tokens || 0,
        model: e.model || e.model_name || 'claude-3-sonnet'
      }))
    };
  }

  getSampleData() {
    const samplePath = path.join(__dirname, 'data', 'sample.json');
    try {
      return JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
    } catch {
      return {
        source: 'none',
        totalTokens: 0,
        totalCost: 0,
        daily: [],
        byModel: [],
        recent: []
      };
    }
  }

  setupRoutes() {
    this.app.use(express.static(path.join(__dirname, 'public')));

    this.app.get('/api/data', (req, res) => {
      const data = this.loadData();
      res.json(data);
    });

    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', port: PORT, server: 'ultraflow-token-dashboard' });
    });

    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  start() {
    this.app.listen(PORT, () => {
      console.log(`⚡ Token Dashboard running on http://localhost:${PORT}`);
    });
  }
}

module.exports = TokenDashboard;