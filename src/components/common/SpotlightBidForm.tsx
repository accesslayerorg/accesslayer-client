import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import SpotlightBidPlacedToast from '@/components/common/SpotlightBidPlacedToast';
import { usePlaceSpotlightBidMutation } from '@/hooks/useCreatorContractActions';
import type { SpotlightSlot } from '@/services/spotlightAuction.service';
import {
	getMinimumSpotlightBid,
	validateSpotlightBid,
} from '@/utils/spotlightAuction.utils';
import { formatAuctionBidAmount } from '@/utils/auctionBid.utils';

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

interface SpotlightBidFormProps {
	creatorId: string;
	slots: SpotlightSlot[];
	highestBid: number | null;
	minIncrement: number | null;
	disabled?: boolean;
}

/**
 * Place Bid form for the spotlight round (#1147). Shows the minimum accepted
 * bid, validates against it, then calls `place_spotlight_bid`.
 */
export default function SpotlightBidForm({
	creatorId,
	slots,
	highestBid,
	minIncrement,
	disabled = false,
}: SpotlightBidFormProps) {
	const { isConnected } = useAccount();
	const mutation = usePlaceSpotlightBidMutation(creatorId);

	const [slotId, setSlotId] = useState(slots[0]?.id ?? '');
	const [amountText, setAmountText] = useState('');
	const [showError, setShowError] = useState(false);

	const minimumBid = getMinimumSpotlightBid(highestBid, minIncrement);
	const amount = Number(amountText);
	const validationError = validateSpotlightBid(
		amountText.trim() === '' ? Number.NaN : amount,
		minimumBid,
		slotId
	);
	const isBusy = mutation.isPending || disabled;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isBusy) return;
		if (validationError) {
			setShowError(true);
			return;
		}

		const slotLabel = slots.find(s => s.id === slotId)?.label ?? 'this slot';
		mutation.mutate(
			{ slotId, amount },
			{
				onSuccess: () => {
					setAmountText('');
					setShowError(false);
					toast.custom(() => (
						<SpotlightBidPlacedToast amount={amount} slotLabel={slotLabel} />
					));
				},
			}
		);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="spotlight-bid-form">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label htmlFor="spotlight-slot" className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
						Spotlight slot
					</label>
					<select
						id="spotlight-slot"
						data-testid="spotlight-slot-select"
						value={slotId}
						onChange={e => setSlotId(e.target.value)}
						disabled={isBusy}
						className={fieldClass}
					>
						{slots.map(slot => (
							<option key={slot.id} value={slot.id} className="bg-[#06111f]">
								{slot.label}
							</option>
						))}
					</select>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="spotlight-bid-amount" className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
						Bid amount (XLM)
					</label>
					<input
						id="spotlight-bid-amount"
						data-testid="spotlight-bid-input"
						type="number"
						inputMode="decimal"
						min={0}
						step="0.01"
						value={amountText}
						onChange={e => setAmountText(e.target.value)}
						disabled={isBusy}
						placeholder={`At least ${formatAuctionBidAmount(minimumBid)}`}
						aria-invalid={showError && validationError ? 'true' : undefined}
						aria-describedby="spotlight-bid-minimum"
						className={fieldClass}
					/>
				</div>
			</div>

			<p id="spotlight-bid-minimum" data-testid="spotlight-min-bid" className="text-xs text-white/50">
				Minimum bid: <span className="font-bold text-amber-300">{formatAuctionBidAmount(minimumBid)}</span>
			</p>

			{showError && validationError && (
				<p role="alert" data-testid="spotlight-bid-error" className="text-xs text-red-400">
					{validationError}
				</p>
			)}

			<Button type="submit" data-testid="spotlight-bid-submit" disabled={isBusy}>
				{mutation.isPending
					? 'Placing bid…'
					: isConnected
						? 'Place Bid'
						: 'Connect wallet to bid'}
			</Button>
		</form>
	);
}
