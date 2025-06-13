const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const IMPORT_ORDER_GROUPS = [
  'react',
  'react-router-dom',
  '@mui/icons-material',
  '@mui/material',
  'date-fns',
  'date-fns/locale',
  './context',
  './components/layout',
  './pages',
  './utils'
];

function sortImports(fileContent) {
  const ast = parser.parse(fileContent, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  const imports = [];
  
  // Collect import statements
  traverse(ast, {
    ImportDeclaration(path) {
      imports.push(path.node);
      path.remove();
    }
  });

  // Sort imports based on predefined groups
  const groupedImports = {};
  IMPORT_ORDER_GROUPS.forEach(group => {
    groupedImports[group] = imports.filter(imp => 
      imp.source.value.includes(group)
    ).sort((a, b) => a.source.value.localeCompare(b.source.value));
  });

  // Add remaining imports to a default group
  const remainingImports = imports.filter(imp => 
    !IMPORT_ORDER_GROUPS.some(group => imp.source.value.includes(group))
  ).sort((a, b) => a.source.value.localeCompare(b.source.value));

  // Reconstruct import statements with groups and newlines
  const sortedImportNodes = IMPORT_ORDER_GROUPS
    .map(group => groupedImports[group])
    .filter(group => group.length > 0)
    .concat([remainingImports])
    .reduce((acc, group, index) => {
      if (index > 0) {
        acc.push(t.importDeclaration([], t.stringLiteral(''))); // Newline between groups
      }
      return acc.concat(group);
    }, []);

  // Add imports back to the AST
  const bodyPath = ast.program.body[0];
  sortedImportNodes.forEach(node => {
    ast.program.body.unshift(node);
  });

  return generate(ast).code;
}

function addPropTypes(fileContent) {
  const ast = parser.parse(fileContent, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  let hasPropTypesImport = false;

  // Check for existing PropTypes import
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === 'prop-types') {
        hasPropTypesImport = true;
      }
    }
  });

  // If no PropTypes import, add it
  if (!hasPropTypesImport) {
    const propTypesImport = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('PropTypes'))],
      t.stringLiteral('prop-types')
    );
    ast.program.body.unshift(propTypesImport);
  }

  // Find function components and add PropTypes
  traverse(ast, {
    FunctionDeclaration(path) {
      const functionName = path.node.id.name;
      
      // Skip if already has propTypes
      if (path.parentPath.parentPath.node.type === 'Program' &&
          path.parentPath.parentPath.node.body.some(
            node => node.type === 'ExpressionStatement' && 
                    node.expression.type === 'AssignmentExpression' && 
                    node.expression.left.type === 'MemberExpression' && 
                    node.expression.left.object.name === functionName && 
                    node.expression.left.property.name === 'propTypes'
          )) {
        return;
      }

      // Check if function has children parameter
      const hasChildrenParam = path.node.params.some(
        param => param.type === 'Identifier' && param.name === 'children'
      );

      if (hasChildrenParam) {
        const propTypesAssignment = t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(
              t.identifier(functionName),
              t.identifier('propTypes')
            ),
            t.objectExpression([
              t.objectProperty(
                t.identifier('children'),
                t.memberExpression(
                  t.identifier('PropTypes'),
                  t.identifier('node')
                ),
                false,
                false
              )
            ])
          )
        );

        path.parentPath.parentPath.pushContainer('body', propTypesAssignment);
      }
    }
  });

  return generate(ast).code;
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