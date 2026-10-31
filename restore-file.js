const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');

// Restore the proper file content - we need to put the import back at line 1
const lines = c.split('\n');

// Remove the corrupted first line
lines.shift();

// The file should start with imports
// Add back the proper first line if missing
if (!lines[0].startsWith('import')) {
  lines.unshift('import { chromium, type Browser, type Page } from "playwright";');
}

// Also fix line 582 (which is now 581 after removing first line)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"') && lines[i].includes('replace')) {
    lines[i] = '    .replace(/"/g, "\\"")';
    console.log('Fixed escapeHtml at line', i + 1);
  }
}

const newC = lines.join('\n');
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', newC);
console.log('Restored!');