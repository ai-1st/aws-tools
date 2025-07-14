// tests/awsDescribeInstances.test.ts

import { invoke } from '../src/index';
import { loadTestConfig } from './common';

describe('AWS Describe Instances E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should describe EC2 instances', async () => {
    const input = {
      region: 'us-east-1',
    };
    const result = await invoke('awsDescribeInstances', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
  });
});
