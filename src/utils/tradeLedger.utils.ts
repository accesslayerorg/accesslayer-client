/**
 * Helpers for the portfolio trade history table and its CSV export (#1114).
 */
import type { Trade } from '@/services/tradeHistory.service';
import { truncateWalletAddress } from '@/utils/referral.utils';

export const TRADE_LEDGER_PAGE_SIZE = 10;

export interface TradeLedgerFilters {
	/** Inclusive start date, `YYYY-MM-DD` (UTC), or empty for no lower bound. */
	from: string;
	/** Inclusive end date, `YYYY-MM-DD` (UTC), or empty for no upper bound. */
	to: string;
	/** Case-insensitive substring of the key name. */
	search: string;
}

export const EMPTY_TRADE_LEDGER_FILTERS: TradeLedgerFilters = {
	from: '',
	to: '',
	search: '',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDayStart(day: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
	const ms = Date.parse(`${day}T00:00:00.000Z`);
	return Number.isFinite(ms) ? ms : null;
}

export interface TradeAmounts {
	/** quantity × price per key. */
	subtotal: number;
	fee: number;
	/** Buy: subtotal + fee paid. Sell: subtotal − fee, what was received. */
	total: number;
}

export function computeTradeAmounts(trade: Trade): TradeAmounts {
	const subtotal = trade.quantity * trade.pricePerKey;
	const fee =
		trade.feeXlm != null && Number.isFinite(trade.feeXlm) ? trade.feeXlm : 0;
	return {
		subtotal,
		fee,
		total: trade.tradeType === 'Buy' ? subtotal + fee : subtotal - fee,
	};
}

/** Applies the date range and key-name search; newest trades first. */
export function filterTrades(
	trades: Trade[],
	filters: TradeLedgerFilters
): Trade[] {
	const fromMs = parseDayStart(filters.from);
	const toStart = parseDayStart(filters.to);
	const toMs = toStart == null ? null : toStart + DAY_MS - 1;
	const query = filters.search.trim().toLowerCase();

	return trades
		.filter(trade => {
			if (fromMs != null && trade.timestamp < fromMs) return false;
			if (toMs != null && trade.timestamp > toMs) return false;
			if (query && !trade.keyName.toLowerCase().includes(query))
				return false;
			return true;
		})
		.sort((a, b) => b.timestamp - a.timestamp);
}

export function pageCount(total: number, pageSize = TRADE_LEDGER_PAGE_SIZE) {
	return Math.max(1, Math.ceil(total / pageSize));
}

export function paginate<T>(
	items: T[],
	page: number,
	pageSize = TRADE_LEDGER_PAGE_SIZE
): T[] {
	const safePage = Math.min(
		Math.max(1, page),
		pageCount(items.length, pageSize)
	);
	const start = (safePage - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

export const TRADE_CSV_HEADERS = [
	'Date',
	'Key',
	'Direction',
	'Amount',
	'Price (XLM)',
	'Fee (XLM)',
	'Total (XLM)',
] as const;

/**
 * Quotes a field when needed and neutralises spreadsheet formula injection,
 * since key names are creator-controlled text.
 */
function escapeCsvField(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV for every trade passed in; callers pass all matching rows, not one page. */
export function tradesToCsv(trades: Trade[]): string {
	const rows = trades.map(trade => {
		const { fee, total } = computeTradeAmounts(trade);
		return [
			new Date(trade.timestamp).toISOString(),
			trade.keyName,
			trade.tradeType,
			String(trade.quantity),
			String(trade.pricePerKey),
			String(fee),
			String(total),
		].map(escapeCsvField);
	});
	return [[...TRADE_CSV_HEADERS], ...rows]
		.map(row => row.join(','))
		.join('\r\n');
}

export function buildTradeCsvFilename(now: number = Date.now()): string {
	return `accesslayer-trade-history-${new Date(now).toISOString().slice(0, 10)}.csv`;
}

export const TRADE_HISTORY_CSV_HEADERS = [
	'Date',
	'Key Name',
	'Type',
	'Quantity',
	'Price per Key',
	'Total',
	'Fee',
] as const;

/**
 * Generates formatted CSV content for trade history export (#857).
 * Columns: Date, Key Name, Type, Quantity, Price per Key, Total, Fee
 */
export function generateTradeHistoryCsv(trades: Trade[]): string {
	const rows = trades.map(trade => {
		const { fee, total } = computeTradeAmounts(trade);
		return [
			new Date(trade.timestamp).toISOString(),
			trade.keyName,
			trade.tradeType,
			String(trade.quantity),
			String(trade.pricePerKey),
			String(total),
			String(fee),
		].map(escapeCsvField);
	});
	return [[...TRADE_HISTORY_CSV_HEADERS], ...rows]
		.map(row => row.join(','))
		.join('\r\n');
}

/**
 * Builds the export filename for trade history (#857):
 * trades-[wallet-truncated]-[date].csv
 */
export function buildTradeHistoryCsvFilename(
	wallet: string,
	now: number | Date | string = Date.now()
): string {
	const truncated = truncateWalletAddress(wallet) || wallet;
	const dateObj =
		typeof now === 'number' || typeof now === 'string' ? new Date(now) : now;
	const date = dateObj.toISOString().slice(0, 10);
	return `trades-${truncated}-${date}.csv`;
}
