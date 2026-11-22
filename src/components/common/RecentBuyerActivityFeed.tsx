import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Radio } from 'lucide-react';
import useKeyTrades from '@/hooks/useKeyTrades';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/utils/time.utils';
import { cn } from '@/lib/utils';
import type { KeyTrade } from '@/services/keyTrades.service';

function truncateWallet(address: string): string {
	if (address.length <= 14) return address;
	return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function quantityLabel(quantity: number): string {
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 6,
	}).format(quantity);
}

function TradeRow({ trade, isNew }: { trade: KeyTrade; isNew: boolean }) {
	const isBuy = trade.type === 'buy';
	return (
		<motion.li
			layout="position"
			initial={
				isNew
					? { opacity: 0, y: -18, filter: 'brightness(1.8)' }
					: false
			}
			animate={{ opacity: 1, y: 0, filter: 'brightness(1)' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.32, ease: 'easeOut' }}
			data-testid={`key-trade-${trade.id}`}
			data-trade-type={trade.type}
			data-new-trade={isNew ? 'true' : 'false'}
			className={cn(
				'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
				isBuy
					? 'border-emerald-400/25 bg-emerald-400/[0.07]'
					: 'border-rose-400/25 bg-rose-400/[0.07]',
				isNew && 'ring-1 ring-cyan-300/60'
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<span
					aria-hidden="true"
					className={cn(
						'flex size-8 shrink-0 items-center justify-center rounded-full',
						isBuy
							? 'bg-emerald-400/15 text-emerald-300'
							: 'bg-rose-400/15 text-rose-300'
					)}
				>
					{isBuy ? (
						<ArrowUpRight className="size-4" />
					) : (
						<ArrowDownRight className="size-4" />
					)}
				</span>
				<div className="min-w-0">
					<p
						className={cn(
							'truncate font-mono text-sm font-semibold',
							isBuy ? 'text-emerald-300' : 'text-rose-300'
						)}
						title={trade.walletAddress}
					>
						{truncateWallet(trade.walletAddress)}
					</p>
					<p className="mt-0.5 text-xs text-white/50">
						{isBuy ? 'Buy' : 'Sell'} · {quantityLabel(trade.quantity)} key
						{trade.quantity === 1 ? '' : 's'}
					</p>
				</div>
			</div>
			<time
				dateTime={new Date(trade.timestamp).toISOString()}
				title={formatAbsoluteDateTime(trade.timestamp) ?? undefined}
				className="shrink-0 text-xs text-white/45"
			>
				{formatRelativeTime(trade.timestamp)}
			</time>
		</motion.li>
	);
}

export default function RecentBuyerActivityFeed({ keyId }: { keyId: string }) {
	const { trades, newTradeIds, isLoading, isFetching, isError, refetch } =
		useKeyTrades(keyId);
	const prefersReducedMotion = usePrefersReducedMotion();

	return (
		<section aria-labelledby="recent-key-activity-heading" data-testid="key-activity-feed">
			<div className="mb-4 flex items-center justify-between gap-3">
				<div>
					<h2
						id="recent-key-activity-heading"
						className="font-grotesque text-lg font-bold text-white"
					>
						Recent activity
					</h2>
					<p className="mt-1 text-xs text-white/50">Last 5 buys and sells</p>
				</div>
				{isFetching && !isLoading ? (
					<span className="inline-flex items-center gap-1.5 text-xs text-white/45" role="status">
						<Radio className="size-3.5 animate-pulse" aria-hidden="true" /> Live
					</span>
				) : null}
			</div>

			{isLoading ? (
				<div className="space-y-2" aria-label="Loading recent activity" aria-busy="true">
					{Array.from({ length: 5 }, (_, index) => (
						<div key={index} className="h-[62px] animate-pulse rounded-xl bg-white/[0.06]" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
					<p>Couldn’t load recent activity.</p>
					<button type="button" onClick={() => void refetch()} className="mt-2 text-xs font-semibold underline">
						Try again
					</button>
				</div>
			) : trades.length === 0 ? (
				<p className="rounded-xl border border-white/10 bg-white/[0.03] py-8 text-center text-sm text-white/50" data-testid="key-activity-empty">
					No recent activity
				</p>
			) : (
				<motion.ul
					className="space-y-2"
					initial={false}
					animate={prefersReducedMotion ? undefined : undefined}
					aria-live="polite"
					data-testid="key-activity-list"
				>
					<AnimatePresence initial={false} mode="popLayout">
						{trades.map(trade => (
							<TradeRow
								key={trade.id}
								trade={trade}
								isNew={newTradeIds.has(trade.id)}
							/>
						))}
					</AnimatePresence>
				</motion.ul>
			)}
		</section>
	);
}
