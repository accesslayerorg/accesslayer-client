import type {
	Proposal,
	ProposalOption,
	ProposalOutcome,
	ProposalStatus,
} from '@/types/governance';

type UnknownRecord = Record<string, unknown>;

const LEGACY_OPTIONS = [
	{ label: 'For', voteKey: 'forVotes' },
	{ label: 'Against', voteKey: 'againstVotes' },
	{ label: 'Abstain', voteKey: 'abstainVotes' },
] as const;

function asRecord(value: unknown): UnknownRecord {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as UnknownRecord)
		: {};
}

function toFiniteNumber(value: unknown): number | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'string' && !value.trim()) return undefined;

	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function toNonNegativeNumber(value: unknown): number | undefined {
	const parsed = toFiniteNumber(value);
	return parsed === undefined ? undefined : Math.max(0, parsed);
}

function toStringValue(value: unknown): string | undefined {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (typeof value === 'number' && Number.isFinite(value))
		return String(value);
	return undefined;
}

function toDateValue(value: unknown): string | undefined {
	const stringValue = toStringValue(value);
	if (!stringValue) return undefined;

	const parsed = new Date(stringValue);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeStatus(value: unknown, endDate: string): ProposalStatus {
	const status = toStringValue(value)?.toLowerCase();

	if (
		status === 'active' ||
		status === 'closed' ||
		status === 'passed' ||
		status === 'rejected' ||
		status === 'executed' ||
		status === 'cancelled'
	) {
		return status;
	}

	return Date.parse(endDate) <= Date.now() ? 'closed' : 'active';
}

function readOptionWeight(
	value: unknown,
	index: number,
	raw: UnknownRecord,
	results: UnknownRecord,
	voteCounts: unknown[]
): number {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const option = asRecord(value);
		const label = toStringValue(option.label ?? option.title ?? option.name);
		return (
			toNonNegativeNumber(
				option.weight ??
					option.votes ??
					option.voteCount ??
					(label ? results[label] : undefined)
			) ?? 0
		);
	}

	if (typeof value === 'number' || typeof value === 'string') {
		const label = typeof value === 'string' ? value.trim() : undefined;
		const resultWeight = label
			? toNonNegativeNumber(results[label])
			: undefined;
		if (resultWeight !== undefined) return resultWeight;

		const parsed = toNonNegativeNumber(value);
		if (parsed !== undefined) return parsed;
	}

	return (
		toNonNegativeNumber(
			voteCounts[index] ?? raw[`option${index + 1}Weight`]
		) ?? 0
	);
}

function getOptionLabel(value: unknown, index: number): string | undefined {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (typeof value === 'number') return `Option ${index + 1}`;
	if (value === null || value === undefined || Array.isArray(value))
		return undefined;

	const option = asRecord(value);
	return toStringValue(option.label ?? option.title ?? option.name);
}

function normalizeOptions(raw: UnknownRecord): ProposalOption[] {
	const results = asRecord(raw.results);
	const voteCounts = Array.isArray(raw.voteCounts) ? raw.voteCounts : [];
	const rawOptions = Array.isArray(raw.options) ? raw.options : [];

	if (rawOptions.length > 0) {
		return rawOptions.flatMap((value, index) => {
			const label = getOptionLabel(value, index);
			return label
				? [
						{
							label,
							weight: readOptionWeight(
								value,
								index,
								raw,
								results,
								voteCounts
							),
						},
					]
				: [];
		});
	}

	const resultEntries = Object.entries(results);
	if (resultEntries.length > 0) {
		return resultEntries.flatMap(([label, weight]) => {
			const parsedWeight = toNonNegativeNumber(weight);
			return parsedWeight === undefined
				? []
				: [{ label, weight: parsedWeight }];
		});
	}

	if (voteCounts.length > 0) {
		return voteCounts.map((value, index) => ({
			label: getOptionLabel(value, index) ?? `Option ${index + 1}`,
			weight: readOptionWeight(value, index, raw, results, voteCounts),
		}));
	}

	return LEGACY_OPTIONS.map(option => ({
		label: option.label,
		weight: toNonNegativeNumber(raw[option.voteKey]) ?? 0,
	}));
}

