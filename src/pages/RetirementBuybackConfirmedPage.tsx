import { Link, useLocation, useParams } from 'react-router';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useCreatorDetail } from '@/hooks/useCreators';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { Button } from '@/components/ui/button';

export interface RetirementBuybackReceiptState {
	holderPayoutStroops: number;
	executedAt: string;
	transactionHash?: string | null;
}

function isRetirementReceiptState(
	value: unknown
): value is RetirementBuybackReceiptState {
	if (!value || typeof value !== 'object') return false;
	const receipt = value as Partial<RetirementBuybackReceiptState>;
	return (
		typeof receipt.holderPayoutStroops === 'number' &&
		Number.isFinite(receipt.holderPayoutStroops) &&
		receipt.holderPayoutStroops >= 0 &&
		typeof receipt.executedAt === 'string' &&
		receipt.executedAt.length > 0 &&
		(receipt.transactionHash == null ||
			typeof receipt.transactionHash === 'string')
	);
}

export default function RetirementBuybackConfirmedPage() {
	const { id = '' } = useParams<{ id: string }>();
	const location = useLocation();
	const { data: creator, isLoading, error } = useCreatorDetail(id);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-2xl" role="status">
					Loading buyback confirmation…
				</div>
			</main>
		);
	}

	if (error || !creator) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-2xl space-y-4" role="alert">
					<h1 className="font-grotesque text-2xl font-bold">
						Confirmation unavailable
					</h1>
					<p className="text-sm text-white/65">
						We couldn’t load the retirement buyback details. Please try
						again later.
					</p>
				</div>
			</main>
		);
	}

	const receipt = isRetirementReceiptState(location.state)
		? location.state
		: null;
	const keyName = creator.title || creator.name || 'Creator Key';

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<section className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl md:p-10">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-14 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
						<CheckCircle2 className="size-8" aria-hidden="true" />
					</div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
						Retirement buyback
					</p>
					<h1 className="font-grotesque text-3xl font-bold">
						{receipt ? 'Buyback Confirmed' : 'Confirmation pending'}
					</h1>
					<p className="text-sm text-white/60">{keyName}</p>
				</div>

				{receipt ? (
					<div
						className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5"
						data-testid="retirement-buyback-confirmed"
					>
						<div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
							<span className="text-sm text-white/60">
								Amount received
							</span>
							<strong
								className="text-xl tabular-nums text-emerald-300"
								data-testid="retirement-holder-payout"
							>
								{formatNumber(
									receipt.holderPayoutStroops / STROOPS_PER_XLM,
									{
										minimumFractionDigits: 2,
										maximumFractionDigits: 4,
									}
								)}{' '}
								XLM
							</strong>
						</div>
						<div className="flex items-center justify-between gap-4 text-sm">
							<span className="text-white/55">Status</span>
							<span className="font-semibold text-emerald-300">
								Paid
							</span>
						</div>
						<div className="flex items-center justify-between gap-4 text-sm">
							<span className="text-white/55">Executed at</span>
							<span className="text-right text-white/75">
								{formatAbsoluteDateTime(receipt.executedAt) ??
									receipt.executedAt}
							</span>
						</div>
						{receipt.transactionHash && (
							<div className="space-y-1 border-t border-white/10 pt-3">
								<span className="text-xs text-white/50">
									Retirement transaction
								</span>
								<p className="break-all font-mono text-xs text-white/75">
									{receipt.transactionHash}
								</p>
							</div>
						)}
					</div>
				) : (
					<p
						className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/80"
						role="status"
						data-testid="retirement-buyback-pending"
					>
						The retirement execution or holder payout details are not
						available yet.
					</p>
				)}

				<div className="flex flex-wrap justify-center gap-3">
					<Button asChild variant="outline">
						<Link to={`/keys/${creator.id}`}>
							<ExternalLink className="mr-2 size-4" aria-hidden="true" />
							View key
						</Link>
					</Button>
				</div>
			</section>
		</main>
	);
}
