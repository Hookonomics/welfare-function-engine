# Subgraph Schema Design for Endogenous Variables

## Overview

This document defines the GraphQL schema for tracking endogenous variables across multiple pools using The Graph Protocol. The schema is designed to efficiently handle token pair matching, pool discovery, and real-time variable tracking.

## Core Entities

### EndogenousVariable Entity
Represents a user-defined endogenous variable subscription for a specific token pair.

```graphql
type EndogenousVariable @entity {
  id: ID!                    # Unique identifier (token0:token1:variableType)
  variableType: String!      # Type of variable (e.g., "volume-liquidity-efficiency")
  token0: Token!             # First token in the pair
  token1: Token!             # Second token in the pair
  parameters: String!        # JSON string of variable-specific parameters
  pools: [PoolTracking!]! @derivedFrom(field: "endogenousVariable")
  createdAt: BigInt!         # Block timestamp when subscription was created
  isActive: Boolean!         # Whether subscription is active
  subscriberCount: BigInt!   # Number of active subscribers
}

type Token @entity {
  id: ID!                    # Token contract address
  symbol: String!            # Token symbol
  name: String!              # Token name
  decimals: Int!             # Token decimals
  totalSupply: BigDecimal!   # Total token supply
  endogenousVariables: [EndogenousVariable!]! @derivedFrom(field: "token0")
  endogenousVariables1: [EndogenousVariable!]! @derivedFrom(field: "token1")
}
```

### PoolTracking Entity
Tracks which pools are being monitored for a specific endogenous variable.

```graphql
type PoolTracking @entity {
  id: ID!                    # poolId:variableId
  pool: Pool!                # Reference to the pool
  endogenousVariable: EndogenousVariable! # Reference to the variable
  snapshots: [VariableSnapshot!]! @derivedFrom(field: "poolTracking")
  isActive: Boolean!         # Whether tracking is active
  firstSnapshotAt: BigInt!   # Timestamp of first snapshot
  lastSnapshotAt: BigInt!    # Timestamp of last snapshot
  snapshotCount: BigInt!     # Total number of snapshots
}

type Pool @entity {
  id: ID!                    # Pool contract address
  token0: Token!             # First token in the pool
  token1: Token!             # Second token in the pool
  feeTier: BigInt!           # Pool fee tier
  liquidity: BigDecimal!     # Current liquidity
  sqrtPrice: BigDecimal!     # Current sqrt price
  tick: Int!                 # Current tick
  volumeUSD: BigDecimal!     # Total volume in USD
  totalValueLockedUSD: BigDecimal! # Total value locked in USD
  txCount: BigInt!           # Transaction count
  createdAtTimestamp: BigInt! # Pool creation timestamp
  createdAtBlockNumber: BigInt! # Pool creation block number
  poolTrackings: [PoolTracking!]! @derivedFrom(field: "pool")
}
```

### VariableSnapshot Entity
Stores time-series snapshots of endogenous variable values.

```graphql
type VariableSnapshot @entity {
  id: ID!                    # poolId:variableId:timestamp
  poolTracking: PoolTracking! # Reference to pool tracking
  timestamp: BigInt!         # Block timestamp
  blockNumber: BigInt!       # Block number
  value: BigDecimal!        # Calculated variable value
  determinants: String!      # JSON string of all determinant values
  poolState: String!         # JSON string of pool state at snapshot
  calculationMetadata: String! # JSON string of calculation metadata
}
```

## Indexing and Query Optimization

### Token Pair Indexing
```graphql
# Efficient query for finding pools by token pair
query GetPoolsByTokenPair($token0: String!, $token1: String!) {
  pools(
    where: {
      token0: $token0,
      token1: $token1
    }
    orderBy: createdAtTimestamp
    orderDirection: desc
  ) {
    id
    feeTier
    liquidity
    volumeUSD
    totalValueLockedUSD
    createdAtTimestamp
  }
}
```

### Variable Subscription Queries
```graphql
# Query for active variable subscriptions
query GetActiveVariableSubscriptions($variableType: String!) {
  endogenousVariables(
    where: {
      variableType: $variableType,
      isActive: true
    }
  ) {
    id
    token0 { id symbol }
    token1 { id symbol }
    parameters
    subscriberCount
    pools {
      id
      pool { id feeTier }
      isActive
      lastSnapshotAt
    }
  }
}
```

### Real-Time Snapshots
```graphql
# Query for recent variable snapshots
query GetRecentVariableSnapshots(
  $poolId: String!,
  $variableType: String!,
  $limit: Int = 100
) {
  variableSnapshots(
    where: {
      poolTracking_: {
        pool: $poolId,
        endogenousVariable_: {
          variableType: $variableType
        }
      }
    }
    orderBy: timestamp
    orderDirection: desc
    first: $limit
  ) {
    id
    timestamp
    value
    determinants
    poolState
  }
}
```

## Event Handlers

### Pool Creation Handler
```typescript
// Handle new pool creation events
export function handlePoolCreated(event: PoolCreated): void {
  let pool = new Pool(event.params.pool.toHexString());
  pool.token0 = event.params.token0.toHexString();
  pool.token1 = event.params.token1.toHexString();
  pool.feeTier = event.params.fee;
  pool.createdAtTimestamp = event.block.timestamp;
  pool.createdAtBlockNumber = event.block.number;
  
  // Initialize pool state
  pool.liquidity = BigDecimal.fromString("0");
  pool.volumeUSD = BigDecimal.fromString("0");
  pool.totalValueLockedUSD = BigDecimal.fromString("0");
  pool.txCount = BigInt.fromI32(0);
  
  pool.save();
  
  // Check for matching endogenous variable subscriptions
  checkForMatchingSubscriptions(pool);
}
```

