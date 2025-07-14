// tests/aws-tools.test.ts

import { invoke } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../src/logger';

class TestLogger implements Logger {
  log(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }
  info(message: string, ...args: any[]): void {
    console.info(message, ...args);
  }
  debug(message: string, ...args: any[]): void {
    if (process.argv.includes('--verbose')) {
      console.debug(message, ...args);
    }
  }
}

describe('AWS Tools E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    const credsFile = path.join(__dirname, '..', '.aws-creds.json');
    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
    config = {
      credentials: {
        accessKeyId: creds.Credentials.AccessKeyId,
        secretAccessKey: creds.Credentials.SecretAccessKey,
        sessionToken: creds.Credentials.SessionToken,
      },
      logger: new TestLogger(),
    };
  });

  // Tests will go here
  test('should describe EC2 instances', async () => {
    const input = {
      region: 'us-east-1',
    };
    const result = await invoke('awsDescribeInstances', input, config);
    expect(result).toBeInstanceOf(Array);
  });

  test('should get cost and usage data', async () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const input = {
      startDate: lastMonth.toISOString().split('T')[0],
      endDate: lastDayOfLastMonth.toISOString().split('T')[0],
      granularity: 'DAILY',
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toBeInstanceOf(Array);
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
  });

  test('should list cost optimization hub recommendations', async () => {
    const input = {
      region: 'us-east-1',
    };
    const result = await invoke('awsCostOptimizationHubListRecommendations', input, config);
    expect(result).toHaveProperty('recommendations');
  });
});
