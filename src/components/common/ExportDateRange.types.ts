export type ExportDateRangePreset = '30d' | '90d' | '1y' | 'all';

export const EXPORT_DATE_RANGE_PRESETS = [
	{ value: '30d', label: '30 days', description: 'Last 30 days' },
	{ value: '90d', label: '90 days', description: 'Last 90 days' },
	{ value: '1y', label: '1 year', description: 'Last year' },
	{ value: 'all', label: 'All time', description: 'Complete history' },
] as const;

export interface CustomDateRange {
	start: string;
	end: string;
}

export interface ResolvedExportDateRange {
	from?: number;
	to?: number;
	preset: ExportDateRangePreset | 'custom';
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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

export function resolveExportDateRange(
	preset: ExportDateRangePreset | 'custom',
	custom: CustomDateRange,
	now: number = Date.now()
): ResolvedExportDateRange | null {
	switch (preset) {
		case '30d':
			return { from: now - 30 * DAY_MS, to: now, preset: '30d' };
		case '90d':
			return { from: now - 90 * DAY_MS, to: now, preset: '90d' };
		case '1y':
			return { from: now - 365 * DAY_MS, to: now, preset: '1y' };
		case 'all':
			return { preset: 'all' };
		case 'custom': {
			const start = parseLocalDate(custom.start);
			const end = parseLocalDate(custom.end);
			if (!start || !end) return null;
			const from = startOfDay(start);
			const to = endOfDay(end);
			if (from > to) return null;
			return { from, to, preset: 'custom' };
		}
	}
}

export function formatPresetLabel(preset: ExportDateRangePreset | 'custom'): string {
	const found = EXPORT_DATE_RANGE_PRESETS.find(p => p.value === preset);
	if (found) return found.label;
	return 'Custom';
}