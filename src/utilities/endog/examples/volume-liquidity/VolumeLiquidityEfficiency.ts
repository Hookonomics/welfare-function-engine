/**
 * Volume-to-Liquidity Efficiency Implementation
 * 
 * Main implementation of the Volume-to-Liquidity efficiency calculation
 * with determinant calculation and efficiency formula.
 */

import { PoolState } from '../../../types/PoolState';
import { 
  VolumeLiquidityEfficiency,
  VolumeLiquidityDeterminants,
  EfficiencyConfig
} from './types';
import { PreferenceOrderingMethodsImpl } from './PreferenceOrderingMethods';
import { ValidationMethodsImpl } from './ValidationMethods';

export class VolumeLiquidityEfficiencyImpl<T extends string = string> implements VolumeLiquidityEfficiency<T> {
  public efficiency: number;
  public determinants: VolumeLiquidityDeterminants<T>;
  public preferenceOrdering: PreferenceOrderingMethodsImpl<T>;
  public validation: ValidationMethodsImpl<T>;
  public config: EfficiencyConfig;

  constructor(
    private poolState: PoolState<T>,
    config: EfficiencyConfig
  ) {
    this.config = config;
    this.determinants = this.calculateDeterminants();
    this.efficiency = this.calculateEfficiency();
    this.preferenceOrdering = new PreferenceOrderingMethodsImpl<T>(this);
    this.validation = new ValidationMethodsImpl<T>(this);
  }

  /**
   * Calculate all determinants from pool state
   * @returns Calculated determinants
   */
  private calculateDeterminants(): VolumeLiquidityDeterminants<T> {
    const volumeUSD = parseFloat(this.poolState.volumeUSD);
    const totalValueLockedUSD = parseFloat(this.poolState.totalValueLockedUSD);
    const liquidity = parseFloat(this.poolState.liquidity);

    // Primary determinants (direct from pool state)
    const primaryDeterminants = {
      volumeUSD: this.poolState.volumeUSD,
      totalValueLockedUSD: this.poolState.totalValueLockedUSD,
      liquidity: this.poolState.liquidity
    };

    // Derived determinants (calculated from primary)
    const volumeLiquidityRatio = liquidity > 0 ? volumeUSD / liquidity : 0;
    const tvlLiquidityRatio = liquidity > 0 ? totalValueLockedUSD / liquidity : 0;
    const volumeTVLRatio = totalValueLockedUSD > 0 ? volumeUSD / totalValueLockedUSD : 0;

    // TODO: Fetch volumeGrowthRate from subgraph historical data
    const volumeGrowthRate = 0;
    
    // TODO: Fetch liquidityGrowthRate from subgraph historical data
    const liquidityGrowthRate = 0;
    
    // TODO: Calculate efficiencyTrend from subgraph historical data
    const efficiencyTrend = 0;

    // Risk-adjusted determinants
    const riskAdjustedVolume = volumeUSD * (1 - this.config.volatilityAdjustment);
    const riskAdjustedLiquidity = liquidity * (1 - this.config.correlationAdjustment);
    
    // Calculate stability factor (simplified - would need price data from subgraph)
    const stabilityFactor = this.calculateStabilityFactor();

    return {
      ...primaryDeterminants,
      volumeLiquidityRatio,
      tvlLiquidityRatio,
      volumeTVLRatio,
      volumeGrowthRate,
      liquidityGrowthRate,
      efficiencyTrend,
      riskAdjustedVolume,
      riskAdjustedLiquidity,
      stabilityFactor
    };
  }

  /**
   * Calculate efficiency using weighted sum formula
   * @returns Calculated efficiency value
   */
  private calculateEfficiency(): number {
    const { determinants, config } = this;
    
    // Apply normalization
    const normalizedVolume = determinants.volumeLiquidityRatio / config.volumeNormalizationFactor;
    const normalizedLiquidity = determinants.tvlLiquidityRatio / config.liquidityNormalizationFactor;
    
    // Calculate weighted sum
    const efficiency = (
      config.volumeWeight * normalizedVolume +
      config.liquidityWeight * normalizedLiquidity +
      config.tvlWeight * determinants.volumeTVLRatio
    );

    // Ensure efficiency is finite and non-negative
    if (!isFinite(efficiency)) {
      throw new Error('Efficiency calculation resulted in infinite value');
    }

    return Math.max(0, efficiency); // Ensure non-negative
  }

