import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(file => {
        let fileRaw = dir + '/' + file;
        let stat = fs.statSync(fileRaw);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(fileRaw));
        } else { 
            results.push(fileRaw);
        }
    });
    return results;
}

const files = walkDir('src/components').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

let missing = [];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*(['"])lucide-react\2;/g;
    
    let match;
    let importedIcons = new Set();
    while ((match = importRegex.exec(content)) !== null) {
        match[1].split(',').forEach(i => importedIcons.add(i.trim()));
    }

    // find all <IconName /> occurrences
    const jsxIconRegex = /<([A-Z][a-zA-Z0-9]*)\s/g;
    let missingInFile = new Set();
    
    let jsxMatch;
    while ((jsxMatch = jsxIconRegex.exec(content)) !== null) {
        let tag = jsxMatch[1];
        // naive check: if the tag is capitalized, maybe it's an icon.
        // if it's an icon name that exists in lucide-react but is NOT imported?
        if (tag.endsWith('Circle') || tag.endsWith('Square') || tag.endsWith('Triangle') || tag === 'Trash2' || tag === 'Plus' || tag === 'Edit') {
           if (!importedIcons.has(tag) && !content.includes(import ) && !content.includes(import { )) {
                missingInFile.add(tag);
           }
        }
    }
    if (missingInFile.size > 0) {
        missing.push({ file, icons: Array.from(missingInFile) });
    }
});

console.log(JSON.stringify(missing, null, 2));
