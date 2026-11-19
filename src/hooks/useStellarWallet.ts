import type { Signer } from '@/lib/signing/types';

export interface UseStellarWalletResult {
	address?: string;
	isConnected: boolean;
	loading: boolean;
	activeSigner: Signer | null;
}

/**
 * Lightweight shared wallet surface used by Stellar-facing views.
 *
 * The full wallet/signer stack is not wired into this client yet; keeping the
 * hook dependency-free lets consumers read a stable `{ address, isConnected,
 * loading, activeSigner }` shape and lets tests override it wholesale.
 */
export function useStellarWallet(): UseStellarWalletResult {
	const activeSigner: Signer | null = null;

	return {
		address: undefined,
		isConnected: false,
		loading: false,
		activeSigner,
	};
}

export default useStellarWallet;
