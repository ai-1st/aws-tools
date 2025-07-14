// tests/awsGetCostAndUsage.test.ts

import { invoke } from '../src/index';
import { loadTestConfig, getLastMonthDateRange } from './common';

describe('AWS Get Cost and Usage E2E Tests', () => {
  let config: any;
  let startDate: string;
  let endDate: string;

  beforeAll(() => {
    config = loadTestConfig();
    const dateRange = getLastMonthDateRange();
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;
  });

  test('should get cost and usage data with no grouping', async () => {
    const input = {
      startDate,
      endDate,
      granularity: 'DAILY',
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
  });

  test('should get cost and usage data grouped by SERVICE', async () => {
    const input = {
      startDate,
      endDate,
      granularity: 'MONTHLY',
      groupBy: ['SERVICE'],
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
    if (result.datapoints.length > 0) {
      expect(result.datapoints[0]).toHaveProperty('dimensions');
    }
  });

  test('should get cost and usage data grouped by SERVICE and USAGE_TYPE', async () => {
    const input = {
      startDate,
      endDate,
      granularity: 'MONTHLY',
      groupBy: ['SERVICE', 'USAGE_TYPE'],
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
    if (result.datapoints.length > 0) {
      expect(result.datapoints[0]).toHaveProperty('dimensions');
    }
  });
});
