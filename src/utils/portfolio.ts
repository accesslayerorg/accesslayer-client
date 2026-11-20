import type { Trade } from '@/services/tradeHistory.service';

export interface CostBasisPosition {
	quantity: number;
	totalCost: number;
	averageCost: number;
}

export interface RealizedGain {
	id: string;
	keyName: string;
	timestamp: number;
	quantity: number;
	proceeds: number;
	costBasis: number;
	gain: number;
}

function chronologicalTrades(trades: readonly Trade[]): Trade[] {
	return [...trades].sort((a, b) => a.timestamp - b.timestamp);
}

function isUsableTrade(trade: Trade): boolean {
	return (
		Number.isFinite(trade.quantity) &&
		trade.quantity > 0 &&
		Number.isFinite(trade.pricePerKey) &&
		trade.pricePerKey >= 0
	);
}

/**
 * Calculates each key's remaining quantity and average purchase price.
 * Sells remove units at the current average cost, leaving the average cost
 * of the remaining units unchanged.
 */
export function calculateCostBasis(
	trades: readonly Trade[]
): Map<string, CostBasisPosition> {
	const positions = new Map<string, CostBasisPosition>();

	for (const trade of chronologicalTrades(trades)) {
		if (!isUsableTrade(trade)) continue;

		const position = positions.get(trade.keyName) ?? {
			quantity: 0,
			totalCost: 0,
			averageCost: 0,
		};

		if (trade.tradeType === 'Buy') {
			position.quantity += trade.quantity;
			position.totalCost += trade.quantity * trade.pricePerKey;
		} else if (trade.tradeType === 'Sell') {
			const quantitySold = Math.min(trade.quantity, position.quantity);
			position.quantity -= quantitySold;
			position.totalCost = Math.max(
				0,
				position.totalCost - quantitySold * position.averageCost
			);
		}

		position.averageCost =
			position.quantity > 0 ? position.totalCost / position.quantity : 0;
		positions.set(trade.keyName, position);
	}

	return positions;
}

/** Returns one realized-gain row for every sell, using average-cost accounting. */
export function calculateRealizedGains(
	trades: readonly Trade[]
): RealizedGain[] {
	const positions = new Map<string, CostBasisPosition>();
	const gains: RealizedGain[] = [];

	for (const trade of chronologicalTrades(trades)) {
		if (!isUsableTrade(trade)) continue;

		const position = positions.get(trade.keyName) ?? {
			quantity: 0,
			totalCost: 0,
			averageCost: 0,
		};

		if (trade.tradeType === 'Buy') {
			position.quantity += trade.quantity;
			position.totalCost += trade.quantity * trade.pricePerKey;
			position.averageCost = position.totalCost / position.quantity;
		} else if (trade.tradeType === 'Sell') {
			const quantitySold = Math.min(trade.quantity, position.quantity);
			const costBasis = quantitySold * position.averageCost;
			const proceeds = quantitySold * trade.pricePerKey;

			gains.push({
				id: trade.id,
				keyName: trade.keyName,
				timestamp: trade.timestamp,
				quantity: quantitySold,
				proceeds,
				costBasis,
				gain: proceeds - costBasis,
			});

			position.quantity -= quantitySold;
			position.totalCost = Math.max(0, position.totalCost - costBasis);
			position.averageCost =
				position.quantity > 0 ? position.totalCost / position.quantity : 0;
		}

		positions.set(trade.keyName, position);
	}

	return gains;
}

export const GAINS_CSV_HEADERS = [
	'Date',
	'Key',
	'Quantity',
	'Proceeds',
	'Cost Basis',
	'Gain',
] as const;

function escapeCsv(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Creates a spreadsheet-safe CSV for the selected realized-gain rows. */
export function exportGainsCsv(rows: readonly RealizedGain[]): string {
	return [
		[...GAINS_CSV_HEADERS],
		...rows.map(row => [
			new Date(row.timestamp).toISOString(),
			row.keyName,
			String(row.quantity),
			String(row.proceeds),
			String(row.costBasis),
			String(row.gain),
		]),
	]
		.map(row => row.map(escapeCsv).join(','))
		.join('\r\n');
}
