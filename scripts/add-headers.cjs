const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const copyright = `/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

`;

async function addHeaderToFile(filePath) {
    try {
        const content = await readFile(filePath, 'utf8');
        if (!content.includes('Copyright 2025 vextra.io')) {
            await writeFile(filePath, copyright + content);
            console.log(`✅ Added header to ${filePath}`);
        } else {
            console.log(`⏭️  Skipped ${filePath} (header already exists)`);
        }
    } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err);
    }
}

function findTypeScriptFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
            findTypeScriptFiles(filePath);
        } else if (file.endsWith('.ts')) {
            addHeaderToFile(filePath);
        }
    });
}

findTypeScriptFiles(path.resolve(__dirname, '..'));