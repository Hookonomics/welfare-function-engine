/**
 * Subscription Matcher Tests
 * 
 * Tests for the SubscriptionMatcher class including subscription indexing,
 * currency pair matching, hooks filtering, and performance scenarios.
 */

import { SubscriptionMatcher } from '../../../../src/utilities/endog/pool-discovery/core/SubscriptionMatcher';
import { CurrencyPair } from '../../../../src/utilities/endog/pool-discovery/types/SubscriptionTypes';
import { EndogenousVariableSubscription } from '../../../../src/utilities/endog/pool-discovery/types/SubscriptionTypes';

describe('SubscriptionMatcher', () => {
  let matcher: SubscriptionMatcher;

  beforeEach(() => {
    matcher = new SubscriptionMatcher();
  });

  describe('indexSubscription', () => {
    it('should index a subscription successfully', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);
      
      const retrieved = await matcher.getSubscription(subscription.id);
      expect(retrieved).toEqual(subscription);
    });

    it('should throw error for subscription without ID', async () => {
      const subscription = {
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: {},
        createdAt: Date.now(),
        isActive: true
      } as EndogenousVariableSubscription;

      await expect(matcher.indexSubscription(subscription)).rejects.toThrow('Subscription ID is required');
    });

    it('should throw error for subscription without currencies', async () => {
      const subscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        parameters: {},
        createdAt: Date.now(),
        isActive: true
      } as EndogenousVariableSubscription;

      await expect(matcher.indexSubscription(subscription)).rejects.toThrow('Both currencies are required');
    });
  });

  describe('findMatchingSubscriptions', () => {
    beforeEach(async () => {
      // Add test subscriptions
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          currency1: '0x1234567890123456789012345678901234567890',
          parameters: { volumeWeight: 0.5, liquidityWeight: 0.3, tvlWeight: 0.2 },
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-3',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
          hooks: ['0x1111111111111111111111111111111111111111'],
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-4',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
          createdAt: Date.now(),
          isActive: false
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }
    });

    it('should find matching subscriptions for currency pair', async () => {
      const normalizedPair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };

      const matches = await matcher.findMatchingSubscriptions(normalizedPair);
      
      expect(matches).toHaveLength(3);
      expect(matches.map((m: EndogenousVariableSubscription) => m.id)).toContain('sub-1');
      expect(matches.map((m: EndogenousVariableSubscription) => m.id)).toContain('sub-2');
      expect(matches.map((m: EndogenousVariableSubscription) => m.id)).toContain('sub-3');
    });

    it('should filter by hooks when specified', async () => {
      const normalizedPair: CurrencyPair = {
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };

      const matches = await matcher.findMatchingSubscriptions(
        normalizedPair,
        '0x1111111111111111111111111111111111111111'
      );
      
      expect(matches).toHaveLength(1);
      expect(matches[0]!.id).toBe('sub-3');
    });

    it('should return empty array for non-matching currency pair', async () => {
      const normalizedPair: CurrencyPair = {
        currency0: '0x9999999999999999999999999999999999999999',
        currency1: '0x8888888888888888888888888888888888888888'
      };

      const matches = await matcher.findMatchingSubscriptions(normalizedPair);
      
      expect(matches).toHaveLength(0);
    });

    it('should not return inactive subscriptions', async () => {
      const normalizedPair: CurrencyPair = {
        currency0: '0x9876543210987654321098765432109876543210',
        currency1: '0x1111111111111111111111111111111111111111'
      };

      const matches = await matcher.findMatchingSubscriptions(normalizedPair);
      
      expect(matches).toHaveLength(0);
    });
  });

  describe('removeSubscription', () => {
    it('should remove subscription successfully', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);
      expect(await matcher.hasSubscription('sub-1')).toBe(true);

      await matcher.removeSubscription('sub-1');
      expect(await matcher.hasSubscription('sub-1')).toBe(false);
    });

    it('should handle removal of non-existent subscription', async () => {
      await expect(matcher.removeSubscription('non-existent')).resolves.not.toThrow();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);

      await matcher.updateSubscription('sub-1', {
        parameters: { volumeWeight: 0.5, liquidityWeight: 0.3, tvlWeight: 0.2 }
      });

      const updated = await matcher.getSubscription('sub-1');
      expect(updated?.parameters.volumeWeight).toBe(0.5);
    });

    it('should throw error for non-existent subscription', async () => {
      await expect(matcher.updateSubscription('non-existent', {})).rejects.toThrow('Subscription non-existent not found');
    });
  });

  describe('getSubscription', () => {
    it('should return subscription by ID', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);
      const retrieved = await matcher.getSubscription('sub-1');
      
      expect(retrieved).toEqual(subscription);
    });

    it('should return null for non-existent subscription', async () => {
      const retrieved = await matcher.getSubscription('non-existent');
      expect(retrieved).toBe(null);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: {},
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: {},
          createdAt: Date.now(),
          isActive: false
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }

      const all = await matcher.getAllSubscriptions();
      expect(all).toHaveLength(2);
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions', async () => {
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: {},
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: {},
          createdAt: Date.now(),
          isActive: false
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }

      const active = await matcher.getActiveSubscriptions();
      expect(active).toHaveLength(1);
      expect(active[0]!.id).toBe('sub-1');
    });
  });

  describe('getSubscriptionsByVariableType', () => {
    it('should return subscriptions by variable type', async () => {
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: {},
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'price-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: {},
          createdAt: Date.now(),
          isActive: true
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }

      const volumeLiquidity = await matcher.getSubscriptionsByVariableType('volume-liquidity-efficiency');
      expect(volumeLiquidity).toHaveLength(1);
      expect(volumeLiquidity[0]!.id).toBe('sub-1');
    });
  });

  describe('getSubscriptionsByHooks', () => {
    it('should return subscriptions by hooks', async () => {
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: {},
          hooks: ['0x1111111111111111111111111111111111111111'],
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: {},
          hooks: ['0x2222222222222222222222222222222222222222'],
          createdAt: Date.now(),
          isActive: true
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }

      const hooks1 = await matcher.getSubscriptionsByHooks('0x1111111111111111111111111111111111111111');
      expect(hooks1).toHaveLength(1);
      expect(hooks1[0]!.id).toBe('sub-1');
    });
  });

  describe('getSubscriptionCount', () => {
    it('should return correct subscription count', async () => {
      expect(await matcher.getSubscriptionCount()).toBe(0);

      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: {},
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);
      expect(await matcher.getSubscriptionCount()).toBe(1);
    });
  });

  describe('clearAllSubscriptions', () => {
    it('should clear all subscriptions', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: {},
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);
      expect(await matcher.getSubscriptionCount()).toBe(1);

      await matcher.clearAllSubscriptions();
      expect(await matcher.getSubscriptionCount()).toBe(0);
    });
  });

  describe('getSubscriptionStats', () => {
    it('should return correct statistics', async () => {
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: {},
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: {},
          createdAt: Date.now(),
          isActive: false
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }

      const stats = await matcher.getSubscriptionStats();
      
      expect(stats.totalSubscriptions).toBe(2);
      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.subscriptionsByVariableType.get('volume-liquidity-efficiency')).toBe(2);
    });
  });

  describe('findSubscriptionsByCurrencyPair', () => {
    it('should find subscriptions by currency pair', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: {},
        createdAt: Date.now(),
        isActive: true
      };

      await matcher.indexSubscription(subscription);

      const matches = await matcher.findSubscriptionsByCurrencyPair(
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );

      expect(matches).toHaveLength(1);
      expect(matches[0]!.id).toBe('sub-1');
    });
  });

  describe('searchSubscriptions', () => {
    it('should search subscriptions with filters', async () => {
      const subscriptions: EndogenousVariableSubscription[] = [
        {
          id: 'sub-1',
          variableType: 'volume-liquidity-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: {},
          createdAt: Date.now(),
          isActive: true
        },
        {
          id: 'sub-2',
          variableType: 'price-efficiency',
          currency0: '0x9876543210987654321098765432109876543210',
          currency1: '0x1111111111111111111111111111111111111111',
          parameters: {},
          createdAt: Date.now(),
          isActive: false
        }
      ];

      for (const subscription of subscriptions) {
        await matcher.indexSubscription(subscription);
      }

      const volumeLiquidity = await matcher.searchSubscriptions({
        variableType: 'volume-liquidity-efficiency'
      });

      expect(volumeLiquidity).toHaveLength(1);
      expect(volumeLiquidity[0]!.id).toBe('sub-1');

      const active = await matcher.searchSubscriptions({
        isActive: true
      });

      expect(active).toHaveLength(1);
      expect(active[0]!.id).toBe('sub-1');
    });
  });
});
