import fs from 'fs';
import path from 'path';
import { renderTemplate } from '../utils/template-engine.js';

export default {
  async generate(config) {
    const manifestPath = path.join(process.cwd(), '.openclaw/ultraflow-manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

    const content = await renderTemplate('openclaw-manifest.json.hbs', config);
    fs.writeFileSync(manifestPath, content);
    console.log('✅ Generated .openclaw/ultraflow-manifest.json');
  }
};
