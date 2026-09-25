/**
 * Allowance approval store (#955).
 *
 * Manages whether the staking contract has sufficient allowance to transfer
 * a user's creator keys. The flow is:
 *
 *  1. Before the staking flow begins, call `checkAllowance(address)`.
 *  2. If `needsApproval` is true, surface the approval step UI.
 *  3. User submits the approve transaction → call `submitApproval(address)`.
 *  4. On success the approval is cached for the session — subsequent staking
 *     actions skip the approval step automatically.
 *
 * A real implementation would call `token.allowance(owner, spakingContract)`
 * then `token.approve(stakingContract, amount)` via ethers. Here we simulate
 * both operations so the UI is fully exercisable without on-chain infra.
 *
 * Cache scope: in-memory (store lifetime). Resets on page reload — the spec
 * says "cached for the session", which aligns with Zustand's default
 * (no persistence middleware).
 */

import { create } from 'zustand';

export type AllowanceStatus =
	| 'idle'
	| 'checking'
	| 'sufficient'
	| 'insufficient'
	| 'approving'
	| 'approved'
	| 'error';

interface AllowanceState {
	status: AllowanceStatus;
	/** Wallet addresses that have been approved this session (cached). */
	approvedAddresses: Set<string>;
	/** Error message when status === 'error'. */
	errorMessage: string | null;

	// actions
	checkAllowance: (walletAddress: string) => Promise<void>;
	submitApproval: (walletAddress: string) => Promise<void>;
	reset: () => void;
	/** Testing helper to manually mark an address as approved */
	_setApproved: (walletAddress: string) => void;
}

const isTestEnv =
	typeof process !== 'undefined' &&
	(process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true');

/** Simulated allowance check — replace with real ethers call when ABI lands. */
async function simulateAllowanceCheck(walletAddress: string): Promise<boolean> {
	if (!isTestEnv) {
		await new Promise<void>(r => window.setTimeout(r, 400));
	}
	void walletAddress;
	return false; // insufficient by default until approved
}

/** Simulated approve tx — replace with real ethers call when ABI lands. */
async function simulateApproveTransaction(
	walletAddress: string
): Promise<void> {
	if (!isTestEnv) {
		await new Promise<void>(r => window.setTimeout(r, 600));
	}
	void walletAddress;
	// Succeeds silently; errors would throw.
}

export const useAllowanceStore = create<AllowanceState>((set, get) => ({
	status: 'idle',
	approvedAddresses: new Set<string>(),
	errorMessage: null,

	checkAllowance: async (walletAddress: string) => {
		const normalized = walletAddress.toLowerCase();
		// If already approved this session, skip the check.
		if (get().approvedAddresses.has(normalized)) {
			set({ status: 'sufficient', errorMessage: null });
			return;
		}

		set({ status: 'checking', errorMessage: null });
		try {
			const sufficient = await simulateAllowanceCheck(normalized);
			set({ status: sufficient ? 'sufficient' : 'insufficient' });
		} catch (e) {
			set({
				status: 'error',
				errorMessage:
					e instanceof Error ? e.message : 'Failed to check allowance.',
			});
		}
	},

	submitApproval: async (walletAddress: string) => {
		const normalized = walletAddress.toLowerCase();
		set({ status: 'approving', errorMessage: null });
		try {
			await simulateApproveTransaction(normalized);
			// Cache the approval for the rest of the session.
			const next = new Set(get().approvedAddresses);
			next.add(normalized);
			set({ status: 'approved', approvedAddresses: next });
		} catch (e) {
			set({
				status: 'error',
				errorMessage:
					e instanceof Error ? e.message : 'Approval transaction failed.',
			});
		}
	},

	_setApproved: (walletAddress: string) => {
		const normalized = walletAddress.toLowerCase();
		const next = new Set(get().approvedAddresses);
		next.add(normalized);
		set({ status: 'sufficient', approvedAddresses: next, errorMessage: null });
	},

	reset: () => set({ status: 'idle', errorMessage: null }),
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function selectNeedsApproval(state: AllowanceState): boolean {
	return state.status === 'insufficient';
}

export function selectApprovalComplete(state: AllowanceState): boolean {
	return state.status === 'sufficient' || state.status === 'approved';
}
