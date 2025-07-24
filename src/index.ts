// src/index.ts

import { awsDescribeInstances } from './tools/awsDescribeInstances.js';
import { awsGetCostAndUsage } from './tools/awsGetCostAndUsage.js';
import { awsCloudWatchGetMetrics } from './tools/awsCloudWatchGetMetrics.js';
import { awsCostOptimizationHubListRecommendations } from './tools/awsCostOptimizationHubListRecommendations.js';

// Export chart utilities
export { generateChartFiles, generatePNGChart, generateSVGChart } from './chartUtils.js';

export const tools = [
  awsDescribeInstances,
  awsGetCostAndUsage,
  awsCloudWatchGetMetrics,
  awsCostOptimizationHubListRecommendations,
];

export async function invoke(toolName: string, input: any, config: any): Promise<any> {
  switch (toolName) {
    case 'awsDescribeInstances':
      return await awsDescribeInstances.invoke(input, config);
    case 'awsGetCostAndUsage':
      return await awsGetCostAndUsage.invoke(input, config);
    case 'awsCloudWatchGetMetrics':
      return await awsCloudWatchGetMetrics.invoke(input, config);
    case 'awsCostOptimizationHubListRecommendations':
      return await awsCostOptimizationHubListRecommendations.invoke(input, config);
    default:
      throw new Error(`Tool ${toolName} not found`);
  }
}
