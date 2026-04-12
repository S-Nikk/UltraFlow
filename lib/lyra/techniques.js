module.exports = {
  lyra_optimization: {
    name: 'Lyra Optimization',
    description: 'Core optimization using Lyra 4-D methodology',
    appliesTo: ['all']
  },
  
  constraint_extraction: {
    name: 'Constraint Extraction',
    description: 'Identifies and preserves explicit constraints',
    appliesTo: ['instruction', 'list']
  },
  
  intent_expansion: {
    name: 'Intent Expansion',
    description: 'Expands short intents with contextual understanding',
    appliesTo: ['question', 'instruction']
  },
  
  detail_enhancement: {
    name: 'Detail Enhancement',
    description: 'Adds clarity and specificity improvements',
    appliesTo: ['instruction', 'list']
  },
  
  platform_prefix: {
    name: 'Platform Prefix',
    description: 'Adds platform-specific system context',
    appliesTo: ['all']
  },
  
  platform_suffix: {
    name: 'Platform Suffix',
    description: 'Adds platform-specific response guidance',
    appliesTo: ['all']
  },
  
  code_formatting: {
    name: 'Code Formatting',
    description: 'Normalizes and enhances code block formatting',
    appliesTo: ['code']
  },
  
  format_normalization: {
    name: 'Format Normalization',
    description: 'Standardizes prompt structure and layout',
    appliesTo: ['all']
  }
};