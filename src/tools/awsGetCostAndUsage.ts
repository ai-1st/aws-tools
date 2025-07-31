// src/tools/awsGetCostAndUsage.ts

import { CostExplorerClient, GetCostAndUsageCommand, Expression } from '@aws-sdk/client-cost-explorer';
import { Logger } from '../logger.js';
import { Tool } from '../tool.js';
import { calculateDateRange } from '../utils/costUtils.js';

interface AggregatedDimension {
  key: string;
  totalCost: number;
  dailyCosts: { date: string; cost: number }[];
  subdimensions?: Map<string, AggregatedDimension>;
}

function calculateTrend(dailyCosts: { date: string; cost: number }[]): { direction: 'up' | 'down' | 'stable'; percentage: number } {
  if (dailyCosts.length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  // Simple linear regression
  const n = dailyCosts.length;
  const sumX = dailyCosts.reduce((sum, _, index) => sum + index, 0);
  const sumY = dailyCosts.reduce((sum, item) => sum + item.cost, 0);
  const sumXY = dailyCosts.reduce((sum, item, index) => sum + index * item.cost, 0);
  const sumX2 = dailyCosts.reduce((sum, _, index) => sum + index * index, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgCost = sumY / n;
  
  if (Math.abs(avgCost) < 0.01) {
    return { direction: 'stable', percentage: 0 };
  }

  const percentage = (slope / avgCost) * 100;
  
  if (Math.abs(percentage) < 0.1) {
    return { direction: 'stable', percentage: 0 };
  }
  
  return {
    direction: percentage > 0 ? 'up' : 'down',
    percentage: Math.abs(percentage)
  };
}

function findMinMaxCosts(dailyCosts: { date: string; cost: number }[]): { max: { date: string; cost: number }; min: { date: string; cost: number } } {
  let max = { date: '', cost: -Infinity };
  let min = { date: '', cost: Infinity };

  dailyCosts.forEach(({ date, cost }) => {
    if (cost > max.cost) {
      max = { date, cost };
    }
    if (cost < min.cost) {
      min = { date, cost };
    }
  });

  return { max, min };
}

function calculateStandardDeviation(costs: number[]): number {
  if (costs.length < 2) {
    return 0;
  }
  
  const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
  const squaredDifferences = costs.map(cost => Math.pow(cost - mean, 2));
  const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / costs.length;
  
  return Math.sqrt(variance);
}

function generateCostSummary(results: any[], granularity: 'DAILY' | 'MONTHLY', groupBy?: string[]): string {
  if (!results || results.length === 0) {
    return 'No cost data found for the specified period.';
  }

  // Get date range
  const startDate = results[0]?.date;
  const endDate = results[results.length - 1]?.date;
  
  // Format dates based on granularity
  const formatDate = (dateStr: string) => {
    if (granularity === 'MONTHLY') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return dateStr;
  };
  
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  const dimensionsText = groupBy && groupBy.length > 0 ? `, Dimensions: ${groupBy.join(', ')}` : '';
  const dateRange = `awsGetCostAndUsage data range: ${formattedStartDate} - ${formattedEndDate}${dimensionsText}`;

  // Aggregate data by dimensions
  const dimensionMap = new Map<string, AggregatedDimension>();

  results.forEach(result => {
    if (result.dimensions) {
      Object.entries(result.dimensions).forEach(([key, value]) => {
        const cost = parseFloat(value as string) || 0;
        const date = result.date;
        
        // Filter out costs less than $0.01
        if (cost < 0.01) {
          return;
        }
        
        if (!dimensionMap.has(key)) {
          dimensionMap.set(key, {
            key,
            totalCost: 0,
            dailyCosts: [],
            subdimensions: new Map<string, AggregatedDimension>()
          });
        }
        
        const dimension = dimensionMap.get(key)!;
        dimension.totalCost += cost;
        dimension.dailyCosts.push({ date, cost });
      });
    }
  });

  // Calculate total cost across all dimensions
  const totalCost = Array.from(dimensionMap.values()).reduce((sum, dim) => sum + dim.totalCost, 0);
  
  // Sort dimensions by total cost and include dimensions that represent 95% of total cost
  const sortedDimensions = Array.from(dimensionMap.values())
    .sort((a, b) => b.totalCost - a.totalCost);
  
  let cumulativeCost = 0;
  const topDimensions = sortedDimensions.filter(dimension => {
    cumulativeCost += dimension.totalCost;
    return cumulativeCost <= totalCost * 0.95;
  });

  // Generate summary lines
  const summaryLines: string[] = [dateRange];
  const periods = results.length;
  const periodLabel = granularity === 'DAILY' ? 'days' : 'months';
  const avgPeriodLabel = granularity === 'DAILY' ? '/day' : '/month';
  const trendPeriodLabel = granularity === 'DAILY' ? 'per day' : 'per month';

  topDimensions.forEach(dimension => {
    const { direction, percentage } = calculateTrend(dimension.dailyCosts);
    const { max, min } = findMinMaxCosts(dimension.dailyCosts);
    const avgPeriodCost = dimension.totalCost / periods;
    const stdDev = calculateStandardDeviation(dimension.dailyCosts.map(d => d.cost));

    let trendText = 'stable';
    if (direction === 'up') {
      trendText = `up at ${percentage.toFixed(1)}% ${trendPeriodLabel}`;
    } else if (direction === 'down') {
      trendText = `down at ${percentage.toFixed(1)}% ${trendPeriodLabel}`;
    }

    const line = `${dimension.key}: Total cost for ${periods} ${periodLabel} $${dimension.totalCost.toFixed(2)}, average $${avgPeriodCost.toFixed(2)}${avgPeriodLabel} (±$${stdDev.toFixed(2)}), trending ${trendText}, max cost was on ${formatDate(max.date)} at $${max.cost.toFixed(2)}, min cost was on ${formatDate(min.date)} at $${min.cost.toFixed(2)}`;
    summaryLines.push(line);

    // If we have groupBy with multiple dimensions, show subdimensions
    if (groupBy && groupBy.length > 1 && dimension.subdimensions) {
      const subdimensions = Array.from(dimension.subdimensions.values())
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 10);

      subdimensions.forEach(subdim => {
        const { direction: subDirection, percentage: subPercentage } = calculateTrend(subdim.dailyCosts);
        const { max: subMax, min: subMin } = findMinMaxCosts(subdim.dailyCosts);
        const subAvgPeriodCost = subdim.totalCost / periods;
        const subStdDev = calculateStandardDeviation(subdim.dailyCosts.map(d => d.cost));

        let subTrendText = 'stable';
        if (subDirection === 'up') {
          subTrendText = `up at ${subPercentage.toFixed(1)}% ${trendPeriodLabel}`;
        } else if (subDirection === 'down') {
          subTrendText = `down at ${subPercentage.toFixed(1)}% ${trendPeriodLabel}`;
        }

        const subLine = `${dimension.key}, ${subdim.key}: Total cost for ${periods} ${periodLabel} $${subdim.totalCost.toFixed(2)}, average $${subAvgPeriodCost.toFixed(2)}${avgPeriodLabel} (±$${subStdDev.toFixed(2)}), trending ${subTrendText}, max cost was on ${formatDate(subMax.date)} at $${subMax.cost.toFixed(2)}, min cost was on ${formatDate(subMin.date)} at $${subMin.cost.toFixed(2)}`;
        summaryLines.push(subLine);
      });
    }
  });

  return summaryLines.join('\n');
}

function generateStackedColumnChart(datapoints: any[], granularity: 'DAILY' | 'MONTHLY', groupBy?: string[]) {
  if (!datapoints || datapoints.length === 0) {
    return {};
  }

  // Transform datapoints for Vega-Lite stacked column chart
  const chartData: any[] = [];
  const dimensionTotals: { [key: string]: number } = {};
  
  // First pass: calculate total costs for each dimension
  datapoints.forEach(result => {
    if (result.dimensions) {
      Object.entries(result.dimensions).forEach(([key, value]) => {
        const cost = parseFloat(value as string) || 0;
        if (cost >= 0.01) {
          dimensionTotals[key] = (dimensionTotals[key] || 0) + cost;
        }
      });
    }
  });

  // Calculate total cost and determine which dimensions to include (90% threshold)
  const totalCost = Object.values(dimensionTotals).reduce((sum, cost) => sum + cost, 0);
  const threshold = totalCost * 0.9;
  
  // Sort dimensions by cost (descending) and select top ones that reach 90%
  const sortedDimensions = Object.entries(dimensionTotals)
    .sort(([, a], [, b]) => b - a);
  
  let cumulativeCost = 0;
  const includedDimensions = new Set<string>();
  
  for (const [dimension, cost] of sortedDimensions) {
    cumulativeCost += cost;
    includedDimensions.add(dimension);
    if (cumulativeCost >= threshold) {
      break;
    }
  }
  
  // Second pass: create chart data with cost-included labels
  datapoints.forEach(result => {
    if (result.dimensions) {
      let otherCost = 0;
      
      Object.entries(result.dimensions).forEach(([key, value]) => {
        const cost = parseFloat(value as string) || 0;
        // Filter out costs less than $0.01
        if (cost >= 0.01) {
          if (includedDimensions.has(key)) {
            // Include top dimensions with their individual labels
            const totalCost = dimensionTotals[key];
            const formattedTotal = totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 });
            const dimensionLabel = `$${formattedTotal} ${key}`;
            
            chartData.push({
              date: result.date,
              dimension: dimensionLabel,
              originalDimension: key,
              cost: cost
            });
          } else {
            // Accumulate other dimensions
            otherCost += cost;
          }
        }
      });
      
      // Add "Other" category if there are costs to include
      if (otherCost > 0) {
        const remainingCost = totalCost - Object.entries(dimensionTotals)
          .filter(([key]) => includedDimensions.has(key))
          .reduce((sum, [, cost]) => sum + cost, 0);
        const formattedRemaining = remainingCost.toLocaleString('en-US', { maximumFractionDigits: 0 });
        const otherLabel = `$${formattedRemaining} Other`;
        
        chartData.push({
          date: result.date,
          dimension: otherLabel,
          originalDimension: 'Other',
          cost: otherCost
        });
      }
    }
  });

  // Format dates based on granularity
  const formatDate = (dateStr: string) => {
    if (granularity === 'MONTHLY') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Sort data by date and get unique dimensions
  const sortedData = chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dimensions = [...new Set(chartData.map(d => d.dimension))].sort();
  
  // Format dates for display
  const formattedData = sortedData.map(d => ({
    ...d,
    formattedDate: formatDate(d.date)
  }));

  const vegaLiteSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: `AWS Cost and Usage Stacked Column Chart (${granularity})`,
    width: 800,
    height: 400,
    data: {
      values: formattedData
    },
    mark: {
      type: 'bar',
      tooltip: true
    },
    encoding: {
      x: {
        field: 'formattedDate',
        type: 'nominal',
        title: granularity === 'DAILY' ? 'Date' : 'Month',
        sort: null,
        axis: {
          labelAngle: -45,
          labelLimit: 100
        }
      },
      y: {
        field: 'cost',
        type: 'quantitative',
        title: 'Cost ($)',
        stack: 'zero',
        axis: {
          format: '$.2f'
        }
      },
      color: {
        field: 'dimension',
        type: 'nominal',
        title: 'Dimension',
        scale: {
          scheme: 'category20'
        },
        legend: {
          orient: 'top',
          titleLimit: 200,
          symbolLimit: 35,
          labelLimit: 200,
          columns: 4
        }
      },
      tooltip: [
        { field: 'formattedDate', title: 'Date' },
        { field: 'originalDimension', title: 'Dimension' },
        { field: 'cost', title: 'Cost', format: '$.2f' }
      ]
    },
    config: {
      axis: {
        labelFontSize: 12,
        titleFontSize: 14
      },
      legend: {
        labelFontSize: 11,
        titleFontSize: 12,
        symbolSize: 12,
        symbolStrokeWidth: 1
      },
      title: {
        fontSize: 16
      }
    }
  };

  return vegaLiteSpec;
}

