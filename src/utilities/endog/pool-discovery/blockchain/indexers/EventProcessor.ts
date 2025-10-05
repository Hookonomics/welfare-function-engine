import { IndexedEvent } from './SubsquidIndexer';
import { ethers } from 'ethers';

export interface ProcessedEvent {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  poolId: string;
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
  sqrtPriceX96: string;
  tick: number;
  timestamp: number;
}

export class EventProcessor {
  /**
   * Process indexed events from Subsquid
   */
  static processIndexedEvents(events: IndexedEvent[]): ProcessedEvent[] {
    return events.map(event => this.processSingleEvent(event));
  }
  
  /**
   * Process a single indexed event
   */
  private static processSingleEvent(event: IndexedEvent): ProcessedEvent {
    // Decode the event data
    const decoded = this.decodeInitializeEvent(event);
    
    return {
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      poolId: decoded.poolId,
      currency0: decoded.currency0,
      currency1: decoded.currency1,
      fee: decoded.fee,
      tickSpacing: decoded.tickSpacing,
      hooks: decoded.hooks,
      sqrtPriceX96: decoded.sqrtPriceX96,
      tick: decoded.tick,
      timestamp: event.timestamp
    };
  }
  
  /**
   * Decode Initialize event from raw log data
   */
  private static decodeInitializeEvent(event: IndexedEvent): {
    poolId: string;
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
    sqrtPriceX96: string;
    tick: number;
  } {
    // Topics structure for Initialize event:
    // topics[0] = event signature
    // topics[1] = poolId (indexed)
    // topics[2] = currency0 (indexed)
    // topics[3] = currency1 (indexed)
    
    const poolId = event.topics[1];
    const currency0 = ethers.getAddress(event.topics[2]);
    const currency1 = ethers.getAddress(event.topics[3]);
    
    // Decode non-indexed parameters from data
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ['uint24', 'int24', 'address', 'uint160', 'int24'],
      event.data
    );
    
    return {
      poolId,
      currency0,
      currency1,
      fee: Number(decoded[0]),
      tickSpacing: Number(decoded[1]),
      hooks: decoded[2],
      sqrtPriceX96: decoded[3].toString(),
      tick: Number(decoded[4])
    };
  }
  
  /**
   * Filter events by currency pair
   */
  static filterByCurrencyPair(
    events: ProcessedEvent[],
    currency0: string,
    currency1: string
  ): ProcessedEvent[] {
    return events.filter(event => 
      (event.currency0.toLowerCase() === currency0.toLowerCase() && 
       event.currency1.toLowerCase() === currency1.toLowerCase()) ||
      (event.currency0.toLowerCase() === currency1.toLowerCase() && 
       event.currency1.toLowerCase() === currency0.toLowerCase())
    );
  }
  
  /**
   * Filter events by hooks address
   */
  static filterByHooks(
    events: ProcessedEvent[],
    hooks: string
  ): ProcessedEvent[] {
    return events.filter(event => 
      event.hooks.toLowerCase() === hooks.toLowerCase()
    );
  }
  
  /**
   * Get unique currency pairs from events
   */
  static getUniqueCurrencyPairs(events: ProcessedEvent[]): Array<{
    currency0: string;
    currency1: string;
    count: number;
  }> {
    const pairMap = new Map<string, number>();
    
    for (const event of events) {
      const pair = this.normalizePair(event.currency0, event.currency1);
      pairMap.set(pair, (pairMap.get(pair) || 0) + 1);
    }
    
    return Array.from(pairMap.entries()).map(([pair, count]) => {
      const [currency0, currency1] = pair.split('-');
      return { currency0, currency1, count };
    });
  }
  
  /**
   * Normalize currency pair for consistent indexing
   */
  private static normalizePair(currency0: string, currency1: string): string {
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase() 
      ? [currency0, currency1] 
      : [currency1, currency0];
    return `${token0}-${token1}`;
  }
}
