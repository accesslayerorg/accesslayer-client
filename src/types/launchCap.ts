/**
 * Types for launch window purchase cap with ramping per-wallet limit (#1385).
 */

export interface LaunchCapStep {
	/** Timestamp in milliseconds when this cap tier becomes active. */
	timestamp: number;
	/** Maximum cumulative keys allowed per wallet at this step. */
	cap: number;
	/** Optional human-readable step label (e.g., 'Tier 1', 'Launch', 'Hour 2'). */
	label?: string;
}

export interface LaunchCapConfig {
	enabled: boolean;
	/** Launch window start timestamp in milliseconds. */
	windowStart?: number;
	/** Launch window end timestamp in milliseconds. */
	windowEnd: number;
	/** Creator wallet address (exempt from launch cap). */
	creatorAddress?: string;
	/** Allowlisted wallet addresses (exempt from launch cap). */
	allowlist?: string[];
	/** Ramping steps of cap against time, sorted by timestamp ascending. */
	steps: LaunchCapStep[];
}

export interface NextCapIncrease {
	/** Timestamp in milliseconds when the cap increases. */
	timestamp: number;
	/** The new cap value at that timestamp. */
	cap: number;
}

export interface LaunchCapData {
	/** Current active cap limit for this wallet, or null if no cap/ended. */
	currentCap: number | null;
	/** Cumulative keys purchased by this wallet during this launch window. */
	purchasedAmount: number;
	/** Remaining keys this wallet can buy (currentCap - purchasedAmount, or Infinity if exempt). */
	remainingAllowance: number;
	/** Timestamp in ms when the launch window ends, or null if none. */
	windowEnd: number | null;
	/** Next scheduled cap increase, or null if at final tier or window ended. */
	nextIncrease: NextCapIncrease | null;
	/** True if wallet is exempt (creator or allowlist). */
	isExempt: boolean;
	/** Reason for exemption: 'creator' | 'allowlist' | null. */
	exemptionReason?: 'creator' | 'allowlist' | null;
	/** True if current time is at or beyond windowEnd. */
	isWindowEnded: boolean;
	/** True if a launch cap is configured and active. */
	hasCap: boolean;
	/** The schedule steps for rendering the ramp chart. */
	rampSteps: LaunchCapStep[];
	/** Method to record a purchase for this key/wallet. */
	recordPurchase: (amount: number) => void;
}
