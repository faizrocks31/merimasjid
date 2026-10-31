const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');
// The problem is line with: .replace(/"/g, """)
// In the file it appears as: .replace(/\"/g, \""\"\")
// Need to fix it to: .replace(/"/g, "")
c = c.replace('.replace(/\\\\"/g, """)', '.replace(/"/g, "")');
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', c);
console.log('Done!');