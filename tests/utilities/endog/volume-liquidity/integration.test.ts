/**
 * Integration Tests for Volume-to-Liquidity Efficiency
 * 
 * Tests the complete system with realistic mock pool states,
 * batch processing, and end-to-end workflows.
 */

import { VolumeLiquidityEfficiencyImpl } from '../../../../src/utilities/endog/volume-liquidity/VolumeLiquidityEfficiency';
import { EfficiencyConfigBuilderImpl } from '../../../../src/utilities/endog/volume-liquidity/EfficiencyConfigBuilder';
import { ComparisonResult } from '../../../../src/utilities/endog/volume-liquidity/types';
import { 
  createMockPoolState, 
  createMockConfig,
  createHighVolumePoolState,
  createLowVolumePoolState,
  createBalancedPoolState,
  createEdgeCasePoolState,
  createLargeValuesPoolState,
  createSmallValuesPoolState,
  createMultiplePoolStates,
  createTestScenarios,
  assertEfficiencyInRange,
  assertComparisonResult
} from './fixtures';

describe('VolumeLiquidityEfficiencyImpl - Integration Tests', () => {
  let config: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    config = createMockConfig();
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow from pool state to efficiency ranking', () => {
      // Create multiple pool states
      const poolStates = [
        createHighVolumePoolState(),
        createBalancedPoolState(),
        createLowVolumePoolState()
      ];

      // Create efficiencies
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // Validate all efficiencies
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      });

      // Test preference ordering
      const highVolumeEfficiency = efficiencies[0]!;
      const balancedEfficiency = efficiencies[1]!;
      const lowVolumeEfficiency = efficiencies[2]!;

      const highToBalanced = highVolumeEfficiency.preferenceOrdering.compare(balancedEfficiency);
      const balancedToLow = balancedEfficiency.preferenceOrdering.compare(lowVolumeEfficiency);
      const highToLow = highVolumeEfficiency.preferenceOrdering.compare(lowVolumeEfficiency);

      expect(highToBalanced).toBe(ComparisonResult.GREATER);
      expect(balancedToLow).toBe(ComparisonResult.GREATER);
      expect(highToLow).toBe(ComparisonResult.GREATER);

      // Test ranking
      const highRank = highVolumeEfficiency.preferenceOrdering.getPreferenceRank([balancedEfficiency, lowVolumeEfficiency]);
      const balancedRank = balancedEfficiency.preferenceOrdering.getPreferenceRank([highVolumeEfficiency, lowVolumeEfficiency]);
      const lowRank = lowVolumeEfficiency.preferenceOrdering.getPreferenceRank([highVolumeEfficiency, balancedEfficiency]);

      expect(highRank).toBe(1);
      expect(balancedRank).toBe(2);
      expect(lowRank).toBe(3);
    });

    it('should handle batch processing of multiple pools', () => {
      const poolStates = createMultiplePoolStates(10);
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // All efficiencies should be valid
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
        assertEfficiencyInRange(efficiency.efficiency);
      });

      // Sort by efficiency
      const sortedEfficiencies = efficiencies.sort((a, b) => b.efficiency - a.efficiency);

      // Verify sorting is correct
      for (let i = 0; i < sortedEfficiencies.length - 1; i++) {
        expect(sortedEfficiencies[i]!.efficiency).toBeGreaterThanOrEqual(
          sortedEfficiencies[i + 1]!.efficiency
        );
      }
    });

    it('should handle different configurations for same pool states', () => {
      const poolState = createBalancedPoolState();
      
      const config1 = createMockConfig({
        volumeWeight: 0.6,
        liquidityWeight: 0.2,
        tvlWeight: 0.2
      });
      
      const config2 = createMockConfig({
        volumeWeight: 0.2,
        liquidityWeight: 0.6,
        tvlWeight: 0.2
      });

      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config1);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config2);

      expect(efficiency1.efficiency).not.toBe(efficiency2.efficiency);
      expect(efficiency1.isValid()).toBe(true);
      expect(efficiency2.isValid()).toBe(true);
    });
  });

  describe('Realistic Pool Scenarios', () => {
    it('should handle high volume / low liquidity pools', () => {
      const highVolumePool = createHighVolumePoolState();
      const efficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);

      expect(efficiency.efficiency).toBeGreaterThan(0);
      expect(efficiency.getEfficiencyCategory()).toBeDefined();
      expect(efficiency.getEfficiencyPercentage()).toBeGreaterThan(0);
      
      const breakdown = efficiency.getEfficiencyBreakdown();
      expect(breakdown.volumeComponent).toBeGreaterThan(0);
      expect(breakdown.total).toBeCloseTo(efficiency.efficiency, 10);
    });

    it('should handle low volume / high liquidity pools', () => {
      const lowVolumePool = createLowVolumePoolState();
      const efficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.getEfficiencyCategory()).toBeDefined();
      expect(efficiency.getEfficiencyPercentage()).toBeGreaterThanOrEqual(0);
      
      const breakdown = efficiency.getEfficiencyBreakdown();
      expect(breakdown.liquidityComponent).toBeGreaterThan(0);
      expect(breakdown.total).toBeCloseTo(efficiency.efficiency, 10);
    });

    it('should handle balanced pools', () => {
      const balancedPool = createBalancedPoolState();
      const efficiency = new VolumeLiquidityEfficiencyImpl(balancedPool, config);

      expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.getEfficiencyCategory()).toBeDefined();
      
      const breakdown = efficiency.getEfficiencyBreakdown();
      expect(breakdown.total).toBeCloseTo(efficiency.efficiency, 10);
    });

    it('should handle edge case pools', () => {
      const edgeCasePool = createEdgeCasePoolState();
      const efficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);

      expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.getEfficiencyCategory()).toBeDefined();
      
      const breakdown = efficiency.getEfficiencyBreakdown();
      expect(breakdown.total).toBeCloseTo(efficiency.efficiency, 10);
    });
  });

  describe('Test Scenarios', () => {
    it('should handle all test scenarios correctly', () => {
      const scenarios = createTestScenarios();
      
      scenarios.forEach(scenario => {
        const efficiency = new VolumeLiquidityEfficiencyImpl(scenario.poolState, config);
        
        expect(efficiency.isValid()).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(scenario.expectedEfficiencyRange[0]);
        expect(efficiency.efficiency).toBeLessThanOrEqual(scenario.expectedEfficiencyRange[1]);
      });
    });

    it('should rank scenarios by efficiency correctly', () => {
      const scenarios = createTestScenarios();
      const efficiencies = scenarios.map(scenario => 
        new VolumeLiquidityEfficiencyImpl(scenario.poolState, config)
      );

      // Sort by efficiency
      const sortedEfficiencies = efficiencies.sort((a, b) => b.efficiency - a.efficiency);

      // High volume should rank highest
      expect(sortedEfficiencies[0]!.efficiency).toBeGreaterThan(sortedEfficiencies[1]!.efficiency);
      expect(sortedEfficiencies[1]!.efficiency).toBeGreaterThan(sortedEfficiencies[2]!.efficiency);
    });
  });

  describe('Configuration Builder Integration', () => {
    it('should work with configuration builder', () => {
      const builder = new EfficiencyConfigBuilderImpl<string>();
      const builtConfig = builder
        .setVolumeWeight(0.5)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.2)
        .setVolumeNormalization(2000000)
        .setLiquidityNormalization(1500000)
        .setVolatilityAdjustment(0.15)
        .setCorrelationAdjustment(0.08)
        .setTimeWindow(48 * 60 * 60 * 1000)
        .setDecayFactor(0.90)
        .build();

      const poolState = createBalancedPoolState();
      const efficiency = new VolumeLiquidityEfficiencyImpl(poolState, builtConfig);

      expect(efficiency.isValid()).toBe(true);
      expect(Number.isFinite(efficiency.efficiency)).toBe(true);
      expect(efficiency.config).toBe(builtConfig);
    });

    it('should handle different configurations for same pool', () => {
      const poolState = createBalancedPoolState();
      
      const config1 = new EfficiencyConfigBuilderImpl<string>()
        .setVolumeWeight(0.6)
        .setLiquidityWeight(0.2)
        .setTVLWeight(0.2)
        .build();
      
      const config2 = new EfficiencyConfigBuilderImpl<string>()
        .setVolumeWeight(0.2)
        .setLiquidityWeight(0.6)
        .setTVLWeight(0.2)
        .build();

      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config1);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config2);

      expect(efficiency1.efficiency).not.toBe(efficiency2.efficiency);
      expect(efficiency1.isValid()).toBe(true);
      expect(efficiency2.isValid()).toBe(true);
    });
  });

  describe('Validation Integration', () => {
    it('should pass comprehensive validation for valid pool states', () => {
      const poolStates = [
        createHighVolumePoolState(),
        createBalancedPoolState(),
        createLowVolumePoolState()
      ];

      poolStates.forEach(poolState => {
        const efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
        const validation = efficiency.validation.runComprehensiveValidation(poolState);
        
        expect(validation.isValid).toBe(true);
        expect(validation.preferenceOrderingValid).toBe(true);
        expect(validation.endogenousVariablesValid).toBe(true);
        expect(validation.efficiencyCalculationValid).toBe(true);
        expect(validation.poolStateConsistencyValid).toBe(true);
      });
    });

    it('should handle validation for edge cases', () => {
      const edgeCasePool = createEdgeCasePoolState();
      const efficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);
      const validation = efficiency.validation.runComprehensiveValidation(edgeCasePool);
      
      expect(validation.isValid).toBe(true);
      expect(validation.preferenceOrderingValid).toBe(true);
      expect(validation.endogenousVariablesValid).toBe(true);
      expect(validation.efficiencyCalculationValid).toBe(true);
      expect(validation.poolStateConsistencyValid).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large numbers of pools efficiently', () => {
      const poolStates = createMultiplePoolStates(100);
      
      const startTime = Date.now();
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // All efficiencies should be valid
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
      });
    });

    it('should handle batch ranking efficiently', () => {
      const poolStates = createMultiplePoolStates(50);
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      const startTime = Date.now();
      
      // Test ranking for each efficiency
      efficiencies.forEach(efficiency => {
        const others = efficiencies.filter(e => e !== efficiency);
        const rank = efficiency.preferenceOrdering.getPreferenceRank(others);
        expect(rank).toBeGreaterThanOrEqual(1);
        expect(rank).toBeLessThanOrEqual(efficiencies.length);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid pool states gracefully', () => {
      const invalidPool = createMockPoolState({
        volumeUSD: 'invalid',
        totalValueLockedUSD: '1000000',
        liquidity: '1000000'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(invalidPool, config);
      }).toThrow();
    });

    it('should handle invalid configurations gracefully', () => {
      const poolState = createBalancedPoolState();
      
      expect(() => {
        new EfficiencyConfigBuilderImpl<string>()
          .setVolumeWeight(0.5)
          .setLiquidityWeight(0.3)
          .setTVLWeight(0.3) // Sum = 1.1, should throw
          .build();
      }).toThrow('Weights must sum to 1.0');
    });

    it('should handle edge cases in batch processing', () => {
      const poolStates = [
        createHighVolumePoolState(),
        createEdgeCasePoolState(),
        createLowVolumePoolState()
      ];

      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // All should be valid
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical DeFi pool characteristics', () => {
      const typicalPools = [
        // High volume, high liquidity (popular pair)
        createMockPoolState({
          volumeUSD: '50000000',
          totalValueLockedUSD: '10000000',
          liquidity: '5000000000000000000'
        }),
        // Medium volume, medium liquidity (moderate pair)
        createMockPoolState({
          volumeUSD: '5000000',
          totalValueLockedUSD: '2000000',
          liquidity: '1000000000000000000'
        }),
        // Low volume, low liquidity (new pair)
        createMockPoolState({
          volumeUSD: '100000',
          totalValueLockedUSD: '500000',
          liquidity: '100000000000000000'
        })
      ];

      const efficiencies = typicalPools.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // All should be valid
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
      });

      // Should rank in expected order
      const sortedEfficiencies = efficiencies.sort((a, b) => b.efficiency - a.efficiency);
      expect(sortedEfficiencies[0]!.efficiency).toBeGreaterThan(sortedEfficiencies[1]!.efficiency);
      expect(sortedEfficiencies[1]!.efficiency).toBeGreaterThan(sortedEfficiencies[2]!.efficiency);
    });

    it('should handle extreme values gracefully', () => {
      const extremePools = [
        createLargeValuesPoolState(),
        createSmallValuesPoolState(),
        createEdgeCasePoolState()
      ];

      const efficiencies = extremePools.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // All should be valid
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
