import {
	readLocalCollection,
	resetLocalCollection,
	writeLocalCollection,
} from '@/services/localCollection.service';

const GRANTS_KEY = 'grants';

export type GrantStatus = 'active' | 'completed' | 'cancelled';
export type MilestoneState = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface MilestoneEvidence {
	link: string;
	description: string;
	fileHash: string;
	fileName?: string;
	submittedAt: string;
}

export interface GrantMilestone {
	id: string;
	grantId: string;
	index: number;
	title: string;
	amountStroops: number;
	state: MilestoneState;
	evidence?: MilestoneEvidence;
	rejectionReason?: string;
	approvedAt?: string;
}

export interface GrantRelease {
	id: string;
	milestoneId: string;
	title: string;
	amountStroops: number;
	releasedAt: string;
}

export interface Grant {
	id: string;
	title: string;
	summary: string;
	keyId: string;
	keyName: string;
	recipient: string;
	reviewer: string;
	totalStroops: number;
	releasedStroops: number;
	status: GrantStatus;
	returnedAmountStroops?: number;
	createdAt: string;
	milestones: GrantMilestone[];
	releases: GrantRelease[];
}

export interface GrantFilters {
	status?: GrantStatus | 'all';
	wallet?: string;
	role?: 'recipient' | 'reviewer';
	cursor?: string | null;
	limit?: number;
}

export interface GrantPage {
	grants: Grant[];
	nextCursor: string | null;
}

export interface SubmitEvidenceInput {
	milestoneId: string;
	wallet: string;
	link: string;
	description: string;
	fileHash: string;
	fileName?: string;
}

export interface ReviewMilestoneInput {
	grantId: string;
	milestoneId: string;
	wallet: string;
	decision: 'approve' | 'reject';
	reason?: string;
}

const RECIPIENT = 'GRECIPIENT_1';
const REVIEWER = 'GREVIEWER_1';

function isoInDays(days: number): string {
	return new Date(Date.now() + days * 86_400_000).toISOString();
}

function milestone(
	grantId: string,
	index: number,
	title: string,
	amountStroops: number,
	state: MilestoneState = 'pending'
): GrantMilestone {
	return {
		id: `${grantId}-m${index + 1}`,
		grantId,
		index,
		title,
		amountStroops,
		state,
	};
}

function seedGrants(): Grant[] {
	const first: Grant = {
		id: 'grant-1',
		title: 'Open-source holder SDK',
		summary:
			'A typed SDK that lets holders query their positions and rewards.',
		keyId: 'creator-alpha',
		keyName: 'Alpha Key',
		recipient: RECIPIENT,
		reviewer: REVIEWER,
		totalStroops: 60_000_000,
		releasedStroops: 20_000_000,
		status: 'active',
		createdAt: isoInDays(-30),
		milestones: [
			milestone('grant-1', 0, 'Repository setup', 20_000_000, 'approved'),
			milestone('grant-1', 1, 'SDK implementation', 25_000_000, 'submitted'),
			milestone('grant-1', 2, 'Docs and examples', 15_000_000),
		],
		releases: [
			{
				id: 'release-1',
				milestoneId: 'grant-1-m1',
				title: 'Repository setup',
				amountStroops: 20_000_000,
				releasedAt: isoInDays(-12),
			},
		],
	};
	const second: Grant = {
		id: 'grant-2',
		title: 'Community research fellowship',
		summary: 'Quarterly research on key-holder governance participation.',
		keyId: 'creator-beta',
		keyName: 'Beta Key',
		recipient: 'GRECIPIENT_2',
		reviewer: REVIEWER,
		totalStroops: 30_000_000,
		releasedStroops: 0,
		status: 'active',
		createdAt: isoInDays(-10),
		milestones: [milestone('grant-2', 0, 'Research outline', 30_000_000)],
		releases: [],
	};
	const cancelled: Grant = {
		id: 'grant-3',
		title: 'Archived design system work',
		summary: 'Cancelled after the scope was absorbed into the core product.',
		keyId: 'creator-alpha',
		keyName: 'Alpha Key',
		recipient: RECIPIENT,
		reviewer: REVIEWER,
		totalStroops: 18_000_000,
		releasedStroops: 5_000_000,
		status: 'cancelled',
		returnedAmountStroops: 13_000_000,
		createdAt: isoInDays(-60),
		milestones: [
			milestone('grant-3', 0, 'Discovery', 5_000_000, 'approved'),
			milestone('grant-3', 1, 'Component library', 13_000_000),
		],
		releases: [
			{
				id: 'release-2',
				milestoneId: 'grant-3-m1',
				title: 'Discovery',
				amountStroops: 5_000_000,
				releasedAt: isoInDays(-45),
			},
		],
	};
	return [first, second, cancelled];
}

function readGrants(): Grant[] {
	return readLocalCollection(GRANTS_KEY, seedGrants);
}

function saveGrants(grants: Grant[]): void {
	writeLocalCollection(GRANTS_KEY, grants);
}

