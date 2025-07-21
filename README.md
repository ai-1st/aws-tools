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
pricing (OnDemand and 3-year Compute Savings Plan), and attached volumes.
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

### awsDescribeInstances

**Description**: Get detailed information about EC2 instances including their configuration, state, pricing (OnDemand and 3-year Compute Savings Plan), and attached volumes.

**Input Schema**:
```typescript
{
  region: string                    // Required: AWS region (e.g., "us-east-1")
  instanceIds?: string[]           // Optional: Specific instance IDs to describe
  filters?: Array<{                // Optional: AWS EC2 filters
    name: string
    values: string[]
  }>
  maxResults?: number              // Optional: Maximum results (default: 1000)
}
```

**Output Schema**:
```typescript
{
  summary: string                  // Text summary of EC2 instances with cost information
  datapoints: Array<{
    instanceId: string             // EC2 instance ID
    instanceName: string           // Instance name from Name tag
    instanceType: string           // Instance type (e.g., "m5.large")
    platform: string               // Platform details
    tenancy: string                // Tenancy type
    region: string                 // AWS region
    uptimeHours: number            // Instance uptime in hours
    state: string                  // Instance state
    tags: object                   // Instance tags (excluding Name tag)
    cost?: {                       // Optional: Cost information
      onDemandCost: {              // OnDemand pricing
        hourlyCost: number         // Hourly OnDemand cost in USD
        monthlyCost: number        // Monthly OnDemand cost in USD (730 hours)
      }
      savingsPlanCost: {           // 3-year no-upfront Compute Savings Plan pricing
        hourlyCost: number         // Hourly Savings Plan cost in USD
        monthlyCost: number        // Monthly Savings Plan cost in USD (730 hours)
      }
      specifications?: {           // Instance specifications from pricing data
        vCPU: number               // Number of virtual CPUs
        memory: number             // Memory in GiB
        networkPerformance: number // Network performance in Mbps
        dedicatedEbsThroughput: number // Dedicated EBS throughput in Mbps
        gpu?: number               // Number of GPUs (if applicable)
        gpuMemory?: number         // GPU memory in GB (if applicable)
      }
      pricingDetails?: {           // Detailed pricing information
        family: string             // Instance family (e.g., "m5")
        size: string               // Instance size (e.g., "large")
        operationCode: string      // OS/software operation code
        tenancyType: string        // "Shared" or "Dedicated"
        currentGeneration: boolean // Whether it's current generation
        instanceFamily: string     // Instance family category
        physicalProcessor: string  // CPU manufacturer and model
        clockSpeed: number         // Processor clock speed in GHz
        processorFeatures: string  // CPU features (e.g., "AVX, AVX2")
      }
    }
    volumes: Array<{               // Attached EBS volumes
      volumeId: string             // Volume ID
      size: number                 // Volume size in GB
      volumeType: string           // Volume type (e.g., "gp2", "io1")
      iops?: number                // IOPS (for io1 volumes)
      encrypted: boolean           // Whether volume is encrypted
    }>
  }>
}
```

**Features**:
- **Dual Pricing**: Provides both OnDemand and 3-year Compute Savings Plan pricing for cost comparison
- **Lazy Loading**: Pricing data is downloaded from AWS S3 only when needed
- **Caching**: Pricing data is cached in the system temp directory for 24 hours
- **Volume Information**: Includes detailed information about attached EBS volumes
- **Platform Support**: Supports various operating systems and SQL Server editions
- **Tenancy Support**: Handles both Shared and Dedicated tenancy pricing

**Example Usage**:
```typescript
// Get all instances in us-east-1
{
  region: "us-east-1"
}

// Get specific instances with filters
{
  region: "us-west-2",
  instanceIds: ["i-1234567890abcdef0"],
  filters: [
    {
      name: "instance-state-name",
      values: ["running"]
    }
  ]
}
```

**Example Output**:
```json
{
  "summary": "\"web-server-1\" (running): m5.large Linux/UNIX, uptime 5d, ~$0.0960/hr ($70.08/mo) OnDemand, ~$0.0480/hr ($35.04/mo) 3yr Savings Plan, 1×20GB gp2 volume, tags: Environment=Production, Project=WebApp",
  "datapoints": [
    {
      "instanceId": "i-1234567890abcdef0",
      "instanceName": "web-server-1",
      "instanceType": "m5.large",
      "platform": "Linux/UNIX",
      "tenancy": "default",
      "region": "us-east-1",
      "uptimeHours": 120,
      "state": "running",
      "tags": {
        "Environment": "Production",
        "Project": "WebApp"
      },
      "cost": {
        "onDemandCost": {
          "hourlyCost": 0.096,
          "monthlyCost": 70.08
        },
        "savingsPlanCost": {
          "hourlyCost": 0.048,
          "monthlyCost": 35.04
        },
        "specifications": {
          "vCPU": 2,
          "memory": 8,
          "networkPerformance": 5000,
          "dedicatedEbsThroughput": 650
        },
        "pricingDetails": {
          "family": "m5",
          "size": "large",
          "operationCode": "",
          "tenancyType": "Shared",
          "currentGeneration": true,
          "instanceFamily": "General Purpose",
          "physicalProcessor": "Intel Xeon Platinum 8175",
          "clockSpeed": 2.5,
          "processorFeatures": "AVX, AVX2, Intel AVX-512"
        }
      },
      "volumes": [
        {
          "volumeId": "vol-1234567890abcdef0",
          "size": 20,
          "volumeType": "gp2",
          "encrypted": false
        }
      ]
    }
  ]
}
```

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