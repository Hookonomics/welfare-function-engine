# Pool Discovery Mechanism for Endogenous Variables

## Overview

This document describes the automatic pool discovery mechanism that monitors blockchain events to detect new pools with token pairs that match existing endogenous variable subscriptions. The system ensures that users automatically receive updates for all relevant pools without manual intervention.

## Architecture Components

### 1. Event Listener Service
- **Purpose**: Monitor blockchain events for pool creation
- **Technology**: WebSocket connection to blockchain node or The Graph Protocol
- **Events**: `PoolCreated`, `PoolInitialized`, `LiquidityAdded`

### 2. Token Pair Matcher
- **Purpose**: Match new pools to existing subscriptions
- **Algorithm**: Normalized token pair comparison
- **Performance**: O(1) lookup using hash maps

### 3. Auto-Subscription Engine
- **Purpose**: Automatically subscribe to matching pools
- **Features**: Batch processing, rate limiting, error handling
- **Integration**: TimescaleDB, WebSocket notifications

### 4. Notification System
- **Purpose**: Notify clients about new pool discoveries
- **Channels**: WebSocket, push notifications, email alerts
- **Content**: Pool details, subscription status, historical data availability

## Event Monitoring

### 1. Blockchain Events to Monitor

#### Uniswap V3 Factory Events
```solidity
// PoolCreated event from UniswapV3Factory
event PoolCreated(
  address indexed token0,
  address indexed token1,
  uint24 indexed fee,
  int24 tickSpacing,
  address pool
);
```

#### Uniswap V3 Pool Events
```solidity
// Initialize event from UniswapV3Pool
event Initialize(
  uint160 sqrtPriceX96,
  int24 tick
);

// Mint event (liquidity added)
event Mint(
  address sender,
  address indexed owner,
  int24 indexed tickLower,
  int24 indexed tickUpper,
  uint128 amount,
  uint256 amount0,
  uint256 amount1
);
```

### 2. Event Processing Pipeline
```typescript
interface EventProcessor {
  processPoolCreated(event: PoolCreatedEvent): Promise<void>;
  processPoolInitialized(event: PoolInitializedEvent): Promise<void>;
  processLiquidityAdded(event: LiquidityAddedEvent): Promise<void>;
}

class PoolDiscoveryService implements EventProcessor {
  async processPoolCreated(event: PoolCreatedEvent): Promise<void> {
    // 1. Extract pool information
    const poolInfo = this.extractPoolInfo(event);
    
    // 2. Normalize token pair
    const normalizedPair = this.normalizeTokenPair(
      poolInfo.token0, 
      poolInfo.token1
    );
    
    // 3. Find matching subscriptions
    const matchingSubscriptions = await this.findMatchingSubscriptions(
      normalizedPair
    );
    
    // 4. Auto-subscribe to new pool
    if (matchingSubscriptions.length > 0) {
      await this.autoSubscribeToPool(poolInfo, matchingSubscriptions);
    }
    
    // 5. Notify clients
    await this.notifyClients(poolInfo, matchingSubscriptions);
  }
}
```

## Token Pair Matching Algorithm

### 1. Normalization Strategy
```typescript
interface TokenPair {
  token0: string;
  token1: string;
}

class TokenPairNormalizer {
  normalize(token0: string, token1: string): TokenPair {
    // Sort addresses lexicographically for consistent ordering
    return token0.toLowerCase() < token1.toLowerCase()
      ? { token0: token0.toLowerCase(), token1: token1.toLowerCase() }
      : { token0: token1.toLowerCase(), token1: token0.toLowerCase() };
  }

  createKey(pair: TokenPair): string {
    return `${pair.token0}:${pair.token1}`;
  }

  matches(pair1: TokenPair, pair2: TokenPair): boolean {
    return pair1.token0 === pair2.token0 && pair1.token1 === pair2.token1;
  }
}
```