function normalizeOutcome(
	value: unknown,
	status: ProposalStatus,
	options: ProposalOption[],
	totalVotingWeight: number,
	totalCirculatingSupply: number,
	quorumBps: number
): ProposalOutcome | undefined {
	const outcome = toStringValue(value)?.toLowerCase();
	if (
		outcome === 'passed' ||
		outcome === 'failed' ||
		outcome === 'quorum_not_met'
	) {
		return outcome;
	}
	if (status === 'active') return undefined;
	if (status === 'passed' || status === 'executed') return 'passed';
	if (status === 'rejected' || status === 'cancelled') return 'failed';

	const participationRate =
		totalCirculatingSupply > 0
			? (totalVotingWeight / totalCirculatingSupply) * 100
			: 0;
	if (
		totalVotingWeight <= 0 ||
		(quorumBps > 0 && participationRate < quorumBps / 100)
	) {
		return 'quorum_not_met';
	}

	const leadingOption = options.reduce<ProposalOption | undefined>(
		(leading, option) =>
			!leading || option.weight > leading.weight ? option : leading,
		undefined
	);
	if (!leadingOption) return 'quorum_not_met';

	const remainingWeight = options
		.filter(option => option.label !== leadingOption.label)
		.reduce((total, option) => total + option.weight, 0);

	return leadingOption.weight > remainingWeight ? 'passed' : 'failed';
}

function getPollId(raw: UnknownRecord): number | undefined {
	const candidates = [
		raw.pollId,
		raw.onChainPollId,
		raw.poll_id,
		raw.proposalId,
	];

	for (const candidate of candidates) {
		const parsed = toFiniteNumber(candidate);
		if (parsed !== undefined && Number.isSafeInteger(parsed) && parsed >= 0) {
			return parsed;
		}
	}

	return undefined;
}

export function normalizeProposal(value: unknown): Proposal {
	const raw = asRecord(value);
	const options = normalizeOptions(raw);
	const startDate =
		toDateValue(raw.startDate) ??
		toDateValue(raw.start_date) ??
		toDateValue(raw.createdAt) ??
		toDateValue(raw.created_at) ??
		toDateValue(raw.endDate) ??
		toDateValue(raw.expiresAt) ??
		new Date(0).toISOString();
	const endDate =
		toDateValue(raw.endDate) ??
		toDateValue(raw.end_date) ??
		toDateValue(raw.expiresAt) ??
		toDateValue(raw.expires_at) ??
		toDateValue(raw.closedAt) ??
		startDate;
	const status = normalizeStatus(raw.status, endDate);
	const optionWeightTotal = options.reduce(
		(total, option) => total + option.weight,
		0
	);
	const totalVotingWeight = Math.max(
		optionWeightTotal,
		toNonNegativeNumber(raw.totalVotingWeight) ?? 0
	);
	const totalCirculatingSupply = Math.max(
		0,
		toNonNegativeNumber(raw.totalCirculatingSupply) ??
			toNonNegativeNumber(raw.eligibleVotingWeight) ??
			0
	);
	const quorumBps = Math.min(
		10000,
		Math.max(0, toNonNegativeNumber(raw.quorumBps) ?? 0)
	);
	const pollId = getPollId(raw);
	const creatorAddress = toStringValue(
		raw.creatorAddress ?? raw.creator_address ?? raw.creator ?? raw.creator_id
	);
	const snapshotLedger =
		toNonNegativeNumber(raw.snapshotLedger ?? raw.snapshot_ledger) ??
		undefined;
	const closedAt = toDateValue(raw.closedAt ?? raw.closed_at);
	const outcome = normalizeOutcome(
		raw.outcome,
		status,
		options,
		totalVotingWeight,
		totalCirculatingSupply,
		quorumBps
	);

	return {
		id:
			toStringValue(raw.id) ??
			toStringValue(raw.proposalId) ??
			toStringValue(raw.proposal_id) ??
			'',
		creatorId:
			toStringValue(raw.creatorId) ??
			toStringValue(raw.creator_id) ??
			toStringValue(raw.keyId) ??
			'',
		creatorAddress,
		pollId,
		title: toStringValue(raw.title) ?? 'Untitled proposal',
		description:
			toStringValue(
				raw.description ?? raw.body ?? raw.text ?? raw.details
			) ?? '',
		status,
		options,
		totalVotingWeight: Math.max(0, totalVotingWeight),
		totalCirculatingSupply: Math.max(0, totalCirculatingSupply),
		eligibleVotingWeight:
			toNonNegativeNumber(
				raw.eligibleVotingWeight ?? raw.eligible_voting_weight
			) ?? undefined,
		quorumBps,
		startDate,
		endDate,
		closedAt,
		outcome,
		forVotes: toNonNegativeNumber(raw.forVotes) ?? options[0]?.weight ?? 0,
		againstVotes:
			toNonNegativeNumber(raw.againstVotes) ?? options[1]?.weight ?? 0,
		abstainVotes:
			toNonNegativeNumber(raw.abstainVotes) ?? options[2]?.weight ?? 0,
		snapshotLedger,
	};
}

