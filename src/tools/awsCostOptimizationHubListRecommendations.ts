// src/tools/awsCostOptimizationHubListRecommendations.ts

import { CostOptimizationHubClient, ListRecommendationsCommand } from '@aws-sdk/client-cost-optimization-hub';
import { Logger } from '../logger.js';
import { Tool } from '../tool.js';

function generateRecommendationsSummary(recommendations: any[], totalFetched: number, totalSavings: any): string {
  if (!recommendations || recommendations.length === 0) {
    return 'No cost optimization recommendations found.';
  }

  const totalRecommendations = recommendations.length;
  const totalMonthlySavings = parseFloat(totalSavings.amount);
  
  // Get top 30 recommendations
  const topRecommendations = recommendations.slice(0, 30);
  
  // Create summary with one recommendation per line
  const recommendationsList = topRecommendations
    .map(rec => {
      const savings = parseFloat(rec.estimatedMonthlySavings || '0');
      return `${rec.type}: ${rec.title} ($${savings.toFixed(2)}/month savings)`;
    })
    .join('\n');
  
  return `Found ${totalRecommendations} cost optimization recommendations out of ${totalFetched} total. ` +
         `Total potential monthly savings: $${totalMonthlySavings.toFixed(2)}.\n\n` +
         `Top recommendations:\n${recommendationsList}`;
}

export const awsCostOptimizationHubListRecommendations: Tool = {
  name: 'awsCostOptimizationHubListRecommendations',
  description: 'Retrieve cost optimization recommendations from AWS Cost Optimization Hub. Fetches all available recommendations, sorts them by estimated monthly savings in decreasing order, and returns the top N recommendations with the highest potential savings.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Maximum number of recommendations to return (default: 50)' },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Text summary of the cost optimization recommendations' },
      datapoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            estimatedMonthlySavings: { type: 'string' },
            estimatedAnnualSavings: { type: 'string' },
            resourceId: { type: 'string' },
            resourceType: { type: 'string' },
            region: { type: 'string' },
            service: { type: 'string' },
            action: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      credentials: {
        type: 'object',
        properties: {
          accessKeyId: { type: 'string' },
          secretAccessKey: { type: 'string' },
          sessionToken: { type: 'string' },
        },
        required: ['accessKeyId', 'secretAccessKey'],
      },
      region: { type: 'string', description: 'AWS region' },
      logger: { type: 'object' },
    },
    required: ['credentials', 'region'],
  },
  defaultConfig: {},
  async invoke(input: any, config: { credentials?: any; region: string; logger?: Logger }): Promise<any> {
    const { maxResults } = input;
    const { region, logger } = config;

    logger?.debug('awsCostOptimizationHubListRecommendations input:', input);

    const client = new CostOptimizationHubClient({ region, credentials: config.credentials });

    const command = new ListRecommendationsCommand({
      maxResults: maxResults || 50,
    });

    try {
      const data = await client.send(command);
      logger?.debug('awsCostOptimizationHubListRecommendations raw data:', data);
      const recommendations = data.items?.map(item => ({
        id: item.recommendationId,
        type: item.actionType,
        title: item.recommendedResourceSummary || item.actionType,
        description: item.recommendedResourceSummary,
        estimatedMonthlySavings: item.estimatedMonthlySavings?.toString(),
        estimatedAnnualSavings: ((item.estimatedMonthlySavings || 0) * 12)?.toString(),
        resourceId: item.resourceId,
        resourceType: item.currentResourceType,
        region: item.region,
        service: item.source,
        action: item.actionType,
        reason: `Estimated ${item.estimatedSavingsPercentage}% savings`,
      })) || [];

      const totalEstimatedMonthlySavings = recommendations?.reduce((acc: number, r: any) => acc + parseFloat(r.estimatedMonthlySavings || '0'), 0) || 0;
      const savings = recommendations?.map((r: any) => parseFloat(r.estimatedMonthlySavings || '0')) || [];
      const highestSavings = Math.max(...savings);
      const lowestSavings = Math.min(...savings);

      const totalSavings = {
        amount: totalEstimatedMonthlySavings.toFixed(2),
        unit: 'USD',
      };

      const summary = generateRecommendationsSummary(recommendations, data.items?.length || 0, totalSavings);

      const output = {
        summary,
        datapoints: recommendations,
      };
      logger?.debug('awsCostOptimizationHubListRecommendations summary:\n', output.summary);
      logger?.debug('awsCostOptimizationHubListRecommendations datapoints:\n', output.datapoints);
      return output;
    } catch (error) {
      logger?.error('Error listing cost optimization hub recommendations:', error);
      throw error;
    }
  },
};
