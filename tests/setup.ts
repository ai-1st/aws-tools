// tests/setup.ts

// Enable verbose logging for tests
process.env.VERBOSE = 'true';

// Vitest doesn't need the --verbose flag in process.argv like Jest did
// The verbose logging is handled by the environment variable above 