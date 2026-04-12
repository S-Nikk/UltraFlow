import config from './config.json' with { type: 'json' };
import { techniques } from './techniques.js';
import { platforms } from './platforms.js';

export class LyraOptimizer {
  constructor(options = {}) {
    this.mode = options.mode || 'basic';
    this.platform = options.platform || 'generic';
    this.config = config;
    this.techniques = techniques;
    this.platforms = platforms;
  }

  async optimize(prompt, options = {}) {
    const mode = options.mode || this.mode;
    const platform = options.platform || this.platform;
    
    const result = mode === 'detail' 
      ? await this.detailMode(prompt, options)
      : this.basicMode(prompt, options);
    
    return this.formatOutput(result, platform, mode);
  }

  detailMode(prompt, options) {
    const deconstructed = this.deconstruct(prompt);
    const diagnosed = this.diagnose(deconstructed);
    return this.develop(diagnosed, options);
  }

  basicMode(prompt, options) {
    const deconstructed = this.deconstruct(prompt, true);
    return this.develop(deconstructed, options, true);
  }

  deconstruct(prompt, quick = false) {
    const intent = this.extractIntent(prompt);
    const entities = this.extractEntities(prompt);
    const constraints = this.extractConstraints(prompt);
    const missing = this.identifyMissing(intent, entities);
    
    return {
      original: prompt,
      intent,
      entities,
      constraints,
      missing,
      ambiguities: quick ? [] : this.flagAmbiguities(prompt),
      complexity: this.assessComplexity(prompt),
    };
  }

  diagnose(deconstructed) {
    const gaps = [];
    const specificity = this.assessSpecificity(deconstructed);
    const completeness = this.assessCompleteness(deconstructed);
    const contextLevel = this.assessContextLevel(deconstructed);

    if (deconstructed.ambiguities.length > 0) {
      gaps.push('ambiguities_detected');
    }
    if (specificity < 0.5) gaps.push('low_specificity');
    if (completeness < 0.7) gaps.push('incomplete_context');
    if (contextLevel < 0.5) gaps.push('insufficient_context');

    return {
      ...deconstructed,
      gaps,
      specificity,
      completeness,
      contextLevel,
      requestType: this.determineRequestType(deconstructed),
    };
  }

  develop(diagnosed, options, quick = false) {
    const { requestType } = diagnosed;
    const technique = this.chooseTechnique(requestType, quick);
    
    const role = options.role || this.inferRole(diagnosed.intent);
    const context = this.layerContext(diagnosed, options);
    const structure = this.buildStructure(requestType, quick);
    const guardrails = this.addGuardrails(diagnosed.constraints, options);

    const prompt = this.assemblePrompt({
      role,
      context,
      task: diagnosed.original,
      structure,
      guardrails,
      technique,
    });

    return {
      prompt,
      techniques: quick ? technique.foundation : technique.all,
      improvements: this.describeImprovements(diagnosed),
      proTips: this.getProTips(requestType, options.platform || 'generic'),
    };
  }

  extractIntent(prompt) {
    const actionWords = ['write', 'create', 'build', 'make', 'generate', 'implement', 'fix', 'debug', 'analyze', 'explain', 'teach', 'optimize', 'refactor'];
    const lower = prompt.toLowerCase();
    
    for (const word of actionWords) {
      if (lower.includes(word)) {
        return { action: word, rest: prompt.replace(new RegExp(word, 'i'), '').trim() };
      }
    }
    
    return { action: 'process', rest: prompt };
  }

  extractEntities(prompt) {
    const entities = [];
    const patterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
      /\b(?:file|function|class|module|api|endpoint|service|database)\b/gi,
      /\b\d+(?:\.\d+){1,3}\b/g,
    ];
    
    for (const pattern of patterns) {
      const matches = prompt.match(pattern);
      if (matches) entities.push(...matches);
    }
    
