/**
 * Uniswap V4 PoolManager Type Definitions
 * 
 * Defines types for Uniswap V4 PoolManager contract interactions,
 * including pool identification, currency handling, and event structures.
 */

// Core Uniswap V4 types
export type PoolId = string; // bytes32 as hex string
export type Currency = string; // address (0x0 for native ETH)
export type IHooks = string; // address

/**
 * Pool key structure for Uniswap V4 pools
 */
export interface PoolKey {
  currency0: Currency;
  currency1: Currency;
  fee: number; // uint24
  tickSpacing: number; // int24
  hooks: IHooks;
}

/**
 * Initialize event from Uniswap V4 PoolManager
 * 
 * Event signature:
 * Initialize(
 *   PoolId indexed id,
 *   Currency indexed currency0,
 *   Currency indexed currency1,
 *   uint24 fee,
 *   int24 tickSpacing,
 *   IHooks hooks,
 *   uint160 sqrtPriceX96,
 *   int24 tick
 * )
 */
export interface InitializeEvent {
  id: PoolId; // indexed
  currency0: Currency; // indexed
  currency1: Currency; // indexed
  fee: number; // uint24
  tickSpacing: number; // int24
  hooks: IHooks;
  sqrtPriceX96: string; // uint160 as string
  tick: number; // int24
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

/**
 * Pool information extracted from Initialize event
 */
export interface PoolInfo {
  poolId: PoolId;
  currency0: Currency;
  currency1: Currency;
  fee: number;
  tickSpacing: number;
  hooks: IHooks;
  sqrtPriceX96: string;
  tick: number;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

/**
 * Pool discovery configuration
 */
export interface PoolDiscoveryConfig {
  poolManagerAddress: string;
  chainId: number;
  rpcUrl: string;
  startBlock?: number;
  batchSize?: number; // For historical event processing
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  success: boolean;
  poolInfo?: PoolInfo;
  error?: string;
  processingTime: number;
}

/**
 * Pool discovery metrics
 */
export interface PoolDiscoveryMetrics {
  totalEventsProcessed: number;
  successfulMatches: number;
  failedMatches: number;
  averageProcessingTime: number;
  activeSubscriptions: number;
  discoveredPools: number;
}

/**
 * Native ETH constant
 */
export const NATIVE_ETH: Currency = '0x0000000000000000000000000000000000000000';

/**
 * Validate if currency is native ETH
 */
export function isNativeETH(currency: Currency): boolean {
  return currency === NATIVE_ETH || currency === '0x0';
}

/**
 * Validate if currency address is valid
 */
export function isValidCurrency(currency: Currency): boolean {
  if (isNativeETH(currency)) return true;
  return /^0x[a-fA-F0-9]{40}$/.test(currency);
}

/**
 * Validate if pool ID is valid
 */
export function isValidPoolId(poolId: PoolId): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(poolId);
}

/**
 * Validate if hooks address is valid
 */
export function isValidHooks(hooks: IHooks): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(hooks);
}
