/**
 * Pool Registry
 * 
 * In-memory registry of discovered pools indexed by poolId, hooks address, and currency pairs.
 * Provides fast O(1) lookup for pool discovery and matching operations.
 */

import { PoolInfo, PoolId, IHooks, Currency } from '../types/PoolManagerTypes';

/**
 * In-memory registry of discovered pools
 * Indexed by poolId and hooks address
 */
export class PoolRegistry {
  private poolsByPoolId: Map<PoolId, PoolInfo>;
  private poolsByHooks: Map<IHooks, PoolInfo[]>;
  private poolsByCurrencyPair: Map<string, PoolInfo[]>;
  private poolsByCurrency0: Map<Currency, PoolInfo[]>;
  private poolsByCurrency1: Map<Currency, PoolInfo[]>;

  constructor() {
    this.poolsByPoolId = new Map();
    this.poolsByHooks = new Map();
    this.poolsByCurrencyPair = new Map();
    this.poolsByCurrency0 = new Map();
    this.poolsByCurrency1 = new Map();
  }

  /**
   * Register discovered pool
   * 
   * @param poolInfo Pool information to register
   */
  async registerPool(poolInfo: PoolInfo): Promise<void> {
    // Validate pool info
    if (!poolInfo.poolId || !poolInfo.currency0 || !poolInfo.currency1 || !poolInfo.hooks) {
      throw new Error('Invalid pool information');
    }

    // Check if pool already exists
    if (this.poolsByPoolId.has(poolInfo.poolId)) {
      throw new Error(`Pool ${poolInfo.poolId} already exists`);
    }

    // Register by pool ID
    this.poolsByPoolId.set(poolInfo.poolId, poolInfo);

    // Register by hooks
    if (!this.poolsByHooks.has(poolInfo.hooks)) {
      this.poolsByHooks.set(poolInfo.hooks, []);
    }
    this.poolsByHooks.get(poolInfo.hooks)!.push(poolInfo);

    // Register by currency pair
    const currencyPairKey = this.createCurrencyPairKey(poolInfo.currency0, poolInfo.currency1);
    if (!this.poolsByCurrencyPair.has(currencyPairKey)) {
      this.poolsByCurrencyPair.set(currencyPairKey, []);
    }
    this.poolsByCurrencyPair.get(currencyPairKey)!.push(poolInfo);

    // Register by individual currencies
    if (!this.poolsByCurrency0.has(poolInfo.currency0)) {
      this.poolsByCurrency0.set(poolInfo.currency0, []);
    }
    this.poolsByCurrency0.get(poolInfo.currency0)!.push(poolInfo);

    if (!this.poolsByCurrency1.has(poolInfo.currency1)) {
      this.poolsByCurrency1.set(poolInfo.currency1, []);
    }
    this.poolsByCurrency1.get(poolInfo.currency1)!.push(poolInfo);
  }

  /**
   * Get pool by poolId
   * 
   * @param poolId Pool ID to look up
   * @returns Pool information or null if not found
   */
  async getPoolById(poolId: PoolId): Promise<PoolInfo | null> {
    return this.poolsByPoolId.get(poolId) || null;
  }

  /**
   * Get pools by hooks address
   * 
   * @param hooks Hooks address to filter by
   * @returns Array of pools using the specified hooks
   */
  async getPoolsByHooks(hooks: IHooks): Promise<PoolInfo[]> {
    return this.poolsByHooks.get(hooks) || [];
  }

  /**
   * Get pools by currency pair
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Array of pools with the specified currency pair
   */
  async getPoolsByCurrencyPair(
    currency0: Currency,
    currency1: Currency
  ): Promise<PoolInfo[]> {
    const key = this.createCurrencyPairKey(currency0, currency1);
    return this.poolsByCurrencyPair.get(key) || [];
  }

