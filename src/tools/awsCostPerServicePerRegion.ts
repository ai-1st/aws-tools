import { CostExplorerClient, GetCostAndUsageCommand, Expression, GroupDefinitionType } from '@aws-sdk/client-cost-explorer';
import { Logger } from '../logger.js';
import { Tool } from '../tool.js';
import { calculateDateRange, generateSimpleCostSummary } from '../utils/costUtils.js';

export const awsCostPerServicePerRegion: Tool = {
  name: 'awsCostPerServicePerRegion',
  description: 'Retrieve simplified AWS cost data grouped by service and region. Use this for basic cost analysis without complex filtering.',
  inputSchema: {
    type: 'object',
    properties: {
      lookBack: { type: 'number', description: 'Number of days (DAILY) or months (MONTHLY) to look back. Default: 30 for DAILY, 6 for MONTHLY' },
      granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'], description: 'Data granularity' },
    },
    required: ['granularity'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Text summary of the cost data by service' },
      datapoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            dimensions: { type: 'object' },
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
    const { lookBack, granularity } = input;
    const { region, logger } = config;

    // Set default lookBack values
    const defaultLookBack = granularity === 'DAILY' ? 30 : 6;
    const actualLookBack = lookBack || defaultLookBack;

    // Calculate date range based on lookBack and granularity
    const { startDate, endDate } = calculateDateRange(actualLookBack, granularity);

    logger?.debug('awsCostPerServicePerRegion input:', { ...input, calculatedStartDate: startDate, calculatedEndDate: endDate });

    const costExplorerClient = new CostExplorerClient({ credentials: config.credentials });

    // Simple filter to exclude credits and taxes
    const record_type_filter: Expression = {
      Not: {
        Dimensions: {
          Key: 'RECORD_TYPE',
          Values: ['Credit', 'Tax', 'Enterprise Discount Program Discount']
        }
      }
    };

    const params = {
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Granularity: granularity,
      GroupBy: [
        { Type: 'DIMENSION' as GroupDefinitionType, Key: 'SERVICE' },
        { Type: 'DIMENSION' as GroupDefinitionType, Key: 'REGION' }
      ],
      Metrics: ['AmortizedCost'],
      Filter: record_type_filter
    };

    try {
      let allResults: any[] = [];
      let nextToken: string | undefined;
      
      do {
        const commandWithToken = new GetCostAndUsageCommand({
          ...params,
          NextPageToken: nextToken
        });
        
        const data = await costExplorerClient.send(commandWithToken);
        nextToken = data.NextPageToken;
        
        // Process current page results
        const pageResults = data.ResultsByTime?.map(result => {
          const dimensions: { [key: string]: string } = {};
          
          // Process grouped results
          result.Groups?.forEach(group => {
            if (group.Keys && group.Keys.length > 0 && group.Metrics) {
              const service = group.Keys[0];
              const region = group.Keys[1];
              const metric = group.Metrics['AmortizedCost'];
              
              if (service && region && metric && metric.Amount) {
                const cost = parseFloat(metric.Amount);
                // Filter out costs less than $0.01
                if (cost >= 0.01) {
                  const key = `${service} (${region})`;
                  dimensions[key] = metric.Amount;
                }
              }
            }
          });
          
          return {
            date: result.TimePeriod?.Start,
            dimensions,
          };
        }) || [];
        
        allResults = allResults.concat(pageResults);
        
        logger?.debug(`Fetched page with ${pageResults.length} results, nextToken: ${nextToken}`);
        
      } while (nextToken);
      
      const summary = generateSimpleCostSummary(allResults, granularity);
      
      const output = {
        summary,
        datapoints: allResults,
      };
      
      logger?.debug(`awsCostPerServicePerRegion output:\n${output.summary}\n`, output.datapoints);
      return output;
    } catch (error) {
      logger?.error('Error getting cost per service per region:', error);
      throw error;
    }
  },
}; 