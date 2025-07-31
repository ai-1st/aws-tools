import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('awsCostPerServicePerRegion', () => {
  let testCredentials: any;

  beforeAll(() => {
    try {
      const credsFile = readFileSync(join(process.cwd(), '.aws-creds.json'), 'utf-8');
      const creds = JSON.parse(credsFile);
      testCredentials = {
        accessKeyId: creds.Credentials.AccessKeyId,
        secretAccessKey: creds.Credentials.SecretAccessKey,
        sessionToken: creds.Credentials.SessionToken,
      };
    } catch (error) {
      console.warn('Could not load AWS credentials from .aws-creds.json:', error);
      testCredentials = null;
    }
  });

  test('should be imported correctly', async () => {
    const { awsCostPerServicePerRegion } = await import('../src/tools/awsCostPerServicePerRegion');
    
    expect(awsCostPerServicePerRegion).toBeDefined();
    expect(awsCostPerServicePerRegion.name).toBe('awsCostPerServicePerRegion');
    expect(awsCostPerServicePerRegion.description).toContain('simplified AWS cost data');
  });

  test('should have correct input schema', async () => {
    const { awsCostPerServicePerRegion } = await import('../src/tools/awsCostPerServicePerRegion');
    
    expect(awsCostPerServicePerRegion.inputSchema).toHaveProperty('properties');
    const schema = awsCostPerServicePerRegion.inputSchema as any;
    expect(schema.properties).toHaveProperty('lookBack');
    expect(schema.properties).toHaveProperty('granularity');
    expect(schema.required).toContain('granularity');
  });

  test('should have correct output schema', async () => {
    const { awsCostPerServicePerRegion } = await import('../src/tools/awsCostPerServicePerRegion');
    
    expect(awsCostPerServicePerRegion.outputSchema).toHaveProperty('properties');
    const schema = awsCostPerServicePerRegion.outputSchema as any;
    expect(schema.properties).toHaveProperty('summary');
    expect(schema.properties).toHaveProperty('datapoints');
    expect(schema.properties.datapoints.type).toBe('array');
  });

  test('should invoke successfully with real AWS credentials - daily granularity', async () => {
    if (!testCredentials) {
      console.log('Skipping real AWS test - no credentials available');
      return;
    }

    const { awsCostPerServicePerRegion } = await import('../src/tools/awsCostPerServicePerRegion');
    
    const logger = {
      debug: (...args: any[]) => console.log('[DEBUG]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      log: (...args: any[]) => console.log('[LOG]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      info: (...args: any[]) => console.info('[INFO]', ...args),
    };

    const result = await awsCostPerServicePerRegion.invoke(
      { granularity: 'DAILY', lookBack: 7 },
      { 
        credentials: testCredentials,
        region: 'us-east-1',
        logger
      }
    );

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(Array.isArray(result.datapoints)).toBe(true);
    expect(result.summary).toContain('awsCostPerServicePerRegion data range');
    
    console.log('Sample result:', {
      summary: result.summary.split('\n')[0],
      datapointCount: result.datapoints.length
    });
  }, 30000); // 30 second timeout for real AWS call

  test('should invoke successfully with real AWS credentials - monthly granularity', async () => {
    if (!testCredentials) {
      console.log('Skipping real AWS test - no credentials available');
      return;
    }

    const { awsCostPerServicePerRegion } = await import('../src/tools/awsCostPerServicePerRegion');
    
    const logger = {
      debug: (...args: any[]) => console.log('[DEBUG]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      log: (...args: any[]) => console.log('[LOG]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      info: (...args: any[]) => console.info('[INFO]', ...args),
    };

    const result = await awsCostPerServicePerRegion.invoke(
      { granularity: 'MONTHLY', lookBack: 3 },
      { 
        credentials: testCredentials,
        region: 'us-east-1',
        logger
      }
    );

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(Array.isArray(result.datapoints)).toBe(true);
    expect(result.summary).toContain('awsCostPerServicePerRegion data range');
    
    console.log('Sample monthly result:', {
      summary: result.summary.split('\n')[0],
      datapointCount: result.datapoints.length
    });
  }, 30000); // 30 second timeout for real AWS call

  test('should use default lookBack values', async () => {
    if (!testCredentials) {
      console.log('Skipping real AWS test - no credentials available');
      return;
    }

    const { awsCostPerServicePerRegion } = await import('../src/tools/awsCostPerServicePerRegion');
    
    const logger = {
      debug: (...args: any[]) => console.log('[DEBUG]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      log: (...args: any[]) => console.log('[LOG]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      info: (...args: any[]) => console.info('[INFO]', ...args),
    };

    // Test daily default (30 days)
    const result = await awsCostPerServicePerRegion.invoke(
      { granularity: 'DAILY' },
      { 
        credentials: testCredentials,
        region: 'us-east-1',
        logger
      }
    );

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    
    console.log('Default lookBack test result:', {
      summary: result.summary.split('\n')[0],
      datapointCount: result.datapoints.length
    });
  }, 30000); // 30 second timeout for real AWS call
}); 