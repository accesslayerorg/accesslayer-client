/**
 * Contract pause state store (#953).
 *
 * Polls whether the contract's emergency pause is active. A real
 * implementation would call `contract.paused()` via ethers; here we
 * simulate the check with a random-flip stub so the UI is fully testable
 * without on-chain infrastructure.
 *
 * Polling cadence: every 60 seconds (per spec), and once on first mount via
 * `startPolling()`. The store is a singleton — callers call `startPolling()`
 * in a top-level effect; redundant calls are no-ops.
 */

import { create } from 'zustand';

export type PauseStatus = 'unknown' | 'active' | 'inactive';

interface ContractPausedState {
	/** Current pause status. `unknown` until first poll resolves. */
	status: PauseStatus;
	/** ISO timestamp of the last successful poll. */
	lastCheckedAt: string | null;
	/** Whether a poll is currently in-flight. */
	isChecking: boolean;
	/** Interval handle — stored so `stopPolling` can clear it. */
	_intervalId: ReturnType<typeof setInterval> | null;

	// actions
	/** Start polling (idempotent — safe to call multiple times). */
	startPolling: () => void;
	/** Stop polling and clean up the interval. */
	stopPolling: () => void;
	/** Set pause state (for admin panel or tests). */
	setPaused: (paused: boolean) => void;
	/** Toggle pause state. */
	togglePause: () => void;
	/** Manually override pause state (alias for setPaused). */
	_setPaused: (paused: boolean) => void;
}

/** Simulated contract check — replace with real ethers call when ABI lands. */
async function simulatePauseCheck(): Promise<boolean> {
	// Simulate ~200ms network latency.
	await new Promise<void>(r => window.setTimeout(r, 200));
	// Contract starts unpaused; stays unpaused unless explicitly toggled via
	// the admin panel. We return `false` so the UI looks normal by default.
	return false;
}

export const POLL_INTERVAL_MS = 60_000;

export const useContractPausedStore = create<ContractPausedState>(
	(set, get) => ({
		status: 'unknown',
		lastCheckedAt: null,
		isChecking: false,
		_intervalId: null,

		startPolling: () => {
			// Idempotent — don't create a second interval.
			if (get()._intervalId !== null) return;

			const poll = async () => {
				if (get().isChecking) return;
				set({ isChecking: true });
				try {
					const paused = await simulatePauseCheck();
					set({
						status: paused ? 'active' : 'inactive',
						lastCheckedAt: new Date().toISOString(),
					});
				} catch {
					// Network error — keep last known status, don't crash.
				} finally {
					set({ isChecking: false });
				}
			};

			// Fire immediately, then on interval.
			poll();
			const id = setInterval(poll, POLL_INTERVAL_MS);
			set({ _intervalId: id });
		},

		stopPolling: () => {
			const id = get()._intervalId;
			if (id !== null) clearInterval(id);
			set({ _intervalId: null });
		},

		setPaused: (paused: boolean) => {
			set({
				status: paused ? 'active' : 'inactive',
				lastCheckedAt: new Date().toISOString(),
			});
		},

		togglePause: () => {
			const isPaused = get().status === 'active';
			set({
				status: isPaused ? 'inactive' : 'active',
				lastCheckedAt: new Date().toISOString(),
			});
		},

		_setPaused: (paused: boolean) => {
			set({
				status: paused ? 'active' : 'inactive',
				lastCheckedAt: new Date().toISOString(),
			});
		},
	})
);

// ---------------------------------------------------------------------------
// Admin Authorization (#953)
// ---------------------------------------------------------------------------

export const AUTHORIZED_ADMIN_WALLETS = new Set<string>([
	// Well-known default admin / deployer / anvil address
	'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
	'0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
]);

export function isAuthorizedAdminWallet(address?: string | null): boolean {
	if (!address) return false;
	const normalized = address.toLowerCase();
	const envAdmin = (import.meta.env?.VITE_ADMIN_WALLET as string | undefined)?.toLowerCase();
	if (envAdmin && normalized === envAdmin) return true;
	return AUTHORIZED_ADMIN_WALLETS.has(normalized);
}

export function addAuthorizedAdminWallet(address: string): void {
	AUTHORIZED_ADMIN_WALLETS.add(address.toLowerCase());
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function selectIsPaused(state: ContractPausedState): boolean {
	return state.status === 'active';
}

export function selectPauseKnown(state: ContractPausedState): boolean {
	return state.status !== 'unknown';
}
