import { describe, expect, it, vi } from 'vitest';
import { FreighterSigner, type FreighterApiAdapter } from '../freighter-signer';

function api(
	overrides: Partial<FreighterApiAdapter> = {}
): FreighterApiAdapter {
	return {
		isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
		getAddress: vi.fn().mockResolvedValue({ address: 'GTEST' }),
		getNetworkDetails: vi
			.fn()
			.mockResolvedValue({ networkPassphrase: 'test network' }),
		signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: 'signed-xdr' }),
		...overrides,
	};
}

describe('FreighterSigner', () => {
	it('signs only when Freighter is on the expected network', async () => {
		const adapter = api();
		const signer = new FreighterSigner('test network', adapter);
		await expect(signer.sign('unsigned-xdr')).resolves.toBe('signed-xdr');
		expect(adapter.signTransaction).toHaveBeenCalledWith('unsigned-xdr', {
			networkPassphrase: 'test network',
			address: 'GTEST',
		});
	});

	it('classifies a different Freighter network', async () => {
		const signer = new FreighterSigner(
			'test network',
			api({
				getNetworkDetails: vi
					.fn()
					.mockResolvedValue({ networkPassphrase: 'public network' }),
			})
		);
		await expect(signer.sign('xdr')).rejects.toMatchObject({
			type: 'NetworkMismatch',
		});
	});
});
