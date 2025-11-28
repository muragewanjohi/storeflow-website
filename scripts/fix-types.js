/**
 * Quick script to fix implicit 'any' type errors
 * Run with: node scripts/fix-types.js
 */

const fs = require('fs');
const path = require('path');

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, and other build directories
      if (!['node_modules', '.next', 'dist', '.git'].includes(file)) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Fix .map((param) => patterns - only if no type annotation exists
  const mapPattern = /\.map\(\(([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(mapPattern, (match, param) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.map((${param}: any) =>`;
    }
    return match;
  });

  // Fix .map((param1, param2) => patterns - two parameters
  const mapTwoParamPattern = /\.map\(\(([a-z_][a-z0-9_]*),\s*([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(mapTwoParamPattern, (match, p1, p2) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.map((${p1}: any, ${p2}: any) =>`;
    }
    return match;
  });

  // Fix .reduce((sum, item) => patterns  
  const reducePattern = /\.reduce\(\(([a-z_][a-z0-9_]*),\s*([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(reducePattern, (match, p1, p2) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.reduce((${p1}: any, ${p2}: any) =>`;
    }
    return match;
  });

  // Fix .forEach((item) => patterns
  const forEachPattern = /\.forEach\(\(([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(forEachPattern, (match, param) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.forEach((${param}: any) =>`;
    }
    return match;
  });

  // Fix .filter((item) => patterns
  const filterPattern = /\.filter\(\(([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(filterPattern, (match, param) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.filter((${param}: any) =>`;
    }
    return match;
  });

  // Fix .find((item) => patterns
  const findPattern = /\.find\(([a-z_][a-z0-9_]*)\s*=>/g;
  content = content.replace(findPattern, (match, param) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.find((${param}: any) =>`;
    }
    return match;
  });

  // Fix .sort((a, b) => patterns
  const sortPattern = /\.sort\(\(([a-z_][a-z0-9_]*),\s*([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(sortPattern, (match, p1, p2) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.sort((${p1}: any, ${p2}: any) =>`;
    }
    return match;
  });

  // Fix .reduce((sum, order) => patterns
  const reduceTwoParamPattern = /\.reduce\(\(([a-z_][a-z0-9_]*),\s*([a-z_][a-z0-9_]*)\)\s*=>/g;
  content = content.replace(reduceTwoParamPattern, (match, p1, p2) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.reduce((${p1}: any, ${p2}: any) =>`;
    }
    return match;
  });

  // Fix .map(c => patterns (single char parameter)
  const mapSingleCharPattern = /\.map\(([a-z])\s*=>/g;
  content = content.replace(mapSingleCharPattern, (match, param) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.map((${param}: any) =>`;
    }
    return match;
  });

  // Fix .map((c, p) => patterns (two single char parameters)
  const mapTwoSingleCharPattern = /\.map\(\(([a-z]),\s*([a-z])\)\s*=>/g;
  content = content.replace(mapTwoSingleCharPattern, (match, p1, p2) => {
    if (!match.includes(': any') && !match.includes(': typeof') && !match.includes(':')) {
      modified = true;
      return `.map((${p1}: any, ${p2}: any) =>`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllTsFiles(srcDir);
  
  let fixed = 0;
  for (const file of files) {
    if (fixFile(file)) {
      console.log(`Fixed: ${file}`);
      fixed++;
    }
  }
  
  console.log(`\nFixed ${fixed} files`);
}

main();
