/**
 * Type definitions for Volume-to-Liquidity Efficiency Interface
 * 
 * This module defines all interfaces, enums, and types used in the
 * Volume-to-Liquidity efficiency calculation system.
 */

import { PoolState } from '../../../types/PoolState';

// Comparison result enum
export enum ComparisonResult {
  GREATER = 'greater',
  EQUAL = 'equal',
  LESS = 'less',
  INCOMPARABLE = 'incomparable'
}

// Base validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Variable completeness validation result
export interface VariableCompletenessResult extends ValidationResult {
  missingVariables: string[];
  availableVariables: string[];
  completenessScore: number;
}

// Efficiency calculation validation result
export interface EfficiencyValidationResult extends ValidationResult {
  calculationSteps: string[];
  intermediateValues: Record<string, number>;
  finalValue: number;
}

// Consistency validation result
export interface ConsistencyResult extends ValidationResult {
  consistencyScore: number;
  inconsistencies: string[];
}

// Preference ordering validation result
export interface PreferenceOrderingValidationResult extends ValidationResult {
  reflexivity: boolean;
  transitivity: boolean;
  completeness: boolean;
  antisymmetry: boolean;
}

// Endogenous variable validation result
export interface EndogenousVariableValidationResult extends ValidationResult {
  endogenousVariables: string[];
  exogenousVariables: string[];
  derivationPaths: Record<string, string[]>;
}

// Efficiency calculation validation result
export interface EfficiencyCalculationValidationResult extends ValidationResult {
  calculationValid: boolean;
  intermediateResults: Record<string, number>;
  finalResult: number;
}

// Pool state consistency validation result
export interface PoolStateConsistencyResult extends ValidationResult {
  consistencyScore: number;
  mismatches: string[];
}

// Comprehensive validation result
export interface ComprehensiveValidationResult {
  isValid: boolean;
  preferenceOrderingValid: boolean;
  endogenousVariablesValid: boolean;
  efficiencyCalculationValid: boolean;
  poolStateConsistencyValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Test result interfaces
export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  overallPassed: boolean;
}

// Configuration interface
export interface EfficiencyConfig {
  // Weighting parameters
  volumeWeight: number;                // Weight for volume component
  liquidityWeight: number;            // Weight for liquidity component
  tvlWeight: number;                  // Weight for TVL component
  
  // Normalization parameters
  volumeNormalizationFactor: number;   // Factor for volume normalization
  liquidityNormalizationFactor: number; // Factor for liquidity normalization
  
  // Risk adjustment parameters
  volatilityAdjustment: number;       // Volatility adjustment factor
  correlationAdjustment: number;      // Correlation adjustment factor
  
  // Temporal parameters
  timeWindow: number;                 // Time window for calculations
  decayFactor: number;                // Decay factor for temporal effects
}

// Determinants interface
export interface VolumeLiquidityDeterminants<T extends string = string> {
  // Primary determinants from pool state
  volumeUSD: string;                    // From poolState.volumeUSD
  totalValueLockedUSD: string;          // From poolState.totalValueLockedUSD
  liquidity: string;                    // From poolState.liquidity
  
  // Derived determinants
  volumeLiquidityRatio: number;         // volumeUSD / liquidity
  tvlLiquidityRatio: number;            // totalValueLockedUSD / liquidity
  volumeTVLRatio: number;              // volumeUSD / totalValueLockedUSD
  
  // Temporal determinants
  volumeGrowthRate: number;            // Rate of volume growth
  liquidityGrowthRate: number;         // Rate of liquidity growth
  efficiencyTrend: number;             // Trend in efficiency over time
  
  // Risk-adjusted determinants
  riskAdjustedVolume: number;          // Volume adjusted for volatility
  riskAdjustedLiquidity: number;       // Liquidity adjusted for risk
  stabilityFactor: number;            // Price stability factor
}

// Preference ordering methods interface
export interface PreferenceOrderingMethods<T extends string = string> {
  // Check if preference ordering is well-defined
  hasPreferenceOrdering(): boolean;
  
  // Compare two efficiency values
  compare(other: VolumeLiquidityEfficiency<T>): ComparisonResult;
  
  // Check transitivity property
  isTransitive(a: VolumeLiquidityEfficiency<T>, b: VolumeLiquidityEfficiency<T>, c: VolumeLiquidityEfficiency<T>): boolean;
  
  // Check completeness property
  isComplete(other: VolumeLiquidityEfficiency<T>): boolean;
  
  // Get preference ranking
  getPreferenceRank(others: VolumeLiquidityEfficiency<T>[]): number;
}

// Validation methods interface
export interface ValidationMethods<T extends string = string> {
  // Check if all determinants are endogenous
  areDeterminantsEndogenous(): boolean;
  
  // Validate pool state dependency
  validatePoolStateDependency(poolState: PoolState<T>): ValidationResult;
  
  // Check variable completeness
  checkVariableCompleteness(): VariableCompletenessResult;
  
  // Validate efficiency calculation
  validateEfficiencyCalculation(): EfficiencyValidationResult;
  
  // Check consistency with pool state
  checkConsistencyWithPoolState(poolState: PoolState<T>): ConsistencyResult;
  
  // Run comprehensive validation
  runComprehensiveValidation(poolState: PoolState<T>): ComprehensiveValidationResult;
}

// Main efficiency interface
export interface VolumeLiquidityEfficiency<T extends string = string> {
  // Core efficiency metric
  efficiency: number;
  
  // Determinants (all endogenous from pool state)
  determinants: VolumeLiquidityDeterminants<T>;
  
  // Preference ordering methods
  preferenceOrdering: PreferenceOrderingMethods<T>;
  
  // Validation methods
  validation: ValidationMethods<T>;
  
  // Configuration
  config: EfficiencyConfig;
}

// Configuration builder interface
export interface EfficiencyConfigBuilder<T extends string = string> {
  // Set weighting parameters
  setVolumeWeight(weight: number): EfficiencyConfigBuilder<T>;
  setLiquidityWeight(weight: number): EfficiencyConfigBuilder<T>;
  setTVLWeight(weight: number): EfficiencyConfigBuilder<T>;
  
  // Set normalization parameters
  setVolumeNormalization(factor: number): EfficiencyConfigBuilder<T>;
  setLiquidityNormalization(factor: number): EfficiencyConfigBuilder<T>;
  
  // Set risk adjustment parameters
  setVolatilityAdjustment(factor: number): EfficiencyConfigBuilder<T>;
  setCorrelationAdjustment(factor: number): EfficiencyConfigBuilder<T>;
  
  // Set temporal parameters
  setTimeWindow(window: number): EfficiencyConfigBuilder<T>;
  setDecayFactor(factor: number): EfficiencyConfigBuilder<T>;
  
  // Build final configuration
  build(): EfficiencyConfig;
}

// Testing interface
export interface VolumeLiquidityEfficiencyTests<T extends string = string> {
  // Test preference ordering properties
  testPreferenceOrderingProperties(): TestResult[];
  
  // Test endogenous variable requirements
  testEndogenousVariableRequirements(): TestResult[];
  
  // Test efficiency calculation
  testEfficiencyCalculation(): TestResult[];
  
  // Test edge cases
  testEdgeCases(): TestResult[];
  
  // Run all tests
  runAllTests(): TestSuiteResult;
}
