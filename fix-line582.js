const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');
const lines = c.split('\n');
// Fix line 582 (index 581) - it should be .replace(/"/g, "\"")
lines[581] = '    .replace(/"/g, "\\"")';
const newC = lines.join('\n');
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', newC);
console.log('Fixed line 582!');