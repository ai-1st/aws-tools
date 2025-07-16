# awsDescribeInstances

**Description**: Get detailed information about EC2 instances including their configuration, state, pricing, and attached volumes.

**Input Schema**:
```typescript
{
  region: string                    // Required: AWS region (e.g., "us-east-1")
  instanceIds?: string[]           // Optional: Specific instance IDs to describe
  filters?: Array<{                // Optional: AWS EC2 filters
    name: string
    values: string[]
  }>
  maxResults?: number              // Optional: Maximum results (default: 1000)
  chartTitle?: string              // Optional: Chart title for visualization
}
```

**Output Schema**:
```typescript
{
  summary: string                  // Text summary of EC2 instances with cost information
  datapoints: Array<{
    instanceId: string             // EC2 instance ID
    instanceName: string           // Instance name from Name tag
    instanceType: string           // Instance type (e.g., "m5.large")
    platform: string               // Platform details
    tenancy: string                // Tenancy type
    region: string                 // AWS region
    uptimeHours: number            // Instance uptime in hours
    state: string                  // Instance state
    tags: object                   // Instance tags (excluding Name tag)
    cost?: {                       // Optional: Cost information
      hourlyCost: number           // Hourly cost in USD
      monthlyCost: number          // Monthly cost in USD (730 hours)
    }
    volumes: Array<{               // Attached EBS volumes
      volumeId: string             // Volume ID
      size: number                 // Volume size in GB
      volumeType: string           // Volume type (e.g., "gp2", "io1")
      iops?: number                // IOPS (for io1 volumes)
      encrypted: boolean           // Whether volume is encrypted
    }>
  }>
}
```

**Example Usage**:
```typescript
// Get all instances in us-east-1
{
  region: "us-east-1",
  chartTitle: "EC2 Instances in us-east-1"
}

// Get specific instances with filters
{
  region: "us-west-2",
  instanceIds: ["i-1234567890abcdef0"],
  filters: [
    {
      name: "instance-state-name",
      values: ["running"]
    }
  ],
  chartTitle: "Running EC2 Instances"
}
```

**Features**:
- **Lazy Loading**: Pricing data is downloaded from AWS S3 only when needed
- **Caching**: Pricing data is cached in the system temp directory for 24 hours
- **Cost Calculation**: Automatically calculates hourly and monthly costs for each instance
- **Volume Information**: Includes detailed information about attached EBS volumes
- **Platform Support**: Supports various operating systems and SQL Server editions
- **Tenancy Support**: Handles both Shared and Dedicated tenancy pricing

## Pricing Data

The tool automatically downloads and caches EC2 pricing data from:
`https://cloudfix-public-aws-pricing.s3.us-east-1.amazonaws.com/pricing/ec2_pricing.json.gz`

### Cache Location
Pricing data is cached in: `{temp_dir}/aws-tools-cache/ec2_pricing.json`

### Cache Duration
24 hours - after which fresh data will be downloaded

## Pricing Data JSON Format

The pricing data JSON file has the following structure:

```json
{
  "instance_family_name": {
    "Current Generation": "Yes/No",
    "Instance Family": "General Purpose/Compute Optimized/etc.",
    "Physical Processor": "Intel Xeon/AMD EPYC/etc.",
    "Clock Speed": 2.5,
    "Processor Features": "AVX, AVX2, etc.",
    "Enhanced Networking Supported": "Yes/No",
    "sizes": {
      "instance_size": {
        "vCPU": 2,
        "Memory": 8.0,
        "Ephemeral Storage": 0,
        "Network Performance": 5000,
        "Dedicated EBS Throughput": 650,
        "GPU": 0,
        "GPU Memory": 0,
        "operations": {
          "operation_code": {
            "region": "price1,price2,price3,..."
          }
        }
      }
    }
  }
}
```

### Field Descriptions

#### Instance Family Level Fields

- **Instance Family Name**: The name of the instance family (e.g., "t3a")
- **Current Generation**: Indicates if the instance family is current generation ("Yes") or previous generation ("No")
- **Instance Family**: The AWS classification of the instance family (e.g., "General Purpose", "Compute Optimized")
- **Physical Processor**: The CPU manufacturer and model (e.g., "Intel Xeon Platinum 8175", "AMD EPYC 7R13")
- **Clock Speed**: The processor clock speed in GHz (e.g., 2.5)
- **Processor Features**: Special CPU features or instruction sets (e.g., "AVX, AVX2, Intel AVX-512")
- **Enhanced Networking Supported**: Whether enhanced networking is supported ("Yes" or "No")

