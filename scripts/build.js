import fs from 'fs';
import { execSync } from 'child_process';

// Compile TypeScript
try {
  execSync('npx tsc', { stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript compilation failed');
  process.exit(1);
}

// Read compiled JS
const src = fs.readFileSync('dist/index.js', 'utf8');

// Create ESM version
fs.writeFileSync('dist/index.mjs', src);

// Create CJS version
fs.writeFileSync(
  'dist/index.cjs',
  src.replace('export default', 'module.exports =')
);

console.log('Build complete');
