// tests/awsGetCostAndUsage.test.ts

import { invoke } from '../src/index';
import { loadTestConfig } from './common';

// These tests use the lookBack parameter:
// - For DAILY granularity, lookBack is the number of days (ending yesterday)
// - For MONTHLY granularity, lookBack is the number of full months (ending with the previous month)

describe('AWS Get Cost and Usage E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should get cost and usage data with no grouping', async () => {
    const input = {
      lookBack: 7, // last 7 days
      granularity: 'DAILY',
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
  });

  test('should get cost and usage data grouped by SERVICE', async () => {
    const input = {
      lookBack: 3, // last 3 full months
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
      lookBack: 3, // last 3 full months
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
  }, 10000); // 10 second timeout for complex query
});
