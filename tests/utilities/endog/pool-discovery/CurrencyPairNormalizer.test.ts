/**
 * Currency Pair Normalizer Tests
 * 
 * Tests for the CurrencyPairNormalizer class including normalization,
 * key generation, matching logic, and edge cases.
 */

import { CurrencyPairNormalizer } from '../../../../src/utilities/endog/pool-discovery/core/CurrencyPairNormalizer';
import { Currency } from '../../../../src/utilities/endog/pool-discovery/types/PoolManagerTypes';
import { CurrencyPair } from '../../../../src/utilities/endog/pool-discovery/types/SubscriptionTypes';

describe('CurrencyPairNormalizer', () => {
  let normalizer: CurrencyPairNormalizer;

  beforeEach(() => {
    normalizer = new CurrencyPairNormalizer();
  });

  describe('normalize', () => {
    it('should normalize currency pairs with currency0 < currency1', () => {
      const currency0 = '0x1234567890123456789012345678901234567890';
      const currency1 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      const result = normalizer.normalize(currency0, currency1);
      
      expect(result.currency0).toBe(currency0.toLowerCase());
      expect(result.currency1).toBe(currency1.toLowerCase());
    });

    it('should swap currencies when currency0 > currency1', () => {
      const currency0 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const currency1 = '0x1234567890123456789012345678901234567890';
      
      const result = normalizer.normalize(currency0, currency1);
      
      expect(result.currency0).toBe(currency1.toLowerCase());
      expect(result.currency1).toBe(currency0.toLowerCase());
    });

    it('should handle native ETH (0x0)', () => {
      const currency0 = '0x0000000000000000000000000000000000000000';
      const currency1 = '0x1234567890123456789012345678901234567890';
      
      const result = normalizer.normalize(currency0, currency1);
      
      expect(result.currency0).toBe(currency0);
      expect(result.currency1).toBe(currency1.toLowerCase());
    });

    it('should handle native ETH in different positions', () => {
      const currency0 = '0x1234567890123456789012345678901234567890';
      const currency1 = '0x0000000000000000000000000000000000000000';
      
      const result = normalizer.normalize(currency0, currency1);
      
      expect(result.currency0).toBe(currency1);
      expect(result.currency1).toBe(currency0.toLowerCase());
    });

    it('should handle mixed case addresses', () => {
      const currency0 = '0x1234567890123456789012345678901234567890';
      const currency1 = '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD';
      
      const result = normalizer.normalize(currency0, currency1);
      
      expect(result.currency0).toBe(currency0);
      expect(result.currency1).toBe(currency1.toLowerCase());
    });
  });

  describe('createKey', () => {
    it('should create consistent keys for the same pair', () => {
      const currency0 = '0x1234567890123456789012345678901234567890';
      const currency1 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      // Create pairs with different ordering
      const pair1 = normalizer.normalize(currency0, currency1);
      const pair2 = normalizer.normalize(currency1, currency0);
      
      const key1 = normalizer.createKey(pair1);
      const key2 = normalizer.createKey(pair2);
      
      expect(key1).toBe(key2);
    });

    it('should create different keys for different pairs', () => {
      const pair1: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      const pair2: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0x9876543210987654321098765432109876543210'
      };
      
      const key1 = normalizer.createKey(pair1);
      const key2 = normalizer.createKey(pair2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('matches', () => {
    it('should match identical pairs', () => {
      const pair1: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      const pair2: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      expect(normalizer.matches(pair1, pair2)).toBe(true);
    });

    it('should match pairs with swapped currencies', () => {
      const pair1: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      const pair2: CurrencyPair = {
        currency0: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        currency1: '0x1234567890123456789012345678901234567890'
      };
      
      expect(normalizer.matches(pair1, pair2)).toBe(true);
    });

    it('should not match different pairs', () => {
      const pair1: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      const pair2: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0x9876543210987654321098765432109876543210'
      };
      
      expect(normalizer.matches(pair1, pair2)).toBe(false);
    });
  });

  describe('isNativeETH', () => {
    it('should identify native ETH addresses', () => {
      expect(normalizer.isNativeETH('0x0000000000000000000000000000000000000000')).toBe(true);
      expect(normalizer.isNativeETH('0x0')).toBe(true);
    });

    it('should not identify non-native addresses as native ETH', () => {
      expect(normalizer.isNativeETH('0x1234567890123456789012345678901234567890')).toBe(false);
      expect(normalizer.isNativeETH('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe(false);
    });
  });

  describe('containsNativeETH', () => {
    it('should detect native ETH in currency0', () => {
      const pair: CurrencyPair = {
        currency0: '0x0000000000000000000000000000000000000000',
        currency1: '0x1234567890123456789012345678901234567890'
      };
      
      expect(normalizer.containsNativeETH(pair)).toBe(true);
    });

    it('should detect native ETH in currency1', () => {
      const pair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0x0000000000000000000000000000000000000000'
      };
      
      expect(normalizer.containsNativeETH(pair)).toBe(true);
    });

    it('should not detect native ETH when neither currency is native', () => {
      const pair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      expect(normalizer.containsNativeETH(pair)).toBe(false);
    });
  });

  describe('getNonNativeCurrency', () => {
    it('should return non-native currency when currency0 is native', () => {
      const pair: CurrencyPair = {
        currency0: '0x0000000000000000000000000000000000000000',
        currency1: '0x1234567890123456789012345678901234567890'
      };
      
      expect(normalizer.getNonNativeCurrency(pair)).toBe(pair.currency1);
    });

    it('should return non-native currency when currency1 is native', () => {
      const pair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0x0000000000000000000000000000000000000000'
      };
      
      expect(normalizer.getNonNativeCurrency(pair)).toBe(pair.currency0);
    });

    it('should return null when both currencies are native', () => {
      const pair: CurrencyPair = {
        currency0: '0x0000000000000000000000000000000000000000',
        currency1: '0x0000000000000000000000000000000000000000'
      };
      
      expect(normalizer.getNonNativeCurrency(pair)).toBe(null);
    });

    it('should return null when neither currency is native', () => {
      const pair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      expect(normalizer.getNonNativeCurrency(pair)).toBe(null);
    });
  });

  describe('validatePair', () => {
    it('should validate correct currency pairs', () => {
      const pair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      expect(normalizer.validatePair(pair)).toBe(true);
    });

    it('should reject pairs with same currency', () => {
      const pair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0x1234567890123456789012345678901234567890'
      };
      
      expect(normalizer.validatePair(pair)).toBe(false);
    });

    it('should reject pairs with invalid addresses', () => {
      const pair: CurrencyPair = {
        currency0: 'invalid',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      expect(normalizer.validatePair(pair)).toBe(false);
    });
  });

  describe('createPair', () => {
    it('should create normalized pair from two currencies', () => {
      const currency0 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const currency1 = '0x1234567890123456789012345678901234567890';
      
      const pair = normalizer.createPair(currency0, currency1);
      
      expect(pair.currency0).toBe(currency1.toLowerCase());
      expect(pair.currency1).toBe(currency0.toLowerCase());
    });
  });

  describe('getAllRepresentations', () => {
    it('should return both possible orderings', () => {
      const currency0 = '0x1234567890123456789012345678901234567890';
      const currency1 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      const representations = normalizer.getAllRepresentations(currency0, currency1);
      
      expect(representations).toHaveLength(2);
      expect(representations[0]!.currency0).toBe(currency0.toLowerCase());
      expect(representations[0]!.currency1).toBe(currency1.toLowerCase());
      expect(representations[1]!.currency0).toBe(currency1.toLowerCase());
      expect(representations[1]!.currency1).toBe(currency0.toLowerCase());
    });
  });

  describe('matchesAny', () => {
    it('should return true if pair matches any in array', () => {
      const targetPair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      const pairs: CurrencyPair[] = [
        {
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111'
        },
        {
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        }
      ];
      
      expect(normalizer.matchesAny(targetPair, pairs)).toBe(true);
    });

    it('should return false if pair matches none in array', () => {
      const targetPair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };
      
      const pairs: CurrencyPair[] = [
        {
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111'
        }
      ];
      
      expect(normalizer.matchesAny(targetPair, pairs)).toBe(false);
    });
  });

  describe('getPairStats', () => {
    it('should calculate correct statistics', () => {
      const pairs: CurrencyPair[] = [
        {
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        },
        {
          currency0: '0x0000000000000000000000000000000000000000',
          currency1: '0x1234567890123456789012345678901234567890'
        }
      ];
      
      const stats = normalizer.getPairStats(pairs);
      
      expect(stats.totalPairs).toBe(2);
      expect(stats.nativeETHPairs).toBe(1);
      expect(stats.uniqueCurrencies.size).toBe(3);
      expect(stats.currencyFrequency.get('0x1234567890123456789012345678901234567890')).toBe(2);
    });
  });
});
