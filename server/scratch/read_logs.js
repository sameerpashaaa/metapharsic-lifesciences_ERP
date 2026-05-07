const fs = require('fs');

function readLog(path) {
    if (fs.existsSync(path)) {
        console.log(`--- ${path} ---`);
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n');
        console.log(lines.slice(-20).join('\n'));
    } else {
        console.log(`--- ${path} does not exist ---`);
    }
}

readLog('./error.log');
readLog('./logs/error.log');
