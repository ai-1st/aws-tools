// src/tools/awsDescribeInstances.ts

import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand } from '@aws-sdk/client-ec2';
import { Logger } from '../logger';
import { Tool } from '../tool';

async function fetchVolumeData(ec2Client: EC2Client, instanceIds: string[], logger?: Logger): Promise<{ [instanceId: string]: any[] }> {
  try {
    // Get all volume IDs attached to the instances
    const volumeCommand = new DescribeVolumesCommand({
      Filters: [
        {
          Name: 'attachment.instance-id',
          Values: instanceIds,
        },
      ],
    });

    const volumeData = await ec2Client.send(volumeCommand);
    logger?.debug('Volume data fetched:', JSON.stringify(volumeData, null, 2));

    // Group volumes by instance ID
    const volumesByInstance: { [instanceId: string]: any[] } = {};
    
    volumeData.Volumes?.forEach(volume => {
      volume.Attachments?.forEach(attachment => {
        if (attachment.InstanceId) {
          if (!volumesByInstance[attachment.InstanceId]) {
            volumesByInstance[attachment.InstanceId] = [];
          }
          volumesByInstance[attachment.InstanceId].push({
            volumeId: volume.VolumeId,
            size: volume.Size,
            volumeType: volume.VolumeType,
            iops: volume.Iops,
            encrypted: volume.Encrypted,
          });
        }
      });
    });

    return volumesByInstance;
  } catch (error) {
    logger?.warn('Failed to fetch volume data, continuing without volume information:', error);
    return {};
  }
}

function generateInstanceSummary(instances: any[]): string {
  if (!instances || instances.length === 0) {
    return 'No EC2 instances found.';
  }

  const instanceLines = instances.map(instance => {
    const instanceName = instance.instanceName || 'unnamed';
    const state = instance.state || 'unknown';
    const instanceType = instance.instanceType || 'unknown';
    const platform = instance.platform || 'unknown';
    const uptimeHours = instance.uptimeHours || 0;
    
    // Format uptime - use days if more than 48 hours
    let uptimeInfo = '';
    if (uptimeHours > 48) {
      const days = Math.floor(uptimeHours / 24);
      uptimeInfo = `uptime ${days}d`;
    } else {
      uptimeInfo = `uptime ${uptimeHours}h`;
    }
    
    // Format volumes concisely for cost analysis
    let volumeInfo = '';
    if (instance.volumes && instance.volumes.length > 0) {
      const volumeSummary = instance.volumes
        .map((vol: any) => `${vol.size}GB ${vol.volumeType}`)
        .join('+');
      volumeInfo = `, ${instance.volumes.length}×${volumeSummary} volume${instance.volumes.length > 1 ? 's' : ''}`;
    }
    
    // Format all tags information
    let tagInfo = '';
    if (instance.tags && Object.keys(instance.tags).length > 0) {
      const tagPairs = Object.entries(instance.tags).map(([key, value]) => `${key}=${value}`);
      tagInfo = `, tags: ${tagPairs.join(', ')}`;
    }
    
    return `"${instanceName}" (${state}): ${instanceType} ${platform}, ${uptimeInfo}${volumeInfo}${tagInfo}`;
  });

  return instanceLines.join('\n');
}

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
    },
    required: ['region'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Text summary of the EC2 instances' },
      datapoints: {
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
            state: { type: 'string' },
            tags: { type: 'object' },
            volumes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  volumeId: { type: 'string' },
                  size: { type: 'number' },
                  volumeType: { type: 'string' },
                  iops: { type: 'number' },
                  encrypted: { type: 'boolean' },
                },
              },
            },
          },
        },
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
      
      // Extract basic instance information
      const instances = data.Reservations?.flatMap(reservation =>
        reservation.Instances?.map(instance => ({
          instanceId: instance.InstanceId,
          instanceName: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'unnamed',
          instanceType: instance.InstanceType,
          platform: instance.PlatformDetails,
          tenancy: instance.Placement?.Tenancy,
          region: instance.Placement?.AvailabilityZone?.slice(0, -1),
          uptimeHours: instance.LaunchTime ? Math.floor((new Date().getTime() - instance.LaunchTime.getTime()) / 3600000) : 0,
          state: instance.State?.Name,
          tags: instance.Tags?.filter(tag => tag.Key !== 'Name').reduce((acc: { [key: string]: string }, tag) => {
            if (tag.Key && tag.Value) {
              acc[tag.Key] = tag.Value;
            }
            return acc;
          }, {}) || {},
        }))
      ) || [];

      // Fetch volume data for all instances
      const instanceIds = instances.map(inst => inst?.instanceId).filter(Boolean) as string[];
      const volumesByInstance = instanceIds.length > 0 
        ? await fetchVolumeData(ec2Client, instanceIds, logger)
        : {};

      // Merge volume data with instance information
      const enrichedInstances = instances.map(instance => ({
        ...instance,
        volumes: instance?.instanceId ? (volumesByInstance[instance.instanceId] || []) : [],
      }));
      
      const summary = generateInstanceSummary(enrichedInstances);
      
      const output = {
        summary,
        datapoints: enrichedInstances,
      };
      
      logger?.debug('awsDescribeInstances summary:\n', output.summary);
      logger?.debug('awsDescribeInstances datapoints:', output.datapoints);
      return output;
    } catch (error) {
      logger?.error('Error describing EC2 instances:', error);
      throw error;
    }
  },
};
