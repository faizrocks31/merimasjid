const fs = require('fs');
let c = fs.readFileSync('src/modules/receipts/pdf-chromium.ts', 'utf8');

// The issue is at byte positions 17146-17155 in the original file
// The pattern: .replace(/"/g, """) should be .replace(/"/g, """)
// In the file, bytes 17146-17155 are: 47 "/" 103 "g" 44 "," 32 " " 34 """ 34 """ 34 """ 41 ")"
// Need to change the three double quotes (17152, 17153, 17154) to "

let arr = Array.from(c);
// Position 17152, 17153, 17154 are the three double quotes in the replacement string
// Replace them with "
arr[17152] = '&';
arr[17153] = 'q';
arr[17154] = 'u';
arr.splice(17155, 0, 'o');
arr.splice(17156, 0, 't');
arr.splice(17157, 0, ';');

const newC = arr.join('');
fs.writeFileSync('src/modules/receipts/pdf-chromium.ts', newC);
console.log('Done!');