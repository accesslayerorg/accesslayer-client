import { Link } from 'react-router';
import { Coins } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPercent, formatXlmPrice } from '@/utils/numberFormat.utils';
import {
	computeEstimatedApy,
	hasStakingActivity,
	type StakingPoolStats,
} from '@/utils/stakingRewards.utils';

export interface StakingRewardsSectionProps extends StakingPoolStats {
	/** Whether the key detail data is still loading. */
	isLoading?: boolean;
	/** Where the "Stake your keys" CTA links to. */
	stakeHref?: string;
}

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

/**
 * Staking Rewards panel for the key detail page (#817).
 *
 * Shows the current reward pool balance, total keys staked and an estimated
 * APY derived from recent protocol fee inflows, plus a CTA into the portfolio
 * staking tab. Renders a loading skeleton while the key detail data is in
 * flight, and renders nothing once loaded if the key has no staking activity
 * (nothing staked and an empty pool).
 */
const StakingRewardsSection: React.FC<StakingRewardsSectionProps> = ({
	stakingPoolBalance,
	totalStaked,
	recentFeeInflow,
	isLoading = false,
	stakeHref = '/profile?tab=staking',
}) => {
	if (isLoading) {
		return (
			<section className={CARD_CLASS} data-testid="staking-rewards-skeleton" aria-busy="true">
				<Skeleton className="h-6 w-40" />
				<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
				<Skeleton className="mt-6 h-10 w-44" />
			</section>
		);
	}

	const stats: StakingPoolStats = {
		stakingPoolBalance,
		totalStaked,
		recentFeeInflow,
	};

	if (!hasStakingActivity(stats)) {
		return null;
	}

	const apy = computeEstimatedApy(stats);

	const items = [
		{
			label: 'Pool balance',
			value: formatXlmPrice(stakingPoolBalance ?? 0),
			testId: 'staking-pool-balance',
		},
		{
			label: 'Total staked',
			value: `${formatNumber(totalStaked ?? 0)} keys`,
			testId: 'staking-total-staked',
		},
		{
			label: 'Est. APY',
			value: apy == null ? '—' : formatPercent(apy, { maximumFractionDigits: 1 }),
			testId: 'staking-estimated-apy',
		},
	];

	return (
		<section className={CARD_CLASS} data-testid="staking-rewards-section">
			<div className="mb-6 flex items-center gap-2">
				<Coins className="size-5 text-amber-300" aria-hidden="true" />
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Staking Rewards
				</h2>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{items.map(item => (
					<div
						key={item.label}
						className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
						data-testid={item.testId}
					>
						<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
							{item.label}
						</p>
						<p className="mt-2 font-jakarta text-base font-bold text-white md:text-[1.05rem]">
							{item.value}
						</p>
					</div>
				))}
			</div>

			<p className="mt-4 text-xs text-white/45">
				APY is an estimate: last month&apos;s protocol fee inflow, annualised over the
				current pool balance. Actual rewards vary with trading volume.
			</p>

			<Button asChild className="mt-6" data-testid="staking-cta">
				<Link to={stakeHref}>Stake your keys</Link>
			</Button>
		</section>
	);
};

export default StakingRewardsSection;
