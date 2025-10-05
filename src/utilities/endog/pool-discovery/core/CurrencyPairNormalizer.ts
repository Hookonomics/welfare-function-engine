/**
 * Currency Pair Normalizer
 * 
 * Normalizes currency pairs for consistent matching across the pool discovery system.
 * Ensures that currency0 < currency1 lexicographically for consistent ordering.
 */

import { Currency, isNativeETH } from '../types/PoolManagerTypes';
import { CurrencyPair } from '../types/SubscriptionTypes';

/**
 * Normalizes currency pairs for consistent matching
 * Sorts currencies lexicographically (currency0 < currency1)
 */
export class CurrencyPairNormalizer {
  /**
   * Normalize currency pair to consistent ordering
   * 
   * @param currency0 First currency address
   * @param currency1 Second currency address
   * @returns Normalized currency pair with currency0 < currency1
   */
  normalize(currency0: Currency, currency1: Currency): CurrencyPair {
    // Convert to lowercase for consistent comparison
    const normalized0 = currency0.toLowerCase();
    const normalized1 = currency1.toLowerCase();
    
    // Sort lexicographically
    if (normalized0 < normalized1) {
      return {
        currency0: normalized0,
        currency1: normalized1
      };
    } else {
      return {
        currency0: normalized1,
        currency1: normalized0
      };
    }
  }

  /**
   * Create unique key for currency pair
   * 
   * @param pair Currency pair to create key for
   * @returns Unique string key for the currency pair
   */
  createKey(pair: CurrencyPair): string {
    return `${pair.currency0}:${pair.currency1}`;
  }

  /**
   * Check if two currency pairs match
   * 
   * @param pair1 First currency pair
   * @param pair2 Second currency pair
   * @returns True if pairs match (same currencies in any order)
   */
  matches(pair1: CurrencyPair, pair2: CurrencyPair): boolean {
    return (
      pair1.currency0 === pair2.currency0 && 
      pair1.currency1 === pair2.currency1
    ) || (
      pair1.currency0 === pair2.currency1 && 
      pair1.currency1 === pair2.currency0
    );
  }

  /**
   * Check if currency is native ETH (0x0)
   * 
   * @param currency Currency address to check
   * @returns True if currency is native ETH
   */
  isNativeETH(currency: Currency): boolean {
    return isNativeETH(currency);
  }

  /**
   * Check if currency pair contains native ETH
   * 
   * @param pair Currency pair to check
   * @returns True if either currency is native ETH
   */
  containsNativeETH(pair: CurrencyPair): boolean {
    return this.isNativeETH(pair.currency0) || this.isNativeETH(pair.currency1);
  }

  /**
   * Get the non-native currency from a pair
   * 
   * @param pair Currency pair
   * @returns The non-native currency, or null if both are native
   */
  getNonNativeCurrency(pair: CurrencyPair): Currency | null {
    if (this.isNativeETH(pair.currency0) && !this.isNativeETH(pair.currency1)) {
      return pair.currency1;
    }
    if (this.isNativeETH(pair.currency1) && !this.isNativeETH(pair.currency0)) {
      return pair.currency0;
    }
    return null;
  }

  /**
   * Get the native currency from a pair
   * 
   * @param pair Currency pair
   * @returns The native currency, or null if neither is native
   */
  getNativeCurrency(pair: CurrencyPair): Currency | null {
    if (this.isNativeETH(pair.currency0)) {
      return pair.currency0;
    }
    if (this.isNativeETH(pair.currency1)) {
      return pair.currency1;
    }
    return null;
  }

  /**
   * Validate currency pair
   * 
   * @param pair Currency pair to validate
   * @returns True if pair is valid
   */
  validatePair(pair: CurrencyPair): boolean {
    // Check that currencies are different
    if (pair.currency0 === pair.currency1) {
      return false;
    }

    // Check that currencies are valid addresses or native ETH
    if (!this.isValidCurrency(pair.currency0) || !this.isValidCurrency(pair.currency1)) {
      return false;
    }

    return true;
  }

  /**
   * Check if currency address is valid
   * 
   * @param currency Currency address to validate
   * @returns True if currency is valid
   */
  private isValidCurrency(currency: Currency): boolean {
    if (this.isNativeETH(currency)) {
      return true;
    }
    return /^0x[a-fA-F0-9]{40}$/.test(currency);
  }

  /**
   * Create currency pair from two currencies
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Normalized currency pair
   */
  createPair(currency0: Currency, currency1: Currency): CurrencyPair {
    return this.normalize(currency0, currency1);
  }

  /**
   * Get all possible currency pair representations
   * 
   * @param currency0 First currency
   * @param currency1 Second currency
   * @returns Array of both possible orderings
   */
  getAllRepresentations(currency0: Currency, currency1: Currency): CurrencyPair[] {
    return [
      { currency0: currency0.toLowerCase(), currency1: currency1.toLowerCase() },
      { currency0: currency1.toLowerCase(), currency1: currency0.toLowerCase() }
    ];
  }

  /**
   * Check if a currency pair matches any of the given pairs
   * 
   * @param pair Currency pair to check
   * @param pairs Array of currency pairs to match against
   * @returns True if pair matches any of the given pairs
   */
  matchesAny(pair: CurrencyPair, pairs: CurrencyPair[]): boolean {
    return pairs.some(p => this.matches(pair, p));
  }

  /**
   * Find matching currency pair from array
   * 
   * @param pair Currency pair to find
   * @param pairs Array of currency pairs to search
   * @returns Matching currency pair or null
   */
  findMatch(pair: CurrencyPair, pairs: CurrencyPair[]): CurrencyPair | null {
    return pairs.find(p => this.matches(pair, p)) || null;
  }

  /**
   * Get currency pair statistics
   * 
   * @param pairs Array of currency pairs
   * @returns Statistics about the currency pairs
   */
  getPairStats(pairs: CurrencyPair[]): {
    totalPairs: number;
    nativeETHPairs: number;
    uniqueCurrencies: Set<Currency>;
    currencyFrequency: Map<Currency, number>;
  } {
    const uniqueCurrencies = new Set<Currency>();
    const currencyFrequency = new Map<Currency, number>();
    let nativeETHPairs = 0;

    for (const pair of pairs) {
      if (this.containsNativeETH(pair)) {
        nativeETHPairs++;
      }

      uniqueCurrencies.add(pair.currency0);
      uniqueCurrencies.add(pair.currency1);

      currencyFrequency.set(pair.currency0, (currencyFrequency.get(pair.currency0) || 0) + 1);
      currencyFrequency.set(pair.currency1, (currencyFrequency.get(pair.currency1) || 0) + 1);
    }

    return {
      totalPairs: pairs.length,
      nativeETHPairs,
      uniqueCurrencies,
      currencyFrequency
    };
  }
}
