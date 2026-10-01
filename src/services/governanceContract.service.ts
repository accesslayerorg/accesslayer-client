import { Address, Networks } from '@stellar/stellar-sdk';
import {
	Client,
	type AssembledTransaction,
} from '@stellar/stellar-sdk/contract';
import type { Signer } from '@/lib/signing/types';
import { env } from '@/utils/env.utils';
import type { Proposal } from '@/types/governance';

export type SnapshotWeightSource = 'snapshot' | 'balance' | 'none';

export interface SnapshotVotingWeight {
	weight: number | null;
	isCaptured: boolean;
	source: SnapshotWeightSource;
}

export interface VoteTransactionResult {
	hash: string | null;
}

export interface CastVoteInput {
	proposal: Proposal;
	voter: string;
	optionIndex: number;
	signer: Signer;
}

export interface CreatorKeysContractClient {
	get_vote_snapshot(args: {
		creator_id: Address;
		voter: Address;
		poll_id: number;
	}): Promise<AssembledTransaction<number | null | undefined>>;
	get_key_balance(args: {
		creator: Address;
		wallet: Address;
	}): Promise<AssembledTransaction<number>>;
	cast_vote_with_snapshot(args: {
		creator_id: Address;
		voter: Address;
		poll_id: number;
		option_index: number;
	}): Promise<AssembledTransaction<void>>;
}

export type CreatorKeysContractClientFactory = (
	address: string | undefined,
	signer: Signer | null
) => Promise<CreatorKeysContractClient>;

export class GovernanceContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GovernanceContractError';
	}
}

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

function toWeight(value: unknown): number | null {
	if (typeof value === 'bigint') {
		const parsed = Number(value);
		return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
	}
	if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
		return value;
	}
	return null;
}

function parseAddress(value: string | undefined, label: string): Address {
	if (!value) {
		throw new GovernanceContractError(`${label} is not configured.`);
	}

	try {
		return Address.fromString(value);
	} catch {
		throw new GovernanceContractError(
			`${label} is not a valid Stellar address.`
		);
	}
}

function parsePollId(proposal: Proposal): number {
	const pollId = toWeight(proposal.pollId);
	if (pollId === null || !Number.isSafeInteger(pollId) || pollId < 0) {
		throw new GovernanceContractError(
			'This proposal does not have an on-chain poll ID.'
		);
	}
	return pollId;
}

const defaultFactory: CreatorKeysContractClientFactory = async (
	address,
	signer
) => {
	if (!env.VITE_STELLAR_RPC_URL) {
		throw new GovernanceContractError(
			'VITE_STELLAR_RPC_URL is required for governance contract reads.'
		);
	}
	if (!env.VITE_CREATOR_KEYS_CONTRACT_ID) {
		throw new GovernanceContractError(
			'VITE_CREATOR_KEYS_CONTRACT_ID is required for governance contract reads.'
		);
	}

	const publicKey = signer
		? (address ?? (await signer.getPublicKey()))
		: address;

	return Client.from<CreatorKeysContractClient>({
		contractId: env.VITE_CREATOR_KEYS_CONTRACT_ID,
		rpcUrl: env.VITE_STELLAR_RPC_URL,
		networkPassphrase: getNetworkPassphrase(),
		...(signer
			? {
					signTransaction: async (transaction: string) => ({
						signedTxXdr: await signer.sign(transaction),
					}),
				}
			: {}),
		...(publicKey ? { publicKey } : {}),
	});
};

export class GovernanceContractService {
	private readonly clientFactory: CreatorKeysContractClientFactory;

	constructor(
		clientFactory: CreatorKeysContractClientFactory = defaultFactory
	) {
		this.clientFactory = clientFactory;
	}

	async getSnapshotVotingWeight(
		proposal: Proposal,
		voter: string
	): Promise<SnapshotVotingWeight> {
		const creator = parseAddress(
			proposal.creatorAddress ?? proposal.creatorId,
			'Proposal creator Stellar address'
		);
		const voterAddress = parseAddress(voter, 'Connected Stellar address');
		const pollId = parsePollId(proposal);
		const client = await this.clientFactory(voter, null);
		const snapshot = (
			await client.get_vote_snapshot({
				creator_id: creator,
				voter: voterAddress,
				poll_id: pollId,
			})
		).result;
		const snapshotWeight = toWeight(snapshot);
		if (snapshotWeight !== null) {
			return {
				weight: snapshotWeight,
				isCaptured: true,
				source: 'snapshot',
			};
		}

		const balance = (
			await client.get_key_balance({
				creator,
				wallet: voterAddress,
			})
		).result;
		return {
			weight: toWeight(balance),
			isCaptured: false,
			source: 'balance',
		};
	}

	async castVote({
		proposal,
		voter,
		optionIndex,
		signer,
	}: CastVoteInput): Promise<VoteTransactionResult> {
		if (!Number.isSafeInteger(optionIndex) || optionIndex < 0) {
			throw new GovernanceContractError('Choose a valid proposal option.');
		}

		const creator = parseAddress(
			proposal.creatorAddress ?? proposal.creatorId,
			'Proposal creator Stellar address'
		);
		const voterAddress = parseAddress(voter, 'Connected Stellar address');
		const pollId = parsePollId(proposal);
		const client = await this.clientFactory(voter, signer);
		const transaction = await client.cast_vote_with_snapshot({
			creator_id: creator,
			voter: voterAddress,
			poll_id: pollId,
			option_index: optionIndex,
		});
		const result = await transaction.signAndSend();

		return {
			hash: result.sendTransactionResponse?.hash ?? null,
		};
	}
}

export const governanceContractService = new GovernanceContractService();
