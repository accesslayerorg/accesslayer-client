import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { RentalListing } from '@/types/keyRental';
import {
	calculateRentalCost,
	formatRentalXlm,
	validateRentDays,
} from '@/utils/keyRental.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface RentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	listing: RentalListing | null;
	isSubmitting?: boolean;
	/** Submits the `rent` call for the chosen number of days. */
	onConfirm: (days: number) => Promise<unknown> | void;
}

const QUICK_DAYS = [1, 7, 30];

/**
 * Rent flow for a listing (#1360): the renter picks a number of days and sees
 * the rental fee (fee per day times days), the collateral that is locked until
 * the rental ends, and the total due before signing.
 */
export default function RentModal({
	open,
	onOpenChange,
	listing,
	isSubmitting = false,
	onConfirm,
}: RentModalProps) {
	const [daysInput, setDaysInput] = useState('1');

	useEffect(() => {
		if (open) setDaysInput('1');
	}, [open, listing?.id]);

	const maxDays = listing?.maxDays ?? 0;
	const validation = validateRentDays(daysInput, maxDays);
	const days = validation.isValid ? validation.days : 0;
	const cost = useMemo(
		() => (listing ? calculateRentalCost(listing, days) : null),
		[listing, days]
	);
	const quickDays = QUICK_DAYS.filter(value => value <= maxDays);

	if (!listing || !cost) return null;

	const step = (delta: number) => {
		const current = Number.parseInt(daysInput, 10);
		const base = Number.isFinite(current) ? current : 0;
		setDaysInput(String(Math.min(maxDays, Math.max(1, base + delta))));
	};

	const handleConfirm = async () => {
		if (!validation.isValid || isSubmitting) return;
		try {
			await onConfirm(validation.days);
			onOpenChange(false);
		} catch {
			// The mutation reports the error; keep the modal open to retry.
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md border border-white/10 bg-slate-900/95 backdrop-blur-xl sm:rounded-2xl"
				showCloseButton={!isSubmitting}
				data-testid="rent-modal"
			>
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
							<CalendarClock className="size-5" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-white">
								Rent {listing.keyName} keys
							</DialogTitle>
							<DialogDescription className="text-xs text-white/60">
								{formatNumber(listing.quantity)} key
								{listing.quantity === 1 ? '' : 's'} for up to{' '}
								{formatNumber(listing.maxDays)} day
								{listing.maxDays === 1 ? '' : 's'}. Keys and collateral
								return when the rental ends.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div>
						<label
							htmlFor="rent-days"
							className="text-xs font-semibold text-white/70"
						>
							Days
						</label>
						<div className="mt-1.5 flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => step(-1)}
								disabled={isSubmitting || days <= 1}
								aria-label="One day fewer"
								data-testid="rent-days-decrement"
							>
								<Minus className="size-4" />
							</Button>
							<input
								id="rent-days"
								type="number"
								inputMode="numeric"
								min={1}
								max={maxDays}
								step={1}
								value={daysInput}
								onChange={event => setDaysInput(event.target.value)}
								disabled={isSubmitting}
								aria-invalid={!validation.isValid || undefined}
								aria-describedby={
									validation.error ? 'rent-days-error' : undefined
								}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm text-white outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/15"
								data-testid="rent-days-input"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => step(1)}
								disabled={isSubmitting || days >= maxDays}
								aria-label="One day more"
								data-testid="rent-days-increment"
							>
								<Plus className="size-4" />
							</Button>
						</div>
						{quickDays.length > 1 && (
							<div className="mt-2 flex gap-2">
								{quickDays.map(value => (
									<button
										key={value}
										type="button"
										onClick={() => setDaysInput(String(value))}
										disabled={isSubmitting}
										className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:border-white/20 hover:text-white"
									>
										{value}d
									</button>
								))}
							</div>
						)}
						{validation.error && (
							<p
								id="rent-days-error"
								role="alert"
								className="mt-1 text-[11px] text-red-400"
								data-testid="rent-days-error"
							>
								{validation.error}
							</p>
						)}
					</div>

					<dl className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
						<div className="flex justify-between text-white/60">
							<dt>Fee per day</dt>
							<dd data-testid="rent-fee-per-day">
								{formatRentalXlm(listing.feePerDayStroops)} XLM
							</dd>
						</div>
						<div className="flex justify-between text-white/80">
							<dt>
								Rental fee ({days} day{days === 1 ? '' : 's'})
							</dt>
							<dd className="font-semibold" data-testid="rent-total-fee">
								{formatRentalXlm(cost.feeStroops)} XLM
							</dd>
						</div>
						<div className="flex justify-between text-white/60">
							<dt>Collateral, refunded when you end the rental</dt>
							<dd data-testid="rent-collateral">
								{formatRentalXlm(cost.collateralStroops)} XLM
							</dd>
						</div>
						<div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
							<dt>Total due now</dt>
							<dd data-testid="rent-total-due">
								{formatRentalXlm(cost.totalDueStroops)} XLM
							</dd>
						</div>
					</dl>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => void handleConfirm()}
						disabled={!validation.isValid || isSubmitting}
						data-testid="rent-confirm"
					>
						{isSubmitting
							? 'Confirming…'
							: `Rent for ${days || '…'} day${days === 1 ? '' : 's'}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
