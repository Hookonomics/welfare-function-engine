/**
 * Volume-to-Liquidity Efficiency Module
 * 
 * Public API exports for the Volume-to-Liquidity efficiency calculation system.
 * This module provides all interfaces, implementations, and utilities needed
 * to calculate and validate efficiency metrics for AMM pools.
 */

// Export all types and interfaces
export * from './types';

// Export implementations
export { EfficiencyConfigBuilderImpl } from './EfficiencyConfigBuilder';
export { PreferenceOrderingMethodsImpl } from './PreferenceOrderingMethods';
export { ValidationMethodsImpl } from './ValidationMethods';
export { VolumeLiquidityEfficiencyImpl } from './VolumeLiquidityEfficiency';

// Re-export commonly used types for convenience
export type {
  VolumeLiquidityEfficiency,
  VolumeLiquidityDeterminants,
  EfficiencyConfig,
  ComparisonResult,
  ValidationResult,
  ComprehensiveValidationResult
} from './types';
