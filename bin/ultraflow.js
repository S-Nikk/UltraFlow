#!/usr/bin/env node

import { createCLI } from '../lib/cli/index.js';

const program = createCLI();
program.parse(process.argv);
