/**
 * Pool Discovery Integration Tests
 * 
 * End-to-end tests for the pool discovery system including event processing,
 * subscription matching, and registry operations.
 */

import { PoolDiscoveryService } from '../core/PoolDiscoveryService';
import { CurrencyPairNormalizer } from '../core/CurrencyPairNormalizer';
import { SubscriptionMatcher } from '../core/SubscriptionMatcher';
import { PoolInfoExtractor } from '../core/PoolInfoExtractor';
import { PoolRegistry } from '../storage/PoolRegistry';
import { SubscriptionRegistry } from '../storage/SubscriptionRegistry';
import { InitializeEvent } from '../types/EventTypes';
import { EndogenousVariableSubscription } from '../types/SubscriptionTypes';

describe('Pool Discovery Integration Tests', () => {
  let discoveryService: PoolDiscoveryService;
  let normalizer: CurrencyPairNormalizer;
  let matcher: SubscriptionMatcher;
  let extractor: PoolInfoExtractor;
  let poolRegistry: PoolRegistry;
  let subscriptionRegistry: SubscriptionRegistry;

  beforeEach(() => {
    normalizer = new CurrencyPairNormalizer();
    matcher = new SubscriptionMatcher();
    extractor = new PoolInfoExtractor();
    poolRegistry = new PoolRegistry();
    subscriptionRegistry = new SubscriptionRegistry();

    discoveryService = new PoolDiscoveryService(
      normalizer,
      matcher,
      extractor,
      poolRegistry,
      subscriptionRegistry
    );
  });

  describe('End-to-End Pool Discovery Flow', () => {
    it('should discover pool and match with subscription', async () => {
      // Create subscription
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      // Register subscription
      await discoveryService.registerSubscription(subscription);

      // Create Initialize event
      const initializeEvent: InitializeEvent = {
        id: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x1111111111111111111111111111111111111111',
        sqrtPriceX96: '79228162514264337593543950336',
        tick: 0,
        blockNumber: 1000000,
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now()
      };

      // Process event
      const result = await discoveryService.processInitializeEvent(initializeEvent);

      // Verify result
      expect(result).not.toBeNull();
      expect(result!.poolInfo.poolId).toBe(initializeEvent.id);
      expect(result!.matchingSubscriptions).toHaveLength(1);
      expect(result!.matchingSubscriptions[0].id).toBe('sub-1');

      // Verify pool is registered
      const pool = await discoveryService.getPoolById(initializeEvent.id);
      expect(pool).not.toBeNull();
      expect(pool!.poolId).toBe(initializeEvent.id);

      // Verify subscription is linked to pool
      const poolSubscriptions = await discoveryService.getSubscriptionsForPool(initializeEvent.id);
      expect(poolSubscriptions).toHaveLength(1);
      expect(poolSubscriptions[0].id).toBe('sub-1');
    });

    it('should handle multiple subscriptions for same currency pair', async () => {
      // Create multiple subscriptions for same currency pair
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
          variableType: 'price-efficiency',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          parameters: { priceWeight: 0.6, volumeWeight: 0.4 },
          createdAt: Date.now(),
          isActive: true
        }
      ];

      // Register subscriptions
      for (const subscription of subscriptions) {
        await discoveryService.registerSubscription(subscription);
      }

      // Create Initialize event
      const initializeEvent: InitializeEvent = {
        id: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x1111111111111111111111111111111111111111',
        sqrtPriceX96: '79228162514264337593543950336',
        tick: 0,
        blockNumber: 1000000,
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now()
      };

      // Process event
      const result = await discoveryService.processInitializeEvent(initializeEvent);

      // Verify result
      expect(result).not.toBeNull();
      expect(result!.matchingSubscriptions).toHaveLength(2);
      expect(result!.matchingSubscriptions.map(s => s.id)).toContain('sub-1');
      expect(result!.matchingSubscriptions.map(s => s.id)).toContain('sub-2');
    });

    it('should handle hooks filtering', async () => {
      // Create subscription with hooks filter
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        hooks: ['0x1111111111111111111111111111111111111111'],
        createdAt: Date.now(),
        isActive: true
      };

      // Register subscription
      await discoveryService.registerSubscription(subscription);

      // Create Initialize event with matching hooks
      const matchingEvent: InitializeEvent = {
        id: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x1111111111111111111111111111111111111111',
        sqrtPriceX96: '79228162514264337593543950336',
        tick: 0,
        blockNumber: 1000000,
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now()
      };

      // Process matching event
      const matchingResult = await discoveryService.processInitializeEvent(matchingEvent);
      expect(matchingResult).not.toBeNull();
      expect(matchingResult!.matchingSubscriptions).toHaveLength(1);

      // Create Initialize event with non-matching hooks
      const nonMatchingEvent: InitializeEvent = {
        id: '0x2222222222222222222222222222222222222222222222222222222222222222222222',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x2222222222222222222222222222222222222222',
        sqrtPriceX96: '79228162514264337593543950336',
        tick: 0,
        blockNumber: 1000001,
        transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        timestamp: Date.now()
      };

      // Process non-matching event
      const nonMatchingResult = await discoveryService.processInitializeEvent(nonMatchingEvent);
      expect(nonMatchingResult).toBeNull();
    });

    it('should handle no matching subscriptions', async () => {
      // Create subscription for different currency pair
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x9999999999999999999999999999999999999999',
        currency1: '0x8888888888888888888888888888888888888888',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      // Register subscription
      await discoveryService.registerSubscription(subscription);

      // Create Initialize event for different currency pair
      const initializeEvent: InitializeEvent = {
        id: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x1111111111111111111111111111111111111111',
        sqrtPriceX96: '79228162514264337593543950336',
        tick: 0,
        blockNumber: 1000000,
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now()
      };

      // Process event
      const result = await discoveryService.processInitializeEvent(initializeEvent);

      // Verify no match
      expect(result).toBeNull();
    });
  });

  describe('Subscription Management', () => {
    it('should register and unregister subscriptions', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      // Register subscription
      await discoveryService.registerSubscription(subscription);
      expect(await discoveryService.getSubscription('sub-1')).not.toBeNull();

      // Unregister subscription
      await discoveryService.unregisterSubscription('sub-1');
      expect(await discoveryService.getSubscription('sub-1')).toBeNull();
    });

    it('should get pools for subscription', async () => {
      // Create subscription
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: { volumeWeight: 0.4, liquidityWeight: 0.3, tvlWeight: 0.3 },
        createdAt: Date.now(),
        isActive: true
      };

      await discoveryService.registerSubscription(subscription);

      // Create and process multiple events
      const events: InitializeEvent[] = [
        {
          id: '0x1111111111111111111111111111111111111111111111111111111111111111',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          fee: 3000,
          tickSpacing: 60,
          hooks: '0x1111111111111111111111111111111111111111',
          sqrtPriceX96: '79228162514264337593543950336',
          tick: 0,
          blockNumber: 1000000,
          transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          timestamp: Date.now()
        },
        {
          id: '0x2222222222222222222222222222222222222222222222222222222222222222',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          fee: 5000,
          tickSpacing: 100,
          hooks: '0x2222222222222222222222222222222222222222',
          sqrtPriceX96: '79228162514264337593543950336',
          tick: 0,
          blockNumber: 1000001,
          transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
          timestamp: Date.now()
        }
      ];

      for (const event of events) {
        await discoveryService.processInitializeEvent(event);
      }

      // Get pools for subscription
      const pools = await discoveryService.getPoolsForSubscription('sub-1');
      expect(pools).toHaveLength(2);
      expect(pools.map(p => p.poolId)).toContain('0x1111111111111111111111111111111111111111111111111111111111111111');
      expect(pools.map(p => p.poolId)).toContain('0x2222222222222222222222222222222222222222222222222222222222222222');
    });
  });

  describe('Service Statistics', () => {
    it('should provide service statistics', async () => {
      // Create subscriptions
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
        await discoveryService.registerSubscription(subscription);
      }

      // Create and process events
      const events: InitializeEvent[] = [
        {
          id: '0x1111111111111111111111111111111111111111111111111111111111111111',
          currency0: '0x1234567890123456789012345678901234567890',
          currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          fee: 3000,
          tickSpacing: 60,
          hooks: '0x1111111111111111111111111111111111111111',
          sqrtPriceX96: '79228162514264337593543950336',
          tick: 0,
          blockNumber: 1000000,
          transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          timestamp: Date.now()
        }
      ];

      for (const event of events) {
        await discoveryService.processInitializeEvent(event);
      }

      // Get statistics
      const stats = await discoveryService.getServiceStats();

      expect(stats.pools.total).toBe(1);
      expect(stats.subscriptions.total).toBe(2);
      expect(stats.subscriptions.active).toBe(1);
      expect(stats.matches.totalPools).toBe(1);
      expect(stats.matches.totalSubscriptions).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid events gracefully', async () => {
      const invalidEvent = {
        id: '',
        currency0: '',
        currency1: '',
        fee: -1,
        tickSpacing: -1,
        hooks: '',
        sqrtPriceX96: '',
        tick: 0,
        blockNumber: -1,
        transactionHash: '',
        timestamp: -1
      } as InitializeEvent;

      await expect(discoveryService.processInitializeEvent(invalidEvent)).rejects.toThrow();
    });

    it('should handle duplicate pool registrations', async () => {
      const subscription: EndogenousVariableSubscription = {
        id: 'sub-1',
        variableType: 'volume-liquidity-efficiency',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        parameters: {},
        createdAt: Date.now(),
        isActive: true
      };

      await discoveryService.registerSubscription(subscription);

      const event: InitializeEvent = {
        id: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
        currency0: '0x1234567890123456789012345678901234567890',
        currency1: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x1111111111111111111111111111111111111111',
        sqrtPriceX96: '79228162514264337593543950336',
        tick: 0,
        blockNumber: 1000000,
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now()
      };

      // Process event first time
      await discoveryService.processInitializeEvent(event);

      // Try to process same event again
      await expect(discoveryService.processInitializeEvent(event)).rejects.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should provide health status', async () => {
      const health = await discoveryService.healthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.pools).toBe(0);
      expect(health.subscriptions).toBe(0);
      expect(health.activeSubscriptions).toBe(0);
      expect(health.errors).toHaveLength(0);
    });
  });
});
