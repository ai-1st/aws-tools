// tests/awsCostOptimizationHubListRecommendations.test.ts

import { invoke } from '../src/index';
import { loadTestConfig } from './common';

describe('AWS Cost Optimization Hub List Recommendations E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should list cost optimization hub recommendations', async () => {
    const input = {};
    const result = await invoke('awsCostOptimizationHubListRecommendations', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
  });
});
