# AWS Tools Documentation

This project contains AWS API integration tools for use in Vercel AI SDK. 

AWS API may produce thousands of datapoints which could easily overflow LLM context if used as-is.

The important design decision is that tools return their responses in two formats:
- a text summary intended to be added into the LLM context
- a JSON with exact data points to be used for charting
- a chart specification using vega-lite format

The text summary is produced with the help of heuristics tailored for each tool.

This project builds an npm module.
Author is Dmitry Degtyarev.

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
pricing (OnDemand and 3-year Compute Savings Plan), and attached volumes.
- **awsGetCostAndUsage** - Retrieve AWS cost and usage data for analysis.
- **awsCloudWatchGetMetrics** - Retrieve CloudWatch metrics for any AWS service with flexible dimensions and time periods
- **awsCostOptimizationHubListRecommendations** - Retrieve cost optimization recommendations from AWS Cost Optimization Hub

## Installation & Setup

```bash
npm install @ddegtyarev/aws-tools
```

### Development Commands

```bash
# Run all tests
npm test

# Run all tests
npm run test

# Run a specific test file
npm run test tests/awsGetCostAndUsage.test.ts
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
const result = await invoke('awsDescribeInstances', {}, {
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  },
  region: 'us-east-1'
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
  region: string,                    // AWS region (e.g., "us-east-1")
  logger?: {
    log: (message: string) => void,
    error: (message: string) => void,
    warn: (message: string) => void
  }
}
```

## AWS Tools Detailed Documentation

- [awsDescribeInstances](./docs/awsDescribeInstances.md) - Get detailed EC2 instance information with dual pricing (OnDemand vs Savings Plans)
- [awsGetCostAndUsage](./docs/awsGetCostAndUsage.md) - Retrieve cost and usage data with intelligent summarization and chart generation
- [awsCloudWatchGetMetrics](./docs/awsCloudWatchGetMetrics.md) - Retrieve CloudWatch metrics with flexible dimensions and time periods
- [awsCostOptimizationHubListRecommendations](./docs/awsCostOptimizationHubListRecommendations.md) - Get cost optimization recommendations

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

All AWS tools return data in a consistent format with three main properties:

- **summary**: A human-readable text summary of the data, optimized for LLM context
- **datapoints**: The raw data points in JSON format for charting and analysis
- **chart**: A Vega-Lite chart specification

This design prevents LLM context overflow while providing both human-readable insights and structured data for visualization.

## Chart Integration

Some tools return Vega-Lite chart specifications that can be used to generate PNG and SVG files. See individual tool documentation for specific chart features and capabilities.

### Chart Generation Utilities

The module provides utility functions for generating chart files:

```typescript
import { generateChartFiles, generatePNGChart, generateSVGChart } from '@ddegtyarev/aws-tools';

// Generate both PNG and SVG files
await generateChartFiles(chartSpec, 'my-chart', './output');

// Generate only PNG file
await generatePNGChart(chartSpec, 'my-chart', './output');

// Generate only SVG file
await generateSVGChart(chartSpec, 'my-chart', './output');
```

### Example Usage

```typescript
import { invoke, generateChartFiles } from '@ddegtyarev/aws-tools';

// Get tool result with chart
const result = await invoke('toolName', params, config);

// Generate chart files if chart is available
if (result.chart) {
  await generateChartFiles(result.chart, 'chart-name', './charts');
  // Creates:
  // - ./charts/png/chart-name.png
  // - ./charts/svg/chart-name.svg
}
```

### Dependencies

Chart generation requires additional dependencies that are not included by default to keep the package lightweight:

```bash
npm install vega vega-lite canvas
```

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