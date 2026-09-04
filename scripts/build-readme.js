const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');
const readmePath = path.join(__dirname, '../README.md');

let readmeContent = fs.readFileSync(readmePath, 'utf-8');

readmeContent += '\n\n---\n\n## 📚 Comprehensive Feature Documentation\n\n';
readmeContent += '> The following sections detail the core architecture, capabilities, and technical features of RazorRecovery, compiled from our documentation library.\n\n';

const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();

for (const file of files) {
  const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
  // Optional: Clean up frontmatter or just append
  readmeContent += `\n\n### ${file.replace('.md', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n`;
  readmeContent += content;
  readmeContent += '\n\n';
}

fs.writeFileSync(readmePath, readmeContent);
console.log('Successfully appended docs to README.md');
