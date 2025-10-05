import { PoolKey } from './PoolManagerContract';

export class UniswapV4SDK {
  /**
   * Validate PoolKey structure according to Uniswap V4 standards
   */
  static validatePoolKey(poolKey: PoolKey): boolean {
    return (
      this.isValidAddress(poolKey.currency0) &&
      this.isValidAddress(poolKey.currency1) &&
      poolKey.fee >= 0 &&
      poolKey.tickSpacing > 0 &&
      this.isValidAddress(poolKey.hooks)
    );
  }
  
  /**
   * Check if address is valid Ethereum address
   */
  private static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  /**
   * Create normalized currency pair for consistent indexing
   */
  static normalizeCurrencyPair(currency0: string, currency1: string): {
    token0: string;
    token1: string;
    isReversed: boolean;
  } {
    const isReversed = currency0.toLowerCase() > currency1.toLowerCase();
    return {
      token0: isReversed ? currency1 : currency0,
      token1: isReversed ? currency0 : currency1,
      isReversed
    };
  }
  
  /**
   * Generate pool identifier from PoolKey
   */
  static generatePoolId(poolKey: PoolKey): string {
    const normalized = this.normalizeCurrencyPair(poolKey.currency0, poolKey.currency1);
    return `${normalized.token0}-${normalized.token1}-${poolKey.fee}-${poolKey.tickSpacing}-${poolKey.hooks}`;
  }
  
  /**
   * Check if pool uses hooks
   */
  static hasHooks(poolKey: PoolKey): boolean {
    return poolKey.hooks !== '0x0000000000000000000000000000000000000000';
  }
  
  /**
   * Get fee tier description
   */
  static getFeeTierDescription(fee: number): string {
    const feeMap: Record<number, string> = {
      100: '0.01%',
      500: '0.05%',
      3000: '0.3%',
      10000: '1%'
    };
    return feeMap[fee] || `${fee / 10000}%`;
  }
}
