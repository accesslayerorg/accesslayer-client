import {
	readLocalCollection,
	resetLocalCollection,
	writeLocalCollection,
} from '@/services/localCollection.service';

const BOUNTIES_KEY = 'bounties';
const SUBMISSIONS_KEY = 'bounty-submissions';

export type BountyStatus = 'open' | 'awarded' | 'reclaimed';

export interface Bounty {
	id: string;
	keyId: string;
	keyName: string;
	title: string;
	description: string;
	creator: string;
	rewardStroops: number;
	deadline: string;
	winnersLimit: number;
	holderGated: boolean;
	status: BountyStatus;
	createdAt: string;
	reclaimedStroops?: number;
}

export type SubmissionStatus = 'pending' | 'awarded' | 'rejected';

export interface BountySubmission {
	id: string;
	bountyId: string;
	worker: string;
	link: string;
	description: string;
	proofHash: string;
	status: SubmissionStatus;
	resubmissionAllowed: boolean;
	resubmissionUsed: boolean;
	resubmissions: number;
	submittedAt: string;
	reviewedAt?: string;
	rejectionReason?: string;
}

export interface CreateBountyInput {
	keyId: string;
	keyName?: string;
	title: string;
	description: string;
	rewardStroops: number;
	deadline: string;
	winnersLimit: number;
	holderGated: boolean;
}

export interface SubmitWorkInput {
	bountyId: string;
	worker: string;
	link: string;
	description: string;
	proofHash: string;
	isHolder: boolean;
}

export interface BountyFilters {
	key?: string;
	minReward?: number;
	maxReward?: number;
	status?: BountyStatus | 'all' | 'active';
}

const CREATOR_A = 'GCREATOR_A';
const CREATOR_B = 'GCREATOR_B';

function isoInDays(days: number): string {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function seedBounties(): Bounty[] {
	return [
		{
			id: 'bounty-1',
			keyId: 'creator-alpha',
			keyName: 'Alpha Key',
			title: 'Design a launch banner',
			description:
				'Create a 1200x400 launch banner for the next holder call.',
			creator: CREATOR_A,
			rewardStroops: 25_000_000,
			deadline: isoInDays(6),
			winnersLimit: 3,
			holderGated: true,
			status: 'open',
			createdAt: isoInDays(-2),
		},
		{
			id: 'bounty-2',
			keyId: 'creator-beta',
			keyName: 'Beta Key',
			title: 'Translate the holder guide',
			description:
				'Translate the holder guide into Spanish with a source link.',
			creator: CREATOR_B,
			rewardStroops: 8_000_000,
			deadline: isoInDays(12),
			winnersLimit: 1,
			holderGated: false,
			status: 'open',
			createdAt: isoInDays(-1),
		},
		{
			id: 'bounty-3',
			keyId: 'creator-alpha',
			keyName: 'Alpha Key',
			title: 'Write a protocol explainer',
			description: 'A short explainer of bonding curves for new holders.',
			creator: CREATOR_A,
			rewardStroops: 60_000_000,
			deadline: isoInDays(-3),
			winnersLimit: 2,
			holderGated: true,
			status: 'open',
			createdAt: isoInDays(-20),
		},
	];
}

function seedSubmissions(): BountySubmission[] {
	return [];
}

function readBounties(): Bounty[] {
	return readLocalCollection(BOUNTIES_KEY, seedBounties);
}

function readSubmissions(): BountySubmission[] {
	return readLocalCollection(SUBMISSIONS_KEY, seedSubmissions);
}

function saveBounties(bounties: Bounty[]): void {
	writeLocalCollection(BOUNTIES_KEY, bounties);
}

function saveSubmissions(submissions: BountySubmission[]): void {
	writeLocalCollection(SUBMISSIONS_KEY, submissions);
}

function makeId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertValidLink(link: string): void {
	let isValid = false;
	try {
		const url = new URL(link.trim());
		isValid = url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		isValid = false;
	}
	if (!isValid) throw new Error('Enter a valid http(s) link to your work.');
}

export function getBounties(filters: BountyFilters = {}): Bounty[] {
	const { key, minReward, maxReward, status = 'all' } = filters;
	return readBounties()
		.filter(bounty => {
			if (key && key !== 'all' && bounty.keyId !== key) return false;
			if (minReward != null && bounty.rewardStroops < minReward)
				return false;
			if (maxReward != null && bounty.rewardStroops > maxReward)
				return false;
			if (status === 'active') return bounty.status === 'open';
			if (status !== 'all' && bounty.status !== status) return false;
			return true;
		})
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
}

export function getBounty(bountyId: string): Bounty | undefined {
	return readBounties().find(bounty => bounty.id === bountyId);
}

export function createBounty(
	input: CreateBountyInput,
	creator: string
): Bounty {
	if (!creator) throw new Error('Connect a wallet to post a bounty.');
	if (!input.title.trim()) throw new Error('Give the bounty a title.');
	if (!Number.isFinite(input.rewardStroops) || input.rewardStroops <= 0) {
		throw new Error('Reward must be greater than zero.');
	}
	if (!Number.isInteger(input.winnersLimit) || input.winnersLimit < 1) {
		throw new Error('Winner count must be at least one.');
	}
	const deadlineMs = new Date(input.deadline).getTime();
	if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now()) {
		throw new Error('Deadline must be in the future.');
	}

	const bounty: Bounty = {
		id: makeId('bounty'),
		keyId: input.keyId,
		keyName: input.keyName ?? input.keyId,
		title: input.title.trim(),
		description: input.description.trim(),
		creator,
		rewardStroops: input.rewardStroops,
		deadline: new Date(deadlineMs).toISOString(),
		winnersLimit: input.winnersLimit,
		holderGated: input.holderGated,
		status: 'open',
		createdAt: new Date().toISOString(),
	};

	saveBounties([bounty, ...readBounties()]);
	return bounty;
}

