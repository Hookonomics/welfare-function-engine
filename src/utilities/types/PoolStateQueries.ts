/**
 * GraphQL queries for Uniswap v4 PoolState based on subgraph schema
 * These queries can be used with GraphQL clients to fetch pool data
 */

// Base pool query fragment
export const POOL_FRAGMENT = `
  fragment PoolFragment on Pool {
    id
    token0 {
      id
      symbol
      name
      decimals
      derivedETH
      derivedUSD
    }
    token1 {
      id
      symbol
      name
      decimals
      derivedETH
      derivedUSD
    }
    feeTier
    liquidity
    sqrtPrice
    tick
    tickSpacing
    feeProtocol
    volumeToken0
    volumeToken1
    volumeUSD
    feesUSD
    txCount
    collectedFeesToken0
    collectedFeesToken1
    collectedFeesUSD
    totalValueLockedToken0
    totalValueLockedToken1
    totalValueLockedETH
    totalValueLockedUSD
    createdAtTimestamp
    createdAtBlockNumber
  }
`;

// Query to get a single pool by ID
export const GET_POOL_QUERY = `
  query GetPool($poolId: ID!) {
    pool(id: $poolId) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get multiple pools by IDs
export const GET_POOLS_QUERY = `
  query GetPools($poolIds: [ID!]!) {
    pools(where: { id_in: $poolIds }) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pools by token pair
export const GET_POOLS_BY_TOKEN_PAIR_QUERY = `
  query GetPoolsByTokenPair($token0: String!, $token1: String!) {
    pools(where: { 
      token0: $token0, 
      token1: $token1 
    }) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pools by fee tier
export const GET_POOLS_BY_FEE_TIER_QUERY = `
  query GetPoolsByFeeTier($feeTier: Int!) {
    pools(where: { feeTier: $feeTier }) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pools with minimum liquidity
export const GET_POOLS_WITH_MIN_LIQUIDITY_QUERY = `
  query GetPoolsWithMinLiquidity($minLiquidity: String!) {
    pools(where: { 
      liquidity_gte: $minLiquidity 
    }) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pools ordered by TVL
export const GET_POOLS_BY_TVL_QUERY = `
  query GetPoolsByTVL($first: Int!, $skip: Int!) {
    pools(
      first: $first,
      skip: $skip,
      orderBy: totalValueLockedUSD,
      orderDirection: desc
    ) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pools ordered by volume
export const GET_POOLS_BY_VOLUME_QUERY = `
  query GetPoolsByVolume($first: Int!, $skip: Int!) {
    pools(
      first: $first,
      skip: $skip,
      orderBy: volumeUSD,
      orderDirection: desc
    ) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pool state at specific block
export const GET_POOL_AT_BLOCK_QUERY = `
  query GetPoolAtBlock($poolId: ID!, $block: Int!) {
    pool(id: $poolId, block: { number: $block }) {
      ...PoolFragment
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pool state history
export const GET_POOL_HISTORY_QUERY = `
  query GetPoolHistory($poolId: ID!, $first: Int!, $skip: Int!) {
    pool(id: $poolId) {
      ...PoolFragment
    }
    poolDayDatas(
      where: { pool: $poolId }
      first: $first
      skip: $skip
      orderBy: date
      orderDirection: desc
    ) {
      date
      volumeUSD
      tvlUSD
      feesUSD
      open
      high
      low
      close
    }
  }
  ${POOL_FRAGMENT}
`;

// Query to get pool metrics
export const GET_POOL_METRICS_QUERY = `
  query GetPoolMetrics($poolId: ID!) {
    pool(id: $poolId) {
      id
      volumeUSD
      feesUSD
      totalValueLockedUSD
      txCount
      collectedFeesUSD
    }
  }
`;

// Query to get pool token information
export const GET_POOL_TOKENS_QUERY = `
  query GetPoolTokens($poolId: ID!) {
    pool(id: $poolId) {
      id
      token0 {
        id
        symbol
        name
        decimals
        derivedETH
        derivedUSD
      }
      token1 {
        id
        symbol
        name
        decimals
        derivedETH
        derivedUSD
      }
    }
  }
`;

// Query to get pool liquidity information
export const GET_POOL_LIQUIDITY_QUERY = `
  query GetPoolLiquidity($poolId: ID!) {
    pool(id: $poolId) {
      id
      liquidity
      sqrtPrice
      tick
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedETH
      totalValueLockedUSD
    }
  }
`;

// Query to get pool fee information
export const GET_POOL_FEES_QUERY = `
  query GetPoolFees($poolId: ID!) {
    pool(id: $poolId) {
      id
      feeTier
      feeProtocol
      feesUSD
      collectedFeesToken0
      collectedFeesToken1
      collectedFeesUSD
    }
  }
`;

// Query to get pool volume information
export const GET_POOL_VOLUME_QUERY = `
  query GetPoolVolume($poolId: ID!) {
    pool(id: $poolId) {
      id
      volumeToken0
      volumeToken1
      volumeUSD
      txCount
    }
  }
`;

// Type definitions for query variables
export interface GetPoolVariables {
  poolId: string;
}

export interface GetPoolsVariables {
  poolIds: string[];
}

export interface GetPoolsByTokenPairVariables {
  token0: string;
  token1: string;
}

export interface GetPoolsByFeeTierVariables {
  feeTier: number;
}

export interface GetPoolsWithMinLiquidityVariables {
  minLiquidity: string;
}

export interface GetPoolsByTVLVariables {
  first: number;
  skip: number;
}

export interface GetPoolsByVolumeVariables {
  first: number;
  skip: number;
}

export interface GetPoolAtBlockVariables {
  poolId: string;
  block: number;
}

export interface GetPoolHistoryVariables {
  poolId: string;
  first: number;
  skip: number;
}

// Export all queries
export const POOL_QUERIES = {
  GET_POOL: GET_POOL_QUERY,
  GET_POOLS: GET_POOLS_QUERY,
  GET_POOLS_BY_TOKEN_PAIR: GET_POOLS_BY_TOKEN_PAIR_QUERY,
  GET_POOLS_BY_FEE_TIER: GET_POOLS_BY_FEE_TIER_QUERY,
  GET_POOLS_WITH_MIN_LIQUIDITY: GET_POOLS_WITH_MIN_LIQUIDITY_QUERY,
  GET_POOLS_BY_TVL: GET_POOLS_BY_TVL_QUERY,
  GET_POOLS_BY_VOLUME: GET_POOLS_BY_VOLUME_QUERY,
  GET_POOL_AT_BLOCK: GET_POOL_AT_BLOCK_QUERY,
  GET_POOL_HISTORY: GET_POOL_HISTORY_QUERY,
  GET_POOL_METRICS: GET_POOL_METRICS_QUERY,
  GET_POOL_TOKENS: GET_POOL_TOKENS_QUERY,
  GET_POOL_LIQUIDITY: GET_POOL_LIQUIDITY_QUERY,
  GET_POOL_FEES: GET_POOL_FEES_QUERY,
  GET_POOL_VOLUME: GET_POOL_VOLUME_QUERY,
} as const;

// Export all variable types
export type {
  GetPoolVariables,
  GetPoolsVariables,
  GetPoolsByTokenPairVariables,
  GetPoolsByFeeTierVariables,
  GetPoolsWithMinLiquidityVariables,
  GetPoolsByTVLVariables,
  GetPoolsByVolumeVariables,
  GetPoolAtBlockVariables,
  GetPoolHistoryVariables,
};
