export const techniques = {
  foundation: {
    roleAssignment: {
      name: 'Role Assignment',
      description: 'Assign explicit AI persona/expertise to guide response',
      apply: (prompt, role) => `You are a ${role}.\n\n${prompt}`,
    },
    contextLayering: {
      name: 'Context Layering',
      description: 'Layer background context before specific task',
      apply: (prompt, context) => {
        const contextStr = Array.isArray(context) ? context.join(' ') : context;
        return contextStr ? `${contextStr}\n\n${prompt}` : prompt;
      },
    },
    outputSpecification: {
      name: 'Output Specification',
      description: 'Specify exact format, length, and structure',
      apply: (prompt, specs) => {
        const specsStr = Array.isArray(specs) ? specs.join(' ') : specs;
        return specsStr ? `${prompt}\n\nOutput format: ${specsStr}` : prompt;
      },
    },
    taskDecomposition: {
      name: 'Task Decomposition',
      description: 'Break complex tasks into step-by-step',
      apply: (prompt, steps) => {
        if (!steps || !Array.isArray(steps)) return prompt;
        const stepsStr = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
        return `${prompt}\n\nFollow these steps:\n${stepsStr}`;
      },
    },
  },
  advanced: {
    chainOfThought: {
      name: 'Chain of Thought',
      description: 'Include reasoning framework for complex tasks',
      apply: (prompt, framework = 'analyze-then-solve') => {
        const frameworks = {
          'analyze-then-solve': 'First analyze the problem, then provide solution',
          'compare-and-contrast': 'Compare options, then recommend',
          'hypothesis-then-verify': 'Form hypothesis, then verify with evidence',
          'step-by-step-reasoning': 'Show step-by-step reasoning process',
        };
        return `${prompt}\n\nUse ${framework} approach: ${frameworks[framework] || frameworks['analyze-then-solve']}`;
      },
    },
    fewShotLearning: {
      name: 'Few-Shot Learning',
      description: 'Include examples to guide output format',
      apply: (prompt, examples) => {
        if (!examples || !Array.isArray(examples)) return prompt;
        const exampleStr = examples.map(e => `Input: ${e.input}\nOutput: ${e.output}`).join('\n\n');
        return `${prompt}\n\nExamples:\n${exampleStr}`;
      },
    },
    multiPerspectiveAnalysis: {
      name: 'Multi-Perspective Analysis',
      description: 'Request analysis from multiple viewpoints',
      apply: (prompt, perspectives) => {
        if (!perspectives || !Array.isArray(perspectives)) return prompt;
        return `${prompt}\n\nAnalyze from these perspectives: ${perspectives.join(', ')}`;
      },
    },
    constraintOptimization: {
      name: 'Constraint Optimization',
      description: 'Add explicit constraints and boundaries',
      apply: (prompt, constraints) => {
        if (!constraints || !Array.isArray(constraints)) return prompt;
        return `${prompt}\n\nConstraints:\n${constraints.map(c => `- ${c}`).join('\n')}`;
      },
    },
    reasoningFrameworks: {
      name: 'Reasoning Frameworks',
      description: 'Include structured reasoning patterns',
      apply: (prompt, framework) => {
        const frameworks = {
          ' pros-cons': 'Analyze pros and cons',
          ' swot': 'Use SWOT analysis',
          ' 5-whys': 'Apply 5 Whys root cause analysis',
          ' decision-tree': 'Use decision tree approach',
        };
        return `${prompt}\n\nUse ${framework} framework for analysis`;
      },
    },
  },
};

export function applyTechnique(prompt, techniqueType, techniqueName, ...args) {
  const category = techniques[techniqueType];
  if (!category || !category[techniqueName]) {
    console.warn(`Unknown technique: ${techniqueType}.${techniqueName}`);
    return prompt;
  }
  
  return category[techniqueName].apply(prompt, ...args);
}

export function applyAllFoundation(prompt, options) {
  let result = prompt;
  
  if (options.role) {
    result = applyTechnique(result, 'foundation', 'roleAssignment', options.role);
  }
  if (options.context) {
    result = applyTechnique(result, 'foundation', 'contextLayering', options.context);
  }
  if (options.outputSpec) {
    result = applyTechnique(result, 'foundation', 'outputSpecification', options.outputSpec);
  }
  if (options.steps) {
    result = applyTechnique(result, 'foundation', 'taskDecomposition', options.steps);
  }
  
  return result;
}

export function applyAllAdvanced(prompt, options) {
  let result = prompt;
  
  if (options.chainOfThought) {
    result = applyTechnique(result, 'advanced', 'chainOfThought', options.chainOfThought);
  }
  if (options.examples) {
    result = applyTechnique(result, 'advanced', 'fewShotLearning', options.examples);
  }
  if (options.perspectives) {
    result = applyTechnique(result, 'advanced', 'multiPerspectiveAnalysis', options.perspectives);
  }
  if (options.constraints) {
    result = applyTechnique(result, 'advanced', 'constraintOptimization', options.constraints);
  }
  if (options.reasoningFramework) {
    result = applyTechnique(result, 'advanced', 'reasoningFrameworks', options.reasoningFramework);
  }
  
  return result;
}

export function listAllTechniques() {
  const result = [];
  
  for (const [category, categoryTechniques] of Object.entries(techniques)) {
    for (const [name, technique] of Object.entries(categoryTechniques)) {
      result.push({
        category,
        name,
        ...technique,
      });
    }
  }
  
  return result;
}

export default {
  techniques,
  applyTechnique,
  applyAllFoundation,
  applyAllAdvanced,
  listAllTechniques,
};