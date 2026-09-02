import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import LockupCountdown from '@/components/common/LockupCountdown';
import ReinvestDividendDialog from '@/components/common/ReinvestDividendDialog';
import DeprecationNotice from '@/components/common/DeprecationNotice';
import RedeemKeyDialog from '@/components/common/RedeemKeyDialog';
import { computeRemainingLockupSeconds } from '@/utils/lockupCountdown.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice, resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { hasUnclaimedDividend, xlmToStroops } from '@/utils/reinvestDividend.utils';
import { isKeyDeprecated } from '@/utils/keyDeprecation.utils';
import { TrendingUp } from 'lucide-react';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';

export interface PortfolioHoldingRowProps {
	position: HeldKeyPosition;
	creator?: Course;
	onBuy?: (creatorId: string) => void;
	onSell?: (creatorId: string) => void;
	onReinvest?: (creatorId: string) => Promise<void> | void;
	onRedeem?: (creatorId: string) => Promise<void> | void;
	isSubmitting?: boolean;
	isReinvesting?: boolean;
	isRedeeming?: boolean;
	isNetworkMismatch?: boolean;
}

export const PortfolioHoldingRow: React.FC<PortfolioHoldingRowProps> = ({
	position,
	creator,
	onBuy,
	onSell,
	onReinvest,
	onRedeem,
	isSubmitting = false,
	isReinvesting = false,
	isRedeeming = false,
	isNetworkMismatch = false,
}) => {
	const initialRemaining = computeRemainingLockupSeconds(position.last_buy_timestamp);
	const [isLocked, setIsLocked] = useState(initialRemaining > 0);
	const [reinvestOpen, setReinvestOpen] = useState(false);
	const [redeemOpen, setRedeemOpen] = useState(false);

	const hasDividends = hasUnclaimedDividend(position.unclaimedDividend);
	const keyPriceStroops = resolveCreatorKeyPriceStroops(position);
	const deprecated = isKeyDeprecated(creator);

	const handleConfirmReinvest = async () => {
		if (!onReinvest) return;
		await onReinvest(position.creatorId);
		setReinvestOpen(false);
	};

	const handleConfirmRedeem = async () => {
		if (!onRedeem) return;
		await onRedeem(position.creatorId);
		setRedeemOpen(false);
	};

	return (
		<>
		<div
			className={cn(
				'flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-opacity sm:flex-row sm:items-center sm:justify-between',
				position.pending && 'opacity-60'
			)}
			data-testid="portfolio-holding-row"
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-bold text-white">
						{creator?.title ?? 'Unknown creator'}
					</span>
					{position.pending && (
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
							<span className="size-2.5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
							Pending
						</span>
					)}
					{deprecated && (
						<DeprecationNotice reason={creator?.deprecationReason} />
					)}
				</div>
				<div className="mt-1 text-xs text-white/55">
					{formatNumber(position.quantity)} keys ·{' '}
					{position.isPriceLoading
						? 'Refreshing price'
						: position.isPriceStale
							? 'Price stale'
							: formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(position))}
				</div>
				{hasDividends && (
					<span
						className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-400"
						title="Unclaimed dividend balance available to reinvest"
						data-testid="unclaimed-dividend-badge"
					>
						<TrendingUp className="size-3" aria-hidden="true" />
						<span>
							{formatDisplayKeyPrice(xlmToStroops(position.unclaimedDividend))} unclaimed
						</span>
					</span>
				)}
			</div>

			<div className="flex items-center gap-3 shrink-0">
				{!deprecated && (
					<LockupCountdown
						lastBuyTimestamp={position.last_buy_timestamp}
						onExpire={() => setIsLocked(false)}
					/>
				)}

				<div className="flex items-center gap-2">
					{deprecated ? (
						onRedeem && (
							<Button
								size="sm"
								className="rounded-xl"
								onClick={() => setRedeemOpen(true)}
								disabled={isNetworkMismatch || isSubmitting || isRedeeming}
								data-testid="holding-redeem-button"
							>
								Redeem
							</Button>
						)
					) : (
						<>
							{onReinvest && hasDividends && (
								<Button
									size="sm"
									variant="outline"
									className="rounded-xl"
									onClick={() => setReinvestOpen(true)}
									disabled={isNetworkMismatch || isSubmitting || isReinvesting}
									data-testid="holding-reinvest-button"
								>
									Reinvest
								</Button>
							)}
							{onBuy && (
								<Button
									size="sm"
									className="rounded-xl"
									onClick={() => onBuy(position.creatorId)}
									disabled={isNetworkMismatch || isSubmitting}
									data-testid="holding-buy-button"
								>
									Buy
								</Button>
							)}
							{onSell && (
								<Button
									size="sm"
									variant="outline"
									className="rounded-xl"
									onClick={() => onSell(position.creatorId)}
									disabled={isLocked || isNetworkMismatch || isSubmitting}
									data-testid="holding-sell-button"
								>
									Sell
								</Button>
							)}
						</>
					)}
				</div>
			</div>
		</div>

		{onReinvest && hasDividends && position.unclaimedDividend != null && (
			<ReinvestDividendDialog
				open={reinvestOpen}
				creatorName={creator?.title ?? 'this creator'}
				unclaimedDividend={position.unclaimedDividend}
				keyPriceStroops={keyPriceStroops}
				onOpenChange={setReinvestOpen}
				onConfirm={handleConfirmReinvest}
				isSubmitting={isReinvesting}
			/>
		)}

		{deprecated && onRedeem && (
			<RedeemKeyDialog
				open={redeemOpen}
				creatorName={creator?.title ?? 'this creator'}
				quantity={position.quantity ?? 0}
				priceFields={position}
				deprecationReason={creator?.deprecationReason}
				onOpenChange={setRedeemOpen}
				onConfirm={handleConfirmRedeem}
				isSubmitting={isRedeeming}
			/>
		)}
		</>
	);
};

export default PortfolioHoldingRow;
