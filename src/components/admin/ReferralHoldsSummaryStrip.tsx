import React from 'react';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { ReferralHoldsSummary } from '@/services/adminReferralHolds.service';

export interface ReferralHoldsSummaryStripProps {
	summary?: ReferralHoldsSummary | null;
	isLoading?: boolean;
}

const CARDS = [
	{
		key: 'held' as const,
		label: 'Held',
		testId: 'referral-holds-summary-held',
		accent: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
	},
	{
		key: 'released' as const,
		label: 'Released',
		testId: 'referral-holds-summary-released',
		accent: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
	},
	{
		key: 'rejected' as const,
		label: 'Rejected',
		testId: 'referral-holds-summary-rejected',
		accent: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
	},
];

export const ReferralHoldsSummaryStrip: React.FC<
	ReferralHoldsSummaryStripProps
> = ({ summary, isLoading = false }) => (
	<div
		className="grid grid-cols-1 gap-4 sm:grid-cols-3"
		data-testid="referral-holds-summary"
		aria-label="Referral hold counts"
	>
		{CARDS.map(card => (
			<div
				key={card.key}
				className="flex h-[110px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md"
				data-testid={card.testId}
			>
				<span className="font-jakarta text-xs font-medium text-white/50">
					{card.label}
				</span>
				<span
					className={`font-mono text-2xl font-bold ${card.accent} inline-flex w-fit rounded-lg border px-2 py-0.5`}
					data-testid={`referral-holds-summary-count-${card.key}`}
				>
					{isLoading ? '—' : formatNumber(summary?.[card.key])}
				</span>
			</div>
		))}
	</div>
);

export default ReferralHoldsSummaryStrip;
