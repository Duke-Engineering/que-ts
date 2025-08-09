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

export function formatJobArgs(args: any[]): string {
  return JSON.stringify(args);
}

export function parseJobArgs(argsJson: string): any[] {
  try {
    return JSON.parse(argsJson);
  } catch (error) {
    throw new Error(`Invalid job arguments JSON: ${error}`);
  }
}