import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function detectAI() {
  const status = {
    claudeFlow: false,
    opencode: false,
    brain: true, // bundled
  };

  // Check Claude Flow
  try {
    execSync('npm list @claude-flow/cli', { encoding: 'utf-8', stdio: 'pipe' });
    status.claudeFlow = true;
  } catch {}

  // Check OpenCode
  try {
    execSync('which opencode', { encoding: 'utf-8', stdio: 'pipe' });
    status.opencode = true;
  } catch {}

  return status;
}
