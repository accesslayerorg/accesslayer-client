import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { useCreatorActivityFeed } from '@/hooks/useCreatorActivityFeed';
import { creatorActivityService } from '@/services/creatorActivity.service';
import { formatRelativeTime } from '@/utils/time.utils';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';

export interface CreatorActivityFeedProps {
	creatorId: string;
}

const SKELETON_ROW_COUNT = 3;

function ActivityFeedSkeletonRows() {
	return (
		<div data-testid="creator-activity-feed-skeleton" className="space-y-2">
			{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
				<div
					key={index}
					className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
				>
					<div className="size-10 shrink-0 rounded-full bg-white/12 skeleton-shimmer" />
					<div className="flex-1 space-y-2">
						<div className="h-4 w-32 rounded bg-white/12 skeleton-shimmer" />
						<div className="h-3 w-48 rounded bg-white/12 skeleton-shimmer" />
					</div>
				</div>
			))}
		</div>
	);
}

/**
 * Creator profile activity feed (#698): shows the creator's recent public
 * trade activity, with a proper empty state when there is none.
 *
 * State machine:
 *   loading  -> skeleton rows (never the empty state, even if `trades`
 *               happens to still be `[]` from a previous query).
 *   settled, trades.length === 0 -> empty state with the exact copy from
 *               the issue spec.
 *   settled, trades.length > 0  -> real rows.
 */
const CreatorActivityFeed: React.FC<CreatorActivityFeedProps> = ({ creatorId }) => {
	const { trades, isLoading } = useCreatorActivityFeed(creatorId, id =>
		creatorActivityService.getCreatorActivity(id)
	);

	if (isLoading) {
		return <ActivityFeedSkeletonRows />;
	}

	if (trades.length === 0) {
		return (
			<div
				data-testid="creator-activity-feed-empty-state"
				className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center"
			>
				<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
					<History className="size-6" aria-hidden="true" />
				</div>
				<p className="text-sm text-white/50">
					No activity yet — buy or sell keys to get started
				</p>
			</div>
		);
	}

	return (
		<div data-testid="creator-activity-feed" className="space-y-2">
			{trades.map(trade => (
				<div
					key={trade.id}
					data-testid={`creator-activity-item-${trade.id}`}
					className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
				>
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5">
						{trade.type === 'buy' ? (
							<ArrowUpRight className="size-4 text-emerald-400" />
						) : (
							<ArrowDownRight className="size-4 text-rose-400" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-white">
								{trade.type === 'buy' ? 'Buy' : 'Sell'}
							</span>
							<span className="text-white/40">•</span>
							<span className="text-white/90">
								{formatCreatorHandle(trade.traderHandle)}
							</span>
						</div>
						<div className="mt-1 flex items-center gap-3 text-xs text-white/50">
							<span>{trade.amount} keys</span>
							<span className="text-white/30">•</span>
							<span>{trade.price} XLM</span>
							<span className="text-white/30">•</span>
							<span>{formatRelativeTime(trade.timestamp)}</span>
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default CreatorActivityFeed;
