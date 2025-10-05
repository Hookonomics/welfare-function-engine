import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import { ethers } from 'ethers';

export class AlchemyProvider {
  private alchemy: Alchemy;
  private provider: ethers.Provider;
  
  constructor(apiKey: string, network: string = 'unichain-mainnet') {
    const settings: AlchemySettings = {
      apiKey,
      network: Network.UNICHAIN_MAINNET, // Custom network for Unichain
      url: `https://unichain-mainnet.g.alchemy.com/v2/${apiKey}`
    };
    
    this.alchemy = new Alchemy(settings);
    // Create ethers provider directly with the RPC URL
    this.provider = new ethers.JsonRpcProvider(`https://unichain-mainnet.g.alchemy.com/v2/${apiKey}`);
  }
  
  /**
   * Get Alchemy instance for enhanced features
   */
  getAlchemy(): Alchemy {
    return this.alchemy;
  }
  
  /**
   * Get ethers provider
   */
  getProvider(): ethers.Provider {
    return this.provider;
  }
  
  /**
   * Get logs with Alchemy's enhanced API
   */
  async getLogs(filter: {
    address?: string;
    topics?: Array<string | null>;
    fromBlock: number | 'latest';
    toBlock: number | 'latest';
  }): Promise<ethers.Log[]> {
    return await this.provider.getLogs(filter);
  }
  
  /**
   * Subscribe to new blocks (WebSocket)
   */
  async subscribeToNewBlocks(callback: (blockNumber: number) => void): Promise<void> {
    this.provider.on('block', callback);
  }
  
  /**
   * Get transaction receipts in batch
   */
  async getBatchTransactionReceipts(txHashes: string[]): Promise<ethers.TransactionReceipt[]> {
    const receipts = await Promise.all(
      txHashes.map(hash => this.provider.getTransactionReceipt(hash))
    );
    return receipts.filter((r): r is ethers.TransactionReceipt => r !== null);
  }
  
  /**
   * Enhanced error handling and retry logic
   */
  async getBlockWithRetry(blockNumber: number, retries = 3): Promise<ethers.Block | null> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.provider.getBlock(blockNumber);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return null;
  }
  
  /**
   * Subscribe to logs with WebSocket
   */
  async subscribeToLogs(
    filter: {
      address?: string;
      topics?: Array<string | null>;
    },
    callback: (log: ethers.Log) => void
  ): Promise<void> {
    this.provider.on(filter, callback);
  }
  
  /**
   * Get enhanced block details with Alchemy features
   */
  async getEnhancedBlock(blockNumber: number): Promise<any> {
    try {
      // Use Alchemy's enhanced APIs if available
      const block = await this.alchemy.core.getBlock(blockNumber);
      return block;
    } catch (error) {
      // Fallback to standard provider
      return await this.provider.getBlock(blockNumber);
    }
  }
}
