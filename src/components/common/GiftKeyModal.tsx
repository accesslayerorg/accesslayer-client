import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Gift } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatNumber } from '@/utils/numberFormat.utils';
import showToast from '@/utils/toast.util';
import { useGiftKeyMutation } from '@/hooks/useWallet';
import {
	MAX_GIFT_MESSAGE_LENGTH,
	validateGiftKey,
	type GiftKeyErrors,
} from '@/utils/giftKey.utils';

export interface GiftKeyPayload {
	keyId: string;
	quantity: number;
	to: string;
	message?: string;
}

export interface GiftKeyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keyId: string;
	keyName: string;
	/** Keys available to gift from the sender's position. */
	availableBalance: number;
	isSubmitting?: boolean;
	onConfirm?: (payload: GiftKeyPayload) => Promise<void> | void;
}

/**
 * Gifting flow for a held creator key: the sender picks a quantity, a
 * recipient and an optional note, reviews the summary, then signs the
 * transfer. Validation blocks gifting more than the available balance,
 * malformed recipient addresses and over-long messages.
 */
export default function GiftKeyModal({
	open,
	onOpenChange,
	keyId,
	keyName,
	availableBalance,
	isSubmitting: externalIsSubmitting,
	onConfirm,
}: GiftKeyModalProps) {
	const { address } = useAccount();
	const giftMutation = useGiftKeyMutation(address);

	const [step, setStep] = useState<'compose' | 'confirm'>('compose');
	const [quantity, setQuantity] = useState('1');
	const [recipient, setRecipient] = useState('');
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState<GiftKeyErrors>({});
	const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);

	const isSubmitting = externalIsSubmitting ?? isInternalSubmitting;

	useEffect(() => {
		if (!open) return;
		setStep('compose');
		setQuantity('1');
		setRecipient('');
		setMessage('');
		setErrors({});
		setIsInternalSubmitting(false);
	}, [open]);

	const handleReview = () => {
		const validation = validateGiftKey({
			quantity,
			recipient,
			message,
			availableBalance,
		});
		setErrors(validation.errors);
		if (!validation.isValid) return;
		setStep('confirm');
	};

	const handleConfirm = async () => {
		const validation = validateGiftKey({
			quantity,
			recipient,
			message,
			availableBalance,
		});
		if (!validation.isValid) {
			setErrors(validation.errors);
			setStep('compose');
			return;
		}

		const payload: GiftKeyPayload = {
			keyId,
			quantity: validation.quantity,
			to: validation.recipient,
			message: message.trim() || undefined,
		};

		try {
			setIsInternalSubmitting(true);
			showToast.loading(
				`Gifting ${formatNumber(payload.quantity)} ${keyName} key${
					payload.quantity === 1 ? '' : 's'
				}…`
			);

			if (onConfirm) {
				await onConfirm(payload);
			} else {
				await giftMutation.mutateAsync(payload);
			}

			showToast.transactionSuccess(
				'Gift sent',
				`Sent ${formatNumber(payload.quantity)} ${keyName} key${
					payload.quantity === 1 ? '' : 's'
				} to ${payload.to.slice(0, 6)}…${payload.to.slice(-4)}.`
			);
			onOpenChange(false);
		} catch (error) {
			showToast.error(
				error instanceof Error
					? error.message
					: 'Gift transaction failed. Please try again.'
			);
		} finally {
			setIsInternalSubmitting(false);
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
				showEscapeHint={!isSubmitting}
				data-testid="gift-key-modal"
			>
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
							<Gift className="size-5" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-white">
								Gift {keyName} keys
							</DialogTitle>
							<DialogDescription className="text-xs text-white/60">
								{step === 'compose'
									? `Send keys to another wallet. You have ${formatNumber(
											availableBalance
										)} available.`
									: 'Review the gift before signing the transfer.'}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{step === 'compose' ? (
					<div className="space-y-4 py-2">
						<div>
							<label
								htmlFor="gift-key-quantity"
								className="text-xs font-semibold text-white/70"
							>
								Quantity
							</label>
							<input
								id="gift-key-quantity"
								type="number"
								min={1}
								step={1}
								max={availableBalance}
								value={quantity}
								onChange={event => setQuantity(event.target.value)}
								disabled={isSubmitting}
								aria-invalid={Boolean(errors.quantity) || undefined}
								className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
								data-testid="gift-key-quantity"
							/>
							{errors.quantity && (
								<p
									role="alert"
									className="mt-1 text-[11px] text-red-400"
									data-testid="gift-key-quantity-error"
								>
									{errors.quantity}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="gift-key-recipient"
								className="text-xs font-semibold text-white/70"
							>
								Recipient address
							</label>
							<input
								id="gift-key-recipient"
								type="text"
								value={recipient}
								onChange={event => setRecipient(event.target.value)}
								placeholder="Stellar wallet address (G...)"
								disabled={isSubmitting}
								aria-invalid={Boolean(errors.recipient) || undefined}
								className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
								data-testid="gift-key-recipient"
							/>
							{errors.recipient && (
								<p
									role="alert"
									className="mt-1 text-[11px] text-red-400"
									data-testid="gift-key-recipient-error"
								>
									{errors.recipient}
								</p>
							)}
						</div>

						<div>
							<div className="flex items-center justify-between">
								<label
									htmlFor="gift-key-message"
									className="text-xs font-semibold text-white/70"
								>
									Message (optional)
								</label>
								<span
									className={
										message.length > MAX_GIFT_MESSAGE_LENGTH
											? 'text-[11px] text-red-400'
											: 'text-[11px] text-white/40'
									}
									data-testid="gift-key-message-counter"
								>
									{message.length}/{MAX_GIFT_MESSAGE_LENGTH}
								</span>
							</div>
							<textarea
								id="gift-key-message"
								value={message}
								onChange={event => setMessage(event.target.value)}
								maxLength={MAX_GIFT_MESSAGE_LENGTH}
								rows={3}
								placeholder="Add a note for the recipient…"
								disabled={isSubmitting}
								aria-invalid={Boolean(errors.message) || undefined}
								className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
								data-testid="gift-key-message"
							/>
							{errors.message && (
								<p
									role="alert"
									className="mt-1 text-[11px] text-red-400"
									data-testid="gift-key-message-error"
								>
									{errors.message}
								</p>
							)}
						</div>
					</div>
				) : (
					<dl
						className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"
						data-testid="gift-key-summary"
					>
						<div className="flex items-center justify-between gap-4">
							<dt className="text-white/60">Key</dt>
							<dd className="font-semibold text-white">{keyName}</dd>
						</div>
						<div className="flex items-center justify-between gap-4">
							<dt className="text-white/60">Quantity</dt>
							<dd
								className="font-semibold text-white"
								data-testid="gift-key-summary-quantity"
							>
								{formatNumber(Number(quantity))}
							</dd>
						</div>
						<div className="flex items-center justify-between gap-4">
							<dt className="text-white/60">Recipient</dt>
							<dd
								className="break-all font-mono text-xs text-white"
								data-testid="gift-key-summary-recipient"
							>
								{recipient}
							</dd>
						</div>
						{message.trim() && (
							<div className="flex flex-col gap-1">
								<dt className="text-white/60">Message</dt>
								<dd className="text-white/90">{message}</dd>
							</div>
						)}
					</dl>
				)}

				<DialogFooter className="gap-2 sm:justify-between pt-2 border-t border-white/10">
					{step === 'compose' ? (
						<>
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
								data-testid="gift-key-cancel"
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleReview}
								disabled={isSubmitting}
								className="rounded-xl bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
								data-testid="gift-key-review"
							>
								Review gift
							</Button>
						</>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep('compose')}
								disabled={isSubmitting}
								data-testid="gift-key-back"
							>
								Back
							</Button>
							<Button
								type="button"
								onClick={handleConfirm}
								disabled={isSubmitting}
								aria-busy={isSubmitting || undefined}
								className="rounded-xl bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
								data-testid="gift-key-confirm"
							>
								<StableButtonContent
									isLoading={isSubmitting}
									loadingLabel="Sending gift…"
								>
									Confirm gift
								</StableButtonContent>
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
