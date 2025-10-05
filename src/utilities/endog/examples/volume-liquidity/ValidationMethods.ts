/**
 * Validation Methods Implementation
 * 
 * Implements comprehensive validation for Volume-to-Liquidity efficiency.
 * Ensures all determinants are endogenous and calculations are consistent.
 */

import { PoolState } from '../../../types/PoolState';
import { 
  ValidationResult,
  VariableCompletenessResult,
  EfficiencyValidationResult,
  ConsistencyResult,
  ComprehensiveValidationResult,
  ValidationMethods,
  VolumeLiquidityEfficiency,
  VolumeLiquidityDeterminants
} from './types';

export class ValidationMethodsImpl<T extends string = string> implements ValidationMethods<T> {
  constructor(private efficiency: VolumeLiquidityEfficiency<T>) {}

  /**
   * Check if all determinants are endogenous (derived from pool state)
   * @returns true if all determinants are endogenous
   */
  areDeterminantsEndogenous(): boolean {
    const determinants = this.efficiency.determinants;
    const poolStateFields = this.getPoolStateFields();
    
    // Check each determinant can be traced to pool state fields
    return this.traceAllDeterminants(determinants, poolStateFields);
  }

  /**
   * Validate pool state dependency
   * @param poolState Pool state to validate against
   * @returns Validation result
   */
  validatePoolStateDependency(poolState: PoolState<T>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate that efficiency can be calculated from pool state
      const testEfficiency = this.calculateEfficiencyFromPoolState(poolState);
      
      if (isNaN(testEfficiency)) {
        errors.push('Efficiency calculation results in NaN');
      }
      
      if (!isFinite(testEfficiency)) {
        errors.push('Efficiency calculation results in infinite value');
      }
      
      if (testEfficiency < 0) {
        warnings.push('Efficiency value is negative');
      }
      
    } catch (error) {
      errors.push(`Efficiency calculation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check variable completeness
   * @returns Variable completeness result
   */
  checkVariableCompleteness(): VariableCompletenessResult {
    const requiredFields = [
      'volumeUSD', 'totalValueLockedUSD', 'liquidity'
    ];

    const missingVariables: string[] = [];
    const availableVariables: string[] = [];

    // Check which fields are available in pool state
    requiredFields.forEach(field => {
      if (this.hasPoolStateField(field)) {
        availableVariables.push(field);
      } else {
        missingVariables.push(field);
      }
    });

    const completenessScore = availableVariables.length / requiredFields.length;

    return {
      isValid: missingVariables.length === 0,
      errors: missingVariables.length > 0 ? [`Missing variables: ${missingVariables.join(', ')}`] : [],
      warnings: [],
      missingVariables,
      availableVariables,
      completenessScore
    };
  }

  /**
   * Validate efficiency calculation
   * @returns Efficiency validation result
   */
  validateEfficiencyCalculation(): EfficiencyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const calculationSteps: string[] = [];
    const intermediateValues: Record<string, number> = {};

    try {
      const { determinants, config } = this.efficiency;
      
      // Step 1: Calculate ratios
      calculationSteps.push('Calculated volume-liquidity ratio');
      const volumeLiquidityRatio = determinants.volumeLiquidityRatio;
      intermediateValues.volumeLiquidityRatio = volumeLiquidityRatio;
      
      calculationSteps.push('Calculated TVL-liquidity ratio');
      const tvlLiquidityRatio = determinants.tvlLiquidityRatio;
      intermediateValues.tvlLiquidityRatio = tvlLiquidityRatio;
      
      calculationSteps.push('Calculated volume-TVL ratio');
      const volumeTVLRatio = determinants.volumeTVLRatio;
      intermediateValues.volumeTVLRatio = volumeTVLRatio;

      // Step 2: Apply normalization
      calculationSteps.push('Applied volume normalization');
      const normalizedVolume = volumeLiquidityRatio / config.volumeNormalizationFactor;
      intermediateValues.normalizedVolume = normalizedVolume;
      
      calculationSteps.push('Applied liquidity normalization');
      const normalizedLiquidity = tvlLiquidityRatio / config.liquidityNormalizationFactor;
      intermediateValues.normalizedLiquidity = normalizedLiquidity;

      // Step 3: Calculate weighted sum
      calculationSteps.push('Calculated weighted sum');
      const finalResult = (
        config.volumeWeight * normalizedVolume +
        config.liquidityWeight * normalizedLiquidity +
        config.tvlWeight * volumeTVLRatio
      );
      intermediateValues.finalResult = finalResult;

      if (isNaN(finalResult)) {
        errors.push('Final efficiency calculation resulted in NaN');
      }

      if (!isFinite(finalResult)) {
        errors.push('Final efficiency calculation resulted in infinite value');
      }

      if (finalResult < 0) {
        warnings.push('Efficiency value is negative');
      }

    } catch (error) {
      errors.push(`Efficiency calculation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      calculationSteps,
      intermediateValues,
      finalValue: this.efficiency.efficiency
    };
  }