### Pool State Update Handler
```typescript
// Handle pool state changes that affect endogenous variables
export function handlePoolStateUpdate(event: PoolStateUpdate): void {
  let pool = Pool.load(event.params.pool.toHexString());
  if (!pool) return;
  
  // Update pool state
  pool.liquidity = event.params.liquidity;
  pool.sqrtPrice = event.params.sqrtPrice;
  pool.tick = event.params.tick;
  pool.volumeUSD = pool.volumeUSD.plus(event.params.volumeUSD);
  pool.totalValueLockedUSD = event.params.totalValueLockedUSD;
  pool.txCount = pool.txCount.plus(BigInt.fromI32(1));
  
  pool.save();
  
  // Calculate and store variable snapshots
  calculateVariableSnapshots(pool, event.block);
}
```

## Subscription Queries

### GraphQL Subscriptions for Real-Time Updates
```graphql
# Subscribe to variable updates for a specific pool
subscription VariableUpdates($poolId: String!, $variableType: String!) {
  variableSnapshots(
    where: {
      poolTracking_: {
        pool: $poolId,
        endogenousVariable_: {
          variableType: $variableType
        }
      }
    }
    orderBy: timestamp
    orderDirection: desc
    first: 1
  ) {
    id
    timestamp
    value
    determinants
  }
}

# Subscribe to new pool discoveries
subscription NewPoolDiscovered($token0: String!, $token1: String!) {
  pools(
    where: {
      token0: $token0,
      token1: $token1
    }
    orderBy: createdAtTimestamp
    orderDirection: desc
    first: 1
  ) {
    id
    feeTier
    liquidity
    createdAtTimestamp
  }
}
```

## Data Relationships

### Entity Relationships
```
EndogenousVariable (1) ←→ (N) PoolTracking (1) ←→ (N) VariableSnapshot
     ↓                           ↓
   Token0, Token1            Pool
     ↓                           ↓
   Token                    Token0, Token1
```

### Query Patterns

#### 1. Find All Pools for Token Pair
```graphql
query FindPoolsByTokenPair($token0: String!, $token1: String!) {
  pools(
    where: {
      or: [
        { token0: $token0, token1: $token1 },
        { token0: $token1, token1: $token0 }
      ]
    }
  ) {
    id
    feeTier
    liquidity
    volumeUSD
    totalValueLockedUSD
  }
}
```

#### 2. Get Variable History
```graphql
query GetVariableHistory(
  $poolId: String!,
  $variableType: String!,
  $fromTimestamp: BigInt!,
  $toTimestamp: BigInt!
) {
  variableSnapshots(
    where: {
      poolTracking_: {
        pool: $poolId,
        endogenousVariable_: {
          variableType: $variableType
        }
      },
      timestamp_gte: $fromTimestamp,
      timestamp_lte: $toTimestamp
    }
    orderBy: timestamp
    orderDirection: asc
  ) {
    timestamp
    value
    determinants
  }
}
```

#### 3. Get Active Subscriptions
```graphql
query GetActiveSubscriptions {
  endogenousVariables(
    where: { isActive: true }
  ) {
    id
    variableType
    token0 { symbol }
    token1 { symbol }
    subscriberCount
    pools(
      where: { isActive: true }
    ) {
      pool { id feeTier }
      lastSnapshotAt
    }
  }
}
```

## Performance Optimizations

### 1. Indexing Strategy
```graphql
# Composite indexes for efficient queries
type Pool @entity {
  # ... fields ...
}

# Index for token pair queries
# CREATE INDEX idx_pool_token_pair ON pools(token0, token1);

# Index for variable snapshots by time
# CREATE INDEX idx_snapshot_time ON variable_snapshots(timestamp);

# Index for pool tracking by variable
# CREATE INDEX idx_pool_tracking_variable ON pool_trackings(endogenousVariable);
```

### 2. Query Optimization
- Use `first` and `skip` for pagination
- Filter by timestamp ranges for historical queries
- Use `orderBy` and `orderDirection` for consistent ordering
- Implement query result caching for frequently accessed data

### 3. Data Retention
```typescript
// Implement data retention policies
export function cleanupOldSnapshots(): void {
  let cutoffTimestamp = BigInt.fromI32(
    Date.now() / 1000 - (30 * 24 * 60 * 60) // 30 days ago
  );
  
  // Delete old snapshots
  // This would be implemented in the subgraph handler
}
```

## Error Handling

### 1. Data Validation
```typescript
// Validate pool state data
function validatePoolState(pool: Pool): boolean {
  return (
    pool.liquidity.ge(BigDecimal.fromString("0")) &&
    pool.volumeUSD.ge(BigDecimal.fromString("0")) &&
    pool.totalValueLockedUSD.ge(BigDecimal.fromString("0"))
  );
}
```

### 2. Graceful Degradation
```typescript
// Handle missing data gracefully
function getPoolState(poolId: string): Pool | null {
  let pool = Pool.load(poolId);
  if (!pool) {
    log.warning("Pool not found: {}", [poolId]);
    return null;
  }
  return pool;
}
```

## Security Considerations

### 1. Input Validation
- Validate all token addresses
- Sanitize variable parameters
- Check numeric bounds for calculations
- Validate timestamp ranges

### 2. Access Control
- Implement subscription limits
- Rate limit query requests
- Validate client permissions
- Audit subscription activities

### 3. Data Integrity
- Ensure consistent token pair normalization
- Validate calculation results
- Handle edge cases gracefully
- Maintain data consistency across entities
