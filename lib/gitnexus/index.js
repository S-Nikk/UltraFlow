const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class GitNexus {
  constructor(options = {}) {
    this.repo = options.repo || 'ultraflow';
    this.projectPath = options.projectPath || process.cwd();
    this.mainProjects = options.mainProjects || [
      path.join(os.homedir(), 'AI'),
      path.join(os.homedir(), 'AI-OpenCode')
    ];
  }

  async analyze(projectPath = this.projectPath) {
    if (!fs.existsSync(projectPath)) {
      return { success: false, error: 'Project path does not exist' };
    }
    
    try {
      execSync('npx gitnexus analyze', { cwd: projectPath, stdio: 'inherit', shell: true });
      return { success: true, project: path.basename(projectPath) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async analyzeAll() {
    const results = [];
    for (const projectPath of this.mainProjects) {
      if (fs.existsSync(projectPath)) {
        const result = await this.analyze(projectPath);
        results.push(result);
      }
    }
    return results;
  }

  async status(projectPath = this.projectPath) {
    try {
      const metaPath = path.join(projectPath, '.gitnexus', 'meta.json');
      if (fs.existsSync(metaPath)) {
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      }
      return { indexed: false, project: path.basename(projectPath) };
    } catch {
      return { indexed: false, project: path.basename(projectPath) };
    }
  }

  async impact(symbolName, options = {}) {
    const direction = options.direction || 'upstream';
    const maxDepth = options.maxDepth || 2;
    const mainProject = path.join(os.homedir(), 'AI');
    
    try {
      const result = execSync(
        `npx gitnexus impact ${symbolName} --direction ${direction} --max-depth ${maxDepth}`,
        { cwd: mainProject, encoding: 'utf-8', shell: true }
      );
      return JSON.parse(result);
    } catch (error) {
      return { error: 'GitNexus not available or symbol not found', symbol: symbolName };
    }
  }

  async query(concept, options = {}) {
    const repo = options.repo;
    const mainProject = path.join(os.homedir(), 'AI');
    
    try {
      const cmd = repo 
        ? `npx gitnexus query "${concept}" --repo ${repo}`
        : `npx gitnexus query "${concept}"`;
      const result = execSync(cmd, { cwd: mainProject, encoding: 'utf-8', shell: true });
      return JSON.parse(result);
    } catch {
      return { error: 'GitNexus not available', concept };
    }
  }

  async context(symbolName, options = {}) {
    const repo = options.repo;
    const mainProject = path.join(os.homedir(), 'AI');
    
    try {
      const cmd = repo 
        ? `npx gitnexus context ${symbolName} --repo ${repo}`
        : `npx gitnexus context ${symbolName}`;
      const result = execSync(cmd, { cwd: mainProject, encoding: 'utf-8', shell: true });
      return JSON.parse(result);
    } catch {
      return { error: 'GitNexus not available', symbol: symbolName };
    }
  }

  async detectChanges(options = {}) {
    const base = options.base || 'HEAD~1';
    const scope = options.scope || 'staged';
    const mainProject = path.join(os.homedir(), 'AI');
    
    try {
      const result = execSync(
        `npx gitnexus detect-changes --base ${base} --scope ${scope}`,
        { cwd: mainProject, encoding: 'utf-8', shell: true }
      );
      return JSON.parse(result);
    } catch {
      return { error: 'GitNexus not available', base, scope };
    }
  }

  async listRepos() {
    try {
      const result = execSync('npx gitnexus list', { encoding: 'utf-8', shell: true });
      return JSON.parse(result);
    } catch {
      return { repos: [], error: 'GitNexus not available' };
    }
  }
}

function createGitNexusMiddleware(options = {}) {
  const gn = new GitNexus(options);
  
  return async function(req, res, next) {
    if (req.body && req.body.symbol) {
      try {
        const impact = await gn.impact(req.body.symbol, {
          direction: req.body.direction || 'upstream',
          maxDepth: req.body.maxDepth || 2
        });
        req.body.gitnexusImpact = impact;
      } catch (e) {
        req.body.gitnexusImpact = { error: e.message };
      }
    }
    next();
  };
}

module.exports = {
  GitNexus,
  createGitNexusMiddleware
};