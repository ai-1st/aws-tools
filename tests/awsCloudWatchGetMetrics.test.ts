// tests/awsCloudWatchGetMetrics.test.ts

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

describe('AWS CloudWatch Get Metrics E2E Tests', () => {
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
});
