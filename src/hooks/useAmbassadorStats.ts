import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type {
	AmbassadorPayout,
	AmbassadorStats,
	AmbassadorTimeRange,
	DailyReferralMetric,
} from '@/types/ambassador.types';
import { calculateAmbassadorTier, summarizePayouts } from '@/utils/ambassador.utils';

function buildMockAmbassadorStats(range: AmbassadorTimeRange, hasReferrals: boolean): AmbassadorStats {
	if (!hasReferrals) {
		return {
			summary: {
				referredUsers: 0,
				activeTraders: 0,
				volumeXlm: 0,
				totalEarningsXlm: 0,
				earnedUnclaimedXlm: 0,
				pendingXlm: 0,
				paidXlm: 0,
			},
			funnel: [
				{ stage: 'Clicks', count: 0, conversionPercent: 0 },
				{ stage: 'Sign-ups', count: 0, conversionPercent: 0 },
				{ stage: 'First Trades', count: 0, conversionPercent: 0 },
				{ stage: 'Repeat Traders', count: 0, conversionPercent: 0 },
			],
			dailyReferrals: [],
			payouts: [],
			tierProgress: calculateAmbassadorTier(0, 0),
		};
	}

	const scale = range === '7d' ? 0.35 : range === '30d' ? 1 : range === '90d' ? 2.4 : 3.5;

	const clicks = Math.round(1240 * scale);
	const signups = Math.round(310 * scale);
	const firstTrades = Math.round(142 * scale);
	const repeatTraders = Math.round(68 * scale);

	const volumeXlm = Math.round(8450 * scale);

	const payouts: AmbassadorPayout[] = [
		{
			id: 'pay-1',
			date: new Date(Date.now() - 2 * 86400000).toISOString(),
			amountXlm: Number((185.5 * scale).toFixed(2)),
			status: 'earned',
			tierName: 'Silver',
		},
		{
			id: 'pay-2',
			date: new Date(Date.now() - 9 * 86400000).toISOString(),
			amountXlm: Number((310.0 * scale).toFixed(2)),
			status: 'pending',
			tierName: 'Silver',
		},
		{
			id: 'pay-3',
			date: new Date(Date.now() - 21 * 86400000).toISOString(),
			amountXlm: Number((420.75 * scale).toFixed(2)),
			status: 'paid',
			tierName: 'Bronze',
			txHash: 'a3b4c5d6e7f890123456789abcdef0123456789abcdef0123456789abcdef012',
		},
	];

	const payoutTotals = summarizePayouts(payouts);

	const daysCount = range === '7d' ? 7 : 14;
	const dailyReferrals: DailyReferralMetric[] = Array.from({ length: daysCount }, (_, i) => {
		const d = new Date(Date.now() - (daysCount - 1 - i) * 86400000);
		return {
			date: d.toISOString().slice(5, 10),
			referrals: Math.max(1, Math.round((signups / daysCount) * (0.7 + (i % 3) * 0.25))),
			volumeXlm: Math.round((volumeXlm / daysCount) * (0.8 + (i % 4) * 0.15)),
		};
	});

	return {
		summary: {
			referredUsers: signups,
			activeTraders: firstTrades,
			volumeXlm,
			...payoutTotals,
		},
		funnel: [
			{ stage: 'Clicks', count: clicks, conversionPercent: 100 },
			{
				stage: 'Sign-ups',
				count: signups,
				conversionPercent: clicks > 0 ? Number(((signups / clicks) * 100).toFixed(1)) : 0,
			},
			{
				stage: 'First Trades',
				count: firstTrades,
				conversionPercent: signups > 0 ? Number(((firstTrades / signups) * 100).toFixed(1)) : 0,
			},
			{
				stage: 'Repeat Traders',
				count: repeatTraders,
				conversionPercent: firstTrades > 0 ? Number(((repeatTraders / firstTrades) * 100).toFixed(1)) : 0,
			},
		],
		dailyReferrals,
		payouts,
		tierProgress: calculateAmbassadorTier(signups, volumeXlm),
	};
}

export function useAmbassadorStats(
	range: AmbassadorTimeRange = '30d',
	wallet?: string,
	simulateEmpty: boolean = false
) {
	return useQuery({
		queryKey: [...queryKeys.ambassador.stats(wallet, range), simulateEmpty ? 'empty' : 'active'],
		queryFn: async () => buildMockAmbassadorStats(range, !simulateEmpty),
		staleTime: 60 * 1000,
	});
}
