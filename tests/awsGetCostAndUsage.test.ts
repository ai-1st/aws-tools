// tests/awsGetCostAndUsage.test.ts

import { invoke } from '../src/index';
import { loadTestConfig, generateChartFiles } from './common';

describe('AWS Get Cost and Usage E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should get cost and usage data with no grouping', async () => {
    const input = {
      lookBack: 7,
      granularity: 'DAILY',
    };
    const result = await invoke('awsGetCostAndUsage', input, config);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result).toHaveProperty('chart');
    expect(typeof result.summary).toBe('string');
    expect(Array.isArray(result.datapoints)).toBe(true);
    expect(typeof result.chart).toBe('object');
    
    // Verify chart structure
    if (result.chart && Object.keys(result.chart).length > 0) {
      expect(result.chart).toHaveProperty('$schema');
      expect(result.chart).toHaveProperty('mark');
      expect(result.chart.mark).toHaveProperty('type', 'bar');
      expect(result.chart).toHaveProperty('encoding');
      expect(result.chart.encoding).toHaveProperty('y');
      expect(result.chart.encoding.y).toHaveProperty('stack', 'zero');
      
      // Generate PNG and SVG chart files
      await generateChartFiles(result.chart, 'cost-usage-daily-no-grouping');
    }
  });

  test('should get cost and usage data grouped by SERVICE', async () => {
    const input = {
      lookBack: 3,
      granularity: 'MONTHLY',
      groupBy: ['SERVICE'],
    };
    const result = await invoke('awsGetCostAndUsage', input, config);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result).toHaveProperty('chart');
    expect(typeof result.summary).toBe('string');
    expect(Array.isArray(result.datapoints)).toBe(true);
    expect(typeof result.chart).toBe('object');
    
    // Verify chart structure
    if (result.chart && Object.keys(result.chart).length > 0) {
      expect(result.chart).toHaveProperty('$schema');
      expect(result.chart).toHaveProperty('mark');
      expect(result.chart.mark).toHaveProperty('type', 'bar');
      expect(result.chart).toHaveProperty('encoding');
      expect(result.chart.encoding).toHaveProperty('y');
      expect(result.chart.encoding.y).toHaveProperty('stack', 'zero');
      
      // Generate PNG and SVG chart files
      await generateChartFiles(result.chart, 'cost-usage-monthly-service-grouping');
    }
  });

  test('should get cost and usage data grouped by SERVICE and USAGE_TYPE', async () => {
    const input = {
      lookBack: 3,
      granularity: 'MONTHLY',
      groupBy: ['SERVICE', 'USAGE_TYPE'],
    };
    const result = await invoke('awsGetCostAndUsage', input, config);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result).toHaveProperty('chart');
    expect(typeof result.summary).toBe('string');
    expect(Array.isArray(result.datapoints)).toBe(true);
    expect(typeof result.chart).toBe('object');
    
    // Verify chart structure
    if (result.chart && Object.keys(result.chart).length > 0) {
      expect(result.chart).toHaveProperty('$schema');
      expect(result.chart).toHaveProperty('mark');
      expect(result.chart.mark).toHaveProperty('type', 'bar');
      expect(result.chart).toHaveProperty('encoding');
      expect(result.chart.encoding).toHaveProperty('y');
      expect(result.chart.encoding.y).toHaveProperty('stack', 'zero');
      
      // Generate PNG and SVG chart files
      await generateChartFiles(result.chart, 'cost-usage-monthly-service-usage-type-grouping');
    }
  });
});
