#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
let mode = 'sequential';
const commands = [];

for (const arg of args) {
  if (arg === '-p' || arg === '--parallel') {
    mode = 'parallel';
    continue;
  }

  if (arg === '-s' || arg === '--sequential') {
    mode = 'sequential';
    continue;
  }

  if (arg.startsWith('-')) {
    console.error(`Unsupported flag "${arg}".`);
    process.exit(1);
  }

  commands.push(arg);
}

if (commands.length === 0) {
  console.error('Usage: npm-run-all [-p|-s] <script> [script ...]');
  process.exit(1);
}

const shellOption = process.platform === 'win32';

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      shell: shellOption,
    });

    child.on('error', (error) => {
      const wrapped = new Error(`Failed to start script "${scriptName}": ${error.message}`);
      wrapped.exitCode = 1;
      reject(wrapped);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        const wrapped = new Error(`Script "${scriptName}" exited due to signal ${signal}`);
        wrapped.exitCode = 1;
        reject(wrapped);
        return;
      }

      if (code === 0) {
        resolve(0);
        return;
      }

      const wrapped = new Error(`Script "${scriptName}" exited with code ${code}`);
      wrapped.exitCode = typeof code === 'number' ? code : 1;
      reject(wrapped);
    });
  });
}

async function runSequential(list) {
  for (const scriptName of list) {
    await runScript(scriptName);
  }
}

function killChildren(children) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

async function runParallel(list) {
  const children = [];

  const onSignal = (signal) => {
    killChildren(children);
    process.exit(signal === 'SIGINT' ? 130 : 1);
  };

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    await Promise.all(
      list.map(
        (scriptName) =>
          new Promise((resolve, reject) => {
            const child = spawn('npm', ['run', scriptName], {
              stdio: 'inherit',
              shell: shellOption,
            });

            children.push(child);

            child.on('error', (error) => {
              const wrapped = new Error(`Failed to start script "${scriptName}": ${error.message}`);
              wrapped.exitCode = 1;
              reject(wrapped);
            });

            child.on('exit', (code, signal) => {
              if (signal) {
                const wrapped = new Error(`Script "${scriptName}" exited due to signal ${signal}`);
                wrapped.exitCode = 1;
                reject(wrapped);
                return;
              }

              if (code === 0) {
                resolve(0);
                return;
              }

              const wrapped = new Error(`Script "${scriptName}" exited with code ${code}`);
              wrapped.exitCode = typeof code === 'number' ? code : 1;
              reject(wrapped);
            });
          }),
      ),
    );
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  }
}

(async () => {
  try {
    if (mode === 'parallel') {
      await runParallel(commands);
    } else {
      await runSequential(commands);
    }
    process.exit(0);
  } catch (error) {
    if (error) {
      console.error(error.message || error);
      if (error.exitCode) {
        process.exit(error.exitCode);
      }
    }
    process.exit(1);
  }
})();
