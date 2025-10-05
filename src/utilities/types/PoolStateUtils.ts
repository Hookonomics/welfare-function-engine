/**
 * Utility functions for working with PoolState types parametrized by poolId
 * Demonstrates type-safe pool operations and data manipulation
 */

import { 
  PoolState, 
  ComputedPoolState, 
  PoolStateUpdate, 
  PoolStateComparison,
  PoolStateValidation,
  PoolStateHistory,
  Pool,
  Token
} from './PoolState';

/**
 * Type-safe pool state factory
 * Creates PoolState instances with proper poolId typing
 */
export class PoolStateFactory {
  /**
   * Create a PoolState with type-safe poolId
   */
  static createPoolState<T extends string>(
    poolId: T, 
    pool: Pool
  ): PoolState<T> {
    return {
      ...pool,
      poolId
    };
  }

  /**
   * Create a ComputedPoolState with additional calculated values
   */
  static async createComputedPoolState<T extends string>(
    poolId: T, 
    pool: Pool
  ): Promise<ComputedPoolState<T>> {
    const baseState = this.createPoolState(poolId, pool);
    
    // Calculate additional values (simplified examples)
    const price0 = this.calculatePrice0(pool.sqrtPrice, pool.token0.decimals, pool.token1.decimals);
    const price1 = this.calculatePrice1(pool.sqrtPrice, pool.token0.decimals, pool.token1.decimals);
    const priceUSD = this.calculatePriceUSD(price0, pool.token0.derivedUSD);
    
    return {
      ...baseState,
      price0,
      price1,
      priceUSD,
      liquidityETH: pool.totalValueLockedETH,
      liquidityUSD: pool.totalValueLockedUSD,
      feeRate: pool.feeTier / 10000, // Convert from basis points to percentage
      protocolFeeRate: pool.feeProtocol / 10000,
      volume24h: "0", // Would be calculated from historical data
      volume7d: "0", // Would be calculated from historical data
      tvlETH: pool.totalValueLockedETH,
      tvlUSD: pool.totalValueLockedUSD,
      tvlChange24h: 0 // Would be calculated from historical data
    };
  }

  /**
   * Create a PoolStateUpdate for tracking changes
   */
  static createPoolStateUpdate<T extends string>(
    poolId: T,
    updates: Partial<Pool>
  ): PoolStateUpdate<T> {
    return {
      poolId,
      updates,
      timestamp: Date.now(),
      blockNumber: 0 // Would be set from actual block data
    };
  }

  // Private helper methods for calculations
  private static calculatePrice0(sqrtPrice: string, decimals0: number, decimals1: number): string {
    // Simplified price calculation - in practice would use proper BigInt math
    const sqrtPriceNum = parseFloat(sqrtPrice);
    const price = (sqrtPriceNum * sqrtPriceNum) / (2 ** (decimals1 - decimals0));
    return price.toString();
  }

  private static calculatePrice1(sqrtPrice: string, decimals0: number, decimals1: number): string {
    // Simplified price calculation - in practice would use proper BigInt math
    const sqrtPriceNum = parseFloat(sqrtPrice);
    const price = (2 ** (decimals1 - decimals0)) / (sqrtPriceNum * sqrtPriceNum);
    return price.toString();
  }

  private static calculatePriceUSD(price0: string, derivedUSD?: string): string {
    if (!derivedUSD) return "0";
    const price = parseFloat(price0);
    const usdPrice = parseFloat(derivedUSD);
    return (price * usdPrice).toString();
  }
}

/**
 * Type-safe pool state operations
 * Demonstrates how to work with PoolState types parametrized by poolId
 */
export class PoolStateOperations<T extends string> {
  private poolId: T;

  constructor(poolId: T) {
    this.poolId = poolId;
  }

  /**
   * Get the poolId with type safety
   */
  getPoolId(): T {
    return this.poolId;
  }

  /**
   * Create a PoolState from raw pool data
   */
  createPoolState(pool: Pool): PoolState<T> {
    return PoolStateFactory.createPoolState(this.poolId, pool);
  }

  /**
   * Create a ComputedPoolState from raw pool data
   */
  async createComputedPoolState(pool: Pool): Promise<ComputedPoolState<T>> {
    return PoolStateFactory.createComputedPoolState(this.poolId, pool);
  }

