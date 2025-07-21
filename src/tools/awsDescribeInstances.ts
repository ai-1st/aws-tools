// src/tools/awsDescribeInstances.ts

import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand } from '@aws-sdk/client-ec2';
import { Logger } from '../logger';
import { Tool } from '../tool';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import * as https from 'https';

// Pricing data cache
let pricingDataCache: any = null;
let pricingDataLastFetch: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

async function downloadAndCachePricingData(logger?: Logger): Promise<any> {
  const cacheDir = path.join(os.tmpdir(), 'aws-tools-cache');
  const cacheFile = path.join(cacheDir, 'ec2_pricing.json');
  
  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Check if cache is still valid
  if (fs.existsSync(cacheFile)) {
    const stats = fs.statSync(cacheFile);
    const age = Date.now() - stats.mtime.getTime();
    if (age < CACHE_DURATION) {
      try {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        logger?.debug('Using cached pricing data');
        return cachedData;
      } catch (error) {
        logger?.warn('Failed to read cached pricing data, will download fresh copy');
      }
    }
  }

  // Download fresh pricing data
  logger?.debug('Downloading fresh pricing data from S3');
  const url = 'https://cloudfix-public-aws-pricing.s3.us-east-1.amazonaws.com/pricing/ec2_pricing.json.gz';
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download pricing data: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const compressedData = Buffer.concat(chunks);
          const decompressedData = zlib.gunzipSync(compressedData);
          const pricingData = JSON.parse(decompressedData.toString());
          
          // Cache the data
          fs.writeFileSync(cacheFile, JSON.stringify(pricingData));
          logger?.debug('Pricing data cached successfully');
          
          resolve(pricingData);
        } catch (error) {
          reject(new Error(`Failed to process pricing data: ${error}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to download pricing data: ${error.message}`));
    });
  });
}

async function getPricingData(logger?: Logger): Promise<any> {
  if (pricingDataCache && (Date.now() - pricingDataLastFetch) < CACHE_DURATION) {
    return pricingDataCache;
  }

  try {
    pricingDataCache = await downloadAndCachePricingData(logger);
    pricingDataLastFetch = Date.now();
    return pricingDataCache;
  } catch (error) {
    logger?.warn('Failed to fetch pricing data, continuing without cost information:', error);
    return null;
  }
}

function getOperationCode(platform: string): string {
  if (!platform) return '';
  
  const platformLower = platform.toLowerCase();
  if (platformLower.includes('windows')) {
    if (platformLower.includes('sql server enterprise')) return '0102';
    if (platformLower.includes('sql server standard')) return '0006';
    if (platformLower.includes('sql server web')) return '0202';
    if (platformLower.includes('byol')) return '0800';
    return '0002';
  } else if (platformLower.includes('red hat')) {
    if (platformLower.includes('sql server enterprise')) return '0110';
    if (platformLower.includes('sql server standard')) return '0014';
    if (platformLower.includes('sql server web')) return '0210';
    if (platformLower.includes('byol')) return '00g0';
    return '0010';
  } else if (platformLower.includes('suse')) {
    return '000g';
  } else if (platformLower.includes('linux')) {
    if (platformLower.includes('sql server enterprise')) return '0100';
    if (platformLower.includes('sql server standard')) return '0004';
    if (platformLower.includes('sql server web')) return '0200';
    return '';
  }
  
  return '';
}

