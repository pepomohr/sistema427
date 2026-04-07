const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'components');

const files = fs.readdirSync(dir);
for (const file of files) {
  if (!file.endsWith('.tsx')) continue;
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Replace standard background & text combination
  if (content.includes('text-[#2d3529]')) {
    content = content.replace(/bg-\[\#16A34A\] text-\[\#2d3529\]/g, 'bg-[#16A34A] text-white');
    content = content.replace(/bg-\[\#16A34A\] hover:bg-\[\#15803D\] text-\[\#2d3529\]/g, 'bg-[#16A34A] hover:bg-[#15803D] text-white');
    content = content.replace(/data-\[state=active\]:bg-\[\#16A34A\] data-\[state=active\]:text-\[\#2d3529\]/g, 'data-[state=active]:bg-[#16A34A] data-[state=active]:text-white');
    content = content.replace(/bg-\[\#16A34A\] text-\[\#2d3529\] hover:bg-\[\#15803D\]/g, 'bg-[#16A34A] text-white hover:bg-[#15803D]');
    
    // Additional loose replaces manually targeting the button classes
    content = content.replace(/className=\"w-full mt-4 bg-\[\#16A34A\] text-\[\#2d3529\] hover:bg-\[\#15803D\]\"/g, 'className="w-full mt-4 bg-[#16A34A] text-white hover:bg-[#15803D]"')
    content = content.replace(/className=\"bg-\[\#16A34A\] text-\[\#2d3529\] text-lg font-bold px-4 py-1.5 border-none\"/g, 'className="bg-[#16A34A] text-white text-lg font-bold px-4 py-1.5 border-none"')
    content = content.replace(/className=\"bg-\[\#16A34A\] text-\[\#2d3529\] font-bold hover:bg-\[\#15803D\]\"/g, 'className="bg-[#16A34A] text-white font-bold hover:bg-[#15803D]"')
    content = content.replace(/className=\"bg-\[\#16A34A\] text-\[\#2d3529\] hover:bg-\[\#15803D\] font-bold\"/g, 'className="bg-[#16A34A] text-white hover:bg-[#15803D] font-bold"')
    content = content.replace(/className=\"bg-\[\#16A34A\] hover:bg-\[\#15803D\] text-\[\#2d3529\] font-bold\"/g, 'className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold"')
    content = content.replace(/className=\"w-full bg-\[\#16A34A\] text-\[\#2d3529\] font-bold hover:bg-\[\#15803D\]\"/g, 'className="w-full bg-[#16A34A] text-white font-bold hover:bg-[#15803D]"')
    content = content.replace(/className=\"bg-\[\#16A34A\] text-\[\#2d3529\] hover:bg-\[\#15803D\]\"/g, 'className="bg-[#16A34A] text-white hover:bg-[#15803D]"')
    content = content.replace(/className=\"w-full bg-\[\#16A34A\] text-\[\#2d3529\] hover:bg-\[\#15803D\]\"/g, 'className="w-full bg-[#16A34A] text-white hover:bg-[#15803D]"')
    content = content.replace(/h-14 text-\[\#2d3529\]/g, 'h-14 text-white')
    content = content.replace(/className=\"bg-\[\#16A34A\] hover:bg-\[\#15803D\] text-\[\#2d3529\] font-bold h-10 w-10 p-0 rounded-full flex-shrink-0 shadow-lg\"/g, 'className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold h-10 w-10 p-0 rounded-full flex-shrink-0 shadow-lg"')
    content = content.replace(/className=\"bg-\[\#16A34A\] text-\[\#2d3529\]\"/g, 'className="bg-[#16A34A] text-white"')

    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, content);
    console.log('Updated ' + file);
  }
}
