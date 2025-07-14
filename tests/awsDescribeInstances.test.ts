// tests/awsDescribeInstances.test.ts

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

describe('AWS Describe Instances E2E Tests', () => {
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
