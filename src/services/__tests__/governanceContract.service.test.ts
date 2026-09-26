import { describe, expect, it, vi } from 'vitest';
import type { Signer } from '@/lib/signing/types';
import {
	GovernanceContractService,
	type CreatorKeysContractClient,
} from '../governanceContract.service';
import { normalizeProposal } from '@/utils/governance.utils';

const creatorAddress =
	'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
const voterAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function createSigner(): Signer {
	return {
		type: 'software',
		getPublicKey: vi.fn().mockResolvedValue(voterAddress),
		sign: vi.fn().mockResolvedValue('signed-xdr'),
	};
}

function createProposal() {
	return normalizeProposal({
		id: 'proposal-1',
		title: 'Snapshot proposal',
		status: 'active',
		creatorAddress,
		pollId: 7,
		options: ['For', 'Against'],
		voteCounts: [0, 0],
		startDate: '2026-01-01T00:00:00.000Z',
		endDate: '2099-01-01T00:00:00.000Z',
	});
}

describe('GovernanceContractService', () => {
	it('returns a captured snapshot without reading the live balance', async () => {
		const client: CreatorKeysContractClient = {
			get_vote_snapshot: vi.fn().mockResolvedValue({ result: 12 }),
			get_key_balance: vi.fn(),
			cast_vote_with_snapshot: vi.fn(),
		};
		const factory = vi.fn().mockResolvedValue(client);
		const service = new GovernanceContractService(factory);

		await expect(
			service.getSnapshotVotingWeight(createProposal(), voterAddress)
		).resolves.toEqual({ weight: 12, isCaptured: true, source: 'snapshot' });
		expect(client.get_vote_snapshot).toHaveBeenCalledWith({
			creator_id: expect.objectContaining({}),
			voter: expect.objectContaining({}),
			poll_id: 7,
		});
		expect(client.get_key_balance).not.toHaveBeenCalled();
		expect(factory).toHaveBeenCalledWith(voterAddress, null);
	});

	it('falls back to the key balance before the first vote', async () => {
		const client: CreatorKeysContractClient = {
			get_vote_snapshot: vi.fn().mockResolvedValue({ result: null }),
			get_key_balance: vi.fn().mockResolvedValue({ result: 4 }),
			cast_vote_with_snapshot: vi.fn(),
		};
		const service = new GovernanceContractService(
			vi.fn().mockResolvedValue(client)
		);

		await expect(
			service.getSnapshotVotingWeight(createProposal(), voterAddress)
		).resolves.toEqual({ weight: 4, isCaptured: false, source: 'balance' });
		expect(client.get_key_balance).toHaveBeenCalledWith({
			creator: expect.objectContaining({}),
			wallet: expect.objectContaining({}),
		});
	});

	it('calls cast_vote_with_snapshot with the stored voter address and poll ID', async () => {
		const signAndSend = vi.fn().mockResolvedValue({
			sendTransactionResponse: { hash: 'tx-hash' },
		});
		const client: CreatorKeysContractClient = {
			get_vote_snapshot: vi.fn(),
			get_key_balance: vi.fn(),
			cast_vote_with_snapshot: vi.fn().mockResolvedValue({ signAndSend }),
		};
		const service = new GovernanceContractService(
			vi.fn().mockResolvedValue(client)
		);
		const signer = createSigner();

		await expect(
			service.castVote({
				proposal: createProposal(),
				voter: voterAddress,
				optionIndex: 1,
				signer,
			})
		).resolves.toEqual({ hash: 'tx-hash' });
		expect(client.cast_vote_with_snapshot).toHaveBeenCalledWith({
			creator_id: expect.objectContaining({}),
			voter: expect.objectContaining({}),
			poll_id: 7,
			option_index: 1,
		});
		expect(signAndSend).toHaveBeenCalledOnce();
	});
});
