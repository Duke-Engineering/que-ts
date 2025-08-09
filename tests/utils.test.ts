import { intPow, calculateRetryDelay, formatJobArgs, parseJobArgs } from '../src/utils';

describe('utils', () => {
  describe('intPow', () => {
    it('should calculate integer power correctly', () => {
      expect(intPow(2, 3)).toBe(8);
      expect(intPow(5, 2)).toBe(25);
      expect(intPow(10, 0)).toBe(1);
      expect(intPow(3, 1)).toBe(3);
    });

    it('should handle negative exponents', () => {
      expect(intPow(2, -1)).toBe(0);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate correct retry delays', () => {
      expect(calculateRetryDelay(0)).toBe(0);
      expect(calculateRetryDelay(1)).toBe(1);
      expect(calculateRetryDelay(2)).toBe(16);
      expect(calculateRetryDelay(3)).toBe(81);
    });
  });

  describe('formatJobArgs', () => {
    it('should format args as JSON string', () => {
      expect(formatJobArgs(['arg1', 'arg2'])).toBe('["arg1","arg2"]');
      expect(formatJobArgs([{ key: 'value' }])).toBe('[{"key":"value"}]');
      expect(formatJobArgs([])).toBe('[]');
    });
  });

  describe('parseJobArgs', () => {
    it('should return array when given valid JSON array', () => {
      expect(parseJobArgs(['arg1', 'arg2'])).toEqual(['arg1', 'arg2']);
      expect(parseJobArgs([{ key: 'value' }])).toEqual([{ key: 'value' }]);
      expect(parseJobArgs([1, 2, true, null])).toEqual([1, 2, true, null]);
      expect(parseJobArgs([])).toEqual([]);
    });

    it('should throw error for non-array input', () => {
      expect(() => parseJobArgs('invalid string' as any)).toThrow('Expected job arguments to be an array');
      expect(() => parseJobArgs({ key: 'value' } as any)).toThrow('Expected job arguments to be an array');
      expect(() => parseJobArgs(123 as any)).toThrow('Expected job arguments to be an array');
    });
  });
});