/**
 * PoolState TypeScript definitions based on Uniswap v4 subgraph GraphQL schema
 * Parametrized by poolId for type safety and pool-specific operations
 */

// Base token interface from Uniswap v4 subgraph
export interface Token {
  id: string;           // Token contract address
  symbol: string;       // Token symbol (e.g., "USDC", "WETH")
  name: string;         // Token name (e.g., "USD Coin", "Wrapped Ether")
  decimals: number;     // Token decimals
  derivedETH?: string;  // Price in ETH (if available)
  derivedUSD?: string;  // Price in USD (if available)
}

// Pool entity from Uniswap v4 subgraph
export interface Pool {
  id: string;                    // Pool contract address (poolId)
  token0: Token;                 // First token in the pool
  token1: Token;                 // Second token in the pool
  feeTier: number;               // Fee tier (e.g., 500 for 0.05%)
  liquidity: string;             // Current liquidity (as BigInt string)
  sqrtPrice: string;             // Square root of current price (as BigInt string)
  tick: number | null;           // Current tick (can be null)
  tickSpacing: number;           // Tick spacing for the pool
  feeProtocol: number;           // Protocol fee (0 or 1)
  volumeToken0: string;          // Volume in token0 (as BigInt string)
  volumeToken1: string;          // Volume in token1 (as BigInt string)
  volumeUSD: string;             // Volume in USD (as BigInt string)
  feesUSD: string;               // Fees in USD (as BigInt string)
  txCount: string;               // Transaction count (as BigInt string)
  collectedFeesToken0: string;   // Collected fees in token0 (as BigInt string)
  collectedFeesToken1: string;   // Collected fees in token1 (as BigInt string)
  collectedFeesUSD: string;      // Collected fees in USD (as BigInt string)
  totalValueLockedToken0: string; // TVL in token0 (as BigInt string)
  totalValueLockedToken1: string; // TVL in token1 (as BigInt string)
  totalValueLockedETH: string;   // TVL in ETH (as BigInt string)
  totalValueLockedUSD: string;   // TVL in USD (as BigInt string)
  createdAtTimestamp: string;    // Pool creation timestamp (as BigInt string)
  createdAtBlockNumber: string;  // Pool creation block number (as BigInt string)
}

// PoolState type parametrized by poolId
export type PoolState<T extends string = string> = Pool & {
  poolId: T;  // Type-safe pool identifier
};

// Utility type for pool-specific operations
export type PoolOperation<T extends string> = {
  poolId: T;
  pool: PoolState<T>;
};

// Type for pool state updates
export interface PoolStateUpdate<T extends string = string> {
  poolId: T;
  updates: Partial<Pick<Pool, 'liquidity' | 'sqrtPrice' | 'tick' | 'volumeToken0' | 'volumeToken1' | 'volumeUSD' | 'feesUSD' | 'txCount' | 'collectedFeesToken0' | 'collectedFeesToken1' | 'collectedFeesUSD' | 'totalValueLockedToken0' | 'totalValueLockedToken1' | 'totalValueLockedETH' | 'totalValueLockedUSD'>>;
  timestamp: number;
  blockNumber: number;
}

// Type for pool creation parameters
export interface PoolCreationParams {
  token0: string;      // Token0 address
  token1: string;      // Token1 address
  feeTier: number;     // Fee tier
  tickSpacing: number; // Tick spacing
  sqrtPriceX96: string; // Initial sqrt price (as BigInt string)
  tick: number;        // Initial tick
}

// Type for pool query parameters
export interface PoolQueryParams {
  poolId: string;
  includeTokens?: boolean;
  includeMetrics?: boolean;
  includeTVL?: boolean;
}

// Type for pool state with computed values
export interface ComputedPoolState<T extends string = string> extends PoolState<T> {
  // Computed price values
  price0: string;      // Price of token0 in terms of token1
  price1: string;      // Price of token1 in terms of token0
  priceUSD: string;    // Price in USD
  
  // Computed liquidity values
  liquidityETH: string; // Liquidity in ETH
  liquidityUSD: string; // Liquidity in USD
  
  // Computed fee values
  feeRate: number;     // Fee rate as percentage
  protocolFeeRate: number; // Protocol fee rate as percentage
  
  // Computed volume values
  volume24h: string;   // 24-hour volume in USD
  volume7d: string;    // 7-day volume in USD
  
  // Computed TVL values
  tvlETH: string;      // TVL in ETH
  tvlUSD: string;      // TVL in USD
  tvlChange24h: number; // 24-hour TVL change percentage
}

// Type for pool state validation
export interface PoolStateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  poolId: string;
  timestamp: number;
}

// Type for pool state comparison
export interface PoolStateComparison<T extends string = string> {
  poolId: T;
  before: PoolState<T>;
  after: PoolState<T>;
  changes: {
    liquidity: string;
    sqrtPrice: string;
    tick: number | null;
    volumeUSD: string;
    feesUSD: string;
    tvlUSD: string;
  };
  timestamp: number;
}

// Type for pool state history
export interface PoolStateHistory<T extends string = string> {
  poolId: T;
  states: Array<{
    state: PoolState<T>;
    timestamp: number;
    blockNumber: number;
  }>;
  period: {
    start: number;
    end: number;
  };
}

// Utility functions type
export interface PoolStateUtils<T extends string = string> {
  // Get current pool state
  getPoolState(poolId: T): Promise<PoolState<T>>;
  
  // Get pool state at specific block
  getPoolStateAtBlock(poolId: T, blockNumber: number): Promise<PoolState<T>>;
  
  // Get pool state history
  getPoolStateHistory(poolId: T, startTime: number, endTime: number): Promise<PoolStateHistory<T>>;
  
  // Compare pool states
  comparePoolStates(poolId: T, before: PoolState<T>, after: PoolState<T>): PoolStateComparison<T>;
  
  // Validate pool state
  validatePoolState(poolId: T, state: PoolState<T>): Promise<PoolStateValidation>;
  
  // Compute additional values
  computePoolState(poolId: T, state: PoolState<T>): Promise<ComputedPoolState<T>>;
  
  // Subscribe to pool state updates
  subscribeToPoolState(poolId: T, callback: (update: PoolStateUpdate<T>) => void): () => void;
}

// Type for pool state factory
export interface PoolStateFactory {
  createPoolState<T extends string>(poolId: T, pool: Pool): PoolState<T>;
  createComputedPoolState<T extends string>(poolId: T, pool: Pool): Promise<ComputedPoolState<T>>;
  createPoolStateUpdate<T extends string>(poolId: T, updates: Partial<Pool>): PoolStateUpdate<T>;
}

// Export all types
export type {
  Pool,
  PoolState,
  PoolOperation,
  PoolStateUpdate,
  PoolCreationParams,
  PoolQueryParams,
  ComputedPoolState,
  PoolStateValidation,
  PoolStateComparison,
  PoolStateHistory,
  PoolStateUtils,
  PoolStateFactory
};
