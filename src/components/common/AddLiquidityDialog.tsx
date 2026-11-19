import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useLpPool, useSpendableXlmBalance } from '@/hooks/useLpPositions';
import type { LpPosition } from '@/services/lpPositions.service';
import {
	formatLpAmount,
	formatPoolShare,
	formatProjectedPoolShare,
	stroopsToXlmInput,
	validateLpAmountInput,
} from '@/utils/lpPositions.utils';
import { bpsToPercent } from '@/utils/numberFormat.utils';

export interface AddLiquidityDialogProps {
	/** Pool context; the dialog is open while this is non-null. */
	position: LpPosition | null;
	/** Connected Stellar address whose balance funds the deposit. */
	wallet: string;
	onClose: () => void;
	/** Submits the raw input; the mutation re-validates against a fresh balance. */
	onSubmit: (amountInput: string) => void;
	isSubmitting: boolean;
	/** Message from the last failed submission, shown inline. */
	submitError?: string | null;
}

/**
 * Add-liquidity modal (#1030).
 *
 * Validates the amount against the wallet's spendable XLM (read from chain)
 * before enabling submit, previews the pool's current APR estimate from the
 * LP API, and shows the pool share this deposit would receive using the
 * contract's own `add_liquidity` share formula.
 */
const AddLiquidityDialog: React.FC<AddLiquidityDialogProps> = ({
	position,
	wallet,
	onClose,
	onSubmit,
	isSubmitting,
	submitError,
}) => {
	const open = position !== null;
	const [amountInput, setAmountInput] = useState('');
	const [touched, setTouched] = useState(false);
	const balanceQuery = useSpendableXlmBalance(wallet, open);
	const poolQuery = useLpPool(position?.keyId, open);

	const availableStroops = balanceQuery.data ?? null;
	const validation = validateLpAmountInput(amountInput, { availableStroops });
	const showError = touched && !validation.ok && !balanceQuery.isLoading;
	const errorId = 'add-liquidity-amount-error';

	const pool = poolQuery.data;
	const poolTotal =
		pool?.totalLiquidityStroops ??
		position?.poolTotalLiquidityStroops ??
		null;

	const handleOpenChange = (next: boolean) => {
		if (next || isSubmitting) return;
		setAmountInput('');
		setTouched(false);
		onClose();
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		setTouched(true);
		if (!validation.ok || isSubmitting) return;
		onSubmit(amountInput.trim());
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add liquidity</DialogTitle>
					<DialogDescription className="break-words">
						Deposit XLM into the {position?.keyName} pool to earn a share
						of its trading fees.
					</DialogDescription>
				</DialogHeader>

				{position && (
					<form
						id="add-liquidity-form"
						onSubmit={handleSubmit}
						noValidate
						className="space-y-4"
					>
						<div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-xs text-white/60">
							<div className="flex justify-between gap-3">
								<span>Current contribution</span>
								<span className="break-all text-right font-mono text-white/85">
									{formatLpAmount(position.contributionStroops)}
								</span>
							</div>
							<div className="mt-1 flex justify-between gap-3">
								<span>Current pool share</span>
								<span className="font-mono text-white/85">
									{formatPoolShare(position)}
								</span>
							</div>
						</div>

						<div>
							<div className="mb-1.5 flex items-end justify-between gap-3">
								<label
									htmlFor="add-liquidity-amount"
									className="text-sm font-medium text-white"
								>
									Amount (XLM)
								</label>
								<span
									data-testid="add-liquidity-available"
									className="text-right text-xs text-white/50"
								>
									Available:{' '}
									{balanceQuery.isLoading
										? 'Loading…'
										: balanceQuery.isError
											? 'Unavailable'
											: formatLpAmount(availableStroops)}
								</span>
							</div>
							<div className="flex gap-2">
								<input
									id="add-liquidity-amount"
									name="amount"
									type="text"
									inputMode="decimal"
									autoComplete="off"
									placeholder="0.0"
									value={amountInput}
									onChange={event => {
										setAmountInput(event.target.value);
										setTouched(true);
									}}
									disabled={isSubmitting}
									aria-invalid={showError || undefined}
									aria-describedby={showError ? errorId : undefined}
									className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/60"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={
										isSubmitting ||
										availableStroops == null ||
										availableStroops <= 0n
									}
									onClick={() => {
										if (availableStroops == null) return;
										setAmountInput(
											stroopsToXlmInput(availableStroops)
										);
										setTouched(true);
									}}
								>
									Max
								</Button>
							</div>
							{showError && !validation.ok && (
								<p
									id={errorId}
									role="alert"
									data-testid="add-liquidity-error"
									className="mt-1.5 text-xs text-rose-300"
								>
									{validation.message}
								</p>
							)}
						</div>

						<div
							data-testid="add-liquidity-reward-preview"
							className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs"
						>
							<p className="font-semibold uppercase tracking-[0.16em] text-amber-300">
								Reward rate preview
							</p>
							{poolQuery.isLoading ? (
								<p className="mt-2 text-white/60">Loading pool data…</p>
							) : (
								<dl className="mt-2 space-y-1 text-white/60">
									<div className="flex justify-between gap-3">
										<dt>Current APR (estimate)</dt>
										<dd
											data-testid="add-liquidity-apr"
											className="font-mono text-white/85"
										>
											{pool?.aprBps != null
												? bpsToPercent(pool.aprBps)
												: 'Unavailable'}
										</dd>
									</div>
									<div className="flex justify-between gap-3">
										<dt>Share of pool for this deposit</dt>
										<dd
											data-testid="add-liquidity-projected-share"
											className="font-mono text-white/85"
										>
											{validation.ok
												? formatProjectedPoolShare(
														validation.stroops,
														poolTotal
													)
												: '—'}
										</dd>
									</div>
								</dl>
							)}
							<p className="mt-2 leading-5 text-white/45">
								Rewards come from trading fees and change with volume
								and total pool size. The APR is an estimate, not a
								guarantee.
							</p>
						</div>

						{submitError && (
							<p
								role="alert"
								data-testid="add-liquidity-submit-error"
								className="text-sm text-rose-300"
							>
								{submitError}
							</p>
						)}
					</form>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form="add-liquidity-form"
						disabled={isSubmitting || !validation.ok}
						data-testid="add-liquidity-submit"
					>
						{isSubmitting && (
							<LoaderCircle
								className="size-4 animate-spin"
								aria-hidden="true"
							/>
						)}
						{isSubmitting
							? 'Confirm in wallet…'
							: 'Sign and add liquidity'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default AddLiquidityDialog;
