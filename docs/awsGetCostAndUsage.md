# awsGetCostAndUsage

**Description**: Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.

**Input Schema**:
```typescript
{
  startDate: string                // Required: Start date (YYYY-MM-DD)
  endDate: string                  // Required: End date (YYYY-MM-DD)
  granularity: "DAILY" | "MONTHLY" // Required: Data granularity
  groupBy?: string[]               // Optional: Grouping dimensions (max 2)
  filter?: object                  // Optional: Cost Explorer filters
  chartTitle?: string              // Optional: Chart title for visualization
}
```

**Output Schema**:
```typescript
Array<{
  date: string                     // Date of the cost data
  dimensions: {                    // Grouping dimensions and values
    [key: string]: string
  }
  amortizedCost: number            // Amortized cost amount
  usageAmount: number              // Usage quantity
}>
```

**Example Usage**:
```typescript
// Get monthly costs for the last 6 months
{
  startDate: "2024-01-01",
  endDate: "2024-06-30",
  granularity: "MONTHLY",
  groupBy: ["SERVICE", "REGION"],
  chartTitle: "Monthly AWS Costs by Service and Region"
}

// Get daily costs for a specific service
{
  startDate: "2024-12-01",
  endDate: "2024-12-31",
  granularity: "DAILY",
  groupBy: ["SERVICE"],
  filter: {
    Service: "Amazon EC2"
  },
  chartTitle: "Daily EC2 Costs"
}
```
