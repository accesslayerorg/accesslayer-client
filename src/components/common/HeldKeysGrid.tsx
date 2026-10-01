import React from 'react';
import { Link } from 'react-router';
import { KeyRound, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HoldingsEmptyState from '@/components/common/HoldingsEmptyState';
import { CreatorHoldingsListSkeleton } from '@/components/common/CreatorSkeleton';
import {
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
} from '@/utils/keyPriceDisplay.utils';
import {
	calculatePositionTotalValue,
	calculatePositionUnrealisedPnL,
	formatPnLDisplay,
	type HeldKeyPosition,
} from '@/utils/portfolioValue.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { isKeyDeprecated } from '@/utils/keyDeprecation.utils';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';

export interface HeldKeysGridProps {
	/** Held positions, ready for valuation (prices already merged in). */
	positions: HeldKeyPosition[];
	/** Creator records used to resolve each key's display title and deprecation. */
	creators?: Course[];
	/** Whether the viewer owns this profile — hides trade actions when false. */
	isOwnProfile?: boolean;
	isLoading?: boolean;
	/** Fallback browse destination for the empty state (defaults to /creators). */
	emptyBrowseHref?: string;
	className?: string;
}

/**
 * Grid of held creator keys for the user profile page (#921).
 *
 * Each card shows the key name (linked to the creator page), the quantity
 * held, the current bond-curve price per key, and the position's current
 * value. When the profile owner is viewing, Buy / Sell (or Redeem for
 * deprecated keys) actions are shown; public profile views render the same
 * valuation cards without any wallet-specific actions.
 */
const HeldKeysGrid: React.FC<HeldKeysGridProps> = ({
	positions,
	creators = [],
	isOwnProfile = true,
	isLoading = false,
	emptyBrowseHref = '/creators',
	className,
}) => {
	if (isLoading) {
		return (
			<div className={className}>
				<CreatorHoldingsListSkeleton count={3} />
			</div>
		);
	}

	if (positions.length === 0) {
		return (
			<div className={className}>
				<HoldingsEmptyState browseHref={emptyBrowseHref} />
			</div>
		);
	}

	return (
		<div
			className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}
			data-testid="held-keys-grid"
		>
			{positions.map(position => {
				const creator = creators.find(
					candidate => candidate.id === position.creatorId
				);
				const priceStroops = resolveCreatorKeyPriceStroops(position);
				const totalValueStroops = calculatePositionTotalValue(position);
				const unrealisedPnL = calculatePositionUnrealisedPnL(position);
				const title = creator?.title ?? 'Creator key';
				const quantity = position.quantity ?? 0;
				const isDeprecated = isKeyDeprecated(creator);
				const creatorHref = `/creator/${position.creatorId}`;

				return (
					<article
						key={position.creatorId}
						data-testid={`holding-card-${position.creatorId}`}
						className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
					>
						<div className="mb-3 flex items-start justify-between gap-3">
							<Link
								to={creatorHref}
								className="min-w-0 truncate font-grotesque text-base font-bold text-white transition-colors hover:text-amber-300"
							>
								{title}
							</Link>
							{position.pending && (
								<span
									role="status"
									aria-label="Processing trade"
									className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300"
								>
									Processing…
								</span>
							)}
						</div>

						{isDeprecated && (
							<div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300">
								<Lock className="size-3.5" aria-hidden="true" />
								Deprecated key
							</div>
						)}

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/50">Quantity</span>
								<span
									data-testid={`holding-quantity-${position.creatorId}`}
									className="font-semibold text-white"
								>
									{formatNumber(quantity)} keys
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/50">Price / key</span>
								<span className="font-mono text-white/80">
									{formatDisplayKeyPrice(priceStroops)}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/50">Current value</span>
								<span
									data-testid={`holding-current-value-${position.creatorId}`}
									className="font-mono font-bold text-amber-300"
								>
									{formatDisplayKeyPrice(totalValueStroops)}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/50">Unrealised P&L</span>
								<span
									data-testid={`holding-pnl-${position.creatorId}`}
									className={cn(
										'font-mono font-bold',
										(unrealisedPnL ?? 0) > 0
											? 'text-emerald-300'
											: (unrealisedPnL ?? 0) < 0
												? 'text-rose-300'
												: 'text-white/80'
									)}
								>
									{formatPnLDisplay(unrealisedPnL ?? 0)}
								</span>
							</div>
						</div>

						{isOwnProfile && (
							<div className="mt-4 flex gap-2 border-t border-white/5 pt-3">
								{isDeprecated ? (
									<Button asChild size="sm" className="flex-1">
										<Link to={creatorHref}>Redeem</Link>
									</Button>
								) : (
									<>
										<Button
											asChild
											size="sm"
											className="flex-1"
											aria-label={`Buy ${title}`}
										>
											<Link to={creatorHref}>Buy</Link>
										</Button>
										<Button
											asChild
											size="sm"
											variant="outline"
											className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
											aria-label={`Sell ${title}`}
										>
											<Link to={creatorHref}>Sell</Link>
										</Button>
									</>
								)}
								{(position.unclaimedDividend ?? 0) > 0 && (
									<span
										data-testid={`holding-unclaimed-dividend-${position.creatorId}`}
										className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
									>
										<KeyRound className="size-3" aria-hidden="true" />
										Dividends
									</span>
								)}
							</div>
						)}
					</article>
				);
			})}
		</div>
	);
};

export default HeldKeysGrid;
