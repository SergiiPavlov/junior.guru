#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const env = { ...process.env, ESLINT_USE_FLAT_CONFIG: "false" };

const targets = ["app", "components", "hooks", "lib", "tests", "middleware.ts", "next.config.ts", "tailwind.config.ts", "postcss.config.js"];

try {
  execSync(`npx eslint ${targets.join(" ")}`, {
    stdio: "inherit",
    env,
    cwd: projectRoot,
    shell: true
  });
} catch (error) {
  process.exit(error.status ?? 1);
}
