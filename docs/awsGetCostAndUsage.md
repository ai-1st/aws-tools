# awsGetCostAndUsage

**Description**: Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.

## Input Schema
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

## Output Schema
```typescript
{
  summary: string                  // Human-readable summary with top 10 dimensions and subdimensions
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

The summary aggregates data by dimensions and provides insights for the top 10 cost contributors:

- **Top-level dimensions**: Shows the 10 highest-cost dimension values
- **Subdimensions**: For each top dimension, shows up to 10 highest-cost subdimension combinations
- **Format**: The summary starts with the data range, followed by dimension lines:
  ```
  Data range: YYYY-MM-DD - YYYY-MM-DD
  DIMENSION_VALUE: Total cost for X days $XXX.XX, average $XXX/day, trending [up/down] at X% per day, max cost was on YYYY-MM-DD at $XX, min cost was on YYYY-MM-DD at $XX
  ```

- **Trending calculation**: Based on linear regression of daily costs
- **Sorting**: All dimensions and subdimensions are sorted by total cost in descending order

## Example Usage
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
