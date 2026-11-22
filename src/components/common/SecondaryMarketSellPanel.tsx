/**
 * Secondary-market sell panel (#1174, #1354).
 * Offers two listing modes side by side: Fixed Price and Auction.
 * The auction tab collects fraction amount, reserve price, and duration,
 * shows a summary preview, and submits `create_auction`.
 * Displays same-ledger sell restriction notice and uses sellable balance.
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import showToast from '@/utils/toast.util';
import {
	AUCTION_DURATIONS,
	buildAuctionSummary,
	durationLabelToSeconds,
	type AuctionDurationLabel,
} from '@/utils/auction.utils';
import { useSellableNow } from '@/hooks/useSellableNow';
import SameLedgerNotice from '@/components/common/SameLedgerNotice';

export type SellMode = 'fixed' | 'auction';

export interface SecondaryMarketSellPanelProps {
	/** Wallet address of the seller. */
	wallet: string;
	/** Creator key ID. */
	keyId: string;
	/** Total fraction balance the seller holds (for display fallback). */
	availableFractions: number;
	/** Submit a fixed-price listing. */
	onCreateFixedPriceListing?: (input: {
		fractionAmount: number;
		priceStroops: number;
	}) => Promise<void> | void;
	/**
	 * Submit an auction listing. Must fire the `create_auction` contract call
	 * with the exact params produced by `buildAuctionSummary`.
	 */
	onCreateAuction: (params: {
		fractionAmount: number;
		reservePriceStroops: number;
		durationSeconds: number;
	}) => Promise<void> | void;
	isSubmitting?: boolean;
}

const TABS: Array<{ id: SellMode; label: string }> = [
	{ id: 'fixed', label: 'Fixed Price' },
	{ id: 'auction', label: 'Auction' },
];

const inputClass =
	'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-300/50 focus:outline-none';

