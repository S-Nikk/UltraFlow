import fs from 'fs';
import path from 'path';
import { renderTemplate } from '../utils/template-engine.js';

export default {
  async generate(config) {
    const configPath = path.join(process.cwd(), '.opencode/config.yaml');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });

    const content = await renderTemplate('opencode-config.yaml.hbs', config);
    fs.writeFileSync(configPath, content);
    console.log('✅ Generated .opencode/config.yaml');
  }
};
