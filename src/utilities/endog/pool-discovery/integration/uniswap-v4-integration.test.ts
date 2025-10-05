import { PoolManagerContract } from '../blockchain/providers/PoolManagerContract';
import { UniswapV4SDK } from '../blockchain/providers/UniswapV4SDK';
import { AlchemyProvider } from '../blockchain/providers/AlchemyProvider';
import { UNICHAIN_MAINNET } from '../blockchain/config/networks';
import { loadIntegrationConfig } from './fixtures/test-config';

describe('Uniswap V4 SDK Integration', () => {
  let poolManagerContract: PoolManagerContract;
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
    
    poolManagerContract = new PoolManagerContract(
      UNICHAIN_MAINNET.poolManagerAddress,
      alchemyProvider.getProvider()
    );
  });
  
  afterAll(async () => {
    if (poolManagerContract) {
      await poolManagerContract.stop();
    }
  });
  
  describe('PoolKey Validation', () => {
    it('should validate PoolKey structure', () => {
      const validPoolKey = {
        currency0: '0x1111111111111111111111111111111111111111',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x0000000000000000000000000000000000000000'
      };
      
      expect(UniswapV4SDK.validatePoolKey(validPoolKey)).toBe(true);
    });
    
    it('should reject invalid PoolKey structures', () => {
      const invalidPoolKey = {
        currency0: 'invalid-address',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: -1,
        tickSpacing: 0,
        hooks: '0x0000000000000000000000000000000000000000'
      };
      
      expect(UniswapV4SDK.validatePoolKey(invalidPoolKey)).toBe(false);
    });
  });
  
  describe('Currency Pair Normalization', () => {
    it('should normalize currency pairs consistently', () => {
      const currency0 = '0x1111111111111111111111111111111111111111';
      const currency1 = '0x2222222222222222222222222222222222222222';
      
      const normalized = UniswapV4SDK.normalizeCurrencyPair(currency0, currency1);
      
      expect(normalized.token0).toBe(currency0);
      expect(normalized.token1).toBe(currency1);
      expect(normalized.isReversed).toBe(false);
    });
    
    it('should handle reversed currency pairs', () => {
      const currency0 = '0x2222222222222222222222222222222222222222';
      const currency1 = '0x1111111111111111111111111111111111111111';
      
      const normalized = UniswapV4SDK.normalizeCurrencyPair(currency0, currency1);
      
      expect(normalized.token0).toBe(currency1);
      expect(normalized.token1).toBe(currency0);
      expect(normalized.isReversed).toBe(true);
    });
  });
  
  describe('Pool ID Generation', () => {
    it('should generate consistent pool IDs', () => {
      const poolKey = {
        currency0: '0x1111111111111111111111111111111111111111',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x0000000000000000000000000000000000000000'
      };
      
      const poolId1 = UniswapV4SDK.generatePoolId(poolKey);
      const poolId2 = UniswapV4SDK.generatePoolId(poolKey);
      
      expect(poolId1).toBe(poolId2);
    });
    
    it('should generate different IDs for different pools', () => {
      const poolKey1 = {
        currency0: '0x1111111111111111111111111111111111111111',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x0000000000000000000000000000000000000000'
      };
      
      const poolKey2 = {
        currency0: '0x1111111111111111111111111111111111111111',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: 500,
        tickSpacing: 10,
        hooks: '0x0000000000000000000000000000000000000000'
      };
      
      const poolId1 = UniswapV4SDK.generatePoolId(poolKey1);
      const poolId2 = UniswapV4SDK.generatePoolId(poolKey2);
      
      expect(poolId1).not.toBe(poolId2);
    });
  });
  
  describe('Hooks Detection', () => {
    it('should detect pools with hooks', () => {
      const poolWithHooks = {
        currency0: '0x1111111111111111111111111111111111111111',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x5555555555555555555555555555555555555555'
      };
      
      expect(UniswapV4SDK.hasHooks(poolWithHooks)).toBe(true);
    });
    
    it('should detect pools without hooks', () => {
      const poolWithoutHooks = {
        currency0: '0x1111111111111111111111111111111111111111',
        currency1: '0x2222222222222222222222222222222222222222',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x0000000000000000000000000000000000000000'
      };
      
      expect(UniswapV4SDK.hasHooks(poolWithoutHooks)).toBe(false);
    });
  });
  
  describe('Fee Tier Descriptions', () => {
    it('should provide correct fee tier descriptions', () => {
      expect(UniswapV4SDK.getFeeTierDescription(100)).toBe('0.01%');
      expect(UniswapV4SDK.getFeeTierDescription(500)).toBe('0.05%');
      expect(UniswapV4SDK.getFeeTierDescription(3000)).toBe('0.3%');
      expect(UniswapV4SDK.getFeeTierDescription(10000)).toBe('1%');
    });
    
    it('should handle custom fee tiers', () => {
      expect(UniswapV4SDK.getFeeTierDescription(2500)).toBe('0.25%');
      expect(UniswapV4SDK.getFeeTierDescription(5000)).toBe('0.5%');
    });
  });
  
  describe('Real Mainnet Integration', () => {
    it('should parse real Initialize events to PoolKey format', async () => {
      const events = await poolManagerContract.getHistoricalEvents(
        config.startBlock,
        config.startBlock + 5 // Use smaller range for free tier
      );
      
      if (events.length === 0) {
        console.warn('No events found in test range');
        return;
      }
      
      for (const event of events.slice(0, 3)) {
        const { poolKey } = poolManagerContract.parseInitializeEventToPool(
          event,
          UNICHAIN_MAINNET.chainId
        );
        
        // Validate PoolKey structure
        expect(UniswapV4SDK.validatePoolKey(poolKey)).toBe(true);
        
        // Test normalization
        const normalized = UniswapV4SDK.normalizeCurrencyPair(
          poolKey.currency0,
          poolKey.currency1
        );
        expect(normalized.token0).toBeDefined();
        expect(normalized.token1).toBeDefined();
        
        // Test pool ID generation
        const poolId = UniswapV4SDK.generatePoolId(poolKey);
        expect(poolId).toBeDefined();
        expect(poolId.length).toBeGreaterThan(0);
        
        // Test hooks detection
        const hasHooks = UniswapV4SDK.hasHooks(poolKey);
        expect(typeof hasHooks).toBe('boolean');
        
        // Test fee tier description
        const feeDescription = UniswapV4SDK.getFeeTierDescription(poolKey.fee);
        expect(feeDescription).toBeDefined();
      }
    }, 120000);
  });
});
