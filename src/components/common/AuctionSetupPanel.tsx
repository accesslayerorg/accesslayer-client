import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	canCancelAuction,
	describeAuctionState,
	getAuctionStatus,
	validateAuctionInputs,
	type AuctionConfig,
} from '@/utils/auctionConfig.utils';

export interface AuctionSetupPanelProps extends AuctionConfig {
	/** Submits `configure_auction`. */
	onConfigure: (config: { price: number; supply: number }) => void;
	/** Submits `cancel_auction`. */
	onCancel: () => void;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

/**
 * Auction configuration panel for the creator dashboard settings tab (#816).
 *
 * Lets a creator set a fixed auction price (XLM) and supply allocation before
 * their key goes live, shows the current auction state, and offers a Cancel
 * Auction action while no auction keys have been sold.
 */
const AuctionSetupPanel: React.FC<AuctionSetupPanelProps> = ({
	auctionPrice,
	auctionSupply,
	auctionSold,
	onConfigure,
	onCancel,
	isSubmitting = false,
}) => {
	const config: AuctionConfig = { auctionPrice, auctionSupply, auctionSold };
	const status = getAuctionStatus(config);

	const [priceInput, setPriceInput] = useState(
		auctionPrice != null ? String(auctionPrice) : ''
	);
	const [supplyInput, setSupplyInput] = useState(
		auctionSupply != null ? String(auctionSupply) : ''
	);
	const [showErrors, setShowErrors] = useState(false);

	// Keep inputs aligned with upstream config after a save refetches it.
	useEffect(() => {
		setPriceInput(auctionPrice != null ? String(auctionPrice) : '');
		setSupplyInput(auctionSupply != null ? String(auctionSupply) : '');
		setShowErrors(false);
	}, [auctionPrice, auctionSupply]);

	const { priceError, supplyError, isValid } = validateAuctionInputs(
		priceInput,
		supplyInput
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!isValid) {
			setShowErrors(true);
			return;
		}
		onConfigure({ price: Number(priceInput.trim()), supply: Number(supplyInput.trim()) });
	};

	return (
		<div className="space-y-5" data-testid="auction-setup-panel">
			<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
				<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
					Current state
				</p>
				<p className="mt-1 font-jakarta text-sm font-bold text-white" data-testid="auction-state">
					{describeAuctionState(config)}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4" noValidate>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<label
							htmlFor="auction-price"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Auction price (XLM)
						</label>
						<input
							id="auction-price"
							data-testid="auction-price-input"
							inputMode="decimal"
							className={fieldClass}
							value={priceInput}
							onChange={e => setPriceInput(e.target.value)}
							disabled={isSubmitting}
							placeholder="0.00"
							aria-invalid={showErrors && priceError ? 'true' : undefined}
						/>
						{showErrors && priceError && (
							<p role="alert" data-testid="auction-price-error" className="text-xs text-red-400">
								{priceError}
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="auction-supply"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Auction supply (keys)
						</label>
						<input
							id="auction-supply"
							data-testid="auction-supply-input"
							inputMode="numeric"
							className={fieldClass}
							value={supplyInput}
							onChange={e => setSupplyInput(e.target.value)}
							disabled={isSubmitting}
							placeholder="0"
							aria-invalid={showErrors && supplyError ? 'true' : undefined}
						/>
						{showErrors && supplyError && (
							<p role="alert" data-testid="auction-supply-error" className="text-xs text-red-400">
								{supplyError}
							</p>
						)}
					</div>
				</div>

				<div className="flex flex-wrap gap-3">
					<Button
						type="submit"
						data-testid="auction-submit"
						disabled={isSubmitting || (showErrors && !isValid)}
					>
						{isSubmitting
							? 'Submitting…'
							: status === 'not_configured'
								? 'Configure auction'
								: 'Update auction'}
					</Button>

					{canCancelAuction(config) && (
						<Button
							type="button"
							variant="destructive"
							data-testid="auction-cancel"
							onClick={onCancel}
							disabled={isSubmitting}
							className={cn(isSubmitting && 'pointer-events-none')}
						>
							Cancel auction
						</Button>
					)}
				</div>
			</form>
		</div>
	);
};

export default AuctionSetupPanel;
