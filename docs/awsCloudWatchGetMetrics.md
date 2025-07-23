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
}
```

**Output Schema**:
```typescript
{
  summary: string                  // Text summary of the CloudWatch metrics
  datapoints: Array<{              // Metric data points
    Timestamp: string              // ISO timestamp
    Value: number                  // Metric value
    Unit: string                   // Unit of measurement
  }>
  chart: string                    // Vega-Lite specification for generating an SVG chart
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

## Chart Features

The tool generates Vega-Lite chart specifications for time series visualization of CloudWatch metrics.

### Chart Configuration
- **Chart Type**: Line chart showing metric values over time
- **Dimensions**: 800px width × 400px height
- **Color Scheme**: Single color line for clean presentation
- **Tooltip**: Interactive tooltips showing timestamp and metric value

### Time Series Visualization
- **X-axis**: Time-based with automatic formatting
- **Y-axis**: Metric values with appropriate units
- **Line styling**: Smooth curves with point markers
- **Grid lines**: Subtle background grid for better readability

### Chart Usage
The `chart` field contains a Vega-Lite specification that can be used to generate charts:

```javascript
// Using chart generation utilities
import { generateChartFiles } from '@ddegtyarev/aws-tools';

const result = await invoke('awsCloudWatchGetMetrics', input, config);
if (result.chart) {
  await generateChartFiles(result.chart, 'lambda-invocations', './charts');
  // Creates PNG and SVG files
}
```

### Example Chart Specification
```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "CloudWatch Metrics Time Series",
  "width": 800,
  "height": 400,
  "data": { "values": [...] },
  "mark": {
    "type": "line",
    "point": true,
    "tooltip": true
  },
  "encoding": {
    "x": {
      "field": "Timestamp",
      "type": "temporal",
      "title": "Time"
    },
    "y": {
      "field": "Value",
      "type": "quantitative",
      "title": "Metric Value"
    }
  }
}
```
