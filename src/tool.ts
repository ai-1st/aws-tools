// src/tool.ts

import { Logger } from './logger.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  outputSchema: object;
  configSchema?: object;
  defaultConfig?: object;
  invoke(input: any, config: { credentials?: any; region: string; logger?: Logger }): Promise<any>;
}
