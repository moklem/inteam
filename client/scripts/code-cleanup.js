const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runImportFixer() {
  console.log('Running import fixer...');
  execSync('node scripts/fix-imports.js', { stdio: 'inherit' });
}

function runEslintFix() {
  console.log('Running ESLint fix...');
  execSync('npm run lint:fix', { stdio: 'inherit' });
}

function main() {
  try {
    // Change to the client directory
    process.chdir(path.join(__dirname, '..'));

    // Run import fixer
    runImportFixer();

    // Run ESLint fix
    runEslintFix();

    console.log('Code cleanup completed successfully!');
  } catch (error) {
    console.error('Error during code cleanup:', error);
    process.exit(1);
  }
}

main();