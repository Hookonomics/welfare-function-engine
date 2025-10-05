/**
 * Preference Ordering Methods Implementation
 * 
 * Implements mathematical preference ordering properties for Volume-to-Liquidity efficiency.
 * Ensures reflexivity, transitivity, completeness, and antisymmetry.
 */

import { 
  ComparisonResult, 
  PreferenceOrderingMethods, 
  VolumeLiquidityEfficiency 
} from './types';

export class PreferenceOrderingMethodsImpl<T extends string = string> implements PreferenceOrderingMethods<T> {
  constructor(private efficiency: VolumeLiquidityEfficiency<T>) {}

  /**
   * Check if preference ordering is well-defined
   * Verifies reflexivity, transitivity, completeness, and antisymmetry
   * @returns true if all properties hold
   */
  hasPreferenceOrdering(): boolean {
    return this.checkReflexivity() && 
           this.checkTransitivity() && 
           this.checkCompleteness() && 
           this.checkAntisymmetry();
  }

  /**
   * Compare two efficiency values
   * @param other Other efficiency to compare with
   * @returns Comparison result
   */
  compare(other: VolumeLiquidityEfficiency<T>): ComparisonResult {
    if (this.efficiency.efficiency > other.efficiency) {
      return ComparisonResult.GREATER;
    } else if (this.efficiency.efficiency < other.efficiency) {
      return ComparisonResult.LESS;
    } else {
      return ComparisonResult.EQUAL;
    }
  }

  /**
   * Check transitivity property: if A≥B and B≥C, then A≥C
   * @param a First efficiency
   * @param b Second efficiency  
   * @param c Third efficiency
   * @returns true if transitivity holds
   */
  isTransitive(a: VolumeLiquidityEfficiency<T>, b: VolumeLiquidityEfficiency<T>, c: VolumeLiquidityEfficiency<T>): boolean {
    const aToB = this.compareEfficiencies(a, b);
    const bToC = this.compareEfficiencies(b, c);
    const aToC = this.compareEfficiencies(a, c);

    // If A≥B and B≥C, then A≥C
    if (aToB !== ComparisonResult.LESS && bToC !== ComparisonResult.LESS) {
      return aToC !== ComparisonResult.LESS;
    }

    return true; // Transitivity holds vacuously
  }

  /**
   * Check completeness property: for any A,B, either A≥B or B≥A
   * @param other Other efficiency to compare with
   * @returns true if completeness holds
   */
  isComplete(other: VolumeLiquidityEfficiency<T>): boolean {
    const comparison = this.compare(other);
    return comparison !== ComparisonResult.INCOMPARABLE;
  }

  /**
   * Get preference ranking among a list of efficiencies
   * @param others Array of other efficiencies to rank against
   * @returns Ranking position (1-based)
   */
  getPreferenceRank(others: VolumeLiquidityEfficiency<T>[]): number {
    const allEfficiencies = [...others, this.efficiency];
    const sorted = allEfficiencies.sort((a, b) => b.efficiency - a.efficiency);
    return sorted.indexOf(this.efficiency) + 1;
  }

  /**
   * Check reflexivity: A ≥ A for all A
   * @returns true if reflexivity holds
   */
  private checkReflexivity(): boolean {
    const selfComparison = this.compare(this.efficiency);
    return selfComparison === ComparisonResult.EQUAL || selfComparison === ComparisonResult.GREATER;
  }

  /**
   * Check transitivity with sample data
   * @returns true if transitivity holds for sample cases
   */
  private checkTransitivity(): boolean {
    // Test with sample efficiencies to verify transitivity
    const sampleEfficiencies = this.generateSampleEfficiencies();
    
    for (let i = 0; i < sampleEfficiencies.length - 2; i++) {
      const a = sampleEfficiencies[i]!;
      const b = sampleEfficiencies[i + 1]!;
      const c = sampleEfficiencies[i + 2]!;
      
      if (!this.isTransitive(a, b, c)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check completeness with sample data
   * @returns true if completeness holds for sample cases
   */
  private checkCompleteness(): boolean {
    const sampleEfficiencies = this.generateSampleEfficiencies();
    
    for (const other of sampleEfficiencies) {
      if (!this.isComplete(other)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check antisymmetry: if A≥B and B≥A, then A=B
   * @returns true if antisymmetry holds
   */
  private checkAntisymmetry(): boolean {
    const sampleEfficiencies = this.generateSampleEfficiencies();
    
    for (const other of sampleEfficiencies) {
      const aToB = this.compareEfficiencies(this.efficiency, other);
      const bToA = this.compareEfficiencies(other, this.efficiency);
      
      // If A≥B and B≥A, then A=B
      if (aToB !== ComparisonResult.LESS && bToA !== ComparisonResult.LESS) {
        if (Math.abs(this.efficiency.efficiency - other.efficiency) > 1e-10) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Compare two efficiency values (helper method)
   * @param a First efficiency
   * @param b Second efficiency
   * @returns Comparison result
   */
  private compareEfficiencies(a: VolumeLiquidityEfficiency<T>, b: VolumeLiquidityEfficiency<T>): ComparisonResult {
    if (a.efficiency > b.efficiency) {
      return ComparisonResult.GREATER;
    } else if (a.efficiency < b.efficiency) {
      return ComparisonResult.LESS;
    } else {
      return ComparisonResult.EQUAL;
    }
  }

  /**
   * Generate sample efficiencies for testing mathematical properties
   * @returns Array of sample efficiency instances
   */
  private generateSampleEfficiencies(): VolumeLiquidityEfficiency<T>[] {
    // Create sample efficiencies with different values
    const sampleValues = [0.1, 0.5, 0.8, 1.0, 1.2, 2.0];
    const sampleEfficiencies: VolumeLiquidityEfficiency<T>[] = [];
    
    for (const value of sampleValues) {
      const sampleEfficiency = this.createSampleEfficiency(value);
      sampleEfficiencies.push(sampleEfficiency);
    }
    
    return sampleEfficiencies;
  }

  /**
   * Create a sample efficiency with given value
   * @param efficiencyValue Efficiency value
   * @returns Sample efficiency instance
   */
  private createSampleEfficiency(efficiencyValue: number): VolumeLiquidityEfficiency<T> {
    // Create a mock efficiency with the given value
    // This is a simplified version for testing purposes
    return {
      efficiency: efficiencyValue,
      determinants: {
        volumeUSD: '1000000',
        totalValueLockedUSD: '1000000',
        liquidity: '1000000',
        volumeLiquidityRatio: 1.0,
        tvlLiquidityRatio: 1.0,
        volumeTVLRatio: 1.0,
        volumeGrowthRate: 0,
        liquidityGrowthRate: 0,
        efficiencyTrend: 0,
        riskAdjustedVolume: 900000,
        riskAdjustedLiquidity: 950000,
        stabilityFactor: 1.0
      },
      preferenceOrdering: this,
      validation: {} as any, // Mock validation for testing
      config: this.efficiency.config
    } as VolumeLiquidityEfficiency<T>;
  }
}
