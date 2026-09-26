import { UserCheck, Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { useRoyaltyEarnings } from '@/hooks/useRoyaltyEarnings';
import { useClaimRoyaltiesMutation } from '@/hooks/useRoyaltyClaim';
import { truncateTxHash, buildStellarExpertTxUrl } from '@/constants/stellar';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatRelativeTimeLabel } from '@/utils/time.utils';
import type {
	RoyaltyEarnings,
	RoyaltyEarningsEvent,
	RoyaltyClaim,
} from '@/services/royaltyEarnings.service';

/**
 * Royalty earnings section for the creator key management dashboard
 * (issue #987): totals card, per-transfer breakdown, claim button, and
 * claimed history with transaction hash links. Values refresh on a 60s
 * interval via useRoyaltyEarnings.
 */

const CLAIM_BUTTON_TEST_ID = 'claim-royalties-button';

/** Formats an XLM amount (the royalty API's unit) for display. */
function formatXlmLabel(amount: number): string {
	return `${formatNumber(amount, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
	})} XLM`;
}

function EarningsTotalsCard({ earnings }: { earnings: RoyaltyEarnings }) {
	const totals = [
		{ label: 'Total Earned', value: earnings.totalEarned, testId: 'royalty-total-earned' },
		{ label: 'Pending', value: earnings.pending, testId: 'royalty-pending' },
		{ label: 'Claimed', value: earnings.claimed, testId: 'royalty-claimed' },
	];

	return (
		<div
			className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
			data-testid="royalty-totals-card"
		>
			{totals.map(({ label, value, testId }) => (
				<div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
					<span className="text-xs font-medium text-white/60">{label}</span>
					<p
						data-testid={testId}
						className="mt-1 font-grotesque text-2xl font-black text-white"
					>
						{formatXlmLabel(value)}
					</p>
				</div>
			))}
		</div>
	);
}

function TransferBreakdownList({ events }: { events: RoyaltyEarningsEvent[] }) {
	if (events.length === 0) {
		return (
			<div
				className="rounded-2xl border border-dashed border-white/10 py-8 text-center"
				data-testid="royalty-events-empty"
			>
				<p className="text-sm font-medium text-white/70">No royalty events yet</p>
				<p className="mt-1 text-xs text-white/40">
					Royalties from secondary key transfers will appear here.
				</p>
			</div>
		);
	}

	return (
		<ul className="divide-y divide-white/5 rounded-2xl border border-white/10" data-testid="royalty-events-list">
			{events.map(event => (
				<li key={event.id} className="flex items-center justify-between gap-4 px-4 py-3">
					<div>
						<p className="text-sm font-semibold text-white" data-testid="royalty-event-amount">
							{formatXlmLabel(event.transferAmount)}
						</p>
						<p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
						<Clock className="size-3" aria-hidden="true" />
						{formatRelativeTimeLabel(new Date(event.timestamp))}
						</p>
					</div>
					<div className="text-right">
						<p className="text-xs uppercase tracking-wider text-white/40">Royalty</p>
						<p
							className="font-mono text-sm font-bold text-amber-300"
							data-testid="royalty-event-royalty"
						>
							+{formatXlmLabel(event.royaltyEarned)}
						</p>
					</div>
				</li>
			))}
		</ul>
	);
}

function ClaimedHistoryList({ claims }: { claims: RoyaltyClaim[] }) {
	if (claims.length === 0) {
		return (
			<p
				className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/40"
				data-testid="royalty-claims-empty"
			>
				No claims yet. Claimed payouts will show their transaction hash here.
			</p>
		);
	}

	return (
		<ul className="divide-y divide-white/5 rounded-2xl border border-white/10" data-testid="royalty-claims-list">
			{claims.map(claim => (
				<li key={claim.id} className="flex items-center justify-between gap-4 px-4 py-3">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="size-4 text-green-400" aria-hidden="true" />
						<div>
							<p className="font-mono text-sm font-semibold text-white" data-testid="royalty-claim-amount">
								{formatXlmLabel(claim.amount)}
							</p>
						<p className="mt-0.5 text-xs text-white/50">
							{formatRelativeTimeLabel(new Date(claim.timestamp))}
						</p>
						</div>
					</div>
					<a
						href={buildStellarExpertTxUrl(claim.txHash, 'testnet')}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
						data-testid="royalty-claim-tx-link"
					>
						{truncateTxHash(claim.txHash)}
						<ExternalLink className="size-3" aria-hidden="true" />
					</a>
				</li>
			))}
		</ul>
	);
}

export interface RoyaltyEarningsSectionProps {
	creatorId: string;
	/** Overrides the earnings hook — tests inject mock data this way. */
	queryFn?: () => Promise<RoyaltyEarnings>;
	className?: string;
}

export function RoyaltyEarningsSection({
	creatorId,
	queryFn,
	className = '',
}: RoyaltyEarningsSectionProps) {
	const { data: earnings, isLoading, isError } = useRoyaltyEarnings(creatorId, {
		queryFn,
	});
	const claimMutation = useClaimRoyaltiesMutation(creatorId);

	return (
		<div
			data-testid="royalty-earnings-section"
			className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 ${className}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
						<UserCheck className="size-5" aria-hidden="true" />
					</div>
					<div>
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Royalty Earnings
						</h2>
						<p className="text-xs text-white/60">
							Accumulated royalties from secondary key transfers
						</p>
					</div>
				</div>
				<button
					type="button"
					data-testid={CLAIM_BUTTON_TEST_ID}
					onClick={() => claimMutation.mutate()}
					disabled={claimMutation.isPending}
					className="rounded-xl border border-amber-400/30 bg-amber-400/15 px-4 py-2 text-sm font-semibold font-jakarta text-amber-300 transition-all hover:bg-amber-400/25 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{claimMutation.isPending ? 'Claiming…' : 'Claim Royalties'}
				</button>
			</div>

			{isLoading ? (
				<div className="py-8 text-center text-sm text-white/50" data-testid="royalty-earnings-loading">
					Loading royalty earnings…
				</div>
			) : isError || !earnings ? (
				<div className="py-8 text-center text-sm text-white/50" data-testid="royalty-earnings-error">
					We couldn&apos;t load your royalty earnings. They refresh every 60 seconds — try
					again shortly.
				</div>
			) : (
				<div className="space-y-6">
					<EarningsTotalsCard earnings={earnings} />
					<TransferBreakdownList events={earnings.events} />
					<ClaimedHistoryList claims={earnings.claims} />
				</div>
			)}
		</div>
	);
}

export default RoyaltyEarningsSection;
