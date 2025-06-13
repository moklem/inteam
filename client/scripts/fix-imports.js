const fs = require('fs');
const path = require('path');

const IMPORT_ORDER_GROUPS = [
  'react',
  '@mui/icons-material',
  '@mui/material',
  'react-router-dom',
  'date-fns',
  'date-fns/locale',
  './context',
  './components/layout',
  './pages',
  './utils'
];

function sortImports(content) {
  const importLines = content.match(/^import\s+.*$/gm) || [];
  const otherLines = content.replace(/^import\s+.*$/gm, '');

  const groupedImports = {};
  IMPORT_ORDER_GROUPS.forEach(group => {
    groupedImports[group] = importLines.filter(line => line.includes(group));
  });

  // Sort imports within each group
  Object.keys(groupedImports).forEach(group => {
    groupedImports[group].sort((a, b) => a.localeCompare(b));
  });

  // Combine imports with newlines between groups
  const sortedImports = IMPORT_ORDER_GROUPS
    .map(group => groupedImports[group])
    .filter(group => group.length > 0)
    .join('\n\n');

  return sortedImports + '\n\n' + otherLines;
}

function addPropTypes(content) {
  // Add PropTypes import if not present
  if (!content.includes('import PropTypes from \'prop-types\'')) {
    content = `import PropTypes from 'prop-types';\n${content}`;
  }

  // Add children prop validation to components
  const componentRegex = /export\s+(?:default\s+)?function\s+(\w+)\(.*\)\s*{/;
  const match = content.match(componentRegex);

  if (match) {
    const componentName = match[1];
    const propTypesDeclaration = `\n${componentName}.propTypes = {
  children: PropTypes.node
};`;

    content += propTypesDeclaration;
  }

  return content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Sort imports
  content = sortImports(content);
  
  // Add prop types
  content = addPropTypes(content);

  fs.writeFileSync(filePath, content);
  console.log(`Processed: ${filePath}`);
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      processFile(fullPath);
    }
  });
}

// Process src directory
processDirectory(path.join(__dirname, '..', 'src'));