import React from 'react';
import { Gift, HandCoins, Megaphone, Repeat2, Wallet } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { AsyncButton } from '@/components/ui/async-button';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import {
	EARNINGS_STREAMS,
	EARNINGS_STREAM_LABELS,
} from '@/utils/creatorEarnings.utils';
import type {
	CreatorEarningsSummary,
	EarningsStream,
} from '@/types/creatorEarnings';

export interface CreatorEarningsCardsProps {
	summary?: CreatorEarningsSummary | null;
	isLoading?: boolean;
	canClaim?: boolean;
	pendingStream?: EarningsStream | null;
	onClaim: (stream: EarningsStream) => void;
}

const STREAM_META: Record<
	EarningsStream,
	{
		icon: typeof Wallet;
		accent: string;
		background: string;
		description: string;
	}
> = {
	royalties: {
		icon: HandCoins,
		accent: 'text-emerald-400',
		background: 'bg-emerald-400/10 border-emerald-400/20',
		description: 'Secondary market trading fees',
	},
	tips: {
		icon: Gift,
		accent: 'text-pink-400',
		background: 'bg-pink-400/10 border-pink-400/20',
		description: 'Direct fan tips',
	},
	subscriptions: {
		icon: Repeat2,
		accent: 'text-indigo-400',
		background: 'bg-indigo-400/10 border-indigo-400/20',
		description: 'Keyholder recurring access fees',
	},
	spotlight: {
		icon: Megaphone,
		accent: 'text-amber-400',
		background: 'bg-amber-400/10 border-amber-400/20',
		description: 'Spotlight bid revenue',
	},
};

const CARD_CLASS =
	'rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg backdrop-blur-md';

/**
 * Total unclaimed summary plus one card per revenue stream. Each stream card
 * exposes its own Claim button so withdrawals route to that stream's contract
 * call (#1258).
 */
export const CreatorEarningsCards: React.FC<CreatorEarningsCardsProps> = ({
	summary,
	isLoading = false,
	canClaim = false,
	pendingStream = null,
	onClaim,
}) => {
	if (isLoading) {
		return (
			<div className="space-y-4" data-testid="earnings-cards-skeleton">
				<div className={CARD_CLASS} aria-busy="true">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="mt-3 h-9 w-48" />
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className={CARD_CLASS}>
							<Skeleton className="h-4 w-24" />
							<Skeleton className="mt-3 h-7 w-28" />
							<Skeleton className="mt-4 h-9 w-full" />
						</div>
					))}
				</div>
			</div>
		);
	}

	const totalUnclaimed = summary?.totalUnclaimedXlm ?? 0;

	return (
		<div className="space-y-4">
			<section
				className="flex flex-col gap-4 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-6 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between md:p-8"
				data-testid="total-unclaimed-card"
			>
				<div className="flex items-center gap-4">
					<span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
						<Wallet className="size-5" aria-hidden="true" />
					</span>
					<div>
						<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/50">
							Total unclaimed balance
						</span>
						<div
							className="mt-1 font-mono text-3xl font-black text-white"
							data-testid="total-unclaimed-value"
						>
							{formatXlmPrice(totalUnclaimed)}
						</div>
					</div>
				</div>
				<p className="max-w-sm text-xs text-white/50">
					Across royalties, tips, subscriptions, and spotlight earnings.
					Claim each stream from its card below.
				</p>
			</section>

			<div
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
				data-testid="earnings-stream-cards"
			>
				{EARNINGS_STREAMS.map(stream => {
					const meta = STREAM_META[stream];
					const Icon = meta.icon;
					const streamSummary = summary?.streams[stream];
					const unclaimed = streamSummary?.unclaimedXlm ?? 0;
					const totalEarned = streamSummary?.totalEarnedXlm ?? 0;
					const isPending = pendingStream === stream;

					return (
						<div
							key={stream}
							className={CARD_CLASS}
							data-testid={`earnings-card-${stream}`}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/50">
									{EARNINGS_STREAM_LABELS[stream]}
								</span>
								<span
									className={`flex size-8 items-center justify-center rounded-lg border ${meta.background} ${meta.accent}`}
								>
									<Icon className="size-4" aria-hidden="true" />
								</span>
							</div>

							<div className="mt-3">
								<div
									className="font-mono text-2xl font-black tracking-tight text-white"
									data-testid={`earnings-${stream}-unclaimed`}
								>
									{formatXlmPrice(unclaimed)}
								</div>
								<p className="mt-1 text-xs text-white/45">
									{formatXlmPrice(totalEarned)} earned ·{' '}
									{meta.description}
								</p>
							</div>

							<AsyncButton
								type="button"
								className="mt-4 w-full rounded-xl bg-white/10 font-bold text-white hover:bg-white/20"
								disabled={!canClaim || unclaimed <= 0}
								isPending={isPending}
								pendingText="Claiming…"
								onClick={() => onClaim(stream)}
								data-testid={`claim-earnings-${stream}`}
							>
								Claim {EARNINGS_STREAM_LABELS[stream].toLowerCase()}
							</AsyncButton>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default CreatorEarningsCards;
