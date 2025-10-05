/**
 * Event Processing Type Definitions
 * 
 * Defines types for event processing, error handling, and event lifecycle management.
 */

import { PoolInfo } from './PoolManagerTypes';
import { InitializeEvent } from './PoolManagerTypes';
import { EndogenousVariableSubscription } from './SubscriptionTypes';

/**
 * Event processing status
 */
export enum EventProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

/**
 * Event processing context
 */
export interface EventProcessingContext {
  eventId: string;
  status: EventProcessingStatus;
  startTime: number;
  endTime?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  processingTime: number;
  poolInfo?: PoolInfo;
  matchingSubscriptions?: EndogenousVariableSubscription[];
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Event batch processing result
 */
export interface EventBatchResult {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  processingTime: number;
  results: EventProcessingResult[];
  errors: string[];
}

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  poolManagerAddress: string;
  chainId: number;
  rpcUrl: string;
  startBlock?: number;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  confirmations?: number;
  timeout?: number;
}

/**
 * Event processing error
 */
export interface EventProcessingError {
  code: string;
  message: string;
  eventId: string;
  timestamp: number;
  retryable: boolean;
  context?: Record<string, any>;
}

/**
 * Event processing metrics
 */
export interface EventProcessingMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  eventsPerSecond: number;
  errorRate: number;
  retryRate: number;
}

/**
 * Event processing queue item
 */
export interface EventQueueItem {
  event: InitializeEvent;
  context: EventProcessingContext;
  priority: number;
  scheduledAt: number;
}

/**
 * Event processing retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Event processing filter
 */
export interface EventFilter {
  currency0?: string;
  currency1?: string;
  hooks?: string[];
  fee?: number;
  tickSpacing?: number;
  blockRange?: {
    from: number;
    to: number;
  };
  timeRange?: {
    from: number;
    to: number;
  };
}

/**
 * Event processing statistics
 */
export interface EventProcessingStats {
  totalProcessed: number;
  successRate: number;
  averageLatency: number;
  peakThroughput: number;
  errorBreakdown: Map<string, number>;
  retryBreakdown: Map<number, number>;
}

/**
 * Event processing health check
 */
export interface EventProcessingHealth {
  isHealthy: boolean;
  status: EventProcessingStatus;
  lastProcessedEvent?: string;
  lastProcessedTime?: number;
  queueSize: number;
  errorCount: number;
  warnings: string[];
}

/**
 * Create event processing context
 */
export function createEventContext(
  eventId: string,
  maxRetries: number = 3
): EventProcessingContext {
  return {
    eventId,
    status: EventProcessingStatus.PENDING,
    startTime: Date.now(),
    retryCount: 0,
    maxRetries
  };
}

/**
 * Create event processing result
 */
export function createEventResult(
  success: boolean,
  eventId: string,
  processingTime: number,
  poolInfo?: PoolInfo,
  matchingSubscriptions?: EndogenousVariableSubscription[],
  error?: string
): EventProcessingResult {
  return {
    success,
    eventId,
    processingTime,
    poolInfo,
    matchingSubscriptions,
    error
  };
}

/**
 * Create event processing error
 */
export function createEventError(
  code: string,
  message: string,
  eventId: string,
  retryable: boolean = true,
  context?: Record<string, any>
): EventProcessingError {
  return {
    code,
    message,
    eventId,
    timestamp: Date.now(),
    retryable,
    context
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: EventProcessingError): boolean {
  return error.retryable;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  backoffMultiplier: number = 2
): number {
  const delay = baseDelay * Math.pow(backoffMultiplier, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * Check if event should be processed
 */
export function shouldProcessEvent(
  event: InitializeEvent,
  filter?: EventFilter
): boolean {
  if (!filter) return true;

  // Currency filter
  if (filter.currency0 && event.currency0 !== filter.currency0) return false;
  if (filter.currency1 && event.currency1 !== filter.currency1) return false;

  // Hooks filter
  if (filter.hooks && !filter.hooks.includes(event.hooks)) return false;

  // Fee filter
  if (filter.fee !== undefined && event.fee !== filter.fee) return false;

  // Tick spacing filter
  if (filter.tickSpacing !== undefined && event.tickSpacing !== filter.tickSpacing) return false;

  // Block range filter
  if (filter.blockRange) {
    if (event.blockNumber < filter.blockRange.from || event.blockNumber > filter.blockRange.to) {
      return false;
    }
  }

  // Time range filter
  if (filter.timeRange) {
    if (event.timestamp < filter.timeRange.from || event.timestamp > filter.timeRange.to) {
      return false;
    }
  }

  return true;
}

/**
 * Generate unique event ID
 */
export function generateEventId(event: InitializeEvent): string {
  return `evt_${event.blockNumber}_${event.transactionHash}_${event.id}`;
}

/**
 * Create default retry policy
 */
export function createDefaultRetryPolicy(): RetryPolicy {
  return {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'TEMPORARY_FAILURE'
    ]
  };
}
