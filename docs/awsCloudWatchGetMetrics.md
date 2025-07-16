# awsCloudWatchGetMetrics

**Description**: Retrieve CloudWatch metrics for any AWS service with flexible dimensions and time periods. Essential for analyzing performance trends, usage patterns, and operational metrics.

**Input Schema**:
```typescript
{
  namespace: string                // Required: AWS namespace (e.g., "AWS/Lambda")
  metricName: string               // Required: Metric name (e.g., "Invocations")
  dimensions?: Array<{             // Optional: Metric dimensions
    name: string                   // Dimension name (e.g., "FunctionName")
    value: string                  // Dimension value (e.g., function name)
  }>
  startTime: string                // Required: Start time (ISO format)
  endTime: string                  // Required: End time (ISO format)
  period: number                   // Required: Period in seconds
  statistic: "Sum" | "Average" | "Maximum" | "Minimum" | "SampleCount"  // Required
  region?: string                  // Optional: AWS region (default: us-east-1)

}
```

**Output Schema**:
```typescript
{
  datapoints: Array<{              // Metric data points
    Timestamp: string              // ISO timestamp
    Value: number                  // Metric value
    Unit: string                   // Unit of measurement
  }>
  label: string                    // Metric label
  namespace: string                // AWS namespace
  metricName: string               // Metric name
}
```

**Common Namespaces and Metrics**:

| Service | Namespace | Common Metrics |
|---------|-----------|----------------|
| Lambda | `AWS/Lambda` | `Invocations`, `Duration`, `Errors`, `Throttles` |
| EC2 | `AWS/EC2` | `CPUUtilization`, `NetworkIn`, `NetworkOut` |
| RDS | `AWS/RDS` | `CPUUtilization`, `DatabaseConnections`, `FreeableMemory` |
| S3 | `AWS/S3` | `NumberOfObjects`, `BucketSizeBytes` |

**Example Usage**:
```typescript
// Get Lambda invocations for a specific function
{
  namespace: "AWS/Lambda",
  metricName: "Invocations",
  dimensions: [{ 
    name: "FunctionName", 
    value: "my-function" 
  }],
  startTime: "2024-01-01T00:00:00Z",
  endTime: "2024-01-31T23:59:59Z",
  period: 3600,  // 1 hour
  statistic: "Sum"
}

// Get EC2 CPU utilization
{
  namespace: "AWS/EC2",
  metricName: "CPUUtilization",
  dimensions: [{ 
    name: "InstanceId", 
    value: "i-1234567890abcdef0" 
  }],
  startTime: "2024-12-01T00:00:00Z",
  endTime: "2024-12-01T23:59:59Z",
  period: 300,  // 5 minutes
  statistic: "Average"
}
```
