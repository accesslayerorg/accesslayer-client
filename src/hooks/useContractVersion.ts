import { useEffect, useState } from 'react';

export interface PendingUpgrade {
	/** Target implementation version of the pending upgrade. */
	version: string;
	/** Unix timestamp (ms) at which the upgrade becomes executable. */
	executableAt: number;
}

export interface ContractVersionState {
	/** Currently active implementation version. */
	currentVersion: string;
	/** Pending upgrade, or null when none is scheduled. */
	pendingUpgrade: PendingUpgrade | null;
}

const DEFAULT_STATE: ContractVersionState = {
	currentVersion: '',
	pendingUpgrade: null,
};

/**
 * Resolves the current implementation version and any pending upgrade
 * from the protocol upgrade proxy.
 *
 * The proxy exposes this information via a JSON endpoint at
 * `/api/contract-version`. The hook fetches it on mount and returns a
 * safe default while loading or when the request fails.
 */
export function useContractVersion(): ContractVersionState {
	const [state, setState] = useState<ContractVersionState>(DEFAULT_STATE);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const response = await fetch('/api/contract-version', {
					headers: { Accept: 'application/json' },
				});
				if (!response.ok) {
					throw new Error(
						`Failed to load contract version: ${response.status}`
					);
				}
				const data = (await response.json()) as ContractVersionState;
				if (cancelled) return;
				setState({
					currentVersion: data.currentVersion,
					pendingUpgrade: data.pendingUpgrade ?? null,
				});
			} catch {
				if (cancelled) return;
				// Fail silently: keep the safe default state so the UI is unaffected.
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, []);

	return state;
}

export default useContractVersion;
