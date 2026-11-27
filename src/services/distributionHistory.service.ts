import { BaseApiService, type APIResponse } from './api.service';

/**
 * Every kind of distribution a key holder can receive (#1259).
 */
export type DistributionType = 'revenue-share' | 'dividend' | 'airdrop';

/** Ordered list of distribution types used by the page tabs. */
export const DISTRIBUTION_TYPES: DistributionType[] = [
	'revenue-share',
	'dividend',
	'airdrop',
];

/**
 * A single distribution paid to the connected wallet for a creator key.
 */
export interface DistributionRecord {
	id: string;
	/** Creator key that produced the distribution. */
	keyId: string;
	/** Human-readable key / creator name when the API provides it. */
	keyName: string;
	/** ISO timestamp of when the distribution was paid. */
	date: string;
	/** Amount received by the connected wallet, in XLM. */
	amount: number;
}

/** One page of distribution history for a single distribution type. */
export interface DistributionHistoryPage {
	items: DistributionRecord[];
	/** 1-indexed page number that was returned. */
	page: number;
	pageSize: number;
	/** Total number of records across every page. */
	total: number;
	totalPages: number;
}

/** A single bar in the last-12-months distribution chart. */
export interface MonthlyDistributionPoint {
	/** `YYYY-MM` bucket key. */
	month: string;
	amount: number;
}

/**
 * Aggregated distributions across every type — powers the running total
 * card and the 12-month chart.
 */
export interface DistributionOverview {
	totalReceived: number;
	byType: Record<DistributionType, number>;
	monthly: MonthlyDistributionPoint[];
}

export const DISTRIBUTION_PAGE_SIZE = 10;

/**
 * Wallet-scoped distribution history endpoints, one per distribution type.
 */
export const DISTRIBUTION_HISTORY_PATHS: Record<DistributionType, string> = {
	'revenue-share': 'revenue-share-distributions',
	dividend: 'dividend-distributions',
	airdrop: 'airdrop-distributions',
};

const DISTRIBUTION_OVERVIEW_PATH = 'distribution-overview';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim() !== '') return value.trim();
	}
	return null;
}

function normalizeTimestamp(value: unknown): string {
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed)
			? new Date(parsed).toISOString()
			: value.trim();
	}

	const numeric = asNumber(value, NaN);
	if (Number.isFinite(numeric)) {
		// Unix seconds are occasionally returned instead of milliseconds.
		const milliseconds =
			numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
		return new Date(milliseconds).toISOString();
	}

	return '';
}

function extractRows(payload: unknown): unknown[] {
	if (Array.isArray(payload)) return payload;

	const record = asRecord(payload);
	for (const key of ['items', 'distributions', 'history', 'data', 'results']) {
		if (Array.isArray(record[key])) return record[key] as unknown[];
	}

	return [];
}

/**
 * Normalises one API row into a {@link DistributionRecord}.
 * Returns null when the row carries no identifying information.
 */
export function normalizeDistributionRecord(
	value: unknown,
	type: DistributionType,
	index: number
): DistributionRecord | null {
	const raw = asRecord(value);

	const keyId =
		firstString(raw.keyId, raw.key_id, raw.creatorId, raw.creator_id) ?? '';
	const keyName =
		firstString(
			raw.keyName,
			raw.key_name,
			raw.creatorName,
			raw.creator_name,
			raw.name
		) ?? keyId;
	const date = normalizeTimestamp(
		raw.date ??
			raw.distributedAt ??
			raw.distributed_at ??
			raw.timestamp ??
			raw.createdAt ??
			raw.created_at
	);

	if (!keyId && !keyName && !date) return null;

	return {
		id:
			firstString(raw.id, raw.distributionId, raw.distribution_id) ??
			`${type}-${index}`,
		keyId,
		keyName,
		date,
		amount: Math.max(
			asNumber(
				raw.amount ??
					raw.userAmount ??
					raw.user_amount ??
					raw.receivedAmount ??
					raw.received_amount ??
					raw.amountReceived
			),
			0
		),
	};
}

