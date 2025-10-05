# Volume-Liquidity Efficiency Subscription Integration

## Overview

This document describes how the volume-liquidity efficiency endogenous variable integrates with the real-time subscription system. It covers determinant calculation from real-time pool data, temporal data handling, and configuration parameter management.

## Integration Architecture

### 1. Real-Time Data Flow
```
Pool State Update → Determinant Calculation → Efficiency Calculation → Snapshot Storage → WebSocket Broadcast
```

### 2. Component Integration
- **Pool State Monitor**: Tracks pool state changes from blockchain
- **Determinant Calculator**: Calculates efficiency determinants from pool state
- **Efficiency Engine**: Computes efficiency value using configuration parameters
- **Snapshot Storage**: Stores time-series data in TimescaleDB
- **WebSocket Broadcaster**: Sends real-time updates to subscribed clients

## Determinant Calculation from Real-Time Data

### 1. Primary Determinants (From Pool State)
```typescript
interface PoolStateUpdate {
  poolId: string;
  token0: string;
  token1: string;
  liquidity: string;
  sqrtPrice: string;
  tick: number;
  volumeUSD: string;
  totalValueLockedUSD: string;
  txCount: string;
  blockNumber: number;
  timestamp: number;
}

class VolumeLiquidityDeterminantCalculator {
  calculatePrimaryDeterminants(poolState: PoolStateUpdate): VolumeLiquidityDeterminants {
    return {
      // Primary determinants from pool state
      volumeUSD: poolState.volumeUSD,
      totalValueLockedUSD: poolState.totalValueLockedUSD,
      liquidity: poolState.liquidity,
      
      // Derived determinants
      volumeLiquidityRatio: this.calculateVolumeLiquidityRatio(
        poolState.volumeUSD, 
        poolState.liquidity
      ),
      tvlLiquidityRatio: this.calculateTVLLiquidityRatio(
        poolState.totalValueLockedUSD, 
        poolState.liquidity
      ),
      volumeTVLRatio: this.calculateVolumeTVLRatio(
        poolState.volumeUSD, 
        poolState.totalValueLockedUSD
      ),
      
      // Risk-adjusted determinants
      riskAdjustedVolume: this.calculateRiskAdjustedVolume(
        poolState.volumeUSD,
        poolState.totalValueLockedUSD
      ),
      riskAdjustedLiquidity: this.calculateRiskAdjustedLiquidity(
        poolState.liquidity,
        poolState.totalValueLockedUSD
      ),
      stabilityFactor: this.calculateStabilityFactor(
        poolState.volumeUSD,
        poolState.totalValueLockedUSD
      )
    };
  }
}
```

### 2. Temporal Determinants (From Historical Data)
```typescript
class TemporalDeterminantCalculator {
  async calculateTemporalDeterminants(
    poolId: string,
    currentDeterminants: VolumeLiquidityDeterminants,
    historicalSnapshots: VariableSnapshot[]
  ): Promise<TemporalDeterminants> {
    if (historicalSnapshots.length < 2) {
      return {
        volumeGrowthRate: 0,
        liquidityGrowthRate: 0,
        efficiencyTrend: 0
      };
    }

    const recentSnapshots = historicalSnapshots.slice(-10); // Last 10 snapshots
    const olderSnapshots = historicalSnapshots.slice(-20, -10); // Previous 10 snapshots

    return {
      volumeGrowthRate: this.calculateGrowthRate(
        this.extractVolumeValues(recentSnapshots),
        this.extractVolumeValues(olderSnapshots)
      ),
      liquidityGrowthRate: this.calculateGrowthRate(
        this.extractLiquidityValues(recentSnapshots),
        this.extractLiquidityValues(olderSnapshots)
      ),
      efficiencyTrend: this.calculateEfficiencyTrend(
        this.extractEfficiencyValues(recentSnapshots)
      )
    };
  }

  private calculateGrowthRate(recent: number[], older: number[]): number {
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    if (olderAvg === 0) return 0;
    return (recentAvg - olderAvg) / olderAvg;
  }
}
```

## Real-Time Efficiency Calculation