export function getSubmissions(bountyId: string): BountySubmission[] {
	return readSubmissions()
		.filter(submission => submission.bountyId === bountyId)
		.sort(
			(a, b) =>
				new Date(b.submittedAt).getTime() -
				new Date(a.submittedAt).getTime()
		);
}

export function getAwardedCount(bountyId: string): number {
	return getSubmissions(bountyId).filter(s => s.status === 'awarded').length;
}

export function getRemainingWinners(bounty: Bounty): number {
	return Math.max(0, bounty.winnersLimit - getAwardedCount(bounty.id));
}

export function submitWork(input: SubmitWorkInput): BountySubmission {
	const bounty = getBounty(input.bountyId);
	if (!bounty) throw new Error('Bounty not found.');
	if (bounty.status !== 'open')
		throw new Error('This bounty is no longer accepting work.');
	if (new Date(bounty.deadline).getTime() <= Date.now())
		throw new Error('The submission deadline has passed.');
	if (bounty.holderGated && !input.isHolder)
		throw new Error('You must hold this key to submit work on this bounty.');
	assertValidLink(input.link);
	if (input.description.trim().length < 10)
		throw new Error('Describe your work in at least 10 characters.');

	const submissions = readSubmissions();
	const existing = submissions.find(
		s => s.bountyId === bounty.id && s.worker === input.worker
	);

	if (existing) {
		if (!existing.resubmissionAllowed || existing.resubmissionUsed) {
			throw new Error('This bounty already has your submission.');
		}

		const resubmitted: BountySubmission = {
			...existing,
			link: input.link.trim(),
			description: input.description.trim(),
			proofHash: input.proofHash,
			status: 'pending',
			resubmissionAllowed: false,
			resubmissionUsed: true,
			resubmissions: existing.resubmissions + 1,
			submittedAt: new Date().toISOString(),
			rejectionReason: undefined,
		};
		saveSubmissions(
			submissions.map(s => (s.id === existing.id ? resubmitted : s))
		);
		return resubmitted;
	}

	const submission: BountySubmission = {
		id: makeId('submission'),
		bountyId: bounty.id,
		worker: input.worker,
		link: input.link.trim(),
		description: input.description.trim(),
		proofHash: input.proofHash,
		status: 'pending',
		resubmissionAllowed: false,
		resubmissionUsed: false,
		resubmissions: 0,
		submittedAt: new Date().toISOString(),
	};

	saveSubmissions([submission, ...submissions]);
	return submission;
}