export function getProposalOptions(proposal: Proposal): ProposalOption[] {
	const options = Array.isArray(proposal.options) ? proposal.options : [];
	return options.length > 0
		? options
		: [
				{ label: 'For', weight: proposal.forVotes },
				{ label: 'Against', weight: proposal.againstVotes },
				{ label: 'Abstain', weight: proposal.abstainVotes },
			];
}

export function getProposalVoteTotal(proposal: Proposal): number {
	return Math.max(
		0,
		proposal.totalVotingWeight,
		getProposalOptions(proposal).reduce(
			(total, option) => total + option.weight,
			0
		)
	);
}

export function getParticipationRate(
	proposal: Proposal,
	voteTotal = getProposalVoteTotal(proposal)
): number {
	const eligibleWeight = Math.max(
		0,
		proposal.eligibleVotingWeight ?? proposal.totalCirculatingSupply
	);
	if (eligibleWeight <= 0) return 0;
	return Math.max(0, (voteTotal / eligibleWeight) * 100);
}

export function getLeadingOption(
	proposal: Proposal
): ProposalOption | undefined {
	return getProposalOptions(proposal).reduce<ProposalOption | undefined>(
		(leading, option) =>
			!leading || option.weight > leading.weight ? option : leading,
		undefined
	);
}

export function getProposalOutcome(
	proposal: Proposal
): ProposalOutcome | undefined {
	if (proposal.status === 'active') return undefined;
	if (proposal.outcome) return proposal.outcome;
	if (proposal.status === 'passed' || proposal.status === 'executed') {
		return 'passed';
	}
	if (proposal.status === 'rejected' || proposal.status === 'cancelled') {
		return 'failed';
	}

	const voteTotal = getProposalVoteTotal(proposal);
	if (
		voteTotal === 0 ||
		(proposal.quorumBps > 0 &&
			getParticipationRate(proposal, voteTotal) < proposal.quorumBps / 100)
	) {
		return 'quorum_not_met';
	}

	const leadingOption = getLeadingOption(proposal);
	if (!leadingOption) return 'quorum_not_met';

	const remainingWeight = getProposalOptions(proposal)
		.filter(option => option.label !== leadingOption.label)
		.reduce((total, option) => total + option.weight, 0);

	return leadingOption.weight > remainingWeight ? 'passed' : 'failed';
}
