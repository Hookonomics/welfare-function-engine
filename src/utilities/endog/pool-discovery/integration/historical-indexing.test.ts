import { SubsquidIndexer } from '../blockchain/indexers/SubsquidIndexer';
import { EventProcessor } from '../blockchain/indexers/EventProcessor';
import { UNICHAIN_MAINNET } from '../blockchain/config/networks';
import { loadIntegrationConfig } from './fixtures/test-config';

describe('Subsquid Historical Event Indexing', () => {
  let indexer: SubsquidIndexer;
  let config: ReturnType<typeof loadIntegrationConfig>;
  
  beforeAll(async () => {
    config = loadIntegrationConfig();
    
    if (!config.subsquidArchiveUrl) {
      console.warn('Skipping: No Subsquid archive URL');
      return;
    }
    
    indexer = new SubsquidIndexer(
      config.rpcEndpoint,
      UNICHAIN_MAINNET.poolManagerAddress,
      config.startBlock
    );
  });
  
  it('should efficiently index historical Initialize events', async () => {
    const events: any[] = [];
    
    await indexer.processHistoricalEvents(async (batch) => {
      events.push(...batch);
      console.log(`Indexed ${batch.length} events, total: ${events.length}`);
    });
    
    expect(events.length).toBeGreaterThan(0);
  }, 300000);
  
  it('should get event statistics for block range', async () => {
    const stats = await indexer.getEventStatistics(
      config.startBlock,
      config.startBlock + config.blockRange
    );
    
    expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(stats.uniquePools).toBeGreaterThanOrEqual(0);
    expect(stats.averageEventsPerBlock).toBeGreaterThanOrEqual(0);
    
    console.log('Event statistics:', stats);
  });
  
  it('should process indexed events through EventProcessor', async () => {
    const events: any[] = [];
    
    await indexer.processHistoricalEvents(async (batch) => {
      events.push(...batch);
    });
    
    if (events.length > 0) {
      const processedEvents = EventProcessor.processIndexedEvents(events);
      
      expect(processedEvents.length).toBe(events.length);
      
      for (const event of processedEvents) {
        expect(event.poolId).toBeDefined();
        expect(event.currency0).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(event.currency1).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(event.fee).toBeGreaterThanOrEqual(0);
        expect(event.tickSpacing).toBeGreaterThan(0);
      }
    }
  });
  
  it('should filter events by currency pair', async () => {
    const events: any[] = [];
    
    await indexer.processHistoricalEvents(async (batch) => {
      events.push(...batch);
    });
    
    if (events.length > 0) {
      const processedEvents = EventProcessor.processIndexedEvents(events);
      
      // Test filtering by first currency pair found
      const firstEvent = processedEvents[0];
      if (firstEvent) {
        const filtered = EventProcessor.filterByCurrencyPair(
          processedEvents,
          firstEvent.currency0,
          firstEvent.currency1
        );
        
        expect(filtered.length).toBeGreaterThanOrEqual(1);
        expect(filtered.every(e => 
          (e.currency0 === firstEvent.currency0 && e.currency1 === firstEvent.currency1) ||
          (e.currency0 === firstEvent.currency1 && e.currency1 === firstEvent.currency0)
        )).toBe(true);
      }
    }
  });
  
  it('should get unique currency pairs from events', async () => {
    const events: any[] = [];
    
    await indexer.processHistoricalEvents(async (batch) => {
      events.push(...batch);
    });
    
    if (events.length > 0) {
      const processedEvents = EventProcessor.processIndexedEvents(events);
      const uniquePairs = EventProcessor.getUniqueCurrencyPairs(processedEvents);
      
      expect(uniquePairs.length).toBeGreaterThan(0);
      
      for (const pair of uniquePairs) {
        expect(pair.currency0).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(pair.currency1).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(pair.count).toBeGreaterThan(0);
      }
    }
  });
});
