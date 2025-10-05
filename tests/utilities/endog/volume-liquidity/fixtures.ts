/**
 * Test Fixtures and Utilities
 * 
 * Reusable test data and helper functions for Volume-to-Liquidity efficiency tests.
 */

import { PoolState } from '../../../../src/utilities/types/PoolState';
import { EfficiencyConfig } from '../../../../src/utilities/endog/volume-liquidity/types';

/**
 * Create a mock pool state for testing
 * @param overrides Optional overrides for specific fields
 * @returns Mock pool state
 */
export function createMockPoolState<T extends string = string>(
  overrides: Partial<PoolState<T>> = {}
): PoolState<T> {
  const defaultPoolState: PoolState<T> = {
    id: '0x1234567890abcdef1234567890abcdef12345678',
    poolId: '0x1234567890abcdef1234567890abcdef12345678' as T,
    token0: {
      id: '0xA0b86a33E6441b8c4C8C0d4B0e8B0e8B0e8B0e8B',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      derivedETH: '0.0005',
      derivedUSD: '1.00'
    },
    token1: {
      id: '0xB0b86a33E6441b8c4C8C0d4B0e8B0e8B0e8B0e8B',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      derivedETH: '1.0',
      derivedUSD: '2000.00'
    },
    feeTier: 500,
    liquidity: '1000000000000000000', // 1 ETH worth
    sqrtPrice: '79228162514264337593543950336',
    tick: 0,
    tickSpacing: 10,
    feeProtocol: 0,
    volumeToken0: '500000000000', // 500 USDC
    volumeToken1: '250000000000000000', // 0.25 ETH
    volumeUSD: '1000000', // 1M USD
    feesUSD: '5000', // 5K USD
    txCount: '1000',
    collectedFeesToken0: '2500000000', // 2.5 USDC
    collectedFeesToken1: '1250000000000000', // 0.00125 ETH
    collectedFeesUSD: '5000',
    totalValueLockedToken0: '500000000000', // 500 USDC
    totalValueLockedToken1: '250000000000000000', // 0.25 ETH
    totalValueLockedETH: '0.5',
    totalValueLockedUSD: '1000000',
    createdAtTimestamp: '1640995200',
    createdAtBlockNumber: '1000000',
    ...overrides
  };

  return defaultPoolState;
}

/**
 * Create a mock configuration for testing
 * @param overrides Optional overrides for specific fields
 * @returns Mock configuration
 */
export function createMockConfig(overrides: Partial<EfficiencyConfig> = {}): EfficiencyConfig {
  return {
    volumeWeight: 0.4,
    liquidityWeight: 0.3,
    tvlWeight: 0.3,
    volumeNormalizationFactor: 1000000,
    liquidityNormalizationFactor: 1000000,
    volatilityAdjustment: 0.1,
    correlationAdjustment: 0.05,
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    decayFactor: 0.95,
    ...overrides
  };
}

/**
 * Create a high volume pool state
 * @returns High volume pool state
 */
export function createHighVolumePoolState<T extends string = string>(): PoolState<T> {
  return createMockPoolState<T>({
    volumeUSD: '10000000', // 10M USD
    totalValueLockedUSD: '2000000', // 2M USD
    liquidity: '2000000000000000000' // 2 ETH worth
  });
}

/**
 * Create a low volume pool state
 * @returns Low volume pool state
 */
export function createLowVolumePoolState<T extends string = string>(): PoolState<T> {
  return createMockPoolState<T>({
    volumeUSD: '100000', // 100K USD
    totalValueLockedUSD: '5000000', // 5M USD
    liquidity: '5000000000000000000' // 5 ETH worth
  });
}

/**
 * Create a balanced pool state
 * @returns Balanced pool state
 */
export function createBalancedPoolState<T extends string = string>(): PoolState<T> {
  return createMockPoolState<T>({
    volumeUSD: '2000000', // 2M USD
    totalValueLockedUSD: '2000000', // 2M USD
    liquidity: '2000000000000000000' // 2 ETH worth
  });
}

/**
 * Create an edge case pool state with zero values
 * @returns Edge case pool state
 */
export function createEdgeCasePoolState<T extends string = string>(): PoolState<T> {
  return createMockPoolState<T>({
    volumeUSD: '0',
    totalValueLockedUSD: '0',
    liquidity: '0'
  });
}

/**
 * Create a pool state with very large values
 * @returns Large values pool state
 */
export function createLargeValuesPoolState<T extends string = string>(): PoolState<T> {
  return createMockPoolState<T>({
    volumeUSD: '1000000000000', // 1T USD
    totalValueLockedUSD: '100000000000', // 100B USD
    liquidity: '1000000000000000000000' // 1000 ETH worth
  });
}

/**
 * Create a pool state with very small values
 * @returns Small values pool state
 */
