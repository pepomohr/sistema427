const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'components');

const replacements = [
  // Typography mapping
  { from: /text-white\/10/g, to: 'text-gray-200' },
  { from: /text-white\/20/g, to: 'text-gray-300' },
  { from: /text-white\/30/g, to: 'text-gray-400' },
  { from: /text-white\/40/g, to: 'text-gray-400' },
  { from: /text-white\/50/g, to: 'text-gray-500' },
  { from: /text-white\/60/g, to: 'text-gray-500' },
  { from: /text-white\/70/g, to: 'text-gray-600' },
  { from: /text-white\/80/g, to: 'text-gray-700' },
  { from: /text-white\/90/g, to: 'text-gray-800' },
  // Remove raw text-white from spans, p, div, labels, h1-h6 (BUT NOT buttons! Button might be text-white)
  // This helps clean up stray whites.
  { from: /<p className="([^"]*)text-white([^"]*)">/g, to: '<p className="$1text-foreground$2">' },
  { from: /<span className="([^"]*)text-white([^"]*)">/g, to: '<span className="$1text-foreground$2">' },
  { from: /<h([1-6]) className="([^"]*)text-white([^"]*)">/g, to: '<h$1 className="$2text-foreground$3">' },
  { from: /<Label className="([^"]*)text-white([^"]*)">/g, to: '<Label className="$1text-foreground$2">' },
  { from: /<CardTitle className="([^"]*)text-white([^"]*)">/g, to: '<CardTitle className="$1text-foreground$2">' },
  { from: /<div className="([^"]*)text-white([^"]*)">/g, to: '<div className="$1text-foreground$2">' },
  
  // Borders
  { from: /border-white\/5/g, to: 'border-gray-100' },
  { from: /border-white\/10/g, to: 'border-gray-200' },
  { from: /border-white\/20/g, to: 'border-gray-300' },
  { from: /border-white\/30/g, to: 'border-gray-300' },
  { from: /border-border/g, to: 'border-gray-200' },

  // Backgrounds
  { from: /bg-black\/10/g, to: 'bg-gray-50' },
  { from: /bg-black\/20/g, to: 'bg-gray-100' },
  { from: /bg-black\/30/g, to: 'bg-gray-200' },
  { from: /bg-secondary\/20/g, to: 'bg-secondary/5' },
  { from: /bg-secondary\/30/g, to: 'bg-secondary/10' },
  { from: /bg-secondary\/40/g, to: 'bg-secondary/10' },
  { from: /bg-secondary\/50/g, to: 'bg-secondary/15' },
  { from: /bg-[#2d3529]\/50/g, to: 'bg-secondary/10' },
  { from: /bg-[#252c22]\/50/g, to: 'bg-secondary/10' },
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      replacements.forEach(r => {
        content = content.replace(r.from, r.to);
      });
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Processed: ${file}`);
    }
  });
}

walk(directoryPath);
console.log("Done.");
