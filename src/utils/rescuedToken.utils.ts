import type { RescuedTokenRecord, RescuedTokenTotal } from '@/types/rescuedToken';

export function aggregateRescuedTokens(records: RescuedTokenRecord[]): RescuedTokenTotal[] {
	const totals = new Map<string, RescuedTokenTotal>();
	for (const record of records) {
		if (!record.token || !Number.isFinite(record.amount) || record.amount < 0) continue;
		const current = totals.get(record.token) ?? { token: record.token, total: 0, count: 0 };
		current.total += record.amount;
		current.count += 1;
		totals.set(record.token, current);
	}
	return [...totals.values()].sort((left, right) => right.total - left.total);
}

export function formatRescuedTokenTotal(total: RescuedTokenTotal): string {
	return `${total.total.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${total.token}`;
}
