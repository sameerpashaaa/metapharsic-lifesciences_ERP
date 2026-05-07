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
    // Replace <StatCard title= with <StatCard label=
    content = content.replace(/<StatCard\s+title=/g, '<StatCard label=');
    // also handle <StatCard ... title= if title is not the first prop
    content = content.replace(/<StatCard\s+([^>]*?)title=/g, '<StatCard $1label=');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
