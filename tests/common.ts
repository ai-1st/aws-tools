// tests/common.ts

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../src/logger';

export class TestLogger implements Logger {
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
    if (process.argv.includes('--verbose') || process.env.VERBOSE === 'true') {
      console.debug(message, ...args);
    }
  }
}

export function loadTestConfig() {
  const credsFile = path.join(__dirname, '..', '.aws-creds.json');
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
  return {
    credentials: {
      accessKeyId: creds.Credentials.AccessKeyId,
      secretAccessKey: creds.Credentials.SecretAccessKey,
      sessionToken: creds.Credentials.SessionToken,
    },
    logger: new TestLogger(),
  };
}

export function getLastMonthDateRange() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  return {
    startDate: lastMonth.toISOString().split('T')[0],
    endDate: lastDayOfLastMonth.toISOString().split('T')[0],
  };
} 