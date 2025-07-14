// tests/setup.ts

// Enable verbose logging for tests
process.env.VERBOSE = 'true';

// Add --verbose flag to process.argv if it's not already there
if (!process.argv.includes('--verbose')) {
  process.argv.push('--verbose');
} 