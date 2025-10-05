import * as dotenv from 'dotenv';
import * as path from 'path';

export interface IntegrationTestConfig {
  alchemyApiKey: string;
  alchemyNetwork: string;
  chainId: number;
  poolManagerAddress: string;
  startBlock: number;
  blockRange: number;
  timeout: number;
  subsquidArchiveUrl?: string | undefined;
  enableWebsocketTests: boolean;
  rpcEndpoint: string;
  websocketEndpoint: string;
}

export function loadIntegrationConfig(): IntegrationTestConfig {
  const envPath = path.join(__dirname, '../../../../..', '.env.integration');
  dotenv.config({ path: envPath });
  
  return {
    alchemyApiKey: process.env.ALCHEMY_API_KEY || 'fd_m2oikp78msnnQGxO6H',
    alchemyNetwork: process.env.ALCHEMY_NETWORK || 'unichain-mainnet',
    chainId: parseInt(process.env.UNICHAIN_MAINNET_CHAIN_ID || '1301'),
    poolManagerAddress: process.env.POOL_MANAGER_ADDRESS || '0x1f98400000000000000000000000000000000004',
    startBlock: parseInt(process.env.TEST_START_BLOCK || '1000000'),
    blockRange: parseInt(process.env.TEST_BLOCK_RANGE || '10'),
    timeout: parseInt(process.env.TEST_TIMEOUT || '120000'),
    subsquidArchiveUrl: process.env.SUBSQUID_ARCHIVE_URL || undefined,
    enableWebsocketTests: process.env.ENABLE_WEBSOCKET_TESTS === 'true',
    rpcEndpoint: 'https://unichain-mainnet.g.alchemy.com/v2/fd_m2oikp78msnnQGxO6H',
    websocketEndpoint: 'wss://unichain-mainnet.g.alchemy.com/v2/fd_m2oikp78msnnQGxO6H'
  };
}

export function createMockConfig(): IntegrationTestConfig {
  return {
    alchemyApiKey: 'test-api-key',
    alchemyNetwork: 'unichain-mainnet',
    chainId: 1301,
    poolManagerAddress: '0x1f98400000000000000000000000000000000004',
    startBlock: 1000000,
    blockRange: 100,
    timeout: 120000,
    enableWebsocketTests: false,
    rpcEndpoint: 'https://unichain-mainnet.g.alchemy.com/v2/fd_m2oikp78msnnQGxO6H',
    websocketEndpoint: 'wss://unichain-mainnet.g.alchemy.com/v2/fd_m2oikp78msnnQGxO6H'
  };
}