export function listGrants(filters: GrantFilters = {}): GrantPage {
	let grants = readGrants().sort(
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);

	if (filters.status && filters.status !== 'all') {
		grants = grants.filter(grant => grant.status === filters.status);
	}
	if (filters.wallet && filters.role) {
		grants = grants.filter(grant =>
			filters.role === 'recipient'
				? grant.recipient === filters.wallet
				: grant.reviewer === filters.wallet
		);
	}

	const limit = Math.max(1, filters.limit ?? 10);
	const start = filters.cursor ? Number(filters.cursor) || 0 : 0;
	const items = grants.slice(start, start + limit);
	const end = start + items.length;
	return {
		grants: items,
		nextCursor: end < grants.length ? String(end) : null,
	};
}

export function getGrant(grantId: string): Grant | undefined {
	return readGrants().find(grant => grant.id === grantId);
}

export function getRemainingBalance(grant: Grant): number {
	return Math.max(0, grant.totalStroops - grant.releasedStroops);
}

export function submitEvidence(input: SubmitEvidenceInput): {
	grant: Grant;
	milestone: GrantMilestone;
} {
	if (!input.link.trim() && !input.fileHash.trim()) {
		throw new Error('Add a link or an evidence file.');
	}
	if (input.link.trim() && !/^https?:\/\//i.test(input.link.trim())) {
		throw new Error('Enter a valid http(s) evidence link.');
	}
	if (!input.fileHash.trim()) {
		throw new Error('The evidence file could not be hashed.');
	}

	const grants = readGrants();
	const grant = grants.find(candidate =>
		candidate.milestones.some(m => m.id === input.milestoneId)
	);
	if (!grant) throw new Error('Grant milestone not found.');
	if (grant.status !== 'active')
		throw new Error('This grant is no longer accepting evidence.');
	if (grant.recipient !== input.wallet)
		throw new Error('Only the grant recipient can submit evidence.');

	const current = grant.milestones.find(m => m.id === input.milestoneId)!;
	if (current.state !== 'pending' && current.state !== 'rejected') {
		throw new Error(
			'Evidence can only be submitted for a pending milestone.'
		);
	}

	const submitted: GrantMilestone = {
		...current,
		state: 'submitted',
		rejectionReason: undefined,
		evidence: {
			link: input.link.trim(),
			description: input.description.trim(),
			fileHash: input.fileHash,
			fileName: input.fileName,
			submittedAt: new Date().toISOString(),
		},
	};
	const updated: Grant = {
		...grant,
		milestones: grant.milestones.map(m =>
			m.id === submitted.id ? submitted : m
		),
	};
	saveGrants(grants.map(g => (g.id === grant.id ? updated : g)));
	return { grant: updated, milestone: submitted };
}

export function reviewMilestone(input: ReviewMilestoneInput): {
	grant: Grant;
	milestone: GrantMilestone;
} {
	const grants = readGrants();
	const grant = grants.find(candidate =>
		candidate.milestones.some(m => m.id === input.milestoneId)
	);
	if (!grant) throw new Error('Grant milestone not found.');
	if (grant.status !== 'active')
		throw new Error('This grant is no longer under review.');
	if (grant.reviewer !== input.wallet)
		throw new Error('Only the grant reviewer can approve or reject work.');

	const current = grant.milestones.find(m => m.id === input.milestoneId)!;
	if (current.state !== 'submitted') {
		throw new Error('Only submitted evidence can be reviewed.');
	}

	if (input.decision === 'reject') {
		if (!input.reason?.trim())
			throw new Error('A reason is required to reject evidence.');
		const returned: GrantMilestone = {
			...current,
			state: 'pending',
			rejectionReason: input.reason.trim(),
		};
		const updated: Grant = {
			...grant,
			milestones: grant.milestones.map(m =>
				m.id === returned.id ? returned : m
			),
		};
		saveGrants(grants.map(g => (g.id === grant.id ? updated : g)));
		return { grant: updated, milestone: returned };
	}

	const approvedAt = new Date().toISOString();
	const approved: GrantMilestone = {
		...current,
		state: 'approved',
		approvedAt,
	};
	const releases: GrantRelease[] = [
		...grant.releases,
		{
			id: `release-${current.id}`,
			milestoneId: current.id,
			title: current.title,
			amountStroops: current.amountStroops,
			releasedAt: approvedAt,
		},
	];
	const releasedStroops = grant.releasedStroops + current.amountStroops;
	const allApproved = grant.milestones.every(
		m => m.id === current.id || m.state === 'approved'
	);
	const updated: Grant = {
		...grant,
		milestones: grant.milestones.map(m =>
			m.id === approved.id ? approved : m
		),
		releases,
		releasedStroops,
		status: allApproved ? 'completed' : 'active',
	};
	saveGrants(grants.map(g => (g.id === grant.id ? updated : g)));
	return { grant: updated, milestone: approved };
}

export function resetGrantStore(): void {
	resetLocalCollection(GRANTS_KEY);
}
