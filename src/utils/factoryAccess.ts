import { env } from '@/utils/env.utils';

/**
 * Returns whether the connected wallet is configured as a whitelisted creator
 * allowed to deploy new keys through the factory contract (#959).
 *
 * This is intentionally fail-closed, mirroring `isAdminWallet`: an unset or
 * empty allowlist grants no access and the wizard is hidden entirely. The
 * factory contract must still authorize the deployment itself — this is only a
 * client-side affordance.
 */
export function isKeyFactoryWhitelisted(address?: string): boolean {
	if (!address) return false;

	const allowlist = (env.VITE_KEY_FACTORY_WHITELIST ?? '')
		.split(',')
		.map(wallet => wallet.trim())
		.filter(Boolean);

	return allowlist.some(
		allowedWallet => allowedWallet.toLowerCase() === address.toLowerCase()
	);
}