  /**
   * Compare two pool states for the same pool
   */
  comparePoolStates(before: PoolState<T>, after: PoolState<T>): PoolStateComparison<T> {
    return {
      poolId: this.poolId,
      before,
      after,
      changes: {
        liquidity: this.calculateChange(before.liquidity, after.liquidity),
        sqrtPrice: this.calculateChange(before.sqrtPrice, after.sqrtPrice),
        tick: after.tick !== before.tick ? (after.tick || 0) - (before.tick || 0) : 0,
        volumeUSD: this.calculateChange(before.volumeUSD, after.volumeUSD),
        feesUSD: this.calculateChange(before.feesUSD, after.feesUSD),
        tvlUSD: this.calculateChange(before.totalValueLockedUSD, after.totalValueLockedUSD)
      },
      timestamp: Date.now()
    };
  }

  /**
   * Validate a pool state
   */
  async validatePoolState(state: PoolState<T>): Promise<PoolStateValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate poolId matches
    if (state.poolId !== this.poolId) {
      errors.push(`PoolId mismatch: expected ${this.poolId}, got ${state.poolId}`);
    }

    // Validate required fields
    if (!state.id) errors.push("Pool ID is required");
    if (!state.token0) errors.push("Token0 is required");
    if (!state.token1) errors.push("Token1 is required");
    if (state.feeTier <= 0) errors.push("Fee tier must be positive");
    if (parseFloat(state.liquidity) < 0) errors.push("Liquidity cannot be negative");
    if (parseFloat(state.sqrtPrice) <= 0) errors.push("Sqrt price must be positive");

    // Validate token data
    if (state.token0.id === state.token1.id) {
      errors.push("Token0 and Token1 cannot be the same");
    }

    // Check for warnings
    if (parseFloat(state.liquidity) === 0) {
      warnings.push("Pool has zero liquidity");
    }
    if (parseFloat(state.totalValueLockedUSD) < 1000) {
      warnings.push("Pool has very low TVL");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      poolId: this.poolId,
      timestamp: Date.now()
    };
  }

  /**
   * Create a pool state update
   */
  createUpdate(updates: Partial<Pool>): PoolStateUpdate<T> {
    return PoolStateFactory.createPoolStateUpdate(this.poolId, updates);
  }

  // Private helper methods
  private calculateChange(before: string, after: string): string {
    const beforeNum = parseFloat(before);
    const afterNum = parseFloat(after);
    return (afterNum - beforeNum).toString();
  }
}

/**
 * Type-safe pool state manager
 * Manages multiple pools with type-safe operations
 */
export class PoolStateManager {
  private pools = new Map<string, PoolState<string>>();
  private operations = new Map<string, PoolStateOperations<string>>();

  /**
   * Add a pool to the manager
   */
  addPool<T extends string>(poolId: T, pool: Pool): PoolState<T> {
    const poolState = PoolStateFactory.createPoolState(poolId, pool);
    this.pools.set(poolId, poolState);
    this.operations.set(poolId, new PoolStateOperations(poolId));
    return poolState;
  }

  /**
   * Get a pool by ID with type safety
   */
  getPool<T extends string>(poolId: T): PoolState<T> | undefined {
    return this.pools.get(poolId) as PoolState<T> | undefined;
  }

  /**
   * Get pool operations for a specific pool
   */
  getPoolOperations<T extends string>(poolId: T): PoolStateOperations<T> | undefined {
    return this.operations.get(poolId) as PoolStateOperations<T> | undefined;
  }

  /**
   * Update a pool state
   */
  updatePool<T extends string>(poolId: T, updates: Partial<Pool>): PoolStateUpdate<T> {
    const operations = this.getPoolOperations(poolId);
    if (!operations) {
      throw new Error(`Pool operations not found for poolId: ${poolId}`);
    }
    return operations.createUpdate(updates);
  }

  /**
   * Get all pools
   */
  getAllPools(): PoolState<string>[] {
    return Array.from(this.pools.values());
  }

  /**
   * Remove a pool
   */
  removePool<T extends string>(poolId: T): boolean {
    const removed = this.pools.delete(poolId);
    this.operations.delete(poolId);
    return removed;
  }
}

/**
 * Example usage demonstrating type-safe pool operations
 */
