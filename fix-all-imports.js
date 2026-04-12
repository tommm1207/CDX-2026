import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/components', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let needsUpdate = false;
    let missingIcons = [];
    
    // Check if AlertCircle is used in JSX but not imported
    if (content.includes('<AlertCircle') && !content.includes('AlertCircle')) {
        // This is a naive check. A better check is matching the import statement
    }
    
    // Better way: Check if AlertCircle or CheckCircle is mentioned anywhere
    if (content.includes('AlertCircle') || content.includes('CheckCircle')) {
        const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*(['"])lucide-react\2;/;
        const match = content.match(importRegex);
        
        if (match) {
            let imports = match[1].split(',').map(i => i.trim()).filter(i => i !== '');
            let modified = false;
            
            if (content.includes('<AlertCircle') && !imports.includes('AlertCircle')) {
                imports.push('AlertCircle');
                modified = true;
            }
            if (content.includes('<CheckCircle') && !imports.includes('CheckCircle')) {
                imports.push('CheckCircle');
                modified = true;
            }
            
            if (modified) {
                const newImport = `import { \n  ${imports.join(',\n  ')}\n} from 'lucide-react';`;
                content = content.replace(match[0], newImport);
                fs.writeFileSync(filePath, content);
                console.log(`Updated ${filePath}`);
            }
        }
    }
  }
});