#### Instance Size Level Fields

- **Instance Size Name**: The name of the instance size (e.g., "2xlarge")
- **vCPU**: Number of virtual CPUs
- **Memory**: Amount of RAM in GiB
- **Ephemeral Storage**: Amount of instance store storage in GB (0 for EBS-only instances)
- **Network Performance**: Network performance in Mbps
- **Dedicated EBS Throughput**: EBS throughput in Mbps
- **GPU**: Number of GPUs (0 if none)
- **GPU Memory**: Amount of GPU memory in GB (0 if no GPU)

#### Operations and Pricing

The `operations` object contains mappings from operation codes to region-specific pricing. Each region has a comma-separated string of prices with the following positions:

- Position 0: OnDemand price for Shared tenancy
- Position 1: No Upfront 1yr Compute Savings Plan price for Shared tenancy
- Position 2: Partial Upfront 1yr Compute Savings Plan price for Shared tenancy
- Position 3: All Upfront 1yr Compute Savings Plan price for Shared tenancy
- Position 4: No Upfront 3yr Compute Savings Plan price for Shared tenancy
- Position 5: Partial Upfront 3yr Compute Savings Plan price for Shared tenancy
- Position 6: All Upfront 3yr Compute Savings Plan price for Shared tenancy
- Position 7: OnDemand price for Dedicated tenancy
- Position 8: No Upfront 1yr Compute Savings Plan price for Dedicated tenancy
- Position 9: Partial Upfront 1yr Compute Savings Plan price for Dedicated tenancy
- Position 10: All Upfront 1yr Compute Savings Plan price for Dedicated tenancy
- Position 11: No Upfront 3yr Compute Savings Plan price for Dedicated tenancy
- Position 12: Partial Upfront 3yr Compute Savings Plan price for Dedicated tenancy
- Position 13: All Upfront 3yr Compute Savings Plan price for Dedicated tenancy

Empty string values indicate that no pricing is available for that specific combination.

## Operation System to Operation Code Mapping

The following table shows the mapping between operating systems and their corresponding operation codes:

| Operating System | Operation Code |
|------------------|---------------|
| Linux/UNIX | "" (empty string) |
| Red Hat BYOL Linux | "00g0" |
| Red Hat Enterprise Linux | "0010" |
| Red Hat Enterprise Linux with HA | "1010" |
| Red Hat Enterprise Linux with SQL Server Standard and HA | "1014" |
| Red Hat Enterprise Linux with SQL Server Enterprise and HA | "1110" |
| Red Hat Enterprise Linux with SQL Server Standard | "0014" |
| Red Hat Enterprise Linux with SQL Server Web | "0210" |
| Red Hat Enterprise Linux with SQL Server Enterprise | "0110" |
| Linux with SQL Server Enterprise | "0100" |
| Linux with SQL Server Standard | "0004" |
| Linux with SQL Server Web | "0200" |
| SUSE Linux | "000g" |
| Windows | "0002" |
| Windows BYOL | "0800" |
| Windows with SQL Server Enterprise | "0102" |
| Windows with SQL Server Standard | "0006" |
| Windows with SQL Server Web | "0202" |

## Example Output

```json
{
  "summary": "\"web-server-1\" (running): m5.large Linux/UNIX, uptime 5d, ~$0.0960/hr ($70.08/mo), 1×20GB gp2 volume, tags: Environment=Production, Project=WebApp\n\"db-server-1\" (running): r5.xlarge Linux/UNIX, uptime 3d, ~$0.2520/hr ($183.96/mo), 2×100GB gp2+500GB io1 volumes, tags: Environment=Production, Project=Database",
  "datapoints": [
    {
      "instanceId": "i-1234567890abcdef0",
      "instanceName": "web-server-1",
      "instanceType": "m5.large",
      "platform": "Linux/UNIX",
      "tenancy": "default",
      "region": "us-east-1",
      "uptimeHours": 120,
      "state": "running",
      "tags": {
        "Environment": "Production",
        "Project": "WebApp"
      },
      "cost": {
        "hourlyCost": 0.096,
        "monthlyCost": 70.08
      },
      "volumes": [
        {
          "volumeId": "vol-1234567890abcdef0",
          "size": 20,
          "volumeType": "gp2",
          "encrypted": true
        }
      ]
    }
  ]
}
```