function calculateInstanceCost(instanceType: string, platform: string, region: string, tenancy: string, pricingData: any): { 
  onDemandCost: {
    hourlyCost: number; 
    monthlyCost: number;
  };
  savingsPlanCost: {
    hourlyCost: number; 
    monthlyCost: number;
  };
  specifications?: {
    vCPU: number;
    memory: number;
    networkPerformance: number;
    dedicatedEbsThroughput: number;
    gpu?: number;
    gpuMemory?: number;
  };
  pricingDetails?: {
    family: string;
    size: string;
    operationCode: string;
    tenancyType: string;
    currentGeneration: boolean;
    instanceFamily: string;
    physicalProcessor: string;
    clockSpeed: number;
    processorFeatures: string;
  };
} | null {
  try {
    // Parse instance type (e.g., "m5.large" -> family: "m5", size: "large")
    const match = instanceType.match(/^([a-z0-9]+)\.(.+)$/);
    if (!match) return null;
    
    const [, family, size] = match;
    const operationCode = getOperationCode(platform);
    const tenancyType = tenancy === 'dedicated' ? 'Dedicated' : 'Shared';
    
    // Find pricing in the data structure
    const familyData = pricingData[family];
    if (!familyData || !familyData.sizes || !familyData.sizes[size]) {
      return null;
    }
    
    const sizeData = familyData.sizes[size];
    if (!sizeData.operations || !sizeData.operations[operationCode]) {
      return null;
    }
    
    const regionPricing = sizeData.operations[operationCode][region];
    if (!regionPricing) return null;
    
    // Parse pricing string (comma-separated values)
    const prices = regionPricing.split(',').map((p: string) => parseFloat(p) || 0);
    
    // Get OnDemand price (position 0 for Shared, position 7 for Dedicated)
    const onDemandPriceIndex = tenancyType === 'Dedicated' ? 7 : 0;
    const onDemandHourlyCost = prices[onDemandPriceIndex];
    
    // Get 3-year no-upfront Compute Savings Plan price (position 4 for Shared, position 11 for Dedicated)
    const savingsPlanPriceIndex = tenancyType === 'Dedicated' ? 11 : 4;
    const savingsPlanHourlyCost = prices[savingsPlanPriceIndex];
    
    if (onDemandHourlyCost <= 0) return null;
    
    // Extract specifications
    const specifications = {
      vCPU: sizeData['vCPU, cores'] || 0,
      memory: sizeData['Memory, GB'] || 0,
      networkPerformance: sizeData['Network Performance, Mbps'] || 0,
      dedicatedEbsThroughput: sizeData['Dedicated EBS Throughput, Mbps'] || 0,
      ...(sizeData['GPU, cores'] > 0 && { gpu: sizeData['GPU, cores'] }),
      ...(sizeData['GPU Memory, GB'] > 0 && { gpuMemory: sizeData['GPU Memory, GB'] })
    };
    
    // Extract pricing details
    const pricingDetails = {
      family,
      size,
      operationCode,
      tenancyType,
      currentGeneration: familyData['Current Generation'] === 'Yes',
      instanceFamily: familyData['Instance Family'] || '',
      physicalProcessor: familyData['Physical Processor'] || '',
      clockSpeed: familyData['Clock Speed, GHz'] || 0,
      processorFeatures: familyData['Processor Features'] || ''
    };
    
    return {
      onDemandCost: {
        hourlyCost: onDemandHourlyCost,
        monthlyCost: onDemandHourlyCost * 730 // 730 hours per month (average)
      },
      savingsPlanCost: {
        hourlyCost: savingsPlanHourlyCost || 0,
        monthlyCost: (savingsPlanHourlyCost || 0) * 730 // 730 hours per month (average)
      },
      specifications,
      pricingDetails
    };
  } catch (error) {
    return null;
  }
}

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
    
    // Format cost information
    let costInfo = '';
    if (instance.cost) {
      const onDemand = instance.cost.onDemandCost;
      const savingsPlan = instance.cost.savingsPlanCost;
      costInfo = `, ~$${onDemand.hourlyCost.toFixed(4)}/hr ($${onDemand.monthlyCost.toFixed(2)}/mo) OnDemand`;
      if (savingsPlan.hourlyCost > 0) {
        costInfo += `, ~$${savingsPlan.hourlyCost.toFixed(4)}/hr ($${savingsPlan.monthlyCost.toFixed(2)}/mo) 3yr Savings Plan`;
      }
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
    
    return `"${instanceName}" (${state}): ${instanceType} ${platform}, ${uptimeInfo}${costInfo}${volumeInfo}${tagInfo}`;
  });

  return instanceLines.join('\n');
}

export const awsDescribeInstances: Tool = {
  name: 'awsDescribeInstances',
  description: 'Get detailed information about EC2 instances including their configuration, state, and pricing.',
  inputSchema: {
    type: 'object',
    properties: {
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
            cost: {
              type: 'object',
              properties: {
                onDemandCost: {
                  type: 'object',
                  properties: {
                    hourlyCost: { type: 'number' },
                    monthlyCost: { type: 'number' },
                  },
                },
                savingsPlanCost: {
                  type: 'object',
                  properties: {
                    hourlyCost: { type: 'number' },
                    monthlyCost: { type: 'number' },
                  },
                },
                specifications: {
                  type: 'object',
                  properties: {
                    vCPU: { type: 'number' },
                    memory: { type: 'number' },
                    networkPerformance: { type: 'number' },
                    dedicatedEbsThroughput: { type: 'number' },
                    gpu: { type: 'number' },
                    gpuMemory: { type: 'number' },
                  },
                },
                pricingDetails: {
                  type: 'object',
                  properties: {
                    family: { type: 'string' },
                    size: { type: 'string' },
                    operationCode: { type: 'string' },
                    tenancyType: { type: 'string' },
                    currentGeneration: { type: 'boolean' },
                    instanceFamily: { type: 'string' },
                    physicalProcessor: { type: 'string' },
                    clockSpeed: { type: 'number' },
                    processorFeatures: { type: 'string' },
                  },
                },
              },
            },
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
      region: { type: 'string', description: 'AWS region where instances are located (e.g., "us-east-1")' },
      logger: { type: 'object' },
    },
    required: ['credentials', 'region'],
  },
  defaultConfig: {},
  async invoke(input: any, config: { credentials?: any; region: string; logger?: Logger }): Promise<any> {
    const { instanceIds, filters, maxResults } = input;
    const { region, logger } = config;

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

      // Get pricing data
      const pricingData = await getPricingData(logger);

      // Merge volume data and add cost information
      const enrichedInstances = instances.map(instance => {
        if (!instance) return null;
        
        const volumes = instance.instanceId ? (volumesByInstance[instance.instanceId] || []) : [];
        const cost = pricingData ? calculateInstanceCost(
          instance.instanceType || '',
          instance.platform || '',
          instance.region || '',
          instance.tenancy || '',
          pricingData
        ) : null;
        
        return {
          ...instance,
          volumes,
          cost,
        };
      }).filter(Boolean);
      
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
