#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const brainServer = path.join(__dirname, '..', 'lib', 'brain-server', 'server.js');
const server = spawn('node', [brainServer], { stdio: 'inherit', shell: true });

server.on('exit', (code) => process.exit(code));