### 2. Subscription Lookup
```typescript
class SubscriptionMatcher {
  private subscriptionIndex = new Map<string, EndogenousVariableSubscription[]>();

  async findMatchingSubscriptions(normalizedPair: TokenPair): Promise<EndogenousVariableSubscription[]> {
    const key = this.createKey(normalizedPair);
    return this.subscriptionIndex.get(key) || [];
  }

  async indexSubscription(subscription: EndogenousVariableSubscription): Promise<void> {
    const normalizedPair = this.normalizer.normalize(
      subscription.token0,
      subscription.token1
    );
    const key = this.normalizer.createKey(normalizedPair);
    
    if (!this.subscriptionIndex.has(key)) {
      this.subscriptionIndex.set(key, []);
    }
    
    this.subscriptionIndex.get(key)!.push(subscription);
  }

  async removeSubscription(subscriptionId: string): Promise<void> {
    for (const [key, subscriptions] of this.subscriptionIndex) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptionIndex.delete(key);
        }
        break;
      }
    }
  }
}
```

## Auto-Subscription Process

### 1. Pool Information Extraction
```typescript
interface PoolInfo {
  poolId: string;
  token0: string;
  token1: string;
  feeTier: number;
  tickSpacing: number;
  createdAt: number;
  blockNumber: number;
  transactionHash: string;
}

class PoolInfoExtractor {
  extractFromEvent(event: PoolCreatedEvent): PoolInfo {
    return {
      poolId: event.pool,
      token0: event.token0,
      token1: event.token1,
      feeTier: event.fee,
      tickSpacing: event.tickSpacing,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash
    };
  }

  async enrichWithInitialState(poolInfo: PoolInfo): Promise<PoolInfo> {
    // Fetch initial pool state from blockchain
    const poolState = await this.fetchPoolState(poolInfo.poolId);
    
    return {
      ...poolInfo,
      initialLiquidity: poolState.liquidity,
      initialSqrtPrice: poolState.sqrtPrice,
      initialTick: poolState.tick
    };
  }
}
```

### 2. Auto-Subscription Logic
```typescript
class AutoSubscriptionEngine {
  async autoSubscribeToPool(
    poolInfo: PoolInfo, 
    subscriptions: EndogenousVariableSubscription[]
  ): Promise<void> {
    for (const subscription of subscriptions) {
      try {
        // 1. Create pool tracking record
        await this.createPoolTracking(poolInfo, subscription);
        
        // 2. Initialize variable calculation
        await this.initializeVariableCalculation(poolInfo, subscription);
        
        // 3. Start real-time monitoring
        await this.startPoolMonitoring(poolInfo, subscription);
        
        // 4. Log subscription creation
        await this.logAutoSubscription(poolInfo, subscription);
        
      } catch (error) {
        console.error(`Failed to auto-subscribe to pool ${poolInfo.poolId}:`, error);
        await this.handleAutoSubscriptionError(poolInfo, subscription, error);
      }
    }
  }

  private async createPoolTracking(
    poolInfo: PoolInfo, 
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    const trackingId = `${poolInfo.poolId}:${subscription.id}`;
    
    await this.database.insert('pool_tracking', {
      id: trackingId,
      pool_id: poolInfo.poolId,
      variable_type: subscription.variableType,
      token0_address: poolInfo.token0,
      token1_address: poolInfo.token1,
      is_active: true,
      created_at: new Date(),
      first_snapshot_at: null,
      last_snapshot_at: null,
      snapshot_count: 0
    });
  }
}
```

## Client Notification System

### 1. Notification Types
```typescript
interface NewPoolNotification {
  type: 'new_pool_discovered';
  subscriptionId: string;
  pool: {
    poolId: string;
    token0: string;
    token1: string;
    feeTier: number;
    liquidity: string;
    createdAt: number;
  };
  autoSubscribed: boolean;
  historicalDataAvailable: boolean;
  estimatedFirstSnapshot: number;
}

interface PoolStateNotification {
  type: 'pool_state_updated';
  poolId: string;
  token0: string;
  token1: string;
  state: {
    liquidity: string;
    sqrtPrice: string;
    tick: number;
    volumeUSD: string;
    totalValueLockedUSD: string;
  };
  blockNumber: number;
  transactionHash: string;
}
```

