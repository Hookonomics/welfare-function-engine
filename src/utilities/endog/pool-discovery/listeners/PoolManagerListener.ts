/**
 * Pool Manager Listener
 * 
 * Listens to Uniswap V4 PoolManager Initialize events and processes them
 * through the pool discovery service. Handles event subscription, processing,
 * and error handling.
 */

import { ethers } from 'ethers';
import { PoolDiscoveryService } from '../core/PoolDiscoveryService';
import { InitializeEvent } from '../types/EventTypes';
import { PoolDiscoveryConfig } from '../types/PoolManagerTypes';

/**
 * Listens to PoolManager Initialize events
 */
export class PoolManagerListener {
  private provider: ethers.Provider;
  private poolManagerContract: ethers.Contract;
  private discoveryService: PoolDiscoveryService;
  private isListening: boolean = false;
  private eventFilter: ethers.EventFilter | null = null;

  constructor(
    private poolManagerAddress: string,
    private chainId: number,
    provider: ethers.Provider,
    discoveryService: PoolDiscoveryService
  ) {
    this.provider = provider;
    this.discoveryService = discoveryService;
    
    // Create contract instance
    this.poolManagerContract = new ethers.Contract(
      poolManagerAddress,
      this.getPoolManagerABI(),
      provider
    );
  }

  /**
   * Start listening to Initialize events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      throw new Error('Listener is already running');
    }

    try {
      // Create event filter for Initialize events
      this.eventFilter = this.poolManagerContract.filters.Initialize();
      
      // Set up event listener
      this.poolManagerContract.on(this.eventFilter, async (log) => {
        await this.handleInitializeEvent(log);
      });

      this.isListening = true;
    } catch (error) {
      throw new Error(`Failed to start listener: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop listening to events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      if (this.eventFilter) {
        this.poolManagerContract.removeAllListeners(this.eventFilter);
        this.eventFilter = null;
      }
      
      this.isListening = false;
    } catch (error) {
      throw new Error(`Failed to stop listener: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process historical events from a block range
   * 
   * @param fromBlock Start block number
   * @param toBlock End block number
   */
  async processHistoricalEvents(
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    try {
      // Get Initialize events from block range
      const filter = this.poolManagerContract.filters.Initialize();
      const events = await this.poolManagerContract.queryFilter(filter, fromBlock, toBlock);
      
      // Process each event
      for (const event of events) {
        await this.handleInitializeEvent(event);
      }
    } catch (error) {
      throw new Error(`Failed to process historical events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle Initialize event
   * 
   * @param log Event log
   */
  private async handleInitializeEvent(log: ethers.Log): Promise<void> {
    try {
      // Parse event data
      const parsedLog = this.poolManagerContract.interface.parseLog(log);
      if (!parsedLog) {
        throw new Error('Failed to parse event log');
      }

      // Extract event data
      const eventData = parsedLog.args;
      if (!eventData) {
        throw new Error('Event data is missing');
      }

      // Create InitializeEvent object
      const initializeEvent: InitializeEvent = {
        id: eventData.id,
        currency0: eventData.currency0,
        currency1: eventData.currency1,
        fee: eventData.fee,
        tickSpacing: eventData.tickSpacing,
        hooks: eventData.hooks,
        sqrtPriceX96: eventData.sqrtPriceX96.toString(),
        tick: eventData.tick,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        timestamp: Date.now() // TODO: Get actual block timestamp
      };

      // Process event through discovery service
      const result = await this.discoveryService.processInitializeEvent(initializeEvent);
      
      if (result) {
        console.log(`Pool discovered: ${result.poolInfo.poolId} with ${result.matchingSubscriptions.length} matching subscriptions`);
      }
    } catch (error) {
      console.error(`Failed to handle Initialize event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get PoolManager ABI for Initialize event
   * 
   * @returns ABI fragment for Initialize event
   */
  private getPoolManagerABI(): string[] {
    return [
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "bytes32",
            "name": "id",
            "type": "bytes32"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "currency0",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "currency1",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "indexed": false,
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "hooks",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint160",
            "name": "sqrtPriceX96",
            "type": "uint160"
          },
          {
            "indexed": false,
            "internalType": "int24",
            "name": "tick",
            "type": "int24"
          }
        ],
        "name": "Initialize",
        "type": "event"
      }
    ];
  }

  /**
   * Get listener status
   * 
   * @returns Listener status information
   */
  getStatus(): {
    isListening: boolean;
    poolManagerAddress: string;
    chainId: number;
    eventFilter: string | null;
  } {
    return {
      isListening: this.isListening,
      poolManagerAddress: this.poolManagerAddress,
      chainId: this.chainId,
      eventFilter: this.eventFilter ? 'Initialize' : null
    };
  }

  /**
   * Get current block number
   * 
   * @returns Current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      throw new Error(`Failed to get current block number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get block timestamp
   * 
   * @param blockNumber Block number
   * @returns Block timestamp
   */
  async getBlockTimestamp(blockNumber: number): Promise<number> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      if (!block) {
        throw new Error(`Block ${blockNumber} not found`);
      }
      return block.timestamp;
    } catch (error) {
      throw new Error(`Failed to get block timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process events with retry logic
   * 
   * @param fromBlock Start block number
   * @param toBlock End block number
   * @param maxRetries Maximum number of retries
   * @param retryDelay Delay between retries in milliseconds
   */
  async processHistoricalEventsWithRetry(
    fromBlock: number,
    toBlock: number,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<void> {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await this.processHistoricalEvents(fromBlock, toBlock);
        return; // Success
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to process historical events after ${maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
      }
    }
  }

  /**
   * Get events in batches
   * 
   * @param fromBlock Start block number
   * @param toBlock End block number
   * @param batchSize Batch size for processing
   */
  async processHistoricalEventsInBatches(
    fromBlock: number,
    toBlock: number,
    batchSize: number = 1000
  ): Promise<void> {
    let currentBlock = fromBlock;
    
    while (currentBlock <= toBlock) {
      const batchEndBlock = Math.min(currentBlock + batchSize - 1, toBlock);
      
      try {
        await this.processHistoricalEvents(currentBlock, batchEndBlock);
        console.log(`Processed blocks ${currentBlock} to ${batchEndBlock}`);
      } catch (error) {
        console.error(`Failed to process blocks ${currentBlock} to ${batchEndBlock}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      currentBlock = batchEndBlock + 1;
    }
  }
}
