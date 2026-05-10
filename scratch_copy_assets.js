const fs = require('fs');
const path = require('path');

const os = require('os');

const relSourceDir = path.join(__dirname, '..', '..', '..', '..', '..', '.gemini', 'antigravity', 'brain', '1c422c23-b546-4c11-b99f-c4f9fa92f128');
const destDir = path.join(__dirname, 'public');

const files = [
  { src: 'centralized_hub_1778414796251.png', dest: 'slide-hub.png' },
  { src: 'intelligent_ledger_1778414818080.png', dest: 'slide-ledger.png' },
  { src: 'secured_governance_1778414837085.png', dest: 'slide-governance.png' }
];

files.forEach(f => {
  try {
    fs.copyFileSync(path.join(relSourceDir, f.src), path.join(destDir, f.dest));
    console.log(`Copied ${f.src} -> ${f.dest}`);
  } catch (e) {
    console.error(`Error copying ${f.src}: ${e.message}`);
  }
});
