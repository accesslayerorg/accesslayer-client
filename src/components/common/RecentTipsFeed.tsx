import React from 'react';
import { Coins, Heart, MessageSquare } from 'lucide-react';
import { useRecentTips } from '@/hooks/useTips';
import { truncateAddress } from '@/utils/whitelist.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { cn } from '@/lib/utils';
import type { Tip } from '@/types/tip.types';

export interface RecentTipsFeedProps {
	creatorId: string;
	className?: string;
}

interface TipItemRowProps {
	tip: Tip;
}

const TipItemRow: React.FC<TipItemRowProps> = ({ tip }) => {
	const relativeTime = useRelativeTime(tip.timestamp);
	const displayTipper =
		tip.tipper && tip.tipper.length > 14
			? truncateAddress(tip.tipper, 6, 6)
			: tip.tipper || 'Anonymous';

	return (
		<div
			data-testid="recent-tip-item"
			data-tip-id={tip.id}
			className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
		>
			<div className="flex items-center justify-between gap-3">
				{/* Tipper & Avatar */}
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">
						<Heart className="size-3.5 fill-amber-400 text-amber-400" />
					</div>
					<div className="min-w-0">
						<span
							className="block truncate font-mono text-xs font-bold text-white/90"
							title={tip.tipper}
							data-testid="tip-tipper-address"
						>
							{displayTipper}
						</span>
						<span className="text-[11px] text-white/40">
							{relativeTime}
						</span>
					</div>
				</div>

				{/* Amount Pill */}
				<div className="text-right shrink-0">
					<div
						className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400"
						data-testid="tip-amount-badge"
					>
						+{formatXlmPrice(tip.amount)}
					</div>
					<div className="text-[10px] text-white/40 mt-0.5">
						Net: {formatXlmPrice(tip.netAmount)}
					</div>
				</div>
			</div>

			{/* Optional message bubble */}
			{tip.message && (
				<div
					data-testid="tip-message-content"
					className="mt-1 flex items-start gap-2 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2 text-xs text-white/80"
				>
					<MessageSquare className="mt-0.5 size-3.5 shrink-0 text-amber-400/70" />
					<p className="break-words leading-relaxed">&ldquo;{tip.message}&rdquo;</p>
				</div>
			)}
		</div>
	);
};

export const RecentTipsFeed: React.FC<RecentTipsFeedProps> = ({
	creatorId,
	className,
}) => {
	const { data: tips = [], isLoading } = useRecentTips(creatorId);

	// Ensure accurate last 10 tips
	const recentTips = tips.slice(0, 10);

	return (
		<div
			data-testid="recent-tips-container"
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
		>
			{/* Feed Header */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-amber-400">
						<Coins className="size-5" />
					</div>
					<div>
						<h3 className="font-grotesque text-lg font-black tracking-tight text-white flex items-center gap-2">
							Recent Tips
							{recentTips.length > 0 && (
								<span
									data-testid="recent-tips-count"
									className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/80"
								>
									{recentTips.length}
								</span>
							)}
						</h3>
						<p className="text-xs text-white/50">
							Public tip feed showing the latest contributions
						</p>
					</div>
				</div>
			</div>

			{/* Feed Content */}
			{isLoading ? (
				<div data-testid="recent-tips-loading" className="space-y-3">
					{[0, 1, 2].map(i => (
						<div
							key={i}
							className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]"
						/>
					))}
				</div>
			) : recentTips.length === 0 ? (
				<div
					data-testid="recent-tips-empty"
					className="rounded-2xl border border-dashed border-white/10 p-8 text-center"
				>
					<Heart className="mx-auto size-8 text-white/20 mb-2" />
					<p className="text-sm font-semibold text-white/70">No tips yet</p>
					<p className="text-xs text-white/40 mt-1">
						Be the first key holder to send a tip to this creator!
					</p>
				</div>
			) : (
				<div data-testid="recent-tips-feed" className="space-y-3">
					{recentTips.map(tip => (
						<TipItemRow key={tip.id} tip={tip} />
					))}
				</div>
			)}
		</div>
	);
};

export default RecentTipsFeed;
