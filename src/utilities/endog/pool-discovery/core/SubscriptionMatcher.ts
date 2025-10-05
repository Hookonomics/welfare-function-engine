/**
 * Subscription Matcher
 * 
 * Matches pools to endogenous variable subscriptions using in-memory hash maps
 * for O(1) lookup performance. Supports currency pair matching and hooks filtering.
 */

import { Currency, IHooks } from '../types/PoolManagerTypes';
import { 
  EndogenousVariableSubscription, 
  CurrencyPair, 
  matchesCurrencyPair, 
  matchesHooksFilter,
  isSubscriptionActive 
} from '../types/SubscriptionTypes';
import { CurrencyPairNormalizer } from './CurrencyPairNormalizer';

/**
 * Matches pools to endogenous variable subscriptions
 * Uses in-memory hash map for O(1) lookup
 */
export class SubscriptionMatcher {
  private subscriptionIndex: Map<string, EndogenousVariableSubscription[]>;
  private subscriptionById: Map<string, EndogenousVariableSubscription>;
  private normalizer: CurrencyPairNormalizer;

  constructor() {
    this.subscriptionIndex = new Map();
    this.subscriptionById = new Map();
    this.normalizer = new CurrencyPairNormalizer();
  }

  /**
   * Find subscriptions matching the currency pair
   * 
   * @param normalizedPair Normalized currency pair
   * @param hooks Optional hooks address for filtering
   * @returns Array of matching subscriptions
   */
  async findMatchingSubscriptions(
    normalizedPair: CurrencyPair,
    hooks?: IHooks
  ): Promise<EndogenousVariableSubscription[]> {
    const key = this.normalizer.createKey(normalizedPair);
    const subscriptions = this.subscriptionIndex.get(key) || [];
    
    // Filter by hooks if specified
    if (hooks) {
      return subscriptions.filter(subscription => {
        if (!isSubscriptionActive(subscription)) {
          return false;
        }
        
        // If subscription has no hooks filter, it doesn't match when hooks are specified
        if (!subscription.hooks || subscription.hooks.length === 0) {
          return false;
        }
        
        // If subscription has hooks filter, it must match the specified hooks
        return subscription.hooks.includes(hooks);
      });
    }
    
    // Return only active subscriptions
    return subscriptions.filter(isSubscriptionActive);
  }

  /**
   * Index a new subscription for fast lookup
   * 
   * @param subscription Subscription to index
   */
  async indexSubscription(
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    // Validate subscription
    if (!subscription.id) {
      throw new Error('Subscription ID is required');
    }

    if (!subscription.currency0 || !subscription.currency1) {
      throw new Error('Both currencies are required');
    }

    // Normalize currency pair
    const normalizedPair = this.normalizer.normalize(
      subscription.currency0,
      subscription.currency1
    );

    // Create index key
    const key = this.normalizer.createKey(normalizedPair);

    // Add to index
    if (!this.subscriptionIndex.has(key)) {
      this.subscriptionIndex.set(key, []);
    }

    const existingSubscriptions = this.subscriptionIndex.get(key)!;
    
    // Check for duplicate subscription ID
    const existingIndex = existingSubscriptions.findIndex(
      sub => sub.id === subscription.id
    );

    if (existingIndex >= 0) {
      // Update existing subscription
      existingSubscriptions[existingIndex] = subscription;
    } else {
      // Add new subscription
      existingSubscriptions.push(subscription);
    }

    // Update by-ID index
    this.subscriptionById.set(subscription.id, subscription);
  }

  /**
   * Remove subscription from index
   * 
   * @param subscriptionId Subscription ID to remove
   */
  async removeSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptionById.get(subscriptionId);
    if (!subscription) {
      return; // Subscription not found
    }

    // Remove from currency pair index
    const normalizedPair = this.normalizer.normalize(
      subscription.currency0,
      subscription.currency1
    );
    const key = this.normalizer.createKey(normalizedPair);
    
