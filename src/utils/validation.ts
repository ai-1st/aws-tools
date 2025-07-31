import Ajv from 'ajv';
import { Logger } from '../logger.js';

const ajv = new Ajv({ allErrors: true, verbose: true });

export interface ValidationError extends Error {
  name: 'ValidationError';
  errors: any[];
  schemaType: 'input' | 'config';
}

export function createValidationError(errors: any[], schemaType: 'input' | 'config'): ValidationError {
  const error = new Error(`${schemaType} validation failed`) as ValidationError;
  error.name = 'ValidationError';
  error.errors = errors;
  error.schemaType = schemaType;
  return error;
}

export function validateInput(input: any, inputSchema: object, logger?: Logger): void {
  const validate = ajv.compile(inputSchema);
  const valid = validate(input);
  
  if (!valid) {
    logger?.error('Input validation failed:', validate.errors);
    throw createValidationError(validate.errors || [], 'input');
  }
}

export function validateConfig(config: any, configSchema: object, logger?: Logger): void {
  const validate = ajv.compile(configSchema);
  const valid = validate(config);
  
  if (!valid) {
    logger?.error('Config validation failed:', validate.errors);
    throw createValidationError(validate.errors || [], 'config');
  }
}

export function validateParameters(
  input: any, 
  inputSchema: object, 
  config: any, 
  configSchema?: object, 
  logger?: Logger
): void {
  // Always validate input
  validateInput(input, inputSchema, logger);
  
  // Validate config only if configSchema is provided
  if (configSchema) {
    validateConfig(config, configSchema, logger);
  }
} 