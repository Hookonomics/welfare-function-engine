/**
 * Unit Tests for Determinant Calculations
 * 
 * Tests the calculation of all determinants from pool state data.
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
  createSmallValuesPoolState
} from './fixtures';

describe('VolumeLiquidityEfficiencyImpl - Determinant Calculations', () => {
  let poolState: ReturnType<typeof createMockPoolState>;
  let config: ReturnType<typeof createMockConfig>;
  let efficiency: VolumeLiquidityEfficiencyImpl<string>;

  beforeEach(() => {
    poolState = createMockPoolState();
    config = createMockConfig();
    efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
  });

  describe('Primary Determinants', () => {
    it('should extract volumeUSD from pool state', () => {
      expect(efficiency.determinants.volumeUSD).toBe(poolState.volumeUSD);
    });

    it('should extract totalValueLockedUSD from pool state', () => {
      expect(efficiency.determinants.totalValueLockedUSD).toBe(poolState.totalValueLockedUSD);
    });

    it('should extract liquidity from pool state', () => {
      expect(efficiency.determinants.liquidity).toBe(poolState.liquidity);
    });
  });

  describe('Derived Determinants', () => {
    it('should calculate volumeLiquidityRatio correctly', () => {
      const volumeUSD = parseFloat(poolState.volumeUSD);
      const liquidity = parseFloat(poolState.liquidity);
      const expectedRatio = volumeUSD / liquidity;

      expect(efficiency.determinants.volumeLiquidityRatio).toBeCloseTo(expectedRatio, 10);
    });

    it('should calculate tvlLiquidityRatio correctly', () => {
      const totalValueLockedUSD = parseFloat(poolState.totalValueLockedUSD);
      const liquidity = parseFloat(poolState.liquidity);
      const expectedRatio = totalValueLockedUSD / liquidity;

      expect(efficiency.determinants.tvlLiquidityRatio).toBeCloseTo(expectedRatio, 10);
    });

    it('should calculate volumeTVLRatio correctly', () => {
      const volumeUSD = parseFloat(poolState.volumeUSD);
      const totalValueLockedUSD = parseFloat(poolState.totalValueLockedUSD);
      const expectedRatio = volumeUSD / totalValueLockedUSD;

      expect(efficiency.determinants.volumeTVLRatio).toBeCloseTo(expectedRatio, 10);
    });

    it('should handle zero liquidity in ratios', () => {
      const zeroLiquidityPool = createMockPoolState({ liquidity: '0' });
      const zeroLiquidityEfficiency = new VolumeLiquidityEfficiencyImpl(zeroLiquidityPool, config);

      expect(zeroLiquidityEfficiency.determinants.volumeLiquidityRatio).toBe(0);
      expect(zeroLiquidityEfficiency.determinants.tvlLiquidityRatio).toBe(0);
    });

    it('should handle zero TVL in volumeTVLRatio', () => {
      const zeroTVLPool = createMockPoolState({ totalValueLockedUSD: '0' });
      const zeroTVLEfficiency = new VolumeLiquidityEfficiencyImpl(zeroTVLPool, config);

      expect(zeroTVLEfficiency.determinants.volumeTVLRatio).toBe(0);
    });
  });

  describe('Temporal Determinants', () => {
    it('should set temporal determinants to 0 with TODO comments', () => {
      expect(efficiency.determinants.volumeGrowthRate).toBe(0);
      expect(efficiency.determinants.liquidityGrowthRate).toBe(0);
      expect(efficiency.determinants.efficiencyTrend).toBe(0);
    });

    it('should have consistent temporal determinants across different pool states', () => {
      const highVolumePool = createHighVolumePoolState();
      const lowVolumePool = createLowVolumePoolState();
      
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      expect(highVolumeEfficiency.determinants.volumeGrowthRate).toBe(0);
      expect(highVolumeEfficiency.determinants.liquidityGrowthRate).toBe(0);
      expect(highVolumeEfficiency.determinants.efficiencyTrend).toBe(0);

      expect(lowVolumeEfficiency.determinants.volumeGrowthRate).toBe(0);
      expect(lowVolumeEfficiency.determinants.liquidityGrowthRate).toBe(0);
      expect(lowVolumeEfficiency.determinants.efficiencyTrend).toBe(0);
    });
  });

  describe('Risk-Adjusted Determinants', () => {
    it('should calculate riskAdjustedVolume correctly', () => {
      const volumeUSD = parseFloat(poolState.volumeUSD);
      const expectedRiskAdjustedVolume = volumeUSD * (1 - config.volatilityAdjustment);

      expect(efficiency.determinants.riskAdjustedVolume).toBeCloseTo(expectedRiskAdjustedVolume, 10);
    });

    it('should calculate riskAdjustedLiquidity correctly', () => {
      const liquidity = parseFloat(poolState.liquidity);
      const expectedRiskAdjustedLiquidity = liquidity * (1 - config.correlationAdjustment);

      expect(efficiency.determinants.riskAdjustedLiquidity).toBeCloseTo(expectedRiskAdjustedLiquidity, 10);
    });

    it('should apply different risk adjustments with different configs', () => {
      const highRiskConfig = createMockConfig({
        volatilityAdjustment: 0.2,
        correlationAdjustment: 0.1
      });
      
      const lowRiskConfig = createMockConfig({
        volatilityAdjustment: 0.05,
        correlationAdjustment: 0.02
      });

      const highRiskEfficiency = new VolumeLiquidityEfficiencyImpl(poolState, highRiskConfig);
      const lowRiskEfficiency = new VolumeLiquidityEfficiencyImpl(poolState, lowRiskConfig);

      expect(highRiskEfficiency.determinants.riskAdjustedVolume).toBeLessThan(
        lowRiskEfficiency.determinants.riskAdjustedVolume
      );
      expect(highRiskEfficiency.determinants.riskAdjustedLiquidity).toBeLessThan(
        lowRiskEfficiency.determinants.riskAdjustedLiquidity
      );
    });
  });

  describe('Stability Factor', () => {
    it('should calculate stability factor between 0 and 1', () => {
      expect(efficiency.determinants.stabilityFactor).toBeGreaterThanOrEqual(0);
      expect(efficiency.determinants.stabilityFactor).toBeLessThanOrEqual(1);
    });

    it('should return 0 for zero TVL', () => {
      const zeroTVLPool = createMockPoolState({ totalValueLockedUSD: '0' });
      const zeroTVLEfficiency = new VolumeLiquidityEfficiencyImpl(zeroTVLPool, config);

      expect(zeroTVLEfficiency.determinants.stabilityFactor).toBe(0);
    });

    it('should calculate higher stability for higher volume/TVL ratios', () => {
      const highVolumePool = createHighVolumePoolState();
      const lowVolumePool = createLowVolumePoolState();

      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      expect(highVolumeEfficiency.determinants.stabilityFactor).toBeGreaterThan(
        lowVolumeEfficiency.determinants.stabilityFactor
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values in all primary determinants', () => {
      const edgeCasePool = createEdgeCasePoolState();
      const edgeCaseEfficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);

      expect(edgeCaseEfficiency.determinants.volumeUSD).toBe('0');
      expect(edgeCaseEfficiency.determinants.totalValueLockedUSD).toBe('0');
      expect(edgeCaseEfficiency.determinants.liquidity).toBe('0');
      expect(edgeCaseEfficiency.determinants.volumeLiquidityRatio).toBe(0);
      expect(edgeCaseEfficiency.determinants.tvlLiquidityRatio).toBe(0);
      expect(edgeCaseEfficiency.determinants.volumeTVLRatio).toBe(0);
      expect(edgeCaseEfficiency.determinants.stabilityFactor).toBe(0);
    });

    it('should handle very large values', () => {
      const largeValuesPool = createLargeValuesPoolState();
      const largeValuesEfficiency = new VolumeLiquidityEfficiencyImpl(largeValuesPool, config);

      expect(largeValuesEfficiency.determinants.volumeLiquidityRatio).toBeGreaterThan(0);
      expect(largeValuesEfficiency.determinants.tvlLiquidityRatio).toBeGreaterThan(0);
      expect(largeValuesEfficiency.determinants.volumeTVLRatio).toBeGreaterThan(0);
      expect(largeValuesEfficiency.determinants.stabilityFactor).toBeGreaterThan(0);
    });

    it('should handle very small values', () => {
      const smallValuesPool = createSmallValuesPoolState();
      const smallValuesEfficiency = new VolumeLiquidityEfficiencyImpl(smallValuesPool, config);

      expect(smallValuesEfficiency.determinants.volumeLiquidityRatio).toBeGreaterThan(0);
      expect(smallValuesEfficiency.determinants.tvlLiquidityRatio).toBeGreaterThan(0);
      expect(smallValuesEfficiency.determinants.volumeTVLRatio).toBeGreaterThan(0);
      expect(smallValuesEfficiency.determinants.stabilityFactor).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative values gracefully', () => {
      const negativeValuesPool = createMockPoolState({
        volumeUSD: '-1000',
        totalValueLockedUSD: '-2000',
        liquidity: '-3000'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(negativeValuesPool, config);
      }).not.toThrow();
    });
  });

  describe('Precision Handling', () => {
    it('should maintain precision for small ratios', () => {
      const smallRatioPool = createMockPoolState({
        volumeUSD: '1',
        totalValueLockedUSD: '1000000',
        liquidity: '1000000'
      });

      const smallRatioEfficiency = new VolumeLiquidityEfficiencyImpl(smallRatioPool, config);
      
      expect(smallRatioEfficiency.determinants.volumeLiquidityRatio).toBeCloseTo(0.000001, 10);
      expect(smallRatioEfficiency.determinants.tvlLiquidityRatio).toBeCloseTo(1, 10);
      expect(smallRatioEfficiency.determinants.volumeTVLRatio).toBeCloseTo(0.000001, 10);
    });

    it('should maintain precision for large ratios', () => {
      const largeRatioPool = createMockPoolState({
        volumeUSD: '10000000',
        totalValueLockedUSD: '1000',
        liquidity: '1000'
      });

      const largeRatioEfficiency = new VolumeLiquidityEfficiencyImpl(largeRatioPool, config);
      
      expect(largeRatioEfficiency.determinants.volumeLiquidityRatio).toBeCloseTo(10000, 10);
      expect(largeRatioEfficiency.determinants.tvlLiquidityRatio).toBeCloseTo(1, 10);
      expect(largeRatioEfficiency.determinants.volumeTVLRatio).toBeCloseTo(10000, 10);
    });
  });

  describe('Determinant Consistency', () => {
    it('should produce consistent determinants for same pool state', () => {
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config);

      expect(efficiency1.determinants.volumeUSD).toBe(efficiency2.determinants.volumeUSD);
      expect(efficiency1.determinants.totalValueLockedUSD).toBe(efficiency2.determinants.totalValueLockedUSD);
      expect(efficiency1.determinants.liquidity).toBe(efficiency2.determinants.liquidity);
      expect(efficiency1.determinants.volumeLiquidityRatio).toBeCloseTo(efficiency2.determinants.volumeLiquidityRatio, 10);
      expect(efficiency1.determinants.tvlLiquidityRatio).toBeCloseTo(efficiency2.determinants.tvlLiquidityRatio, 10);
      expect(efficiency1.determinants.volumeTVLRatio).toBeCloseTo(efficiency2.determinants.volumeTVLRatio, 10);
    });

    it('should produce different determinants for different pool states', () => {
      const highVolumePool = createHighVolumePoolState();
      const lowVolumePool = createLowVolumePoolState();

      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      expect(highVolumeEfficiency.determinants.volumeLiquidityRatio).not.toBe(
        lowVolumeEfficiency.determinants.volumeLiquidityRatio
      );
      expect(highVolumeEfficiency.determinants.tvlLiquidityRatio).not.toBe(
        lowVolumeEfficiency.determinants.tvlLiquidityRatio
      );
      expect(highVolumeEfficiency.determinants.volumeTVLRatio).not.toBe(
        lowVolumeEfficiency.determinants.volumeTVLRatio
      );
    });
  });

  describe('Configuration Impact on Determinants', () => {
    it('should not affect primary determinants with different configs', () => {
      const config1 = createMockConfig({ volatilityAdjustment: 0.1 });
      const config2 = createMockConfig({ volatilityAdjustment: 0.2 });

      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config1);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config2);

      expect(efficiency1.determinants.volumeUSD).toBe(efficiency2.determinants.volumeUSD);
      expect(efficiency1.determinants.totalValueLockedUSD).toBe(efficiency2.determinants.totalValueLockedUSD);
      expect(efficiency1.determinants.liquidity).toBe(efficiency2.determinants.liquidity);
    });

    it('should affect risk-adjusted determinants with different configs', () => {
      const config1 = createMockConfig({ volatilityAdjustment: 0.1, correlationAdjustment: 0.05 });
      const config2 = createMockConfig({ volatilityAdjustment: 0.2, correlationAdjustment: 0.1 });

      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config1);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config2);

      expect(efficiency1.determinants.riskAdjustedVolume).not.toBe(efficiency2.determinants.riskAdjustedVolume);
      expect(efficiency1.determinants.riskAdjustedLiquidity).not.toBe(efficiency2.determinants.riskAdjustedLiquidity);
    });
  });
});
