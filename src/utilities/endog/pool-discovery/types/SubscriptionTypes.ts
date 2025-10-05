/**
 * Endogenous Variable Subscription Type Definitions
 * 
 * Defines types for managing endogenous variable subscriptions,
 * including subscription matching, currency pair handling, and pool relationships.
 */

import { Currency, IHooks, PoolId } from './PoolManagerTypes';

/**
 * Endogenous variable subscription
 */
export interface EndogenousVariableSubscription {
  id: string;
  variableType: string; // e.g., "volume-liquidity-efficiency"
  currency0: Currency;
  currency1: Currency;
  parameters: Record<string, any>;
  hooks?: IHooks[]; // Optional: filter by specific hooks
  createdAt: number;
  isActive: boolean;
}

/**
 * Normalized currency pair for consistent matching
 */
export interface CurrencyPair {
  currency0: Currency;
  currency1: Currency;
}

/**
 * Pool match result containing pool info and matching subscriptions
 */
export interface PoolMatch {
  poolInfo: import('./PoolManagerTypes').PoolInfo;
  matchingSubscriptions: EndogenousVariableSubscription[];
}

/**
 * Subscription registration result
 */
export interface SubscriptionRegistrationResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

/**
 * Pool discovery result
 */
export interface PoolDiscoveryResult {
  poolId: PoolId;
  currency0: Currency;
  currency1: Currency;
  hooks: IHooks;
  matchingSubscriptions: string[]; // subscription IDs
  discoveredAt: number;
}

/**
 * Subscription statistics
 */
export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalPools: number;
  poolsByCurrencyPair: Map<string, number>;
  poolsByHooks: Map<IHooks, number>;
}

/**
 * Currency pair matching result
 */
export interface CurrencyPairMatch {
  normalizedPair: CurrencyPair;
  matchingSubscriptions: EndogenousVariableSubscription[];
  hooksFilter?: IHooks;
}

/**
 * Subscription filter options
 */
export interface SubscriptionFilter {
  variableType?: string;
  currency0?: Currency;
  currency1?: Currency;
  hooks?: IHooks[];
  isActive?: boolean;
  createdAfter?: number;
  createdBefore?: number;
}

/**
 * Subscription search result
 */
export interface SubscriptionSearchResult {
  subscriptions: EndogenousVariableSubscription[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Pool subscription relationship
 */
export interface PoolSubscriptionRelationship {
  poolId: PoolId;
  subscriptionId: string;
  linkedAt: number;
  isActive: boolean;
}

/**
 * Subscription validation result
 */
export interface SubscriptionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create a new subscription with validation
 */
export function createSubscription(
  variableType: string,
  currency0: Currency,
  currency1: Currency,
  parameters: Record<string, any>,
  hooks?: IHooks[]
): EndogenousVariableSubscription {
  return {
    id: generateSubscriptionId(),
    variableType,
    currency0,
    currency1,
    parameters,
    ...(hooks && { hooks }),
    createdAt: Date.now(),
    isActive: true
  };
}

/**
 * Generate unique subscription ID
 */
export function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate subscription data
 */
export function validateSubscription(
  subscription: EndogenousVariableSubscription
): SubscriptionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!subscription.id) {
    errors.push('Subscription ID is required');
  }

  if (!subscription.variableType) {
    errors.push('Variable type is required');
  }

  if (!subscription.currency0 || !subscription.currency1) {
    errors.push('Both currencies are required');
  }

  if (!subscription.parameters || Object.keys(subscription.parameters).length === 0) {
    errors.push('Parameters are required');
  }

  // Currency validation
  if (subscription.currency0 && !isValidCurrency(subscription.currency0)) {
    errors.push('Invalid currency0 address');
  }

  if (subscription.currency1 && !isValidCurrency(subscription.currency1)) {
    errors.push('Invalid currency1 address');
  }

  // Same currency check
  if (subscription.currency0 === subscription.currency1) {
    errors.push('Currency0 and currency1 must be different');
  }

  // Hooks validation
  if (subscription.hooks) {
    for (const hook of subscription.hooks) {
      if (!isValidHooks(hook)) {
        errors.push(`Invalid hooks address: ${hook}`);
      }
    }
  }

  // Timestamp validation
  if (subscription.createdAt && subscription.createdAt > Date.now()) {
    warnings.push('Created timestamp is in the future');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if subscription matches currency pair
 */
export function matchesCurrencyPair(
  subscription: EndogenousVariableSubscription,
  currency0: Currency,
  currency1: Currency
): boolean {
  return (
    (subscription.currency0 === currency0 && subscription.currency1 === currency1) ||
    (subscription.currency0 === currency1 && subscription.currency1 === currency0)
  );
}

/**
 * Check if subscription matches hooks filter
 */
export function matchesHooksFilter(
  subscription: EndogenousVariableSubscription,
  hooks: IHooks
): boolean {
  if (!subscription.hooks || subscription.hooks.length === 0) {
    return false; // No hooks filter means no match when hooks are specified
  }
  return subscription.hooks.includes(hooks);
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(
  subscription: EndogenousVariableSubscription
): boolean {
  return subscription.isActive;
}

/**
 * Deactivate subscription
 */
export function deactivateSubscription(
  subscription: EndogenousVariableSubscription
): EndogenousVariableSubscription {
  return {
    ...subscription,
    isActive: false
  };
}

/**
 * Activate subscription
 */
export function activateSubscription(
  subscription: EndogenousVariableSubscription
): EndogenousVariableSubscription {
  return {
    ...subscription,
    isActive: true
  };
}

// Import validation functions from PoolManagerTypes
import { isValidCurrency, isValidHooks } from './PoolManagerTypes';
