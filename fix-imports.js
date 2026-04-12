import fs from 'fs';

const files = [
  'src/components/finance/Costs.tsx',
  'src/components/production/ProductionOrderDetail.tsx',
  'src/components/auth/LoginPage.tsx',
  'src/components/finance/PendingApprovals.tsx',
  'src/components/production/ConstructionDiary.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*(['"])lucide-react\2;/, (match, p1) => {
        let imports = p1.split(',').map(i => i.trim()).filter(i => i !== '');
        if (!imports.includes('AlertCircle')) imports.push('AlertCircle');
        if (!imports.includes('CheckCircle')) imports.push('CheckCircle');
        return `import { \n  ${imports.join(',\n  ')}\n} from 'lucide-react';`;
    });
    fs.writeFileSync(file, content);
  }
});
