#!/usr/bin/env node

/**
 * OpenCode Delegation with Orchestration
 *
 * Enhanced version of opencode-delegate.js that:
 * 1. Spawns child Ruflo process for task handling
 * 2. Collects metrics from both layers
 * 3. Reports aggregated results
 *
 * Usage:
 *   node opencode-delegate-orchestrated.js "Your prompt here"
 *   node opencode-delegate-orchestrated.js --spawn-child true "Your prompt"
 *   node opencode-delegate-orchestrated.js --no-spawn-child "Your prompt"
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

/**
 * Find OpenCode binary
 */
function findOpenCodeBinary() {
  try {
    const result = execSync('which opencode', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch (e) {
    // which failed
  }

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

  return 'opencode';
}

const OPENCODE_BIN = findOpenCodeBinary();

/**
 * Spawn child Ruflo process
 */
async function spawnChildRuflo(taskId, brokerPort = 3333) {
  return new Promise((resolve, reject) => {
    const rufloPath = process.env.RUFLO_PATH || '/c/Users/ecoec/AI/ruflo';
    const rufloEntry = path.join(rufloPath, 'bin', 'ruflo.js');

    if (!fs.existsSync(rufloEntry)) {
      console.warn(`[Orchestration] Ruflo entry point not found: ${rufloEntry}`);
      resolve(null); // Continue without child
      return;
    }

    console.log(`\n🚀 Spawning child Ruflo process for task ${taskId}...`);

    const env = {
      ...process.env,
      RUFLO_PARENT_PID: process.pid.toString(),
      RUFLO_TASK_ID: taskId,
      RUFLO_SESSION_ID: randomUUID(),
      RUFLO_MESSAGE_BROKER_PORT: brokerPort.toString(),
      RUFLO_MESSAGE_BROKER_HOST: 'localhost',
      RUFLO_NESTED_MODE: 'true'
    };

    const child = spawn('node', [rufloEntry, 'nested'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      detached: false,
      timeout: 600000 // 10 minutes
    });

    const metrics = {
      pid: child.pid,
      taskId,
      startTime: Date.now(),
      tokensUsed: 0,
      success: false,
      messages: []
    };

    // Handle child messages
    if (child.send) {
      child.on('message', (msg) => {
        if (msg.type === 'metrics') {
          metrics.tokensUsed = msg.payload.tokensUsed || 0;
        }
        metrics.messages.push(msg);
      });
    }

    // Handle child exit
    child.on('close', (code) => {
      metrics.endTime = Date.now();
      metrics.success = code === 0;
      metrics.exitCode = code;

      if (code === 0) {
        console.log(`✅ Child Ruflo completed (tokens: ${metrics.tokensUsed})`);
      } else {
        console.warn(`⚠️ Child Ruflo failed with code ${code}`);
      }

      resolve(metrics);
    });

    child.on('error', (error) => {
      console.error(`❌ Child Ruflo error: ${error.message}`);
      metrics.endTime = Date.now();
      metrics.error = error.message;
      resolve(metrics); // Continue - don't reject
    });

    // Set timeout
    setTimeout(() => {
      if (!child.killed) {
        console.warn(`⏱️ Child Ruflo timeout, killing PID ${child.pid}`);
        child.kill('SIGKILL');
        metrics.timedOut = true;
      }
    }, 600000);
  });
}

/**
 * Delegate to OpenCode
 */
async function delegateToOpenCode(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const args = ['run', prompt];

    if (options.language) args.push(`--model opencode/${options.language}`);
    if (options.timeout) args.push(`--timeout ${options.timeout}`);
    if (options.logLevel) args.push(`--log-level ${options.logLevel}`);

    console.log(`\n📝 Delegating to OpenCode...`);
    console.log(`📄 Prompt: ${prompt.substring(0, 80)}...`);

    const opencode = spawn(OPENCODE_BIN, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      timeout: (options.timeout || 300) * 1000
    });

    let stdout = '';
    let stderr = '';
    const startTime = Date.now();

    opencode.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    opencode.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    opencode.on('close', (code) => {
      const duration = Date.now() - startTime;

      if (code === 0) {
        console.log('\n✅ OpenCode completed successfully');

        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { stdout, success: true };
          result.duration = duration;
          resolve(result);
        } catch (e) {
          resolve({ stdout, success: true, duration });
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
OpenCode Delegation with Orchestration

Usage:
  node opencode-delegate-orchestrated.js "Your prompt here"
  node opencode-delegate-orchestrated.js --spawn-child true "Your prompt"
  node opencode-delegate-orchestrated.js --no-spawn-child "Your prompt"

Options:
  --spawn-child      Enable child Ruflo spawning (default: true)
  --broker-port      Message broker port (default: 3333)
  --language         Target language
  --timeout          Timeout in seconds
  --log-level        DEBUG, INFO, WARN, ERROR
    `);
    process.exit(1);
  }

  try {
    const options = {};
    let prompt = '';
    let spawnChild = true;
    let brokerPort = 3333;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const flag = args[i].slice(2);
        if (flag === 'spawn-child' && args[i + 1]) {
          spawnChild = args[++i] !== 'false';
        } else if (flag === 'no-spawn-child') {
          spawnChild = false;
        } else if (flag === 'broker-port' && args[i + 1]) {
          brokerPort = parseInt(args[++i], 10);
        } else if (flag === 'language' && args[i + 1]) {
          options.language = args[++i];
        } else if (flag === 'timeout' && args[i + 1]) {
          options.timeout = parseInt(args[++i], 10);
        } else if (flag === 'log-level' && args[i + 1]) {
          options.logLevel = args[++i];
        }
      } else {
        prompt = args[i];
      }
    }

    if (!prompt) {
      console.error('Error: No prompt provided');
      process.exit(1);
    }

    const taskId = `task-${Date.now()}`;
    const startTime = Date.now();

    // Spawn child process in parallel
    const childPromise = spawnChild ? spawnChildRuflo(taskId, brokerPort) : Promise.resolve(null);

    // Execute OpenCode
    console.log(`\n🎯 Task ID: ${taskId}`);
    const opencodeResult = await delegateToOpenCode(prompt, options);
    const opengcodeDuration = Date.now() - startTime;

    // Wait for child
    const childMetrics = await childPromise;

    // Aggregate results
    const aggregated = {
      taskId,
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - startTime,
      layers: {
        opencode: {
          success: opencodeResult.success,
          duration: opengcodeDuration,
          tokensUsed: opencodeResult.metrics?.tokens_used || 0
        },
        child: childMetrics
          ? {
            success: childMetrics.success,
            duration: childMetrics.endTime - childMetrics.startTime,
            tokensUsed: childMetrics.tokensUsed,
            pid: childMetrics.pid
          }
          : null
      },
      combined: {
        totalTokens: (opencodeResult.metrics?.tokens_used || 0) + (childMetrics?.tokensUsed || 0),
        success: opencodeResult.success && (!childMetrics || childMetrics.success)
      }
    };

    console.log(`\n📊 Orchestration Summary:`);
    console.log(`  Total Duration: ${aggregated.totalDuration}ms`);
    console.log(`  Total Tokens: ${aggregated.combined.totalTokens}`);
    console.log(`  OpenCode Duration: ${opengcodeDuration}ms`);
    if (childMetrics) {
      console.log(`  Child Ruflo Duration: ${childMetrics.endTime - childMetrics.startTime}ms`);
      console.log(`  Child PID: ${childMetrics.pid}`);
    }
    console.log(`  Overall Success: ${aggregated.combined.success}`);

    if (opencodeResult.files) {
      console.log(`\n📁 Generated files:`);
      Object.keys(opencodeResult.files).forEach((file) => {
        console.log(`  - ${file}`);
      });
    }

    console.log(`\n✨ Complete orchestration result available in JSON above`);
    process.exit(aggregated.combined.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { delegateToOpenCode, spawnChildRuflo };

// Run if called directly
if (require.main === module) {
  main();
}
