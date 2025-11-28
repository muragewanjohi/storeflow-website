/**
 * Script to fix implicit 'any' type errors in TypeScript files
 * 
 * This script adds explicit 'any' type annotations to map/reduce/forEach callbacks
 * that are causing TypeScript errors on Vercel.
 * 
 * Run with: npx tsx scripts/fix-implicit-any.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// Patterns to fix
const patterns = [
  // .map((param) => ...)
  {
    regex: /\.map\(\(([a-z_][a-z0-9_]*)\)\s*=>/g,
    replacement: (match: string, param: string) => `.map((${param}: any) =>`,
  },
  // .reduce((sum, item) => ...)
  {
    regex: /\.reduce\(\(([a-z_][a-z0-9_]*),\s*([a-z_][a-z0-9_]*)\)\s*=>/g,
    replacement: (match: string, param1: string, param2: string) => `.reduce((${param1}: any, ${param2}: any) =>`,
  },
  // .forEach((item) => ...)
  {
    regex: /\.forEach\(\(([a-z_][a-z0-9_]*)\)\s*=>/g,
    replacement: (match: string, param: string) => `.forEach((${param}: any) =>`,
  },
  // .filter((item) => ...)
  {
    regex: /\.filter\(\(([a-z_][a-z0-9_]*)\)\s*=>/g,
    replacement: (match: string, param: string) => `.filter((${param}: any) =>`,
  },
];

function fixFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const pattern of patterns) {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  });

  let fixedCount = 0;
  for (const file of files) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} files`);
}

main().catch(console.error);

