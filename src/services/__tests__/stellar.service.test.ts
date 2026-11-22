import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	resolveFederationAddress,
	FederationServer,
	clearFederationCache,
	FederationError,
} from '../stellar';

const VALID_ACCOUNT_ID =
	'GB5XVAABEQMY63WTHDQ5RXADGYF345VWMNPTN2GFUDZT57D57ZQTJ7PS';

describe('resolveFederationAddress', () => {
	beforeEach(() => {
		clearFederationCache();
		vi.restoreAllMocks();
	});

	it('resolves a valid federation address to a Stellar account ID', async () => {
		vi.spyOn(FederationServer, 'resolve').mockResolvedValueOnce({
			account_id: VALID_ACCOUNT_ID,
		});

		const result = await resolveFederationAddress('alice*example.com');
		expect(result).toBe(VALID_ACCOUNT_ID);
		expect(FederationServer.resolve).toHaveBeenCalledWith(
			'alice*example.com'
		);
	});

	it('bypasses network resolution for raw public keys', async () => {
		const spy = vi.spyOn(FederationServer, 'resolve');

		const result = await resolveFederationAddress(VALID_ACCOUNT_ID);
		expect(result).toBe(VALID_ACCOUNT_ID);
		expect(spy).not.toHaveBeenCalled();
	});

	it('throws INVALID_DOMAIN for malformed federation addresses or invalid domains', async () => {
		await expect(
			resolveFederationAddress('alice*invalid..domain')
		).rejects.toThrow('Invalid federation domain');

		await expect(resolveFederationAddress('alice*')).rejects.toThrow(
			'Invalid federation domain'
		);

		await expect(resolveFederationAddress('*example.com')).rejects.toThrow(
			'Invalid federation domain'
		);

		await expect(
			resolveFederationAddress('alice*example*com')
		).rejects.toThrow('Invalid federation domain');
	});

	it('throws distinct NOT_FOUND error when federation account is not found', async () => {
		vi.spyOn(FederationServer, 'resolve').mockRejectedValueOnce({
			message: 'Request failed with status code 404',
			response: { status: 404 },
		});

		try {
			await resolveFederationAddress('unknown*example.com');
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(FederationError);
			expect((error as FederationError).code).toBe('NOT_FOUND');
			expect((error as FederationError).message).toBe(
				'Federation address not found'
			);
		}
	});

	it('throws distinct NETWORK_ERROR on connection failure or server error', async () => {
		vi.spyOn(FederationServer, 'resolve').mockRejectedValueOnce(
			new Error('fetch failed')
		);

		try {
			await resolveFederationAddress('bob*example.com');
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(FederationError);
			expect((error as FederationError).code).toBe('NETWORK_ERROR');
			expect((error as FederationError).message).toBe(
				'Network error resolving address'
			);
		}
	});

	it('caches successful resolutions and does not hit the network repeatedly', async () => {
		const spy = vi
			.spyOn(FederationServer, 'resolve')
			.mockResolvedValue({ account_id: VALID_ACCOUNT_ID });

		const firstResult = await resolveFederationAddress('alice*example.com');
		expect(firstResult).toBe(VALID_ACCOUNT_ID);
		expect(spy).toHaveBeenCalledTimes(1);

		// Second call with same address (case insensitive)
		const secondResult = await resolveFederationAddress('ALICE*EXAMPLE.COM');
		expect(secondResult).toBe(VALID_ACCOUNT_ID);
		expect(spy).toHaveBeenCalledTimes(1);

		// After clearing cache, network is called again
		clearFederationCache();
		const thirdResult = await resolveFederationAddress('alice*example.com');
		expect(thirdResult).toBe(VALID_ACCOUNT_ID);
		expect(spy).toHaveBeenCalledTimes(2);
	});
});
