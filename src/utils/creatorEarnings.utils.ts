import type {
	CreatorEarningsRecord,
	CreatorEarningsStreamSummary,
	CreatorEarningsSummary,
	DailyEarningsPoint,
	EarningsStream,
} from '@/types/creatorEarnings';

export const EARNINGS_STREAMS: EarningsStream[] = [
	'royalties',
	'tips',
	'subscriptions',
	'spotlight',
];

export const EARNINGS_STREAM_LABELS: Record<EarningsStream, string> = {
	royalties: 'Royalties',
	tips: 'Tips',
	subscriptions: 'Subscriptions',
	spotlight: 'Spotlight',
};

/**
 * Contract function invoked when a creator claims each stream's unclaimed
 * balance. Keeping the mapping in one place guarantees each claim button
 * routes to the matching contract call (#1258).
 */
export const EARNINGS_STREAM_CONTRACT_CALLS: Record<EarningsStream, string> = {
	royalties: 'claim_royalties',
	tips: 'claim_tips',
	subscriptions: 'claim_subscription_fees',
	spotlight: 'claim_spotlight_earnings',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function toNonNegativeAmount(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return 0;
	}
	return value;
}

export function roundToTwoDecimals(value: number): number {
	return Math.round(value * 100) / 100;
}

export function isEarningsStream(value: unknown): value is EarningsStream {
	return (
		typeof value === 'string' &&
		(EARNINGS_STREAMS as string[]).includes(value)
	);
}

/**
 * Normalizes a raw API record. Returns null for records missing a valid stream,
 * amount or timestamp so a malformed entry can never corrupt the totals.
 */
export function normalizeEarningsRecord(
	raw: unknown,
	creatorId: string
): CreatorEarningsRecord | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const record = raw as Record<string, unknown>;
	if (!isEarningsStream(record.stream)) return null;

	const earnedAt =
		typeof record.earnedAt === 'string'
			? record.earnedAt
			: typeof record.timestamp === 'string'
				? record.timestamp
				: null;
	if (!earnedAt || Number.isNaN(new Date(earnedAt).getTime())) return null;

	const amountXlm = toNonNegativeAmount(record.amountXlm);
	if (amountXlm <= 0) return null;

	return {
		id:
			typeof record.id === 'string' ? record.id : `${creatorId}-${earnedAt}`,
		creatorId,
		stream: record.stream,
		earnedAt,
		amountXlm,
		status: record.status === 'claimed' ? 'claimed' : 'unclaimed',
		transactionHash:
			typeof record.transactionHash === 'string'
				? record.transactionHash
				: undefined,
	};
}

function createEmptyStreamSummaries(): Record<
	EarningsStream,
	CreatorEarningsStreamSummary
> {
	return EARNINGS_STREAMS.reduce(
		(acc, stream) => {
			acc[stream] = {
				stream,
				totalEarnedXlm: 0,
				unclaimedXlm: 0,
				claimedXlm: 0,
			};
			return acc;
		},
		{} as Record<EarningsStream, CreatorEarningsStreamSummary>
	);
}

/**
 * Aggregates earning records into per-stream totals plus the combined
 * unclaimed balance. `totalUnclaimedXlm` is the strict sum of the four stream
 * balances, so the summary card and cards can never disagree.
 */
export function aggregateEarningsSummary(
	creatorId: string,
	records: CreatorEarningsRecord[]
): CreatorEarningsSummary {
	const streams = createEmptyStreamSummaries();
	const normalized = records
		.map(record => normalizeEarningsRecord(record, creatorId))
		.filter((record): record is CreatorEarningsRecord => record !== null)
		.sort(
			(a, b) =>
				new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
		);

	for (const record of normalized) {
		const stream = streams[record.stream];
		stream.totalEarnedXlm += record.amountXlm;
		if (record.status === 'claimed') {
			stream.claimedXlm += record.amountXlm;
		} else {
			stream.unclaimedXlm += record.amountXlm;
		}
	}

	for (const stream of EARNINGS_STREAMS) {
		const summary = streams[stream];
		summary.totalEarnedXlm = roundToTwoDecimals(summary.totalEarnedXlm);
		summary.unclaimedXlm = roundToTwoDecimals(summary.unclaimedXlm);
		summary.claimedXlm = roundToTwoDecimals(summary.claimedXlm);
	}

	const totalEarnedXlm = roundToTwoDecimals(
		EARNINGS_STREAMS.reduce(
			(sum, stream) => sum + streams[stream].totalEarnedXlm,
			0
		)
	);
	const totalUnclaimedXlm = roundToTwoDecimals(
		EARNINGS_STREAMS.reduce(
			(sum, stream) => sum + streams[stream].unclaimedXlm,
			0
		)
	);

	return {
		creatorId,
		streams,
		totalEarnedXlm,
		totalUnclaimedXlm,
		records: normalized,
		lastUpdated: Date.now(),
	};
}

