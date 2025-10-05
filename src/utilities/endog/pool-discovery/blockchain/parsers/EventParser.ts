import { ethers, EventLog } from 'ethers';
import { InitializeEvent } from '../../types/PoolManagerTypes';

export class EventParser {
  /**
   * Parse blockchain event to InitializeEvent format
   */
  static async parseToInitializeEvent(
    eventLog: EventLog,
    parsedEvent: {
      id: string;
      currency0: string;
      currency1: string;
      fee: number;
      tickSpacing: number;
      hooks: string;
      sqrtPriceX96: string;
      tick: number;
    },
    provider: ethers.Provider
  ): Promise<InitializeEvent> {
    // Get block for timestamp
    const block = await provider.getBlock(eventLog.blockNumber);
    
    return {
      id: parsedEvent.id,
      currency0: parsedEvent.currency0,
      currency1: parsedEvent.currency1,
      fee: parsedEvent.fee,
      tickSpacing: parsedEvent.tickSpacing,
      hooks: parsedEvent.hooks,
      sqrtPriceX96: parsedEvent.sqrtPriceX96,
      tick: parsedEvent.tick,
      blockNumber: eventLog.blockNumber,
      transactionHash: eventLog.transactionHash,
      timestamp: block?.timestamp || 0
    };
  }
  
  /**
   * Parse raw log to EventLog format
   */
  static parseRawLogToEventLog(rawLog: ethers.Log): EventLog {
    return {
      ...rawLog,
      args: this.decodeLogArgs(rawLog)
    } as EventLog;
  }
  
  /**
   * Decode log arguments for Initialize event
   */
  private static decodeLogArgs(log: ethers.Log): any {
    // Initialize event signature
    const initializeSignature = 'Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)';
    const eventInterface = new ethers.Interface([`event ${initializeSignature}`]);
    
    try {
      const decoded = eventInterface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      return decoded?.args || {};
    } catch (error) {
      console.warn('Failed to decode log args:', error);
      return {};
    }
  }
  
  /**
   * Validate Initialize event structure
   */
  static validateInitializeEvent(event: InitializeEvent): boolean {
    return (
      this.isValidPoolId(event.id) &&
      this.isValidAddress(event.currency0) &&
      this.isValidAddress(event.currency1) &&
      event.fee >= 0 &&
      event.tickSpacing > 0 &&
      this.isValidAddress(event.hooks) &&
      this.isValidSqrtPrice(event.sqrtPriceX96) &&
      typeof event.tick === 'number' &&
      event.blockNumber > 0 &&
      this.isValidTxHash(event.transactionHash)
    );
  }
  
  /**
   * Check if pool ID is valid (64 character hex string)
   */
  private static isValidPoolId(poolId: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(poolId);
  }
  
  /**
   * Check if address is valid Ethereum address
   */
  private static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  /**
   * Check if sqrtPriceX96 is valid (160-bit number)
   */
  private static isValidSqrtPrice(sqrtPriceX96: string): boolean {
    try {
      const price = BigInt(sqrtPriceX96);
      return price >= 0n && price <= BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    } catch {
      return false;
    }
  }
  
  /**
   * Check if transaction hash is valid
   */
  private static isValidTxHash(txHash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(txHash);
  }
  
  /**
   * Extract currency pair from Initialize event
   */
  static extractCurrencyPair(event: InitializeEvent): {
    currency0: string;
    currency1: string;
    isNative: boolean;
  } {
    const isNative = event.currency0 === '0x0000000000000000000000000000000000000000' ||
                     event.currency1 === '0x0000000000000000000000000000000000000000';
    
    return {
      currency0: event.currency0,
      currency1: event.currency1,
      isNative
    };
  }
  
  /**
   * Get event age in seconds
   */
  static getEventAge(event: InitializeEvent, currentTimestamp?: number): number {
    const now = currentTimestamp || Math.floor(Date.now() / 1000);
    return now - event.timestamp;
  }
}
