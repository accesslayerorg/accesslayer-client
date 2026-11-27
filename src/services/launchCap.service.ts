/**
 * Launch Cap Service (#1385).
 *
 * Tracks cumulative launch window purchases per wallet and calculates
 * the active ramping purchase cap, remaining allowance, next cap increase,
 * and exemptions for creators and allowlisted wallets.
 */

import type {
	LaunchCapConfig,
	LaunchCapData,
	NextCapIncrease,
} from '@/types/launchCap';

type Listener = () => void;

class LaunchCapService {
	/** Cumulative purchases: `${keyId}:${wallet.toLowerCase()}` -> amount */
	private purchases = new Map<string, number>();

	/** Launch cap configs keyed by keyId */
	private configs = new Map<string, LaunchCapConfig>();

	/** Change listeners for reactivity */
	private listeners = new Set<Listener>();

	private getStorageKey(keyId: string, wallet: string): string {
		return `${keyId}:${wallet.trim().toLowerCase()}`;
	}

	/**
	 * Registers or updates a launch cap config for a key.
	 */
	setConfig(keyId: string, config: LaunchCapConfig | null): void {
		if (!config) {
			this.configs.delete(keyId);
		} else {
			// Ensure steps are sorted by timestamp
			const sortedSteps = [...config.steps].sort(
				(a, b) => a.timestamp - b.timestamp
			);
			this.configs.set(keyId, { ...config, steps: sortedSteps });
		}
		this.notify();
	}

	/**
	 * Retrieves the launch cap configuration for a key, if any.
	 */
	getConfig(keyId: string): LaunchCapConfig | undefined {
		return this.configs.get(keyId);
	}

	/**
	 * Returns cumulative purchases by a wallet for a key.
	 */
	getPurchasedAmount(keyId: string, wallet?: string | null): number {
		if (!wallet) return 0;
		return this.purchases.get(this.getStorageKey(keyId, wallet)) ?? 0;
	}

	/**
	 * Records a purchase for a wallet and key, updating cumulative tracking.
	 */
	recordPurchase(keyId: string, wallet?: string | null, amount: number = 1): void {
		if (!keyId || !wallet || amount <= 0) return;
		const storageKey = this.getStorageKey(keyId, wallet);
		const current = this.purchases.get(storageKey) ?? 0;
		this.purchases.set(storageKey, current + amount);
		this.notify();
	}

	/**
	 * Evaluates the launch cap state for a key and wallet at a given timestamp.
	 */
	getLaunchCap(
		keyId: string | undefined,
		wallet: string | null | undefined,
		nowMs: number = Date.now(),
		overrideConfig?: LaunchCapConfig
	): LaunchCapData {
		const emptyResult: LaunchCapData = {
			currentCap: null,
			purchasedAmount: 0,
			remainingAllowance: Infinity,
			windowEnd: null,
			nextIncrease: null,
			isExempt: false,
			exemptionReason: null,
			isWindowEnded: false,
			hasCap: false,
			rampSteps: [],
			recordPurchase: (qty: number) => {
				if (keyId && wallet) this.recordPurchase(keyId, wallet, qty);
			},
		};

		if (!keyId) return emptyResult;

		const config = overrideConfig ?? this.getConfig(keyId);
		if (!config || !config.enabled || config.steps.length === 0) {
			return emptyResult;
		}

		const isWindowEnded = nowMs >= config.windowEnd;
		const purchasedAmount = this.getPurchasedAmount(keyId, wallet);

		// Check exemptions (creator and allowlisted wallets)
		const normalizedWallet = wallet?.trim().toLowerCase() ?? '';
		const normalizedCreator = config.creatorAddress?.trim().toLowerCase();
		const isCreator = Boolean(
			normalizedWallet && normalizedCreator && normalizedWallet === normalizedCreator
		);
		const isAllowlisted = Boolean(
			normalizedWallet &&
				config.allowlist?.some(
					addr => addr.trim().toLowerCase() === normalizedWallet
				)
		);

		const isExempt = isCreator || isAllowlisted;
		const exemptionReason: 'creator' | 'allowlist' | null = isCreator
			? 'creator'
			: isAllowlisted
				? 'allowlist'
				: null;

		// Calculate current cap and next increase from schedule
		const steps = config.steps;
		let currentCap: number | null = null;
		let nextIncrease: NextCapIncrease | null = null;

		if (!isWindowEnded) {
			if (nowMs < steps[0].timestamp) {
				// Before the first step
				currentCap = steps[0].cap;
				nextIncrease = { timestamp: steps[0].timestamp, cap: steps[0].cap };
			} else {
				// Find the latest step that has started
				for (let i = steps.length - 1; i >= 0; i--) {
					if (steps[i].timestamp <= nowMs) {
						currentCap = steps[i].cap;
						break;
					}
				}
				if (currentCap === null) {
					currentCap = steps[0].cap;
				}

				// Find the earliest upcoming step
				const upcomingStep = steps.find(s => s.timestamp > nowMs);
				if (upcomingStep) {
					nextIncrease = {
						timestamp: upcomingStep.timestamp,
						cap: upcomingStep.cap,
					};
				}
			}
		}

		// Calculate remaining allowance
		let remainingAllowance = Infinity;
		if (!isWindowEnded && currentCap !== null && !isExempt) {
			remainingAllowance = Math.max(0, currentCap - purchasedAmount);
		}

		return {
			currentCap,
			purchasedAmount,
			remainingAllowance,
			windowEnd: config.windowEnd,
			nextIncrease,
			isExempt,
			exemptionReason,
			isWindowEnded,
			hasCap: true,
			rampSteps: steps,
			recordPurchase: (qty: number) => {
				if (wallet) this.recordPurchase(keyId, wallet, qty);
			},
		};
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach(fn => {
			try {
				fn();
			} catch (e) {
				console.error('Error in launch cap listener:', e);
			}
		});
	}

	/**
	 * Resets purchases and configs for testing.
	 */
	reset(): void {
		this.purchases.clear();
		this.configs.clear();
		this.notify();
	}
}

export const launchCapService = new LaunchCapService();
