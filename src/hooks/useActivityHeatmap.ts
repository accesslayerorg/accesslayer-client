import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { keyTradeService, type KeyTrade } from '@/services/keyTrades.service';
import { useTimezone } from '@/hooks/useTimezone';

export type HeatmapRange = '7d' | '30d' | '90d';
export type HeatmapMetric = 'trades' | 'volume';

export interface HeatmapCell {
	day: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
	dayName: string;
	hour: number; // 0 - 23
	hourLabel: string;
	tradeCount: number;
	volume: number;
}

export interface BusiestSlot {
	day: number;
	dayName: string;
	hour: number;
	hourLabel: string;
	tradeCount: number;
	volume: number;
}

export const WEEKDAYS = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
] as const;

export const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatHourLabel(hour: number): string {
	const h = hour % 12 || 12;
	const ampm = hour < 12 ? 'AM' : 'PM';
	return `${h}:00 ${ampm}`;
}

export function getLocalDayAndHour(
	timestamp: number,
	timeZone: string
): { day: number; hour: number } {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			weekday: 'short',
			hour: 'numeric',
			hour12: false,
		});
		const parts = formatter.formatToParts(new Date(timestamp));
		let weekdayStr = '';
		let hour = 0;

		for (const p of parts) {
			if (p.type === 'weekday') weekdayStr = p.value;
			if (p.type === 'hour') {
				hour = parseInt(p.value, 10);
				if (hour === 24) hour = 0;
			}
		}

		const dayIndexMap: Record<string, number> = {
			Sun: 0,
			Mon: 1,
			Tue: 2,
			Wed: 3,
			Thu: 4,
			Fri: 5,
			Sat: 6,
		};

		const day = dayIndexMap[weekdayStr] ?? new Date(timestamp).getUTCDay();
		return { day, hour };
	} catch {
		const d = new Date(timestamp);
		return { day: d.getUTCDay(), hour: d.getUTCHours() };
	}
}

export function aggregateHeatmap(
	trades: KeyTrade[],
	timeZone: string,
	rangeDays: number
): {
	grid: HeatmapCell[][];
	busiestTrades: BusiestSlot | null;
	busiestVolume: BusiestSlot | null;
	totalTrades: number;
	totalVolume: number;
} {
	// Initialize 7 days x 24 hours grid
	const grid: HeatmapCell[][] = Array.from({ length: 7 }, (_, day) =>
		Array.from({ length: 24 }, (_, hour) => ({
			day,
			dayName: WEEKDAYS[day] ?? 'Day',
			hour,
			hourLabel: formatHourLabel(hour),
			tradeCount: 0,
			volume: 0,
		}))
	);

	const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
	let totalTrades = 0;
	let totalVolume = 0;

	for (const trade of trades) {
		if (trade.timestamp < cutoff) continue;

		const { day, hour } = getLocalDayAndHour(trade.timestamp, timeZone);
		const cell = grid[day]?.[hour];
		if (!cell) continue;

		cell.tradeCount += 1;
		const tradeVolume = (trade.quantity || 0) * (trade.price || 0);
		cell.volume += tradeVolume;

		totalTrades += 1;
		totalVolume += tradeVolume;
	}

	let busiestTrades: BusiestSlot | null = null;
	let busiestVolume: BusiestSlot | null = null;

	for (let d = 0; d < 7; d++) {
		for (let h = 0; h < 24; h++) {
			const cell = grid[d]?.[h];
			if (!cell) continue;

			if (cell.tradeCount > 0) {
				if (!busiestTrades || cell.tradeCount > busiestTrades.tradeCount) {
					busiestTrades = {
						day: d,
						dayName: cell.dayName,
						hour: h,
						hourLabel: cell.hourLabel,
						tradeCount: cell.tradeCount,
						volume: cell.volume,
					};
				}
			}

			if (cell.volume > 0) {
				if (!busiestVolume || cell.volume > busiestVolume.volume) {
					busiestVolume = {
						day: d,
						dayName: cell.dayName,
						hour: h,
						hourLabel: cell.hourLabel,
						tradeCount: cell.tradeCount,
						volume: cell.volume,
					};
				}
			}
		}
	}

	return {
		grid,
		busiestTrades,
		busiestVolume,
		totalTrades,
		totalVolume,
	};
}

export function useActivityHeatmap(
	keyId?: string,
	range: HeatmapRange = '30d',
	timeZoneOverride?: string
) {
	const storeZone = useTimezone(state => state.effectiveTimezone);
	const timeZone = timeZoneOverride || storeZone || 'UTC';

	const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;

	const {
		data: trades = [],
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ['key-trades-activity', keyId, range],
		queryFn: async () => {
			if (!keyId) return [];
			return keyTradeService.getKeyTrades(keyId, 200);
		},
		enabled: Boolean(keyId),
		staleTime: 60_000,
	});

	const aggregated = useMemo(() => {
		return aggregateHeatmap(trades, timeZone, rangeDays);
	}, [trades, timeZone, rangeDays]);

	const hasMinimumData = aggregated.totalTrades >= 3;

	const summarySentence = useMemo(() => {
		if (!hasMinimumData || !aggregated.busiestTrades) {
			return 'Not enough trade data to identify peak trading windows.';
		}
		const b = aggregated.busiestTrades;
		return `Busiest slot: ${b.dayName}s at ${b.hourLabel} with ${b.tradeCount} trade${b.tradeCount === 1 ? '' : 's'}.`;
	}, [hasMinimumData, aggregated.busiestTrades]);

	return {
		grid: aggregated.grid,
		busiestTrades: aggregated.busiestTrades,
		busiestVolume: aggregated.busiestVolume,
		totalTrades: aggregated.totalTrades,
		totalVolume: aggregated.totalVolume,
		hasMinimumData,
		summarySentence,
		timeZone,
		isLoading,
		isError,
		refetch,
	};
}
