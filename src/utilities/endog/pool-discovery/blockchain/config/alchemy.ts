import { AlchemySettings, Network } from 'alchemy-sdk';

export interface AlchemyConfig {
  apiKey: string;
  network: string;
  settings: AlchemySettings;
}

export function createAlchemyConfig(apiKey: string, network: string = 'unichain-mainnet'): AlchemyConfig {
  return {
    apiKey,
    network,
    settings: {
      apiKey,
      network: Network.UNICHAIN_MAINNET,
      // Custom settings for Unichain
      url: `https://unichain-mainnet.g.alchemy.com/v2/${apiKey}`,
      wsUrl: `wss://unichain-mainnet.g.alchemy.com/v2/${apiKey}`
    }
  };
}
