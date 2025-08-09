import { JSONArray, JSONValue } from './types';

export function intPow(base: number, exponent: number): number {
  if (exponent < 0) {
    return 0;
  }

  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }

  return result;
}

export function calculateRetryDelay(errorCount: number): number {
  return intPow(errorCount, 4);
}

export function formatJobArgs(args: JSONArray): string {
  return JSON.stringify(args);
}

export function parseJobArgs(args: JSONArray): JSONArray {
  // PostgreSQL JSON column is already parsed by the pg driver
  // Just validate it's an array and return it
  if (!Array.isArray(args)) {
    throw new Error(`Expected job arguments to be an array, received: ${typeof args}`);
  }

  return args;
}
