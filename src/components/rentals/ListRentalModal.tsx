import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { ListableKey, ListRentalInput } from '@/types/keyRental';
import {
	MAX_RENTAL_DAYS,
	RENTAL_ESCROW_REASON,
	validateListRental,
	type ListRentalFormErrors,
	type ListRentalFormValues,
} from '@/utils/keyRental.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface ListRentalModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keys: ListableKey[];
	/** Key to preselect, e.g. when opened from a holding row. */
	defaultKeyId?: string;
	isSubmitting?: boolean;
	/** Submits the `list_rental` call. */
	onConfirm: (input: ListRentalInput) => Promise<unknown> | void;
}

const EMPTY_VALUES: ListRentalFormValues = {
	quantity: '1',
	feePerDay: '',
	maxDays: '7',
	collateral: '0',
};

const inputClass =
	'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/15';

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p
			id={id}
			role="alert"
			className="mt-1 text-[11px] text-red-400"
			data-testid={id}
		>
			{message}
		</p>
	);
}

/**
 * Lets a holder list keys for rent (#1360): quantity, fee per day, maximum
 * days and collateral. The quantity is validated against the keys still
 * available to list, and the modal explains that listed keys are escrowed.
 */
export default function ListRentalModal({
	open,
	onOpenChange,
	keys,
	defaultKeyId,
	isSubmitting = false,
	onConfirm,
}: ListRentalModalProps) {
	const [keyId, setKeyId] = useState('');
	const [values, setValues] = useState<ListRentalFormValues>(EMPTY_VALUES);
	const [errors, setErrors] = useState<ListRentalFormErrors>({});

	useEffect(() => {
		if (!open) return;
		const preferred =
			keys.find(key => key.keyId === defaultKeyId) ?? keys[0] ?? null;
		setKeyId(preferred?.keyId ?? '');
		setValues(EMPTY_VALUES);
		setErrors({});
		// Reset only when the modal opens.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const selectedKey = keys.find(key => key.keyId === keyId) ?? null;
	const availableBalance = selectedKey?.availableBalance ?? 0;

	const update = (field: keyof ListRentalFormValues, value: string) => {
		setValues(current => ({ ...current, [field]: value }));
		setErrors(current => ({ ...current, [field]: undefined }));
	};

	const handleSubmit = async () => {
		if (isSubmitting || !selectedKey) return;
		const validation = validateListRental(values, availableBalance);
		setErrors(validation.errors);
		if (!validation.isValid) return;

		try {
			await onConfirm({
				keyId: selectedKey.keyId,
				quantity: validation.quantity,
				feePerDayStroops: validation.feePerDayStroops,
				maxDays: validation.maxDays,
				collateralStroops: validation.collateralStroops,
			});
			onOpenChange(false);
		} catch {
			// The mutation reports the error; keep the form to retry.
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
				data-testid="list-rental-modal"
			>
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
							<KeyRound className="size-5" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-white">
								List keys for rent
							</DialogTitle>
							<DialogDescription className="text-xs text-white/60">
								Earn a daily fee while renters get access. You keep
								ownership and the keys return when each rental ends.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{keys.length === 0 ? (
					<p
						className="py-4 text-sm text-white/70"
						data-testid="list-rental-no-keys"
					>
						You don&apos;t hold any keys that can be listed.
					</p>
				) : (
					<form
						className="space-y-4 py-2"
						noValidate
						onSubmit={event => {
							event.preventDefault();
							void handleSubmit();
						}}
					>
						<div>
							<label
								htmlFor="list-rental-key"
								className="text-xs font-semibold text-white/70"
							>
								Key
							</label>
							<select
								id="list-rental-key"
								value={keyId}
								onChange={event => {
									setKeyId(event.target.value);
									setErrors({});
								}}
								disabled={isSubmitting}
								className={inputClass}
								data-testid="list-rental-key"
							>
								{keys.map(key => (
									<option key={key.keyId} value={key.keyId}>
										{key.keyName}
									</option>
								))}
							</select>
							<p
								className="mt-1 text-[11px] text-white/50"
								data-testid="list-rental-available"
							>
								{formatNumber(availableBalance)} available to list
							</p>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label
									htmlFor="list-rental-quantity"
									className="text-xs font-semibold text-white/70"
								>
									Quantity
								</label>
								<input
									id="list-rental-quantity"
									type="number"
									inputMode="numeric"
									min={1}
									max={availableBalance}
									step={1}
									value={values.quantity}
									onChange={event =>
										update('quantity', event.target.value)
									}
									disabled={isSubmitting}
									aria-invalid={Boolean(errors.quantity) || undefined}
									className={inputClass}
									data-testid="list-rental-quantity"
								/>
								<FieldError
									id="list-rental-quantity-error"
									message={errors.quantity}
								/>
							</div>
							<div>
								<label
									htmlFor="list-rental-max-days"
									className="text-xs font-semibold text-white/70"
								>
									Maximum days
								</label>
								<input
									id="list-rental-max-days"
									type="number"
									inputMode="numeric"
									min={1}
									max={MAX_RENTAL_DAYS}
									step={1}
									value={values.maxDays}
									onChange={event =>
										update('maxDays', event.target.value)
									}
									disabled={isSubmitting}
									aria-invalid={Boolean(errors.maxDays) || undefined}
									className={inputClass}
									data-testid="list-rental-max-days"
								/>
								<FieldError
									id="list-rental-max-days-error"
									message={errors.maxDays}
								/>
							</div>
							<div>
								<label
									htmlFor="list-rental-fee"
									className="text-xs font-semibold text-white/70"
								>
									Fee per day (XLM)
								</label>
								<input
									id="list-rental-fee"
									type="text"
									inputMode="decimal"
									placeholder="0.5"
									value={values.feePerDay}
									onChange={event =>
										update('feePerDay', event.target.value)
									}
									disabled={isSubmitting}
									aria-invalid={Boolean(errors.feePerDay) || undefined}
									className={inputClass}
									data-testid="list-rental-fee"
								/>
								<FieldError
									id="list-rental-fee-error"
									message={errors.feePerDay}
								/>
							</div>
							<div>
								<label
									htmlFor="list-rental-collateral"
									className="text-xs font-semibold text-white/70"
								>
									Collateral (XLM)
								</label>
								<input
									id="list-rental-collateral"
									type="text"
									inputMode="decimal"
									value={values.collateral}
									onChange={event =>
										update('collateral', event.target.value)
									}
									disabled={isSubmitting}
									aria-invalid={
										Boolean(errors.collateral) || undefined
									}
									className={inputClass}
									data-testid="list-rental-collateral"
								/>
								<FieldError
									id="list-rental-collateral-error"
									message={errors.collateral}
								/>
							</div>
						</div>

						<p
							className="rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-xs text-sky-200/90"
							data-testid="list-rental-escrow-note"
						>
							{RENTAL_ESCROW_REASON}
						</p>

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
								type="submit"
								disabled={isSubmitting || !selectedKey}
								data-testid="list-rental-confirm"
							>
								{isSubmitting ? 'Listing…' : 'List keys'}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
