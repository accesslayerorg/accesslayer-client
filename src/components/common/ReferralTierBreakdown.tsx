import React from 'react';
import { Users } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import {
	REFERRAL_TIERS,
	type ReferralTierCounts,
} from '@/utils/referral.utils';

export interface ReferralTierBreakdownProps {
	/** Referred wallet counts per tier. */
	counts: ReferralTierCounts;
	/** Whether the referred-wallets list is still loading. */
	isLoading?: boolean;
	className?: string;
}

const TIER_DESCRIPTIONS: Record<number, string> = {
	1: 'Wallets you referred directly',
	2: 'Wallets referred by your referrals',
	3: 'Second-degree referrals',
};

/**
 * Tier depth breakdown for the referral dashboard (#1119).
 *
 * Shows how many wallets sit at each depth of the referral network
 * (Tier 1 / 2 / 3).
 */
export const ReferralTierBreakdown: React.FC<ReferralTierBreakdownProps> = ({
	counts,
	isLoading = false,
	className,
}) => {
	if (isLoading) {
		return (
			<section
				className={className}
				data-testid="referral-tier-breakdown-skeleton"
			>
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			</section>
		);
	}

	return (
		<section
			className={className}
			data-testid="referral-tier-breakdown"
			aria-label="Referral tier breakdown"
		>
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				Tier breakdown
			</h2>
			<p className="mt-1 text-sm text-white/60">
				How many wallets sit at each depth of your referral network.
			</p>

			<dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				{REFERRAL_TIERS.map(tier => (
					<div
						key={tier}
						className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
						data-testid={`referral-tier-${tier}`}
					>
						<dt className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
							<Users className="size-3" aria-hidden="true" />
							Tier {tier}
						</dt>
						<dd className="mt-1 font-mono text-lg font-bold text-white">
							{counts[tier]}
						</dd>
						<p className="mt-1 text-xs text-white/45">
							{TIER_DESCRIPTIONS[tier]}
						</p>
					</div>
				))}
			</dl>
		</section>
	);
};

export default ReferralTierBreakdown;
