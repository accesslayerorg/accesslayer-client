/**
 * Fractional wrapper utilities for wrapping keys into shares and unwrapping shares back into keys.
 * 
 * Each key is divided into a fixed number of shares (shares-per-key rate).
 * Holding shares entitles the holder to proportional dividends and royalties.
 */

/** Shares per key configuration - how many shares one whole key is divided into */
export const SHARES_PER_KEY = 1000 // Default: 1 key = 1000 shares

/** Interface for wrapper position data returned by the hook */
export interface WrapperPosition {
  keyId: string
  keyName: string
  walletAddress: string
  shareBalance: number        // Number of shares held by this wallet
  sharesPerKey: number        // Fixed rate: shares per whole key
  totalWrappedSupply: number  // Total shares across all wallets for this key
  isFullyWrapped: boolean     // Whether the wallet holds a full key (sharesPerKey multiple)
  dividendRate: number        // Proportional dividend rate (shares / sharesPerKey)
}

/** Interface for wrap/unwrap transaction parameters */
export interface WrapParams {
  keyId: string
  quantity: number            // Number of keys to wrap (can be fractional, e.g. 0.5)
  sharesMinted: number        // Exact shares to be minted = quantity * sharesPerKey
}

/** Interface for unwrapped key return */
export interface UnwrapResult {
  keysReturned: number        // Number of whole keys returned
  remainingShares: number     // Remaining shares after unwrapping whole keys
  isExactMultiple: boolean    // Whether the share count was a perfect multiple
}