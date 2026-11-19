import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Plus, Trash2, Users } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat.utils';
import showToast from '@/utils/toast.util';
import {
	MAX_BATCH_TRANSFER_RECIPIENTS,
	validateBatchTransferRows,
	type BatchTransferRecipient,
	type BatchTransferRecipientRow,
} from '@/utils/batchTransfer.utils';
import { useBatchTransferMutation } from '@/hooks/useWallet';

export interface BatchTransferModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	creatorId: string;
	creatorName?: string;
	liquidBalance: number;
	initialRecipients?: Array<{ address: string; quantity: number | string }>;
	isSubmitting?: boolean;
	onConfirm?: (
		recipients: BatchTransferRecipient[],
		creatorId: string
	) => Promise<void> | void;
}

let rowIdCounter = 0;
function createNewRow(
	address = '',
	quantity: number | string = 1
): BatchTransferRecipientRow {
	rowIdCounter += 1;
	return {
		id: `row-${Date.now()}-${rowIdCounter}`,
		address,
		quantity,
	};
}

export default function BatchTransferModal({
	open,
	onOpenChange,
	creatorId,
	creatorName = 'creator',
	liquidBalance,
	initialRecipients,
	isSubmitting: externalIsSubmitting,
	onConfirm,
}: BatchTransferModalProps) {
	const [rows, setRows] = useState<BatchTransferRecipientRow[]>(() => {
		if (initialRecipients && initialRecipients.length > 0) {
			return initialRecipients.map(r => createNewRow(r.address, r.quantity));
		}
		return [createNewRow('', 1)];
	});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);

	const batchTransferMutation = useBatchTransferMutation();
	const firstInputRef = useRef<HTMLInputElement | null>(null);

	const isSubmitting = externalIsSubmitting ?? isInternalSubmitting;

	// Reset state when modal opens
	useEffect(() => {
		if (open) {
			if (initialRecipients && initialRecipients.length > 0) {
				setRows(
					initialRecipients.map(r => createNewRow(r.address, r.quantity))
				);
			} else {
				setRows([createNewRow('', 1)]);
			}
			setTouched({});
			setHasSubmitted(false);
			setIsInternalSubmitting(false);
		}
	}, [open, initialRecipients]);

	const validation = useMemo(
		() => validateBatchTransferRows(rows, liquidBalance),
		[rows, liquidBalance]
	);

	const handleAddRow = () => {
		if (rows.length >= MAX_BATCH_TRANSFER_RECIPIENTS) return;
		setRows(prev => [...prev, createNewRow('', 1)]);
	};

	const handleRemoveRow = (id: string) => {
		if (rows.length <= 1) return;
		setRows(prev => prev.filter(r => r.id !== id));
		setTouched(prev => {
			const next = { ...prev };
			delete next[id];
			return next;
		});
	};

	const handleAddressChange = (id: string, address: string) => {
		setRows(prev => prev.map(r => (r.id === id ? { ...r, address } : r)));
		setTouched(prev => ({ ...prev, [id]: true }));
	};

	const handleQuantityChange = (id: string, quantityStr: string) => {
		setRows(prev =>
			prev.map(r => (r.id === id ? { ...r, quantity: quantityStr } : r))
		);
		setTouched(prev => ({ ...prev, [id]: true }));
	};

	const handleSubmit = async () => {
		setHasSubmitted(true);
		if (!validation.isValid || isSubmitting) return;

		const payload: BatchTransferRecipient[] = rows.map(r => ({
			address: r.address.trim().toUpperCase(),
			quantity: Number(r.quantity),
		}));

		try {
			setIsInternalSubmitting(true);
			showToast.loading(
				`Submitting batch transfer of ${validation.totalKeys} keys to ${payload.length} wallet${payload.length === 1 ? '' : 's'}...`
			);

			if (onConfirm) {
				await onConfirm(payload, creatorId);
			} else {
				await batchTransferMutation.mutateAsync({
					creatorId,
					recipients: payload,
				});
			}

			showToast.transactionSuccess(
				'Batch transfer confirmed',
				`Sent ${formatNumber(validation.totalKeys)} key${validation.totalKeys === 1 ? '' : 's'} to ${payload.length} recipient${payload.length === 1 ? '' : 's'}.`
			);
			onOpenChange(false);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Batch transfer transaction failed. Please check your connection and try again.';
			showToast.error(message);
		} finally {
			setIsInternalSubmitting(false);
		}
	};

	const canSubmit = validation.isValid && !isSubmitting;
	const isAtMaxRows = rows.length >= MAX_BATCH_TRANSFER_RECIPIENTS;

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl sm:rounded-2xl"
				showCloseButton={!isSubmitting}
				onOpenAutoFocus={e => {
					e.preventDefault();
					firstInputRef.current?.focus();
				}}
				data-testid="batch-transfer-modal"
			>
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
							<Users className="size-5" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-white">
								Batch Transfer Keys
							</DialogTitle>
							<DialogDescription className="text-xs text-white/60">
								Send {creatorName} keys to up to{' '}
								{MAX_BATCH_TRANSFER_RECIPIENTS} recipient wallets in a
								single signed transaction.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Balance banner */}
					<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs">
						<span className="text-white/60">
							Liquid balance available:
						</span>
						<span
							className="font-semibold text-white"
							data-testid="batch-transfer-liquid-balance"
						>
							{formatNumber(liquidBalance)} keys
						</span>
					</div>

					{/* Recipients dynamic list */}
					<div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
						{rows.map((row, index) => {
							const rowError = validation.rowErrors[row.id];
							const isRowTouched = touched[row.id] || hasSubmitted;
							const showAddressError =
								isRowTouched && !!rowError?.addressError;
							const showQuantityError =
								isRowTouched && !!rowError?.quantityError;

							return (
								<div
									key={row.id}
									className="rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-white/20"
									data-testid={`batch-transfer-row-${index}`}
								>
									<div className="flex items-center gap-2">
										{/* Recipient index */}
										<span className="text-xs font-semibold text-white/50 w-6 shrink-0">
											#{index + 1}
										</span>

										{/* Wallet Address Input */}
										<div className="flex-1 min-w-0">
											<input
												ref={
													index === 0 ? firstInputRef : undefined
												}
												type="text"
												value={row.address}
												onChange={e =>
													handleAddressChange(
														row.id,
														e.target.value
													)
												}
												placeholder="Stellar wallet address (G...)"
												aria-label={`Recipient ${index + 1} address`}
												aria-invalid={showAddressError || undefined}
												disabled={isSubmitting}
												className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15 font-mono"
												data-testid={`batch-transfer-address-${index}`}
											/>
										</div>

										{/* Quantity Input */}
										<div className="w-20 sm:w-28 shrink-0">
											<input
												type="number"
												min={1}
												step={1}
												value={row.quantity}
												onChange={e =>
													handleQuantityChange(
														row.id,
														e.target.value
													)
												}
												placeholder="Qty"
												aria-label={`Recipient ${index + 1} quantity`}
												aria-invalid={
													showQuantityError || undefined
												}
												disabled={isSubmitting}
												className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15 text-center font-medium"
												data-testid={`batch-transfer-quantity-${index}`}
											/>
										</div>

										{/* Remove Button */}
										<div className="shrink-0">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveRow(row.id)}
												disabled={rows.length <= 1 || isSubmitting}
												className="size-8 p-0 text-white/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20"
												aria-label={`Remove recipient ${index + 1}`}
												data-testid={`batch-transfer-remove-${index}`}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									</div>

									{/* Row-level errors */}
									{(showAddressError || showQuantityError) && (
										<div
											className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-red-400"
											role="alert"
											data-testid={`batch-transfer-row-error-${index}`}
										>
											{showAddressError && (
												<p>{rowError?.addressError}</p>
											)}
											{showQuantityError && (
												<p>{rowError?.quantityError}</p>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Add recipient row action */}
					<div className="flex items-center justify-between pt-1">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleAddRow}
							disabled={isAtMaxRows || isSubmitting}
							className="rounded-xl border-dashed border-white/20 text-xs hover:border-amber-500/40 hover:bg-amber-500/5"
							data-testid="batch-transfer-add-row"
						>
							<Plus className="mr-1.5 size-3.5" />
							Add Recipient
						</Button>
						<span className="text-xs text-white/40">
							{rows.length} / {MAX_BATCH_TRANSFER_RECIPIENTS} recipients
						</span>
					</div>

					{/* Total keys & summary bar */}
					<div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/70">
								Total keys to transfer:
							</span>
							<span
								className="font-bold text-amber-400"
								data-testid="batch-transfer-total-keys"
							>
								{formatNumber(validation.totalKeys)} key
								{validation.totalKeys === 1 ? '' : 's'}
							</span>
						</div>

						{/* Balance validation error */}
						{validation.balanceError && (
							<div
								role="alert"
								className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
								data-testid="batch-transfer-balance-error"
							>
								{validation.balanceError}
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="gap-2 sm:justify-between pt-2 border-t border-white/10">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
						data-testid="batch-transfer-cancel"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={!canSubmit}
						aria-busy={isSubmitting || undefined}
						className="rounded-xl bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
						data-testid="batch-transfer-submit"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting batch transfer…"
						>
							Confirm Batch Transfer
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
