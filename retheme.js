const fs = require('fs');

function replaceColors(filePath, isHistory) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // For History page, we want to swap the existing blue (for Overspeeding) to cyan
    // so it doesn't conflict with the new blue primary theme
    if (isHistory) {
        content = content.replace(/blue-/g, 'cyan-');
    }
    
    // Replace emerald with blue, and teal with indigo
    content = content.replace(/emerald-/g, 'blue-')
                     .replace(/teal-/g, 'indigo-');
                     
    fs.writeFileSync(filePath, content);
}

replaceColors('src/components/Sidebar.tsx', false);
replaceColors('src/app/dashboard/history/page.tsx', true);
replaceColors('src/app/dashboard/users/page.tsx', false);

console.log('Retheming complete!');
