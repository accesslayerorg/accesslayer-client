import {
	calculatePositionPnL,
	type HeldKeyPosition,
	type PositionPnL,
} from '@/utils/portfolioValue.utils';

/**
 * Row model + sorting for the wallet portfolio positions table (#1116).
 *
 * Each row pairs a held key position with its resolved unrealised P&L so the
 * table can be re-ordered by PnL %, current value, or key name without
 * recomputing the math per render. Rows whose sort key is unknown (`null`
 * P&L / value) always sink to the end of the list in both directions, so a
 * position with withheld P&L never outranks a known one.
 */

export interface PortfolioTableRow {
	/** Creator key id — also the row's navigation target. */
	creatorId: string;
	/** Display name of the key, falling back to the raw id. */
	keyName: string;
	position: HeldKeyPosition;
	pnl: PositionPnL;
}

export type PortfolioTableSortKey = 'pnl_percent' | 'current_value' | 'key_name';

export type PortfolioTableSortDirection = 'asc' | 'desc';

export const PORTFOLIO_TABLE_SORT_OPTIONS: ReadonlyArray<{
	value: PortfolioTableSortKey;
	label: string;
}> = [
	{ value: 'pnl_percent', label: 'Unrealised PnL %' },
	{ value: 'current_value', label: 'Current value' },
	{ value: 'key_name', label: 'Key name' },
];

/** Default direction applied when a column is first sorted by. */
export function defaultDirectionForSortKey(
	key: PortfolioTableSortKey
): PortfolioTableSortDirection {
	return key === 'key_name' ? 'asc' : 'desc';
}

/**
 * Builds one table row per held position, attaching a display name and the
 * resolved unrealised P&L for the position.
 */
export function buildPortfolioTableRows(
	positions: HeldKeyPosition[],
	keyNames?: Record<string, string | undefined>
): PortfolioTableRow[] {
	return positions.map(position => ({
		creatorId: position.creatorId,
		keyName:
			keyNames?.[position.creatorId]?.trim() || position.creatorId,
		position,
		pnl: calculatePositionPnL(position),
	}));
}

function compareUnknownLast(
	a: number | null | undefined,
	b: number | null | undefined,
	direction: PortfolioTableSortDirection
): number {
	const aKnown = a != null && Number.isFinite(a);
	const bKnown = b != null && Number.isFinite(b);
	if (!aKnown && !bKnown) return 0;
	if (!aKnown) return 1;
	if (!bKnown) return -1;
	const diff = (a as number) - (b as number);
	return direction === 'asc' ? diff : -diff;
}

/**
 * Returns a new array of rows sorted by `key` in `direction`.
 * Ties always break on creator id (ascending) so ordering is stable.
 */
export function sortPortfolioTableRows(
	rows: PortfolioTableRow[],
	key: PortfolioTableSortKey,
	direction: PortfolioTableSortDirection
): PortfolioTableRow[] {
	const sorted = [...rows];

	switch (key) {
		case 'pnl_percent':
			sorted.sort((a, b) => {
				const result = compareUnknownLast(
					a.pnl.pnlPercentage,
					b.pnl.pnlPercentage,
					direction
				);
				return result !== 0
					? result
					: a.creatorId.localeCompare(b.creatorId);
			});
			break;
		case 'current_value':
			sorted.sort((a, b) => {
				const result = compareUnknownLast(
					a.pnl.currentValueStroops,
					b.pnl.currentValueStroops,
					direction
				);
				return result !== 0
					? result
					: a.creatorId.localeCompare(b.creatorId);
			});
			break;
		case 'key_name':
		default:
			sorted.sort((a, b) => {
				const result = a.keyName.localeCompare(b.keyName);
				const directed = direction === 'asc' ? result : -result;
				return directed !== 0
					? directed
					: a.creatorId.localeCompare(b.creatorId);
			});
			break;
	}

	return sorted;
}
