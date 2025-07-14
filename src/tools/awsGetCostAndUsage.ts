// src/tools/awsGetCostAndUsage.ts

import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { Logger } from '../logger';
import { Tool } from '../tool';

export const awsGetCostAndUsage: Tool = {
  name: 'awsGetCostAndUsage',
  description: 'Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
      endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'], description: 'Data granularity' },
      groupBy: { type: 'array', items: { type: 'string', enum: ['AZ', 'INSTANCE_TYPE', 'LINKED_ACCOUNT', 'OPERATION', 'PURCHASE_TYPE', 'SERVICE', 'USAGE_TYPE', 'PLATFORM', 'TENANCY', 'RECORD_TYPE', 'LEGAL_ENTITY_NAME', 'INVOICING_ENTITY', 'DEPLOYMENT_OPTION', 'DATABASE_ENGINE', 'CACHE_ENGINE', 'INSTANCE_TYPE_FAMILY', 'REGION', 'BILLING_ENTITY', 'RESERVATION_ID', 'SAVINGS_PLANS_TYPE', 'SAVINGS_PLAN_ARN', 'OPERATING_SYSTEM'] }, description: 'Grouping dimensions up to 2.' },
      filter: { type: 'object', description: 'Filters to apply' },
      chartTitle: { type: 'string', description: 'Title for the chart that will be generated' },
    },
    required: ['startDate', 'endDate', 'granularity'],
  },
  outputSchema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        dimensions: { type: 'object' },
        amortizedCost: { type: 'number' },
        usageAmount: { type: 'number' },
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
    const { startDate, endDate, granularity, groupBy, filter } = input;
    const logger = config.logger;

    logger?.debug('awsGetCostAndUsage input:', input);

    const costExplorerClient = new CostExplorerClient({ region: 'us-east-1', credentials: config.credentials });

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Granularity: granularity,
      GroupBy: groupBy?.map((g: string) => ({ Type: 'DIMENSION', Key: g })),
      Metrics: ['AmortizedCost', 'UsageQuantity'],
      Filter: filter,
    });

    try {
      const data = await costExplorerClient.send(command);
      logger?.debug('awsGetCostAndUsage raw data:', data);
      const results = data.ResultsByTime?.map(result => {
        const dimensions: { [key: string]: string } = {};
        result.Groups?.forEach(group => {
          if (group.Keys && group.Keys.length > 0 && group.Metrics) {
            const key = group.Keys[0];
            const metric = group.Metrics['AmortizedCost'];
            if (key && metric && metric.Amount) {
              dimensions[key] = metric.Amount;
            }
          }
        });
        return {
          date: result.TimePeriod?.Start,
          dimensions,
          amortizedCost: result.Total?.AmortizedCost?.Amount,
          usageAmount: result.Total?.UsageQuantity?.Amount,
        };
      });
      logger?.debug('awsGetCostAndUsage output:', results);
      return results;
    } catch (error) {
      logger?.error('Error getting cost and usage:', error);
      throw error;
    }
  },
};
