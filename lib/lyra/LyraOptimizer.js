const config = require('./config.json');
const modes = require('./modes');
const platforms = require('./platforms');
const techniques = require('./techniques');

class LyraOptimizer {
  constructor(options = {}) {
    this.mode = options.mode || 'auto';
    this.platform = options.platform || 'auto';
    this.context = options.context || '';
    this.history = options.history || [];
  }

  diagnose(prompt) {
    const issues = [];
    const length = prompt.length;
    
    if (length < 50) issues.push('too_short');
    if (length > 2000) issues.push('too_long');
    if (!prompt.includes('?') && !prompt.includes('。') && !prompt.includes('？')) issues.push('unclear_intent');
    if (prompt.split('\n').length > 10) issues.push('too_complex');
    
    return {
      issues,
      score: Math.max(0, 100 - issues.length * 20),
      wordCount: length,
      hasContext: this.context.length > 0
    };
  }

  deconstruct(prompt) {
    const segments = prompt.split(/\n+/).filter(s => s.trim());
    const intent = segments[0] || prompt;
    const details = segments.slice(1).join(' ');
    
    return {
      intent,
      details,
      constraints: this.extractConstraints(prompt),
      format: this.detectFormat(prompt)
    };
  }

  extractConstraints(prompt) {
    const constraintPatterns = [
      /\b(must|should|need to|require|ensure)\b/i,
      /\b(don't|don't|never|avoid|don't)\b/i,
      /\b(only|just|exactly)\b/i
    ];
    
    const constraints = [];
    constraintPatterns.forEach(pattern => {
      const match = prompt.match(new RegExp(pattern, 'gi'));
      if (match) constraints.push(match[0].toLowerCase());
    });
    
    return constraints;
  }

  detectFormat(prompt) {
    if (prompt.includes('```')) return 'code';
    if (prompt.match(/^\d+\./m)) return 'list';
    if (prompt.includes('?')) return 'question';
    if (prompt.match(/^(what|how|why|when|where|who)/i)) return 'question';
    return 'instruction';
  }

  develop(deconstructed) {
    const modeConfig = modes[this.mode] || modes.auto;
    const platformConfig = platforms[this.platform] || {};
    const techniqueList = [];
    
    let optimized = deconstructed.intent.trim();
    
    if (modeConfig.expandIntent && deconstructed.details) {
      optimized += '\n\n' + deconstructed.details;
    }
    
    if (deconstructed.constraints.length > 0) {
      const constraintSection = '\n\nConstraints:\n' + deconstructed.constraints.map(c => `- ${c}`).join('\n');
      optimized += constraintSection;
      techniqueList.push('constraint_extraction');
    }
    
    if (platformConfig.prefix) {
      optimized = platformConfig.prefix + '\n' + optimized;
      techniqueList.push('platform_prefix');
    }
    
    if (platformConfig.suffix) {
      optimized += '\n\n' + platformConfig.suffix;
      techniqueList.push('platform_suffix');
    }
    
    if (this.mode === 'detail' || this.mode === 'auto') {
      optimized = this.addDetailEnhancements(optimized);
      techniqueList.push('detail_enhancement');
    }
    
    if (deconstructed.format === 'code' && platformConfig.codeFormatting) {
      optimized = this.applyCodeFormatting(optimized);
      techniqueList.push('code_formatting');
    }
    
    techniqueList.push('lyra_optimization');
    
    return {
      optimized: optimized.trim(),
      techniques: [...new Set(techniqueList)],
      mode: this.mode,
      platform: this.platform
    };
  }

  addDetailEnhancements(prompt) {
    const enhancements = [
      { pattern: /^([A-Z][^\.]+)\./, replacement: '$1.' },
      { pattern: /\b(do|make|create)\b/gi, replacement: 'execute' },
      { pattern: /\b(good|nice)\b/gi, replacement: 'optimal' }
    ];
    
    let enhanced = prompt;
    enhancements.forEach(e => {
      enhanced = enhanced.replace(e.pattern, e.replacement);
    });
    
    return enhanced;
  }

  applyCodeFormatting(prompt) {
    return prompt.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `\`\`\`${lang || 'javascript'}\n${code.trim()}\n\`\`\``;
    });
  }

  optimize(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { optimized: prompt, techniques: [], diagnosis: { issues: ['invalid_input'] } };
    }

    const diagnosis = this.diagnose(prompt);
    const deconstructed = this.deconstruct(prompt);
    const developed = this.develop(deconstructed);

    return {
      optimized: developed.optimized,
      techniques: developed.techniques,
      diagnosis,
      decomposed: deconstructed,
      metadata: {
        mode: this.mode,
        platform: this.platform,
        timestamp: new Date().toISOString()
      }
    };
  }

  optimizeCheckpoint(checkpoint) {
    if (!checkpoint || !checkpoint.content) {
      return checkpoint;
    }

    const optimized = this.optimize(checkpoint.content);
    
    return {
      ...checkpoint,
      content: optimized.optimized,
      lyraOptimized: true,
      lyraTechniques: optimized.techniques,
      lyraMetadata: optimized.metadata
    };
  }

  createMiddleware() {
    const optimizer = this;
    
    return async function(req, res, next) {
      if (req.body && req.body.prompt) {
        const result = optimizer.optimize(req.body.prompt);
        req.body.optimizedPrompt = result.optimized;
        req.body.lyraMetadata = result.metadata;
      }
      next();
    };
  }
}

module.exports = LyraOptimizer;