// src/tools/awsDescribeInstances.ts

import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { Logger } from '../logger';
import { Tool } from '../tool';

export const awsDescribeInstances: Tool = {
  name: 'awsDescribeInstances',
  description: 'Get detailed information about EC2 instances including their configuration, state, and pricing.',
  inputSchema: {
    type: 'object',
    properties: {
      region: { type: 'string', description: 'AWS region where instances are located (e.g., "us-east-1")' },
      instanceIds: { type: 'array', items: { type: 'string' }, description: 'Specific instance IDs to describe' },
      filters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            values: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'values'],
        },
        description: 'Filters to apply to the describe operation',
      },
      maxResults: { type: 'number', description: 'Maximum number of results to return (default: 1000)' },
      chartTitle: { type: 'string', description: 'Title for the chart that will be generated from resulting data' },
    },
    required: ['region'],
  },
  outputSchema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        instanceId: { type: 'string' },
        instanceName: { type: 'string' },
        instanceType: { type: 'string' },
        platform: { type: 'string' },
        tenancy: { type: 'string' },
        region: { type: 'string' },
        uptimeHours: { type: 'number' },
      },
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      credentials: {
        type: 'object',
        properties: {
          accessKeyId: { type: 'string' },
          secretAccessKey: { type: 'string' },
          sessionToken: { type: 'string' },
        },
        required: ['accessKeyId', 'secretAccessKey'],
      },
      logger: { type: 'object' },
    },
    required: ['credentials'],
  },
  defaultConfig: {},
  async invoke(input: any, config: { credentials?: any; logger?: Logger }): Promise<any> {
    const { region, instanceIds, filters, maxResults } = input;
    const logger = config.logger;

    logger?.debug('awsDescribeInstances input:', input);

    const ec2Client = new EC2Client({ region, credentials: config.credentials });

    const command = new DescribeInstancesCommand({
      InstanceIds: instanceIds,
      Filters: filters,
      MaxResults: maxResults,
    });

    try {
      const data = await ec2Client.send(command);
      logger?.debug('awsDescribeInstances raw data:', JSON.stringify(data, null, 2));
      const instances = data.Reservations?.flatMap(reservation =>
        reservation.Instances?.map(instance => ({
          instanceId: instance.InstanceId,
          instanceName: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'N/A',
          instanceType: instance.InstanceType,
          platform: instance.PlatformDetails,
          tenancy: instance.Placement?.Tenancy,
          region: instance.Placement?.AvailabilityZone?.slice(0, -1),
          uptimeHours: instance.LaunchTime ? Math.floor((new Date().getTime() - instance.LaunchTime.getTime()) / 3600000) : 0,
        }))
      );
      logger?.debug('awsDescribeInstances output:', instances);
      return instances;
    } catch (error) {
      logger?.error('Error describing EC2 instances:', error);
      throw error;
    }
  },
};
