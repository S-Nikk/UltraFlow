#!/usr/bin/env node

/**
 * OpenCode Delegation Utility
 *
 * Delegates code generation, refactoring, optimization, and test writing to OpenCode.
 * Offloads token-intensive work away from Claude.
 *
 * Usage:
 *   node opencode-delegate.js "Your prompt here"
 *   node opencode-delegate.js --refactor src/apiClient.ts "Optimize for performance"
 *   node opencode-delegate.js --test src/services/ "Write comprehensive tests"
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Find OpenCode binary in system PATH or npm global
 * @returns {string} Path to opencode binary
 */
function findOpenCodeBinary() {
  // Try 'which opencode' first
  try {
    const result = execSync('which opencode', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch (e) {
    // which command failed, try alternatives
  }

  // Try npm global location
  const globalNpmPath = path.join(
    process.env.APPDATA || process.env.HOME || process.env.USERPROFILE,
    'npm',
    'node_modules',
    'opencode-ai',
    'bin',
    'opencode'
  );

  if (fs.existsSync(globalNpmPath)) {
    return globalNpmPath;
  }

  // Last resort: just return 'opencode' and hope it's in PATH
  return 'opencode';
}

const OPENCODE_BIN = findOpenCodeBinary();

/**
 * Delegate to OpenCode
 * @param {string} prompt - The task prompt
 * @param {object} options - Options (refactor, test, optimize, etc.)
 * @returns {Promise<object>} Result with files, explanation, metrics
 */
async function delegateToOpenCode(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    // Build OpenCode command
    const args = ['run', prompt];

    // Add flags based on options
    if (options.language) args.push(`--model opencode/${options.language}`);
    if (options.timeout) args.push(`--timeout ${options.timeout}`);
    if (options.logLevel) args.push(`--log-level ${options.logLevel}`);

    console.log(`\n🚀 Delegating to OpenCode...`);
    console.log(`📝 Prompt: ${prompt.substring(0, 80)}...`);

    const opencode = spawn(OPENCODE_BIN, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      timeout: (options.timeout || 300) * 1000
    });

    let stdout = '';
    let stderr = '';

    opencode.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    opencode.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    opencode.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ OpenCode completed successfully');

        // Try to parse JSON output
        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { stdout, success: true };
          resolve(result);
        } catch (e) {
          resolve({ stdout, success: true });
        }
      } else {
        console.error(`\n❌ OpenCode failed with code ${code}`);
        reject(new Error(`OpenCode exited with code ${code}: ${stderr}`));
      }
    });

    opencode.on('error', (err) => {
      reject(new Error(`Failed to spawn OpenCode: ${err.message}`));
    });
  });
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`
OpenCode Delegation Utility

Usage:
  node opencode-delegate.js "Your prompt here"
  node opencode-delegate.js --refactor "Optimize this code"
  node opencode-delegate.js --test "Write tests for..."
  node opencode-delegate.js --optimize "Make this faster"

Options:
  --refactor      Code refactoring task
  --test          Test generation task
  --optimize      Performance optimization task
  --language      Target language (typescript, python, etc.)
  --timeout       Timeout in seconds (default: 300)
  --log-level     DEBUG, INFO, WARN, ERROR
    `);
    process.exit(1);
  }

  try {
    const options = {};
    let prompt = '';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const flag = args[i].slice(2);
        if (flag === 'refactor') options.refactor = true;
        else if (flag === 'test') options.test = true;
        else if (flag === 'optimize') options.optimize = true;
        else if (flag === 'language' && args[i + 1]) options.language = args[++i];
        else if (flag === 'timeout' && args[i + 1]) options.timeout = parseInt(args[++i]);
        else if (flag === 'log-level' && args[i + 1]) options.logLevel = args[++i];
      } else {
        prompt = args[i];
      }
    }

    if (!prompt) {
      console.error('Error: No prompt provided');
      process.exit(1);
    }

    // Delegate to OpenCode
    const result = await delegateToOpenCode(prompt, options);

    console.log(`\n📊 Metrics:`);
    if (result.metrics) {
      console.log(`  - Tokens used: ${result.metrics.tokens_used || 'N/A'}`);
      console.log(`  - Time: ${result.metrics.time_seconds || 'N/A'}s`);
      console.log(`  - Lines of code: ${result.metrics.lines_of_code || 'N/A'}`);
    }

    if (result.files) {
      console.log(`\n📁 Generated files:`);
      Object.keys(result.files).forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { delegateToOpenCode };

// Run if called directly
if (require.main === module) {
  main();
}
