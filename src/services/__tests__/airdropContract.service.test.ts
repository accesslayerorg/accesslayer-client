import { describe, expect, it, vi } from 'vitest';
import type { Signer } from '@/lib/signing/types';
import {
	AirdropContractService,
	AirdropContractError,
	type AirdropContractClient,
} from '../airdropContract.service';

const walletAddress =
	'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function createSigner(): Signer {
	return {
		type: 'software',
		getPublicKey: vi.fn().mockResolvedValue(walletAddress),
		sign: vi.fn().mockResolvedValue('signed-xdr'),
	};
}

describe('AirdropContractService', () => {
	it('calls claim_airdrop with the airdrop ID and recipient address', async () => {
		const signAndSend = vi.fn().mockResolvedValue({
			sendTransactionResponse: { hash: 'tx-hash' },
		});
		const client: AirdropContractClient = {
			claim_airdrop: vi.fn().mockResolvedValue({ signAndSend }),
		};
		const factory = vi.fn().mockResolvedValue(client);
		const service = new AirdropContractService(factory);
		const signer = createSigner();

		await expect(
			service.claimAirdrop({
				airdropId: 'airdrop-1',
				wallet: walletAddress,
				signer,
			})
		).resolves.toEqual({ hash: 'tx-hash' });

		expect(client.claim_airdrop).toHaveBeenCalledWith({
			airdrop_id: 'airdrop-1',
			recipient: expect.objectContaining({}),
		});
		expect(signAndSend).toHaveBeenCalledOnce();
		expect(factory).toHaveBeenCalledWith(walletAddress, signer);
	});

	it('returns a null hash when the send response has no hash', async () => {
		const signAndSend = vi.fn().mockResolvedValue({
			sendTransactionResponse: {},
		});
		const client: AirdropContractClient = {
			claim_airdrop: vi.fn().mockResolvedValue({ signAndSend }),
		};
		const service = new AirdropContractService(
			vi.fn().mockResolvedValue(client)
		);

		await expect(
			service.claimAirdrop({
				airdropId: 'airdrop-2',
				wallet: walletAddress,
				signer: createSigner(),
			})
		).resolves.toEqual({ hash: null });
	});

	it('rejects an empty airdrop ID before touching the client', async () => {
		const factory = vi.fn();
		const service = new AirdropContractService(factory);

		await expect(
			service.claimAirdrop({
				airdropId: '',
				wallet: walletAddress,
				signer: createSigner(),
			})
		).rejects.toThrow(AirdropContractError);

		expect(factory).not.toHaveBeenCalled();
	});

	it('rejects when no signer is available', async () => {
		const factory = vi.fn();
		const service = new AirdropContractService(factory);

		await expect(
			service.claimAirdrop({
				airdropId: 'airdrop-1',
				wallet: walletAddress,
				signer: null,
			})
		).rejects.toThrow('A connected wallet signer is required');

		expect(factory).not.toHaveBeenCalled();
	});

	it('rejects an invalid wallet address', async () => {
		const factory = vi.fn();
		const service = new AirdropContractService(factory);

		await expect(
			service.claimAirdrop({
				airdropId: 'airdrop-1',
				wallet: 'not-a-stellar-address',
				signer: createSigner(),
			})
		).rejects.toThrow(AirdropContractError);

		expect(factory).not.toHaveBeenCalled();
	});
});
