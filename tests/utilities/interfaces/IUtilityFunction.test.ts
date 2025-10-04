/**
 * Tests for IUtilityFunction interface
 */

import { IUtilityFunction, ValidationResult } from '../../../src/utilities/interfaces/IUtilityFunction';

/**
 * Mock implementation of IUtilityFunction for testing
 */
class MockUtilityFunction implements IUtilityFunction {
  private parameters: any = {};
  private functionType: string = 'mock';

  evaluate(userPosition: any, poolState: any, parameters: any): number {
    // Simple mock implementation
    return 1.0;
  }

  setParameters(parameters: any): void {
    this.parameters = parameters;
  }

  getParameters(): any {
    return this.parameters;
  }

  validateParameters(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }

  validateConstraints(userPosition: any, poolState: any): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }

  getFunctionType(): string {
    return this.functionType;
  }

  getRequiredPoolFeatures(): string[] {
    return ['basic_pool'];
  }

  isCompatibleWithPool(poolAddress: string): boolean {
    return true;
  }
}

describe('IUtilityFunction', () => {
  let utilityFunction: IUtilityFunction;

  beforeEach(() => {
    utilityFunction = new MockUtilityFunction();
  });

  describe('evaluate', () => {
    it('should return a number', () => {
      const result = utilityFunction.evaluate({}, {}, {});
      expect(typeof result).toBe('number');
    });

    it('should handle different input types', () => {
      const userPosition = { userId: 'test' };
      const poolState = { poolAddress: '0x123' };
      const parameters = { riskAversion: 1.0 };

      const result = utilityFunction.evaluate(userPosition, poolState, parameters);
      expect(result).toBe(1.0);
    });
  });

  describe('parameter management', () => {
    it('should set and get parameters', () => {
      const testParams = { riskAversion: 2.0, timeDiscount: 0.95 };
      
      utilityFunction.setParameters(testParams);
      const retrievedParams = utilityFunction.getParameters();
      
      expect(retrievedParams).toEqual(testParams);
    });
  });

  describe('validation', () => {
    it('should validate parameters', () => {
      const result = utilityFunction.validateParameters();
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should validate constraints', () => {
      const result = utilityFunction.validateConstraints({}, {});
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should return function type', () => {
      const functionType = utilityFunction.getFunctionType();
      expect(typeof functionType).toBe('string');
    });

    it('should return required pool features', () => {
      const features = utilityFunction.getRequiredPoolFeatures();
      expect(Array.isArray(features)).toBe(true);
    });

    it('should check pool compatibility', () => {
      const isCompatible = utilityFunction.isCompatibleWithPool('0x123');
      expect(typeof isCompatible).toBe('boolean');
    });
  });
});
