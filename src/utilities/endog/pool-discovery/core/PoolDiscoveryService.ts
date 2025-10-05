/**
 * Pool Discovery Service
 * 
 * Main orchestration service for pool discovery that coordinates between
 * normalizers, matchers, extractors, and registries to process Initialize events
 * and match them with endogenous variable subscriptions.
 */

import { PoolId, PoolInfo } from '../types/PoolManagerTypes';
import { 
  EndogenousVariableSubscription, 
  PoolMatch,
  CurrencyPair 
} from '../types/SubscriptionTypes';
import { InitializeEvent } from '../types/PoolManagerTypes';
import { CurrencyPairNormalizer } from './CurrencyPairNormalizer';
import { SubscriptionMatcher } from './SubscriptionMatcher';
import { PoolInfoExtractor } from './PoolInfoExtractor';
import { PoolRegistry } from '../storage/PoolRegistry';
import { SubscriptionRegistry } from '../storage/SubscriptionRegistry';

/**
 * Main orchestration service for pool discovery
 */
export class PoolDiscoveryService {
  constructor(
    private normalizer: CurrencyPairNormalizer,
    private matcher: SubscriptionMatcher,
    private extractor: PoolInfoExtractor,
    private poolRegistry: PoolRegistry,
    private subscriptionRegistry: SubscriptionRegistry
  ) {}

