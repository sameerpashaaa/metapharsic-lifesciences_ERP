const fs = require('fs');
const files = [
  'components/Assets.tsx',
  'components/AuditLog.tsx',
  'components/Manufacturing.tsx',
  'components/OMS.tsx',
  'components/QualityControl.tsx',
  'components/accounts/ChartOfAccountsView.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<StatCard\s+title=/g, '<StatCard label=');
    content = content.replace(/<StatCard\s+([^>]*?)title=/g, '<StatCard $1label=');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});