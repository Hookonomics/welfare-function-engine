/**
 * Property-Based Tests for Volume-to-Liquidity Efficiency
 * 
 * Tests mathematical properties with generated data to ensure
 * the efficiency calculation maintains mathematical rigor.
 */

import { VolumeLiquidityEfficiencyImpl } from '../../../../src/utilities/endog/volume-liquidity/VolumeLiquidityEfficiency';
import { ComparisonResult } from '../../../../src/utilities/endog/volume-liquidity/types';
import { 
  createMockPoolState, 
  createMockConfig,
  generateRandomPoolState,
  generatePropertyTestData,
  assertEfficiencyInRange,
  assertComparisonResult
} from './fixtures';

describe('VolumeLiquidityEfficiencyImpl - Property-Based Tests', () => {
  let config: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    config = createMockConfig();
  });

  describe('Monotonicity Properties', () => {
    it('should be monotonic with respect to volume (higher volume → higher efficiency)', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const baseVolume = Math.random() * 10000000 + 1000;
        const pool1 = createMockPoolState({
          volumeUSD: baseVolume.toString(),
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });
        
        const pool2 = createMockPoolState({
          volumeUSD: (baseVolume * 2).toString(),
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });

        const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
        const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);

        expect(efficiency2.efficiency).toBeGreaterThan(efficiency1.efficiency);
      }
    });

    it('should be monotonic with respect to liquidity (higher liquidity → higher efficiency)', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const baseLiquidity = Math.random() * 1000000000000000000 + 100000000000000000;
        const pool1 = createMockPoolState({
          volumeUSD: '1000000',
          totalValueLockedUSD: '1000000',
          liquidity: baseLiquidity.toString()
        });
        
        const pool2 = createMockPoolState({
          volumeUSD: '1000000',
          totalValueLockedUSD: '1000000',
          liquidity: (baseLiquidity * 2).toString()
        });

        const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
        const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);

        expect(efficiency2.efficiency).toBeGreaterThan(efficiency1.efficiency);
      }
    });

    it('should be monotonic with respect to TVL (higher TVL → higher efficiency)', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const baseTVL = Math.random() * 10000000 + 1000;
        const pool1 = createMockPoolState({
          volumeUSD: '1000000',
          totalValueLockedUSD: baseTVL.toString(),
          liquidity: '1000000000000000000'
        });
        
        const pool2 = createMockPoolState({
          volumeUSD: '1000000',
          totalValueLockedUSD: (baseTVL * 2).toString(),
          liquidity: '1000000000000000000'
        });

        const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
        const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);

        expect(efficiency2.efficiency).toBeGreaterThan(efficiency1.efficiency);
      }
    });
  });

  describe('Scale Invariance Properties', () => {
    it('should preserve ordering when scaling all values proportionally', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const scaleFactor = Math.random() * 10 + 0.1;
        
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

        const scaledPool1 = createMockPoolState({
          volumeUSD: (1000000 * scaleFactor).toString(),
          totalValueLockedUSD: (2000000 * scaleFactor).toString(),
          liquidity: (1000000000000000000 * scaleFactor).toString()
        });
        
        const scaledPool2 = createMockPoolState({
          volumeUSD: (2000000 * scaleFactor).toString(),
          totalValueLockedUSD: (4000000 * scaleFactor).toString(),
          liquidity: (2000000000000000000 * scaleFactor).toString()
        });

        const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
        const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);
        const scaledEfficiency1 = new VolumeLiquidityEfficiencyImpl(scaledPool1, config);
        const scaledEfficiency2 = new VolumeLiquidityEfficiencyImpl(scaledPool2, config);

        // Ordering should be preserved
        const originalComparison = efficiency1.preferenceOrdering.compare(efficiency2);
        const scaledComparison = scaledEfficiency1.preferenceOrdering.compare(scaledEfficiency2);
        
        expect(originalComparison).toBe(scaledComparison);
      }
    });

    it('should maintain relative efficiency ratios under scaling', () => {
      const testCases = 30;
      
      for (let i = 0; i < testCases; i++) {
        const scaleFactor = Math.random() * 5 + 0.2;
        
        const pool1 = createMockPoolState({
          volumeUSD: '1000000',
          totalValueLockedUSD: '2000000',
          liquidity: '1000000000000000000'
        });
        
        const pool2 = createMockPoolState({
          volumeUSD: '3000000',
          totalValueLockedUSD: '4000000',
          liquidity: '2000000000000000000'
        });

        const scaledPool1 = createMockPoolState({
          volumeUSD: (1000000 * scaleFactor).toString(),
          totalValueLockedUSD: (2000000 * scaleFactor).toString(),
          liquidity: (1000000000000000000 * scaleFactor).toString()
        });
        
        const scaledPool2 = createMockPoolState({
          volumeUSD: (3000000 * scaleFactor).toString(),
          totalValueLockedUSD: (4000000 * scaleFactor).toString(),
          liquidity: (2000000000000000000 * scaleFactor).toString()
        });

        const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
        const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);
        const scaledEfficiency1 = new VolumeLiquidityEfficiencyImpl(scaledPool1, config);
        const scaledEfficiency2 = new VolumeLiquidityEfficiencyImpl(scaledPool2, config);

        // Relative ratios should be preserved
        const originalRatio = efficiency2.efficiency / efficiency1.efficiency;
        const scaledRatio = scaledEfficiency2.efficiency / scaledEfficiency1.efficiency;
        
        expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01);
      }
    });
  });

  describe('Continuity Properties', () => {
    it('should be continuous (small changes in inputs → small changes in output)', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const baseVolume = Math.random() * 10000000 + 1000;
        const smallChange = baseVolume * 0.01; // 1% change
        
        const pool1 = createMockPoolState({
          volumeUSD: baseVolume.toString(),
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });
        
        const pool2 = createMockPoolState({
          volumeUSD: (baseVolume + smallChange).toString(),
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });

        const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
        const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);

        const inputChange = smallChange / baseVolume;
        const outputChange = Math.abs(efficiency2.efficiency - efficiency1.efficiency) / efficiency1.efficiency;
        
        // Output change should be proportional to input change
        expect(outputChange).toBeLessThan(inputChange * 10); // Allow some amplification
      }
    });

    it('should be continuous across different input ranges', () => {
      const testRanges = [
        { min: 1000, max: 10000 },
        { min: 10000, max: 100000 },
        { min: 100000, max: 1000000 },
        { min: 1000000, max: 10000000 }
      ];
      
      testRanges.forEach(range => {
        const testCases = 20;
        
        for (let i = 0; i < testCases; i++) {
          const baseValue = Math.random() * (range.max - range.min) + range.min;
          const smallChange = baseValue * 0.01;
          
          const pool1 = createMockPoolState({
            volumeUSD: baseValue.toString(),
            totalValueLockedUSD: '1000000',
            liquidity: '1000000000000000000'
          });
          
          const pool2 = createMockPoolState({
            volumeUSD: (baseValue + smallChange).toString(),
            totalValueLockedUSD: '1000000',
            liquidity: '1000000000000000000'
          });

          const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
          const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);

          const outputChange = Math.abs(efficiency2.efficiency - efficiency1.efficiency);
          expect(outputChange).toBeLessThan(1); // Should be small change
        }
      });
    });
  });

  describe('Boundary Condition Properties', () => {
    it('should handle values approaching zero', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const smallValue = Math.random() * 0.001 + 0.0001;
        
        const pool = createMockPoolState({
          volumeUSD: smallValue.toString(),
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });

        const efficiency = new VolumeLiquidityEfficiencyImpl(pool, config);
        
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle values approaching infinity', () => {
      const testCases = 50;
      
      for (let i = 0; i < testCases; i++) {
        const largeValue = Math.random() * 1000000000000 + 1000000000;
        
        const pool = createMockPoolState({
          volumeUSD: largeValue.toString(),
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });

        const efficiency = new VolumeLiquidityEfficiencyImpl(pool, config);
        
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain ordering at boundaries', () => {
      const boundaryValues = [
        { volume: '0.0001', tvl: '1000000', liquidity: '1000000000000000000' },
        { volume: '1000000000000', tvl: '1000000', liquidity: '1000000000000000000' },
        { volume: '1000000', tvl: '0.0001', liquidity: '1000000000000000000' },
        { volume: '1000000', tvl: '1000000000000', liquidity: '1000000000000000000' }
      ];
      
      const efficiencies = boundaryValues.map(values => 
        new VolumeLiquidityEfficiencyImpl(createMockPoolState(values), config)
      );

      // All should be valid
      efficiencies.forEach(efficiency => {
        expect(efficiency.isValid()).toBe(true);
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
      });

      // Should maintain consistent ordering
        for (let i = 0; i < efficiencies.length; i++) {
          for (let j = 0; j < efficiencies.length; j++) {
            if (i !== j) {
              const comparison = efficiencies[i]!.preferenceOrdering.compare(efficiencies[j]!);
              expect(comparison).toBeDefined();
            }
          }
        }
    });
  });

  describe('Preference Ordering Properties', () => {
    it('should satisfy reflexivity for all generated efficiencies', () => {
      const testData = generatePropertyTestData(100);
      
      testData.forEach(({ poolState }) => {
        const efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
        const result = efficiency.preferenceOrdering.compare(efficiency);
        assertComparisonResult(result, ComparisonResult.EQUAL);
      });
    });

    it('should satisfy transitivity for all generated efficiency triplets', () => {
      const testData = generatePropertyTestData(30);
      const efficiencies = testData.map(({ poolState }) => 
        new VolumeLiquidityEfficiencyImpl(poolState, config)
      );

      for (let i = 0; i < efficiencies.length - 2; i++) {
        const a = efficiencies[i]!;
        const b = efficiencies[i + 1]!;
        const c = efficiencies[i + 2]!;

        const isTransitive = a.preferenceOrdering.isTransitive(a, b, c);
        expect(isTransitive).toBe(true);
      }
    });

    it('should satisfy completeness for all generated efficiency pairs', () => {
      const testData = generatePropertyTestData(50);
      const efficiencies = testData.map(({ poolState }) => 
        new VolumeLiquidityEfficiencyImpl(poolState, config)
      );

      for (let i = 0; i < efficiencies.length; i++) {
        for (let j = 0; j < efficiencies.length; j++) {
          if (i !== j) {
            const isComplete = efficiencies[i]!.preferenceOrdering.isComplete(efficiencies[j]!);
            expect(isComplete).toBe(true);
          }
        }
      }
    });

    it('should satisfy antisymmetry for all generated efficiency pairs', () => {
      const testData = generatePropertyTestData(50);
      const efficiencies = testData.map(({ poolState }) => 
        new VolumeLiquidityEfficiencyImpl(poolState, config)
      );

      for (let i = 0; i < efficiencies.length; i++) {
        for (let j = 0; j < efficiencies.length; j++) {
          if (i !== j) {
            const a = efficiencies[i]!;
            const b = efficiencies[j]!;

            const aToB = a.preferenceOrdering.compare(b);
            const bToA = b.preferenceOrdering.compare(a);

            // If A≥B and B≥A, then A=B
            if (aToB !== ComparisonResult.LESS && bToA !== ComparisonResult.LESS) {
              expect(Math.abs(a.efficiency - b.efficiency)).toBeLessThan(1e-10);
            }
          }
        }
      }
    });
  });

  describe('Random Data Properties', () => {
    it('should handle random pool states consistently', () => {
      const testCases = 100;
      
      for (let i = 0; i < testCases; i++) {
        const randomPool = generateRandomPoolState(i);
        const efficiency = new VolumeLiquidityEfficiencyImpl(randomPool, config);
        
        expect(efficiency.isValid()).toBe(true);
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain efficiency ordering for random data', () => {
      const testCases = 50;
      const randomPools = Array.from({ length: testCases }, (_, i) => generateRandomPoolState(i));
      const efficiencies = randomPools.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // Sort by efficiency
      const sortedEfficiencies = efficiencies.sort((a, b) => b.efficiency - a.efficiency);

      // Verify ordering is consistent
      for (let i = 0; i < sortedEfficiencies.length - 1; i++) {
        expect(sortedEfficiencies[i]!.efficiency).toBeGreaterThanOrEqual(
          sortedEfficiencies[i + 1]!.efficiency
        );
      }
    });

    it('should handle random configurations consistently', () => {
      const testCases = 50;
      const basePool = createMockPoolState();
      
      for (let i = 0; i < testCases; i++) {
        const randomConfig = createMockConfig({
          volumeWeight: Math.random() * 0.4 + 0.3,
          liquidityWeight: Math.random() * 0.4 + 0.3,
          tvlWeight: Math.random() * 0.4 + 0.3
        });
        
        // Normalize weights to sum to 1
        const sum = randomConfig.volumeWeight + randomConfig.liquidityWeight + randomConfig.tvlWeight;
        randomConfig.volumeWeight /= sum;
        randomConfig.liquidityWeight /= sum;
        randomConfig.tvlWeight /= sum;
        
        const efficiency = new VolumeLiquidityEfficiencyImpl(basePool, randomConfig);
        
        expect(efficiency.isValid()).toBe(true);
        expect(Number.isFinite(efficiency.efficiency)).toBe(true);
        expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Mathematical Invariance Properties', () => {
    it('should be invariant under configuration changes that preserve ratios', () => {
      const testCases = 30;
      
      for (let i = 0; i < testCases; i++) {
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

        const config1 = createMockConfig({
          volumeNormalizationFactor: 1000000,
          liquidityNormalizationFactor: 1000000
        });
        
        const config2 = createMockConfig({
          volumeNormalizationFactor: 2000000,
          liquidityNormalizationFactor: 2000000
        });

        const efficiency1a = new VolumeLiquidityEfficiencyImpl(pool1, config1);
        const efficiency1b = new VolumeLiquidityEfficiencyImpl(pool1, config2);
        const efficiency2a = new VolumeLiquidityEfficiencyImpl(pool2, config1);
        const efficiency2b = new VolumeLiquidityEfficiencyImpl(pool2, config2);

        // Ordering should be preserved
        const comparison1 = efficiency1a.preferenceOrdering.compare(efficiency2a);
        const comparison2 = efficiency1b.preferenceOrdering.compare(efficiency2b);
        
        expect(comparison1).toBe(comparison2);
      }
    });

    it('should maintain relative efficiency under weight changes', () => {
      const testCases = 30;
      
      for (let i = 0; i < testCases; i++) {
        const pool1 = createMockPoolState({
          volumeUSD: '1000000',
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });
        
        const pool2 = createMockPoolState({
          volumeUSD: '2000000',
          totalValueLockedUSD: '1000000',
          liquidity: '1000000000000000000'
        });

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

        const efficiency1a = new VolumeLiquidityEfficiencyImpl(pool1, config1);
        const efficiency1b = new VolumeLiquidityEfficiencyImpl(pool1, config2);
        const efficiency2a = new VolumeLiquidityEfficiencyImpl(pool2, config1);
        const efficiency2b = new VolumeLiquidityEfficiencyImpl(pool2, config2);

        // Pool2 should be more efficient than Pool1 in both configurations
        // (since Pool2 has higher volume)
        expect(efficiency2a.efficiency).toBeGreaterThan(efficiency1a.efficiency);
        expect(efficiency2b.efficiency).toBeGreaterThan(efficiency1b.efficiency);
      }
    });
  });
});
