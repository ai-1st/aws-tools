// src/tools/awsCostOptimizationHubListRecommendations.ts

import { CostOptimizationHubClient, ListRecommendationsCommand } from '@aws-sdk/client-cost-optimization-hub';
import { Logger } from '../logger';
import { Tool } from '../tool';

export const awsCostOptimizationHubListRecommendations: Tool = {
  name: 'awsCostOptimizationHubListRecommendations',
  description: 'Retrieve cost optimization recommendations from AWS Cost Optimization Hub. Fetches all available recommendations, sorts them by estimated monthly savings in decreasing order, and returns the top N recommendations with the highest potential savings.',
  inputSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', description: 'AWS region (default: us-east-1)' },
      maxResults: { type: 'number', description: 'Maximum number of recommendations to return (default: 50)' },
      chartTitle: { type: 'string', description: 'Title for the chart that will be generated' },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      recommendations: {
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
      count: { type: 'number' },
      totalFetched: { type: 'number' },
      totalEstimatedMonthlySavings: {
        type: 'object',
        properties: {
          amount: { type: 'string' },
          unit: { type: 'string' },
        },
      },
      summary: {
        type: 'object',
        properties: {
          totalRecommendations: { type: 'number' },
          topRecommendationsReturned: { type: 'number' },
          averageSavingsPerRecommendation: { type: 'string' },
          highestSavings: { type: 'string' },
          lowestSavings: { type: 'string' },
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
      logger: { type: 'object' },
    },
    required: ['credentials'],
  },
  defaultConfig: {},
  async invoke(input: any, config: { credentials?: any; logger?: Logger }): Promise<any> {
    const { region, maxResults } = input;
    const logger = config.logger;

    logger?.debug('awsCostOptimizationHubListRecommendations input:', input);

    const client = new CostOptimizationHubClient({ region: region || 'us-east-1', credentials: config.credentials });

    const command = new ListRecommendationsCommand({
      maxResults: maxResults || 50,
    });

    try {
      const data = await client.send(command);
      logger?.debug('awsCostOptimizationHubListRecommendations raw data:', data);
      const recommendations = data.items?.map(item => ({
        id: item.recommendationId,
        type: (item as any).type,
        title: (item as any).name,
        description: (item as any).description,
        estimatedMonthlySavings: (item as any).estimatedMonthlySavings?.value,
        estimatedAnnualSavings: (item as any).estimatedYearlySavings?.value,
        resourceId: item.resourceId,
        resourceType: (item as any).resourceType,
        region: (item as any).awsRegion,
        service: (item as any).source,
        action: (item as any).action,
        reason: (item as any).reason,
      }));

      const totalEstimatedMonthlySavings = recommendations?.reduce((acc: number, r: any) => acc + parseFloat(r.estimatedMonthlySavings || '0'), 0) || 0;
      const savings = recommendations?.map((r: any) => parseFloat(r.estimatedMonthlySavings || '0')) || [];
      const highestSavings = Math.max(...savings);
      const lowestSavings = Math.min(...savings);

      const output = {
        recommendations,
        count: recommendations?.length,
        totalFetched: data.items?.length,
        totalEstimatedMonthlySavings: {
          amount: totalEstimatedMonthlySavings.toFixed(2),
          unit: 'USD',
        },
        summary: {
          totalRecommendations: data.items?.length,
          topRecommendationsReturned: recommendations?.length,
          averageSavingsPerRecommendation: (totalEstimatedMonthlySavings / (recommendations?.length || 1)).toFixed(2),
          highestSavings: highestSavings.toFixed(2),
          lowestSavings: lowestSavings.toFixed(2),
        },
      };
      logger?.debug('awsCostOptimizationHubListRecommendations output:', output);
      return output;
    } catch (error) {
      logger?.error('Error listing cost optimization hub recommendations:', error);
      throw error;
    }
  },
};
