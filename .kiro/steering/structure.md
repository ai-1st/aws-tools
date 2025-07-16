# Project Structure

## Directory Organization

```
├── src/                    # Source code
│   ├── index.ts           # Main entry point - exports tools array and invoke function
│   ├── logger.ts          # Logger interface definition
│   ├── tool.ts            # Tool interface definition
│   └── tools/             # Individual AWS tool implementations
│       ├── awsDescribeInstances.ts
│       ├── awsGetCostAndUsage.ts
│       ├── awsCloudWatchGetMetrics.ts
│       └── awsCostOptimizationHubListRecommendations.ts
├── tests/                 # Test files
│   ├── setup.ts          # Jest setup configuration
│   ├── common.ts         # Shared test utilities and TestLogger
│   └── [toolName].test.ts # Individual tool tests
├── docs/                 # Tool-specific documentation
│   └── [toolName].md     # Detailed docs for each tool
├── dist/                 # Compiled JavaScript output
└── .aws-creds.json      # Test credentials (gitignored)
```

## Code Organization Patterns

### Tool Implementation Structure
Each tool in `src/tools/` follows this pattern:
1. AWS SDK client imports
2. Helper functions (e.g., summary generators)
3. Tool object export with required properties:
   - `name`: Tool identifier
   - `description`: Human-readable description
   - `inputSchema`: JSON schema for input validation
   - `outputSchema`: JSON schema for output structure
   - `configSchema`: Configuration requirements
   - `defaultConfig`: Default configuration values
   - `invoke`: Async function implementation

### Test Structure
Each test file follows this pattern:
1. Import `invoke` function and `loadTestConfig`
2. Setup config in `beforeAll`
3. Test cases using real AWS API calls
4. Validate both `summary` and `datapoints` properties

### Main Entry Point
`src/index.ts` serves as the module's public API:
- Exports `tools` array containing all tool metadata
- Exports `invoke` function for tool execution
- Uses switch statement to route tool calls

## Naming Conventions

- Tool files: `aws[ServiceName][Action].ts` (camelCase)
- Tool names: Match filename without extension
- Test files: Mirror tool filename with `.test.ts` suffix
- Documentation: Mirror tool filename with `.md` suffix

## Interface Contracts

All tools must implement the `Tool` interface and return objects with:
- `summary`: String for LLM context
- `datapoints`: Array of structured data for analysis