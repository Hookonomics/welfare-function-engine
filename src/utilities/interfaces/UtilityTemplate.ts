/**
 * Interface for utility function templates
 */

import { IUtilityFunction, ValidationResult } from './IUtilityFunction';

/**
 * Parameter constraints interface
 */
export interface ParameterConstraints {
  validate(value: any): boolean;
  getErrorMessage(): string;
}

/**
 * Variable metadata interface
 */
export interface VariableMetadata {
  /** Description */
  description: string;
  
  /** Units */
  units: string;
  
  /** Category */
  category: string;
  
  /** Tags */
  tags: string[];
  
  /** Author */
  author: string;
  
  /** Version */
  version: string;
  
  /** Last updated */
  lastUpdated: number;
}

/**
 * Caching configuration interface
 */
export interface CachingConfig {
  /** Enable caching */
  enabled: boolean;
  
  /** Cache duration (seconds) */
  duration: number;
  
  /** Cache key function */
  keyFunction: (poolState: any, userPosition: any) => string;
  
  /** Cache invalidation */
  invalidation: CacheInvalidation;
}

/**
 * Cache invalidation configuration interface
 */
export interface CacheInvalidation {
  /** Invalidation triggers */
  triggers: string[];
  
  /** Invalidation function */
  function: (poolState: any, userPosition: any) => boolean;
}

/**
 * Performance requirements interface
 */
export interface PerformanceRequirements {
  /** Maximum calculation time (ms) */
  maxCalculationTime: number;
  
  /** Maximum memory usage (MB) */
  maxMemoryUsage: number;
  
  /** Cache hit ratio target */
  cacheHitRatioTarget: number;
}

/**
 * Interface for utility function templates
 */
export interface UtilityTemplate {
  /** Template identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Default parameters */
  defaultParameters: any;
  
  /** Parameter constraints */
  parameterConstraints: ParameterConstraints;
  
  /** Creates a utility function instance */
  createInstance(parameters?: Partial<any>): IUtilityFunction;
  
  /** Validates template parameters */
  validateParameters(parameters: any): ValidationResult;
}
