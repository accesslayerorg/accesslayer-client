import React from 'react';
import Skeleton from '@/components/ui/skeleton';
import { AsyncButton } from '@/components/ui/async-button';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import type { ReferralEarnings } from '@/utils/referral.utils';

export interface ReferralEarningsPanelProps {
	/** Aggregated earnings figures resolved by `useReferralSummary`. */
	earnings: ReferralEarnings;
	/** Whether the summary query is in flight. */
	isLoading?: boolean;
	/** Whether a claim transaction is being submitted. */
	isClaiming?: boolean;
	/** Submits the withdrawal of the pending balance. */
	onClaim?: (amountXlm: number) => void;
	className?: string;
}

/**
 * Referral earnings tracker for the referral dashboard (#963).
 *
 * Shows the lifetime total earned, the pending (claimable) balance, and the
 * already-withdrawn total, with a claim action that initiates the contract
 * withdrawal flow.
 */
export const ReferralEarningsPanel: React.FC<ReferralEarningsPanelProps> = ({
	earnings,
	isLoading = false,
	isClaiming = false,
	onClaim,
	className,
}) => {
	if (isLoading) {
		return (
			<section className={className} data-testid="referral-earnings-skeleton">
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
		<section className={className} data-testid="referral-earnings-panel">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						Referral earnings
					</h2>
					<p className="mt-1 text-sm text-white/60">
						{formatXlmPrice(earnings.pendingXlm)} available to withdraw
					</p>
				</div>
				<AsyncButton
					type="button"
					className="rounded-xl"
					disabled={!earnings.hasClaimable}
					isPending={isClaiming}
					pendingText="Claiming…"
					onClick={() => onClaim?.(earnings.pendingXlm)}
					data-testid="referral-claim-button"
				>
					Claim rewards
				</AsyncButton>
			</div>

			<dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Total earned
					</dt>
					<dd
						className="mt-1 font-mono text-lg font-bold text-white"
						data-testid="referral-total-earned"
					>
						{formatXlmPrice(earnings.totalEarnedXlm)}
					</dd>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Pending
					</dt>
					<dd
						className="mt-1 font-mono text-lg font-bold text-amber-300"
						data-testid="referral-pending"
					>
						{formatXlmPrice(earnings.pendingXlm)}
					</dd>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Withdrawn
					</dt>
					<dd
						className="mt-1 font-mono text-lg font-bold text-white/80"
						data-testid="referral-claimed"
					>
						{formatXlmPrice(earnings.claimedXlm)}
					</dd>
				</div>
			</dl>
		</section>
	);
};

export default ReferralEarningsPanel;
