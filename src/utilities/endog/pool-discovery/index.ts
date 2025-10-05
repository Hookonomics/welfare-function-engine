/**
 * Pool Discovery Service - Public API
 * 
 * Main entry point for the pool discovery service. Provides a clean API
 * for discovering pools, managing subscriptions, and processing events.
 */

// Core services
export { PoolDiscoveryService } from './core/PoolDiscoveryService';
export { CurrencyPairNormalizer } from './core/CurrencyPairNormalizer';
export { SubscriptionMatcher } from './core/SubscriptionMatcher';
export { PoolInfoExtractor } from './core/PoolInfoExtractor';

// Event listeners
export { PoolManagerListener } from './listeners/PoolManagerListener';
export { EventProcessor } from './listeners/EventProcessor';

// Storage
export { PoolRegistry } from './storage/PoolRegistry';
export { SubscriptionRegistry } from './storage/SubscriptionRegistry';

// Types
export * from './types/PoolManagerTypes';
export * from './types/SubscriptionTypes';
export * from './types/EventTypes';

// Factory function for easy setup
import { PoolDiscoveryService } from './core/PoolDiscoveryService';
import { CurrencyPairNormalizer } from './core/CurrencyPairNormalizer';
import { SubscriptionMatcher } from './core/SubscriptionMatcher';
import { PoolInfoExtractor } from './core/PoolInfoExtractor';
import { PoolRegistry } from './storage/PoolRegistry';
import { SubscriptionRegistry } from './storage/SubscriptionRegistry';
import { PoolManagerListener } from './listeners/PoolManagerListener';
import { EventProcessor } from './listeners/EventProcessor';
import { PoolDiscoveryConfig } from './types/PoolManagerTypes';
import { ethers } from 'ethers';

/**
 * Create a new Pool Discovery Service instance
 * 
 * @param config Pool discovery configuration
 * @returns Configured pool discovery service
 */
export function createPoolDiscoveryService(config: PoolDiscoveryConfig): {
  discoveryService: PoolDiscoveryService;
  listener: PoolManagerListener;
  eventProcessor: EventProcessor;
} {
  // Create core components
  const normalizer = new CurrencyPairNormalizer();
  const matcher = new SubscriptionMatcher();
  const extractor = new PoolInfoExtractor();
  const poolRegistry = new PoolRegistry();
  const subscriptionRegistry = new SubscriptionRegistry();

  // Create main service
  const discoveryService = new PoolDiscoveryService(
    normalizer,
    matcher,
    extractor,
    poolRegistry,
    subscriptionRegistry
  );

  // Create provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Create listener
  const listener = new PoolManagerListener(
    config.poolManagerAddress,
    config.chainId,
    provider,
    discoveryService
  );

  // Create event processor
  const eventProcessor = new EventProcessor(discoveryService);

  return {
    discoveryService,
    listener,
    eventProcessor
  };
}

/**
 * Create a minimal pool discovery service for testing
 * 
 * @param config Basic configuration
 * @returns Minimal service setup
 */
export function createMinimalPoolDiscoveryService(config: {
  poolManagerAddress: string;
  chainId: number;
  rpcUrl: string;
}): PoolDiscoveryService {
  const normalizer = new CurrencyPairNormalizer();
  const matcher = new SubscriptionMatcher();
  const extractor = new PoolInfoExtractor();
  const poolRegistry = new PoolRegistry();
  const subscriptionRegistry = new SubscriptionRegistry();

  return new PoolDiscoveryService(
    normalizer,
    matcher,
    extractor,
    poolRegistry,
    subscriptionRegistry
  );
}

/**
 * Default configuration for common networks
 */
export const DEFAULT_CONFIGS = {
  ethereum: {
    poolManagerAddress: '0x0000000000000000000000000000000000000000', // TODO: Update with actual address
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
  },
  polygon: {
    poolManagerAddress: '0x0000000000000000000000000000000000000000', // TODO: Update with actual address
    chainId: 137,
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
  },
  arbitrum: {
    poolManagerAddress: '0x0000000000000000000000000000000000000000', // TODO: Update with actual address
    chainId: 42161,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
  }
} as const;

/**
 * Utility functions for common operations
 */
export const utils = {
  /**
   * Create a subscription for volume-liquidity efficiency
   */
  createVolumeLiquiditySubscription: (
    currency0: string,
    currency1: string,
    parameters: Record<string, any> = {}
  ) => ({
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    variableType: 'volume-liquidity-efficiency',
    currency0,
    currency1,
    parameters: {
      volumeWeight: 0.4,
      liquidityWeight: 0.3,
      tvlWeight: 0.3,
      ...parameters
    },
    createdAt: Date.now(),
    isActive: true
  }),

  /**
   * Create a subscription for any endogenous variable
   */
  createSubscription: (
    variableType: string,
    currency0: string,
    currency1: string,
    parameters: Record<string, any> = {},
    hooks?: string[]
  ) => ({
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    variableType,
    currency0,
    currency1,
    parameters,
    hooks,
    createdAt: Date.now(),
    isActive: true
  }),

  /**
   * Validate pool discovery configuration
   */
  validateConfig: (config: PoolDiscoveryConfig): string[] => {
    const errors: string[] = [];

    if (!config.poolManagerAddress) {
      errors.push('Pool manager address is required');
    }

    if (!config.chainId || config.chainId <= 0) {
      errors.push('Valid chain ID is required');
    }

    if (!config.rpcUrl) {
      errors.push('RPC URL is required');
    }

    if (config.startBlock !== undefined && config.startBlock < 0) {
      errors.push('Start block must be non-negative');
    }

    if (config.batchSize !== undefined && config.batchSize <= 0) {
      errors.push('Batch size must be positive');
    }

    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      errors.push('Max retries must be non-negative');
    }

    if (config.retryDelay !== undefined && config.retryDelay < 0) {
      errors.push('Retry delay must be non-negative');
    }

    return errors;
  }
};
