const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Exact targeted replaces based on the first error batch
  content = content.replace(/propertyId: 1/g, 'propertyId: "1"');
  content = content.replace(/unitId: 1/g, 'unitId: "1"');
  content = content.replace(/inspectorId: 1/g, 'inspectorId: "1"');
  content = content.replace(/userId: 1/g, 'userId: "1"');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

fixFile('src/inspection/inspection.service.spec.ts');
