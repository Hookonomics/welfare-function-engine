# Subgraph Querier Guideline for Endogenous Variables

## Overview

This document provides guidelines for creating subgraph queries tailored to specific endogenous variables. Each endogenous variable requires a custom querier that fetches the temporal data needed for its calculation.

## Architecture

### Directory Structure
```
src/utilities/endog/volume-liquidity/querier/
├── subgraph-querier-guideline.md
├── VolumeLiquidityQuerier.ts
├── queries/
│   ├── volume-growth.graphql
│   ├── liquidity-growth.graphql
│   └── efficiency-trend.graphql
├── types/
│   ├── SubgraphTypes.ts
│   └── TemporalDataTypes.ts
└── tests/
    ├── VolumeLiquidityQuerier.test.ts
    └── query-validation.test.ts
```

## Design Principles

### 1. Variable-Specific Queries
Each endogenous variable should have its own dedicated querier that:
- Fetches only the data needed for that specific variable
- Optimizes queries for the temporal patterns of that variable
- Handles the specific data transformations required

### 2. Temporal Data Requirements
For volume-liquidity efficiency, we need:
- **Volume Growth Rate**: Historical volume data to calculate growth trends
- **Liquidity Growth Rate**: Historical liquidity data to calculate growth trends  
- **Efficiency Trend**: Historical efficiency calculations to identify trends

### 3. Query Optimization
- Use GraphQL fragments for reusable query parts
- Implement pagination for large datasets
- Cache frequently accessed data
- Handle rate limiting and retries

## Relationship with Subscription System

### Querier vs Subscription System
- **Querier**: Used for historical batch queries and one-time data retrieval
- **Subscription System**: Used for real-time updates and continuous monitoring
- **Integration**: Querier provides historical context for subscription system initialization

### When to Use Each Approach
- **Use Querier for**:
  - Initial data loading when subscribing to a variable
  - Historical analysis and backtesting
  - One-time data exports
  - Debugging and troubleshooting

- **Use Subscription System for**:
  - Real-time monitoring and alerts
  - Live dashboard updates
  - Continuous data streaming
  - Production monitoring

## Implementation Guidelines

### 1. Query Structure
```typescript
interface TemporalDataQuerier<T extends string = string> {
  // Fetch historical data for specific time range
  fetchHistoricalData(poolId: T, startTime: number, endTime: number): Promise<HistoricalData>;
  
  // Calculate growth rates from historical data
  calculateGrowthRates(historicalData: HistoricalData): GrowthRates;
  
  // Calculate efficiency trend from historical data
  calculateEfficiencyTrend(historicalData: HistoricalData): EfficiencyTrend;
  
  // Get latest data point
  getLatestData(poolId: T): Promise<LatestData>;
}
```

### 2. Data Types
```typescript
interface HistoricalData {
  poolId: string;
  timeRange: {
    start: number;
    end: number;
  };
  dataPoints: DataPoint[];
}

interface DataPoint {
  timestamp: number;
  volumeUSD: string;
  totalValueLockedUSD: string;
  liquidity: string;
  // Additional fields as needed
}

interface GrowthRates {
  volumeGrowthRate: number;
  liquidityGrowthRate: number;
  timeWindow: number;
}

interface EfficiencyTrend {
  trend: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}
```

### 3. GraphQL Query Examples

#### Volume Growth Query
```graphql
query VolumeGrowth($poolId: String!, $startTime: Int!, $endTime: Int!) {
  pool(id: $poolId) {
    id
    volumeUSD
    totalValueLockedUSD
    liquidity
    createdAtTimestamp
  }
  
  poolDayDatas(
    where: { 
      pool: $poolId,
      date_gte: $startTime,
      date_lte: $endTime
    }
    orderBy: date
    orderDirection: asc
  ) {
    date
    volumeUSD
    totalValueLockedUSD
    liquidity
    feesUSD
    txCount
  }
}
```

#### Liquidity Growth Query
```graphql
query LiquidityGrowth($poolId: String!, $startTime: Int!, $endTime: Int!) {
  pool(id: $poolId) {
    id
    totalValueLockedUSD
    liquidity
  }
  
  poolHourDatas(
    where: { 
      pool: $poolId,
      periodStartUnix_gte: $startTime,
      periodStartUnix_lte: $endTime
    }
    orderBy: periodStartUnix
    orderDirection: asc
  ) {
    periodStartUnix
    totalValueLockedUSD
    liquidity
    volumeUSD
  }
}
```

#### Efficiency Trend Query
```graphql
query EfficiencyTrend($poolId: String!, $startTime: Int!, $endTime: Int!) {
  pool(id: $poolId) {
    id
    volumeUSD
    totalValueLockedUSD
    liquidity
  }
  
  poolDayDatas(
    where: { 
      pool: $poolId,
      date_gte: $startTime,
      date_lte: $endTime
    }
    orderBy: date
    orderDirection: asc
  ) {
    date
    volumeUSD
    totalValueLockedUSD
    liquidity
    feesUSD
    txCount
  }
}
```

## Implementation Steps

### 1. Create Base Querier Interface
```typescript
interface BaseQuerier<T extends string = string> {
  // Common methods for all queriers
  fetchData(poolId: T, timeRange: TimeRange): Promise<any>;
  validateData(data: any): boolean;
  handleErrors(error: Error): void;
}
```

### 2. Implement Variable-Specific Querier
```typescript
class VolumeLiquidityQuerier<T extends string = string> implements BaseQuerier<T> {
  // Implementation specific to volume-liquidity efficiency
}
```

### 3. Create Query Files
- Separate GraphQL queries into individual files
- Use fragments for common query parts
- Implement query validation

### 4. Add Testing
- Unit tests for query logic
- Integration tests with mock subgraph
- Performance tests for large datasets

## Best Practices

### 1. Error Handling
- Implement retry logic for failed requests
- Handle rate limiting gracefully
- Provide meaningful error messages

### 2. Caching
- Cache frequently accessed data
- Implement cache invalidation strategies
- Use appropriate cache TTLs

### 3. Performance
- Use pagination for large datasets
- Implement query optimization
- Monitor query performance

### 4. Testing
- Mock subgraph responses
- Test edge cases and error conditions
- Validate data transformations

## Usage Example

```typescript
// Create querier instance
const querier = new VolumeLiquidityQuerier<"0x123">();

// Fetch historical data
const historicalData = await querier.fetchHistoricalData(
  "0x123",
  startTime,
  endTime
);

// Calculate growth rates
const growthRates = querier.calculateGrowthRates(historicalData);

// Calculate efficiency trend
const efficiencyTrend = querier.calculateEfficiencyTrend(historicalData);

// Use in efficiency calculation
const efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
efficiency.determinants.volumeGrowthRate = growthRates.volumeGrowthRate;
efficiency.determinants.liquidityGrowthRate = growthRates.liquidityGrowthRate;
efficiency.determinants.efficiencyTrend = efficiencyTrend.trend;
```

## Next Steps

1. Implement the VolumeLiquidityQuerier class
2. Create GraphQL query files
3. Add comprehensive tests
4. Document usage examples
5. Optimize for performance
