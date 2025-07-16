# Product Overview

AWS Tools is an npm module that provides AWS API integration tools specifically designed for use with Vercel AI SDK. The module addresses the challenge of AWS APIs returning thousands of datapoints that could overflow LLM context.

## Key Design Principles

- **Dual Output Format**: All tools return both a human-readable text summary (optimized for LLM context) and raw JSON datapoints (for charting and analysis)
- **Context-Aware Summaries**: Text summaries use tailored heuristics for each tool to provide meaningful insights without overwhelming LLM context
- **Comprehensive Error Handling**: Robust error handling for AWS API errors, validation issues, network problems, and authentication failures

## Available Tools

- **awsDescribeInstances**: EC2 instance information including configuration, state, and pricing
- **awsGetCostAndUsage**: AWS cost and usage data analysis with flexible time periods and grouping
- **awsCloudWatchGetMetrics**: CloudWatch metrics retrieval with flexible dimensions and time periods
- **awsCostOptimizationHubListRecommendations**: Cost optimization recommendations from AWS Cost Optimization Hub

## Target Use Case

Designed for AI applications that need to analyze AWS infrastructure and costs while maintaining efficient LLM context usage.