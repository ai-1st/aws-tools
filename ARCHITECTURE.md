## AWS Credentials are provided in the config

We need AWS credentials or a session object to be able to make AWS API calls. How do we get them?
1) LLM provides creds as parameters

2) **AWS Credentials are provided in the config**

Reasoning: Security best practices. We don't want to send AWS creds to LLM and back.

## Region is provided in the config

Most AWS API calls are region-bound. Do we want LLM to specify the region in parameters?

1) LLM specifies the region in the parameters

2) **Region is provided in the config**

Reasoning: simplification of LLM instructions. We free the LLM from deciding on which regions and in which order to process. AWS regions should be analyzed one by one independently.

We expect the orchestrator to make an initial awsGetCostAndUsage call without specifying a region to get the initial list of top regions and services.

### Implementation Details

- **Config Schema**: All tools now require `region` in their `configSchema`
- **Input Schema**: Region has been removed from all tool `inputSchema` properties
- **Type Safety**: Updated TypeScript interfaces to reflect the new config structure
- **Tests**: Updated all test files to use region from config instead of input
- **Documentation**: Updated README and individual tool documentation

