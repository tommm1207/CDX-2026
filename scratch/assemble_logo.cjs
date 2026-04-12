const fs = require('fs');
const content = fs.readFileSync('scratch/logo_base64.txt', 'utf8').trim().replace(/[\r\n]/g, '');
const output = `export const logoBase64 = "data:image/png;base64,${content}";\n`;
fs.writeFileSync('src/utils/logoBase64.ts', output);
console.log('Successfully assembled src/utils/logoBase64.ts');
