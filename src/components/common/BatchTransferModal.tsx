import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';
import showToast from '@/utils/toast.util';
import { useBatchTransferMutation, type BatchTransferOrder } from '@/hooks/useWallet';

const STELLAR_ADDRESS_RE = /^[G][A-Z2-7]{55}$/;
const MAX_RECIPIENTS = 10;

interface TransferRow {
	id: string;
	recipientAddress: string;
	quantity: string;
	error?: string;
}

export interface BatchTransferModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	creatorId: string;
	creatorName: string;
	availableBalance: number;
	walletAddress: string;
}

export const BatchTransferModal: React.FC<BatchTransferModalProps> = ({
	open,
	onOpenChange,
	creatorId,
	creatorName,
	availableBalance,
	walletAddress,
}) => {
	const [rows, setRows] = useState<TransferRow[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const mutation = useBatchTransferMutation(walletAddress);

	// Calculate totals
	const { totalQuantity, rowErrors, canAddMore, isValid } = useMemo(() => {
		let total = 0;
		const errors = new Map<string, string>();
		let hasErrors = false;

		for (const row of rows) {
			const qty = Number(row.quantity) || 0;
			total += qty;

			// Validate recipient address
			if (!row.recipientAddress.trim()) {
				errors.set(row.id, 'Address required');
				hasErrors = true;
			} else if (!STELLAR_ADDRESS_RE.test(row.recipientAddress.trim())) {
				errors.set(row.id, 'Invalid Stellar address');
				hasErrors = true;
			} else if (qty <= 0) {
				errors.set(row.id, 'Quantity must be greater than 0');
				hasErrors = true;
			}
		}

		return {
			totalQuantity: total,
			rowErrors: errors,
			canAddMore: rows.length < MAX_RECIPIENTS,
			isValid: rows.length > 0 && !hasErrors && total <= availableBalance,
		};
	}, [rows, availableBalance]);

	const balanceExceeded = totalQuantity > availableBalance && rows.length > 0;

	const handleAddRow = () => {
		if (rows.length >= MAX_RECIPIENTS) {
			showToast.error(`Maximum ${MAX_RECIPIENTS} recipients per transfer`);
			return;
		}
		setRows([
			...rows,
			{
				id: Math.random().toString(36).substr(2, 9),
				recipientAddress: '',
				quantity: '1',
			},
		]);
	};

	const handleRemoveRow = (id: string) => {
		setRows(rows.filter(r => r.id !== id));
	};

	const handleAddressChange = (id: string, address: string) => {
		setRows(
			rows.map(r =>
				r.id === id ? { ...r, recipientAddress: address } : r
			)
		);
	};

	const handleQuantityChange = (id: string, quantity: string) => {
		setRows(
			rows.map(r =>
				r.id === id ? { ...r, quantity } : r
			)
		);
	};

	const handleConfirm = async () => {
		if (!isValid) return;

		setIsSubmitting(true);
		try {
			const orders: BatchTransferOrder[] = rows.map(row => ({
				creatorId,
				recipientAddress: row.recipientAddress.trim(),
				quantity: Number(row.quantity),
			}));

			showToast.loading(
				`Transferring ${formatNumber(totalQuantity)} keys to ${rows.length} recipient${rows.length === 1 ? '' : 's'}...`
			);

			await mutation.mutateAsync({ orders });

			showToast.transactionSuccess(
				'Transfer confirmed',
				`Transferred ${formatNumber(totalQuantity)} keys from ${creatorName}`
			);

			// Reset and close
			setRows([]);
			onOpenChange(false);
		} catch (error) {
			if (process.env.NODE_ENV !== 'test') {
				console.debug('[batch-transfer-confirmation-failure]', {
					creator_id: creatorId,
					creator_name: creatorName,
					recipient_count: rows.length,
					total_quantity: totalQuantity,
					error:
						error instanceof Error
							? `${error.name}: ${error.message}`
							: String(error),
					timestamp: new Date().toISOString(),
				});
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			setRows([]);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Batch Transfer Keys</DialogTitle>
					<DialogDescription>
						Transfer keys from {creatorName} to multiple recipients in one transaction
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Recipients List */}
					{rows.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-8">
							<p className="mb-4 text-sm text-white/55">
								No recipients added yet
							</p>
							<Button
								size="sm"
								onClick={handleAddRow}
								className="rounded-xl"
								disabled={isSubmitting}
							>
								<Plus className="size-4" />
								Add Recipient
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{rows.map((row, idx) => {
								const error = rowErrors.get(row.id);
								return (
									<div
										key={row.id}
										className="flex flex-col gap-2"
									>
										<div className="flex items-end gap-2">
											<div className="flex-1">
												<label className="block text-xs font-medium text-white/70 mb-1">
													Recipient {idx + 1}
												</label>
												<input
													type="text"
													value={row.recipientAddress}
													onChange={e =>
														handleAddressChange(
															row.id,
															e.target.value
														)
													}
													placeholder="G..."
													disabled={isSubmitting}
													className={`w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all ${
														error
															? 'ring-2 ring-red-400/50'
															: ''
													}`}
												/>
											</div>
											<div className="w-24">
												<label className="block text-xs font-medium text-white/70 mb-1">
													Qty
												</label>
												<input
													type="number"
													min="1"
													value={row.quantity}
													onChange={e =>
														handleQuantityChange(
															row.id,
															e.target.value
														)
													}
													disabled={isSubmitting}
													className={`w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all ${
														error
															? 'ring-2 ring-red-400/50'
															: ''
													}`}
												/>
											</div>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleRemoveRow(row.id)}
												disabled={isSubmitting}
												className="text-white/50 hover:text-red-400"
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
										{error && (
											<p
												className="text-xs text-red-400"
												role="alert"
											>
												{error}
											</p>
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* Add Recipient Button */}
					{rows.length > 0 && canAddMore && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleAddRow}
							disabled={isSubmitting}
							className="w-full rounded-xl"
						>
							<Plus className="size-4" />
							Add Recipient
						</Button>
					)}

					{/* Summary Section */}
					<div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-4">
						<div className="flex justify-between text-sm">
							<span className="text-white/55">Total Recipients:</span>
							<span className="font-medium text-white">
								{rows.length}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-white/55">Total Keys:</span>
							<span className="font-medium text-white">
								{formatNumber(totalQuantity)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-white/55">Available Balance:</span>
							<span className="font-medium text-white">
								{formatNumber(availableBalance)} keys
							</span>
						</div>
						{balanceExceeded && (
							<div className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300">
								Transfer exceeds available balance
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleClose}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!isValid || isSubmitting}
						className="rounded-xl"
					>
						{isSubmitting ? 'Submitting...' : 'Confirm Transfer'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default BatchTransferModal;
