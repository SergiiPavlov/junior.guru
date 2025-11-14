#!/usr/bin/env node
import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function parseArgs(argv) {
  const args = argv.slice(2);
  let mode = 'parallel';
  const scripts = [];
  for (const arg of args) {
    if (arg === '-p' || arg === '--parallel') {
      mode = 'parallel';
      continue;
    }
    if (arg === '-s' || arg === '--sequential' || arg === '--serial') {
      mode = 'sequential';
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`[npm-run-all] Unsupported flag: ${arg}`);
      process.exit(1);
    }
    scripts.push(arg);
  }
  if (scripts.length === 0) {
    console.error('[npm-run-all] No scripts provided.');
    process.exit(1);
  }
  return { mode, scripts };
}

function runScript(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ['run', name], { stdio: 'inherit', shell: false });
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error(`[npm-run-all] Script "${name}" failed with code ${code ?? signal ?? 'unknown'}`);
      reject(error);
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runSequential(scripts) {
  for (const script of scripts) {
    await runScript(script);
  }
}

async function runParallel(scripts) {
  await new Promise((resolve, reject) => {
    const children = [];
    let finished = 0;
    let hasError = false;

    scripts.forEach((script) => {
      const child = spawn(npmCommand, ['run', script], { stdio: 'inherit', shell: false });
      children.push(child);

      const shutdownOthers = () => {
        children.forEach((proc) => {
          if (proc !== child && proc.exitCode === null) {
            proc.kill('SIGTERM');
          }
        });
      };

      child.on('exit', (code, signal) => {
        if (hasError) {
          return;
        }
        if (code !== 0) {
          hasError = true;
          shutdownOthers();
          reject(new Error(`[npm-run-all] Script "${script}" failed with code ${code ?? signal ?? 'unknown'}`));
          return;
        }
        finished += 1;
        if (finished === scripts.length) {
          resolve();
        }
      });

      child.on('error', (error) => {
        if (hasError) {
          return;
        }
        hasError = true;
        shutdownOthers();
        reject(error);
      });
    });
  });
}

async function main() {
  const { mode, scripts } = parseArgs(process.argv);
  try {
    if (mode === 'sequential') {
      await runSequential(scripts);
    } else {
      await runParallel(scripts);
    }
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
