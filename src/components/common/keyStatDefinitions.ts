import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import type { KeyStats } from '@/services/course.service';

export interface KeyStatDefinition {
	key: keyof KeyStats;
	label: string;
	explanation: string;
	format: (value: number | null | undefined) => string;
}

/** Stats shown in the key detail page's stats panel (#952), in display order. */
export const KEY_STAT_DEFINITIONS: readonly KeyStatDefinition[] = [
	{
		key: 'supply',
		label: 'Supply',
		explanation: 'Total number of keys currently in circulation.',
		format: formatNumber,
	},
	{
		key: 'holderCount',
		label: 'Holders',
		explanation: 'Number of unique wallets holding at least one key.',
		format: formatNumber,
	},
	{
		key: 'volume24h',
		label: '24h Volume',
		explanation: 'Total value of keys bought and sold in the last 24 hours.',
		format: formatDisplayKeyPrice,
	},
	{
		key: 'totalVolume',
		label: 'Total Volume',
		explanation: 'Cumulative value of all key trades since launch.',
		format: formatDisplayKeyPrice,
	},
	{
		key: 'twap1h',
		label: 'TWAP (1h)',
		explanation:
			'Time-weighted average price over the past hour. Smooths out brief price spikes.',
		format: formatDisplayKeyPrice,
	},
	{
		key: 'twap24h',
		label: 'TWAP (24h)',
		explanation:
			'Time-weighted average price over the past 24 hours. Less sensitive to short-term manipulation.',
		format: formatDisplayKeyPrice,
	},
];
