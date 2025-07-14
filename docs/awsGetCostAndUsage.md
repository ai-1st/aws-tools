# awsGetCostAndUsage

**Description**: Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.

## Recent Updates

### Enhanced Granularity Support
- **Improved granularity handling**: The summary now properly supports both `DAILY` and `MONTHLY` granularities with appropriate labels
- **Dynamic period labels**: Summary text adapts based on granularity:
  - Daily: "days", "/day", "per day"
  - Monthly: "months", "/month", "per month"
- **Smart date formatting**: Dates are formatted contextually based on granularity:
  - Daily: ISO format (2025-04-01)
  - Monthly: Human-readable format (April 2025)
- **Header dimension display**: The data range header includes grouping dimensions when specified

### Cost Coverage Optimization
- **95% cost coverage**: Instead of showing top 10 dimensions, the summary now includes dimensions that represent 95% of the total cost
- **Cumulative filtering**: Dimensions are sorted by cost and included until 95% of total cost is covered
- **Adaptive dimension count**: The number of dimensions shown varies based on cost distribution

### Enhanced Filtering
- **Automatic record type filtering**: Excludes credits, taxes, and enterprise discount program discounts by default
- **Combined filtering**: User-provided filters are combined with the automatic record type filter
- **Improved accuracy**: Focuses on actual usage costs rather than accounting adjustments

## Input Schema
```typescript
{
  lookBack?: number                // Optional: Number of days (DAILY) or months (MONTHLY) to look back. Default: 30 for DAILY, 6 for MONTHLY
  granularity: "DAILY" | "MONTHLY" // Required: Data granularity
  groupBy?: string[]               // Optional: Grouping dimensions (max 2)
  filter?: object                  // Optional: Cost Explorer filters (combined with automatic record type filter)
}
```
- If `granularity` is `DAILY`, the tool returns data for the last `lookBack` days (ending yesterday).
- If `granularity` is `MONTHLY`, the tool returns data for the last `lookBack` full months (ending with the previous month).

## Output Schema
```typescript
{
  summary: string                  // Human-readable summary with dimensions representing 95% of total cost
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

## Summary Format

The summary aggregates data by dimensions and provides insights for dimensions representing 95% of total cost:

- **Top-level dimensions**: Shows dimensions that cumulatively represent 95% of total cost
- **Subdimensions**: For each top dimension, shows up to 10 highest-cost subdimension combinations
- **Format**: The summary starts with the data range header, followed by dimension lines:
  ```
  Data range: YYYY-MM-DD - YYYY-MM-DD, Dimensions: SERVICE, USAGE_TYPE
  DIMENSION_VALUE: Total cost for X [days/months] $XXX.XX, average $XXX/[day/month], trending [up/down] at X% [per day/per month], max cost was on [formatted_date] at $XX, min cost was on [formatted_date] at $XX
  ```

- **Trending calculation**: Based on linear regression of period costs
- **Sorting**: All dimensions and subdimensions are sorted by total cost in descending order
- **Period labels**: Automatically adapt based on granularity (daily vs monthly)
- **Date formatting**: All dates in the summary (header, max/min dates) are formatted based on granularity
- **Dimension header**: When grouping is specified, dimensions are shown in the header line

## Automatic Filtering

The tool automatically applies the following filter to exclude non-usage costs:
```typescript
{
  Not: {
    Dimensions: {
      Key: 'RECORD_TYPE',
      Values: ['Credit', 'Tax', 'Enterprise Discount Program Discount']
    }
  }
}
```

If a user provides additional filters, they are combined using an `And` operation:
```typescript
{
  And: [
    userFilter,
    automaticRecordTypeFilter
  ]
}
```

## Example Usage
```typescript
// Get daily costs for the last 10 days
{
  lookBack: 10,
  granularity: "DAILY"
}
// Output header: "Data range: 2025-04-01 - 2025-04-10"

// Get monthly costs for the last 6 months, grouped by service and region
{
  lookBack: 6,
  granularity: "MONTHLY",
  groupBy: ["SERVICE", "REGION"]
}
// Output header: "Data range: January 2025 - June 2025, Dimensions: SERVICE, REGION"

// Get daily costs with custom filter for specific services
{
  lookBack: 30,
  granularity: "DAILY",
  groupBy: ["SERVICE"],
  filter: {
    Dimensions: {
      Key: "SERVICE",
      Values: ["Amazon EC2", "Amazon S3"]
    }
  }
}
// Output header: "Data range: 2025-04-01 - 2025-04-30, Dimensions: SERVICE"
```

## Key Improvements

1. **Better cost visibility**: 95% coverage ensures you see the most significant cost drivers
2. **Accurate period labeling**: Summary text correctly reflects daily vs monthly data
3. **Smart date formatting**: Contextual date display (ISO for daily, month names for monthly)
4. **Cleaner cost data**: Automatic filtering removes accounting noise
5. **Flexible filtering**: User filters work seamlessly with automatic filtering
6. **Adaptive summaries**: Dimension count adjusts based on actual cost distribution
7. **Enhanced headers**: Dimension grouping information displayed in summary headers
8. **Consistent formatting**: All dates throughout the summary follow the same granularity-based format

## Implementation Details

### Date Range Calculation
- **Daily granularity**: End date is yesterday, start date is `lookBack` days before end date
- **Monthly granularity**: End date is first day of current month, start date is first day of `lookBack` months before
- **UTC handling**: Monthly calculations use UTC to avoid timezone issues

### Cost Aggregation Logic
- **Cumulative filtering**: Dimensions are included until 95% of total cost is covered
- **Linear regression**: Trend calculation uses simple linear regression on period costs
- **Stability threshold**: Trends with less than 0.1% change are marked as "stable"

### Filter Combination
- **Automatic filter**: Always excludes credits, taxes, and enterprise discount program discounts
- **User filter integration**: User filters are combined with automatic filter using `And` operation
- **Type safety**: Uses AWS SDK `Expression` type for proper TypeScript support
