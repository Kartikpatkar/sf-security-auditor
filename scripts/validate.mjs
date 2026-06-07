import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const requiredFiles = [
  'manifest.json',
  'src/background/service-worker.js',
  'src/app/app.html',
  'src/app/app.js',
  'src/app/app.css',
  'src/content/content-script.js',
  'src/content/page-bridge.js',
  'src/salesforce-scripts/org-detector.js',
  'src/salesforce-scripts/salesforce-api.js',
  'src/salesforce-scripts/salesforce-members.js'
];

await validateManifest();
await validateRequiredFiles();
await validateJavaScriptSyntax();

console.log('validation ok');

async function validateManifest() {
  const manifestText = await readFile(path.join(projectRoot, 'manifest.json'), 'utf8');
  JSON.parse(manifestText);
}

async function validateRequiredFiles() {
  await Promise.all(requiredFiles.map((file) => readFile(path.join(projectRoot, file), 'utf8')));
}

async function validateJavaScriptSyntax() {
  const jsFiles = requiredFiles.filter((file) => file.endsWith('.js'));

  for (const file of jsFiles) {
    await runNodeCheck(file);
  }
}

function runNodeCheck(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Syntax check failed for ${file}\n${stderr}`));
    });
  });
}