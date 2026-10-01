import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import LockupCountdown from '@/components/common/LockupCountdown';
import TradeCooldownButton from '@/components/common/TradeCooldownButton';
import ReinvestDividendDialog from '@/components/common/ReinvestDividendDialog';
import DeprecationNotice from '@/components/common/DeprecationNotice';
import RedeemKeyDialog from '@/components/common/RedeemKeyDialog';
import { computeRemainingLockupSeconds } from '@/utils/lockupCountdown.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice, resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import {
	calculatePositionPnL,
	formatPnLDisplay,
	formatPnLPercentage,
	getPnLTone,
	getPnLToneChipClassName,
	type HeldKeyPosition,
} from '@/utils/portfolioValue.utils';
import { hasUnclaimedDividend, xlmToStroops } from '@/utils/reinvestDividend.utils';
import { isKeyDeprecated } from '@/utils/keyDeprecation.utils';
import { isActiveCooldown } from '@/utils/tradeCooldown.utils';
import type { ActiveTradeCooldown } from '@/utils/tradeCooldown.utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';

export interface PortfolioHoldingRowProps {
	position: HeldKeyPosition;
	creator?: Course;
	onBuy?: (creatorId: string) => void;
	onSell?: (creatorId: string) => void;
	onTransfer?: (creatorId: string) => void;
	onReinvest?: (creatorId: string) => Promise<void> | void;
	onRedeem?: (creatorId: string) => Promise<void> | void;
	onFreeze?: (position: HeldKeyPosition) => void;
	onUnfreeze?: (position: HeldKeyPosition) => void;
	onTransfer?: (creatorId: string) => void;
	onBurn?: (creatorId: string) => void;
	isSubmitting?: boolean;
	isReinvesting?: boolean;
	isRedeeming?: boolean;
	isNetworkMismatch?: boolean;
	/**
	 * Active trade cooldown for this key (#998). When present, the Buy and
	 * Sell buttons are replaced by a disabled countdown until it expires.
	 */
	tradeCooldown?: ActiveTradeCooldown | null;
}

