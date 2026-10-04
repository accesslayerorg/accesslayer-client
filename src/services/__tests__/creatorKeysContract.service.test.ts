import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatorKeysContractService } from '@/services/creatorKeysContract.service';

vi.mock('@/utils/env.utils', () => ({
	env: {
		VITE_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
		VITE_CREATOR_KEYS_CONTRACT_ID: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
		VITE_STELLAR_NETWORK: 'testnet',
	},
}));

const VALID_ADDRESS = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

describe('CreatorKeysContractService (#1033)', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('fetches metadata successfully using key_id', async () => {
		const mockGetMetadata = vi.fn().mockResolvedValue({
			result: { name: 'OnChain Name', symbol: 'KEY', description: 'OnChain Bio', image: 'QmTest' },
		});
		const factory = vi.fn().mockReturnValue({ get_metadata: mockGetMetadata });
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
});