### 1. Efficiency Engine Integration
```typescript
class RealTimeEfficiencyEngine {
  constructor(
    private determinantCalculator: VolumeLiquidityDeterminantCalculator,
    private temporalCalculator: TemporalDeterminantCalculator,
    private configManager: ConfigurationManager
  ) {}

  async calculateEfficiency(
    poolState: PoolStateUpdate,
    subscription: EndogenousVariableSubscription
  ): Promise<EfficiencySnapshot> {
    // 1. Get configuration parameters
    const config = await this.configManager.getConfiguration(
      subscription.variableType,
      subscription.parameters
    );

    // 2. Calculate primary determinants
    const primaryDeterminants = this.determinantCalculator.calculatePrimaryDeterminants(poolState);

    // 3. Get historical data for temporal determinants
    const historicalSnapshots = await this.getHistoricalSnapshots(
      poolState.poolId,
      subscription.id,
      20 // Last 20 snapshots
    );

    // 4. Calculate temporal determinants
    const temporalDeterminants = await this.temporalCalculator.calculateTemporalDeterminants(
      poolState.poolId,
      primaryDeterminants,
      historicalSnapshots
    );

    // 5. Combine all determinants
    const allDeterminants: VolumeLiquidityDeterminants = {
      ...primaryDeterminants,
      ...temporalDeterminants
    };

    // 6. Calculate efficiency value
    const efficiency = this.calculateEfficiencyValue(allDeterminants, config);

    // 7. Create snapshot
    return {
      poolId: poolState.poolId,
      subscriptionId: subscription.id,
      timestamp: poolState.timestamp,
      blockNumber: poolState.blockNumber,
      value: efficiency,
      determinants: allDeterminants,
      poolState: {
        liquidity: poolState.liquidity,
        sqrtPrice: poolState.sqrtPrice,
        tick: poolState.tick,
        volumeUSD: poolState.volumeUSD,
        totalValueLockedUSD: poolState.totalValueLockedUSD,
        txCount: poolState.txCount
      },
      calculationMetadata: {
        calculationTime: Date.now(),
        configVersion: config.version,
        historicalDataPoints: historicalSnapshots.length
      }
    };
  }
}
```

### 2. Configuration Parameter Management
```typescript
class ConfigurationManager {
  private configCache = new Map<string, EfficiencyConfig>();

  async getConfiguration(
    variableType: string,
    parameters: Record<string, any>
  ): Promise<EfficiencyConfig> {
    const configKey = this.createConfigKey(variableType, parameters);
    
    if (this.configCache.has(configKey)) {
      return this.configCache.get(configKey)!;
    }

    const config = await this.buildConfiguration(variableType, parameters);
    this.configCache.set(configKey, config);
    
    return config;
  }

  private async buildConfiguration(
    variableType: string,
    parameters: Record<string, any>
  ): Promise<EfficiencyConfig> {
    if (variableType === 'volume-liquidity-efficiency') {
      return new EfficiencyConfigBuilderImpl()
        .setVolumeWeight(parameters.volumeWeight || 0.4)
        .setLiquidityWeight(parameters.liquidityWeight || 0.3)
        .setTVLWeight(parameters.tvlWeight || 0.3)
        .setVolumeNormalizationFactor(parameters.volumeNormalizationFactor || 1000000)
        .setLiquidityNormalizationFactor(parameters.liquidityNormalizationFactor || 1000000)
        .setRiskAdjustmentFactor(parameters.riskAdjustmentFactor || 0.1)
        .setStabilityWeight(parameters.stabilityWeight || 0.1)
        .setTemporalWeight(parameters.temporalWeight || 0.1)
        .build();
    }

    throw new Error(`Unsupported variable type: ${variableType}`);
  }
}
```

## Temporal Data Handling

