#!/usr/bin/env node

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../lib/brain-server/server.js');

const child = fork(serverPath, [], {
  stdio: ['inherit', 'inherit', 'inherit', 'ipc']
});

process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});
