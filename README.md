# AWS Tools Documentation

This project contains AWS API integration tools for use in Vercel AI SDK. This project builds an npm module.
Author is Dmitry Degtyarev.

AWS API may produce thousands of datapoints which could easily overflow LLM context if used as-is.

The important design decision is that tools return their responses in two formats:
- a text summary intended to be added into the LLM context
- a JSON with exact data points to be used for charting

The text summary is produced with the help of heuristics tailored for each tool.

## Table of Contents

- [Tool Overview](#tool-overview)
- [Installation & Setup](#installation--setup)
- [Implementation](#implementation)
- [Configuration](#configuration)
- [AWS Tools Detailed Documentation](#aws-tools-detailed-documentation)
- [Error Handling](#error-handling)
- [Chart Integration](#chart-integration)

## Tool Overview

The following AWS tools are available in this module:

- **awsDescribeInstances** - Get detailed information about running EC2 instances including configuration, state, 
and pricing.
- **awsGetCostAndUsage** - Retrieve AWS cost and usage data for analysis.
- **awsCloudWatchGetMetrics** - Retrieve CloudWatch metrics for any AWS service with flexible dimensions and time periods
- **awsCostOptimizationHubListRecommendations** - Retrieve cost optimization recommendations from AWS Cost Optimization Hub

## Installation & Setup

```bash
npm install aws-tools
```

### Development Commands

```bash
# Run all tests
npm test

# Run all tests with verbose output
npm run test:verbose

# Run a specific test file
npm run test:file tests/awsGetCostAndUsage.test.ts
```

### Prerequisites

- Node.js 20+ 
- AWS credentials configured (via AWS CLI, environment variables, or IAM roles)
- Appropriate AWS permissions for the services you want to access

### Required AWS Permissions

Each tool requires specific AWS permissions:

- **awsDescribeInstances**: `ec2:DescribeInstances`
- **awsGetCostAndUsage**: `ce:GetCostAndUsage`
- **awsCloudWatchGetMetrics**: `cloudwatch:GetMetricData`
- **awsCostOptimizationHubListRecommendations**: `ce:GetRecommendations`

## Implementation

The module exports an array of tool meta descriptors and an invoke function.

### Tool Descriptor Structure

```typescript
{
  name: string,                    // Tool identifier
  description: string,             // Human-readable description
  inputSchema: object,             // JSON schema of input parameters
  outputSchema: object,            // JSON schema of output result
  configSchema?: object,           // JSON schema of configuration parameters
  defaultConfig?: object,          // Default configuration values
}
```

### Usage

```typescript
import { tools, invoke } from 'aws-tools';

// Get tool metadata
const toolMetadata = tools.find(tool => tool.name === 'awsDescribeInstances');

// Invoke a tool
const result = await invoke('awsDescribeInstances', {
  region: 'us-east-1'
}, {
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  }
});

// Result format
console.log(result.summary);     // Human-readable summary
console.log(result.datapoints);  // Raw data for charting
```

## Configuration

All tools accept a configuration object with the following structure:

```typescript
{
  credentials: {
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken?: string
  },
  logger?: {
    log: (message: string) => void,
    error: (message: string) => void,
    warn: (message: string) => void
  }
}
```

### Credentials

AWS credentials can be provided in several ways:

1. **Direct configuration** (as shown above)
2. **Environment variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. **AWS credentials file**: `~/.aws/credentials`
4. **IAM roles**: When running on EC2 or ECS

## AWS Tools Detailed Documentation

- [awsDescribeInstances](./docs/awsDescribeInstances.md)
- [awsGetCostAndUsage](./docs/awsGetCostAndUsage.md)
- [awsCloudWatchGetMetrics](./docs/awsCloudWatchGetMetrics.md)
- [awsCostOptimizationHubListRecommendations](./docs/awsCostOptimizationHubListRecommendations.md)

### awsGetCostAndUsage

**Description**: Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.

**Input Schema**:
```typescript
{
  lookBack?: number                // Optional: Number of days (DAILY) or months (MONTHLY) to look back. Default: 30 for DAILY, 6 for MONTHLY
  granularity: "DAILY" | "MONTHLY" // Required: Data granularity
  groupBy?: string[]               // Optional: Grouping dimensions (max 2)
  filter?: object                  // Optional: Cost Explorer filters
}
```

- If `granularity` is `DAILY`, the tool returns data for the last `lookBack` days (ending yesterday).
- If `granularity` is `MONTHLY`, the tool returns data for the last `lookBack` full months (ending with the previous month).

**Output Schema**:
```typescript
{
  summary: string                  // Human-readable summary
  datapoints: Array<{
    date: string                   // Date of the cost data
    dimensions: {                  // Grouping dimensions and values
      [key: string]: string
    }
    amortizedCost: number          // Amortized cost amount
    usageAmount: number            // Usage quantity
  }>
}
```

**Example Usage**:
```typescript
// Get daily costs for the last 10 days
{
  lookBack: 10,
  granularity: "DAILY"
}

// Get monthly costs for the last 6 months, grouped by service and region
{
  lookBack: 6,
  granularity: "MONTHLY",
  groupBy: ["SERVICE", "REGION"]
}
```

## Error Handling

All tools include comprehensive error handling:

- **AWS API errors** are captured and returned with descriptive messages
- **Validation errors** for input parameters are clearly reported
- **Network errors** and timeouts are handled gracefully
- **Authentication errors** provide guidance on credential setup

### Common Error Scenarios

1. **Invalid credentials**: Check AWS credentials configuration
2. **Insufficient permissions**: Verify IAM policies for required actions
3. **Invalid region**: Ensure region is valid and accessible
4. **Rate limiting**: AWS API throttling is handled with retries
5. **Resource not found**: Clear error messages for missing resources

## Data Format

All AWS tools return data in a consistent format with two main properties:

- **summary**: A human-readable text summary of the data, optimized for LLM context
- **datapoints**: The raw data points in JSON format for charting and analysis

This design prevents LLM context overflow while providing both human-readable insights and structured data for visualization.

## Contributing

To add new AWS tools:

1. Create a new tool file in `src/tools/`
2. Follow the existing tool structure and patterns
3. Add comprehensive input/output schemas
4. Include proper error handling
5. Update the main `index.ts` file
6. Add documentation following this format
7. Include tests in the `tests/` directory

## License

MIT License - see [LICENSE](LICENSE) file for details. 