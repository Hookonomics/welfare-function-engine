/**
 * Pool Info Extractor
 * 
 * Extracts pool information from Initialize events and validates the data.
 * Handles conversion from event data to structured pool information.
 */

import { 
  InitializeEvent, 
  PoolInfo, 
  PoolKey, 
  isValidPoolId, 
  isValidCurrency, 
  isValidHooks 
} from '../types/PoolManagerTypes';

/**
 * Extracts pool information from Initialize events
 */
export class PoolInfoExtractor {
  /**
   * Extract pool info from Initialize event
   * 
   * @param event Initialize event from PoolManager
   * @returns Extracted pool information
   */
  extractFromEvent(event: InitializeEvent): PoolInfo {
    // Validate event data
    this.validateEvent(event);

    return {
      poolId: event.id,
      currency0: event.currency0,
      currency1: event.currency1,
      fee: event.fee,
      tickSpacing: event.tickSpacing,
      hooks: event.hooks,
      sqrtPriceX96: event.sqrtPriceX96,
      tick: event.tick,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      timestamp: event.timestamp
    };
  }

  /**
   * Validate pool info completeness
   * 
   * @param poolInfo Pool information to validate
   * @returns True if pool info is valid
   */
  validatePoolInfo(poolInfo: PoolInfo): boolean {
    try {
      // Check required fields
      if (!poolInfo.poolId || !poolInfo.currency0 || !poolInfo.currency1) {
        return false;
      }

      // Validate pool ID
      if (!isValidPoolId(poolInfo.poolId)) {
        return false;
      }

      // Validate currencies
      if (!isValidCurrency(poolInfo.currency0) || !isValidCurrency(poolInfo.currency1)) {
        return false;
      }

      // Check currencies are different
      if (poolInfo.currency0 === poolInfo.currency1) {
        return false;
      }

      // Validate hooks
      if (!isValidHooks(poolInfo.hooks)) {
        return false;
      }

      // Validate fee (should be positive)
      if (poolInfo.fee < 0) {
        return false;
      }

      // Validate tick spacing (should be positive)
      if (poolInfo.tickSpacing < 0) {
        return false;
      }

      // Validate sqrtPriceX96 (should be positive)
      if (!poolInfo.sqrtPriceX96 || poolInfo.sqrtPriceX96 === '0') {
        return false;
      }

      // Validate block number
      if (poolInfo.blockNumber <= 0) {
        return false;
      }

      // Validate transaction hash
      if (!poolInfo.transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(poolInfo.transactionHash)) {
        return false;
      }

      // Validate timestamp
      if (poolInfo.timestamp <= 0 || poolInfo.timestamp > Date.now()) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create PoolKey from PoolInfo
   * 
   * @param poolInfo Pool information
   * @returns Pool key structure
   */
  createPoolKey(poolInfo: PoolInfo): PoolKey {
    return {
      currency0: poolInfo.currency0,
      currency1: poolInfo.currency1,
      fee: poolInfo.fee,
      tickSpacing: poolInfo.tickSpacing,
      hooks: poolInfo.hooks
    };
  }

  /**
   * Validate Initialize event
   * 
   * @param event Event to validate
   * @throws Error if event is invalid
   */
  private validateEvent(event: InitializeEvent): void {
    if (!event.id) {
      throw new Error('Event ID is required');
    }

    if (!event.currency0 || !event.currency1) {
      throw new Error('Both currencies are required');
    }

    if (!event.hooks) {
      throw new Error('Hooks address is required');
    }

    if (!event.sqrtPriceX96) {
      throw new Error('sqrtPriceX96 is required');
    }

    if (!event.transactionHash) {
      throw new Error('Transaction hash is required');
    }

    if (event.blockNumber <= 0) {
      throw new Error('Block number must be positive');
    }

    if (event.timestamp <= 0) {
      throw new Error('Timestamp must be positive');
    }

    if (event.fee < 0) {
      throw new Error('Fee must be non-negative');
    }

    if (event.tickSpacing < 0) {
      throw new Error('Tick spacing must be non-negative');
    }
  }

  /**
   * Extract pool key from event
   * 
   * @param event Initialize event
   * @returns Pool key
   */
  extractPoolKey(event: InitializeEvent): PoolKey {
    return {
      currency0: event.currency0,
      currency1: event.currency1,
      fee: event.fee,
      tickSpacing: event.tickSpacing,
      hooks: event.hooks
    };
  }

  /**
   * Check if pool info represents a valid pool
   * 
   * @param poolInfo Pool information
   * @returns True if pool is valid
   */
  isValidPool(poolInfo: PoolInfo): boolean {
    return this.validatePoolInfo(poolInfo);
  }

  /**
   * Get pool identifier string
   * 
   * @param poolInfo Pool information
   * @returns Unique pool identifier
   */
  getPoolIdentifier(poolInfo: PoolInfo): string {
    return `${poolInfo.currency0}-${poolInfo.currency1}-${poolInfo.fee}-${poolInfo.hooks}`;
  }

  /**
   * Check if two pool infos represent the same pool
   * 
   * @param pool1 First pool info
   * @param pool2 Second pool info
   * @returns True if pools are the same
   */
  isSamePool(pool1: PoolInfo, pool2: PoolInfo): boolean {
    return (
      pool1.poolId === pool2.poolId &&
      pool1.currency0 === pool2.currency0 &&
      pool1.currency1 === pool2.currency1 &&
      pool1.fee === pool2.fee &&
      pool1.tickSpacing === pool2.tickSpacing &&
      pool1.hooks === pool2.hooks
    );
  }

  /**
   * Get pool summary
   * 
   * @param poolInfo Pool information
   * @returns Human-readable pool summary
   */
  getPoolSummary(poolInfo: PoolInfo): string {
    const currency0Name = poolInfo.currency0 === '0x0000000000000000000000000000000000000000' ? 'ETH' : poolInfo.currency0;
    const currency1Name = poolInfo.currency1 === '0x0000000000000000000000000000000000000000' ? 'ETH' : poolInfo.currency1;
    
    return `${currency0Name}/${currency1Name} (${poolInfo.fee/10000}% fee, hooks: ${poolInfo.hooks})`;
  }

  /**
   * Extract pool metadata
   * 
   * @param poolInfo Pool information
   * @returns Pool metadata
   */
  getPoolMetadata(poolInfo: PoolInfo): {
    isNativeETH: boolean;
    currency0IsNative: boolean;
    currency1IsNative: boolean;
    feePercentage: number;
    poolType: string;
  } {
    const currency0IsNative = poolInfo.currency0 === '0x0000000000000000000000000000000000000000';
    const currency1IsNative = poolInfo.currency1 === '0x0000000000000000000000000000000000000000';
    
    return {
      isNativeETH: currency0IsNative || currency1IsNative,
      currency0IsNative,
      currency1IsNative,
      feePercentage: poolInfo.fee / 10000,
      poolType: currency0IsNative || currency1IsNative ? 'Native ETH Pool' : 'ERC20 Pool'
    };
  }

  /**
   * Validate pool key
   * 
   * @param poolKey Pool key to validate
   * @returns True if pool key is valid
   */
  validatePoolKey(poolKey: PoolKey): boolean {
    try {
      // Check required fields
      if (!poolKey.currency0 || !poolKey.currency1 || !poolKey.hooks) {
        return false;
      }

      // Validate currencies
      if (!isValidCurrency(poolKey.currency0) || !isValidCurrency(poolKey.currency1)) {
        return false;
      }

      // Check currencies are different
      if (poolKey.currency0 === poolKey.currency1) {
        return false;
      }

      // Validate hooks
      if (!isValidHooks(poolKey.hooks)) {
        return false;
      }

      // Validate fee
      if (poolKey.fee < 0) {
        return false;
      }

      // Validate tick spacing
      if (poolKey.tickSpacing < 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create pool info from individual components
   * 
   * @param poolId Pool ID
   * @param currency0 First currency
   * @param currency1 Second currency
   * @param fee Fee amount
   * @param tickSpacing Tick spacing
   * @param hooks Hooks address
   * @param sqrtPriceX96 Square root price
   * @param tick Current tick
   * @param blockNumber Block number
   * @param transactionHash Transaction hash
   * @param timestamp Timestamp
   * @returns Pool information
   */
  createPoolInfo(
    poolId: string,
    currency0: string,
    currency1: string,
    fee: number,
    tickSpacing: number,
    hooks: string,
    sqrtPriceX96: string,
    tick: number,
    blockNumber: number,
    transactionHash: string,
    timestamp: number
  ): PoolInfo {
    const poolInfo: PoolInfo = {
      poolId,
      currency0,
      currency1,
      fee,
      tickSpacing,
      hooks,
      sqrtPriceX96,
      tick,
      blockNumber,
      transactionHash,
      timestamp
    };

    if (!this.validatePoolInfo(poolInfo)) {
      throw new Error('Invalid pool information');
    }

    return poolInfo;
  }
}
