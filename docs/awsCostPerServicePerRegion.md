# awsCostPerServicePerRegion

Retrieve simplified AWS cost data grouped by service and region. This tool provides a streamlined version of cost analysis without complex filtering or chart generation - perfect for basic cost monitoring and service-level cost breakdowns.

## Description

The `awsCostPerServicePerRegion` tool fetches AWS cost data using the Cost Explorer API and groups it by AWS service and region. It provides a simplified interface compared to `awsGetCostAndUsage`, focusing specifically on service costs across different regions without the complexity of custom filters or chart generation.

## Key Features

- **Simplified Interface**: Only requires granularity parameter
- **Service & Region Grouping**: Automatically groups costs by AWS service and region
- **Cost Filtering**: Automatically filters out costs less than $0.01
- **No Complex Configuration**: No region filtering or custom filters needed
- **UTC Date Handling**: Uses UTC timezone for consistent date calculations across regions
- **Pagination Support**: Handles large datasets with automatic pagination

## Input Schema

```typescript
{
  lookBack?: number;        // Optional: Number of days (DAILY) or months (MONTHLY) to look back
  granularity: string;      // Required: 'DAILY' or 'MONTHLY'
}
```

### Parameters

- **`lookBack`** (optional): 
  - For `DAILY`: Number of days to look back (default: 30)
  - For `MONTHLY`: Number of months to look back (default: 6)
- **`granularity`** (required): Data granularity
  - `'DAILY'`: Daily cost data
  - `'MONTHLY'`: Monthly cost data

## Output Schema

```typescript
{
  summary: string;          // Text summary of cost data by service
  datapoints: Array<{       // Array of cost data points
    date: string;
    dimensions: {
      [key: string]: string;  // Service (Region): Cost amount
    };
  }>;
}
```

### Output Format

- **`summary`**: Human-readable summary showing:
  - Date range covered
  - Service costs sorted by total amount
  - Percentage of total costs per service
  - Average daily/monthly costs
- **`datapoints`**: Array of daily/monthly data points with:
  - **`date`**: Date in YYYY-MM-DD format
  - **`dimensions`**: Object where keys are "Service (Region)" and values are cost amounts

## Usage Examples

### Daily Cost Analysis (30 days)
```javascript
const result = await awsCostPerServicePerRegion.invoke(
  { granularity: 'DAILY' },
  { 
    credentials: { accessKeyId: 'xxx', secretAccessKey: 'xxx' },
    region: 'us-east-1'
  }
);
```

### Monthly Cost Analysis (6 months)
```javascript
const result = await awsCostPerServicePerRegion.invoke(
  { granularity: 'MONTHLY' },
  { 
    credentials: { accessKeyId: 'xxx', secretAccessKey: 'xxx' },
    region: 'us-east-1'
  }
);
```

### Custom Lookback Period
```javascript
const result = await awsCostPerServicePerRegion.invoke(
  { 
    granularity: 'DAILY',
    lookBack: 7  // Last 7 days
  },
  { 
    credentials: { accessKeyId: 'xxx', secretAccessKey: 'xxx' },
    region: 'us-east-1'
  }
);
```

## Sample Output

### Summary Example
```
awsCostPerServicePerRegion data range: 2025-07-01 - 2025-07-29
AWS Lambda (us-east-1): Total cost for 30 days $206.58 (32.9%), average $6.89/day
AmazonCloudWatch (us-east-1): Total cost for 30 days $60.95 (9.7%), average $2.03/day
AmazonCloudWatch (global): Total cost for 30 days $47.71 (7.6%), average $1.59/day
Amazon QuickSight (global): Total cost for 30 days $47.30 (7.5%), average $1.58/day
Amazon Simple Storage Service (us-east-1): Total cost for 30 days $22.88 (3.6%), average $0.76/day
```

### Datapoints Example
```javascript
[
  {
    "date": "2025-07-01",
    "dimensions": {
      "AWS Lambda (us-east-1)": "10.8664800908",
      "AmazonCloudWatch (us-east-1)": "3.3181387838",
      "Amazon S3 (us-east-1)": "0.7743624923",
      "Amazon EC2 (us-east-1)": "0.8167097947"
    }
  }
]
```

## Configuration

```typescript
{
  credentials: {
    accessKeyId: string;      // AWS Access Key ID
    secretAccessKey: string;  // AWS Secret Access Key
    sessionToken?: string;    // AWS Session Token (for temporary credentials)
  };
  region: string;             // AWS region for Cost Explorer API calls
  logger?: Logger;            // Optional logger instance
}
```

## Error Handling

The tool includes comprehensive error handling for:
- **Invalid AWS credentials**: Clear error messages for authentication failures
- **API rate limits**: Automatic pagination to handle large datasets
- **Invalid date ranges**: Validation of lookBack parameters
- **Service unavailability**: Graceful handling of AWS service outages

## Differences from awsGetCostAndUsage

| Feature | awsCostPerServicePerRegion | awsGetCostAndUsage |
|---------|---------------------------|-------------------|
| **Complexity** | Simplified | Full-featured |
| **Grouping** | Service & Region only | Configurable dimensions |
| **Filters** | None (automatic exclusions only) | Custom filters supported |
| **Charts** | No chart generation | Vega-Lite charts included |
| **Regional Config** | Uses provided region | Filters by region |
| **Use Case** | Basic service cost monitoring | Advanced cost analysis |

## Best Practices

1. **Choose Appropriate Granularity**:
   - Use `DAILY` for recent cost analysis (last 30 days)
   - Use `MONTHLY` for trend analysis (last 6-12 months)

2. **Lookback Periods**:
   - Daily: 7-90 days for detailed analysis
   - Monthly: 3-12 months for trend analysis

3. **Cost Filtering**:
   - Tool automatically filters costs < $0.01
   - Focus on significant cost drivers in results

4. **Region Selection**:
   - Use consistent region for Cost Explorer API calls
   - Remember that some services show as 'global' regardless of region

## Related Tools

- **`awsGetCostAndUsage`**: Full-featured cost analysis with charts and custom filtering
- **`awsDescribeInstances`**: EC2 instance costs and recommendations
- **`awsCostOptimizationHubListRecommendations`**: Cost optimization recommendations 