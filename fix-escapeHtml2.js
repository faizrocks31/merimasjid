const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');

// Find the escapeHtml function and replace it entirely
const startIdx = c.indexOf('function escapeHtml(str: string): string {');
const endIdx = c.indexOf('\n}', startIdx) + 2;

const newFunc = `function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"")
    .replace(/'/g, "&#039;");
}`;

const newC = c.substring(0, startIdx) + newFunc + c.substring(endIdx);
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', newC);
console.log('Fixed escapeHtml function!');