import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
      ...options,
    });

    child.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

const port = process.env.PLAYWRIGHT_VITE_PORT || '5173';
const host = process.env.PLAYWRIGHT_VITE_HOST || '127.0.0.1';

try {
  rmSync(resolve(process.cwd(), 'node_modules/.vite/deps'), { recursive: true, force: true });
} catch (error) {
  console.warn(`[playwright-vite] Could not clear optimize deps cache: ${error}`);
}

const optimizeResult = await runCommand('npx', ['vite', 'optimize', '--force']);
if (optimizeResult.code && optimizeResult.code !== 0) {
  console.warn(`[playwright-vite] vite optimize exited with code ${optimizeResult.code}, continuing with dev server startup.`);
}
if (optimizeResult.signal) {
  console.warn(`[playwright-vite] vite optimize exited from signal ${optimizeResult.signal}, continuing with dev server startup.`);
}

const devServer = spawn('npx', ['vite', '--host', host, '--port', port, '--strictPort'], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

const forwardSignal = (signal) => {
  if (!devServer.killed) {
    devServer.kill(signal);
  }
};

process.on('SIGINT', forwardSignal);
process.on('SIGTERM', forwardSignal);

devServer.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
