// src/tools/awsGetCostAndUsage.ts

import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { Logger } from '../logger';
import { Tool } from '../tool';

function calculateDateRange(lookBack: number, granularity: 'DAILY' | 'MONTHLY'): { startDate: string; endDate: string } {
  const today = new Date();
  
  if (granularity === 'DAILY') {
    // For daily: end date is yesterday, start date is lookBack days before end date
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1); // Yesterday
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - lookBack + 1); // lookBack days before end date
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  } else {
    // For monthly: end date is first day of current month, start date is first day of lookBack months before
    // Use UTC to avoid timezone issues
    const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)); // First day of current month
    
    const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() - lookBack, 1)); // First day of lookBack months ago
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }
}

function generateCostSummary(results: any[]): string {
  if (!results || results.length === 0) {
    return 'No cost data found for the specified period.';
  }

  const totalCost = results.reduce((sum, result) => sum + (parseFloat(result.amortizedCost) || 0), 0);
  const totalUsage = results.reduce((sum, result) => sum + (parseFloat(result.usageAmount) || 0), 0);
  
  const avgDailyCost = totalCost / results.length;
  const avgDailyUsage = totalUsage / results.length;
  
  const dateRange = `${results[0]?.date} to ${results[results.length - 1]?.date}`;
  
  return `Cost analysis for ${dateRange}: Total cost $${totalCost.toFixed(2)}, average daily cost $${avgDailyCost.toFixed(2)}. ` +
         `Total usage: ${totalUsage.toFixed(2)}, average daily usage: ${avgDailyUsage.toFixed(2)}.`;
}

export const awsGetCostAndUsage: Tool = {
  name: 'awsGetCostAndUsage',
  description: 'Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.',
  inputSchema: {
    type: 'object',
    properties: {
      lookBack: { type: 'number', description: 'Number of days (DAILY) or months (MONTHLY) to look back. Default: 30 for DAILY, 6 for MONTHLY' },
      granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'], description: 'Data granularity' },
      groupBy: { type: 'array', items: { type: 'string', enum: ['AZ', 'INSTANCE_TYPE', 'LINKED_ACCOUNT', 'OPERATION', 'PURCHASE_TYPE', 'SERVICE', 'USAGE_TYPE', 'PLATFORM', 'TENANCY', 'RECORD_TYPE', 'LEGAL_ENTITY_NAME', 'INVOICING_ENTITY', 'DEPLOYMENT_OPTION', 'DATABASE_ENGINE', 'CACHE_ENGINE', 'INSTANCE_TYPE_FAMILY', 'REGION', 'BILLING_ENTITY', 'RESERVATION_ID', 'SAVINGS_PLANS_TYPE', 'SAVINGS_PLAN_ARN', 'OPERATING_SYSTEM'] }, description: 'Grouping dimensions up to 2.' },
      filter: { type: 'object', description: 'Filters to apply' },
    },
    required: ['granularity'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Text summary of the cost and usage data' },
      datapoints: {
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
    const { lookBack, granularity, groupBy, filter } = input;
    const logger = config.logger;

    // Set default lookBack values
    const defaultLookBack = granularity === 'DAILY' ? 30 : 6;
    const actualLookBack = lookBack || defaultLookBack;

    // Calculate date range based on lookBack and granularity
    const { startDate, endDate } = calculateDateRange(actualLookBack, granularity);

    logger?.debug('awsGetCostAndUsage input:', { ...input, calculatedStartDate: startDate, calculatedEndDate: endDate });

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
      }) || [];
      
      const summary = generateCostSummary(results);
      
      const output = {
        summary,
        datapoints: results,
      };
      
      logger?.debug('awsGetCostAndUsage output:', output);
      return output;
    } catch (error) {
      logger?.error('Error getting cost and usage:', error);
      throw error;
    }
  },
};
