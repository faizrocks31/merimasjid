const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');

// Find and replace the specific line
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"')) {
    lines[i] = '    .replace(/"/g, "\\"")';
    console.log('Fixed line', i + 1);
    break;
  }
}
const newC = lines.join('\n');
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', newC);
console.log('Done!');