export const PortfolioHoldingRow: React.FC<PortfolioHoldingRowProps> = ({
	position,
	creator,
	onBuy,
	onSell,
	onTransfer,
	onReinvest,
	onRedeem,
	onFreeze,
	onUnfreeze,
	onTransfer,
	onBurn,
	isSubmitting = false,
	isReinvesting = false,
	isRedeeming = false,
	isNetworkMismatch = false,
	tradeCooldown = null,
}) => {
	const initialRemaining = computeRemainingLockupSeconds(position.last_buy_timestamp);
	const [isLocked, setIsLocked] = useState(initialRemaining > 0);
	const [reinvestOpen, setReinvestOpen] = useState(false);
	const [redeemOpen, setRedeemOpen] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const frozenQuantity = position.frozenQuantity ?? 0;
	const liquidQuantity = position.liquidQuantity ?? position.quantity ?? 0;
	const isLiquidEmpty = liquidQuantity <= 0;
	const hasDividends = hasUnclaimedDividend(position.unclaimedDividend);
	const keyPriceStroops = resolveCreatorKeyPriceStroops(position);
	const deprecated = isKeyDeprecated(creator);

	// #935 — unrealised P&L for this position: what the keys would fetch if sold
	// at the current bonding-curve sell price, less what was paid for them.
	const positionPnL = calculatePositionPnL(position);
	const pnlTone = getPnLTone(positionPnL.unrealisedPnLStroops);
	const PnlIcon =
		pnlTone === 'positive' ? TrendingUp : pnlTone === 'negative' ? TrendingDown : Minus;
	const pnlLabel =
		positionPnL.status === 'loading'
			? 'Refreshing price'
			: positionPnL.status === 'unavailable'
				? 'Unavailable'
				: positionPnL.unrealisedPnLStroops == null
					? 'No cost basis'
					: `${formatPnLDisplay(positionPnL.unrealisedPnLStroops)} (${formatPnLPercentage(
							positionPnL.pnlPercentage ?? 0
						)})`;

	// #998 — the per-key trade cooldown disables both buy and sell for the
	// window configured by the creator; the countdown drives the labels.
	const tradeCooldownActive = isActiveCooldown(tradeCooldown)
		? (tradeCooldown as ActiveTradeCooldown)
		: null;

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
				<button type="button" className="flex items-center gap-2 text-left" onClick={() => setIsExpanded(value => !value)} aria-expanded={isExpanded} data-testid="holding-expand-button">
					<span className="truncate text-sm font-bold text-white">
						{creator?.title ?? 'Unknown creator'}
					</span>
					{deprecated && <DeprecationNotice reason={creator?.deprecationReason} />}
					{position.pending && (
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
							<span className="size-2.5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
							Pending
						</span>
					)}
				</button>
				<div className="mt-1 text-xs text-white/55">
					{formatNumber(position.quantity)} keys ·{' '}
					{position.isPriceLoading
						? 'Refreshing price'
						: position.isPriceStale
							? 'Price stale'
							: formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(position))}
				</div>
				<div
					className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
					data-testid="holding-pnl"
				>
					<span className="text-white/45">
						Avg buy{' '}
						<span className="font-semibold text-white/80">
							{positionPnL.averagePurchasePriceStroops == null
								? '—'
								: formatDisplayKeyPrice(positionPnL.averagePurchasePriceStroops)}
						</span>
					</span>
					<span className="text-white/45">
						Current{' '}
						<span className="font-semibold text-white/80">
							{positionPnL.currentValueStroops == null
								? '—'
								: formatDisplayKeyPrice(positionPnL.currentValueStroops)}
						</span>
					</span>
					<span
						className={cn(
							'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold',
							getPnLToneChipClassName(positionPnL.unrealisedPnLStroops)
						)}
						data-testid="holding-pnl-value"
						data-pnl-tone={pnlTone}
						title="Unrealised P&L: current bonding curve sell price less average purchase price"
					>
						<PnlIcon className="size-3" aria-hidden="true" />
						<span>{pnlLabel}</span>
					</span>
					<span className="sr-only">unrealised P&amp;L</span>
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
								<TradeCooldownButton
									cooldown={tradeCooldownActive}
									label="Buy"
									variant="default"
									size="sm"
									className="rounded-xl"
									onClick={() => onBuy(position.creatorId)}
									buttonProps={{
										'data-testid': 'holding-buy-button',
										disabled: isNetworkMismatch || isSubmitting || undefined,
										'aria-disabled':
											isNetworkMismatch || isSubmitting || undefined,
									}}
								/>
							)}
							{onSell && (
								<TradeCooldownButton
									cooldown={tradeCooldownActive}
									label="Sell"
									variant="outline"
									size="sm"
									className="rounded-xl"
									onClick={() => onSell(position.creatorId)}
									buttonProps={{
										'data-testid': 'holding-sell-button',
										disabled:
											isLocked ||
											isLiquidEmpty ||
											isNetworkMismatch ||
											isSubmitting ||
											undefined,
										'aria-disabled':
											isLocked ||
											isLiquidEmpty ||
											isNetworkMismatch ||
											isSubmitting ||
											undefined,
									}}
								/>
							)}
						</>
					)}
					{onTransfer && (
						<Button
							size="sm"
							variant="outline"
							className="rounded-xl"
							onClick={() => onTransfer(position.creatorId)}
							disabled={isLocked || isNetworkMismatch || isSubmitting || !position.quantity}
							data-testid="holding-transfer-button"
						>
							Transfer
						</Button>
					)}
				</div>
			</div>
			{isExpanded && (
				<div className="basis-full border-t border-white/10 pt-4" data-testid="self-freeze-section">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<h3 className="text-sm font-bold text-white">Self-freeze</h3>
							<dl className="mt-2 flex gap-5 text-xs text-white/55">
								<div><dt>Frozen</dt><dd className="font-semibold text-white">{formatNumber(frozenQuantity)} keys</dd></div>
								<div><dt>Liquid</dt><dd className="font-semibold text-white">{formatNumber(liquidQuantity)} keys</dd></div>
							</dl>
						</div>
						<div className="flex flex-wrap gap-2">
							{onFreeze && <Button size="sm" variant="outline" onClick={() => onFreeze(position)} disabled={isLiquidEmpty || isSubmitting} data-testid="holding-freeze-button">Freeze</Button>}
							{onUnfreeze && <Button size="sm" variant="outline" onClick={() => onUnfreeze(position)} disabled={frozenQuantity <= 0 || isSubmitting} data-testid="holding-unfreeze-button">Unfreeze</Button>}
							{onTransfer && <Button size="sm" variant="outline" onClick={() => onTransfer(position.creatorId)} disabled={isLiquidEmpty || isSubmitting} data-testid="holding-transfer-button">Transfer</Button>}
							{onBurn && <Button size="sm" variant="outline" onClick={() => onBurn(position.creatorId)} disabled={isLiquidEmpty || isSubmitting} data-testid="holding-burn-button">Burn</Button>}
						</div>
					</div>
				</div>
			)}
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
