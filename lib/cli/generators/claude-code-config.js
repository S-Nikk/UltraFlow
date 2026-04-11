import fs from 'fs';
import path from 'path';
import { renderTemplate } from '../utils/template-engine.js';

export default {
  async generate(config) {
    const settingsPath = path.join(process.cwd(), '.claude/settings.json');

    // Ensure .claude dir exists
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

    // Render template with config
    const content = await renderTemplate('claude-code-settings.json.hbs', config);

    fs.writeFileSync(settingsPath, content);
    console.log('✅ Generated .claude/settings.json');
  }
};
