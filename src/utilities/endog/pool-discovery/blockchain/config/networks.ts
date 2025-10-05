import { Network } from 'alchemy-sdk';

export interface NetworkConfig {
  chainId: number;
  name: string;
  alchemyNetwork: Network;
  poolManagerAddress: string;
  blockExplorer: string;
  rpcEndpoint: string;
  websocketEndpoint: string;
}

export const UNICHAIN_MAINNET: NetworkConfig = {
  chainId: 1301,
  name: 'Unichain Mainnet',
  alchemyNetwork: Network.UNICHAIN_MAINNET,
  poolManagerAddress: process.env.POOL_MANAGER_ADDRESS || '0x1f98400000000000000000000000000000000004',
  blockExplorer: 'https://unichain.org',
  rpcEndpoint: 'https://unichain-mainnet.g.alchemy.com/v2/fd_m2oikp78msnnQGxO6H',
  websocketEndpoint: 'wss://unichain-mainnet.g.alchemy.com/v2/fd_m2oikp78msnnQGxO6H'
};
