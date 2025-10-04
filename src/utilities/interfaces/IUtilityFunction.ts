/**
 * Core interface for all utility functions
 * Provides mathematical compliance and pool safety guarantees
 */

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Core interface for all utility functions
 */
export interface IUtilityFunction {
  /**
   * Evaluates the utility function for a given user position and pool state
   * @param userPosition - User's position in the pool
   * @param poolState - Current state of the pool
   * @param parameters - Utility function parameters
   * @returns Calculated utility value
   * @throws ValidationError if parameters are invalid
   * @throws MathematicalError if calculation fails
   */
  evaluate(
    userPosition: any, // UserPosition type will be defined later
    poolState: any,    // PoolState type will be defined later
    parameters: any    // UtilityParameters type will be defined later
  ): number;

  /**
   * Sets the utility function parameters
   * @param parameters - Parameters to set
   * @throws ValidationError if parameters are invalid
   */
  setParameters(parameters: any): void;

  /**
   * Gets the current utility function parameters
   * @returns Current parameters
   */
  getParameters(): any;

  /**
   * Validates the current parameters
   * @returns Validation result with errors and suggestions
   */
  validateParameters(): ValidationResult;

  /**
   * Validates constraints for a given user position and pool state
   * @param userPosition - User's position in the pool
   * @param poolState - Current state of the pool
   * @returns Validation result with errors and suggestions
   */
  validateConstraints(
    userPosition: any,
    poolState: any
  ): ValidationResult;

  /**
   * Gets the function type identifier
   * @returns Function type string
   */
  getFunctionType(): string;

  /**
   * Gets the required pool features for this utility function
   * @returns Array of required pool features
   */
  getRequiredPoolFeatures(): string[];

  /**
   * Checks if this utility function is compatible with a pool
   * @param poolAddress - Address of the pool to check
   * @returns True if compatible, false otherwise
   */
  isCompatibleWithPool(poolAddress: string): boolean;
}