function startOfUtcDay(ms: number): number {
	const date = new Date(ms);
	return Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate()
	);
}

function toDateKey(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Aggregates earning records into one combined point per day for the trailing
 * `days` window (30 by default), oldest first. Days with no earnings are still
 * emitted with zero totals so the chart always spans the full window.
 */
export function aggregateDailyEarnings(
	records: CreatorEarningsRecord[],
	days = 30,
	now = Date.now()
): DailyEarningsPoint[] {
	const windowDays = Math.max(1, Math.floor(days));
	const endOfWindow = startOfUtcDay(now);
	const startOfWindow = endOfWindow - (windowDays - 1) * DAY_MS;

	const points = new Map<string, DailyEarningsPoint>();
	for (let index = 0; index < windowDays; index += 1) {
		const date = toDateKey(startOfWindow + index * DAY_MS);
		points.set(date, {
			date,
			totalXlm: 0,
			royaltiesXlm: 0,
			tipsXlm: 0,
			subscriptionsXlm: 0,
			spotlightXlm: 0,
		});
	}

	for (const record of records) {
		const earnedAt = new Date(record.earnedAt).getTime();
		if (!Number.isFinite(earnedAt)) continue;
		const dayStart = startOfUtcDay(earnedAt);
		if (dayStart < startOfWindow || dayStart > endOfWindow) continue;

		const point = points.get(toDateKey(dayStart));
		if (!point) continue;

		const amount = toNonNegativeAmount(record.amountXlm);
		point.totalXlm += amount;
		switch (record.stream) {
			case 'royalties':
				point.royaltiesXlm += amount;
				break;
			case 'tips':
				point.tipsXlm += amount;
				break;
			case 'subscriptions':
				point.subscriptionsXlm += amount;
				break;
			case 'spotlight':
				point.spotlightXlm += amount;
				break;
		}
	}

	return Array.from(points.values()).map(point => ({
		...point,
		totalXlm: roundToTwoDecimals(point.totalXlm),
		royaltiesXlm: roundToTwoDecimals(point.royaltiesXlm),
		tipsXlm: roundToTwoDecimals(point.tipsXlm),
		subscriptionsXlm: roundToTwoDecimals(point.subscriptionsXlm),
		spotlightXlm: roundToTwoDecimals(point.spotlightXlm),
	}));
}

interface FallbackEarningSeed {
	stream: EarningsStream;
	amountXlm: number;
	daysAgo: number;
	status: CreatorEarningsRecord['status'];
}

const FALLBACK_EARNINGS: FallbackEarningSeed[] = [
	{ stream: 'royalties', amountXlm: 42.5, daysAgo: 1, status: 'unclaimed' },
	{ stream: 'tips', amountXlm: 18, daysAgo: 2, status: 'unclaimed' },
	{ stream: 'subscriptions', amountXlm: 65, daysAgo: 3, status: 'unclaimed' },
	{ stream: 'spotlight', amountXlm: 90, daysAgo: 4, status: 'unclaimed' },
	{ stream: 'royalties', amountXlm: 118.25, daysAgo: 18, status: 'claimed' },
	{ stream: 'tips', amountXlm: 32.5, daysAgo: 9, status: 'claimed' },
	{ stream: 'subscriptions', amountXlm: 140, daysAgo: 24, status: 'claimed' },
	{ stream: 'spotlight', amountXlm: 75, daysAgo: 14, status: 'claimed' },
];

/**
 * Deterministic sample data used only when the earnings endpoint is not yet
 * available, mirroring the fallback pattern used by the existing revenue
 * dashboard services.
 */
export function buildFallbackEarningsRecords(
	creatorId: string,
	now = Date.now()
): CreatorEarningsRecord[] {
	return FALLBACK_EARNINGS.map((seed, index) => ({
		id: `${creatorId}-${seed.stream}-${index + 1}`,
		creatorId,
		stream: seed.stream,
		earnedAt: new Date(now - seed.daysAgo * DAY_MS).toISOString(),
		amountXlm: seed.amountXlm,
		status: seed.status,
	}));
}
