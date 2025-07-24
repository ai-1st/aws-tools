// src/tools/awsCloudWatchGetMetrics.ts

import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { Logger } from '../logger.js';
import { Tool } from '../tool.js';

function generateMetricsSummary(datapoints: any[], namespace: string, metricName: string): string {
  if (!datapoints || datapoints.length === 0) {
    return `No ${metricName} metrics found for ${namespace}.`;
  }

  const values = datapoints.map(dp => dp.Value).filter(v => v !== undefined && v !== null);
  if (values.length === 0) {
    return `No valid ${metricName} data points found for ${namespace}.`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const total = values.reduce((sum, val) => sum + val, 0);
  
  const timeRange = `${datapoints[0]?.Timestamp} to ${datapoints[datapoints.length - 1]?.Timestamp}`;
  
  return `${metricName} metrics for ${namespace} (${timeRange}): ` +
         `Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}, Average: ${avg.toFixed(2)}, Total: ${total.toFixed(2)}. ` +
         `Data points: ${datapoints.length}.`;
}

function generateVegaLiteChart(datapoints: any[], namespace: string, metricName: string) {
  if (!datapoints || datapoints.length === 0) {
    return {};
  }

  // Transform datapoints for Vega-Lite
  const chartData = datapoints.map(dp => ({
    timestamp: dp.Timestamp,
    value: dp.Value,
    unit: dp.Unit
  }));

  const vegaLiteSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: `${metricName} metrics for ${namespace}`,
    width: 600,
    height: 300,
    data: {
      values: chartData
    },
    mark: {
      type: 'line',
      point: true
    },
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
        title: 'Time',
        axis: {
          format: '%Y-%m-%d',
          labelAngle: -45
        }
      },
      y: {
        field: 'value',
        type: 'quantitative',
        title: metricName,
        scale: {
          zero: false
        }
      },
      tooltip: [
        {
          field: 'timestamp',
          type: 'temporal',
          title: 'Time',
          format: '%Y-%m-%d %H:%M:%S'
        },
        {
          field: 'value',
          type: 'quantitative',
          title: metricName,
          format: ',.2f'
        },
        {
          field: 'unit',
          type: 'nominal',
          title: 'Unit'
        }
      ]
    },
    config: {
      axis: {
        labelFontSize: 12,
        titleFontSize: 14
      },
      title: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    }
  };

  return vegaLiteSpec;
}

export const awsCloudWatchGetMetrics: Tool = {
  name: 'awsCloudWatchGetMetrics',
  description: 'Retrieve CloudWatch metrics for any AWS service with flexible dimensions and time periods. Essential for analyzing performance trends, usage patterns, and operational metrics.',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', description: 'AWS namespace (e.g., "AWS/Lambda", "AWS/EC2", "AWS/RDS")' },
      metricName: { type: 'string', description: 'Metric name (e.g., "Invocations", "Duration", "Errors")' },
      dimensions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Dimension name (e.g., "FunctionName")' },
            value: { type: 'string', description: 'Dimension value (e.g., specific function name)' },
          },
          required: ['name', 'value'],
        },
        description: 'Dimensions to filter the metric',
      },
      startTime: { type: 'string', description: 'Start time in ISO format (e.g., "2024-01-01T00:00:00Z")' },
      endTime: { type: 'string', description: 'End time in ISO format (e.g., "2024-01-31T23:59:59Z")' },
      period: { type: 'number', description: 'Period in seconds (300=5min, 3600=1hour, 86400=1day)' },
      statistic: { type: 'string', enum: ['Sum', 'Average', 'Maximum', 'Minimum', 'SampleCount'], description: 'Statistic to retrieve' },
    },
    required: ['namespace', 'metricName', 'startTime', 'endTime', 'period', 'statistic'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Text summary of the CloudWatch metrics' },
      datapoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            Timestamp: { type: 'string' },
            Value: { type: 'number' },
            Unit: { type: 'string' },
          },
        },
      },
      chart: { type: 'object', description: 'Vega-Lite TopLevelSpec object for generating an SVG chart' },
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
    const { namespace, metricName, dimensions, startTime, endTime, period, statistic } = input;
    const { region, logger } = config;

    logger?.debug('awsCloudWatchGetMetrics input:', input);

    const cloudWatchClient = new CloudWatchClient({ region, credentials: config.credentials });

    const command = new GetMetricDataCommand({
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: namespace,
              MetricName: metricName,
              Dimensions: dimensions?.map((d: { name: any; value: any; }) => ({ Name: d.name, Value: d.value })),
            },
            Period: period,
            Stat: statistic,
          },
          ReturnData: true,
        },
      ],
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
    });

    try {
      const data = await cloudWatchClient.send(command);
      logger?.debug('awsCloudWatchGetMetrics raw data:', data);
      const result = data.MetricDataResults?.[0];
      const datapoints = result?.Timestamps?.map((t, i) => ({
        Timestamp: t.toISOString(),
        Value: result.Values?.[i],
        Unit: result.Values?.[i] ? result.Label : '',
      })) || [];
      
      const summary = generateMetricsSummary(datapoints, namespace, metricName);
      const chart = generateVegaLiteChart(datapoints, namespace, metricName);
      
      const output = {
        summary,
        datapoints,
        chart,
      };
      logger?.debug('awsCloudWatchGetMetrics output:', output);
      return output;
    } catch (error) {
      logger?.error('Error getting CloudWatch metrics:', error);
      throw error;
    }
  },
};
