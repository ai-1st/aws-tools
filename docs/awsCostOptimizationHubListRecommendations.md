# awsCostOptimizationHubListRecommendations

**Description**: Retrieve cost optimization recommendations from AWS Cost Optimization Hub. Fetches all available recommendations, sorts them by estimated monthly savings in decreasing order, and returns the top N recommendations with the highest potential savings.

**Input Schema**:
```typescript
{
  region?: string                  // Optional: AWS region (default: us-east-1)
  maxResults?: number              // Optional: Max recommendations (default: 50)

}
```

**Output Schema**:
```typescript
{
  recommendations: Array<{         // List of recommendations
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
  count: number                    // Number of recommendations returned
  totalFetched: number             // Total recommendations available
  totalEstimatedMonthlySavings: {  // Total potential monthly savings
    amount: string
    unit: string
  }
  summary: {                       // Summary statistics
    totalRecommendations: number
    topRecommendationsReturned: number
    averageSavingsPerRecommendation: string
    highestSavings: string
    lowestSavings: string
  }
}
```

**Example Usage**:
```typescript
// Get top 20 cost optimization recommendations
{
  region: "us-east-1",
  maxResults: 20
}

// Get all recommendations in a specific region
{
  region: "us-west-2",
  maxResults: 100
}
```
