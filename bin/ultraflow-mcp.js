#!/usr/bin/env node

/**
 * Ultraflow MCP Server
 * Exposes memory, context, checkpoint, token tracking, and Lyra tools via MCP protocol
 * 
 * Simply wraps the existing brain-server which already implements MCP
 */

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, '../lib/brain-server/server.js');

// Fork the brain-server which already implements MCP protocol
const child = fork(SERVER_PATH, [], {
  stdio: ['inherit', 'inherit', 'inherit', 'ipc']
});

// Handle clean shutdown
process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill();
  process.exit(0);
});