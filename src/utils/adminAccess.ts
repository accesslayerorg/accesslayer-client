import { env } from '@/utils/env.utils';

/**
 * Returns whether the connected wallet is explicitly configured as an admin.
 *
 * This is intentionally fail-closed: an unset or empty allowlist grants no
 * access. The server must still authorize every multi-sig API request.
 */
export function isAdminWallet(address?: string): boolean {
	if (!address) return false;

	const allowedWallets = (env.VITE_ADMIN_WALLETS ?? '')
		.split(',')
		.map(wallet => wallet.trim())
		.filter(Boolean);

	return allowedWallets.some(
		allowedWallet => allowedWallet.toLowerCase() === address.toLowerCase()
	);
}
