// src/tool.ts

import { Logger } from './logger';

export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  outputSchema: object;
  configSchema?: object;
  defaultConfig?: object;
  invoke(input: any, config: { credentials?: any; logger?: Logger }): Promise<any>;
}
