/**
 * Unit Tests for Efficiency Calculation
 * 
 * Tests the efficiency calculation formula, weighted sum, normalization,
 * and mathematical correctness of the efficiency metric.
 */

import { VolumeLiquidityEfficiencyImpl } from '../../../../src/utilities/endog/volume-liquidity/VolumeLiquidityEfficiency';
import { 
  createMockPoolState, 
  createMockConfig,
  createHighVolumePoolState,
  createLowVolumePoolState,
  createBalancedPoolState,
  createEdgeCasePoolState,
  createLargeValuesPoolState,
  createSmallValuesPoolState,
  assertEfficiencyInRange
} from './fixtures';

describe('VolumeLiquidityEfficiencyImpl - Efficiency Calculation', () => {
  let poolState: ReturnType<typeof createMockPoolState>;
  let config: ReturnType<typeof createMockConfig>;
  let efficiency: VolumeLiquidityEfficiencyImpl<string>;

  beforeEach(() => {
    poolState = createMockPoolState();
    config = createMockConfig();
    efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
  });

  describe('Basic Efficiency Calculation', () => {
    it('should calculate efficiency as a finite number', () => {
      expect(Number.isFinite(efficiency.efficiency)).toBe(true);
      expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should calculate efficiency using weighted sum formula', () => {
      const { determinants, config } = efficiency;
      
      const normalizedVolume = determinants.volumeLiquidityRatio / config.volumeNormalizationFactor;
      const normalizedLiquidity = determinants.tvlLiquidityRatio / config.liquidityNormalizationFactor;
      
      const expectedEfficiency = (
        config.volumeWeight * normalizedVolume +
        config.liquidityWeight * normalizedLiquidity +
        config.tvlWeight * determinants.volumeTVLRatio
      );

      expect(efficiency.efficiency).toBeCloseTo(expectedEfficiency, 10);
    });

    it('should be deterministic for same inputs', () => {
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      
      expect(efficiency1.efficiency).toBe(efficiency2.efficiency);
    });

    it('should produce different results for different inputs', () => {
      const highVolumePool = createHighVolumePoolState();
      const lowVolumePool = createLowVolumePoolState();
      
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);
      
      expect(highVolumeEfficiency.efficiency).not.toBe(lowVolumeEfficiency.efficiency);
    });
  });

  describe('Weighted Sum Components', () => {
    it('should calculate volume component correctly', () => {
      const breakdown = efficiency.getEfficiencyBreakdown();
      const { determinants, config } = efficiency;
      
      const expectedVolumeComponent = config.volumeWeight * (determinants.volumeLiquidityRatio / config.volumeNormalizationFactor);
      
      expect(breakdown.volumeComponent).toBeCloseTo(expectedVolumeComponent, 10);
    });

    it('should calculate liquidity component correctly', () => {
      const breakdown = efficiency.getEfficiencyBreakdown();
      const { determinants, config } = efficiency;
      
      const expectedLiquidityComponent = config.liquidityWeight * (determinants.tvlLiquidityRatio / config.liquidityNormalizationFactor);
      
      expect(breakdown.liquidityComponent).toBeCloseTo(expectedLiquidityComponent, 10);
    });

    it('should calculate TVL component correctly', () => {
      const breakdown = efficiency.getEfficiencyBreakdown();
      const { determinants, config } = efficiency;
      
      const expectedTVLComponent = config.tvlWeight * determinants.volumeTVLRatio;
      
      expect(breakdown.tvlComponent).toBeCloseTo(expectedTVLComponent, 10);
    });

    it('should sum components to total efficiency', () => {
      const breakdown = efficiency.getEfficiencyBreakdown();
      
      const expectedTotal = breakdown.volumeComponent + breakdown.liquidityComponent + breakdown.tvlComponent;
      
      expect(breakdown.total).toBeCloseTo(expectedTotal, 10);
      expect(breakdown.total).toBeCloseTo(efficiency.efficiency, 10);
    });
  });

  describe('Normalization', () => {
    it('should apply volume normalization correctly', () => {
      const { determinants, config } = efficiency;
      const normalizedVolume = determinants.volumeLiquidityRatio / config.volumeNormalizationFactor;
      
      expect(Number.isFinite(normalizedVolume)).toBe(true);
      expect(normalizedVolume).toBeGreaterThanOrEqual(0);
    });

    it('should apply liquidity normalization correctly', () => {
      const { determinants, config } = efficiency;
      const normalizedLiquidity = determinants.tvlLiquidityRatio / config.liquidityNormalizationFactor;
      
      expect(Number.isFinite(normalizedLiquidity)).toBe(true);
      expect(normalizedLiquidity).toBeGreaterThanOrEqual(0);
    });

    it('should handle different normalization factors', () => {
      const config1 = createMockConfig({ volumeNormalizationFactor: 1000000 });
      const config2 = createMockConfig({ volumeNormalizationFactor: 2000000 });
      
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config1);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config2);
      
      expect(efficiency1.efficiency).not.toBe(efficiency2.efficiency);
    });

    it('should handle zero normalization factors gracefully', () => {
      const zeroNormalizationConfig = createMockConfig({
        volumeNormalizationFactor: 0,
        liquidityNormalizationFactor: 0
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(poolState, zeroNormalizationConfig);
      }).toThrow();
    });
  });

  describe('Weight Impact', () => {
    it('should produce different results with different weight configurations', () => {
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
    });

    it('should prioritize volume component when volume weight is high', () => {
      const highVolumeConfig = createMockConfig({
        volumeWeight: 0.8,
        liquidityWeight: 0.1,
        tvlWeight: 0.1
      });
      
      const lowVolumeConfig = createMockConfig({
        volumeWeight: 0.1,
        liquidityWeight: 0.8,
        tvlWeight: 0.1
      });
      
      const highVolumePool = createHighVolumePoolState();
      const lowVolumePool = createLowVolumePoolState();
      
      const highVolumeEfficiency1 = new VolumeLiquidityEfficiencyImpl(highVolumePool, highVolumeConfig);
      const highVolumeEfficiency2 = new VolumeLiquidityEfficiencyImpl(highVolumePool, lowVolumeConfig);
      
      // High volume pool should be more efficient with high volume weight
      expect(highVolumeEfficiency1.efficiency).toBeGreaterThan(highVolumeEfficiency2.efficiency);
    });

    it('should maintain weight sum constraint', () => {
      const config = createMockConfig({
        volumeWeight: 0.4,
        liquidityWeight: 0.3,
        tvlWeight: 0.3
      });
      
      const sum = config.volumeWeight + config.liquidityWeight + config.tvlWeight;
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('Different Pool Scenarios', () => {
    it('should calculate efficiency for high volume pool', () => {
      const highVolumePool = createHighVolumePoolState();
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      
      assertEfficiencyInRange(highVolumeEfficiency.efficiency);
      expect(highVolumeEfficiency.efficiency).toBeGreaterThan(0);
    });

    it('should calculate efficiency for low volume pool', () => {
      const lowVolumePool = createLowVolumePoolState();
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);
      
      assertEfficiencyInRange(lowVolumeEfficiency.efficiency);
      expect(lowVolumeEfficiency.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should calculate efficiency for balanced pool', () => {
      const balancedPool = createBalancedPoolState();
      const balancedEfficiency = new VolumeLiquidityEfficiencyImpl(balancedPool, config);
      
      assertEfficiencyInRange(balancedEfficiency.efficiency);
      expect(balancedEfficiency.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge case pool with zero values', () => {
      const edgeCasePool = createEdgeCasePoolState();
      const edgeCaseEfficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);
      
      assertEfficiencyInRange(edgeCaseEfficiency.efficiency, 0, 0.1);
      expect(edgeCaseEfficiency.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should handle large values pool', () => {
      const largeValuesPool = createLargeValuesPoolState();
      const largeValuesEfficiency = new VolumeLiquidityEfficiencyImpl(largeValuesPool, config);
      
      assertEfficiencyInRange(largeValuesEfficiency.efficiency);
      expect(largeValuesEfficiency.efficiency).toBeGreaterThan(0);
    });

    it('should handle small values pool', () => {
      const smallValuesPool = createSmallValuesPoolState();
      const smallValuesEfficiency = new VolumeLiquidityEfficiencyImpl(smallValuesPool, config);
      
      assertEfficiencyInRange(smallValuesEfficiency.efficiency);
      expect(smallValuesEfficiency.efficiency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mathematical Properties', () => {
    it('should be monotonic with respect to volume (given same config)', () => {
      const pool1 = createMockPoolState({ volumeUSD: '1000000' });
      const pool2 = createMockPoolState({ volumeUSD: '2000000' });
      
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);
      
      expect(efficiency2.efficiency).toBeGreaterThan(efficiency1.efficiency);
    });

    it('should be monotonic with respect to liquidity (given same config)', () => {
      const pool1 = createMockPoolState({ liquidity: '1000000000000000000' });
      const pool2 = createMockPoolState({ liquidity: '2000000000000000000' });
      
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);
      
      expect(efficiency2.efficiency).toBeGreaterThan(efficiency1.efficiency);
    });

    it('should be continuous (small changes in inputs produce small changes in output)', () => {
      const pool1 = createMockPoolState({ volumeUSD: '1000000' });
      const pool2 = createMockPoolState({ volumeUSD: '1000001' });
      
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);
      
      const difference = Math.abs(efficiency2.efficiency - efficiency1.efficiency);
      expect(difference).toBeLessThan(0.01); // Small change in input should produce small change in output
    });

    it('should be scale invariant (scaling all values proportionally preserves ordering)', () => {
      const pool1 = createMockPoolState({
        volumeUSD: '1000000',
        totalValueLockedUSD: '2000000',
        liquidity: '1000000000000000000'
      });
      
      const pool2 = createMockPoolState({
        volumeUSD: '2000000',
        totalValueLockedUSD: '4000000',
        liquidity: '2000000000000000000'
      });
      
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);
      
      // Both should have similar efficiency (scaled proportionally)
      expect(Math.abs(efficiency2.efficiency - efficiency1.efficiency)).toBeLessThan(0.1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero liquidity gracefully', () => {
      const zeroLiquidityPool = createMockPoolState({ liquidity: '0' });
      const zeroLiquidityEfficiency = new VolumeLiquidityEfficiencyImpl(zeroLiquidityPool, config);
      
      expect(zeroLiquidityEfficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(zeroLiquidityEfficiency.efficiency)).toBe(true);
    });

    it('should handle zero TVL gracefully', () => {
      const zeroTVLPool = createMockPoolState({ totalValueLockedUSD: '0' });
      const zeroTVLEfficiency = new VolumeLiquidityEfficiencyImpl(zeroTVLPool, config);
      
      expect(zeroTVLEfficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(zeroTVLEfficiency.efficiency)).toBe(true);
    });

    it('should handle zero volume gracefully', () => {
      const zeroVolumePool = createMockPoolState({ volumeUSD: '0' });
      const zeroVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(zeroVolumePool, config);
      
      expect(zeroVolumeEfficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(zeroVolumeEfficiency.efficiency)).toBe(true);
    });

    it('should handle very large numbers', () => {
      const largePool = createLargeValuesPoolState();
      const largeEfficiency = new VolumeLiquidityEfficiencyImpl(largePool, config);
      
      expect(Number.isFinite(largeEfficiency.efficiency)).toBe(true);
      expect(largeEfficiency.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should handle very small numbers', () => {
      const smallPool = createSmallValuesPoolState();
      const smallEfficiency = new VolumeLiquidityEfficiencyImpl(smallPool, config);
      
      expect(Number.isFinite(smallEfficiency.efficiency)).toBe(true);
      expect(smallEfficiency.efficiency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Efficiency Categories', () => {
    it('should categorize efficiency correctly', () => {
      const categories = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
      expect(categories).toContain(efficiency.getEfficiencyCategory());
    });

    it('should return percentage correctly', () => {
      const percentage = efficiency.getEfficiencyPercentage();
      expect(percentage).toBe(efficiency.efficiency * 100);
      expect(percentage).toBeGreaterThanOrEqual(0);
    });

    it('should identify valid efficiency', () => {
      expect(efficiency.isValid()).toBe(true);
    });

    it('should provide summary with all metrics', () => {
      const summary = efficiency.getSummary();
      
      expect(summary).toHaveProperty('efficiency');
      expect(summary).toHaveProperty('category');
      expect(summary).toHaveProperty('percentage');
      expect(summary).toHaveProperty('isValid');
      expect(summary).toHaveProperty('poolId');
      expect(summary).toHaveProperty('breakdown');
      
      expect(summary.efficiency).toBe(efficiency.efficiency);
      expect(summary.category).toBe(efficiency.getEfficiencyCategory());
      expect(summary.percentage).toBe(efficiency.getEfficiencyPercentage());
      expect(summary.isValid).toBe(efficiency.isValid());
      expect(summary.poolId).toBe(poolState.poolId);
    });
  });

  describe('Configuration Impact', () => {
    it('should produce different results with different configurations', () => {
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
    });

    it('should allow recalculation with new configuration', () => {
      const newConfig = createMockConfig({
        volumeWeight: 0.5,
        liquidityWeight: 0.3,
        tvlWeight: 0.2
      });
      
      const newEfficiency = efficiency.withConfig(newConfig);
      
      expect(newEfficiency.efficiency).not.toBe(efficiency.efficiency);
      expect(newEfficiency.config).toBe(newConfig);
    });
  });

  describe('Performance', () => {
    it('should calculate efficiency quickly', () => {
      const startTime = Date.now();
      const efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(Number.isFinite(efficiency.efficiency)).toBe(true);
    });

    it('should handle multiple calculations efficiently', () => {
      const poolStates = [
        createHighVolumePoolState(),
        createLowVolumePoolState(),
        createBalancedPoolState(),
        createEdgeCasePoolState()
      ];
      
      const startTime = Date.now();
      
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(efficiencies).toHaveLength(4);
      efficiencies.forEach(eff => {
        expect(Number.isFinite(eff.efficiency)).toBe(true);
      });
    });
  });
});
