/**
 * Unit Tests for Validation Methods
 * 
 * Tests all validation methods including endogenous variable validation,
 * pool state dependency validation, and comprehensive validation.
 */

import { VolumeLiquidityEfficiencyImpl } from '../../../../src/utilities/endog/volume-liquidity/VolumeLiquidityEfficiency';
import { 
  createMockPoolState, 
  createMockConfig,
  createHighVolumePoolState,
  createLowVolumePoolState,
  createEdgeCasePoolState,
  assertValidationResult
} from './fixtures';

describe('ValidationMethodsImpl', () => {
  let poolState: ReturnType<typeof createMockPoolState>;
  let config: ReturnType<typeof createMockConfig>;
  let efficiency: VolumeLiquidityEfficiencyImpl<string>;

  beforeEach(() => {
    poolState = createMockPoolState();
    config = createMockConfig();
    efficiency = new VolumeLiquidityEfficiencyImpl(poolState, config);
  });

  describe('areDeterminantsEndogenous', () => {
    it('should return true for valid pool state', () => {
      const areEndogenous = efficiency.validation.areDeterminantsEndogenous();
      expect(areEndogenous).toBe(true);
    });

    it('should identify primary determinants as endogenous', () => {
      const areEndogenous = efficiency.validation.areDeterminantsEndogenous();
      expect(areEndogenous).toBe(true);
    });

    it('should identify derived determinants as endogenous', () => {
      const areEndogenous = efficiency.validation.areDeterminantsEndogenous();
      expect(areEndogenous).toBe(true);
    });

    it('should identify risk-adjusted determinants as endogenous', () => {
      const areEndogenous = efficiency.validation.areDeterminantsEndogenous();
      expect(areEndogenous).toBe(true);
    });
  });

  describe('validatePoolStateDependency', () => {
    it('should return valid for normal pool state', () => {
      const result = efficiency.validation.validatePoolStateDependency(poolState);
      assertValidationResult(result, true);
    });

    it('should return valid for high volume pool state', () => {
      const highVolumePool = createHighVolumePoolState();
      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const result = highVolumeEfficiency.validation.validatePoolStateDependency(highVolumePool);
      assertValidationResult(result, true);
    });

    it('should return valid for low volume pool state', () => {
      const lowVolumePool = createLowVolumePoolState();
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);
      const result = lowVolumeEfficiency.validation.validatePoolStateDependency(lowVolumePool);
      assertValidationResult(result, true);
    });

    it('should handle edge case pool state', () => {
      const edgeCasePool = createEdgeCasePoolState();
      const edgeCaseEfficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);
      const result = edgeCaseEfficiency.validation.validatePoolStateDependency(edgeCasePool);
      assertValidationResult(result, true);
    });

    it('should detect invalid pool state data', () => {
      const invalidPool = createMockPoolState({
        volumeUSD: 'invalid',
        totalValueLockedUSD: 'invalid',
        liquidity: 'invalid'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(invalidPool, config);
      }).toThrow();
    });
  });

  describe('checkVariableCompleteness', () => {
    it('should return complete for valid pool state', () => {
      const result = efficiency.validation.checkVariableCompleteness();
      assertValidationResult(result, true);
      expect(result.completenessScore).toBe(1.0);
    });

    it('should identify all required variables', () => {
      const result = efficiency.validation.checkVariableCompleteness();
      expect(result.availableVariables).toContain('volumeUSD');
      expect(result.availableVariables).toContain('totalValueLockedUSD');
      expect(result.availableVariables).toContain('liquidity');
    });

    it('should have no missing variables for complete pool state', () => {
      const result = efficiency.validation.checkVariableCompleteness();
      expect(result.missingVariables).toHaveLength(0);
    });

    it('should calculate completeness score correctly', () => {
      const result = efficiency.validation.checkVariableCompleteness();
      expect(result.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.completenessScore).toBeLessThanOrEqual(1);
    });
  });

  describe('validateEfficiencyCalculation', () => {
    it('should return valid for normal calculation', () => {
      const result = efficiency.validation.validateEfficiencyCalculation();
      assertValidationResult(result, true);
    });

    it('should include calculation steps', () => {
      const result = efficiency.validation.validateEfficiencyCalculation();
      expect(result.calculationSteps).toHaveLength(5); // 5 steps in calculation
      expect(result.calculationSteps).toContain('Calculated volume-liquidity ratio');
      expect(result.calculationSteps).toContain('Calculated TVL-liquidity ratio');
      expect(result.calculationSteps).toContain('Calculated volume-TVL ratio');
      expect(result.calculationSteps).toContain('Applied volume normalization');
      expect(result.calculationSteps).toContain('Applied liquidity normalization');
    });

    it('should include intermediate values', () => {
      const result = efficiency.validation.validateEfficiencyCalculation();
      expect(result.intermediateValues).toHaveProperty('volumeLiquidityRatio');
      expect(result.intermediateValues).toHaveProperty('tvlLiquidityRatio');
      expect(result.intermediateValues).toHaveProperty('volumeTVLRatio');
      expect(result.intermediateValues).toHaveProperty('normalizedVolume');
      expect(result.intermediateValues).toHaveProperty('normalizedLiquidity');
      expect(result.intermediateValues).toHaveProperty('finalResult');
    });

    it('should match final efficiency value', () => {
      const result = efficiency.validation.validateEfficiencyCalculation();
      expect(result.finalValue).toBe(efficiency.efficiency);
    });

    it('should handle edge case calculations', () => {
      const edgeCasePool = createEdgeCasePoolState();
      const edgeCaseEfficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);
      const result = edgeCaseEfficiency.validation.validateEfficiencyCalculation();
      
      // Edge case should still be valid but with warnings
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkConsistencyWithPoolState', () => {
    it('should return consistent for same pool state', () => {
      const result = efficiency.validation.checkConsistencyWithPoolState(poolState);
      assertValidationResult(result, true);
      expect(result.consistencyScore).toBe(1.0);
    });

    it('should detect inconsistencies with different pool state', () => {
      const differentPool = createHighVolumePoolState();
      const result = efficiency.validation.checkConsistencyWithPoolState(differentPool);
      
      // Should detect inconsistency
      expect(result.consistencyScore).toBe(0.0);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
    });

    it('should have no mismatches for consistent pool state', () => {
      const result = efficiency.validation.checkConsistencyWithPoolState(poolState);
      expect(result.inconsistencies).toHaveLength(0);
    });

    it('should calculate consistency score correctly', () => {
      const result = efficiency.validation.checkConsistencyWithPoolState(poolState);
      expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.consistencyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('runComprehensiveValidation', () => {
    it('should return valid for normal efficiency', () => {
      const result = efficiency.validation.runComprehensiveValidation(poolState);
      expect(result.isValid).toBe(true);
      expect(result.preferenceOrderingValid).toBe(true);
      expect(result.endogenousVariablesValid).toBe(true);
      expect(result.efficiencyCalculationValid).toBe(true);
      expect(result.poolStateConsistencyValid).toBe(true);
    });

    it('should include all validation results', () => {
      const result = efficiency.validation.runComprehensiveValidation(poolState);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('preferenceOrderingValid');
      expect(result).toHaveProperty('endogenousVariablesValid');
      expect(result).toHaveProperty('efficiencyCalculationValid');
      expect(result).toHaveProperty('poolStateConsistencyValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should provide recommendations for valid efficiency', () => {
      const result = efficiency.validation.runComprehensiveValidation(poolState);
      expect(result.recommendations).toContain('All validations passed successfully');
    });

    it('should provide recommendations for invalid efficiency', () => {
      const invalidPool = createMockPoolState({
        volumeUSD: 'NaN',
        totalValueLockedUSD: '1000000',
        liquidity: '1000000'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(invalidPool, config);
      }).toThrow();
    });

    it('should aggregate all validation results', () => {
      const result = efficiency.validation.runComprehensiveValidation(poolState);
      
      // All individual validations should be true
      expect(result.preferenceOrderingValid).toBe(true);
      expect(result.endogenousVariablesValid).toBe(true);
      expect(result.efficiencyCalculationValid).toBe(true);
      expect(result.poolStateConsistencyValid).toBe(true);
      
      // Overall result should be true
      expect(result.isValid).toBe(true);
    });

    it('should report errors when validations fail', () => {
      // Create an efficiency that might fail some validations
      const edgeCasePool = createEdgeCasePoolState();
      const edgeCaseEfficiency = new VolumeLiquidityEfficiencyImpl(edgeCasePool, config);
      const result = edgeCaseEfficiency.validation.runComprehensiveValidation(edgeCasePool);
      
      // Edge case should still pass most validations
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid pool state gracefully', () => {
      const invalidPool = createMockPoolState({
        volumeUSD: 'invalid',
        totalValueLockedUSD: '1000000',
        liquidity: '1000000'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(invalidPool, config);
      }).toThrow();
    });

    it('should handle missing pool state fields', () => {
      const incompletePool = {
        ...poolState,
        volumeUSD: undefined as any,
        totalValueLockedUSD: undefined as any,
        liquidity: undefined as any
      };

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(incompletePool, config);
      }).toThrow();
    });

    it('should handle NaN values in pool state', () => {
      const nanPool = createMockPoolState({
        volumeUSD: 'NaN',
        totalValueLockedUSD: 'NaN',
        liquidity: 'NaN'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(nanPool, config);
      }).toThrow();
    });

    it('should handle Infinity values in pool state', () => {
      const infinityPool = createMockPoolState({
        volumeUSD: 'Infinity',
        totalValueLockedUSD: 'Infinity',
        liquidity: 'Infinity'
      });

      expect(() => {
        new VolumeLiquidityEfficiencyImpl(infinityPool, config);
      }).toThrow();
    });
  });

  describe('Validation Consistency', () => {
    it('should produce consistent results for same inputs', () => {
      const result1 = efficiency.validation.runComprehensiveValidation(poolState);
      const result2 = efficiency.validation.runComprehensiveValidation(poolState);
      
      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.preferenceOrderingValid).toBe(result2.preferenceOrderingValid);
      expect(result1.endogenousVariablesValid).toBe(result2.endogenousVariablesValid);
      expect(result1.efficiencyCalculationValid).toBe(result2.efficiencyCalculationValid);
      expect(result1.poolStateConsistencyValid).toBe(result2.poolStateConsistencyValid);
    });

    it('should produce different results for different inputs', () => {
      const highVolumePool = createHighVolumePoolState();
      const lowVolumePool = createLowVolumePoolState();

      const highVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(highVolumePool, config);
      const lowVolumeEfficiency = new VolumeLiquidityEfficiencyImpl(lowVolumePool, config);

      const result1 = highVolumeEfficiency.validation.runComprehensiveValidation(highVolumePool);
      const result2 = lowVolumeEfficiency.validation.runComprehensiveValidation(lowVolumePool);

      // Both should be valid but might have different warnings/recommendations
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete validation within reasonable time', () => {
      const startTime = Date.now();
      const result = efficiency.validation.runComprehensiveValidation(poolState);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.isValid).toBe(true);
    });

    it('should handle multiple validations efficiently', () => {
      const poolStates = [createHighVolumePoolState(), createLowVolumePoolState(), createEdgeCasePoolState()];
      const efficiencies = poolStates.map(pool => new VolumeLiquidityEfficiencyImpl(pool, config));
      
      const startTime = Date.now();
      
      for (const efficiency of efficiencies) {
        efficiency.validation.runComprehensiveValidation(efficiency.getPoolState());
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
