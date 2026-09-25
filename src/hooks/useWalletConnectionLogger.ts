import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { shortenAddress } from '@/lib/web3/format';

export interface WalletConnectionLog {
	truncated_address: string;
	connection_method: string;
	connected_at: string;
}

interface UseWalletConnectionLoggerOptions {
	/**
	 * Suppresses log emission when true. Defaults to detecting the Vitest
	 * runner via `process.env.NODE_ENV`; injectable so the hook itself can be
	 * tested.
	 */
	isTestEnv?: boolean;
}

/**
 * Emits a debug-level structured log the moment a wallet connection
 * succeeds, so developers can trace wallet session activity without relying
 * on browser extension logs.
 *
 * Dedupes on the connected address: the log fires once per distinct
 * connection, not on every re-render and not again for unrelated state or
 * query cache updates that leave the address unchanged. Disconnecting resets
 * the dedupe key, so a later reconnection (same or different address) logs
 * again.
 *
 * The full wallet address is never logged — only the truncated form
 * (first 4 + last 4 characters).
 */
export function useWalletConnectionLogger({
	isTestEnv = process.env.NODE_ENV === 'test',
}: UseWalletConnectionLoggerOptions = {}): void {
	const { address, isConnected, connector } = useAccount();
	const loggedAddressRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (!isConnected || !address) {
			loggedAddressRef.current = undefined;
			return;
		}

		if (loggedAddressRef.current === address) {
			return;
		}
		loggedAddressRef.current = address;

		if (isTestEnv) return;

		const log: WalletConnectionLog = {
			truncated_address: shortenAddress(address),
			connection_method: connector?.name ?? connector?.id ?? 'unknown',
			connected_at: new Date().toISOString(),
		};

		console.debug('[wallet-connection]', log);
	}, [address, isConnected, connector, isTestEnv]);
}
