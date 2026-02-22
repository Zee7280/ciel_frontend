const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, fileList);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const allFiles = findFiles('/Users/zainali/saevolgo_frontend/ciel_frontend/src/app');
let modifiedCount = 0;

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Find authenticatedFetch(`/something`) or authenticatedFetch("/something")
    // and replace with authenticatedFetch(`/api/v1/something`)
    content = content.replace(/authenticatedFetch\(\s*`\/(?!api\/)(.*?)`/g, 'authenticatedFetch(`/api/v1/$1`');
    content = content.replace(/authenticatedFetch\(\s*"\/(?!api\/)(.*?)"/g, 'authenticatedFetch("/api/v1/$1"');
    content = content.replace(/authenticatedFetch\(\s*'\/(?!api\/)(.*?)'/g, 'authenticatedFetch("/api/v1/$1"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Updated ${file}`);
    }
}

console.log(`\nFixed missing /api/v1/ prefixes in ${modifiedCount} files.`);
