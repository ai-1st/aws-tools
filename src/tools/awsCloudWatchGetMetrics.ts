// src/tools/awsCloudWatchGetMetrics.ts

import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { Logger } from '../logger';
import { Tool } from '../tool';

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
      region: { type: 'string', description: 'AWS region (defaults to us-east-1)' },
      chartTitle: { type: 'string', description: 'Title for the chart that will be generated' },
    },
    required: ['namespace', 'metricName', 'startTime', 'endTime', 'period', 'statistic'],
  },
  outputSchema: {
    type: 'object',
    properties: {
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
      label: { type: 'string' },
      namespace: { type: 'string' },
      metricName: { type: 'string' },
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
    const { namespace, metricName, dimensions, startTime, endTime, period, statistic, region } = input;
    const logger = config.logger;

    logger?.debug('awsCloudWatchGetMetrics input:', input);

    const cloudWatchClient = new CloudWatchClient({ region: region || 'us-east-1', credentials: config.credentials });

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
      const output = {
        datapoints: result?.Timestamps?.map((t, i) => ({
          Timestamp: t.toISOString(),
          Value: result.Values?.[i],
          Unit: result.Values?.[i] ? result.Label : '',
        })),
        label: result?.Label,
        namespace,
        metricName,
      };
      logger?.debug('awsCloudWatchGetMetrics output:', output);
      return output;
    } catch (error) {
      logger?.error('Error getting CloudWatch metrics:', error);
      throw error;
    }
  },
};