### 1. Historical Data Retrieval
```typescript
class HistoricalDataService {
  async getHistoricalSnapshots(
    poolId: string,
    subscriptionId: string,
    limit: number = 20
  ): Promise<VariableSnapshot[]> {
    const query = `
      SELECT 
        timestamp,
        value,
        determinants,
        pool_state
      FROM endog_variable_snapshots
      WHERE pool_id = $1 
        AND variable_type = 'volume-liquidity-efficiency'
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await this.database.query(query, [poolId, limit]);
    return result.rows.map(row => this.mapRowToSnapshot(row));
  }

  async getHistoricalPoolStates(
    poolId: string,
    fromTimestamp: number,
    toTimestamp: number
  ): Promise<PoolStateSnapshot[]> {
    const query = `
      SELECT 
        time,
        liquidity,
        sqrt_price,
        tick,
        volume_usd,
        total_value_locked_usd,
        tx_count
      FROM pool_state_history
      WHERE pool_id = $1 
        AND time >= $2 
        AND time <= $3
      ORDER BY time ASC
    `;

    const result = await this.database.query(query, [poolId, fromTimestamp, toTimestamp]);
    return result.rows.map(row => this.mapRowToPoolState(row));
  }
}
```

### 2. Growth Rate Calculations
```typescript
class GrowthRateCalculator {
  calculateVolumeGrowthRate(snapshots: VariableSnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const recent = snapshots.slice(0, 5); // Last 5 snapshots
    const older = snapshots.slice(5, 10); // Previous 5 snapshots

    const recentAvg = this.calculateAverageVolume(recent);
    const olderAvg = this.calculateAverageVolume(older);

    if (olderAvg === 0) return 0;
    return (recentAvg - olderAvg) / olderAvg;
  }

  calculateLiquidityGrowthRate(snapshots: VariableSnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const recent = snapshots.slice(0, 5);
    const older = snapshots.slice(5, 10);

    const recentAvg = this.calculateAverageLiquidity(recent);
    const olderAvg = this.calculateAverageLiquidity(older);

    if (olderAvg === 0) return 0;
    return (recentAvg - olderAvg) / olderAvg;
  }

  calculateEfficiencyTrend(snapshots: VariableSnapshot[]): number {
    if (snapshots.length < 3) return 0;

    const values = snapshots.map(s => s.value);
    return this.calculateLinearTrend(values);
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
}
```

## WebSocket Integration

### 1. Real-Time Update Broadcasting
```typescript
class VolumeLiquidityWebSocketService {
  async broadcastEfficiencyUpdate(snapshot: EfficiencySnapshot): Promise<void> {
    const update: VariableUpdate = {
      type: 'variable_update',
      subscriptionId: snapshot.subscriptionId,
      poolId: snapshot.poolId,
      variableType: 'volume-liquidity-efficiency',
      value: snapshot.value,
      determinants: snapshot.determinants,
      poolState: snapshot.poolState,
      calculationMetadata: snapshot.calculationMetadata,
      timestamp: snapshot.timestamp,
      version: '1.0.0'
    };

    // Broadcast to all subscribers of this pool
    await this.websocketManager.broadcastToPool(snapshot.poolId, update);

    // Broadcast to all subscribers of this subscription
    await this.websocketManager.broadcastToSubscription(
      snapshot.subscriptionId, 
      update
    );
  }

  async broadcastNewPoolDiscovery(
    poolInfo: PoolInfo,
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    const notification: NewPoolDiscovered = {
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
      timestamp: Date.now(),
      version: '1.0.0'
    };

    await this.websocketManager.broadcastToSubscription(
      subscription.id,
      notification
    );
  }
}
```

### 2. Client Subscription Handling
```typescript
class VolumeLiquiditySubscriptionHandler {
  async handleSubscriptionRequest(
    request: SubscribeRequest
  ): Promise<SubscribeResponse> {
    // Validate request parameters
    const validation = this.validateSubscriptionRequest(request);
    if (!validation.valid) {
      return {
        type: 'subscribe_response',
        success: false,
        error: validation.error,
        timestamp: Date.now(),
        version: '1.0.0'
      };
    }

    // Create subscription
    const subscription = await this.createSubscription(request);

    // Find matching pools
    const matchingPools = await this.findMatchingPools(
      request.token0,
      request.token1
    );

    // Start monitoring pools
    await this.startPoolMonitoring(subscription, matchingPools);

    return {
      type: 'subscribe_response',
      success: true,
      subscriptionId: subscription.id,
      matchingPools: matchingPools.map(pool => ({
        poolId: pool.poolId,
        feeTier: pool.feeTier,
        liquidity: pool.liquidity,
        volumeUSD: pool.volumeUSD,
        totalValueLockedUSD: pool.totalValueLockedUSD,
        createdAt: pool.createdAt
      })),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }
}
```

## Performance Optimization

### 1. Caching Strategy
```typescript
class VolumeLiquidityCache {
  private determinantCache = new Map<string, VolumeLiquidityDeterminants>();
  private efficiencyCache = new Map<string, number>();
  private cacheTimeout = 60000; // 1 minute

