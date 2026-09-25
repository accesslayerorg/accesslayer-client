import { mainnet } from 'wagmi/chains';
import { supportedChains } from '@/lib/web3/chains';

/**
 * Network classification for the nav status chip (issue #686).
 *
 * Only Ethereum mainnet is a live-value network among the supported chains;
 * anvil, sepolia and baseSepolia are all test environments. Treating anything
 * that is not mainnet as a testnet is the safe default — a new chain added to
 * `supportedChains` shows as "testnet" until someone deliberately promotes it,
 * rather than silently rendering a green "you are on mainnet" badge.
 */
export type NetworkKind = 'mainnet' | 'testnet' | 'unsupported';

export interface NetworkInfo {
	kind: NetworkKind;
	label: string;
	/** Tailwind classes for the badge. Green for mainnet, yellow for testnet. */
	badgeClass: string;
}

const MAINNET_CHAIN_IDS: readonly number[] = [mainnet.id];

export function describeNetwork(chainId: number | undefined): NetworkInfo {
	if (chainId === undefined) {
		return {
			kind: 'unsupported',
			label: 'Unknown network',
			badgeClass: 'bg-red-500/15 text-red-600 ring-red-500/30',
		};
	}

	const chain = supportedChains.find(c => c.id === chainId);
	if (!chain) {
		// The wallet is on a chain the app cannot talk to. Surfacing this as its
		// own state matters: showing "testnet" would imply the app works there.
		return {
			kind: 'unsupported',
			label: `Unsupported (${chainId})`,
			badgeClass: 'bg-red-500/15 text-red-600 ring-red-500/30',
		};
	}

	if (MAINNET_CHAIN_IDS.includes(chain.id)) {
		return {
			kind: 'mainnet',
			label: chain.name,
			badgeClass: 'bg-green-500/15 text-green-600 ring-green-500/30',
		};
	}

	return {
		kind: 'testnet',
		label: chain.name,
		badgeClass: 'bg-yellow-500/15 text-yellow-700 ring-yellow-500/30',
	};
}
