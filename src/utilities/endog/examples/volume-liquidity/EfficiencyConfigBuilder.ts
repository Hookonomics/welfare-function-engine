/**
 * Efficiency Configuration Builder
 * 
 * Implements the builder pattern for creating EfficiencyConfig instances
 * with fluent API and validation.
 */

import { EfficiencyConfig, EfficiencyConfigBuilder } from './types';

export class EfficiencyConfigBuilderImpl<T extends string = string> implements EfficiencyConfigBuilder<T> {
  private config: Partial<EfficiencyConfig> = {};

  /**
   * Set the weight for volume component
   * @param weight Weight value (0-1)
   * @returns Builder instance for chaining
   */
  setVolumeWeight(weight: number): EfficiencyConfigBuilder<T> {
    this.validateWeight(weight);
    this.config.volumeWeight = weight;
    return this;
  }

  /**
   * Set the weight for liquidity component
   * @param weight Weight value (0-1)
   * @returns Builder instance for chaining
   */
  setLiquidityWeight(weight: number): EfficiencyConfigBuilder<T> {
    this.validateWeight(weight);
    this.config.liquidityWeight = weight;
    return this;
  }

  /**
   * Set the weight for TVL component
   * @param weight Weight value (0-1)
   * @returns Builder instance for chaining
   */
  setTVLWeight(weight: number): EfficiencyConfigBuilder<T> {
    this.validateWeight(weight);
    this.config.tvlWeight = weight;
    return this;
  }

  /**
   * Set the normalization factor for volume
   * @param factor Normalization factor (must be positive)
   * @returns Builder instance for chaining
   */
  setVolumeNormalization(factor: number): EfficiencyConfigBuilder<T> {
    this.validatePositiveNumber(factor, 'Volume normalization factor');
    this.config.volumeNormalizationFactor = factor;
    return this;
  }

  /**
   * Set the normalization factor for liquidity
   * @param factor Normalization factor (must be positive)
   * @returns Builder instance for chaining
   */
  setLiquidityNormalization(factor: number): EfficiencyConfigBuilder<T> {
    this.validatePositiveNumber(factor, 'Liquidity normalization factor');
    this.config.liquidityNormalizationFactor = factor;
    return this;
  }

  /**
   * Set the volatility adjustment factor
   * @param factor Adjustment factor (0-1)
   * @returns Builder instance for chaining
   */
  setVolatilityAdjustment(factor: number): EfficiencyConfigBuilder<T> {
    this.validateAdjustmentFactor(factor, 'Volatility adjustment');
    this.config.volatilityAdjustment = factor;
    return this;
  }

  /**
   * Set the correlation adjustment factor
   * @param factor Adjustment factor (0-1)
   * @returns Builder instance for chaining
   */
  setCorrelationAdjustment(factor: number): EfficiencyConfigBuilder<T> {
    this.validateAdjustmentFactor(factor, 'Correlation adjustment');
    this.config.correlationAdjustment = factor;
    return this;
  }

  /**
   * Set the time window for calculations
   * @param window Time window in milliseconds
   * @returns Builder instance for chaining
   */
  setTimeWindow(window: number): EfficiencyConfigBuilder<T> {
    this.validatePositiveNumber(window, 'Time window');
    this.config.timeWindow = window;
    return this;
  }

  /**
   * Set the decay factor for temporal effects
   * @param factor Decay factor (0-1)
   * @returns Builder instance for chaining
   */
  setDecayFactor(factor: number): EfficiencyConfigBuilder<T> {
    this.validateDecayFactor(factor);
    this.config.decayFactor = factor;
    return this;
  }

  /**
   * Build the final configuration with validation
   * @returns Complete EfficiencyConfig instance
   * @throws Error if configuration is invalid
   */
  build(): EfficiencyConfig {
    this.validateWeightsSum();
    
    return {
      volumeWeight: this.config.volumeWeight || 0.4,
      liquidityWeight: this.config.liquidityWeight || 0.3,
      tvlWeight: this.config.tvlWeight || 0.3,
      volumeNormalizationFactor: this.config.volumeNormalizationFactor || 1000000,
      liquidityNormalizationFactor: this.config.liquidityNormalizationFactor || 1000000,
      volatilityAdjustment: this.config.volatilityAdjustment || 0.1,
      correlationAdjustment: this.config.correlationAdjustment || 0.05,
      timeWindow: this.config.timeWindow || 24 * 60 * 60 * 1000, // 24 hours
      decayFactor: this.config.decayFactor || 0.95
    };
  }

  /**
   * Validate that a weight is between 0 and 1
   * @param weight Weight value to validate
   * @throws Error if weight is invalid
   */
  private validateWeight(weight: number): void {
    if (typeof weight !== 'number' || isNaN(weight)) {
      throw new Error('Weight must be a valid number');
    }
    if (weight < 0 || weight > 1) {
      throw new Error('Weight must be between 0 and 1');
    }
  }

  /**
   * Validate that a number is positive
   * @param value Number to validate
   * @param name Name of the parameter for error messages
   * @throws Error if number is invalid
   */
  private validatePositiveNumber(value: number, name: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${name} must be a valid number`);
    }
    if (value <= 0) {
      throw new Error(`${name} must be positive`);
    }
  }

  /**
   * Validate that an adjustment factor is between 0 and 1
   * @param factor Factor to validate
   * @param name Name of the parameter for error messages
   * @throws Error if factor is invalid
   */
  private validateAdjustmentFactor(factor: number, name: string): void {
    if (typeof factor !== 'number' || isNaN(factor)) {
      throw new Error(`${name} must be a valid number`);
    }
    if (factor < 0 || factor > 1) {
      throw new Error(`${name} must be between 0 and 1`);
    }
  }

  /**
   * Validate that a decay factor is between 0 and 1
   * @param factor Decay factor to validate
   * @throws Error if factor is invalid
   */
  private validateDecayFactor(factor: number): void {
    if (typeof factor !== 'number' || isNaN(factor)) {
      throw new Error('Decay factor must be a valid number');
    }
    if (factor < 0 || factor > 1) {
      throw new Error('Decay factor must be between 0 and 1');
    }
  }

  /**
   * Validate that the sum of weights equals 1.0
   * @throws Error if weights don't sum to 1.0
   */
  private validateWeightsSum(): void {
    const volumeWeight = this.config.volumeWeight || 0.4;
    const liquidityWeight = this.config.liquidityWeight || 0.3;
    const tvlWeight = this.config.tvlWeight || 0.3;
    
    const sum = volumeWeight + liquidityWeight + tvlWeight;
    const tolerance = 1e-10; // Allow for floating point precision
    
    if (Math.abs(sum - 1.0) > tolerance) {
      throw new Error(`Weights must sum to 1.0, got ${sum}`);
    }
  }
}
