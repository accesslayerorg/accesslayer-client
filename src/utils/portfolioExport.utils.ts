import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { RevenueShareDistribution } from '@/types/revenueShare';
import type { ProtocolRevenueDistribution } from '@/services/stakerRevenue.service';
import type { RevenueDistributionRecord } from '@/types/creatorRevenue';
import { truncateWalletAddress } from '@/utils/referral.utils';

/**
 * Quotes a field when needed and neutralises spreadsheet formula injection.
 */
function escapeCsvField(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const HOLDINGS_SNAPSHOT_CSV_HEADERS = [
	'Key ID',
	'Key Name',
	'Quantity',
	'Current Price (XLM)',
	'Current Value (XLM)',
	'Average Buy Price (XLM)',
	'Cost Basis (XLM)',
	'Unrealised PnL (XLM)',
	'Unrealised PnL (%)',
	'Unclaimed Dividends (XLM)',
] as const;

/**
 * Generates a CSV for the current holdings snapshot.
 */
export function generateHoldingsSnapshotCsv(holdings: HeldKeyPosition[], keyNameMap?: Record<string, string | undefined>): string {
	const rows = holdings.map(holding => {
		const currentPriceStroops = holding.priceStroops ?? 0;
		const currentPriceXlm = currentPriceStroops / 10_000_000;
		const quantity = holding.quantity ?? 0;
		const currentValue = quantity * currentPriceXlm;
		const avgBuyPriceStroops = holding.averagePurchasePriceStroops ?? 0;
		const avgBuyPriceXlm = avgBuyPriceStroops / 10_000_000;
		const costBasis = quantity * avgBuyPriceXlm;
		const unrealisedPnL = currentValue - costBasis;
		const unrealisedPnLPercent = costBasis > 0 ? (unrealisedPnL / costBasis) * 100 : 0;
		const unclaimedDividend = holding.unclaimedDividend ?? 0;

		const keyName = keyNameMap?.[holding.creatorId] ?? holding.creatorId;

		return [
			holding.creatorId,
			keyName,
			String(quantity),
			String(currentPriceXlm.toFixed(7)),
			String(currentValue.toFixed(7)),
			String(avgBuyPriceXlm.toFixed(7)),
			String(costBasis.toFixed(7)),
			String(unrealisedPnL.toFixed(7)),
			String(unrealisedPnLPercent.toFixed(2)),
			String(unclaimedDividend.toFixed(7)),
		].map(escapeCsvField);
	});

	return [[...HOLDINGS_SNAPSHOT_CSV_HEADERS], ...rows]
		.map(row => row.join(','))
		.join('\r\n');
}

export const DISTRIBUTIONS_CSV_HEADERS = [
	'Date',
	'Distribution Type',
	'Key ID',
	'Key Name',
	'Total Distributed (XLM)',
	'Holder Count',
	'Your Share (XLM)',
	'Claimed',
	'Received Amount (XLM)',
	'Claimed At',
	'Transaction Hash',
] as const;

type UnifiedDistribution =
	| { type: 'creator_revenue'; record: RevenueDistributionRecord; userShare?: number; claimed?: boolean; receivedAmount?: number; claimedAt?: number; txHash?: string }
	| { type: 'revenue_share'; record: RevenueShareDistribution }
	| { type: 'protocol_revenue'; record: ProtocolRevenueDistribution };

function normalizeDistribution(d: UnifiedDistribution): string[] {
	if (d.type === 'creator_revenue') {
		const r = d.record;
		return [
			new Date(r.timestamp).toISOString(),
			'Creator Revenue Distribution',
			r.creatorId,
			r.wallet ?? 'N/A',
			String(r.amount),
			String(r.holderCount),
			String(d.userShare ?? 0),
			d.claimed ? 'Yes' : 'No',
			String(d.receivedAmount ?? 0),
			d.claimedAt ? new Date(d.claimedAt).toISOString() : '',
			d.txHash ?? '',
		].map(escapeCsvField);
	}
	if (d.type === 'revenue_share') {
		const r = d.record;
		return [
			new Date(r.timestamp).toISOString(),
			'Revenue Share (Holder Claim)',
			r.creatorId,
			'N/A',
			String(r.amount),
			String(r.holderCount),
			String(r.userShare),
			r.claimed ? 'Yes' : 'No',
			String(r.receivedAmount ?? 0),
			r.claimedAt ? new Date(r.claimedAt).toISOString() : '',
			'',
		].map(escapeCsvField);
	}
	// protocol_revenue
	const r = d.record;
	return [
		new Date(r.distributionDate).toISOString(),
		'Protocol Revenue Distribution',
		'N/A',
		'N/A',
		String(r.totalDistributed),
		String(r.stakerCount),
		String(r.amountReceived),
		r.claimed ? 'Yes' : 'No',
		String(r.amountReceived),
		r.transactionHash ? '' : '',
		r.transactionHash ?? '',
	].map(escapeCsvField);
}

/**
 * Generates a CSV for all distribution types combined.
 */
export function generateDistributionsCsv(distributions: UnifiedDistribution[]): string {
	const rows = distributions.map(normalizeDistribution);
	return [[...DISTRIBUTIONS_CSV_HEADERS], ...rows]
		.map(row => row.join(','))
		.join('\r\n');
}

export function buildExportFilename(
	wallet: string,
	exportType: 'trade-history' | 'holdings-snapshot' | 'distributions',
	dateRange: { preset: string; from?: number; to?: number } | null
): string {
	const truncated = truncateWalletAddress(wallet) || wallet;
	const now = new Date();
	let rangeLabel: string;

	if (!dateRange || dateRange.preset === 'all') {
		rangeLabel = 'all-time';
	} else if (dateRange.preset === 'custom' && dateRange.from && dateRange.to) {
		const fromStr = new Date(dateRange.from).toISOString().slice(0, 10);
		const toStr = new Date(dateRange.to).toISOString().slice(0, 10);
		rangeLabel = `${fromStr}-to-${toStr}`;
	} else {
		rangeLabel = dateRange.preset;
	}

	const typeLabel = exportType === 'trade-history' ? 'trades' : exportType;
	return `${typeLabel}-${truncated}-${rangeLabel}-${now.toISOString().slice(0, 10)}.csv`;
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

export function buildKeyAnalyticsExportFilename(
	creatorId: string,
	wallet: string,
	exportType: string,
	dateRange: { preset: string; from?: number; to?: number } | null
): string {
	const truncatedWallet = wallet.length > 10 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
	const truncatedKey = creatorId.length > 10 ? `${creatorId.slice(0, 6)}…${creatorId.slice(-4)}` : creatorId;
	const now = new Date();
	let rangeLabel: string;

	if (!dateRange || dateRange.preset === 'all') {
		rangeLabel = 'all-time';
	} else if (dateRange.preset === 'custom' && dateRange.from && dateRange.to) {
		const fromStr = new Date(dateRange.from).toISOString().slice(0, 10);
		const toStr = new Date(dateRange.to).toISOString().slice(0, 10);
		rangeLabel = `${fromStr}-to-${toStr}`;
	} else {
		rangeLabel = dateRange.preset;
	}

	const typeLabel = exportType === 'trade-history' ? 'trades' : exportType;
	return `${typeLabel}-${truncatedKey}-${truncatedWallet}-${rangeLabel}-${now.toISOString().slice(0, 10)}.csv`;
}

// Re-export trade history CSV utilities for convenience
export { generateTradeHistoryCsv, TRADE_HISTORY_CSV_HEADERS } from '@/utils/tradeLedger.utils';