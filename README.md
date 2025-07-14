# AWS Tools Documentation

This project contains AWS API integration tools for use in Vercel AI SDK. This project builds an npm module.
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

- **awsDescribeInstances** - Get detailed information about EC2 instances including configuration, state, and pricing
- **awsGetCostAndUsage** - Retrieve AWS cost and usage data for analysis
- **awsCloudWatchGetMetrics** - Retrieve CloudWatch metrics for any AWS service with flexible dimensions and time periods
- **awsCostOptimizationHubListRecommendations** - Retrieve cost optimization recommendations from AWS Cost Optimization Hub

## Installation & Setup

```bash
npm install aws-tools
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

## Returned Data


## Chart Integration

Most AWS tools support optional `chartTitle` parameters that are used to generate meaningful chart titles when visualizing the tool results in the frontend.

### Chart Title Best Practices

- Use descriptive, specific titles
- Include time periods when relevant
- Mention specific resources or services
- Keep titles concise but informative

### Example Chart Titles

```typescript
// Good examples
"EC2 Instances in us-east-1"
"Monthly AWS Costs by Service (Jan-Jun 2024)"
"Lambda Invocations for my-function (Last 30 days)"
"Top 10 Cost Optimization Recommendations"

// Avoid generic titles
"Data"
"Results"
"Information"
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