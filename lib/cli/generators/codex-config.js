import fs from 'fs';
import { renderTemplate } from '../utils/template-engine.js';

export default {
  async generate(config) {
    const agentsPath = 'AGENTS.md';
    const content = await renderTemplate('codex-agents.md.hbs', config);
    fs.writeFileSync(agentsPath, content);
    console.log('✅ Generated AGENTS.md');
  }
};
