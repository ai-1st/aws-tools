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

### Chart Generation
- **Stacked Column Charts**: Generates Vega-Lite chart specifications for visualizing cost data over time
- **90% Cost Threshold**: Only shows dimensions that constitute 90% of total cost to reduce chart clutter
- **"Other" Category**: Remaining dimensions (outside 90% threshold) are grouped into an "Other" category
- **Cost-Included Labels**: Legend labels include total cost for each dimension (e.g., "$1,171 AWS Lambda")
- **Comma Formatting**: Large numbers are formatted with commas for better readability (e.g., "$1,171")
- **Optimized Legends**: Multi-column layout (4 columns) with constrained width and symbol limits
- **PNG & SVG Export**: Chart specifications can be rendered to both PNG and SVG files

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
  chart?: object                   // Optional: Vega-Lite chart specification for stacked column chart
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

## Chart Features

The tool generates Vega-Lite chart specifications for stacked column charts when groupBy dimensions are provided.

### Chart Configuration
- **Chart Type**: Stacked column chart showing cost over time
- **Dimensions**: 800px width × 400px height
- **Color Scheme**: Uses 'category20' color scheme for up to 20 distinct colors
- **Tooltip**: Interactive tooltips showing date, dimension, and cost

### Legend Optimization
- **Orientation**: Top-oriented legend for better space utilization
- **Multi-column Layout**: 4 columns to fit more items horizontally
- **Symbol Limit**: Maximum 35 symbols to prevent overcrowding
- **Label Limit**: 200 characters maximum for dimension labels
- **Title Limit**: 200 characters for legend title

### Smart Dimension Selection
The chart implements a 90% cost threshold algorithm:
1. Calculate total cost across all dimensions and time periods
2. Sort dimensions by total cost (descending)
3. Include dimensions until 90% of total cost is reached
4. Group remaining dimensions into "Other" category

### Data Processing
```typescript
// Example chart data transformation
{
  date: "2025-04-01",
  dimension: "$1,171 AWS Lambda",        // Cost-included label
  originalDimension: "AWS Lambda",       // Original dimension for tooltips
  cost: 15.23                           // Daily cost value
}
```

### Example Chart Specification
```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "AWS Cost and Usage Stacked Column Chart (DAILY)",
  "width": 800,
  "height": 400,
  "data": { "values": [...] },
  "mark": { "type": "bar", "tooltip": true },
  "encoding": {
    "x": {
      "field": "formattedDate",
      "type": "nominal",
      "title": "Date",
      "axis": { "labelAngle": -45, "labelLimit": 100 }
    },
    "y": {
      "field": "cost",
      "type": "quantitative",
      "title": "Cost ($)",
      "stack": "zero",
      "axis": { "format": "$.2f" }
    },
    "color": {
      "field": "dimension",
      "type": "nominal",
      "title": "Dimension",
      "scale": { "scheme": "category20" },
      "legend": {
        "orient": "top",
        "titleLimit": 200,
        "symbolLimit": 35,
        "labelLimit": 200,
        "columns": 4
      }
    },
    "tooltip": [
      { "field": "formattedDate", "title": "Date" },
      { "field": "originalDimension", "title": "Dimension" },
      { "field": "cost", "title": "Cost", "format": "$.2f" }
    ]
  }
}
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
9. **Visual charts**: Automatic generation of stacked column charts with optimized legends
10. **Smart chart dimensions**: 90% cost threshold reduces chart clutter while maintaining accuracy
11. **Professional formatting**: Cost-included labels with comma formatting for better readability

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
