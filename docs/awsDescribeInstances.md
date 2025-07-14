# awsDescribeInstances

**Description**: Get detailed information about EC2 instances including their configuration, state, and pricing.

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
  chartTitle?: string              // Optional: Chart title for visualization
}
```

**Output Schema**:
```typescript
Array<{
  instanceId: string               // EC2 instance ID
  instanceName: string             // Instance name from Name tag
  instanceType: string             // Instance type (e.g., "m5.large")
  platform: string                 // Platform details
  tenancy: string                  // Tenancy type
  region: string                   // AWS region
  uptimeHours: number              // Instance uptime in hours
}>
```

**Example Usage**:
```typescript
// Get all instances in us-east-1
{
  region: "us-east-1",
  chartTitle: "EC2 Instances in us-east-1"
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
  ],
  chartTitle: "Running EC2 Instances"
}
```