    const subscriptions = this.subscriptionIndex.get(key);
    if (subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index >= 0) {
        subscriptions.splice(index, 1);
        
        // Remove key if no subscriptions left
        if (subscriptions.length === 0) {
          this.subscriptionIndex.delete(key);
        }
      }
    }

    // Remove from by-ID index
    this.subscriptionById.delete(subscriptionId);
  }

  /**
   * Update existing subscription
   * 
   * @param subscriptionId Subscription ID to update
   * @param updates Partial subscription updates
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<EndogenousVariableSubscription>
  ): Promise<void> {
    const existingSubscription = this.subscriptionById.get(subscriptionId);
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
    await this.removeSubscription(subscriptionId);

    // Add updated subscription
    await this.indexSubscription(updatedSubscription);
  }

  /**
   * Get subscription by ID
   * 
   * @param subscriptionId Subscription ID
   * @returns Subscription or null if not found
   */
  async getSubscription(subscriptionId: string): Promise<EndogenousVariableSubscription | null> {
    return this.subscriptionById.get(subscriptionId) || null;
  }

  /**
   * Get all subscriptions
   * 
   * @returns Array of all subscriptions
   */
  async getAllSubscriptions(): Promise<EndogenousVariableSubscription[]> {
    return Array.from(this.subscriptionById.values());
  }

  /**
   * Get active subscriptions
   * 
   * @returns Array of active subscriptions
   */
  async getActiveSubscriptions(): Promise<EndogenousVariableSubscription[]> {
    return Array.from(this.subscriptionById.values()).filter(isSubscriptionActive);
  }

  /**
   * Get subscriptions by variable type
   * 
   * @param variableType Variable type to filter by
   * @returns Array of matching subscriptions
   */
  async getSubscriptionsByVariableType(
    variableType: string
  ): Promise<EndogenousVariableSubscription[]> {
    return Array.from(this.subscriptionById.values()).filter(
      subscription => subscription.variableType === variableType
    );
  }

  /**
   * Get subscriptions by hooks address
   * 
   * @param hooks Hooks address to filter by
   * @returns Array of matching subscriptions
   */
  async getSubscriptionsByHooks(hooks: IHooks): Promise<EndogenousVariableSubscription[]> {
    return Array.from(this.subscriptionById.values()).filter(
      subscription => 
        isSubscriptionActive(subscription) && 
        matchesHooksFilter(subscription, hooks)
    );
  }

  /**
   * Check if subscription exists
   * 
   * @param subscriptionId Subscription ID to check
   * @returns True if subscription exists
   */
  async hasSubscription(subscriptionId: string): Promise<boolean> {
    return this.subscriptionById.has(subscriptionId);
  }

  /**
   * Get subscription count
   * 
   * @returns Total number of subscriptions
   */
  async getSubscriptionCount(): Promise<number> {
    return this.subscriptionById.size;
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
   * Clear all subscriptions
   */
  async clearAllSubscriptions(): Promise<void> {
    this.subscriptionIndex.clear();
    this.subscriptionById.clear();
  }

  /**
   * Get subscription statistics
   * 
   * @returns Statistics about subscriptions
   */
  async getSubscriptionStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    subscriptionsByVariableType: Map<string, number>;
    subscriptionsByHooks: Map<IHooks, number>;
    currencyPairCount: number;
  }> {
    const subscriptions = await this.getAllSubscriptions();
    const activeSubscriptions = await this.getActiveSubscriptions();
    
    const subscriptionsByVariableType = new Map<string, number>();
    const subscriptionsByHooks = new Map<IHooks, number>();
    
    for (const subscription of subscriptions) {
      // Count by variable type
      const count = subscriptionsByVariableType.get(subscription.variableType) || 0;
      subscriptionsByVariableType.set(subscription.variableType, count + 1);
      
      // Count by hooks
      if (subscription.hooks) {
        for (const hooks of subscription.hooks) {
          const count = subscriptionsByHooks.get(hooks) || 0;
          subscriptionsByHooks.set(hooks, count + 1);
        }
      }
    }

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      subscriptionsByVariableType,
      subscriptionsByHooks,
      currencyPairCount: this.subscriptionIndex.size
    };
  }

  /**
   * Check if subscription matches pool (including hooks filter)
   * 
   * @param subscription Subscription to check
   * @param hooks Hooks address to match against
   * @returns True if subscription matches
   */
  private matchesHooksFilter(
    subscription: EndogenousVariableSubscription,
    hooks: IHooks
  ): boolean {
    return matchesHooksFilter(subscription, hooks);
  }

  /**
   * Find subscriptions by currency pair (exact match)
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Array of matching subscriptions
   */
  async findSubscriptionsByCurrencyPair(
    currency0: Currency,
    currency1: Currency
  ): Promise<EndogenousVariableSubscription[]> {
    const normalizedPair = this.normalizer.normalize(currency0, currency1);
    return this.findMatchingSubscriptions(normalizedPair);
  }

  /**
   * Search subscriptions with filters
   * 
   * @param filters Search filters
   * @returns Array of matching subscriptions
   */
  async searchSubscriptions(filters: {
    variableType?: string;
    currency0?: Currency;
    currency1?: Currency;
    hooks?: IHooks;
    isActive?: boolean;
  }): Promise<EndogenousVariableSubscription[]> {
    let subscriptions = await this.getAllSubscriptions();

    // Filter by variable type
    if (filters.variableType) {
      subscriptions = subscriptions.filter(
        sub => sub.variableType === filters.variableType
      );
    }

    // Filter by currency pair
    if (filters.currency0 && filters.currency1) {
      subscriptions = subscriptions.filter(sub =>
        matchesCurrencyPair(sub, filters.currency0!, filters.currency1!)
      );
    }

    // Filter by hooks
    if (filters.hooks) {
      subscriptions = subscriptions.filter(sub =>
        matchesHooksFilter(sub, filters.hooks!)
      );
    }

    // Filter by active status
    if (filters.isActive !== undefined) {
      subscriptions = subscriptions.filter(sub =>
        sub.isActive === filters.isActive
      );
    }

    return subscriptions;
  }
}