  getCachedDeterminants(poolId: string, timestamp: number): VolumeLiquidityDeterminants | null {
    const key = `${poolId}:${timestamp}`;
    const cached = this.determinantCache.get(key);
    
    if (cached && Date.now() - timestamp < this.cacheTimeout) {
      return cached;
    }
    
    return null;
  }

  setCachedDeterminants(
    poolId: string, 
    timestamp: number, 
    determinants: VolumeLiquidityDeterminants
  ): void {
    const key = `${poolId}:${timestamp}`;
    this.determinantCache.set(key, determinants);
  }
}
```

### 2. Batch Processing
```typescript
class BatchEfficiencyProcessor {
  private batchSize = 50;
  private batchTimeout = 5000; // 5 seconds
  private pendingUpdates: PoolStateUpdate[] = [];

  async addPoolStateUpdate(update: PoolStateUpdate): Promise<void> {
    this.pendingUpdates.push(update);
    
    if (this.pendingUpdates.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;
    
    const batch = this.pendingUpdates.splice(0, this.batchSize);
    
    // Process batch in parallel
    const promises = batch.map(update => this.processPoolStateUpdate(update));
    await Promise.allSettled(promises);
  }
}
```

## Error Handling and Recovery

### 1. Calculation Error Handling
```typescript
class EfficiencyCalculationErrorHandler {
  async handleCalculationError(
    error: Error,
    poolState: PoolStateUpdate,
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    console.error(`Efficiency calculation failed for pool ${poolState.poolId}:`, error);
    
    // Log error for debugging
    await this.logCalculationError(error, poolState, subscription);
    
    // Send error notification to client
    await this.sendErrorNotification(subscription.id, {
      type: 'calculation_error',
      poolId: poolState.poolId,
      error: error.message,
      timestamp: Date.now()
    });
    
    // Attempt recovery
    await this.attemptRecovery(poolState, subscription);
  }

  private async attemptRecovery(
    poolState: PoolStateUpdate,
    subscription: EndogenousVariableSubscription
  ): Promise<void> {
    try {
      // Retry with simplified calculation
      const simplifiedConfig = this.createSimplifiedConfig(subscription.parameters);
      const efficiency = await this.calculateWithSimplifiedConfig(
        poolState,
        simplifiedConfig
      );
      
      // Store simplified result
      await this.storeSimplifiedResult(poolState, subscription, efficiency);
      
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      await this.markPoolAsFailed(poolState.poolId, subscription.id);
    }
  }
}
```

### 2. Data Consistency Checks
```typescript
class DataConsistencyChecker {
  async validateEfficiencyCalculation(
    snapshot: EfficiencySnapshot
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check value bounds
    if (snapshot.value < 0 || snapshot.value > 10) {
      errors.push(`Efficiency value ${snapshot.value} is out of bounds [0, 10]`);
    }

    // Check determinant consistency
    if (snapshot.determinants.volumeLiquidityRatio < 0) {
      errors.push('Volume-liquidity ratio cannot be negative');
    }

    // Check temporal determinant bounds
    if (Math.abs(snapshot.determinants.volumeGrowthRate) > 10) {
      errors.push(`Volume growth rate ${snapshot.determinants.volumeGrowthRate} is unrealistic`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

## Monitoring and Metrics

### 1. Performance Metrics
```typescript
class VolumeLiquidityMetrics {
  private metrics = {
    calculationsPerformed: 0,
    averageCalculationTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
    websocketMessagesSent: 0
  };

  recordCalculation(duration: number): void {
    this.metrics.calculationsPerformed++;
    this.updateAverageCalculationTime(duration);
  }

  recordError(): void {
    this.metrics.errorRate = this.calculateErrorRate();
  }

  recordCacheHit(): void {
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
  }

  recordWebSocketMessage(): void {
    this.metrics.websocketMessagesSent++;
  }
}
```

### 2. Health Checks
```typescript
class VolumeLiquidityHealthCheck {
  async checkSystemHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDeterminantCalculation(),
      this.checkEfficiencyCalculation(),
      this.checkTemporalDataAccess(),
      this.checkWebSocketConnectivity(),
      this.checkDatabaseConnection()
    ]);

    const failures = checks.filter(result => result.status === 'rejected');
    
    return {
      status: failures.length === 0 ? 'healthy' : 'degraded',
      component: 'volume-liquidity-efficiency',
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
