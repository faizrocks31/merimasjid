const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');
const idx = c.lastIndexOf('function escapeHtml');
const newFunc =
`function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&#039;");
}`;
const newC = c.substring(0, idx) + newFunc;
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', newC);
console.log('Fixed!');