function requireCreator(bounty: Bounty, actor: string): void {
	if (!actor || bounty.creator !== actor)
		throw new Error('Only the bounty creator can review submissions.');
}

export function awardSubmission(
	submissionId: string,
	actor: string
): { submission: BountySubmission; bounty: Bounty } {
	const submissions = readSubmissions();
	const submission = submissions.find(s => s.id === submissionId);
	if (!submission) throw new Error('Submission not found.');
	const bounty = getBounty(submission.bountyId);
	if (!bounty) throw new Error('Bounty not found.');
	requireCreator(bounty, actor);
	if (submission.status !== 'pending')
		throw new Error('Only pending submissions can be awarded.');

	const awarded = getAwardedCount(bounty.id);
	if (awarded >= bounty.winnersLimit) {
		throw new Error('All winner slots have already been awarded.');
	}

	const updatedSubmission: BountySubmission = {
		...submission,
		status: 'awarded',
		reviewedAt: new Date().toISOString(),
	};
	const remaining = bounty.winnersLimit - awarded - 1;
	const updatedBounty: Bounty = {
		...bounty,
		status: remaining === 0 ? 'awarded' : 'open',
	};

	saveSubmissions(
		submissions.map(s => (s.id === submissionId ? updatedSubmission : s))
	);
	saveBounties(
		readBounties().map(b => (b.id === bounty.id ? updatedBounty : b))
	);

	return { submission: updatedSubmission, bounty: updatedBounty };
}

export function rejectSubmission(
	submissionId: string,
	actor: string,
	reason?: string
): BountySubmission {
	const submissions = readSubmissions();
	const submission = submissions.find(s => s.id === submissionId);
	if (!submission) throw new Error('Submission not found.');
	const bounty = getBounty(submission.bountyId);
	if (!bounty) throw new Error('Bounty not found.');
	requireCreator(bounty, actor);
	if (submission.status !== 'pending')
		throw new Error('Only pending submissions can be rejected.');

	const rejected: BountySubmission = {
		...submission,
		status: 'rejected',
		reviewedAt: new Date().toISOString(),
		rejectionReason: reason?.trim() || undefined,
		resubmissionAllowed: !submission.resubmissionUsed,
	};

	saveSubmissions(
		submissions.map(s => (s.id === submissionId ? rejected : s))
	);
	return rejected;
}

export function reclaimBounty(
	bountyId: string,
	actor: string
): { bounty: Bounty; reclaimedStroops: number } {
	const bounty = getBounty(bountyId);
	if (!bounty) throw new Error('Bounty not found.');
	requireCreator(bounty, actor);
	if (bounty.status !== 'open')
		throw new Error('This bounty has already been settled.');
	if (new Date(bounty.deadline).getTime() > Date.now())
		throw new Error('Rewards can only be reclaimed after the deadline.');

	const reclaimedStroops = bounty.rewardStroops * getRemainingWinners(bounty);
	const updated: Bounty = {
		...bounty,
		status: 'reclaimed',
		reclaimedStroops,
	};
	saveBounties(readBounties().map(b => (b.id === bountyId ? updated : b)));
	return { bounty: updated, reclaimedStroops };
}

export function resetBountyStore(): void {
	resetLocalCollection(BOUNTIES_KEY);
	resetLocalCollection(SUBMISSIONS_KEY);
}
