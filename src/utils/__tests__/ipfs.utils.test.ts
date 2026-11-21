import { describe, it, expect } from 'vitest';
import { resolveIpfsUrl } from '@/utils/ipfs.utils';

describe('resolveIpfsUrl (#1033)', () => {
	it('returns null for empty or null input', () => {
		expect(resolveIpfsUrl(null)).toBeNull();
		expect(resolveIpfsUrl(undefined)).toBeNull();
		expect(resolveIpfsUrl('')).toBeNull();
		expect(resolveIpfsUrl('   ')).toBeNull();
	});

	it('returns http and https URLs unchanged', () => {
		expect(resolveIpfsUrl('https://example.com/image.png')).toBe(
			'https://example.com/image.png'
		);
		expect(resolveIpfsUrl('http://example.com/image.png')).toBe(
			'http://example.com/image.png'
		);
	});

	it('resolves ipfs:// URIs to gateway URLs', () => {
		expect(
			resolveIpfsUrl('ipfs://bafybeic75z3v653y795o5hz3hzq22p5x3lz3z3z3z3z3z3z3z3z3z3z3z')
		).toBe('https://ipfs.io/ipfs/bafybeic75z3v653y795o5hz3hzq22p5x3lz3z3z3z3z3z3z3z3z3z3z3z');
	});

	it('resolves raw IPFS CIDs to gateway URLs', () => {
		const qmCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
		expect(resolveIpfsUrl(qmCid)).toBe(`https://ipfs.io/ipfs/${qmCid}`);
	});
});
