/**
 * Unit Tests for Preference Ordering Methods
 * 
 * Tests the mathematical properties of preference ordering including
 * reflexivity, transitivity, completeness, and antisymmetry.
 */

import { VolumeLiquidityEfficiencyImpl } from '../../../../src/utilities/endog/volume-liquidity/VolumeLiquidityEfficiency';
import { ComparisonResult } from '../../../../src/utilities/endog/volume-liquidity/types';
import { 
  createMockPoolState, 
  createMockConfig,
  createHighVolumePoolState,
  createLowVolumePoolState,
  createBalancedPoolState,
  createMultiplePoolStates,
  assertComparisonResult
} from './fixtures';

describe('PreferenceOrderingMethodsImpl', () => {
  let poolState: ReturnType<typeof createMockPoolState>;
  let config: ReturnType<typeof createMockConfig>;
  let efficiency: VolumeLiquidityEfficiencyImpl<string>;

  beforeEach(() => {
    poolState = createMockPoolState();
    config = createMockConfig();
    efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
  });

  describe('hasPreferenceOrdering', () => {
    it('should return true for valid preference ordering', () => {
      expect(efficiency.preferenceOrdering.hasPreferenceOrdering()).toBe(true);
    });

    it('should check all mathematical properties', () => {
      const hasOrdering = efficiency.preferenceOrdering.hasPreferenceOrdering();
      expect(hasOrdering).toBe(true);
    });
  });

  describe('compare', () => {
    it('should return EQUAL when comparing efficiency to itself', () => {
      const result = efficiency.preferenceOrdering.compare(efficiency);
      assertComparisonResult(result, ComparisonResult.EQUAL);
    });

    it('should return GREATER when efficiency is higher', () => {
      const highVolumePool = createHighVolumePoolState();
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      
      const lowVolumePool = createLowVolumePoolState();
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      const result = highVolumeEfficiency.preferenceOrdering.compare(lowVolumeEfficiency);
      assertComparisonResult(result, ComparisonResult.GREATER);
    });

    it('should return LESS when efficiency is lower', () => {
      const highVolumePool = createHighVolumePoolState();
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      
      const lowVolumePool = createLowVolumePoolState();
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      const result = lowVolumeEfficiency.preferenceOrdering.compare(highVolumeEfficiency);
      assertComparisonResult(result, ComparisonResult.LESS);
    });

    it('should return EQUAL when efficiencies are the same', () => {
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config);

      const result = efficiency1.preferenceOrdering.compare(efficiency2);
      assertComparisonResult(result, ComparisonResult.EQUAL);
    });

    it('should handle floating point precision correctly', () => {
      const pool1 = createMockPoolState({ volumeUSD: '1000000.0000001' });
      const pool2 = createMockPoolState({ volumeUSD: '1000000.0000002' });
      
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(pool1, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(pool2, config);

      const result = efficiency1.preferenceOrdering.compare(efficiency2);
      expect(result).toBeDefined();
    });
  });

  describe('isTransitive', () => {
    it('should return true for transitive relationships', () => {
      const poolA = createHighVolumePoolState();
      const poolB = createBalancedPoolState();
      const poolC = createLowVolumePoolState();

      const efficiencyA = new VolumeLiquidityEfficiencyImpl(poolA, config);
      const efficiencyB = new VolumeLiquidityEfficiencyImpl(poolB, config);
      const efficiencyC = new VolumeLiquidityEfficiencyImpl(poolC, config);

      const isTransitive = efficiencyA.preferenceOrdering.isTransitive(efficiencyA, efficiencyB, efficiencyC);
      expect(isTransitive).toBe(true);
    });

    it('should handle equal efficiencies in transitive check', () => {
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency3 = new VolumeLiquidityEfficiencyImpl(poolState, config);

      const isTransitive = efficiency1.preferenceOrdering.isTransitive(efficiency1, efficiency2, efficiency3);
      expect(isTransitive).toBe(true);
    });

    it('should handle mixed relationships in transitive check', () => {
      const poolA = createMockPoolState({ volumeUSD: '1000000' });
      const poolB = createMockPoolState({ volumeUSD: '2000000' });
      const poolC = createMockPoolState({ volumeUSD: '3000000' });

      const efficiencyA = new VolumeLiquidityEfficiencyImpl(poolA, config);
      const efficiencyB = new VolumeLiquidityEfficiencyImpl(poolB, config);
      const efficiencyC = new VolumeLiquidityEfficiencyImpl(poolC, config);

      const isTransitive = efficiencyA.preferenceOrdering.isTransitive(efficiencyA, efficiencyB, efficiencyC);
      expect(isTransitive).toBe(true);
    });
  });

  describe('isComplete', () => {
    it('should return true for any two efficiencies', () => {
      const highVolumePool = createHighVolumePoolState();
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      
      const lowVolumePool = createLowVolumePoolState();
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      const isComplete1 = highVolumeEfficiency.preferenceOrdering.isComplete(lowVolumeEfficiency);
      const isComplete2 = lowVolumeEfficiency.preferenceOrdering.isComplete(highVolumeEfficiency);

      expect(isComplete1).toBe(true);
      expect(isComplete2).toBe(true);
    });

    it('should return true for equal efficiencies', () => {
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config);

      const isComplete = efficiency1.preferenceOrdering.isComplete(efficiency2);
      expect(isComplete).toBe(true);
    });

    it('should return true for all efficiency combinations', () => {
      const poolStates = createMultiplePoolStates(5);
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
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
  });

  describe('getPreferenceRank', () => {
    it('should return correct ranking for single efficiency', () => {
      const rank = efficiency.preferenceOrdering.getPreferenceRank([]);
      expect(rank).toBe(1);
    });

    it('should return correct ranking among multiple efficiencies', () => {
      const highVolumePool = createHighVolumePoolState();
      const balancedPool = createBalancedPoolState();
      const lowVolumePool = createLowVolumePoolState();

      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const balancedEfficiency = new VolumeLiquidityEfficiencyImpl(balancedPool, config);
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      const highRank = highVolumeEfficiency.preferenceOrdering.getPreferenceRank([
        balancedEfficiency, lowVolumeEfficiency
      ]);
      const balancedRank = balancedEfficiency.preferenceOrdering.getPreferenceRank([
        highVolumeEfficiency, lowVolumeEfficiency
      ]);
      const lowRank = lowVolumeEfficiency.preferenceOrdering.getPreferenceRank([
        highVolumeEfficiency, balancedEfficiency
      ]);

      expect(highRank).toBe(1); // Highest efficiency
      expect(balancedRank).toBe(2); // Middle efficiency
      expect(lowRank).toBe(3); // Lowest efficiency
    });

    it('should handle equal efficiencies in ranking', () => {
      const efficiency1 = new VolumeLiquidityEfficiencyImpl(poolState, config);
      const efficiency2 = new VolumeLiquidityEfficiencyImpl(poolState, config);

      const rank1 = efficiency1.preferenceOrdering.getPreferenceRank([efficiency2]);
      const rank2 = efficiency2.preferenceOrdering.getPreferenceRank([efficiency1]);

      expect(rank1).toBe(1);
      expect(rank2).toBe(1);
    });

    it('should return consistent rankings', () => {
      const poolStates = createMultiplePoolStates(10);
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      // Test multiple times to ensure consistency
      for (let i = 0; i < 5; i++) {
        const efficiency = efficiencies[i]!;
        const others = efficiencies.filter((_, index) => index !== i);
        const rank = efficiency.preferenceOrdering.getPreferenceRank(others);
        
        expect(rank).toBeGreaterThanOrEqual(1);
        expect(rank).toBeLessThanOrEqual(efficiencies.length);
      }
    });
  });

  describe('Mathematical Properties', () => {
    describe('Reflexivity', () => {
      it('should satisfy A ≥ A for all A', () => {
        const poolStates = createMultiplePoolStates(10);
        
        for (const pool of poolStates) {
          const efficiency = new VolumeLiquidityEfficiencyImpl(pool, config);
          const result = efficiency.preferenceOrdering.compare(efficiency);
          expect(result).toBe(ComparisonResult.EQUAL);
        }
      });
    });

    describe('Transitivity', () => {
      it('should satisfy A≥B and B≥C implies A≥C', () => {
        const poolStates = createMultiplePoolStates(5);
        const efficiencies = poolStates.map(pool => 
          new VolumeLiquidityEfficiencyImpl(pool, config)
        );

        for (let i = 0; i < efficiencies.length - 2; i++) {
          const a = efficiencies[i]!;
          const b = efficiencies[i + 1]!;
          const c = efficiencies[i + 2]!;

          const aToB = a.preferenceOrdering.compare(b);
          const bToC = b.preferenceOrdering.compare(c);
          const aToC = a.preferenceOrdering.compare(c);

          // If A≥B and B≥C, then A≥C
          if (aToB !== ComparisonResult.LESS && bToC !== ComparisonResult.LESS) {
            expect(aToC).not.toBe(ComparisonResult.LESS);
          }
        }
      });
    });

    describe('Completeness', () => {
      it('should satisfy A≥B or B≥A for any A,B', () => {
        const poolStates = createMultiplePoolStates(10);
        const efficiencies = poolStates.map(pool => 
          new VolumeLiquidityEfficiencyImpl(pool, config)
        );

        for (let i = 0; i < efficiencies.length; i++) {
          for (let j = 0; j < efficiencies.length; j++) {
            if (i !== j) {
              const a = efficiencies[i]!;
              const b = efficiencies[j]!;

              const aToB = a.preferenceOrdering.compare(b);
              const bToA = b.preferenceOrdering.compare(a);

              // At least one should be GREATER or EQUAL
              const aGreaterOrEqual = aToB === ComparisonResult.GREATER || aToB === ComparisonResult.EQUAL;
              const bGreaterOrEqual = bToA === ComparisonResult.GREATER || bToA === ComparisonResult.EQUAL;

              expect(aGreaterOrEqual || bGreaterOrEqual).toBe(true);
            }
          }
        }
      });
    });

    describe('Antisymmetry', () => {
      it('should satisfy A≥B and B≥A implies A=B', () => {
        const poolStates = createMultiplePoolStates(10);
        const efficiencies = poolStates.map(pool => 
          new VolumeLiquidityEfficiencyImpl(pool, config)
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
  });

  describe('Edge Cases', () => {
    it('should handle zero efficiency values', () => {
      const zeroPool = createMockPoolState({
        volumeUSD: '0',
        totalValueLockedUSD: '0',
        liquidity: '1'
      });
      const zeroEfficiency = new VolumeLiquidityEfficiencyImpl(zeroPool, config);

      const result = zeroEfficiency.preferenceOrdering.compare(efficiency);
      expect(result).toBeDefined();
    });

    it('should handle very large efficiency values', () => {
      const largePool = createMockPoolState({
        volumeUSD: '1000000000000',
        totalValueLockedUSD: '1000000000000',
        liquidity: '1'
      });
      const largeEfficiency = new VolumeLiquidityEfficiencyImpl(largePool, config);

      const result = largeEfficiency.preferenceOrdering.compare(efficiency);
      expect(result).toBeDefined();
    });

    it('should handle very small efficiency values', () => {
      const smallPool = createMockPoolState({
        volumeUSD: '1',
        totalValueLockedUSD: '1',
        liquidity: '1000000000000'
      });
      const smallEfficiency = new VolumeLiquidityEfficiencyImpl(smallPool, config);

      const result = smallEfficiency.preferenceOrdering.compare(efficiency);
      expect(result).toBeDefined();
    });

    it('should handle NaN efficiency values gracefully', () => {
      const nanPool = createMockPoolState({
        volumeUSD: 'NaN',
        totalValueLockedUSD: '1000000',
        liquidity: '1000000'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(nanPool, config);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of efficiencies efficiently', () => {
      const poolStates = createMultiplePoolStates(100);
      const efficiencies = poolStates.map(pool => 
        new VolumeLiquidityEfficiencyImpl(pool, config)
      );

      const startTime = Date.now();
      
      for (let i = 0; i < efficiencies.length; i++) {
        for (let j = 0; j < efficiencies.length; j++) {
          if (i !== j) {
            efficiencies[i]!.preferenceOrdering.compare(efficiencies[j]!);
          }
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});