export const awsGetCostAndUsage: Tool = {
  name: 'awsGetCostAndUsage',
  description: 'Retrieve AWS cost and usage data for analysis. Always use this tool when cost information is needed.',
  inputSchema: {
    type: 'object',
    properties: {
      lookBack: { type: 'number', description: 'Number of days (DAILY) or months (MONTHLY) to look back. Default: 30 for DAILY, 6 for MONTHLY' },
      granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'], description: 'Data granularity' },
      groupBy: { type: 'array', items: { type: 'string', enum: ['AZ', 'INSTANCE_TYPE', 'LINKED_ACCOUNT', 'OPERATION', 'PURCHASE_TYPE', 'SERVICE', 'USAGE_TYPE', 'PLATFORM', 'TENANCY', 'RECORD_TYPE', 'LEGAL_ENTITY_NAME', 'INVOICING_ENTITY', 'DEPLOYMENT_OPTION', 'DATABASE_ENGINE', 'CACHE_ENGINE', 'INSTANCE_TYPE_FAMILY', 'BILLING_ENTITY', 'RESERVATION_ID', 'SAVINGS_PLANS_TYPE', 'SAVINGS_PLAN_ARN', 'OPERATING_SYSTEM'] }, description: 'Grouping dimensions up to 2.' },
      filter: { type: 'object', description: 'Filters to apply' },
    },
    required: ['granularity', 'groupBy'],
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
          },
        },
      },
      chart: { type: 'object', description: 'Vega-Lite TopLevelSpec object for generating a stacked column chart' },
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
    const { lookBack, granularity, groupBy, filter } = input;
    const { region, logger } = config;

    // Set default lookBack values
    const defaultLookBack = granularity === 'DAILY' ? 30 : 6;
    const actualLookBack = lookBack || defaultLookBack;
    
    // Default to SERVICE if groupBy is empty
    const actualGroupBy = groupBy && groupBy.length > 0 ? groupBy : ['SERVICE'];

    // Calculate date range based on lookBack and granularity
    const { startDate, endDate } = calculateDateRange(actualLookBack, granularity);

    logger?.debug('awsGetCostAndUsage input:', { ...input, calculatedStartDate: startDate, calculatedEndDate: endDate, actualGroupBy });

    const costExplorerClient = new CostExplorerClient({ credentials: config.credentials });

    const record_type_filter: Expression = {
      Not: {
        Dimensions: {
          Key: 'RECORD_TYPE',
          Values: ['Credit', 'Tax', 'Enterprise Discount Program Discount']
        }
      }
    };

    const region_filter: Expression = {
      Dimensions: {
        Key: 'REGION',
        Values: [region]
      }
    };

    const combined_filter: Expression = filter ? {
      And: [
        filter,
        record_type_filter,
        region_filter
      ]
    } : {
      And: [
        record_type_filter,
        region_filter
      ]
    };

    const params = {
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Granularity: granularity,
      GroupBy: actualGroupBy.map((g: string) => ({ Type: 'DIMENSION', Key: g })),
      Metrics: ['AmortizedCost', 'UsageQuantity'],
      Filter: combined_filter
    }
    const command = new GetCostAndUsageCommand(params);

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
              const key = group.Keys.join(', '); // Join multiple keys for subdimensions
              const metric = group.Metrics['AmortizedCost'];
              if (key && metric && metric.Amount) {
                const cost = parseFloat(metric.Amount);
                // Filter out costs less than $0.01
                if (cost >= 0.01) {
                  dimensions[key] = metric.Amount;
                }
              }
            }
          });
          
          // If no groups, use total
          if (Object.keys(dimensions).length === 0 && result.Total) {
            const totalCost = parseFloat(result.Total.AmortizedCost?.Amount || '0');
            if (totalCost >= 0.01) {
              dimensions['Total'] = result.Total.AmortizedCost?.Amount || '0';
            }
          }
          
          return {
            date: result.TimePeriod?.Start,
            dimensions,
          };
        }) || [];
        
        allResults = allResults.concat(pageResults);
        
        logger?.debug(`Fetched page with ${pageResults.length} results, nextToken: ${nextToken}`);
        
      } while (nextToken);
      
      const summary = generateCostSummary(allResults, granularity, actualGroupBy);
      const chart = generateStackedColumnChart(allResults, granularity, actualGroupBy);
      
      const output = {
        summary,
        datapoints: allResults,
        chart,
      };
      
      logger?.debug(`awsGetCostAndUsage output:\n${output.summary}\n`, output.datapoints);
      return output;
    } catch (error) {
      logger?.error('Error getting cost and usage:', error);
      throw error;
    }
  },
};