function normalizeMonthly(value: unknown): MonthlyDistributionPoint[] {
	if (!Array.isArray(value)) return [];

	return value
		.map(point => {
			const raw = asRecord(point);
			const month = firstString(raw.month, raw.period, raw.date, raw.bucket);
			if (!month) return null;
			return {
				month: month.slice(0, 7),
				amount: Math.max(asNumber(raw.amount ?? raw.total ?? raw.value), 0),
			};
		})
		.filter((point): point is MonthlyDistributionPoint => point !== null);
}

/**
 * Normalises the aggregated overview payload into a {@link DistributionOverview}.
 */
export function normalizeDistributionOverview(
	payload: unknown
): DistributionOverview {
	const raw = asRecord(payload);
	const byTypeRaw = asRecord(raw.byType ?? raw.by_type);

	const byType: Record<DistributionType, number> = {
		'revenue-share': Math.max(
			asNumber(
				byTypeRaw['revenue-share'] ??
					byTypeRaw.revenueShare ??
					byTypeRaw.revenue_share
			),
			0
		),
		dividend: Math.max(
			asNumber(byTypeRaw.dividend ?? byTypeRaw.dividends),
			0
		),
		airdrop: Math.max(asNumber(byTypeRaw.airdrop ?? byTypeRaw.airdrops), 0),
	};

	const summedByType =
		byType['revenue-share'] + byType.dividend + byType.airdrop;

	return {
		totalReceived: Math.max(
			asNumber(
				raw.totalReceived ??
					raw.total_received ??
					raw.totalAmount ??
					raw.total,
				summedByType
			),
			0
		),
		byType,
		monthly: normalizeMonthly(raw.monthly ?? raw.monthlyTotals ?? raw.months),
	};
}

class DistributionHistoryService extends BaseApiService {
	/**
	 * Paginated history for one distribution type:
	 * GET /users/:wallet/<type>-distributions?page=&limit=
	 */
	async getHistory(
		wallet: string,
		type: DistributionType,
		page: number = 1,
		pageSize: number = DISTRIBUTION_PAGE_SIZE
	): Promise<DistributionHistoryPage> {
		const requestedPage = Math.max(1, Math.floor(page));

		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/users/${encodeURIComponent(wallet)}/${DISTRIBUTION_HISTORY_PATHS[type]}`,
				{ params: { page: requestedPage, limit: pageSize } }
			);

			const payload = response.data.data;
			const rows = extractRows(payload);
			const meta = Array.isArray(payload) ? {} : asRecord(payload);

			const items = rows
				.map((row, index) => normalizeDistributionRecord(row, type, index))
				.filter((row): row is DistributionRecord => row !== null);

			const total = Math.max(
				asNumber(meta.total ?? meta.totalCount ?? meta.count, items.length),
				items.length
			);
			const resolvedPageSize = Math.max(
				asNumber(meta.pageSize ?? meta.limit, pageSize),
				1
			);

			return {
				items,
				page: Math.max(asNumber(meta.page, requestedPage), 1),
				pageSize: resolvedPageSize,
				total,
				totalPages: Math.max(
					asNumber(meta.totalPages, Math.ceil(total / resolvedPageSize)),
					1
				),
			};
		} catch (error) {
			const apiError = this.handleError(error);
			// The endpoint may not be deployed yet; render the empty state
			// instead of failing the whole page.
			if (apiError.status === 404) {
				return {
					items: [],
					page: requestedPage,
					pageSize,
					total: 0,
					totalPages: 1,
				};
			}
			throw apiError;
		}
	}

	/**
	 * Cumulative totals plus monthly buckets for the last 12 months:
	 * GET /users/:wallet/distribution-overview
	 */
	async getOverview(wallet: string): Promise<DistributionOverview> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/users/${encodeURIComponent(wallet)}/${DISTRIBUTION_OVERVIEW_PATH}`
			);
			return normalizeDistributionOverview(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const distributionHistoryService = new DistributionHistoryService();

/**
 * Convenience wrapper that can be spied on in tests without mocking the
 * service class instance directly.
 */
export function fetchDistributionHistory(
	wallet: string,
	type: DistributionType,
	page: number
): Promise<DistributionHistoryPage> {
	return distributionHistoryService.getHistory(wallet, type, page);
}

/** Convenience wrapper for the aggregated distribution overview. */
export function fetchDistributionOverview(
	wallet: string
): Promise<DistributionOverview> {
	return distributionHistoryService.getOverview(wallet);
}
