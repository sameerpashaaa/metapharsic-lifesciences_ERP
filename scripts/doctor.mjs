#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checks = [];

async function fileExists(relativePath) {
  try {
    await access(path.join(root, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function addCheck(name, passed, detail) {
  checks.push({ name, passed, detail });
}

function parseMajor(version) {
  return Number(version.replace(/^v/, '').split('.')[0]);
}

async function main() {
  const nodeMajor = parseMajor(process.version);
  addCheck(
    'Node.js version',
    nodeMajor >= 20,
    `${process.version} detected; Vite 6 works best on Node 20 or newer.`
  );

  addCheck(
    'Dependencies installed',
    await fileExists('node_modules'),
    'Expected node_modules. Run npm install if this fails.'
  );

  addCheck(
    'Frontend env example',
    await fileExists('.env.frontend.example'),
    'Expected .env.frontend.example for browser-side configuration.'
  );

  addCheck(
    'Local frontend env',
    await fileExists('.env.local'),
    'Expected .env.local. Copy from .env.frontend.example if needed.'
  );

  addCheck(
    'Backend env example',
    await fileExists('.env.example'),
    'Expected .env.example for server/database configuration.'
  );

  addCheck(
    'Local backend env',
    await fileExists('server/.env'),
    'Expected server/.env. Copy from .env.example if needed.'
  );

  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  addCheck(
    'Dev script',
    Boolean(packageJson.scripts?.dev),
    'Expected package.json scripts.dev to start Vite.'
  );
  addCheck(
    'Backend script',
    Boolean(packageJson.scripts?.['start-backend']),
    'Expected package.json scripts.start-backend to start the server.'
  );

  const failed = checks.filter((check) => !check.passed);

  console.log('Metapharsic ERP project doctor\n');
  for (const check of checks) {
    console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}`);
    console.log(`     ${check.detail}`);
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} check(s) need attention before the app is ready.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll checks passed. You are ready to run npm run start-all.');
}

main().catch((error) => {
  console.error('Doctor failed unexpectedly.');
  console.error(error);
  process.exitCode = 1;
});
