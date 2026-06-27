import { useEffect, useState } from 'react';

export const WALLET_CONNECTION_STALL_TIMEOUT_MS = 10_000;

export const WALLET_CONNECTION_AD_BLOCKER_MESSAGE =
	'No wallet response yet. If your wallet prompt did not open, an ad blocker or privacy extension may be blocking the wallet script. Disable it for this site, then try connecting again.';

interface UseWalletConnectionStallDetectionOptions {
	/** True while the app is waiting for a wallet connector to respond. */
	isAwaitingWalletResponse: boolean;
	/** True once the wallet attempt has connected, failed, or otherwise returned. */
	hasWalletResponse?: boolean;
	/** Override mainly for tests or specialized wallet flows. */
	timeoutMs?: number;
}

/**
 * Flags wallet connection attempts that remain pending long enough to suggest
 * browser extensions may have blocked the injected wallet script.
 */
export function useWalletConnectionStallDetection({
	isAwaitingWalletResponse,
	hasWalletResponse = false,
	timeoutMs = WALLET_CONNECTION_STALL_TIMEOUT_MS,
}: UseWalletConnectionStallDetectionOptions): boolean {
	const [hasStalled, setHasStalled] = useState(false);

	useEffect(() => {
		if (!isAwaitingWalletResponse || hasWalletResponse) {
			setHasStalled(false);
			return undefined;
		}

		const timeoutId = window.setTimeout(() => {
			setHasStalled(true);
		}, timeoutMs);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [hasWalletResponse, isAwaitingWalletResponse, timeoutMs]);

	return hasStalled;
}