### 2. Notification Delivery
```typescript
class NotificationService {
  async notifyClients(
    poolInfo: PoolInfo, 
    subscriptions: EndogenousVariableSubscription[]
  ): Promise<void> {
    for (const subscription of subscriptions) {
      const notification: NewPoolNotification = {
        type: 'new_pool_discovered',
        subscriptionId: subscription.id,
        pool: {
          poolId: poolInfo.poolId,
          token0: poolInfo.token0,
          token1: poolInfo.token1,
          feeTier: poolInfo.feeTier,
          liquidity: poolInfo.initialLiquidity || '0',
          createdAt: poolInfo.createdAt
        },
        autoSubscribed: true,
        historicalDataAvailable: false,
        estimatedFirstSnapshot: Date.now() + 60000 // 1 minute
      };

      // Send via WebSocket
      await this.websocketService.broadcastToSubscription(
        subscription.id, 
        notification
      );

      // Send via push notification (if enabled)
      if (subscription.pushNotificationsEnabled) {
        await this.pushNotificationService.send(
          subscription.userId,
          `New pool discovered for ${subscription.variableType}`,
          `Pool ${poolInfo.poolId} with ${poolInfo.token0}/${poolInfo.token1}`
        );
      }
    }
  }
}
```

## Historical Data Backfill

### 1. Backfill Strategy
```typescript
class HistoricalDataBackfill {
  async backfillPoolData(
    poolInfo: PoolInfo, 
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    try {
      // 1. Fetch historical pool state data
      const historicalData = await this.fetchHistoricalPoolData(
        poolInfo.poolId,
        poolInfo.createdAt,
        Date.now()
      );

      // 2. Calculate variable values for historical data
      const variableSnapshots = await this.calculateHistoricalVariables(
        historicalData,
        subscription
      );

      // 3. Store in TimescaleDB
      await this.storeHistoricalSnapshots(variableSnapshots);

      // 4. Update pool tracking record
      await this.updatePoolTracking(poolInfo.poolId, subscription.id, {
        first_snapshot_at: new Date(Math.min(...variableSnapshots.map(s => s.timestamp))),
        last_snapshot_at: new Date(Math.max(...variableSnapshots.map(s => s.timestamp))),
        snapshot_count: variableSnapshots.length
      });

    } catch (error) {
      console.error(`Failed to backfill data for pool ${poolInfo.poolId}:`, error);
      await this.handleBackfillError(poolInfo, subscription, error);
    }
  }
}
```

### 2. Data Fetching
```typescript
class HistoricalDataFetcher {
  async fetchHistoricalPoolData(
    poolId: string,
    fromTimestamp: number,
    toTimestamp: number
  ): Promise<PoolStateSnapshot[]> {
    // Fetch from The Graph Protocol
    const query = `
      query GetPoolHistory($poolId: String!, $from: BigInt!, $to: BigInt!) {
        pool(id: $poolId) {
          id
          liquidity
          sqrtPrice
          tick
          volumeUSD
          totalValueLockedUSD
          txCount
          snapshots(
            where: {
              timestamp_gte: $from,
              timestamp_lte: $to
            }
            orderBy: timestamp
            orderDirection: asc
          ) {
            timestamp
            liquidity
            sqrtPrice
            tick
            volumeUSD
            totalValueLockedUSD
            txCount
          }
        }
      }
    `;

    const result = await this.graphClient.query(query, {
      poolId,
      from: fromTimestamp,
      to: toTimestamp
    });

    return result.data.pool.snapshots;
  }
}
```

## Error Handling and Recovery

### 1. Error Types
```typescript
enum DiscoveryErrorType {
  EVENT_PROCESSING_FAILED = 'EVENT_PROCESSING_FAILED',
  SUBSCRIPTION_MATCHING_FAILED = 'SUBSCRIPTION_MATCHING_FAILED',
  AUTO_SUBSCRIPTION_FAILED = 'AUTO_SUBSCRIPTION_FAILED',
  NOTIFICATION_DELIVERY_FAILED = 'NOTIFICATION_DELIVERY_FAILED',
  HISTORICAL_DATA_FETCH_FAILED = 'HISTORICAL_DATA_FETCH_FAILED'
}
```

