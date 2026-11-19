import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { CreatorKeysContractService } from '@/services/creatorKeysContract.service';

vi.mock('@/utils/env.utils', () => ({
	env: {
		VITE_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
		VITE_CREATOR_KEYS_CONTRACT_ID:
			'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
		VITE_STELLAR_NETWORK: 'testnet',
	},
}));

const VALID_ADDRESS =
	'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

describe('CreatorKeysContractService (#1033)', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('fetches metadata successfully using key_id', async () => {
		const mockGetMetadata = vi.fn().mockResolvedValue({
			result: {
				name: 'OnChain Name',
				symbol: 'KEY',
				description: 'OnChain Bio',
				image: 'QmTest',
			},
		});
		const factory = vi
			.fn()
			.mockReturnValue({ get_metadata: mockGetMetadata });
		const service = new CreatorKeysContractService(factory);

		const result = await service.getMetadata(VALID_ADDRESS);
		expect(result).toEqual({
			name: 'OnChain Name',
			symbol: 'KEY',
			description: 'OnChain Bio',
			image: 'QmTest',
		});
		expect(mockGetMetadata).toHaveBeenCalled();
	});

	it('throws error when keyId is invalid address', async () => {
		const service = new CreatorKeysContractService();
		await expect(service.getMetadata('invalid-address')).rejects.toThrow();
	});

	it('submits batch_transfer successfully', async () => {
		const mockBatchTransfer = vi.fn().mockResolvedValue({
			hash: 'tx-hash-123',
		});
		const factory = vi
			.fn()
			.mockReturnValue({ batch_transfer: mockBatchTransfer });
		const service = new CreatorKeysContractService(factory);
		const recipientAddress = Keypair.random().publicKey();

		const result = await service.batch_transfer({
			creatorId: VALID_ADDRESS,
			recipients: [{ address: recipientAddress, quantity: 2 }],
		});

		expect(result).toEqual({ success: true, hash: 'tx-hash-123' });
		expect(mockBatchTransfer).toHaveBeenCalled();
	});

	it('throws error when batch_transfer has invalid creatorId', async () => {
		const service = new CreatorKeysContractService();
		const recipientAddress = Keypair.random().publicKey();
		await expect(
			service.batch_transfer({
				creatorId: 'invalid-id',
				recipients: [{ address: recipientAddress, quantity: 1 }],
			})
		).rejects.toThrow();
	});
});