export class PoolStateExamples {
  /**
   * Example: Working with a specific pool
   */
  static async exampleSpecificPool() {
    const poolId = "0x1234567890abcdef" as const; // Type-safe pool ID
    const operations = new PoolStateOperations(poolId);

    // Create a mock pool
    const mockPool: Pool = {
      id: poolId,
      token0: {
        id: "0xToken0",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        derivedETH: "0.0005",
        derivedUSD: "1.00"
      },
      token1: {
        id: "0xToken1", 
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        derivedETH: "1.0",
        derivedUSD: "2000.00"
      },
      feeTier: 500,
      liquidity: "1000000000000000000",
      sqrtPrice: "79228162514264337593543950336",
      tick: 0,
      tickSpacing: 10,
      feeProtocol: 0,
      volumeToken0: "1000000",
      volumeToken1: "500",
      volumeUSD: "1000000",
      feesUSD: "5000",
      txCount: "100",
      collectedFeesToken0: "1000",
      collectedFeesToken1: "0.5",
      collectedFeesUSD: "1000",
      totalValueLockedToken0: "10000000",
      totalValueLockedToken1: "5000",
      totalValueLockedETH: "5000",
      totalValueLockedUSD: "10000000",
      createdAtTimestamp: "1640995200",
      createdAtBlockNumber: "13916165"
    };

    // Create pool state
    const poolState = operations.createPoolState(mockPool);
    console.log(`Pool ${poolState.poolId} created with ${poolState.token0.symbol}/${poolState.token1.symbol}`);

    // Create computed pool state
    const computedState = await operations.createComputedPoolState(mockPool);
    console.log(`Computed price0: ${computedState.price0}`);
    console.log(`Computed price1: ${computedState.price1}`);
    console.log(`Fee rate: ${computedState.feeRate}%`);

    // Validate pool state
    const validation = await operations.validatePoolState(poolState);
    console.log(`Pool validation: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    if (validation.errors.length > 0) {
      console.log('Errors:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.log('Warnings:', validation.warnings);
    }

    return poolState;
  }

  /**
   * Example: Working with multiple pools
   */
  static async exampleMultiplePools() {
    const manager = new PoolStateManager();

    // Add multiple pools with different IDs
    const pool1Id = "0xPool1" as const;
    const pool2Id = "0xPool2" as const;

    // Mock pools (simplified)
    const pool1: Pool = {
      id: pool1Id,
      token0: { id: "0xUSDC", symbol: "USDC", name: "USD Coin", decimals: 6 },
      token1: { id: "0xWETH", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      feeTier: 500,
      liquidity: "1000000",
      sqrtPrice: "79228162514264337593543950336",
      tick: 0,
      tickSpacing: 10,
      feeProtocol: 0,
      volumeToken0: "0",
      volumeToken1: "0",
      volumeUSD: "0",
      feesUSD: "0",
      txCount: "0",
      collectedFeesToken0: "0",
      collectedFeesToken1: "0",
      collectedFeesUSD: "0",
      totalValueLockedToken0: "0",
      totalValueLockedToken1: "0",
      totalValueLockedETH: "0",
      totalValueLockedUSD: "0",
      createdAtTimestamp: "0",
      createdAtBlockNumber: "0"
    };

    const pool2: Pool = {
      id: pool2Id,
      token0: { id: "0xDAI", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      token1: { id: "0xUSDC", symbol: "USDC", name: "USD Coin", decimals: 6 },
      feeTier: 100,
      liquidity: "2000000",
      sqrtPrice: "79228162514264337593543950336",
      tick: 0,
      tickSpacing: 1,
      feeProtocol: 0,
      volumeToken0: "0",
      volumeToken1: "0",
      volumeUSD: "0",
      feesUSD: "0",
      txCount: "0",
      collectedFeesToken0: "0",
      collectedFeesToken1: "0",
      collectedFeesUSD: "0",
      totalValueLockedToken0: "0",
      totalValueLockedToken1: "0",
      totalValueLockedETH: "0",
      totalValueLockedUSD: "0",
      createdAtTimestamp: "0",
      createdAtBlockNumber: "0"
    };

    // Add pools to manager
    manager.addPool(pool1Id, pool1);
    manager.addPool(pool2Id, pool2);

    // Get pools with type safety
    const retrievedPool1 = manager.getPool(pool1Id);
    const retrievedPool2 = manager.getPool(pool2Id);

    console.log(`Retrieved pool1: ${retrievedPool1?.poolId}`);
    console.log(`Retrieved pool2: ${retrievedPool2?.poolId}`);

    // Get all pools
    const allPools = manager.getAllPools();
    console.log(`Total pools managed: ${allPools.length}`);

    return manager;
  }
}

// Export all classes and functions
export {
  PoolStateFactory,
  PoolStateOperations,
  PoolStateManager,
  PoolStateExamples
};
