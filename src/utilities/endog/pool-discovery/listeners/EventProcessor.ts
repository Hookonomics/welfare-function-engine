/**
 * Event Processor
 * 
 * Processes Initialize events with error handling, retry logic, and metrics.
 * Provides a robust event processing pipeline for pool discovery.
 */

import { InitializeEvent, EventProcessingResult, EventProcessingContext } from '../types/EventTypes';
import { PoolDiscoveryService } from '../core/PoolDiscoveryService';

/**
 * Process Initialize events
 */
export class EventProcessor {
  private processingMetrics: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    totalProcessingTime: number;
  };

  constructor(private discoveryService: PoolDiscoveryService) {
    this.processingMetrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      totalProcessingTime: 0
    };
  }

  /**
   * Process a single Initialize event
   * 
   * @param event Initialize event to process
   * @returns Processing result
   */
  async processEvent(event: InitializeEvent): Promise<EventProcessingResult> {
    const startTime = Date.now();
    const eventId = this.generateEventId(event);
    
    try {
      // Process event through discovery service
      const result = await this.discoveryService.processInitializeEvent(event);
      
      const processingTime = Date.now() - startTime;
      
      // Update metrics
      this.processingMetrics.totalEvents++;
      this.processingMetrics.successfulEvents++;
      this.processingMetrics.totalProcessingTime += processingTime;
      
      return {
        success: true,
        eventId,
        processingTime,
        poolInfo: result?.poolInfo,
        matchingSubscriptions: result?.matchingSubscriptions,
        metadata: {
          poolId: event.id,
          currency0: event.currency0,
          currency1: event.currency1,
          hooks: event.hooks
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update metrics
      this.processingMetrics.totalEvents++;
      this.processingMetrics.failedEvents++;
      this.processingMetrics.totalProcessingTime += processingTime;
      
      return {
        success: false,
        eventId,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          poolId: event.id,
          currency0: event.currency0,
          currency1: event.currency1,
          hooks: event.hooks
        }
      };
    }
  }

  /**
   * Process multiple events in batch
   * 
   * @param events Array of Initialize events
   * @returns Batch processing result
   */
  async processEventsBatch(events: InitializeEvent[]): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    processingTime: number;
    results: EventProcessingResult[];
    errors: string[];
  }> {
    const startTime = Date.now();
    const results: EventProcessingResult[] = [];
    const errors: string[] = [];
    
    for (const event of events) {
      try {
        const result = await this.processEvent(event);
        results.push(result);
        
        if (!result.success) {
          errors.push(`Event ${result.eventId}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Event ${event.id}: ${errorMessage}`);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      totalEvents: events.length,
      successfulEvents: results.filter(r => r.success).length,
      failedEvents: results.filter(r => !r.success).length,
      processingTime,
      results,
      errors
    };
  }

  /**
   * Process events with retry logic
   * 
   * @param event Initialize event to process
   * @param maxRetries Maximum number of retries
   * @param retryDelay Delay between retries in milliseconds
   * @returns Processing result
   */
  async processEventWithRetry(
    event: InitializeEvent,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<EventProcessingResult> {
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount < maxRetries) {
      try {
        const result = await this.processEvent(event);
        if (result.success) {
          return result;
        }
        
        // If processing failed but didn't throw, check if it's retryable
        if (result.error && this.isRetryableError(result.error)) {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
            continue;
          }
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        }
      }
    }
    
    // All retries failed
    const processingTime = Date.now() - Date.now(); // This will be 0, but we need the structure
    return {
      success: false,
      eventId: this.generateEventId(event),
      processingTime,
      error: lastError?.message || 'Max retries exceeded',
      metadata: {
        poolId: event.id,
        currency0: event.currency0,
        currency1: event.currency1,
        hooks: event.hooks,
        retryCount
      }
    };
  }

  /**
   * Get processing metrics
   * 
   * @returns Current processing metrics
   */
  getMetrics(): {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    successRate: number;
    averageProcessingTime: number;
    eventsPerSecond: number;
  } {
    const successRate = this.processingMetrics.totalEvents > 0 
      ? this.processingMetrics.successfulEvents / this.processingMetrics.totalEvents 
      : 0;
    
    const averageProcessingTime = this.processingMetrics.totalEvents > 0
      ? this.processingMetrics.totalProcessingTime / this.processingMetrics.totalEvents
      : 0;
    
    const eventsPerSecond = averageProcessingTime > 0 
      ? 1000 / averageProcessingTime 
      : 0;
    
    return {
      totalEvents: this.processingMetrics.totalEvents,
      successfulEvents: this.processingMetrics.successfulEvents,
      failedEvents: this.processingMetrics.failedEvents,
      successRate,
      averageProcessingTime,
      eventsPerSecond
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.processingMetrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      totalProcessingTime: 0
    };
  }

  /**
   * Generate unique event ID
   * 
   * @param event Initialize event
   * @returns Unique event ID
   */
  private generateEventId(event: InitializeEvent): string {
    return `evt_${event.blockNumber}_${event.transactionHash}_${event.id}`;
  }

  /**
   * Check if error is retryable
   * 
   * @param error Error message
   * @returns True if error is retryable
   */
  private isRetryableError(error: string): boolean {
    const retryableErrors = [
      'network',
      'timeout',
      'rate limit',
      'temporary',
      'connection',
      'rpc'
    ];
    
    return retryableErrors.some(retryableError => 
      error.toLowerCase().includes(retryableError)
    );
  }

  /**
   * Validate event before processing
   * 
   * @param event Initialize event to validate
   * @returns True if event is valid
   */
  private validateEvent(event: InitializeEvent): boolean {
    try {
      // Check required fields
      if (!event.id || !event.currency0 || !event.currency1 || !event.hooks) {
        return false;
      }

      // Check block number
      if (event.blockNumber <= 0) {
        return false;
      }

      // Check timestamp
      if (event.timestamp <= 0) {
        return false;
      }

      // Check transaction hash
      if (!event.transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(event.transactionHash)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process event with validation
   * 
   * @param event Initialize event to process
   * @returns Processing result
   */
  async processEventWithValidation(event: InitializeEvent): Promise<EventProcessingResult> {
    if (!this.validateEvent(event)) {
      return {
        success: false,
        eventId: this.generateEventId(event),
        processingTime: 0,
        error: 'Invalid event data',
        metadata: {
          poolId: event.id,
          currency0: event.currency0,
          currency1: event.currency1,
          hooks: event.hooks
        }
      };
    }

    return this.processEvent(event);
  }

  /**
   * Get processing health status
   * 
   * @returns Health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    metrics: ReturnType<typeof this.getMetrics>;
    warnings: string[];
  } {
    const metrics = this.getMetrics();
    const warnings: string[] = [];
    
    // Check success rate
    if (metrics.successRate < 0.9) {
      warnings.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    }
    
    // Check processing time
    if (metrics.averageProcessingTime > 5000) {
      warnings.push(`High average processing time: ${metrics.averageProcessingTime.toFixed(0)}ms`);
    }
    
    // Check events per second
    if (metrics.eventsPerSecond < 0.1) {
      warnings.push(`Low throughput: ${metrics.eventsPerSecond.toFixed(2)} events/second`);
    }
    
    const isHealthy = warnings.length === 0;
    
    return {
      isHealthy,
      metrics,
      warnings
    };
  }
}
