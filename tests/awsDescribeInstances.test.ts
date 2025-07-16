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

  test('should include volume data in instance information', async () => {
    const input = {
      region: 'us-east-1',
    };
    const result = await invoke('awsDescribeInstances', input, config);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);

    // Check that each instance has a volumes property
    result.datapoints.forEach((instance: any) => {
      expect(instance).toHaveProperty('volumes');
      expect(instance.volumes).toBeInstanceOf(Array);

      // If volumes exist, verify their structure
      instance.volumes.forEach((volume: any) => {
        expect(volume).toHaveProperty('volumeId');
        expect(volume).toHaveProperty('size');
        expect(volume).toHaveProperty('volumeType');
        expect(volume).toHaveProperty('encrypted');
        expect(typeof volume.encrypted).toBe('boolean');
        expect(typeof volume.size).toBe('number');
      });
    });
  });

  test('should include volume information in individual instance lines', async () => {
    const input = {
      region: 'us-east-1',
    };
    const result = await invoke('awsDescribeInstances', input, config);

    expect(result).toHaveProperty('summary');
    expect(typeof result.summary).toBe('string');

    // Check if any instances have volumes
    const hasVolumes = result.datapoints.some((instance: any) =>
      instance.volumes && instance.volumes.length > 0
    );

    if (hasVolumes) {
      // Summary should include volume information in individual instance lines
      expect(result.summary).toMatch(/volume/);
      expect(result.summary).toMatch(/GB/);
      expect(result.summary).toMatch(/uptime/);
      // Should have individual lines for each instance
      const lines = result.summary.split('\n');
      expect(lines.length).toBeGreaterThan(0);
      // Each line should start with quoted instance name and include state
      lines.forEach((line: string) => {
        expect(line).toMatch(/^"/);
        expect(line).toMatch(/\(running\)|\(stopped\)/);
      });
    }
  });

  test('should handle instances with no volumes gracefully', async () => {
    const input = {
      region: 'us-east-1',
      filters: [
        {
          name: 'instance-state-name',
          values: ['terminated'] // Look for terminated instances which likely have no volumes
        }
      ]
    };

    const result = await invoke('awsDescribeInstances', input, config);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);

    // Each instance should still have a volumes property, even if empty
    result.datapoints.forEach((instance: any) => {
      expect(instance).toHaveProperty('volumes');
      expect(instance.volumes).toBeInstanceOf(Array);
    });
  });

  test('should handle volume fetch failures gracefully', async () => {
    // Test with an invalid region to potentially trigger volume fetch failure
    const input = {
      region: 'us-west-1', // Different region that might not have instances
    };

    const result = await invoke('awsDescribeInstances', input, config);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);

    // Should still work even if volume fetching fails
    result.datapoints.forEach((instance: any) => {
      expect(instance).toHaveProperty('volumes');
      expect(instance.volumes).toBeInstanceOf(Array);
    });
  });
});
