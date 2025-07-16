# Technology Stack

## Core Technologies

- **TypeScript**: Primary language with strict type checking enabled
- **Node.js**: Runtime environment (requires Node.js 20+)
- **AWS SDK v3**: Latest AWS SDK with modular client architecture
- **CommonJS**: Module system (not ES modules)

## Build System & Tools

- **TypeScript Compiler**: Direct `tsc` compilation to `dist/` directory
- **Jest**: Testing framework with ts-jest preset
- **Target**: ES6 with CommonJS modules
- **Output**: Compiled JavaScript in `dist/` directory

## Key Dependencies

- `@aws-sdk/client-*`: Modular AWS service clients (CloudWatch, EC2, Cost Explorer, Cost Optimization Hub)
- `tslib`: TypeScript runtime library

## Common Commands

```bash
# Build the project
npm run build

# Run all tests
npm test

# Run tests with verbose output
npm run test:verbose

# Run specific test file
npm run test:file tests/[filename].test.ts
```

## AWS Configuration

- Supports multiple credential methods: direct config, environment variables, AWS credentials file, IAM roles
- Requires appropriate AWS permissions for each service
- Test configuration uses `.aws-creds.json` file (not committed to git)

## Code Quality Standards

- Strict TypeScript configuration with `forceConsistentCasingInFileNames`
- Comprehensive error handling required for all AWS operations
- Consistent logging interface using custom Logger interface
- All tools must follow the Tool interface contract