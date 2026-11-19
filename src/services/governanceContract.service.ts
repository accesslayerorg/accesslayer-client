import type { Signer } from '@/lib/signing/types';
import type { Proposal } from '@/types/governance';

/**
 * Governance contract boundary (#1030), reduced to a dependency-free client
 * interface. Tests can inject a client factory; the default reports that
 * on-chain wiring is not configured in this client.
 */

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

/** Minimal stand-in for the SDK's `Address`, enough for contract payloads. */
export interface AddressLike {
	toString(): string;
}

export interface CreatorKeysContractClient {
	get_vote_snapshot(args: {
		creator_id: AddressLike;
		voter: AddressLike;
		poll_id: number;
	}): Promise<{ result: unknown }>;
	get_key_balance(args: {
		creator: AddressLike;
		wallet: AddressLike;
	}): Promise<{ result: unknown }>;
	cast_vote_with_snapshot(args: {
		creator_id: AddressLike;
		voter: AddressLike;
		poll_id: number;
		option_index: number;
	}): Promise<{
		signAndSend(): Promise<{ sendTransactionResponse?: { hash?: string } }>;
	}>;
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

const defaultFactory: CreatorKeysContractClientFactory = async () => {
	throw new GovernanceContractError(
		'Governance contract calls are unavailable: no contract client is configured.'
	);
};

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

function toAddress(value: string): AddressLike {
	return {
		toString: () => value,
	};
}

function parseAddress(value: string | undefined, label: string): AddressLike {
	if (!value) {
		throw new GovernanceContractError(`${label} is not configured.`);
	}

	if (!/^[CG][A-Z2-7]{55}$/.test(value)) {
		throw new GovernanceContractError(
			`${label} is not a valid Stellar address.`
		);
	}

	return toAddress(value);
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

export interface CreateProposalInput {
	creatorId: string;
	creatorAddress?: string;
	title: string;
	description: string;
	options: string[];
	signer: Signer;
}

export class GovernanceContractService {
	private readonly clientFactory: CreatorKeysContractClientFactory;

	constructor(
		clientFactory: CreatorKeysContractClientFactory = defaultFactory
	) {
		this.clientFactory = clientFactory;
	}

	/**
	 * Submits a proposal creation call. The client does not yet wire the
	 * on-chain create entrypoint, so this resolves with a deterministic local
	 * identifier while keeping the same async contract boundary.
	 */
	async createProposal(input: CreateProposalInput): Promise<{ id: string }> {
		if (!input.title.trim()) {
			throw new GovernanceContractError('A proposal title is required.');
		}
		if (input.options.length < 2) {
			throw new GovernanceContractError(
				'A proposal needs at least two options.'
			);
		}
		await this.clientFactory(input.creatorAddress ?? input.creatorId, input.signer);
		return { id: `local-${input.creatorId}-${Date.now()}` };
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