  /**
   * Get pools by single currency
   * 
   * @param currency Currency to filter by
   * @returns Array of pools containing the specified currency
   */
  async getPoolsByCurrency(currency: Currency): Promise<PoolInfo[]> {
    const pools0 = this.poolsByCurrency0.get(currency) || [];
    const pools1 = this.poolsByCurrency1.get(currency) || [];
    
    // Combine and deduplicate
    const allPools = [...pools0, ...pools1];
    const uniquePools = new Map<PoolId, PoolInfo>();
    
    for (const pool of allPools) {
      uniquePools.set(pool.poolId, pool);
    }
    
    return Array.from(uniquePools.values());
  }

  /**
   * Get all registered pools
   * 
   * @returns Array of all pools
   */
  async getAllPools(): Promise<PoolInfo[]> {
    return Array.from(this.poolsByPoolId.values());
  }

  /**
   * Check if pool exists
   * 
   * @param poolId Pool ID to check
   * @returns True if pool exists
   */
  async hasPool(poolId: PoolId): Promise<boolean> {
    return this.poolsByPoolId.has(poolId);
  }

  /**
   * Get pool count
   * 
   * @returns Total number of registered pools
   */
  async getPoolCount(): Promise<number> {
    return this.poolsByPoolId.size;
  }

  /**
   * Get pools by multiple criteria
   * 
   * @param criteria Search criteria
   * @returns Array of matching pools
   */
  async getPoolsByCriteria(criteria: {
    currency0?: Currency;
    currency1?: Currency;
    hooks?: IHooks;
    fee?: number;
    tickSpacing?: number;
  }): Promise<PoolInfo[]> {
    let pools = await this.getAllPools();

    // Filter by currency0
    if (criteria.currency0) {
      pools = pools.filter(pool => pool.currency0 === criteria.currency0);
    }

    // Filter by currency1
    if (criteria.currency1) {
      pools = pools.filter(pool => pool.currency1 === criteria.currency1);
    }

    // Filter by hooks
    if (criteria.hooks) {
      pools = pools.filter(pool => pool.hooks === criteria.hooks);
    }

    // Filter by fee
    if (criteria.fee !== undefined) {
      pools = pools.filter(pool => pool.fee === criteria.fee);
    }

    // Filter by tick spacing
    if (criteria.tickSpacing !== undefined) {
      pools = pools.filter(pool => pool.tickSpacing === criteria.tickSpacing);
    }

    return pools;
  }

  /**
   * Remove pool from registry
   * 
   * @param poolId Pool ID to remove
   */
  async removePool(poolId: PoolId): Promise<void> {
    const poolInfo = this.poolsByPoolId.get(poolId);
    if (!poolInfo) {
      return; // Pool not found
    }

    // Remove from all indexes
    this.poolsByPoolId.delete(poolId);

    // Remove from hooks index
    const hooksPools = this.poolsByHooks.get(poolInfo.hooks);
    if (hooksPools) {
      const index = hooksPools.findIndex(pool => pool.poolId === poolId);
      if (index >= 0) {
        hooksPools.splice(index, 1);
        if (hooksPools.length === 0) {
          this.poolsByHooks.delete(poolInfo.hooks);
        }
      }
    }

    // Remove from currency pair index
    const currencyPairKey = this.createCurrencyPairKey(poolInfo.currency0, poolInfo.currency1);
    const currencyPairPools = this.poolsByCurrencyPair.get(currencyPairKey);
    if (currencyPairPools) {
      const index = currencyPairPools.findIndex(pool => pool.poolId === poolId);
      if (index >= 0) {
        currencyPairPools.splice(index, 1);
        if (currencyPairPools.length === 0) {
          this.poolsByCurrencyPair.delete(currencyPairKey);
        }
      }
    }

    // Remove from currency0 index
    const currency0Pools = this.poolsByCurrency0.get(poolInfo.currency0);
    if (currency0Pools) {
      const index = currency0Pools.findIndex(pool => pool.poolId === poolId);
      if (index >= 0) {
        currency0Pools.splice(index, 1);
        if (currency0Pools.length === 0) {
          this.poolsByCurrency0.delete(poolInfo.currency0);
        }
      }
    }

    // Remove from currency1 index
    const currency1Pools = this.poolsByCurrency1.get(poolInfo.currency1);
    if (currency1Pools) {
      const index = currency1Pools.findIndex(pool => pool.poolId === poolId);
      if (index >= 0) {
        currency1Pools.splice(index, 1);
        if (currency1Pools.length === 0) {
          this.poolsByCurrency1.delete(poolInfo.currency1);
        }
      }
    }
  }

