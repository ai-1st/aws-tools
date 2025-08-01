// tests/awsCloudWatchGetMetrics.test.ts

import { invoke } from '../src/index';
import { loadTestConfig, generateChartFiles } from './common';

describe('AWS CloudWatch Get Metrics E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should get CloudWatch metrics', async () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const input = {
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
      startTime: lastMonth.toISOString(),
      endTime: lastDayOfLastMonth.toISOString(),
      period: 86400,
      statistic: 'Sum',
    };
    const result = await invoke('awsCloudWatchGetMetrics', input, config);
    expect(result).toHaveProperty('datapoints');
    expect(result).toHaveProperty('chart');
    expect(result).toHaveProperty('summary');

    // Verify chart is a valid TopLevelSpec object
    expect(typeof result.chart).toBe('object');
    expect(result.chart).toHaveProperty('mark');
    expect(result.chart).toHaveProperty('encoding');
    expect(result.chart).toHaveProperty('data');

    // Generate PNG and SVG chart files
    await generateChartFiles(result.chart, 'lambda-invocations-chart');

  });
});
