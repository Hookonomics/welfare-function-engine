/**
 * Unit Tests for EfficiencyConfigBuilder
 * 
 * Tests the builder pattern implementation with fluent API and validation.
 */

import { EfficiencyConfigBuilderImpl } from '../../../../src/utilities/endog/volume-liquidity/EfficiencyConfigBuilder';
import { createMockConfig } from './fixtures';

describe('EfficiencyConfigBuilderImpl', () => {
  let builder: EfficiencyConfigBuilderImpl<string>;

  beforeEach(() => {
    builder = new EfficiencyConfigBuilderImpl<string>();
  });

  describe('Fluent API', () => {
    it('should support method chaining', () => {
      const result = builder
        .setVolumeWeight(0.4)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.3)
        .setVolumeNormalization(1000000)
        .setLiquidityNormalization(1000000)
        .setVolatilityAdjustment(0.1)
        .setCorrelationAdjustment(0.05)
        .setTimeWindow(24 * 60 * 60 * 1000)
        .setDecayFactor(0.95);

      expect(result).toBe(builder);
    });

    it('should build configuration with all methods called', () => {
      const config = builder
        .setVolumeWeight(0.5)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.2)
        .setVolumeNormalization(2000000)
        .setLiquidityNormalization(1500000)
        .setVolatilityAdjustment(0.15)
        .setCorrelationAdjustment(0.08)
        .setTimeWindow(48 * 60 * 60 * 1000)
        .setDecayFactor(0.90)
        .build();

      expect(config.volumeWeight).toBe(0.5);
      expect(config.liquidityWeight).toBe(0.3);
      expect(config.tvlWeight).toBe(0.2);
      expect(config.volumeNormalizationFactor).toBe(2000000);
      expect(config.liquidityNormalizationFactor).toBe(1500000);
      expect(config.volatilityAdjustment).toBe(0.15);
      expect(config.correlationAdjustment).toBe(0.08);
      expect(config.timeWindow).toBe(48 * 60 * 60 * 1000);
      expect(config.decayFactor).toBe(0.90);
    });
  });

  describe('Default Values', () => {
    it('should use default values when no methods are called', () => {
      const config = builder.build();

      expect(config.volumeWeight).toBe(0.4);
      expect(config.liquidityWeight).toBe(0.3);
      expect(config.tvlWeight).toBe(0.3);
      expect(config.volumeNormalizationFactor).toBe(1000000);
      expect(config.liquidityNormalizationFactor).toBe(1000000);
      expect(config.volatilityAdjustment).toBe(0.1);
      expect(config.correlationAdjustment).toBe(0.05);
      expect(config.timeWindow).toBe(24 * 60 * 60 * 1000);
      expect(config.decayFactor).toBe(0.95);
    });

    it('should use default values for unspecified parameters', () => {
      const config = builder
        .setVolumeWeight(0.6)
        .setLiquidityWeight(0.2)
        .setTVLWeight(0.2)
        .build();

      expect(config.volumeWeight).toBe(0.6);
      expect(config.liquidityWeight).toBe(0.2);
      expect(config.tvlWeight).toBe(0.2);
      expect(config.volumeNormalizationFactor).toBe(1000000); // Default
      expect(config.liquidityNormalizationFactor).toBe(1000000); // Default
      expect(config.volatilityAdjustment).toBe(0.1); // Default
      expect(config.correlationAdjustment).toBe(0.05); // Default
      expect(config.timeWindow).toBe(24 * 60 * 60 * 1000); // Default
      expect(config.decayFactor).toBe(0.95); // Default
    });
  });

  describe('Weight Validation', () => {
    it('should validate that weights sum to 1.0', () => {
      const config = builder
        .setVolumeWeight(0.4)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.3)
        .build();

      const sum = config.volumeWeight + config.liquidityWeight + config.tvlWeight;
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should throw error when weights do not sum to 1.0', () => {
      expect(() => {
        builder
          .setVolumeWeight(0.5)
          .setLiquidityWeight(0.3)
          .setTVLWeight(0.3) // Sum = 1.1
          .build();
      }).toThrow('Weights must sum to 1.0');
    });

    it('should allow floating point precision in weight sum', () => {
      const config = builder
        .setVolumeWeight(0.3333333333333333)
        .setLiquidityWeight(0.3333333333333333)
        .setTVLWeight(0.3333333333333334) // Sum = 1.0 with precision
        .build();

      const sum = config.volumeWeight + config.liquidityWeight + config.tvlWeight;
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('Parameter Validation', () => {
    describe('Weight Validation', () => {
      it('should accept valid weights', () => {
        expect(() => {
          builder.setVolumeWeight(0.5).setLiquidityWeight(0.3).setTVLWeight(0.2).build();
        }).not.toThrow();

        expect(() => {
          builder.setVolumeWeight(0.4).setLiquidityWeight(0.3).setTVLWeight(0.3).build();
        }).not.toThrow();

        expect(() => {
          builder.setVolumeWeight(0.6).setLiquidityWeight(0.2).setTVLWeight(0.2).build();
        }).not.toThrow();
      });

      it('should reject weights outside 0-1 range', () => {
        expect(() => {
          builder.setVolumeWeight(-0.1);
        }).toThrow('Weight must be between 0 and 1');

        expect(() => {
          builder.setVolumeWeight(1.1);
        }).toThrow('Weight must be between 0 and 1');

        expect(() => {
          builder.setLiquidityWeight(-0.1);
        }).toThrow('Weight must be between 0 and 1');

        expect(() => {
          builder.setTVLWeight(1.1);
        }).toThrow('Weight must be between 0 and 1');
      });

      it('should reject NaN weights', () => {
        expect(() => {
          builder.setVolumeWeight(NaN);
        }).toThrow('Weight must be a valid number');

        expect(() => {
          builder.setLiquidityWeight(NaN);
        }).toThrow('Weight must be a valid number');

        expect(() => {
          builder.setTVLWeight(NaN);
        }).toThrow('Weight must be a valid number');
      });

      it('should reject non-number weights', () => {
        expect(() => {
          builder.setVolumeWeight('0.5' as any);
        }).toThrow('Weight must be a valid number');
      });
    });

    describe('Normalization Factor Validation', () => {
      it('should accept positive normalization factors', () => {
        expect(() => {
          builder.setVolumeNormalization(1000000).build();
        }).not.toThrow();

        expect(() => {
          builder.setLiquidityNormalization(2000000).build();
        }).not.toThrow();
      });

      it('should reject zero normalization factors', () => {
        expect(() => {
          builder.setVolumeNormalization(0);
        }).toThrow('Volume normalization factor must be positive');

        expect(() => {
          builder.setLiquidityNormalization(0);
        }).toThrow('Liquidity normalization factor must be positive');
      });

      it('should reject negative normalization factors', () => {
        expect(() => {
          builder.setVolumeNormalization(-1000);
        }).toThrow('Volume normalization factor must be positive');

        expect(() => {
          builder.setLiquidityNormalization(-2000);
        }).toThrow('Liquidity normalization factor must be positive');
      });

      it('should reject NaN normalization factors', () => {
        expect(() => {
          builder.setVolumeNormalization(NaN);
        }).toThrow('Volume normalization factor must be a valid number');

        expect(() => {
          builder.setLiquidityNormalization(NaN);
        }).toThrow('Liquidity normalization factor must be a valid number');
      });
    });

    describe('Adjustment Factor Validation', () => {
      it('should accept valid adjustment factors', () => {
        expect(() => {
          builder.setVolatilityAdjustment(0.1).build();
        }).not.toThrow();

        expect(() => {
          builder.setCorrelationAdjustment(0.05).build();
        }).not.toThrow();
      });

      it('should reject adjustment factors outside 0-1 range', () => {
        expect(() => {
          builder.setVolatilityAdjustment(-0.1);
        }).toThrow('Volatility adjustment must be between 0 and 1');

        expect(() => {
          builder.setVolatilityAdjustment(1.1);
        }).toThrow('Volatility adjustment must be between 0 and 1');

        expect(() => {
          builder.setCorrelationAdjustment(-0.1);
        }).toThrow('Correlation adjustment must be between 0 and 1');

        expect(() => {
          builder.setCorrelationAdjustment(1.1);
        }).toThrow('Correlation adjustment must be between 0 and 1');
      });

      it('should accept boundary values', () => {
        expect(() => {
          builder.setVolatilityAdjustment(0).build();
        }).not.toThrow();

        expect(() => {
          builder.setVolatilityAdjustment(1).build();
        }).not.toThrow();

        expect(() => {
          builder.setCorrelationAdjustment(0).build();
        }).not.toThrow();

        expect(() => {
          builder.setCorrelationAdjustment(1).build();
        }).not.toThrow();
      });
    });

    describe('Time Window Validation', () => {
      it('should accept positive time windows', () => {
        expect(() => {
          builder.setTimeWindow(24 * 60 * 60 * 1000).build();
        }).not.toThrow();
      });

      it('should reject zero time window', () => {
        expect(() => {
          builder.setTimeWindow(0);
        }).toThrow('Time window must be positive');
      });

      it('should reject negative time window', () => {
        expect(() => {
          builder.setTimeWindow(-1000);
        }).toThrow('Time window must be positive');
      });
    });

    describe('Decay Factor Validation', () => {
      it('should accept valid decay factors', () => {
        expect(() => {
          builder.setDecayFactor(0.95).build();
        }).not.toThrow();
      });

      it('should reject decay factors outside 0-1 range', () => {
        expect(() => {
          builder.setDecayFactor(-0.1);
        }).toThrow('Decay factor must be between 0 and 1');

        expect(() => {
          builder.setDecayFactor(1.1);
        }).toThrow('Decay factor must be between 0 and 1');
      });

      it('should accept boundary values', () => {
        expect(() => {
          builder.setDecayFactor(0).build();
        }).not.toThrow();

        expect(() => {
          builder.setDecayFactor(1).build();
        }).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small weights', () => {
      const config = builder
        .setVolumeWeight(0.0001)
        .setLiquidityWeight(0.0001)
        .setTVLWeight(0.9998)
        .build();

      expect(config.volumeWeight).toBe(0.0001);
      expect(config.liquidityWeight).toBe(0.0001);
      expect(config.tvlWeight).toBe(0.9998);
    });

    it('should handle very large normalization factors', () => {
      const config = builder
        .setVolumeNormalization(Number.MAX_SAFE_INTEGER)
        .setLiquidityNormalization(Number.MAX_SAFE_INTEGER)
        .build();

      expect(config.volumeNormalizationFactor).toBe(Number.MAX_SAFE_INTEGER);
      expect(config.liquidityNormalizationFactor).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small normalization factors', () => {
      const config = builder
        .setVolumeNormalization(0.000001)
        .setLiquidityNormalization(0.000001)
        .build();

      expect(config.volumeNormalizationFactor).toBe(0.000001);
      expect(config.liquidityNormalizationFactor).toBe(0.000001);
    });
  });

  describe('Configuration Consistency', () => {
    it('should produce consistent configurations with same inputs', () => {
      const config1 = builder
        .setVolumeWeight(0.4)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.3)
        .build();

      const config2 = new EfficiencyConfigBuilderImpl<string>()
        .setVolumeWeight(0.4)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.3)
        .build();

      expect(config1).toEqual(config2);
    });

    it('should produce different configurations with different inputs', () => {
      const config1 = builder
        .setVolumeWeight(0.4)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.3)
        .build();

      const config2 = builder
        .setVolumeWeight(0.5)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.2)
        .build();

      expect(config1).not.toEqual(config2);
    });
  });

  describe('Builder Reusability', () => {
    it('should allow building multiple configurations from same builder', () => {
      builder.setVolumeWeight(0.4).setLiquidityWeight(0.3).setTVLWeight(0.3);
      
      const config1 = builder.build();
      const config2 = builder.build();

      expect(config1).toEqual(config2);
    });

    it('should allow modifying builder after build', () => {
      const config1 = builder
        .setVolumeWeight(0.4)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.3)
        .build();

      const config2 = builder
        .setVolumeWeight(0.5)
        .setLiquidityWeight(0.3)
        .setTVLWeight(0.2)
        .build();

      expect(config1.volumeWeight).toBe(0.4);
      expect(config2.volumeWeight).toBe(0.5);
    });
  });
});
