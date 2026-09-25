import { shortenAddress } from '@/lib/web3/format';

export interface WalletDisconnectLogEntry {
	truncated_address: string;
	session_duration_ms: number;
	disconnected_at: string;
}

export function createWalletDisconnectLog(
	address: string,
	connectedAt: number,
	disconnectedAt: number = Date.now()
): WalletDisconnectLogEntry {
	return {
		truncated_address: shortenAddress(address),
		session_duration_ms: Math.max(0, disconnectedAt - connectedAt),
		disconnected_at: new Date(disconnectedAt).toISOString(),
	};
}

export function logWalletDisconnectSession(
	address: string,
	connectedAt: number,
	disconnectedAt: number = Date.now()
) {
	if (process.env.NODE_ENV === 'test') {
		return;
	}

	console.debug(
		'[wallet-disconnect]',
		createWalletDisconnectLog(address, connectedAt, disconnectedAt)
	);
}