  /**
   * Calculate stability factor (simplified implementation)
   * In a real implementation, this would use historical price data from subgraph
   * @returns Stability factor (0-1)
   */
  private calculateStabilityFactor(): number {
    // Simplified stability calculation
    // In practice, this would analyze price volatility from subgraph data
    const volumeUSD = parseFloat(this.poolState.volumeUSD);
    const totalValueLockedUSD = parseFloat(this.poolState.totalValueLockedUSD);
    
    if (totalValueLockedUSD === 0) {
      return 0;
    }
    
    // Simple stability metric based on volume/TVL ratio
    const volumeTVLRatio = volumeUSD / totalValueLockedUSD;
    
    // Higher ratio suggests more stable trading
    // Normalize to 0-1 range
    return Math.min(1, volumeTVLRatio / 10); // Assume 10 is a high ratio
  }

  /**
   * Get the pool state used for this efficiency calculation
   * @returns Pool state instance
   */
  public getPoolState(): PoolState<T> {
    return this.poolState;
  }

  /**
   * Recalculate efficiency with new configuration
   * @param newConfig New configuration to use
   * @returns New efficiency instance
   */
  public withConfig(newConfig: EfficiencyConfig): VolumeLiquidityEfficiencyImpl<T> {
    return new VolumeLiquidityEfficiencyImpl<T>(this.poolState, newConfig);
  }

  /**
   * Get efficiency value as percentage
   * @returns Efficiency as percentage (0-100)
   */
  public getEfficiencyPercentage(): number {
    return this.efficiency * 100;
  }

  /**
   * Get efficiency category based on value
   * @returns Efficiency category string
   */
  public getEfficiencyCategory(): string {
    if (this.efficiency < 0.1) {
      return 'Very Low';
    } else if (this.efficiency < 0.3) {
      return 'Low';
    } else if (this.efficiency < 0.6) {
      return 'Medium';
    } else if (this.efficiency < 0.8) {
      return 'High';
    } else {
      return 'Very High';
    }
  }

  /**
   * Get detailed efficiency breakdown
   * @returns Object with efficiency components
   */
  public getEfficiencyBreakdown(): {
    volumeComponent: number;
    liquidityComponent: number;
    tvlComponent: number;
    total: number;
  } {
    const { determinants, config } = this;
    
    const normalizedVolume = determinants.volumeLiquidityRatio / config.volumeNormalizationFactor;
    const normalizedLiquidity = determinants.tvlLiquidityRatio / config.liquidityNormalizationFactor;
    
    const volumeComponent = config.volumeWeight * normalizedVolume;
    const liquidityComponent = config.liquidityWeight * normalizedLiquidity;
    const tvlComponent = config.tvlWeight * determinants.volumeTVLRatio;
    
    return {
      volumeComponent,
      liquidityComponent,
      tvlComponent,
      total: volumeComponent + liquidityComponent + tvlComponent
    };
  }

  /**
   * Check if efficiency is valid
   * @returns true if efficiency is valid
   */
  public isValid(): boolean {
    return isFinite(this.efficiency) && this.efficiency >= 0;
  }

  /**
   * Get efficiency summary
   * @returns Summary object with key metrics
   */
  public getSummary(): {
    efficiency: number;
    category: string;
    percentage: number;
    isValid: boolean;
    poolId: T;
    breakdown: ReturnType<VolumeLiquidityEfficiencyImpl<T>['getEfficiencyBreakdown']>;
  } {
    return {
      efficiency: this.efficiency,
      category: this.getEfficiencyCategory(),
      percentage: this.getEfficiencyPercentage(),
      isValid: this.isValid(),
      poolId: this.poolState.poolId,
      breakdown: this.getEfficiencyBreakdown()
    };
  }
}