export function createSmallValuesPoolState<T extends string = string>(): PoolState<T> {
  return createMockPoolState<T>({
    volumeUSD: '1',
    totalValueLockedUSD: '1',
    liquidity: '1'
  });
}

/**
 * Generate random pool state for property-based testing
 * @param seed Optional seed for reproducible randomness
 * @returns Random pool state
 */
export function generateRandomPoolState<T extends string = string>(seed?: number): PoolState<T> {
  if (seed !== undefined) {
    // Simple seeded random number generator
    const x = Math.sin(seed) * 10000;
    const random = x - Math.floor(x);
    
    const volumeUSD = Math.floor(random * 10000000) + 1000;
    const totalValueLockedUSD = Math.floor(random * 5000000) + 1000;
    const liquidity = Math.floor(random * 1000000000000000000) + 100000000000000000;
    
    return createMockPoolState<T>({
      volumeUSD: volumeUSD.toString(),
      totalValueLockedUSD: totalValueLockedUSD.toString(),
      liquidity: liquidity.toString()
    });
  }
  
  // Use Math.random() if no seed provided
  const volumeUSD = Math.floor(Math.random() * 10000000) + 1000;
  const totalValueLockedUSD = Math.floor(Math.random() * 5000000) + 1000;
  const liquidity = Math.floor(Math.random() * 1000000000000000000) + 100000000000000000;
  
  return createMockPoolState<T>({
    volumeUSD: volumeUSD.toString(),
    totalValueLockedUSD: totalValueLockedUSD.toString(),
    liquidity: liquidity.toString()
  });
}

/**
 * Create multiple pool states for batch testing
 * @param count Number of pool states to create
 * @returns Array of pool states
 */
export function createMultiplePoolStates<T extends string = string>(count: number): PoolState<T>[] {
  const poolStates: PoolState<T>[] = [];
  
  for (let i = 0; i < count; i++) {
    const poolState = generateRandomPoolState<T>(i);
    poolStates.push(poolState);
  }
  
  return poolStates;
}

/**
 * Helper function to assert efficiency values are within expected range
 * @param efficiency Efficiency value to check
 * @param min Minimum expected value
 * @param max Maximum expected value
 */
export function assertEfficiencyInRange(efficiency: number, min: number = 0, max: number = 10): void {
  expect(efficiency).toBeGreaterThanOrEqual(min);
  expect(efficiency).toBeLessThanOrEqual(max);
  expect(Number.isFinite(efficiency)).toBe(true);
}

/**
 * Helper function to assert efficiency comparison results
 * @param result Comparison result
 * @param expected Expected comparison result
 */
export function assertComparisonResult(result: any, expected: any): void {
  expect(result).toBe(expected);
}

/**
 * Helper function to assert validation results
 * @param result Validation result
 * @param shouldBeValid Whether the result should be valid
 */
export function assertValidationResult(result: { isValid: boolean; errors: string[] }, shouldBeValid: boolean): void {
  expect(result.isValid).toBe(shouldBeValid);
  if (!shouldBeValid) {
    expect(result.errors.length).toBeGreaterThan(0);
  }
}

/**
 * Helper function to create test scenarios
 * @returns Array of test scenarios with names and pool states
 */
export function createTestScenarios<T extends string = string>(): Array<{
  name: string;
  poolState: PoolState<T>;
  expectedEfficiencyRange: [number, number];
}> {
  return [
    {
      name: 'High Volume Pool',
      poolState: createHighVolumePoolState<T>(),
      expectedEfficiencyRange: [0.5, 2.0]
    },
    {
      name: 'Low Volume Pool',
      poolState: createLowVolumePoolState<T>(),
      expectedEfficiencyRange: [0.1, 0.5]
    },
    {
      name: 'Balanced Pool',
      poolState: createBalancedPoolState<T>(),
      expectedEfficiencyRange: [0.3, 1.0]
    },
    {
      name: 'Edge Case Pool',
      poolState: createEdgeCasePoolState<T>(),
      expectedEfficiencyRange: [0, 0.1]
    }
  ];
}

/**
 * Helper function to generate test data for property-based testing
 * @param count Number of test cases to generate
 * @returns Array of test data
 */
export function generatePropertyTestData<T extends string = string>(count: number): Array<{
  poolState: PoolState<T>;
  config: EfficiencyConfig;
}> {
  const testData: Array<{ poolState: PoolState<T>; config: EfficiencyConfig }> = [];
  
  for (let i = 0; i < count; i++) {
    const poolState = generateRandomPoolState<T>(i);
    const config = createMockConfig({
      volumeWeight: 0.3 + (i % 3) * 0.1,
      liquidityWeight: 0.3 + (i % 3) * 0.1,
      tvlWeight: 0.3 + (i % 3) * 0.1
    });
    
    testData.push({ poolState, config });
  }
  
  return testData;
}