const SecondaryMarketSellPanel: React.FC<SecondaryMarketSellPanelProps> = ({
	wallet,
	keyId,
	availableFractions,
	onCreateFixedPriceListing,
	onCreateAuction,
	isSubmitting = false,
}) => {
	const { sellableNow, isFullySellable, isExempt, lockedBalance, totalBalance, nextLedgerCloseEstimate, isLoading } =
		useSellableNow(wallet, keyId);

	const [mode, setMode] = useState<SellMode>('fixed');
	const [fractionAmount, setFractionAmount] = useState('1');
	const [reservePrice, setReservePrice] = useState('');
	const [fixedPrice, setFixedPrice] = useState('');
	const [duration, setDuration] = useState<AuctionDurationLabel>('1h');

	const amount = Number(fractionAmount);
	const reserve = Number(reservePrice);
	const price = Number(fixedPrice);
	const durationSeconds = durationLabelToSeconds(duration);

	// Use sellableNow for max amount, fall back to availableFractions if not loaded
	const effectiveMaxAmount = isLoading ? availableFractions : sellableNow;
	const isSellDisabled = isSubmitting || effectiveMaxAmount <= 0;

	const auctionSummary = useMemo(() => {
		if (
			!Number.isInteger(amount) ||
			amount <= 0 ||
			!Number.isFinite(reserve) ||
			reserve <= 0
		) {
			return null;
		}
		try {
			return buildAuctionSummary({
				fractionAmount: amount,
				reservePriceStroops: reserve,
				durationSeconds,
			});
		} catch {
			return null;
		}
	}, [amount, reserve, durationSeconds]);

	const submitAuction = async () => {
		if (!auctionSummary) {
			showToast.error('Enter a valid fraction amount and reserve price');
			return;
		}
		try {
			await onCreateAuction({
				fractionAmount: auctionSummary.fractionAmount,
				reservePriceStroops: auctionSummary.reservePriceStroops,
				durationSeconds: auctionSummary.durationSeconds,
			});
			showToast.success(
				`Auction created — ends ${auctionSummary.endTime.toLocaleTimeString()}`
			);
		} catch (error) {
			showToast.error(
				error instanceof Error ? error.message : 'Failed to create auction'
			);
		}
	};

	const submitFixedPrice = async () => {
		if (!Number.isInteger(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0) {
			showToast.error('Enter a valid fraction amount and price');
			return;
		}
		try {
			await onCreateFixedPriceListing?.({
				fractionAmount: amount,
				priceStroops: price,
			});
			showToast.success('Listing created');
		} catch (error) {
			showToast.error(
				error instanceof Error ? error.message : 'Failed to create listing'
			);
		}
	};

	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.02] p-5" data-testid="secondary-market-sell-panel">
			{/* Same-ledger restriction notice */}
			{!isExempt && !isFullySellable && lockedBalance > 0 && (
				<SameLedgerNotice
					nextLedgerCloseEstimate={nextLedgerCloseEstimate}
					lockedBalance={lockedBalance}
					totalBalance={totalBalance}
				/>
			)}

			{/* Tabs */}
			<div
				className="mb-5 flex gap-2 border-b border-white/10"
				role="tablist"
				aria-label="Listing type"
				data-testid="sell-mode-tabs"
			>
				{TABS.map(tab => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={mode === tab.id}
						onClick={() => setMode(tab.id)}
						className={`relative -mb-px px-4 py-2 text-sm font-medium transition-colors ${
							mode === tab.id
								? 'border-b-2 border-amber-300 text-amber-200'
								: 'text-white/60 hover:text-white'
						}`}
						data-testid={`sell-mode-tab-${tab.id}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Shared: fraction amount */}
			<label className="mb-3 block">
				<span className="mb-1 block text-xs text-white/60">Fraction amount</span>
				<input
					type="number"
					min={1}
					max={effectiveMaxAmount}
					value={fractionAmount}
					onChange={e => setFractionAmount(e.target.value)}
					className={inputClass}
					data-testid="auction-fraction-amount"
					disabled={isSellDisabled}
				/>
				<span className="mt-1 block text-[11px] text-white/40">
					{effectiveMaxAmount} sellable
					{isLoading ? ' (loading…)' : lockedBalance > 0 ? ` (${lockedBalance} locked)` : ''}
				</span>
			</label>

			{mode === 'fixed' ? (
				<div className="space-y-3" data-testid="fixed-price-panel">
					<label className="block">
						<span className="mb-1 block text-xs text-white/60">
							Price per fraction (stroops)
						</span>
						<input
							type="number"
							min={1}
							value={fixedPrice}
							onChange={e => setFixedPrice(e.target.value)}
							className={inputClass}
							data-testid="fixed-price-input"
							disabled={isSellDisabled}
						/>
					</label>
					<Button
						type="button"
						onClick={submitFixedPrice}
						disabled={isSellDisabled}
						data-testid="submit-fixed-price"
					>
						{isSubmitting ? 'Submitting…' : 'Create listing'}
					</Button>
				</div>
			) : (
				<div className="space-y-4" data-testid="auction-panel">
					<label className="block">
						<span className="mb-1 block text-xs text-white/60">
							Reserve price (stroops)
						</span>
						<input
							type="number"
							min={1}
							value={reservePrice}
							onChange={e => setReservePrice(e.target.value)}
							className={inputClass}
							data-testid="auction-reserve-price"
							disabled={isSellDisabled}
						/>
					</label>

					<fieldset>
						<legend className="mb-1 text-xs text-white/60">Duration</legend>
						<div className="flex gap-2" data-testid="auction-duration-selector">
							{AUCTION_DURATIONS.map(d => (
								<button
									key={d.label}
									type="button"
									onClick={() => setDuration(d.label)}
									aria-pressed={duration === d.label}
									className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
										duration === d.label
											? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
											: 'border-white/10 text-white/60 hover:text-white'
									}`}
									data-testid={`auction-duration-${d.label}`}
									data-seconds={d.seconds}
									disabled={isSellDisabled}
								>
									{d.label}
								</button>
							))}
						</div>
					</fieldset>

					{/* Summary preview */}
					<div
						className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs"
						data-testid="auction-summary"
					>
						<div className="flex justify-between">
							<span className="text-white/60">Reserve</span>
							<span className="font-mono text-white/90" data-testid="auction-summary-reserve">
								{auctionSummary
									? formatDisplayKeyPrice(auctionSummary.reservePriceStroops)
									: '—'}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-white/60">Fractions</span>
							<span className="font-mono text-white/90" data-testid="auction-summary-amount">
								{auctionSummary?.fractionAmount ?? '—'}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-white/60">Ends</span>
							<span className="font-mono text-white/90" data-testid="auction-summary-end">
								{auctionSummary
									? auctionSummary.endTime.toLocaleString()
									: '—'}
							</span>
						</div>
					</div>

					<Button
						type="button"
						onClick={submitAuction}
						disabled={isSubmitting || !auctionSummary || isSellDisabled}
						data-testid="submit-auction"
					>
						{isSubmitting ? 'Submitting…' : 'Create auction'}
					</Button>
				</div>
			)}
		</div>
	);
};

export default SecondaryMarketSellPanel;
