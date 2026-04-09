const fs = require('fs');
const filePath = 'src/app/dashboard/jeepney/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');
// Remove all 'dark:something' classes
content = content.replace(/\s?dark:[^\s"'\`]+/g, '');
fs.writeFileSync(filePath, content);
console.log('Removed dark classes');