  /**
   * Clear all pools
   */
  async clearAllPools(): Promise<void> {
    this.poolsByPoolId.clear();
    this.poolsByHooks.clear();
    this.poolsByCurrencyPair.clear();
    this.poolsByCurrency0.clear();
    this.poolsByCurrency1.clear();
  }

  /**
   * Get registry statistics
   * 
   * @returns Statistics about registered pools
   */
  async getRegistryStats(): Promise<{
    totalPools: number;
    poolsByHooks: Map<IHooks, number>;
    poolsByCurrency: Map<Currency, number>;
    uniqueHooks: number;
    uniqueCurrencies: number;
    currencyPairs: number;
  }> {
    const pools = await this.getAllPools();
    const poolsByHooks = new Map<IHooks, number>();
    const poolsByCurrency = new Map<Currency, number>();

    for (const pool of pools) {
      // Count by hooks
      const hooksCount = poolsByHooks.get(pool.hooks) || 0;
      poolsByHooks.set(pool.hooks, hooksCount + 1);

      // Count by currency0
      const currency0Count = poolsByCurrency.get(pool.currency0) || 0;
      poolsByCurrency.set(pool.currency0, currency0Count + 1);

      // Count by currency1
      const currency1Count = poolsByCurrency.get(pool.currency1) || 0;
      poolsByCurrency.set(pool.currency1, currency1Count + 1);
    }

    return {
      totalPools: pools.length,
      poolsByHooks,
      poolsByCurrency,
      uniqueHooks: poolsByHooks.size,
      uniqueCurrencies: poolsByCurrency.size,
      currencyPairs: this.poolsByCurrencyPair.size
    };
  }

  /**
   * Create currency pair key for indexing
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Normalized currency pair key
   */
  private createCurrencyPairKey(currency0: Currency, currency1: Currency): string {
    // Sort currencies lexicographically for consistent indexing
    const sorted = [currency0.toLowerCase(), currency1.toLowerCase()].sort();
    return `${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Get pools by time range
   * 
   * @param fromTime Start timestamp
   * @param toTime End timestamp
   * @returns Array of pools created within the time range
   */
  async getPoolsByTimeRange(fromTime: number, toTime: number): Promise<PoolInfo[]> {
    const pools = await this.getAllPools();
    return pools.filter(pool => 
      pool.timestamp >= fromTime && pool.timestamp <= toTime
    );
  }

  /**
   * Get pools by block range
   * 
   * @param fromBlock Start block number
   * @param toBlock End block number
   * @returns Array of pools created within the block range
   */
  async getPoolsByBlockRange(fromBlock: number, toBlock: number): Promise<PoolInfo[]> {
    const pools = await this.getAllPools();
    return pools.filter(pool => 
      pool.blockNumber >= fromBlock && pool.blockNumber <= toBlock
    );
  }

  /**
   * Search pools with text matching
   * 
   * @param query Search query
   * @returns Array of pools matching the query
   */
  async searchPools(query: string): Promise<PoolInfo[]> {
    const pools = await this.getAllPools();
    const lowercaseQuery = query.toLowerCase();
    
    return pools.filter(pool => 
      pool.poolId.toLowerCase().includes(lowercaseQuery) ||
      pool.currency0.toLowerCase().includes(lowercaseQuery) ||
      pool.currency1.toLowerCase().includes(lowercaseQuery) ||
      pool.hooks.toLowerCase().includes(lowercaseQuery) ||
      pool.transactionHash.toLowerCase().includes(lowercaseQuery)
    );
  }
}
