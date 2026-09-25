/**
 * Holding cap store (#961).
 *
 * Tracks the connected wallet's current key holdings and the contract-defined
 * maximum holding cap for a given creator. Exposes helpers for:
 *  - Showing a progress indicator (% of cap used).
 *  - Displaying a warning banner at ≥80% cap utilisation.
 *  - Capping the buy input to the remaining allowable quantity.
 *  - Disabling the buy button when the cap is reached (100%).
 *
 * A real implementation would read `contract.balanceOf(wallet, creatorId)`
 * and `contract.maxHoldingCap(creatorId)` on-chain; here we simulate both
 * so the UI is fully exercisable without contract infrastructure.
 */

import { create } from 'zustand';

export interface HoldingCapData {
	creatorId: string;
	/** How many keys the wallet currently holds for this creator. */
	currentHolding: number;
	/** Contract-defined maximum a single wallet may hold. */
	maxCap: number;
	/** True while the data is being fetched. */
	isLoading: boolean;
	/** Error message from a failed fetch. */
	error: string | null;
}

interface HoldingCapState {
	/** Keyed by creatorId. */
	caps: Record<string, HoldingCapData>;

	// actions
	fetchCap: (creatorId: string, walletAddress: string) => Promise<void>;
	/** Update holding after a successful buy (avoids a full re-fetch). */
	incrementHolding: (creatorId: string, qty: number) => void;
}

/** Simulated on-chain fetch — replace with real ethers calls when ABI lands. */
async function simulateFetchHoldingCap(
	creatorId: string,
	walletAddress: string
): Promise<{ currentHolding: number; maxCap: number }> {
	await new Promise<void>(r => window.setTimeout(r, 350));
	void walletAddress;
	// Deterministic demo values keyed by last char of creatorId so different
	// creator cards show different cap utilisation states in the UI.
	const seed = creatorId.charCodeAt(creatorId.length - 1) % 5;
	const maxCap = 50;
	const holdings = [0, 10, 38, 45, 50][seed] ?? 0;
	return { currentHolding: holdings, maxCap };
}

export const useHoldingCapStore = create<HoldingCapState>((set, get) => ({
	caps: {},

	fetchCap: async (creatorId, walletAddress, force = false) => {
		const existing = get().caps[creatorId];
		if (existing && !existing.isLoading && !force && existing.maxCap > 0) {
			return;
		}

		// Mark as loading.
		set(state => ({
			caps: {
				...state.caps,
				[creatorId]: {
					...(state.caps[creatorId] ?? {
						creatorId,
						currentHolding: 0,
						maxCap: 0,
						error: null,
					}),
					isLoading: true,
				},
			},
		}));

		try {
			const { currentHolding, maxCap } = await simulateFetchHoldingCap(
				creatorId,
				walletAddress
			);
			set(state => ({
				caps: {
					...state.caps,
					[creatorId]: {
						creatorId,
						currentHolding,
						maxCap,
						isLoading: false,
						error: null,
					},
				},
			}));
		} catch (e) {
			set(state => ({
				caps: {
					...state.caps,
					[creatorId]: {
						...(state.caps[creatorId] ?? {
							creatorId,
							currentHolding: 0,
							maxCap: 0,
						}),
						isLoading: false,
						error:
							e instanceof Error
								? e.message
								: 'Failed to fetch holding cap.',
					},
				},
			}));
		}
	},

	incrementHolding: (creatorId, qty) => {
		const existing = get().caps[creatorId];
		if (!existing) return;
		set(state => ({
			caps: {
				...state.caps,
				[creatorId]: {
					...existing,
					currentHolding: Math.min(
						existing.currentHolding + qty,
						existing.maxCap
					),
				},
			},
		}));
	},
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Fraction of the cap consumed (0–1). */
export function capUsedFraction(data: HoldingCapData): number {
	if (data.maxCap === 0) return 0;
	return Math.min(data.currentHolding / data.maxCap, 1);
}

/** True when ≥80% of the cap is consumed. */
export function isApproachingCap(data: HoldingCapData): boolean {
	return capUsedFraction(data) >= 0.8 && data.currentHolding < data.maxCap;
}

/** True when the wallet is at 100% of the cap. */
export function isAtHoldingCap(data: HoldingCapData): boolean {
	return data.currentHolding >= data.maxCap && data.maxCap > 0;
}

/** How many more keys the wallet may buy. */
export function remainingCapacity(data: HoldingCapData): number {
	return Math.max(0, data.maxCap - data.currentHolding);
}
