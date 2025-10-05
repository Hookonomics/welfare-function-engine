/**
 * Subscription Registry
 * 
 * In-memory registry of endogenous variable subscriptions with fast lookup capabilities.
 * Manages subscription lifecycle and pool-subscription relationships.
 */

import { PoolId } from '../types/PoolManagerTypes';
import { EndogenousVariableSubscription } from '../types/SubscriptionTypes';

/**
 * In-memory registry of endogenous variable subscriptions
 */
export class SubscriptionRegistry {
  private subscriptions: Map<string, EndogenousVariableSubscription>;
  private poolSubscriptions: Map<PoolId, string[]>; // poolId -> subscriptionIds
  private subscriptionsByVariableType: Map<string, string[]>; // variableType -> subscriptionIds
  private subscriptionsByCurrencyPair: Map<string, string[]>; // currencyPair -> subscriptionIds

  constructor() {
    this.subscriptions = new Map();
    this.poolSubscriptions = new Map();
    this.subscriptionsByVariableType = new Map();
    this.subscriptionsByCurrencyPair = new Map();
  }

  /**
   * Register subscription
   * 
   * @param subscription Subscription to register
   */
  async registerSubscription(
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    // Validate subscription
    if (!subscription.id) {
      throw new Error('Subscription ID is required');
    }

    if (!subscription.variableType) {
      throw new Error('Variable type is required');
    }

    if (!subscription.currency0 || !subscription.currency1) {
      throw new Error('Both currencies are required');
    }

    // Check for duplicate ID
    if (this.subscriptions.has(subscription.id)) {
      throw new Error(`Subscription ${subscription.id} already exists`);
    }

    // Register subscription
    this.subscriptions.set(subscription.id, subscription);

    // Index by variable type
    if (!this.subscriptionsByVariableType.has(subscription.variableType)) {
      this.subscriptionsByVariableType.set(subscription.variableType, []);
    }
    this.subscriptionsByVariableType.get(subscription.variableType)!.push(subscription.id);

    // Index by currency pair
    const currencyPairKey = this.createCurrencyPairKey(subscription.currency0, subscription.currency1);
    if (!this.subscriptionsByCurrencyPair.has(currencyPairKey)) {
      this.subscriptionsByCurrencyPair.set(currencyPairKey, []);
    }
    this.subscriptionsByCurrencyPair.get(currencyPairKey)!.push(subscription.id);
  }

