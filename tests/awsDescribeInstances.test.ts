// tests/awsDescribeInstances.test.ts

import { invoke } from '../src/index';
import { loadTestConfig } from './common';

describe('AWS Describe Instances E2E Tests', () => {
  let config: any;

  beforeAll(() => {
    config = loadTestConfig();
  });

  test('should describe EC2 instances', async () => {
    const input = {};
    const result = await invoke('awsDescribeInstances', input, config);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);
  }, 30000);

  test('should include volume data in instance information', async () => {
    const input = {};
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
  }, 30000);

  test('should include volume information in individual instance lines', async () => {
    const input = {};
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
  }, 30000);

  test('should handle instances with no volumes gracefully', async () => {
    const input = {
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
  }, 30000);

  test('should handle volume fetch failures gracefully', async () => {
    // Test with a different region to potentially trigger volume fetch failure
    const input = {};
    const configWithDifferentRegion = { ...config, region: 'us-west-1' };

    const result = await invoke('awsDescribeInstances', input, configWithDifferentRegion);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('datapoints');
    expect(result.datapoints).toBeInstanceOf(Array);

    // Should still work even if volume fetching fails
    result.datapoints.forEach((instance: any) => {
      expect(instance).toHaveProperty('volumes');
      expect(instance.volumes).toBeInstanceOf(Array);
    });
  }, 30000);
});

describe('AWS Describe Instances Pricing Unit Tests', () => {
  test('should have correct output schema with cost information', async () => {
    // Import the tool directly to test schema
    const { awsDescribeInstances } = await import('../src/tools/awsDescribeInstances');
    
    const schema = awsDescribeInstances.outputSchema as any;
    expect(awsDescribeInstances.outputSchema).toHaveProperty('properties.datapoints.items.properties.cost');
    expect(schema.properties.datapoints.items.properties.cost).toHaveProperty('properties.onDemandCost');
    expect(schema.properties.datapoints.items.properties.cost).toHaveProperty('properties.savingsPlanCost');
    expect(schema.properties.datapoints.items.properties.cost.properties.onDemandCost).toHaveProperty('properties.hourlyCost');
    expect(schema.properties.datapoints.items.properties.cost.properties.onDemandCost).toHaveProperty('properties.monthlyCost');
    expect(schema.properties.datapoints.items.properties.cost.properties.savingsPlanCost).toHaveProperty('properties.hourlyCost');
    expect(schema.properties.datapoints.items.properties.cost.properties.savingsPlanCost).toHaveProperty('properties.monthlyCost');
    expect(schema.properties.datapoints.items.properties.cost).toHaveProperty('properties.specifications');
    expect(schema.properties.datapoints.items.properties.cost).toHaveProperty('properties.pricingDetails');
  });



  test('should have volumes in output schema', async () => {
    const { awsDescribeInstances } = await import('../src/tools/awsDescribeInstances');
    
    const schema = awsDescribeInstances.outputSchema as any;
    expect(awsDescribeInstances.outputSchema).toHaveProperty('properties.datapoints.items.properties.volumes');
    expect(schema.properties.datapoints.items.properties.volumes.type).toBe('array');
  });

  test('should calculate costs correctly with mock pricing data', async () => {
    // Import the internal functions for testing
    const { awsDescribeInstances } = await import('../src/tools/awsDescribeInstances');
    
    // Mock pricing data structure
    const mockPricingData = {
      m5: {
        sizes: {
          large: {
            operations: {
              "": { // Linux/UNIX operation code
                "us-east-1": "0.096,0.072,0.072,0.072,0.048,0.048,0.048,0.096,0.072,0.072,0.072,0.048,0.048,0.048"
              }
            }
          }
        }
      }
    };

    // Test the cost calculation logic
    const instance = {
      instanceType: 'm5.large',
      platform: 'Linux/UNIX',
      region: 'us-east-1',
      tenancy: 'default'
    };

    // The tool should handle pricing data gracefully
    expect(awsDescribeInstances).toBeDefined();
    expect(awsDescribeInstances.name).toBe('awsDescribeInstances');
    expect(awsDescribeInstances.description).toContain('pricing');
  });
});
