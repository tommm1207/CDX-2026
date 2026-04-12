import fs from 'fs';

const files = [
  'src/components/auth/LoginPage.tsx',
  'src/components/warehouses/Warehouses.tsx',
  'src/components/settings/DatabaseSetup.tsx',
  'src/components/shared/Toast.tsx',
  'src/components/notifications/Notifications.tsx',
  'src/components/production/ProductionOrderDetail.tsx',
  'src/components/production/ConstructionDiary.tsx',
  'src/components/production/ProductionOrders.tsx',
  'src/components/hr/HRRecords.tsx',
  'src/components/finance/PendingApprovals.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasAlert = content.includes('<AlertCircle');
    let hasCheck = content.includes('<CheckCircle');
    
    // check if it's imported
    let hasAlertImport = content.includes('AlertCircle') && content.match(/import[^;]+AlertCircle/);
    let hasCheckImport = content.includes('CheckCircle') && content.match(/import[^;]+CheckCircle/);
    
    if ((hasAlert && !hasAlertImport) || (hasCheck && !hasCheckImport)) {
         console.log(`ERROR: Missing imports in ${file}`);
    } else {
         console.log(`OK: ${file}`);
    }
});