  /**
   * Unregister subscription
   * 
   * @param subscriptionId Subscription ID to unregister
   */
  async unregisterSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return; // Subscription not found
    }

    // Remove from main registry
    this.subscriptions.delete(subscriptionId);

    // Remove from variable type index
    const variableTypeSubscriptions = this.subscriptionsByVariableType.get(subscription.variableType);
    if (variableTypeSubscriptions) {
      const index = variableTypeSubscriptions.indexOf(subscriptionId);
      if (index >= 0) {
        variableTypeSubscriptions.splice(index, 1);
        if (variableTypeSubscriptions.length === 0) {
          this.subscriptionsByVariableType.delete(subscription.variableType);
        }
      }
    }

    // Remove from currency pair index
    const currencyPairKey = this.createCurrencyPairKey(subscription.currency0, subscription.currency1);
    const currencyPairSubscriptions = this.subscriptionsByCurrencyPair.get(currencyPairKey);
    if (currencyPairSubscriptions) {
      const index = currencyPairSubscriptions.indexOf(subscriptionId);
      if (index >= 0) {
        currencyPairSubscriptions.splice(index, 1);
        if (currencyPairSubscriptions.length === 0) {
          this.subscriptionsByCurrencyPair.delete(currencyPairKey);
        }
      }
    }

    // Remove from all pool relationships
    for (const [poolId, subscriptionIds] of this.poolSubscriptions) {
      const index = subscriptionIds.indexOf(subscriptionId);
      if (index >= 0) {
        subscriptionIds.splice(index, 1);
        if (subscriptionIds.length === 0) {
          this.poolSubscriptions.delete(poolId);
        }
      }
    }
  }

  /**
   * Link pool to subscription
   * 
   * @param poolId Pool ID to link
   * @param subscriptionId Subscription ID to link
   */
  async linkPoolToSubscription(
    poolId: PoolId,
    subscriptionId: string
  ): Promise<void> {
    // Validate subscription exists
    if (!this.subscriptions.has(subscriptionId)) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Add to pool subscriptions
    if (!this.poolSubscriptions.has(poolId)) {
      this.poolSubscriptions.set(poolId, []);
    }

    const subscriptionIds = this.poolSubscriptions.get(poolId)!;
    if (!subscriptionIds.includes(subscriptionId)) {
      subscriptionIds.push(subscriptionId);
    }
  }

  /**
   * Unlink pool from subscription
   * 
   * @param poolId Pool ID to unlink
   * @param subscriptionId Subscription ID to unlink
   */
  async unlinkPoolFromSubscription(
    poolId: PoolId,
    subscriptionId: string
  ): Promise<void> {
    const subscriptionIds = this.poolSubscriptions.get(poolId);
    if (subscriptionIds) {
      const index = subscriptionIds.indexOf(subscriptionId);
      if (index >= 0) {
        subscriptionIds.splice(index, 1);
        if (subscriptionIds.length === 0) {
          this.poolSubscriptions.delete(poolId);
        }
      }
    }
  }

  /**
   * Get subscriptions for pool
   * 
   * @param poolId Pool ID to get subscriptions for
   * @returns Array of subscriptions for the pool
   */
  async getSubscriptionsForPool(poolId: PoolId): Promise<EndogenousVariableSubscription[]> {
    const subscriptionIds = this.poolSubscriptions.get(poolId) || [];
    return subscriptionIds
      .map(id => this.subscriptions.get(id))
      .filter((subscription): subscription is EndogenousVariableSubscription => 
        subscription !== undefined
      );
  }

  /**
   * Get subscription by ID
   * 
   * @param subscriptionId Subscription ID
   * @returns Subscription or null if not found
   */
  async getSubscription(subscriptionId: string): Promise<EndogenousVariableSubscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Get all subscriptions
   * 
   * @returns Array of all subscriptions
   */
  async getAllSubscriptions(): Promise<EndogenousVariableSubscription[]> {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get active subscriptions
   * 
   * @returns Array of active subscriptions
   */
  async getActiveSubscriptions(): Promise<EndogenousVariableSubscription[]> {
    return Array.from(this.subscriptions.values()).filter(subscription => subscription.isActive);
  }

  /**
   * Get subscriptions by variable type
   * 
   * @param variableType Variable type to filter by
   * @returns Array of subscriptions for the variable type
   */
  async getSubscriptionsByVariableType(variableType: string): Promise<EndogenousVariableSubscription[]> {
    const subscriptionIds = this.subscriptionsByVariableType.get(variableType) || [];
    return subscriptionIds
      .map(id => this.subscriptions.get(id))
      .filter((subscription): subscription is EndogenousVariableSubscription => 
        subscription !== undefined
      );
  }

  /**
   * Get subscriptions by currency pair
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Array of subscriptions for the currency pair
   */
  async getSubscriptionsByCurrencyPair(
    currency0: string,
    currency1: string
  ): Promise<EndogenousVariableSubscription[]> {
    const currencyPairKey = this.createCurrencyPairKey(currency0, currency1);
    const subscriptionIds = this.subscriptionsByCurrencyPair.get(currencyPairKey) || [];
    return subscriptionIds
      .map(id => this.subscriptions.get(id))
      .filter((subscription): subscription is EndogenousVariableSubscription => 
        subscription !== undefined
      );
  }

  /**
   * Check if subscription exists
   * 
   * @param subscriptionId Subscription ID to check
   * @returns True if subscription exists
   */
  async hasSubscription(subscriptionId: string): Promise<boolean> {
    return this.subscriptions.has(subscriptionId);
  }

  /**
   * Get subscription count
   * 
   * @returns Total number of subscriptions
   */
  async getSubscriptionCount(): Promise<number> {
    return this.subscriptions.size;
  }

  /**
   * Get active subscription count
   * 
   * @returns Number of active subscriptions
   */
  async getActiveSubscriptionCount(): Promise<number> {
    return (await this.getActiveSubscriptions()).length;
  }

  /**
   * Get pool count
   * 
   * @returns Number of pools with subscriptions
   */
  async getPoolCount(): Promise<number> {
    return this.poolSubscriptions.size;
  }

  /**
   * Get registry statistics
   * 
   * @returns Statistics about subscriptions
   */
  async getRegistryStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    subscriptionsByVariableType: Map<string, number>;
    subscriptionsByCurrencyPair: Map<string, number>;
    totalPools: number;
    averageSubscriptionsPerPool: number;
  }> {
    const allSubscriptions = await this.getAllSubscriptions();
    const activeSubscriptions = await this.getActiveSubscriptions();
    
    const subscriptionsByVariableType = new Map<string, number>();
    const subscriptionsByCurrencyPair = new Map<string, number>();

    for (const subscription of allSubscriptions) {
      // Count by variable type
      const variableTypeCount = subscriptionsByVariableType.get(subscription.variableType) || 0;
      subscriptionsByVariableType.set(subscription.variableType, variableTypeCount + 1);

      // Count by currency pair
      const currencyPairKey = this.createCurrencyPairKey(subscription.currency0, subscription.currency1);
      const currencyPairCount = subscriptionsByCurrencyPair.get(currencyPairKey) || 0;
      subscriptionsByCurrencyPair.set(currencyPairKey, currencyPairCount + 1);
    }

    const totalPools = await this.getPoolCount();
    const averageSubscriptionsPerPool = totalPools > 0 ? allSubscriptions.length / totalPools : 0;

    return {
      totalSubscriptions: allSubscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      subscriptionsByVariableType,
      subscriptionsByCurrencyPair,
      totalPools,
      averageSubscriptionsPerPool
    };
  }

  /**
   * Clear all subscriptions
   */
  async clearAllSubscriptions(): Promise<void> {
    this.subscriptions.clear();
    this.poolSubscriptions.clear();
    this.subscriptionsByVariableType.clear();
    this.subscriptionsByCurrencyPair.clear();
  }

  /**
   * Create currency pair key for indexing
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Normalized currency pair key
   */
  private createCurrencyPairKey(currency0: string, currency1: string): string {
    // Sort currencies lexicographically for consistent indexing
    const sorted = [currency0.toLowerCase(), currency1.toLowerCase()].sort();
    return `${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Update subscription
   * 
   * @param subscriptionId Subscription ID to update
   * @param updates Partial subscription updates
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<EndogenousVariableSubscription>
  ): Promise<void> {
    const existingSubscription = this.subscriptions.get(subscriptionId);
    if (!existingSubscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Create updated subscription
    const updatedSubscription = {
      ...existingSubscription,
      ...updates,
      id: subscriptionId // Ensure ID doesn't change
    };

    // Remove old subscription
    await this.unregisterSubscription(subscriptionId);

    // Register updated subscription
    await this.registerSubscription(updatedSubscription);
  }

  /**
   * Search subscriptions with filters
   * 
   * @param filters Search filters
   * @returns Array of matching subscriptions
   */
  async searchSubscriptions(filters: {
    variableType?: string;
    currency0?: string;
    currency1?: string;
    isActive?: boolean;
    hooks?: string[];
  }): Promise<EndogenousVariableSubscription[]> {
    let subscriptions = await this.getAllSubscriptions();

    // Filter by variable type
    if (filters.variableType) {
      subscriptions = subscriptions.filter(sub => sub.variableType === filters.variableType);
    }

    // Filter by currency0
    if (filters.currency0) {
      subscriptions = subscriptions.filter(sub => sub.currency0 === filters.currency0);
    }

    // Filter by currency1
    if (filters.currency1) {
      subscriptions = subscriptions.filter(sub => sub.currency1 === filters.currency1);
    }

    // Filter by active status
    if (filters.isActive !== undefined) {
      subscriptions = subscriptions.filter(sub => sub.isActive === filters.isActive);
    }

    // Filter by hooks
    if (filters.hooks && filters.hooks.length > 0) {
      subscriptions = subscriptions.filter(sub => 
        sub.hooks && sub.hooks.some(hook => filters.hooks!.includes(hook))
      );
    }

    return subscriptions;
  }
}
