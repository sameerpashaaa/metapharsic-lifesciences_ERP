const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'components');

const replacements = [
  { corrupt: /â‚¹/g, fix: '₹' },
  { corrupt: /â€¢/g, fix: '•' },
  { corrupt: /â€”/g, fix: '—' },
  { corrupt: /â€“/g, fix: '–' },
  { corrupt: /â€™/g, fix: "'" },
  { corrupt: /â€œ/g, fix: '"' },
  { corrupt: /â€/g, fix: '"' }
];

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

let filesModified = 0;

walkDir(targetDir, (filepath) => {
    let content = fs.readFileSync(filepath, 'utf-8');
    let original = content;
    
    for (const pair of replacements) {
        content = content.replace(pair.corrupt, pair.fix);
    }
    
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`[FIXED] ${path.relative(__dirname, filepath)}`);
        filesModified++;
    }
});

console.log(`\nEncoding repair complete! Modified ${filesModified} files.`);