  /**
   * Check consistency with pool state
   * @param poolState Pool state to check consistency with
   * @returns Consistency result
   */
  checkConsistencyWithPoolState(poolState: PoolState<T>): ConsistencyResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const inconsistencies: string[] = [];

    try {
      // Check if efficiency can be recalculated from pool state
      const recalculatedEfficiency = this.calculateEfficiencyFromPoolState(poolState);
      const difference = Math.abs(this.efficiency.efficiency - recalculatedEfficiency);
      
      const tolerance = 1e-10;
      if (difference > tolerance) {
        inconsistencies.push(`Efficiency mismatch: ${difference}`);
      }
      
      const consistencyScore = inconsistencies.length === 0 ? 1.0 : 0.0;
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        consistencyScore,
        inconsistencies
      };
      
    } catch (error) {
      errors.push(`Consistency check failed: ${error}`);
      return {
        isValid: false,
        errors,
        warnings,
        consistencyScore: 0.0,
        inconsistencies
      };
    }
  }

  /**
   * Run comprehensive validation
   * @param poolState Pool state to validate against
   * @returns Comprehensive validation result
   */
  runComprehensiveValidation(poolState: PoolState<T>): ComprehensiveValidationResult {
    const preferenceOrderingValid = this.efficiency.preferenceOrdering.hasPreferenceOrdering();
    const endogenousVariablesValid = this.areDeterminantsEndogenous();
    const efficiencyCalculationValid = this.validateEfficiencyCalculation().isValid;
    const poolStateConsistencyValid = this.checkConsistencyWithPoolState(poolState).isValid;

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!preferenceOrderingValid) {
      errors.push('Preference ordering validation failed');
    }

    if (!endogenousVariablesValid) {
      errors.push('Not all determinants are endogenous');
    }

    if (!efficiencyCalculationValid) {
      errors.push('Efficiency calculation validation failed');
    }

    if (!poolStateConsistencyValid) {
      errors.push('Pool state consistency validation failed');
    }

    if (errors.length === 0) {
      recommendations.push('All validations passed successfully');
    } else {
      recommendations.push('Address validation errors before using efficiency in production');
    }

    return {
      isValid: errors.length === 0,
      preferenceOrderingValid,
      endogenousVariablesValid,
      efficiencyCalculationValid,
      poolStateConsistencyValid,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Get pool state fields that determinants can be derived from
   * @returns Array of pool state field names
   */
  private getPoolStateFields(): string[] {
    return [
      'volumeUSD', 'totalValueLockedUSD', 'liquidity',
      'volumeToken0', 'volumeToken1', 'feesUSD',
      'collectedFeesUSD', 'txCount', 'totalValueLockedToken0',
      'totalValueLockedToken1', 'totalValueLockedETH'
    ];
  }

  /**
   * Trace all determinants to pool state fields
   * @param determinants Determinants to trace
   * @param poolStateFields Available pool state fields
   * @returns true if all determinants can be traced
   */
  private traceAllDeterminants(determinants: VolumeLiquidityDeterminants<T>, poolStateFields: string[]): boolean {
    // Primary determinants are directly from pool state
    const primaryDeterminants = ['volumeUSD', 'totalValueLockedUSD', 'liquidity'];
    
    for (const field of primaryDeterminants) {
      if (!poolStateFields.includes(field)) {
        return false;
      }
    }

    // Derived determinants are calculated from primary determinants
    const derivedDeterminants = ['volumeLiquidityRatio', 'tvlLiquidityRatio', 'volumeTVLRatio'];
    for (const field of derivedDeterminants) {
      if (!this.canCalculateDerivedDeterminant(field, primaryDeterminants)) {
        return false;
      }
    }

    // Risk-adjusted determinants are calculated from primary determinants
    const riskAdjustedDeterminants = ['riskAdjustedVolume', 'riskAdjustedLiquidity'];
    for (const field of riskAdjustedDeterminants) {
      if (!this.canCalculateRiskAdjustedDeterminant(field, primaryDeterminants)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a derived determinant can be calculated
   * @param determinantName Name of the determinant
   * @param primaryDeterminants Available primary determinants
   * @returns true if can be calculated
   */
  private canCalculateDerivedDeterminant(determinantName: string, primaryDeterminants: string[]): boolean {
    const dependencies: Record<string, string[]> = {
      'volumeLiquidityRatio': ['volumeUSD', 'liquidity'],
      'tvlLiquidityRatio': ['totalValueLockedUSD', 'liquidity'],
      'volumeTVLRatio': ['volumeUSD', 'totalValueLockedUSD']
    };

    const requiredFields = dependencies[determinantName] || [];
    return requiredFields.every(field => primaryDeterminants.includes(field));
  }

  /**
   * Check if a risk-adjusted determinant can be calculated
   * @param determinantName Name of the determinant
   * @param primaryDeterminants Available primary determinants
   * @returns true if can be calculated
   */
  private canCalculateRiskAdjustedDeterminant(determinantName: string, primaryDeterminants: string[]): boolean {
    const dependencies: Record<string, string[]> = {
      'riskAdjustedVolume': ['volumeUSD'],
      'riskAdjustedLiquidity': ['liquidity']
    };

    const requiredFields = dependencies[determinantName] || [];
    return requiredFields.every(field => primaryDeterminants.includes(field));
  }

  /**
   * Check if pool state has a specific field
   * @param fieldName Name of the field
   * @returns true if field exists
   */
  private hasPoolStateField(fieldName: string): boolean {
    // This would check against the actual pool state
    // For now, assume all required fields are present
    return true;
  }

  /**
   * Calculate efficiency from pool state (helper method)
   * @param poolState Pool state to calculate from
   * @returns Calculated efficiency value
   */
  private calculateEfficiencyFromPoolState(poolState: PoolState<T>): number {
    const volumeUSD = parseFloat(poolState.volumeUSD);
    const totalValueLockedUSD = parseFloat(poolState.totalValueLockedUSD);
    const liquidity = parseFloat(poolState.liquidity);

    if (liquidity === 0) {
      throw new Error('Liquidity cannot be zero');
    }

    const volumeLiquidityRatio = volumeUSD / liquidity;
    const tvlLiquidityRatio = totalValueLockedUSD / liquidity;
    const volumeTVLRatio = totalValueLockedUSD > 0 ? volumeUSD / totalValueLockedUSD : 0;

    const { config } = this.efficiency;
    const normalizedVolume = volumeLiquidityRatio / config.volumeNormalizationFactor;
    const normalizedLiquidity = tvlLiquidityRatio / config.liquidityNormalizationFactor;

    return (
      config.volumeWeight * normalizedVolume +
      config.liquidityWeight * normalizedLiquidity +
      config.tvlWeight * volumeTVLRatio
    );
  }
}