    return [...new Set(entities)];
  }

  extractConstraints(prompt) {
    const constraints = [];
    const constraintPatterns = [
      /\b(?:must|should|need|require|only|just|exactly)\b/i,
      /\b(?:no|without|except|avoid|don't|never)\b/i,
      /\b(?:limit|maximum|minimum|range|between)\b/i,
      /\b(?:format|style|structure)\s+(?:json|yaml|xml|markdown|plain)\b/i,
    ];
    
    for (const pattern of constraintPatterns) {
      const match = prompt.match(pattern);
      if (match) constraints.push(match[0]);
    }
    
    return constraints;
  }

  identifyMissing(intent, entities) {
    const missing = [];
    
    if (intent.action === 'write' && !entities.some(e => /poem|story|article|blog/i.test(e))) {
      missing.push('output_format');
    }
    if (intent.action === 'fix' || intent.action === 'debug') {
      if (!entities.some(e => /error|bug|issue/i.test(e))) {
        missing.push('error_description');
      }
    }
    
    return missing;
  }

  flagAmbiguities(prompt) {
    const ambiguities = [];
    const vagueWords = ['something', 'stuff', 'things', 'nice', 'good', 'better', 'quick', 'simple'];
    
    for (const word of vagueWords) {
      if (prompt.toLowerCase().includes(word)) {
        ambiguities.push(`vague_term:${word}`);
      }
    }
    
    return ambiguities;
  }

  assessComplexity(prompt) {
    const indicators = {
      technical: /\b(code|function|api|database|algorithm|system|implement)\b/i,
      multiStep: /\band then\b|\bfirst\b.*\bthen\b|\bstep\d\b|\b1\.\b.*\b2\.\b/i,
      conditional: /\bif\b.*\bthen\b|\bwhen\b.*\bdo\b|\bswitch\b|\bcase\b/i,
      extended: /\bdescribe\b.*\banalyze\b|\bexplain\b.*\bwith\b/i,
    };
    
    let score = 0;
    for (const [, pattern] of Object.entries(indicators)) {
      if (pattern.test(prompt)) score++;
    }
    
    return score >= 3 ? 'complex' : score >= 1 ? 'moderate' : 'simple';
  }

  assessSpecificity(deconstructed) {
    let score = 0;
    if (deconstructed.entities.length > 0) score += 0.3;
    if (deconstructed.constraints.length > 0) score += 0.3;
    if (deconstructed.ambiguities.length === 0) score += 0.4;
    return score;
  }

  assessCompleteness(deconstructed) {
    let score = 0.5;
    if (deconstructed.intent.action !== 'process') score += 0.2;
    if (deconstructed.entities.length > 2) score += 0.2;
    if (deconstructed.missing.length === 0) score += 0.1;
    return Math.min(score, 1);
  }

  assessContextLevel(deconstructed) {
    const contextWords = ['context', 'background', 'since', 'because', 'currently', 'existing'];
    let matches = 0;
    for (const word of contextWords) {
      if (deconstructed.original.toLowerCase().includes(word)) matches++;
    }
    return Math.min(matches / 3, 1);
  }

  determineRequestType(deconstructed) {
    const { complexity, original } = deconstructed;
    
    if (/creative|write|poem|story|art|design/i.test(original)) return 'creative';
    if (/code|function|implement|fix|debug|api|system|algorithm/i.test(original)) return 'technical';
    if (/teach|learn|explain|how\s+to|what\s+is/i.test(original)) return 'educational';
    if (complexity === 'complex') return 'complex';
    
    return 'simple';
  }

  chooseTechnique(requestType, quick = false) {
    const typeConfig = this.config.request_types[requestType] || this.config.request_types.simple;
    
    const technique = {
      foundation: [...this.config.techniques.foundation],
      advanced: quick ? [] : [...this.config.techniques.advanced],
    };
    technique.all = [...technique.foundation, ...technique.advanced];
    
    return technique;
  }

  inferRole(intent) {
    const roleMap = {
      write: 'professional writer',
      create: 'expert creator',
      build: 'senior software architect',
      make: 'expert craftsman',
      generate: 'AI assistant specialist',
      implement: 'senior developer',
      fix: 'debugging expert',
      debug: 'senior software engineer',
      analyze: 'expert analyst',
      explain: 'knowledgeable educator',
      teach: 'patient instructor',
      optimize: 'performance engineer',
      refactor: 'code quality specialist',
    };
    
    return roleMap[intent.action] || 'AI assistant';
  }

  layerContext(diagnosed, options) {
    const layers = [];
    
    if (options.background) {
      layers.push(`Background: ${options.background}`);
    }
    if (options.history) {
      layers.push(`History: ${options.history}`);
    }
    if (diagnosed.entities.length > 0) {
      layers.push(`Relevant entities: ${diagnosed.entities.join(', ')}`);
    }
    
    return layers;
  }

  buildStructure(requestType, quick = false) {
    const structures = {
      simple: {
        format: ['task'],
        template: 'Complete the following task: {task}',
      },
      creative: {
        format: ['theme', 'style', 'structure', 'tone', 'length'],
        template: 'Create {theme} in {style} style with {tone} tone, approximately {length}.',
      },
      technical: {
        format: ['problem', 'requirements', 'constraints', 'format'],
        template: 'Analyze and provide {format} solution for: {problem}. Requirements: {requirements}. Constraints: {constraints}.',
      },
      educational: {
        format: ['topic', 'level', 'examples', 'format'],
        template: 'Explain {topic} at {level} level with {examples} examples in {format} format.',
      },
      complex: {
        format: ['goal', 'steps', 'alternatives', 'verification'],
        template: 'Goal: {goal}. Steps: {steps}. Consider alternatives: {alternatives}. Verify: {verification}.',
      },
    };
    
    return quick ? { format: structures.simple.format } : (structures[requestType] || structures.simple);
  }

  addGuardrails(constraints, options) {
    const guardrails = [];
    
    if (options.exclude) {
      guardrails.push(`Exclude: ${options.exclude}`);
    }
    if (options.limit) {
      guardrails.push(`Limit: ${options.limit}`);
    }
    if (constraints.length > 0) {
      guardrails.push(...constraints.map(c => `Constraint: ${c}`));
    }
    if (options.format) {
      guardrails.push(`Output format: ${options.format}`);
    }
    
    return guardrails;
  }

  assemblePrompt({ role, context, task, structure, guardrails, technique }) {
    const parts = [];
    
    parts.push(`You are a ${role}.`);
    
    if (context.length > 0) {
      parts.push(context.join(' '));
    }
    
    parts.push(`Task: ${task}`);
    
    if (structure.template && structure.template.includes('{')) {
      const filled = structure.template
        .replace('{theme}', 'the theme from the task')
        .replace('{style}', 'appropriate')
        .replace('{tone}', 'professional')
        .replace('{length}', 'concise')
        .replace('{problem}', 'the described problem')
        .replace('{requirements}', 'clear requirements')
        .replace('{format}', 'structured')
        .replace('{constraints}', 'any constraints')
        .replace('{topic}', 'the topic')
        .replace('{level}', 'intermediate')
        .replace('{examples}', 'practical')
        .replace('{goal}', 'the stated goal')
        .replace('{steps}', 'logical steps')
        .replace('{alternatives}', 'reasonable alternatives')
        .replace('{verification}', 'how to verify success');
      parts.push(filled);
    }
    
    if (guardrails.length > 0) {
      parts.push(guardrails.join('. ') + '.');
    }
    
    return parts.join('\n\n');
  }

  describeImprovements(diagnosed) {
    const improvements = [];
    
    if (diagnosed.ambiguities.length > 0) {
      improvements.push('Added role assignment to reduce ambiguity');
    }
    if (diagnosed.missing.includes('output_format')) {
      improvements.push('Specified output format requirements');
    }
    if (diagnosed.contextLevel < 0.5) {
      improvements.push('Added context layering for clarity');
    }
    if (diagnosed.specificity < 0.7) {
      improvements.push('Enhanced specificity with entity extraction');
    }
    
    if (improvements.length === 0) {
      improvements.push('Optimized structure and clarity');
    }
    
    return improvements;
  }

  getProTips(requestType, platform) {
    const tips = [];
    const platformConfig = this.platforms[platform] || this.platforms.generic;
    
    tips.push(`Platform: Use ${platformConfig.style} style for ${platform}`);
    
    if (platform === 'claude') {
      tips.push('Use XML tags for structured output');
    }
    if (platform === 'chatgpt') {
      tips.push('Use conversation starters for better engagement');
    }
    
    return tips;
  }

  formatOutput(result, platform, mode) {
    return {
      optimized: result.prompt,
      mode,
      platform,
      techniquesUsed: result.techniques,
      improvements: result.improvements,
      proTips: result.proTips,
    };
  }

  analyze(prompt) {
    const deconstructed = this.deconstruct(prompt);
    const diagnosed = this.diagnose(deconstructed);
    
    return {
      original: prompt,
      diagnosis: diagnosed,
      qualityGates: this.checkQualityGates(diagnosed),
    };
  }

  checkQualityGates(diagnosed) {
    const gates = this.config.quality_gates;
    const results = {};
    
    for (const gate of gates) {
      switch (gate) {
        case 'core-intent-captured':
          results[gate] = diagnosed.intent.action !== 'process';
          break;
        case 'output-specs-clear':
          results[gate] = diagnosed.constraints.length > 0 || diagnosed.completeness > 0.8;
          break;
        case 'role-expertise-assigned':
          results[gate] = true;
          break;
        case 'context-sufficient':
          results[gate] = diagnosed.contextLevel > 0.5;
          break;
        case 'format-matches-complexity':
          results[gate] = true;
          break;
        case 'platform-considerations-noted':
          results[gate] = true;
          break;
        case 'examples-included-if-needed':
          results[gate] = diagnosed.requestType === 'educational' || diagnosed.complexity === 'complex';
          break;
        default:
          results[gate] = true;
      }
    }
    
    return results;
  }

  getVersions(prompt) {
    const versions = {};
    
    for (const [platform, config] of Object.entries(this.platforms)) {
      const result = this.optimize(prompt, { platform, mode: 'detail' });
      versions[platform] = result.optimized;
    }
    
    return versions;
  }
}

export function createOptimizer(options) {
  return new LyraOptimizer(options);
}

export default LyraOptimizer;