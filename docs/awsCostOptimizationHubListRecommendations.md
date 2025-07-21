# awsCostOptimizationHubListRecommendations

**Description**: Retrieve cost optimization recommendations from AWS Cost Optimization Hub. Fetches all available recommendations, sorts them by estimated monthly savings in decreasing order, and returns the top N recommendations with the highest potential savings.

**Input Schema**:
```typescript
{
  maxResults?: number              // Optional: Max recommendations (default: 50)
}
```

**Output Schema**:
```typescript
{
  summary: string                  // Text summary with top 30 recommendations (one per line)
  datapoints: Array<{              // List of recommendations
    id: string                     // Recommendation ID
    type: string                   // Recommendation type
    title: string                  // Recommendation title
    description: string            // Detailed description
    estimatedMonthlySavings: string // Monthly savings estimate
    estimatedAnnualSavings: string  // Annual savings estimate
    resourceId?: string            // Affected resource ID
    resourceType?: string          // Resource type
    region?: string                // AWS region
    service?: string               // AWS service
    action?: string                // Recommended action
    reason?: string                // Reason for recommendation
  }>
}
```

**Example Usage**:
```typescript
// Get top 20 cost optimization recommendations
{
  maxResults: 20
}

// Get all recommendations (region specified in config)
{
  maxResults: 100
}
```
