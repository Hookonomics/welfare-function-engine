import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { TypeormDatabase } from '@subsquid/typeorm-store';
import { ethers } from 'ethers';

export interface IndexedEvent {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  data: string;
  topics: string[];
  timestamp: number;
}

export class SubsquidIndexer {
  private processor: EvmBatchProcessor;
  
  constructor(
    rpcEndpoint: string,
    poolManagerAddress: string,
    startBlock: number
  ) {
    this.processor = new EvmBatchProcessor()
      .setGateway('https://v2.archive.subsquid.io/network/unichain-mainnet')
      .setRpcEndpoint(rpcEndpoint)
      .setFinalityConfirmation(10)
      .setBlockRange({ from: startBlock })
      .addLog({
        address: [poolManagerAddress],
        topic0: [this.getInitializeEventTopic()],
        transaction: true
      });
  }
  
  private getInitializeEventTopic(): string {
    return ethers.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)');
  }
  
  /**
   * Process historical events efficiently using Subsquid
   */
  async processHistoricalEvents(
    callback: (events: IndexedEvent[]) => Promise<void>
  ): Promise<void> {
    this.processor.run(new TypeormDatabase(), async ctx => {
      const events: IndexedEvent[] = [];
      
      for (const block of ctx.blocks) {
        for (const log of block.logs) {
          if (log.topics[0] === this.getInitializeEventTopic()) {
            events.push({
              blockNumber: block.header.height,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
              data: log.data,
              topics: log.topics,
              timestamp: block.header.timestamp
            });
          }
        }
      }
      
      if (events.length > 0) {
        await callback(events);
      }
    });
  }
  
  /**
   * Get event statistics for a block range
   */
  async getEventStatistics(
    fromBlock: number,
    toBlock: number
  ): Promise<{
    totalEvents: number;
    uniquePools: number;
    averageEventsPerBlock: number;
  }> {
    let totalEvents = 0;
    const uniquePools = new Set<string>();
    
    await this.processor.run(new TypeormDatabase(), async ctx => {
      for (const block of ctx.blocks) {
        if (block.header.height >= fromBlock && block.header.height <= toBlock) {
          for (const log of block.logs) {
            if (log.topics[0] === this.getInitializeEventTopic()) {
              totalEvents++;
              // Extract pool ID from topics
              const poolId = log.topics[1];
              uniquePools.add(poolId);
            }
          }
        }
      }
    });
    
    return {
      totalEvents,
      uniquePools: uniquePools.size,
      averageEventsPerBlock: totalEvents / (toBlock - fromBlock + 1)
    };
  }
}
