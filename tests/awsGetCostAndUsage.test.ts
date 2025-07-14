// tests/awsGetCostAndUsage.test.ts

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

describe('AWS Get Cost and Usage E2E Tests', () => {
  let config: any;
  let startDate: string;
  let endDate: string;

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

    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    startDate = lastMonth.toISOString().split('T')[0];
    endDate = lastDayOfLastMonth.toISOString().split('T')[0];
  });

  test('should get cost and usage data with no grouping', async () => {
    const input = {
      startDate,
      endDate,
      granularity: 'DAILY',
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toBeInstanceOf(Array);
    expect(result[0].groups).toBeUndefined();
  });

  test('should get cost and usage data grouped by SERVICE', async () => {
    const input = {
      startDate,
      endDate,
      granularity: 'MONTHLY',
      groupBy: ['SERVICE'],
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toHaveProperty('dimensions');
  });

  test('should get cost and usage data grouped by SERVICE and USAGE_TYPE', async () => {
    const input = {
      startDate,
      endDate,
      granularity: 'MONTHLY',
      groupBy: ['SERVICE', 'USAGE_TYPE'],
    };
    const result = await invoke('awsGetCostAndUsage', input, config);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toHaveProperty('dimensions');
  });
});
