import type {
	WalletTransaction,
	WalletTransactionType,
} from '@/services/transactionHistory.service';

export type TransactionTypeFilter =
	'all' | 'buys' | 'sells' | 'stakes' | 'claims' | 'swaps' | 'referrals';

export const TRANSACTION_TYPE_FILTERS: {
	value: TransactionTypeFilter;
	label: string;
}[] = [
	{ value: 'all', label: 'All' },
	{ value: 'buys', label: 'Buys' },
	{ value: 'sells', label: 'Sells' },
	{ value: 'stakes', label: 'Stakes' },
	{ value: 'claims', label: 'Claims' },
	{ value: 'swaps', label: 'Swaps' },
	{ value: 'referrals', label: 'Referrals' },
];

/**
 * Maps each filter chip to the event types it includes. "Stakes" covers
 * both staking and unstaking so users see the full lifecycle in one view.
 * `null` means no type restriction.
 */
const FILTER_TYPES: Record<
	TransactionTypeFilter,
	WalletTransactionType[] | null
> = {
	all: null,
	buys: ['buy'],
	sells: ['sell'],
	stakes: ['stake', 'unstake'],
	claims: ['claim'],
	swaps: ['swap'],
	referrals: ['referral'],
};

export function getTypesForFilter(
	filter: TransactionTypeFilter
): WalletTransactionType[] | undefined {
	return FILTER_TYPES[filter] ?? undefined;
}

export type DateRangePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
	{ value: 'all', label: 'All time' },
	{ value: 'today', label: 'Today' },
	{ value: '7d', label: '7 days' },
	{ value: '30d', label: '30 days' },
	{ value: 'custom', label: 'Custom' },
];

export interface CustomDateRange {
	/** `YYYY-MM-DD` from a date input, interpreted in local time. */
	start: string;
	end: string;
}

export interface ResolvedDateRange {
	from?: number;
	to?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const date = new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3])
	);
	return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): number {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy.getTime();
}

function endOfDay(date: Date): number {
	const copy = new Date(date);
	copy.setHours(23, 59, 59, 999);
	return copy.getTime();
}

/**
 * Converts a preset (or custom inputs) into epoch-ms bounds. Returns
 * `null` when a custom range is incomplete or inverted so callers can
 * hold off fetching and show a validation hint instead.
 */
export function resolveDateRange(
	preset: DateRangePreset,
	custom: CustomDateRange,
	now: number = Date.now()
): ResolvedDateRange | null {
	switch (preset) {
		case 'all':
			return {};
		case 'today':
			return { from: startOfDay(new Date(now)), to: now };
		case '7d':
			return { from: now - 7 * DAY_MS, to: now };
		case '30d':
			return { from: now - 30 * DAY_MS, to: now };
		case 'custom': {
			const start = parseLocalDate(custom.start);
			const end = parseLocalDate(custom.end);
			if (!start || !end) return null;
			const from = startOfDay(start);
			const to = endOfDay(end);
			if (from > to) return null;
			return { from, to };
		}
	}
}

/**
 * Client-side guard applied on top of the server query so the list never
 * shows rows outside the active filter, even if the API ignores a param.
 */
export function matchesTransactionFilters(
	tx: WalletTransaction,
	filter: TransactionTypeFilter,
	range: ResolvedDateRange
): boolean {
	const types = getTypesForFilter(filter);
	if (types && !types.includes(tx.type)) return false;
	if (range.from !== undefined && tx.timestamp < range.from) return false;
	if (range.to !== undefined && tx.timestamp > range.to) return false;
	return true;
}

/** Appends a page while dropping rows already shown (cursor overlap). */
export function mergeTransactionPages(
	existing: WalletTransaction[],
	incoming: WalletTransaction[]
): WalletTransaction[] {
	const seen = new Set(existing.map(tx => tx.id));
	const merged = [...existing];
	for (const tx of incoming) {
		if (seen.has(tx.id)) continue;
		seen.add(tx.id);
		merged.push(tx);
	}
	return merged;
}

export const TRANSACTION_TYPE_LABELS: Record<WalletTransactionType, string> = {
	buy: 'Buy',
	sell: 'Sell',
	stake: 'Stake',
	unstake: 'Unstake',
	claim: 'Claim',
	referral: 'Referral payout',
	swap: 'Swap',
};

export function describeTransaction(tx: WalletTransaction): string {
	switch (tx.type) {
		case 'buy':
			return `Bought ${tx.keyName} keys`;
		case 'sell':
			return `Sold ${tx.keyName} keys`;
		case 'stake':
			return `Staked ${tx.keyName} keys`;
		case 'unstake':
			return `Unstaked ${tx.keyName} keys`;
		case 'claim':
			return `Claimed ${tx.keyName} rewards`;
		case 'referral':
			return `Referral payout from ${tx.keyName}`;
		case 'swap':
			return `Swapped ${tx.keyName}`;
	}
}

const CSV_HEADERS = [
	'Date',
	'Type',
	'Key',
	'Direction',
	'Amount (XLM)',
	'Fee (XLM)',
	'Transaction hash',
];

/**
 * Quotes a CSV field when needed and neutralises spreadsheet formula
 * injection, since key names are creator-controlled text.
 */
function escapeCsvField(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function transactionsToCsv(transactions: WalletTransaction[]): string {
	const rows = transactions.map(tx =>
		[
			new Date(tx.timestamp).toISOString(),
			TRANSACTION_TYPE_LABELS[tx.type],
			tx.keyName,
			tx.direction === 'in' ? 'In' : 'Out',
			String(tx.amount),
			String(tx.fee),
			tx.txHash ?? '',
		].map(escapeCsvField)
	);
	return [CSV_HEADERS, ...rows].map(row => row.join(',')).join('\r\n');
}

export function buildTransactionCsvFilename(
	filter: TransactionTypeFilter,
	preset: DateRangePreset,
	now: number = Date.now()
): string {
	const date = new Date(now).toISOString().slice(0, 10);
	return `accesslayer-transactions-${filter}-${preset}-${date}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
