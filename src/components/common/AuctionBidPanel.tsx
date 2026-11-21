import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import showToast from '@/utils/toast.util';
import { usePlaceAuctionBidMutation } from '@/hooks/useCreatorContractActions';
import {
	computeMinimumNextBid,
	formatAuctionBidAmount,
	resolveAuctionMinIncrement,
	validateAuctionBid,
} from '@/utils/auctionBid.utils';

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

interface AuctionBidPanelProps {
	/** Key being bid on — passed through to the `place_bid` contract call. */
	creatorId: string;
	/** Current highest bid in XLM (nullable when the auction has no bids yet). */
	highestBid?: number | null;
	/** Contract-specified minimum increment in XLM (nullable → default). */
	minIncrement?: number | null;
	/** Fixed early-access price in XLM, used as the starting bid floor. */
	startingPrice?: number | null;
	/** Disables bidding (e.g. once the auction window has closed). */
	disabled?: boolean;
	/** Optional user address override when passed from parent (#1164). */
	userAddress?: string | null;
}

/**
 * Pre-launch auction bid input for the key detail page (#924, #1164).
 *
 * Shows the current highest bid, the minimum increment, the minimum acceptable
 * bid, and an escrowed funds notice. Validates the entered amount against that
 * floor (rejecting bids below minimum with BelowMinimum inline error) before
 * submitting `place_bid`.
 */
const AuctionBidPanel: React.FC<AuctionBidPanelProps> = ({
	creatorId,
	highestBid,
	minIncrement,
	startingPrice,
	disabled = false,
	userAddress,
}) => {
	const { isConnected, address: wagmiAddress } = useAccount();
	const activeAddress = userAddress ?? wagmiAddress;
	const hasWallet = Boolean(activeAddress || isConnected);

	const mutation = usePlaceAuctionBidMutation(creatorId);

	const [bidInput, setBidInput] = useState('');
	const [showError, setShowError] = useState(false);

	// Clear the stale error once highest bid moves
	useEffect(() => {
		setShowError(false);
	}, [highestBid]);

	const minimumNextBid = computeMinimumNextBid({
		highestBid,
		minIncrement,
		startingPrice,
	});
	const increment = resolveAuctionMinIncrement(minIncrement);

	const validation = validateAuctionBid(bidInput, {
		highestBid,
		minIncrement,
		startingPrice,
	});
	const { error: errorMessage, value, isValid, errorCode } = validation;

	// Show inline error if submitted with error or if typed below minimum
	const isBelowMinimum =
		bidInput.trim() !== '' && errorCode === 'BelowMinimum';
	const hasError = (showError || isBelowMinimum) && !isValid;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (mutation.isPending || disabled) return;

		if (!hasWallet) {
			showToast.error('Connect your wallet to place a bid');
			return;
		}

		if (!isValid || value == null) {
			setShowError(true);
			return;
		}

		mutation.mutate(value, {
			onSuccess: () => {
				setBidInput('');
				setShowError(false);
			},
		});
	};

	const displayHighest =
		highestBid != null ? formatAuctionBidAmount(highestBid) : 'No bids yet';

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4"
			noValidate
			data-testid="auction-bid-panel"
		>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
						Current highest bid
					</p>
					<p
						className="mt-1 font-grotesque text-sm font-black text-amber-400"
						data-testid="auction-highest-bid"
					>
						{displayHighest}
					</p>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
						Minimum increment
					</p>
					<p
						className="mt-1 font-grotesque text-sm font-black text-white"
						data-testid="auction-min-increment"
					>
						{formatAuctionBidAmount(increment)}
					</p>
				</div>
				<div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400/80">
						Minimum next bid
					</p>
					<p
						className="mt-1 font-grotesque text-sm font-black text-amber-300"
						data-testid="auction-min-next-bid"
					>
						{formatAuctionBidAmount(minimumNextBid)}
					</p>
				</div>
			</div>

			{/* Escrowed Funds Notice (#1164) */}
			<div
				data-testid="auction-escrow-notice"
				className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-white/70"
			>
				<span className="font-semibold text-amber-300">
					Escrowed Funds:
				</span>{' '}
				All bids are escrowed by the auction contract. If outbid, your funds
				are released for refund; winning bids settle your key allocation
				upon close.
			</div>

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
				<label htmlFor="auction-bid" className="sr-only">
					Your bid in XLM
				</label>
				<input
					id="auction-bid"
					data-testid="auction-bid-input"
					type="number"
					inputMode="decimal"
					min={0}
					step="0.01"
					className={fieldClass}
					placeholder={`Bid at least ${formatAuctionBidAmount(
						minimumNextBid
					)}`}
					value={bidInput}
					onChange={e => setBidInput(e.target.value)}
					disabled={mutation.isPending || disabled}
					aria-invalid={hasError ? 'true' : undefined}
					aria-describedby="auction-bid-hint"
				/>
				<Button
					type="submit"
					data-testid="auction-bid-submit"
					disabled={mutation.isPending || disabled || (hasError && !value)}
				>
					{mutation.isPending
						? 'Placing bid…'
						: hasWallet
							? 'Place Bid'
							: 'Connect wallet to bid'}
				</Button>
			</div>

			<p
				id="auction-bid-hint"
				className="text-xs text-white/40"
				data-testid="auction-bid-helper"
			>
				Your bid must exceed the current highest bid by the minimum
				increment. The leading bid wins the allocation when the auction
				closes.
			</p>

			{hasError && errorMessage && (
				<p
					role="alert"
					data-testid="auction-bid-error"
					data-error-code={errorCode ?? undefined}
					className="text-xs font-semibold text-rose-400"
				>
					{errorMessage}
				</p>
			)}
		</form>
	);
};

export default AuctionBidPanel;
