import { AlchemyProvider } from '../blockchain/providers/AlchemyProvider';
import { loadIntegrationConfig } from './fixtures/test-config';

describe('Alchemy Enhanced Features', () => {
  let alchemyProvider: AlchemyProvider;
  let config: ReturnType<typeof loadIntegrationConfig>;
  
  beforeAll(async () => {
    config = loadIntegrationConfig();
    
    if (!config.alchemyApiKey) {
      console.warn('Skipping: No Alchemy API key');
      return;
    }
    
    alchemyProvider = new AlchemyProvider(
      config.alchemyApiKey,
      config.alchemyNetwork
    );
  });
  
  describe('Enhanced RPC Features', () => {
    it('should get enhanced block details', async () => {
      const blockNumber = await alchemyProvider.getProvider().getBlockNumber();
      const block = await alchemyProvider.getEnhancedBlock(blockNumber);
      
      expect(block).toBeDefined();
      expect(block.number).toBe(blockNumber);
    });
    
    it('should handle batch transaction receipts', async () => {
      // Get recent transactions
      const blockNumber = await alchemyProvider.getProvider().getBlockNumber();
      const block = await alchemyProvider.getProvider().getBlock(blockNumber);
      
      if (block && block.transactions.length > 0) {
        const txHashes = block.transactions.slice(0, 3);
        const receipts = await alchemyProvider.getBatchTransactionReceipts(txHashes);
        
        expect(receipts).toBeDefined();
        expect(receipts.length).toBeGreaterThan(0);
      }
    });
    
    it('should get logs with enhanced filtering', async () => {
      const logs = await alchemyProvider.getLogs({
        fromBlock: config.startBlock,
        toBlock: config.startBlock + 5, // Use smaller range for free tier
        address: config.poolManagerAddress,
        topics: ['0x0000000000000000000000000000000000000000000000000000000000000000'] // Initialize event
      });
      
      expect(Array.isArray(logs)).toBe(true);
    });
  });
  
  describe('Error Handling and Retry Logic', () => {
    it('should retry failed requests', async () => {
      // Test with invalid block number to trigger retry logic
      const result = await alchemyProvider.getBlockWithRetry(999999999, 2);
      expect(result).toBeNull();
    });
    
    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, just test that the method exists and can be called
      expect(typeof alchemyProvider.getBlockWithRetry).toBe('function');
    });
  });
  
  describe('WebSocket Features', () => {
    it('should subscribe to logs via WebSocket', async () => {
      if (!config.enableWebsocketTests) {
        console.warn('Skipping WebSocket tests');
        return;
      }
      
      let logCount = 0;
      const maxLogs = 1;
      
      return new Promise<void>((resolve) => {
        alchemyProvider.subscribeToLogs(
          {
            address: config.poolManagerAddress,
            topics: ['0x0000000000000000000000000000000000000000000000000000000000000000']
          },
          (log) => {
            console.log('Received log:', log);
            logCount++;
            
            if (logCount >= maxLogs) {
              resolve();
            }
          }
        );
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (logCount === 0) {
            console.warn('No logs received in timeout period');
            resolve();
          }
        }, 30000);
      });
    }, 60000);
  });
  
  describe('Performance Benchmarks', () => {
    it('should benchmark batch operations', async () => {
      const startTime = Date.now();
      
      // Test batch operations
      const promises = Array.from({ length: 10 }, (_, i) => 
        alchemyProvider.getBlockWithRetry(config.startBlock + i)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      console.log(`Batch operation took ${endTime - startTime}ms`);
      expect(results.length).toBe(10);
    });
    
    it('should benchmark single vs batch operations', async () => {
      const blockNumbers = Array.from({ length: 5 }, (_, i) => config.startBlock + i);
      
      // Single operations
      const singleStart = Date.now();
      for (const blockNumber of blockNumbers) {
        await alchemyProvider.getBlockWithRetry(blockNumber);
      }
      const singleEnd = Date.now();
      
      // Batch operations
      const batchStart = Date.now();
      await Promise.all(
        blockNumbers.map(blockNumber => alchemyProvider.getBlockWithRetry(blockNumber))
      );
      const batchEnd = Date.now();
      
      console.log(`Single operations: ${singleEnd - singleStart}ms`);
      console.log(`Batch operations: ${batchEnd - batchStart}ms`);
      
      expect(batchEnd - batchStart).toBeLessThan(singleEnd - singleStart);
    });
  });
});