  /**
   * Process Initialize event from PoolManager
   * 
   * @param event Initialize event to process
   * @returns Pool match result or null if no matches
   */
  async processInitializeEvent(event: InitializeEvent): Promise<PoolMatch | null> {
    try {
      // Extract pool information from event
      const poolInfo = this.extractor.extractFromEvent(event);
      
      // Validate pool information
      if (!this.extractor.validatePoolInfo(poolInfo)) {
        throw new Error('Invalid pool information extracted from event');
      }

      // Normalize currency pair for matching
      const normalizedPair = this.normalizer.normalize(
        poolInfo.currency0,
        poolInfo.currency1
      );

      // Find matching subscriptions
      const allMatchingSubscriptions = await this.matcher.findMatchingSubscriptions(
        normalizedPair
      );

      // Filter by hooks if pool has hooks
      const matchingSubscriptions = allMatchingSubscriptions.filter(subscription => {
        // If subscription has no hooks filter, it matches any pool
        if (!subscription.hooks || subscription.hooks.length === 0) {
          return true;
        }
        
        // If subscription has hooks filter, it must match the pool's hooks
        return subscription.hooks.includes(poolInfo.hooks);
      });

      // If no matches, return null
      if (matchingSubscriptions.length === 0) {
        return null;
      }

      // Register pool in registry
      await this.poolRegistry.registerPool(poolInfo);

      // Link pool to matching subscriptions
      for (const subscription of matchingSubscriptions) {
        await this.subscriptionRegistry.linkPoolToSubscription(
          poolInfo.poolId,
          subscription.id
        );
      }

      return {
        poolInfo,
        matchingSubscriptions
      };
    } catch (error) {
      throw new Error(`Failed to process Initialize event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register new endogenous variable subscription
   * 
   * @param subscription Subscription to register
   */
  async registerSubscription(
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    try {
      // Register in subscription registry
      await this.subscriptionRegistry.registerSubscription(subscription);
      
      // Index in matcher for fast lookup
      await this.matcher.indexSubscription(subscription);
    } catch (error) {
      throw new Error(`Failed to register subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unregister subscription
   * 
   * @param subscriptionId Subscription ID to unregister
   */
  async unregisterSubscription(subscriptionId: string): Promise<void> {
    try {
      // Remove from subscription registry
      await this.subscriptionRegistry.unregisterSubscription(subscriptionId);
      
      // Remove from matcher index
      await this.matcher.removeSubscription(subscriptionId);
    } catch (error) {
      throw new Error(`Failed to unregister subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all discovered pools for a subscription
   * 
   * @param subscriptionId Subscription ID
   * @returns Array of pools for the subscription
   */
  async getPoolsForSubscription(
    subscriptionId: string
  ): Promise<PoolInfo[]> {
    try {
      const subscription = await this.subscriptionRegistry.getSubscription(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Get pools by currency pair
      const pools = await this.poolRegistry.getPoolsByCurrencyPair(
        subscription.currency0,
        subscription.currency1
      );

      // Filter by hooks if specified
      if (subscription.hooks && subscription.hooks.length > 0) {
        return pools.filter(pool => subscription.hooks!.includes(pool.hooks));
      }

      return pools;
    } catch (error) {
      throw new Error(`Failed to get pools for subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all subscriptions for a pool
   * 
   * @param poolId Pool ID
   * @returns Array of subscriptions for the pool
   */
  async getSubscriptionsForPool(poolId: PoolId): Promise<EndogenousVariableSubscription[]> {
    try {
      return await this.subscriptionRegistry.getSubscriptionsForPool(poolId);
    } catch (error) {
      throw new Error(`Failed to get subscriptions for pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pool by ID
   * 
   * @param poolId Pool ID
   * @returns Pool information or null if not found
   */
  async getPoolById(poolId: PoolId): Promise<PoolInfo | null> {
    try {
      return await this.poolRegistry.getPoolById(poolId);
    } catch (error) {
      throw new Error(`Failed to get pool by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get subscription by ID
   * 
   * @param subscriptionId Subscription ID
   * @returns Subscription or null if not found
   */
  async getSubscription(subscriptionId: string): Promise<EndogenousVariableSubscription | null> {
    try {
      return await this.subscriptionRegistry.getSubscription(subscriptionId);
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all pools
   * 
   * @returns Array of all discovered pools
   */
  async getAllPools(): Promise<PoolInfo[]> {
    try {
      return await this.poolRegistry.getAllPools();
    } catch (error) {
      throw new Error(`Failed to get all pools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all subscriptions
   * 
   * @returns Array of all subscriptions
   */
  async getAllSubscriptions(): Promise<EndogenousVariableSubscription[]> {
    try {
      return await this.subscriptionRegistry.getAllSubscriptions();
    } catch (error) {
      throw new Error(`Failed to get all subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active subscriptions
   * 
   * @returns Array of active subscriptions
   */
  async getActiveSubscriptions(): Promise<EndogenousVariableSubscription[]> {
    try {
      return await this.subscriptionRegistry.getActiveSubscriptions();
    } catch (error) {
      throw new Error(`Failed to get active subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get service statistics
   * 
   * @returns Comprehensive service statistics
   */
  async getServiceStats(): Promise<{
    pools: {
      total: number;
      byHooks: Map<string, number>;
      byCurrency: Map<string, number>;
    };
    subscriptions: {
      total: number;
      active: number;
      byVariableType: Map<string, number>;
      byCurrencyPair: Map<string, number>;
    };
    matches: {
      totalPools: number;
      totalSubscriptions: number;
      averageSubscriptionsPerPool: number;
    };
  }> {
    try {
      const poolStats = await this.poolRegistry.getRegistryStats();
      const subscriptionStats = await this.subscriptionRegistry.getRegistryStats();

      return {
        pools: {
          total: poolStats.totalPools,
          byHooks: poolStats.poolsByHooks,
          byCurrency: poolStats.poolsByCurrency
        },
        subscriptions: {
          total: subscriptionStats.totalSubscriptions,
          active: subscriptionStats.activeSubscriptions,
          byVariableType: subscriptionStats.subscriptionsByVariableType,
          byCurrencyPair: subscriptionStats.subscriptionsByCurrencyPair
        },
        matches: {
          totalPools: poolStats.totalPools,
          totalSubscriptions: subscriptionStats.totalSubscriptions,
          averageSubscriptionsPerPool: subscriptionStats.averageSubscriptionsPerPool
        }
      };
    } catch (error) {
      throw new Error(`Failed to get service statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search pools with criteria
   * 
   * @param criteria Search criteria
   * @returns Array of matching pools
   */
  async searchPools(criteria: {
    currency0?: string;
    currency1?: string;
    hooks?: string;
    fee?: number;
    tickSpacing?: number;
  }): Promise<PoolInfo[]> {
    try {
      return await this.poolRegistry.getPoolsByCriteria(criteria);
    } catch (error) {
      throw new Error(`Failed to search pools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search subscriptions with criteria
   * 
   * @param criteria Search criteria
   * @returns Array of matching subscriptions
   */
  async searchSubscriptions(criteria: {
    variableType?: string;
    currency0?: string;
    currency1?: string;
    isActive?: boolean;
    hooks?: string[];
  }): Promise<EndogenousVariableSubscription[]> {
    try {
      return await this.subscriptionRegistry.searchSubscriptions(criteria);
    } catch (error) {
      throw new Error(`Failed to search subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      await this.poolRegistry.clearAllPools();
      await this.subscriptionRegistry.clearAllSubscriptions();
      await this.matcher.clearAllSubscriptions();
    } catch (error) {
      throw new Error(`Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    pools: number;
    subscriptions: number;
    activeSubscriptions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let isHealthy = true;

    try {
      const poolCount = await this.poolRegistry.getPoolCount();
      const subscriptionCount = await this.subscriptionRegistry.getSubscriptionCount();
      const activeSubscriptionCount = await this.subscriptionRegistry.getActiveSubscriptionCount();

      return {
        isHealthy,
        pools: poolCount,
        subscriptions: subscriptionCount,
        activeSubscriptions: activeSubscriptionCount,
        errors
      };
    } catch (error) {
      isHealthy = false;
      errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isHealthy,
        pools: 0,
        subscriptions: 0,
        activeSubscriptions: 0,
        errors
      };
    }
  }
}
