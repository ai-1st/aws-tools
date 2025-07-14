// tests/common.ts

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../src/logger';

export class TestLogger implements Logger {
  log(message: string, ...args: any[]): void {
    console.log(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  error(message: string, ...args: any[]): void {
    console.error(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  info(message: string, ...args: any[]): void {
    console.info(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  }
  debug(message: string, ...args: any[]): void {
    if (process.argv.includes('--verbose') || process.env.VERBOSE === 'true') {
      console.debug(message, ...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
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

 