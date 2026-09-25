import { describe, expect, it } from 'vitest';
import {
	buildStellarExpertTxUrl,
	truncateTxHash,
} from '@/constants/stellar';

describe('buildStellarExpertTxUrl', () => {
	it('builds a testnet explorer URL', () => {
		const txHash =
			'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
		const url = buildStellarExpertTxUrl(txHash, 'testnet');

		expect(url).toBe(
			`https://stellar.expert/explorer/testnet/tx/${txHash}`
		);
	});

	it('builds a mainnet explorer URL', () => {
		const txHash =
			'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
		const url = buildStellarExpertTxUrl(txHash, 'mainnet');

		expect(url).toBe(
			`https://stellar.expert/explorer/mainnet/tx/${txHash}`
		);
	});

	it('correctly distinguishes mainnet from testnet URLs', () => {
		const txHash = 'abc123';
		expect(buildStellarExpertTxUrl(txHash, 'mainnet')).toContain('/mainnet/');
		expect(buildStellarExpertTxUrl(txHash, 'testnet')).toContain('/testnet/');
		expect(buildStellarExpertTxUrl(txHash, 'mainnet')).not.toContain(
			'/testnet/'
		);
		expect(buildStellarExpertTxUrl(txHash, 'testnet')).not.toContain(
			'/mainnet/'
		);
	});

	it('includes the full tx hash in the URL', () => {
		const txHash = 'uniquetxhash123456';
		const url = buildStellarExpertTxUrl(txHash, 'testnet');
		expect(url).toContain(txHash);
	});
});

describe('truncateTxHash', () => {
	const fullHash =
		'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

	it('truncates a long hash with default prefix and suffix lengths', () => {
		const result = truncateTxHash(fullHash);

		expect(result).toBe('0xabcdef…567890');
	});

	it('uses 8 prefix chars and 6 suffix chars by default', () => {
		const result = truncateTxHash(fullHash);

		// First 8 chars: '0xabcdef'
		expect(result.startsWith('0xabcdef')).toBe(true);
		// Last 6 chars: '567890'
		expect(result.endsWith('567890')).toBe(true);
		// Has ellipsis separator
		expect(result).toContain('…');
	});

	it('respects custom prefix length', () => {
		const result = truncateTxHash(fullHash, 4, 4);

		expect(result).toBe('0xab…7890');
	});

	it('respects custom suffix length', () => {
		const result = truncateTxHash(fullHash, 6, 8);

		// First 6 chars: '0xabcd'
		expect(result.startsWith('0xabcd')).toBe(true);
		// Last 8 chars of fullHash
		expect(result.endsWith(fullHash.slice(-8))).toBe(true);
		expect(result).toContain('…');
	});

	it('returns hash unchanged when it is short enough', () => {
		const shortHash = '0xabc123';
		const result = truncateTxHash(shortHash);

		// Hash length (8) ≤ prefixLen(8) + suffixLen(6) + 1 = 15
		expect(result).toBe(shortHash);
	});

	it('handles hashes without 0x prefix', () => {
		const hash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
		const result = truncateTxHash(hash);

		expect(result).toBe('abcdef12…567890');
	});
});
