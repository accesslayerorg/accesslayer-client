import { describe, it, expect } from 'vitest';
import { mainnet, sepolia, baseSepolia, anvil } from 'wagmi/chains';
import { describeNetwork } from '@/lib/web3/network';

/** Issue #686 — network badge classification. */
describe('describeNetwork', () => {
	it('classifies Ethereum mainnet as mainnet with a green badge', () => {
		const info = describeNetwork(mainnet.id);
		expect(info.kind).toBe('mainnet');
		expect(info.badgeClass).toContain('green');
	});

	it.each([
		['sepolia', sepolia.id],
		['baseSepolia', baseSepolia.id],
		['anvil', anvil.id],
	])('classifies %s as testnet with a yellow badge', (_name, id) => {
		const info = describeNetwork(id);
		expect(info.kind).toBe('testnet');
		expect(info.badgeClass).toContain('yellow');
	});

	it('reports an unknown chain as unsupported, not testnet', () => {
		// Showing "testnet" for a chain the app cannot talk to would imply the
		// app works there.
		const info = describeNetwork(999_999);
		expect(info.kind).toBe('unsupported');
		expect(info.label).toContain('999999');
	});

	it('handles an undefined chain id', () => {
		expect(describeNetwork(undefined).kind).toBe('unsupported');
	});

	it('never labels a non-mainnet chain green', () => {
		// The safe default: a chain added to supportedChains later shows as
		// testnet until deliberately promoted, rather than silently rendering
		// "you are on mainnet".
		for (const id of [sepolia.id, baseSepolia.id, anvil.id, 42_161]) {
			expect(describeNetwork(id).badgeClass).not.toContain('green');
		}
	});
});