### 2. Retry Mechanism
```typescript
class RetryableDiscoveryService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  async processWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`${context} failed (attempt ${attempt}/${this.maxRetries}):`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`${context} failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }
}
```

### 3. Dead Letter Queue
```typescript
class DeadLetterQueue {
  async handleFailedEvent(event: any, error: Error): Promise<void> {
    const dlqEntry = {
      id: generateId(),
      event,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      },
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: Date.now() + 300000 // 5 minutes
    };

    await this.database.insert('dead_letter_queue', dlqEntry);
    
    // Schedule retry
    await this.scheduleRetry(dlqEntry.id);
  }
}
```

## Performance Optimization

### 1. Batch Processing
```typescript
class BatchProcessor {
  private batchSize = 100;
  private batchTimeout = 5000; // 5 seconds
  private pendingEvents: PoolCreatedEvent[] = [];

  async addEvent(event: PoolCreatedEvent): Promise<void> {
    this.pendingEvents.push(event);
    
    if (this.pendingEvents.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.pendingEvents.length === 0) return;
    
    const batch = this.pendingEvents.splice(0, this.batchSize);
    
    try {
      await this.processEventsBatch(batch);
    } catch (error) {
      console.error('Batch processing failed:', error);
      await this.handleBatchError(batch, error);
    }
  }
}
```

### 2. Caching Strategy
```typescript
class SubscriptionCache {
  private cache = new Map<string, EndogenousVariableSubscription[]>();
  private cacheTimeout = 300000; // 5 minutes
  private lastUpdate = 0;

  async getMatchingSubscriptions(normalizedPair: TokenPair): Promise<EndogenousVariableSubscription[]> {
    if (this.isCacheExpired()) {
      await this.refreshCache();
    }
    
    const key = this.createKey(normalizedPair);
    return this.cache.get(key) || [];
  }

  private isCacheExpired(): boolean {
    return Date.now() - this.lastUpdate > this.cacheTimeout;
  }

  private async refreshCache(): Promise<void> {
    const subscriptions = await this.database.query(
      'SELECT * FROM variable_subscriptions WHERE is_active = true'
    );
    
    this.cache.clear();
    for (const subscription of subscriptions) {
      const normalizedPair = this.normalizer.normalize(
        subscription.token0,
        subscription.token1
      );
      const key = this.normalizer.createKey(normalizedPair);
      
      if (!this.cache.has(key)) {
        this.cache.set(key, []);
      }
      this.cache.get(key)!.push(subscription);
    }
    
    this.lastUpdate = Date.now();
  }
}
```

## Monitoring and Metrics

### 1. Discovery Metrics
```typescript
interface DiscoveryMetrics {
  poolsDiscovered: number;
  autoSubscriptionsCreated: number;
  notificationsSent: number;
  errorsEncountered: number;
  averageProcessingTime: number;
  cacheHitRate: number;
}

class MetricsCollector {
  private metrics: DiscoveryMetrics = {
    poolsDiscovered: 0,
    autoSubscriptionsCreated: 0,
    notificationsSent: 0,
    errorsEncountered: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0
  };

  recordPoolDiscovered(): void {
    this.metrics.poolsDiscovered++;
  }

  recordAutoSubscription(): void {
    this.metrics.autoSubscriptionsCreated++;
  }

  recordNotificationSent(): void {
    this.metrics.notificationsSent++;
  }

  recordError(): void {
    this.metrics.errorsEncountered++;
  }
}
```

### 2. Health Checks
```typescript
class DiscoveryHealthCheck {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkEventProcessing(),
      this.checkSubscriptionMatching(),
      this.checkAutoSubscription(),
      this.checkNotificationDelivery(),
      this.checkDatabaseConnection()
    ]);

    const failures = checks.filter(result => result.status === 'rejected');
    
    return {
      status: failures.length === 0 ? 'healthy' : 'degraded',
      checks: checks.map((result, index) => ({
        name: this.getCheckName(index),
        status: result.status,
        error: result.status === 'rejected' ? result.reason : null
      })),
      timestamp: Date.now()
    };
  }
}
```
